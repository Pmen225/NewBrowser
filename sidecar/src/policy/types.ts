import type { JsonObject } from "../../../shared/src/transport";

export interface PolicyViolation {
  rule_id: string;
  code: string;
  message: string;
  details?: JsonObject;
}

export interface PromptPolicy {
  inspectBeforeInteractiveActions: boolean;
  requireValidationAfterPageActions: boolean;
  requireSingleStateChangingComputerAction: boolean;
  preferReadPageForInspection: boolean;
  preferGetPageTextForLongReading: boolean;
  preferSearchWebForGeneralSearch: boolean;
  requireFrequentTodoTracking: boolean;
  requireSameLanguageResponses: boolean;
  requireInlineCitations: boolean;
  disallowRawIdsInFinalResponse: boolean;
  disallowRawToolTagsInFinalResponse: boolean;
  disallowBibliographySection: boolean;
  disallowLyrics: boolean;
  requireTableHeaderRows: boolean;
  requireImageAcknowledgement: boolean;
  disallowExternalImageTransmission: boolean;
  blockGoogleSearchNavigation: boolean;
  blockArchiveAccess: boolean;
  blockSensitiveQueryParams: boolean;
  blockPasswordEntry: boolean;
  blockSensitiveIdentityFinancialInput: boolean;
  blockSensitiveBrowserDataAccess: boolean;
  blockHarmfulSearches: boolean;
}

export interface ResponseValidationInput {
  userPrompt?: string;
  expectedUserLanguage?: string;
  text: string;
  availableCitations?: string[];
  hasImageInput?: boolean;
}

export interface ResponseValidationResult {
  ok: boolean;
  violations: PolicyViolation[];
  normalized_text: string;
  detected_user_language: string;
  detected_response_language: string;
}
