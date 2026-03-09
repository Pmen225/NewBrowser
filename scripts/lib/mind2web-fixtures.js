import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LOCAL_FIXTURE_SOURCE = path.join("scripts", "fixtures", "mind2web", "minimal-subset.json");
const LOCAL_FIXTURE_OUTPUT = path.join("data", "benchmarks", "mind2web", "local", "minimal-subset.json");

export function defaultMind2WebFixturePath(root = process.cwd()) {
  return path.join(root, LOCAL_FIXTURE_OUTPUT);
}

export function loadMind2WebTaskSet(filePath) {
  const payload = JSON.parse(readFileSync(filePath, "utf8"));
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  return {
    benchmark: typeof payload?.benchmark === "string" ? payload.benchmark : "mind2web-local-subset",
    version: Number.isFinite(payload?.version) ? payload.version : 1,
    source: typeof payload?.source === "string" ? payload.source : "",
    tasks
  };
}

export function materializeLocalMind2WebSubset(root = process.cwd()) {
  const sourcePath = path.join(root, LOCAL_FIXTURE_SOURCE);
  const outputPath = defaultMind2WebFixturePath(root);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  cpSync(sourcePath, outputPath);
  return outputPath;
}

export async function materializeOnlineMind2WebSubset({
  root = process.cwd(),
  outputPath = path.join(root, "data", "benchmarks", "mind2web", "online", "online-subset.json"),
  sourcePath = process.env.ONLINE_MIND2WEB_JSON?.trim() || "",
  token = process.env.HF_TOKEN?.trim() || process.env.HUGGING_FACE_HUB_TOKEN?.trim() || "",
  fetchImpl = globalThis.fetch
} = {}) {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  let raw = null;
  if (sourcePath) {
    raw = readFileSync(sourcePath, "utf8");
  } else if (token) {
    const response = await fetchImpl("https://huggingface.co/datasets/osunlp/Online-Mind2Web/resolve/main/Online_Mind2Web.json?download=true", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`Online-Mind2Web download failed with HTTP ${response.status}.`);
    }
    raw = await response.text();
  } else {
    throw new Error("Online-Mind2Web is gated. Set ONLINE_MIND2WEB_JSON or HF_TOKEN/HUGGING_FACE_HUB_TOKEN to materialize a local subset.");
  }

  const parsed = JSON.parse(raw);
  const tasks = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  const subset = {
    benchmark: "online-mind2web-subset",
    version: 1,
    source: sourcePath ? "local-json" : "huggingface-authenticated",
    tasks: tasks.slice(0, 5)
  };
  writeFileSync(outputPath, JSON.stringify(subset, null, 2));
  return outputPath;
}

export function resolvePreparedMind2WebTaskPath({
  root = process.cwd(),
  explicitPath = process.env.MIND2WEB_TASK_FILE?.trim() || ""
} = {}) {
  if (explicitPath) {
    return path.isAbsolute(explicitPath) ? explicitPath : path.join(root, explicitPath);
  }
  const prepared = defaultMind2WebFixturePath(root);
  if (existsSync(prepared)) {
    return prepared;
  }
  return materializeLocalMind2WebSubset(root);
}
