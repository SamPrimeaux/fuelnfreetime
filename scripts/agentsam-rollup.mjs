#!/usr/bin/env node
/**
 * Alias for AgentSam daily rollup (analytics + prompt usage + tool calls).
 * See scripts/agentsam-compact.mjs
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const compactScript = path.join(scriptDir, "agentsam-compact.mjs");

const result = spawnSync(process.execPath, [compactScript, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
