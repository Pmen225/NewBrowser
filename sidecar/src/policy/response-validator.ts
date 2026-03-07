import type { JsonObject, SourceAttribution } from "../../../shared/src/transport";
import type { PolicyViolation, ResponseValidationInput, ResponseValidationResult } from "./types";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractAnswerBody(value: string): string {
  const trimmed = value.trim();
  // Match with or without closing tag (model sometimes omits </answer>)
  const match = trimmed.match(/^<answer>([\s\S]*?)(?:<\/answer>)?$/i);
  if (!match) {
    return trimmed;
  }

  // Recurse to handle double-wrapped <answer><answer>...</answer>
  const body = (match[1] ?? "").trim();
  if (/^<answer>/i.test(body)) {
    return extractAnswerBody(body);
  }
  return body;
}

function wrapAnswerBody(value: string): string {
  const body = extractAnswerBody(value);
  return `<answer>${body.trim()}</answer>`;
}

function stripValidCitations(value: string): string {
  return value.replace(/\[(?:web|screenshot):\d+\]/g, "");
}

function removeBibliographySection(value: string): string {
  return value.replace(/\n(?:references|bibliography)\s*:[\s\S]*$/i, "").trim();
}

function stripEmbeddedAnswerArtifacts(value: string): string {
  const lower = value.toLowerCase();
  const embeddedOpenIndex = lower.indexOf("<answer>");
  if (embeddedOpenIndex >= 0) {
    value = value.slice(0, embeddedOpenIndex);
  }
  return value.replace(/<\/answer>/gi, "").trim();
}

function isTableSeparatorLine(value: string): boolean {
  const trimmed = value.trim();
  const withoutCitations = stripValidCitations(trimmed).trim();
  if (!withoutCitations.includes("|")) {
    return false;
  }

  return /^[|:\-\s]+$/.test(withoutCitations);
}

function collapseAdjacentTableSeparatorLines(value: string): string {
  const lines = value.split("\n");
  const nextLines: string[] = [];
  let previousWasSeparator = false;

  for (const line of lines) {
    const separator = isTableSeparatorLine(line);
    if (separator && previousWasSeparator) {
      continue;
    }
    nextLines.push(line);
    previousWasSeparator = separator;
  }

  return nextLines.join("\n");
}

function trimTrailingTableSeparatorNoise(value: string): string {
  const lines = value.split("\n");
  let end = lines.length;

  while (end > 0) {
    const trimmed = lines[end - 1]?.trim() ?? "";
    if (!trimmed) {
      end -= 1;
      continue;
    }
    if (isTableSeparatorLine(trimmed)) {
      end -= 1;
      continue;
    }
    break;
  }

  return lines.slice(0, end).join("\n").trim();
}

function sanitizeAnswerBody(value: string): string {
  const withoutBibliography = removeBibliographySection(value);
  const withoutEmbeddedAnswer = stripEmbeddedAnswerArtifacts(withoutBibliography);
  const collapsed = collapseAdjacentTableSeparatorLines(withoutEmbeddedAnswer);
  return trimTrailingTableSeparatorNoise(collapsed);
}

function countWords(value: string): number {
  return normalizeWhitespace(value)
    .split(" ")
    .filter((part) => part.length > 0).length;
}

function isDirectObservationPrompt(userPrompt: string | undefined, hasImageInput: boolean | undefined): boolean {
  const normalized = normalizeWhitespace((userPrompt ?? "").toLowerCase());
  if (!normalized) {
    return false;
  }

  if (
    normalized.includes("what do you see") ||
    normalized.includes("what can you see") ||
    normalized.includes("tell me what you see") ||
    normalized.includes("describe what you see") ||
    normalized.includes("what is visible") ||
    normalized.includes("what's visible") ||
    normalized.includes("what do you notice")
  ) {
    return true;
  }

  return hasImageInput === true && (
    normalized.includes("describe this image") ||
    normalized.includes("describe the image") ||
    normalized.includes("describe this screenshot") ||
    normalized.includes("describe the screenshot") ||
    normalized.includes("summarize this image") ||
    normalized.includes("summarize the image") ||
    normalized.includes("summarize this screenshot") ||
    normalized.includes("summarize the screenshot")
  );
}

