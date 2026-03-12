import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = process.cwd();
const ROOTS = [
  { key: "output", relativePath: "output" },
  { key: "sidecar-traces", relativePath: ".sidecar-traces" }
];

function toRepoRelative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function walkFiles(root, currentDir) {
  const entries = readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(root, entryPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(toRepoRelative(root, entryPath));
    }
  }

  return files;
}

function parseCliArgs(argv) {
  const parsed = {
    root: DEFAULT_ROOT,
    outputFile: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root" && argv[index + 1]) {
      parsed.root = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (value === "--output" && argv[index + 1]) {
      parsed.outputFile = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function normalizeOutputFile(root, outputFile) {
  if (typeof outputFile === "string" && outputFile.trim().length > 0) {
    return path.isAbsolute(outputFile)
      ? outputFile
      : path.join(root, outputFile.trim());
  }

  const fromEnv = process.env.QA_ARTIFACT_MANIFEST?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(root, fromEnv);
  }

  return path.join(root, "output", "qa-artifacts", "manifest.json");
}

export function collectQaArtifacts({
  root = DEFAULT_ROOT,
  outputFile = ""
} = {}) {
  const resolvedRoot = path.resolve(root);
  const resolvedOutputFile = normalizeOutputFile(resolvedRoot, outputFile);
  const outputRelativePath = toRepoRelative(resolvedRoot, resolvedOutputFile);

  const roots = ROOTS.map(({ key, relativePath }) => {
    const absolutePath = path.join(resolvedRoot, relativePath);
    const exists = existsSync(absolutePath) && statSync(absolutePath).isDirectory();
    const files = exists ? walkFiles(resolvedRoot, absolutePath) : [];
    return {
      key,
      path: relativePath,
      exists,
      files
    };
  });

  const outputRoot = roots.find((entry) => entry.key === "output");
  if (
    outputRoot?.exists &&
    outputRelativePath.startsWith("output/") &&
    !outputRoot.files.includes(outputRelativePath)
  ) {
    outputRoot.files.push(outputRelativePath);
    outputRoot.files.sort((left, right) => left.localeCompare(right));
  }

  const manifestFiles = roots.flatMap((entry) => entry.files);
  if (!manifestFiles.includes(outputRelativePath)) {
    manifestFiles.push(outputRelativePath);
    manifestFiles.sort((left, right) => left.localeCompare(right));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    outputFile: outputRelativePath,
    roots: roots.map((entry) => ({
      key: entry.key,
      path: entry.path,
      exists: entry.exists,
      fileCount: entry.files.length
    })),
    files: manifestFiles
  };

  mkdirSync(path.dirname(resolvedOutputFile), { recursive: true });
  writeFileSync(resolvedOutputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const manifest = collectQaArtifacts({
    root: cli.root,
    outputFile: cli.outputFile
  });
  console.log(JSON.stringify(manifest, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
