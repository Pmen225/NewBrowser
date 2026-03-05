export type BlockedDomainList = "allowlist" | "blocklist" | "hard_block";

export interface BlockedDomainsPolicy {
  blocklist?: string[];
  allowlist?: string[];
}

export interface BlockedDomainDecision {
  allowed: boolean;
  normalized_url: string;
  hostname: string;
  matched_rule?: string;
  matched_list?: BlockedDomainList;
}

interface DispatcherLikeError extends Error {
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

interface QueryToken {
  key: string;
  keyOnly: boolean;
  expectedValue?: string;
  valuePrefix: boolean;
}

interface ParsedRule {
  raw: string;
  list: BlockedDomainList;
  specificity: number;
  scheme?: string;
  host: string;
  hostExact: boolean;
  hostSpecificity: number;
  port?: number;
  pathPrefix?: string;
  queryTokens: QueryToken[];
}

interface CandidateRule {
  rule: ParsedRule;
}

function createDispatcherLikeError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): DispatcherLikeError {
  const error = new Error(message) as DispatcherLikeError;
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

function toSpecificity(text: string): number {
  return [...text].filter((char) => char !== "*").length;
}

function normalizePort(port: string, scheme: string): number | undefined {
  if (port.length > 0) {
    const parsed = Number(port);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
      return undefined;
    }
    return parsed;
  }

  if (scheme === "http") {
    return 80;
  }
  if (scheme === "https") {
    return 443;
  }
  if (scheme === "ftp") {
    return 21;
  }
  if (scheme === "ws") {
    return 80;
  }
  if (scheme === "wss") {
    return 443;
  }

  return undefined;
}

function hasScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