function containsMarkdownPresentation(value: string): boolean {
  return (
    /^\s*#{1,6}\s+/m.test(value) ||
    /^\s*[-*]\s+/m.test(value) ||
    /^\s*\d+\.\s+/m.test(value) ||
    value.includes("|") ||
    /[*_`]{1,3}[^*_`]+[*_`]{1,3}/.test(value)
  );
}

function stripMarkdownPresentation(value: string): string {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isTableSeparatorLine(line));

  const normalizedLines = lines.map((line) => {
    if (line.includes("|")) {
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);
      if (cells.length > 0) {
        line = cells.join(" - ");
      }
    }

    return line
      .replace(/(^|\s)#{1,6}\s+/g, "$1")
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
  });

  return normalizedLines.filter((line) => line.length > 0).join("; ");
}

function normalizeObservationLeadIn(value: string, hasImageInput: boolean | undefined): string {
  let normalized = value
    .replace(/^here is a breakdown of what is visible:\s*/i, "")
    .replace(/^here(?:'s| is) what i see:\s*/i, "")
    .replace(/^this (?:image|screenshot|page) (?:shows|displays)\s+/i, "")
    .replace(/^the (?:image|screenshot|page) (?:shows|displays)\s+/i, "")
    .replace(/^i (?:can )?see\s+/i, "");

  normalized = normalizeWhitespace(normalized);
  if (!normalized) {
    return hasImageInput ? "Image reviewed." : "Page reviewed.";
  }

  if (/^(image|page|screenshot)\s*:/i.test(normalized)) {
    return normalized;
  }

  const prefix = hasImageInput ? "Image:" : "Page:";
  return `${prefix} ${normalized}`;
}

function ensurePlainTextObservationResponse(
  text: string,
  userPrompt: string | undefined,
  hasImageInput: boolean | undefined
): string {
  if (!isDirectObservationPrompt(userPrompt, hasImageInput)) {
    return text;
  }

  const flattened = stripMarkdownPresentation(text);
  const clauses = flattened
    .split(";")
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 0)
    .slice(0, 4);

  return normalizeObservationLeadIn(clauses.join("; "), hasImageInput);
}

export function detectLanguageFromText(value: string): string {
  const normalized = ` ${normalizeWhitespace(value.toLowerCase().replace(/[^a-z0-9]+/g, " "))} `;
  if (
    normalized.includes(" resume la ") ||
    normalized.includes(" busca ") ||
    normalized.includes(" informacion ") ||
    normalized.includes(" la pagina ") ||
    normalized.includes(" sobre ") ||
    normalized.includes(" se completo ") ||
    normalized.includes(" se completaron ") ||
    normalized.includes(" ultimo resultado ")
  ) {
    return "es";
  }

  if (
    normalized.includes(" etape ") ||
    normalized.includes(" resultat ") ||
    normalized.includes(" ont ete ")
  ) {
    return "fr";
  }

  if (
    normalized.includes(" schritt ") ||
    normalized.includes(" abgeschlossen ") ||
    normalized.includes(" letztes ergebnis ")
  ) {
    return "de";
  }

  if (
    normalized.includes(" foram concluidos ") ||
    normalized.includes(" passo(s) ") ||
    normalized.includes(" ultimo resultado ")
  ) {
    return "pt";
  }

  if (
    normalized.includes(" sono stati completati ") ||
    normalized.includes(" passaggio(i) ") ||
    normalized.includes(" ultimo risultato ")
  ) {
    return "it";
  }

  return "en";
}

function validateCitations(text: string, availableCitations: string[] | undefined): PolicyViolation[] {
  if (!availableCitations || availableCitations.length === 0) {
    return [];
  }

  const violations: PolicyViolation[] = [];
  const withoutBibliography = text.replace(/\n(?:references|bibliography)\s*:[\s\S]*$/i, "");
  const inlineMatches = withoutBibliography.match(/\[(?:web|screenshot):\d+\]/g) ?? [];
  if (inlineMatches.length === 0) {
    violations.push({
      rule_id: "inline_citations_required",
      code: "POLICY_CITATION_INVALID",
      message: "Inline citations are required when sourced content is referenced."
    });
    return violations;
  }

  for (const citation of inlineMatches) {
    if (!availableCitations.includes(citation)) {
      violations.push({
        rule_id: "citations_must_reference_known_sources",
        code: "POLICY_CITATION_INVALID",
        message: `Citation ${citation} was not produced by this run.`
      });
    }
  }

  return violations;
}

function hasOnlyMissingCitationViolation(violations: PolicyViolation[]): boolean {
  return (
    violations.length > 0 &&
    violations.every(
      (violation) =>
        violation.rule_id === "inline_citations_required" &&
        violation.code === "POLICY_CITATION_INVALID"
    )
  );
}

function hasOnlyRepairableViolations(violations: PolicyViolation[]): boolean {
  const allowedRules = new Set([
    "inline_citations_required",
    "table_header_required",
    "bibliography_forbidden",
    "citations_must_reference_known_sources",
    "raw_tool_tags_forbidden",
    "raw_ids_forbidden_in_final_response",
    "image_acknowledgement_required",
    "lyrics_forbidden",
    "plain_text_observation_required"
  ]);
  return violations.length > 0 && violations.every((violation) => allowedRules.has(violation.rule_id));
}

function appendPrimaryCitation(text: string, citation: string): string {
  const body = extractAnswerBody(text).trim();
  if (!body) {
    return citation;
  }
  if (body.includes(citation)) {
    return body;
  }
  return `${body} ${citation}`;
}

function repairTableHeaderSeparator(text: string): string {
  const lines = extractAnswerBody(text).split("\n");
  const firstTableLineIndex = lines.findIndex((line) => line.includes("|"));
  if (firstTableLineIndex < 0) {
    return extractAnswerBody(text);
  }

  const nextLine = lines[firstTableLineIndex + 1]?.trim() ?? "";
  if (/^\|?\s*:?-{3,}/.test(nextLine)) {
    return extractAnswerBody(text);
  }

  const normalizedRow = lines[firstTableLineIndex].trim().replace(/^\|/, "").replace(/\|$/, "");
  const columnCount = Math.max(1, normalizedRow.split("|").length);
  const separator = `| ${Array.from({ length: columnCount }).map(() => "---").join(" | ")} |`;
  lines.splice(firstTableLineIndex + 1, 0, separator);
  return lines.join("\n");
}

function stripRawToolTags(text: string): string {
  return text.replace(/<\/?(?:tab|attachment|page|database)\b[^>]*>/gi, "").trim();
}

function redactRawIdentifiers(text: string): string {
  return text
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\b(?:run|tab|target)-[a-z0-9-]+\b/gi, "[id]")
    .replace(/\bf\d+:\d+\b/gi, "[id]");
}

function removeLongQuotedSegments(text: string): string {
  return text.replace(/"([^"]+)"/g, (fullMatch, quotedText: string) =>
    countWords(quotedText) > 10 ? quotedText : fullMatch
  );
}

function normalizeInlineCitations(text: string, availableCitations: string[] | undefined): string {
  if (!Array.isArray(availableCitations) || availableCitations.length === 0) {
    return text.replace(/\[(?:web|screenshot):\d+\]/g, "");
  }

  const known = new Set(availableCitations);
  const primary = availableCitations[0];
  return text.replace(/\[(?:web|screenshot):\d+\]/g, (citation) => (known.has(citation) ? citation : primary));
}

function ensureInlineCitation(text: string, availableCitations: string[] | undefined): string {
  if (!Array.isArray(availableCitations) || availableCitations.length === 0) {
    return text;
  }
  const body = text.trim();
  if (/\[(?:web|screenshot):\d+\]/.test(body)) {
    return body;
  }
  return appendPrimaryCitation(body, availableCitations[0]);
}

function imageAcknowledgementPrefix(language: string): string {
  if (language === "es") {
    return "Se reviso la imagen proporcionada.";
  }
  if (language === "fr") {
    return "L'image fournie a ete prise en compte.";
  }
  if (language === "de") {
    return "Das bereitgestellte Bild wurde berucksichtigt.";
  }
  if (language === "pt") {
    return "A imagem fornecida foi considerada.";
  }
  if (language === "it") {
    return "L'immagine fornita e stata considerata.";
  }
  return "The provided image was considered.";
}

function ensureImageAcknowledgement(
  text: string,
  hasImageInput: boolean | undefined,
  expectedLanguage: string
): string {
  if (!hasImageInput) {
    return text;
  }
  if (/\b(image|screenshot|photo|picture)\b/i.test(text)) {
    return text;
  }

  const prefix = imageAcknowledgementPrefix(expectedLanguage);
  const body = text.trim();
  if (!body) {
    return prefix;
  }
  return `${prefix} ${body}`;
}

function replacePipesWithBullets(text: string): string {
  if (!text.includes("|")) {
    return text;
  }

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.includes("|")) {
        return line;
      }
      if (isTableSeparatorLine(trimmed)) {
        return "";
      }
      const cells = trimmed
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);
      return cells.length > 0 ? `- ${cells.join(" - ")}` : "";
    })
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

function repairFinalAnswerCandidate(
  text: string,
  availableCitations: string[] | undefined,
  hasImageInput: boolean | undefined,
  expectedLanguage: string,
  userPrompt: string | undefined
): string {
  let candidate = sanitizeAnswerBody(extractAnswerBody(text));
  candidate = stripRawToolTags(candidate);
  candidate = normalizeInlineCitations(candidate, availableCitations);
  candidate = redactRawIdentifiers(candidate);
  candidate = removeLongQuotedSegments(candidate);
  candidate = collapseAdjacentTableSeparatorLines(candidate);
  candidate = trimTrailingTableSeparatorNoise(candidate);

  if (candidate.includes("|")) {
    const fixedTable = repairTableHeaderSeparator(candidate);
    candidate = fixedTable.includes("|") ? fixedTable : replacePipesWithBullets(fixedTable);
  }

  candidate = ensurePlainTextObservationResponse(candidate, userPrompt, hasImageInput);
  candidate = ensureImageAcknowledgement(candidate, hasImageInput, expectedLanguage);
  candidate = ensureInlineCitation(candidate, availableCitations);

  return sanitizeAnswerBody(candidate);
}

export function validateFinalAnswer(input: ResponseValidationInput): ResponseValidationResult {
  const text = input.text;
  const answerBody = sanitizeAnswerBody(extractAnswerBody(text));
  const normalizedText = wrapAnswerBody(answerBody.trim());
  const violations: PolicyViolation[] = [];
  const normalizedForRawChecks = stripValidCitations(answerBody);
  const userLanguage = input.expectedUserLanguage ?? detectLanguageFromText(input.userPrompt ?? "");
  const responseLanguage = detectLanguageFromText(answerBody);

  violations.push(...validateCitations(answerBody, input.availableCitations));

  if (/^\s*(references|bibliography)\s*:/im.test(answerBody)) {
    violations.push({
      rule_id: "bibliography_forbidden",
      code: "POLICY_RESPONSE_INVALID",
      message: "Bibliography or references sections are not allowed in final answers."
    });
  }

  if (/<\/?(?:tab|attachment|page|database)\b/i.test(answerBody)) {
    violations.push({
      rule_id: "raw_tool_tags_forbidden",
      code: "POLICY_RESPONSE_INVALID",
      message: "Raw tool tags are not allowed in final answers."
    });
  }

  if (
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(normalizedForRawChecks) ||
    /\b(?:run|tab|target)-[a-z0-9-]+\b/i.test(normalizedForRawChecks) ||
    /\bf\d+:\d+\b/i.test(normalizedForRawChecks)
  ) {
    violations.push({
      rule_id: "raw_ids_forbidden_in_final_response",
      code: "POLICY_RESPONSE_INVALID",
      message: "Raw ids are not allowed in final answers."
    });
  }

  const quotedSegments = [...answerBody.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? "");
  if (quotedSegments.some((segment) => countWords(segment) > 10)) {
    violations.push({
      rule_id: "lyrics_forbidden",
      code: "POLICY_RESPONSE_INVALID",
      message: "Long quoted text is not allowed in final answers."
    });
  }

  if (userLanguage !== responseLanguage) {
    violations.push({
      rule_id: "response_language_mismatch",
      code: "POLICY_LANGUAGE_MISMATCH",
      message: "The final answer must match the user's language."
    });
  }

  const tableRows = answerBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"));
  if (tableRows.length > 0) {
    const nonEmptyLines = answerBody
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const firstTableIndex = nonEmptyLines.findIndex((line) => line.includes("|"));
    const separatorLine = nonEmptyLines[firstTableIndex + 1];
    if (!separatorLine || !/^\|?\s*:?-{3,}/.test(separatorLine)) {
      violations.push({
        rule_id: "table_header_required",
        code: "POLICY_RESPONSE_INVALID",
        message: "Markdown tables must include a header separator row."
      });
    }
  }

  if (input.hasImageInput === true) {
    const acknowledgesImage = /\b(image|screenshot|photo|picture)\b/i.test(answerBody);
    if (!acknowledgesImage) {
      violations.push({
        rule_id: "image_acknowledgement_required",
        code: "POLICY_RESPONSE_INVALID",
        message: "Responses must acknowledge when an image is provided."
      });
    }
  }

  if (isDirectObservationPrompt(input.userPrompt, input.hasImageInput) && containsMarkdownPresentation(answerBody)) {
    violations.push({
      rule_id: "plain_text_observation_required",
      code: "POLICY_RESPONSE_INVALID",
      message: "Direct observation answers must use plain text instead of markdown formatting."
    });
  }

  return {
    ok: violations.length === 0,
    violations,
    normalized_text: normalizedText,
    detected_user_language: userLanguage,
    detected_response_language: responseLanguage
  };
}

export function validateFinalAnswerWithAutofix(input: ResponseValidationInput): ResponseValidationResult {
  const initial = validateFinalAnswer(input);
  if (initial.ok) {
    return initial;
  }

  const expectedLanguage =
    input.expectedUserLanguage ?? detectLanguageFromText(input.userPrompt ?? "");
  let candidateText = repairFinalAnswerCandidate(
    input.text,
    input.availableCitations,
    input.hasImageInput,
    expectedLanguage,
    input.userPrompt
  );
  const violationRules = new Set(initial.violations.map((violation) => violation.rule_id));

  if (violationRules.has("inline_citations_required")) {
    const primaryCitation = Array.isArray(input.availableCitations) ? input.availableCitations[0] : undefined;
    if (!primaryCitation || (!hasOnlyMissingCitationViolation(initial.violations) && !hasOnlyRepairableViolations(initial.violations))) {
      return initial;
    }
    candidateText = appendPrimaryCitation(candidateText, primaryCitation);
  }

  if (violationRules.has("table_header_required")) {
    candidateText = repairTableHeaderSeparator(candidateText);
  }

  const repaired = validateFinalAnswer({
    ...input,
    text: sanitizeAnswerBody(candidateText)
  });

  if (repaired.ok) {
    return repaired;
  }

  // Last repair pass: flatten markdown table syntax into bullets if table rules still fail.
  if (repaired.violations.some((violation) => violation.rule_id === "table_header_required")) {
    const flattened = validateFinalAnswer({
      ...input,
      text: sanitizeAnswerBody(replacePipesWithBullets(candidateText))
    });
    if (flattened.ok) {
      return flattened;
    }
  }

  return initial;
}

function formatStepCount(language: string, executedSteps: number): string {
  if (language === "es") {
    return `Se completaron ${executedSteps} paso(s).`;
  }
  if (language === "fr") {
    return `${executedSteps} etape(s) ont ete terminees.`;
  }
  if (language === "de") {
    return `Es wurden ${executedSteps} Schritt(e) abgeschlossen.`;
  }
  if (language === "pt") {
    return `Foram concluidos ${executedSteps} passo(s).`;
  }
  if (language === "it") {
    return `Sono stati completati ${executedSteps} passaggio(i).`;
  }
  return `Completed ${executedSteps} step(s).`;
}

function formatLastResult(language: string, result: Record<string, unknown>): string {
  const payload = JSON.stringify(result);
  if (language === "es") {
    return `Ultimo resultado: ${payload}.`;
  }
  if (language === "fr") {
    return `Dernier resultat: ${payload}.`;
  }
  if (language === "de") {
    return `Letztes Ergebnis: ${payload}.`;
  }
  if (language === "pt") {
    return `Ultimo resultado: ${payload}.`;
  }
  if (language === "it") {
    return `Ultimo risultato: ${payload}.`;
  }
  return `Last result: ${payload}.`;
}

function buildPolicyFallbackAnswer(language: string, availableCitations: string[], hasImageInput: boolean): string {
  const imagePrefix =
    hasImageInput
      ? language === "es"
        ? "Se reviso la imagen proporcionada. "
        : language === "fr"
          ? "L'image fournie a ete prise en compte. "
          : language === "de"
            ? "Das bereitgestellte Bild wurde berucksichtigt. "
            : language === "pt"
              ? "A imagem fornecida foi considerada. "
              : language === "it"
                ? "L'immagine fornita e stata considerata. "
                : "The provided image was considered. "
      : "";
  const base =
    language === "es"
      ? "La ejecucion se completo de forma segura."
      : language === "fr"
        ? "L'execution s'est terminee en respectant la politique."
        : language === "de"
          ? "Die Ausfuhrung wurde richtlinienkonform abgeschlossen."
          : language === "pt"
            ? "A execucao foi concluida com seguranca."
            : language === "it"
              ? "L'esecuzione e stata completata in modo sicuro."
      : "The run completed within policy.";
  const citationSuffix = availableCitations.length > 0 ? availableCitations.join("") : "";
  return wrapAnswerBody(`${imagePrefix}${base}${citationSuffix}`);
}

function extractCitationsFromSources(sources: SourceAttribution[] | undefined): string[] {
  if (!sources) {
    return [];
  }

  return sources
    .map((source) => source.id)
    .filter((id) => /^\[(?:web|screenshot):\d+\]$/.test(id));
}

export function buildValidatedFinalAnswer(input: {
  userPrompt: string;
  executedSteps: number;
  lastResult?: Record<string, unknown>;
  availableCitations: string[];
  hasImageInput?: boolean;
}): { text: string; violations: PolicyViolation[] } {
  const language = detectLanguageFromText(input.userPrompt);
  const primaryCitation = input.availableCitations[0];
  const parts: string[] = [formatStepCount(language, input.executedSteps)];

  if (input.lastResult && Object.keys(input.lastResult).length > 0) {
    parts.push(formatLastResult(language, input.lastResult));
  }

  let text = parts.join(" ");
  if (primaryCitation) {
    text = text.replace(/\.(\s|$)/g, `.${primaryCitation}$1`);
  }

  const validation = validateFinalAnswer({
    userPrompt: input.userPrompt,
    text,
    availableCitations: input.availableCitations,
    hasImageInput: input.hasImageInput
  });

  if (validation.ok) {
    return {
      text: validation.normalized_text,
      violations: []
    };
  }

  const fallback = primaryCitation
    ? `${formatStepCount(language, input.executedSteps)}${primaryCitation}`
    : formatStepCount(language, input.executedSteps);
  return {
    text: wrapAnswerBody(fallback),
    violations: validation.violations
  };
}

export function enforceUserFacingResponsePayload(action: string, result: JsonObject): JsonObject {
  if (action !== "AgentGetState") {
    return result;
  }

  if (typeof result.final_answer !== "string") {
    return result;
  }

  const sources = Array.isArray(result.sources)
    ? result.sources.filter(
        (value): value is SourceAttribution =>
          typeof value === "object" &&
          value !== null &&
          typeof (value as { id?: unknown }).id === "string" &&
          typeof (value as { origin?: unknown }).origin === "string"
      )
    : undefined;
  const availableCitations = extractCitationsFromSources(sources);
  const hasImageInput =
    result.has_image_input === true ||
    (sources?.some((source) => source.origin === "image") ?? false);
  const expectedUserLanguage =
    typeof result.user_language === "string" && result.user_language.length > 0 ? result.user_language : "en";

  const validation = validateFinalAnswerWithAutofix({
    expectedUserLanguage,
    text: result.final_answer,
    availableCitations,
    hasImageInput
  });

  if (validation.ok) {
    return {
      ...result,
      final_answer: validation.normalized_text
    };
  }

  return {
    ...result,
    final_answer: buildPolicyFallbackAnswer(expectedUserLanguage, availableCitations, hasImageInput)
  };
}
