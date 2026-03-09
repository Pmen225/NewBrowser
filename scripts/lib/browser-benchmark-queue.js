export const OFFICIAL_BROWSER_BENCHMARK_QUEUE = Object.freeze([
  Object.freeze({
    id: "assistantbench",
    label: "AssistantBench",
    upstream: "https://assistantbench.github.io/",
    sourceType: "open-web",
    status: "queued",
    notes: "Start with a stable subset of realistic open-web tasks after Online-Mind2Web is runnable."
  }),
  Object.freeze({
    id: "webarena",
    label: "WebArena",
    upstream: "https://webarena.dev/",
    sourceType: "self-hosted",
    status: "queued",
    notes: "Use a reproducible subset of self-hosted tasks once the open-web course is stable."
  }),
  Object.freeze({
    id: "visualwebarena",
    label: "VisualWebArena",
    upstream: "https://github.com/web-arena-x/visualwebarena",
    sourceType: "visual",
    status: "queued",
    notes: "Add after the base WebArena path so screenshot-grounded failures are separated cleanly."
  }),
  Object.freeze({
    id: "workarena",
    label: "WorkArena",
    upstream: "https://github.com/ServiceNow/BrowserGym",
    sourceType: "enterprise",
    status: "queued",
    notes: "Use BrowserGym-backed enterprise workflow tasks after the core open-web benchmarks."
  })
]);

export function getOfficialBrowserBenchmarkQueue() {
  return OFFICIAL_BROWSER_BENCHMARK_QUEUE.map((entry) => ({ ...entry }));
}
