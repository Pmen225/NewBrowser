const BENCHMARK_HASH_KEY = "atlas-benchmark";
const BENCHMARK_ROLE_KEY = "atlas-benchmark-role";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^models\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value) {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function modelLabel(modelId) {
  const normalized = String(modelId || "").replace(/^models\//, "");
  return titleCase(normalized.replace(/^gemini-/, "gemini "));
}

function scenarioLabel(scenarioName) {
  return titleCase(String(scenarioName || "").replace(/[_/]+/g, "-"));
}

export function createBenchmarkMarker({ modelId, scenarioName, now = Date.now() } = {}) {
  const modelSlug = slugify(modelId || "model");
  const scenarioSlug = slugify(scenarioName || "scenario");
  return `bench-${modelSlug}-${scenarioSlug}-${now}`;
}

export function buildBenchmarkTaggedUrl(url, benchmarkMarker, role) {
  const nextUrl = new URL(url);
  const hashParams = new URLSearchParams(nextUrl.hash.startsWith("#") ? nextUrl.hash.slice(1) : nextUrl.hash);
  hashParams.set(BENCHMARK_HASH_KEY, benchmarkMarker);
  if (role) {
    hashParams.set(BENCHMARK_ROLE_KEY, role);
  }
  nextUrl.hash = hashParams.toString();
  return nextUrl.toString();
}

export function isBenchmarkTaggedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has(BENCHMARK_HASH_KEY)) {
      return true;
    }
    const hashParams = new URLSearchParams(parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash);
    return hashParams.has(BENCHMARK_HASH_KEY);
  } catch {
    return false;
  }
}

export function buildBenchmarkWorkspace({
  benchmarkMarker,
  targetUrl,
  panelUrl,
  modelId,
  scenarioName
}) {
  const marker = benchmarkMarker || createBenchmarkMarker({ modelId, scenarioName });
  return {
    benchmarkMarker: marker,
    title: `Benchmark: ${modelLabel(modelId)} · ${scenarioLabel(scenarioName)}`,
    siteUrl: buildBenchmarkTaggedUrl(targetUrl, marker, "site"),
    panelUrl: buildBenchmarkTaggedUrl(panelUrl, marker, "panel")
  };
}
