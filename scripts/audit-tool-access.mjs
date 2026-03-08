import { SYSTEM_REQUIRED_TOOL_NAMES, validateRequiredToolSchemas } from "../sidecar/src/agent/tool-schema.ts";

const report = validateRequiredToolSchemas(SYSTEM_REQUIRED_TOOL_NAMES);

const payload = {
  checked: [...SYSTEM_REQUIRED_TOOL_NAMES],
  available: report.available,
  missing: report.missing,
  ok: report.missing.length === 0,
  timestamp: new Date().toISOString()
};

console.log(JSON.stringify(payload, null, 2));

if (!payload.ok) {
  process.exitCode = 1;
}