function isHostLike(value: string): boolean {
  return /^(?:localhost(?::\d+)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?|\[[0-9a-fA-F:.]+\](?::\d+)?|[^/\s?#]+\.[^/\s?#]+)(?:[/?#].*)?$/.test(
    value
  );
}

export function normalizeNavigationUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  if (hasScheme(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }

  if (isHostLike(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function splitBaseAndQuery(raw: string): { base: string; query?: string } {
  const questionMarkIndex = raw.indexOf("?");
  if (questionMarkIndex >= 0) {
    return {
      base: raw.slice(0, questionMarkIndex),
      query: raw.slice(questionMarkIndex + 1)
    };
  }

  const atIndex = raw.lastIndexOf("@");
  if (atIndex < 0) {
    return { base: raw };
  }

  return {
    base: raw.slice(0, atIndex),
    query: raw.slice(atIndex + 1)
  };
}

function parseQueryTokens(query: string | undefined): QueryToken[] {
  if (!query || query.length === 0) {
    return [];
  }

  const tokens: QueryToken[] = [];
  for (const rawToken of query.split("&")) {
    if (rawToken.length === 0) {
      continue;
    }

    const valuePrefix = rawToken.endsWith("*");
    const tokenWithoutWildcard = valuePrefix ? rawToken.slice(0, -1) : rawToken;
    const equalsIndex = tokenWithoutWildcard.indexOf("=");

    if (equalsIndex < 0) {
      tokens.push({
        key: tokenWithoutWildcard,
        keyOnly: true,
        valuePrefix
      });
      continue;
    }

    tokens.push({
      key: tokenWithoutWildcard.slice(0, equalsIndex),
      keyOnly: false,
      expectedValue: tokenWithoutWildcard.slice(equalsIndex + 1),
      valuePrefix
    });
  }

  return tokens;
}

function parseAuthority(authority: string): { host: string; port?: number } | undefined {
  if (authority.length === 0) {
    return undefined;
  }

  const withoutCredentials = authority.includes("@") ? authority.slice(authority.lastIndexOf("@") + 1) : authority;
  if (withoutCredentials.length === 0) {
    return undefined;
  }

  if (withoutCredentials.startsWith("[")) {
    const closing = withoutCredentials.indexOf("]");
    if (closing < 0) {
      return undefined;
    }

    const host = withoutCredentials.slice(0, closing + 1);
    const trailing = withoutCredentials.slice(closing + 1);
    if (trailing.length === 0) {
      return { host };
    }

    if (!trailing.startsWith(":")) {
      return undefined;
    }

    const port = Number(trailing.slice(1));
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      return undefined;
    }

    return {
      host,
      port
    };
  }

  const portSeparator = withoutCredentials.lastIndexOf(":");
  if (portSeparator < 0) {
    return { host: withoutCredentials };
  }

  const host = withoutCredentials.slice(0, portSeparator);
  const portRaw = withoutCredentials.slice(portSeparator + 1);
  if (!/^\d+$/.test(portRaw)) {
    return { host: withoutCredentials };
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return undefined;
  }

  return {
    host,
    port
  };
}

function parseRule(rawRule: string, list: BlockedDomainList): ParsedRule | undefined {
  const trimmed = rawRule.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const withoutFragment = trimmed.split("#")[0] ?? trimmed;
  const trimmedLower = trimmed.toLowerCase();
  const { base, query } = splitBaseAndQuery(withoutFragment);
  const queryTokens = parseQueryTokens(query);

  let scheme: string | undefined;
  let remainder = base;

  const schemeWildcard = /^([a-zA-Z][a-zA-Z0-9+.-]*):\*$/.exec(base);
  if (schemeWildcard) {
    scheme = schemeWildcard[1]?.toLowerCase();
    remainder = "*";
  } else if (base.includes("://")) {
    const [rawScheme, ...restParts] = base.split("://");
    scheme = (rawScheme ?? "").toLowerCase();
    remainder = restParts.join("://");
  }

  const slashIndex = remainder.indexOf("/");
  const authority = slashIndex >= 0 ? remainder.slice(0, slashIndex) : remainder;
  const pathPrefix = slashIndex >= 0 ? remainder.slice(slashIndex) : undefined;

  const parsedAuthority = parseAuthority(authority);
  if (!parsedAuthority) {
    return undefined;
  }

  let host = parsedAuthority.host.replace(/[./]+$/g, "").toLowerCase();
  if (host.length === 0) {
    return undefined;
  }

  if (host !== "*" && host.includes("*")) {
    return undefined;
  }

  let hostExact = false;
  if (host.startsWith(".")) {
    hostExact = true;
    host = host.slice(1);
  }

  if (host.length === 0) {
    return undefined;
  }

  const standardSchemes = new Set(["http", "https", "ftp", "ws", "wss", "file", "*"]);
  if (scheme && !standardSchemes.has(scheme)) {
    const isValidCustomWildcardOnly =
      (trimmedLower === `${scheme}:*` || trimmedLower === `${scheme}://*`) &&
      host === "*" &&
      !pathPrefix &&
      queryTokens.length === 0;

    if (!isValidCustomWildcardOnly) {
      return undefined;
    }
  }

  return {
    raw: trimmed,
    list,
    specificity: toSpecificity(withoutFragment.toLowerCase()),
    scheme,
    host,
    hostExact,
    hostSpecificity: toSpecificity(host),
    port: parsedAuthority.port,
    pathPrefix,
    queryTokens
  };
}

function buildRules(policy: BlockedDomainsPolicy): ParsedRule[] {
  const rules: ParsedRule[] = [];

  for (const rawRule of policy.allowlist ?? []) {
    const parsed = parseRule(rawRule, "allowlist");
    if (parsed) {
      rules.push(parsed);
    }
  }

  for (const rawRule of policy.blocklist ?? []) {
    const parsed = parseRule(rawRule, "blocklist");
    if (parsed) {
      rules.push(parsed);
    }
  }

  const hardBlockChrome = parseRule("chrome://*", "hard_block");
  if (hardBlockChrome) {
    rules.push(hardBlockChrome);
  }

  const hardBlockFile = parseRule("file://*", "hard_block");
  if (hardBlockFile) {
    rules.push(hardBlockFile);
  }

  return rules;
}

function matchHost(rule: ParsedRule, urlHostname: string): number {
  if (rule.host === "*") {
    return 0;
  }

  if (rule.hostExact) {
    return urlHostname === rule.host ? rule.hostSpecificity : -1;
  }

  if (urlHostname === rule.host || urlHostname.endsWith(`.${rule.host}`)) {
    return rule.hostSpecificity;
  }

  return -1;
}

function matchScheme(rule: ParsedRule, urlScheme: string): boolean {
  if (!rule.scheme) {
    return true;
  }
  if (rule.scheme === "*") {
    return true;
  }
  return rule.scheme === urlScheme;
}

function matchPort(rule: ParsedRule, urlEffectivePort: number | undefined): boolean {
  if (rule.port === undefined) {
    return true;
  }
  return urlEffectivePort !== undefined && rule.port === urlEffectivePort;
}

function matchPath(rule: ParsedRule, urlPathname: string): boolean {
  if (!rule.pathPrefix || rule.pathPrefix.length === 0) {
    return true;
  }
  return urlPathname.startsWith(rule.pathPrefix);
}

function valueMatchesToken(value: string, token: QueryToken): boolean {
  if (token.keyOnly) {
    return true;
  }

  const expected = token.expectedValue ?? "";
  if (token.valuePrefix) {
    return value.startsWith(expected);
  }

  return value === expected;
}

function matchQueryTokens(rule: ParsedRule, url: URL): boolean {
  if (rule.queryTokens.length === 0) {
    return true;
  }

  const valuesByKey = new Map<string, string[]>();
  for (const [key, value] of url.searchParams.entries()) {
    const values = valuesByKey.get(key) ?? [];
    values.push(value);
    valuesByKey.set(key, values);
  }

  for (const token of rule.queryTokens) {
    const keyValues = valuesByKey.get(token.key);
    if (!keyValues || keyValues.length === 0) {
      return false;
    }

    if (token.keyOnly) {
      continue;
    }

    if (rule.list === "allowlist") {
      if (!keyValues.every((value) => valueMatchesToken(value, token))) {
        return false;
      }
      continue;
    }

    if (!keyValues.some((value) => valueMatchesToken(value, token))) {
      return false;
    }
  }

  return true;
}

function parseAbsoluteUrl(rawUrl: string): URL {
  const normalizedInput = normalizeNavigationUrl(rawUrl);
  try {
    return new URL(normalizedInput);
  } catch {
    throw createDispatcherLikeError("INVALID_REQUEST", "Navigate mode=to requires an absolute URL", false, {
      field: "url"
    });
  }
}

function selectWinner(candidates: CandidateRule[]): CandidateRule | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const allowlistCandidate = candidates.find((candidate) => candidate.rule.list === "allowlist");
  if (allowlistCandidate) {
    return allowlistCandidate;
  }

  return candidates[0];
}

export function evaluateBlockedNavigation(rawUrl: string, policy: BlockedDomainsPolicy): BlockedDomainDecision {
  const parsedUrl = parseAbsoluteUrl(rawUrl);
  const normalizedUrl = parsedUrl.toString();

  const urlScheme = parsedUrl.protocol.replace(":", "").toLowerCase();
  const urlHostname = parsedUrl.hostname.toLowerCase();
  const urlEffectivePort = normalizePort(parsedUrl.port, urlScheme);
  const urlPathname = parsedUrl.pathname;

  const rules = buildRules(policy);
  const matchedCandidates: CandidateRule[] = [];
  for (const rule of rules) {
    if (matchHost(rule, urlHostname) < 0) {
      continue;
    }

    if (!matchScheme(rule, urlScheme) || !matchPort(rule, urlEffectivePort)) {
      continue;
    }

    if (!matchPath(rule, urlPathname) || !matchQueryTokens(rule, parsedUrl)) {
      continue;
    }

    matchedCandidates.push({ rule });
  }

  if (matchedCandidates.length > 0) {
    const maxSpecificity = Math.max(...matchedCandidates.map((candidate) => candidate.rule.specificity));
    const finalists = matchedCandidates.filter((candidate) => candidate.rule.specificity === maxSpecificity);
    const winner = selectWinner(finalists);
    if (winner) {
      if (winner.rule.list === "allowlist") {
        return {
          allowed: true,
          normalized_url: normalizedUrl,
          hostname: parsedUrl.hostname,
          matched_rule: winner.rule.raw,
          matched_list: "allowlist"
        };
      }

      return {
        allowed: false,
        normalized_url: normalizedUrl,
        hostname: parsedUrl.hostname,
        matched_rule: winner.rule.raw,
        matched_list: winner.rule.list
      };
    }
  }

  return {
    allowed: true,
    normalized_url: normalizedUrl,
    hostname: parsedUrl.hostname
  };
}
