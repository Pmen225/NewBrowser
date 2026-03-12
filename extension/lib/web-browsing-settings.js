import { normalizeModelConfig } from "./model-config.js";

export function getDefaultWebBrowsingSettings() {
  const defaults = normalizeModelConfig(null);
  return {
    allowBrowserSearch: defaults.allowBrowserSearch
  };
}

export function readWebBrowsingSettings(modelConfig) {
  const normalized = normalizeModelConfig(modelConfig);
  return {
    allowBrowserSearch: normalized.allowBrowserSearch
  };
}

export function resetWebBrowsingModelConfig(modelConfig) {
  const normalized = normalizeModelConfig(modelConfig);
  const defaults = getDefaultWebBrowsingSettings();
  return normalizeModelConfig({
    ...normalized,
    ...defaults
  });
}
