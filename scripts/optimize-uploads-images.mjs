#!/usr/bin/env node
/**
 * Thin wrapper — prefer: ./scripts/with-cf-admin-env.sh bin/fnf-assets.mjs optimize …
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin/fnf-assets.mjs");
const args = process.argv.slice(2);
const prefix = args.includes("--prefix") ? [] : ["--prefix", "uploads/"];
const result = spawnSync(process.execPath, [bin, "optimize", ...prefix, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
