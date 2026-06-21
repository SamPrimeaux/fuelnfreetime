#!/usr/bin/env node
/**
 * Trigger Cloudflare Workers Builds deploy hook (rebuild + deploy main).
 *
 * Set CMS_DEPLOY_HOOK_URL in .env.cloudflare — from Workers Builds → Deploy Hooks.
 *
 * Usage:
 *   npm run cms:deploy-hook
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = {
  ...loadEnvFile(path.join(root, ".env.cloudflare")),
  ...process.env,
};

const hookUrl = env.CMS_DEPLOY_HOOK_URL;
if (!hookUrl) {
  console.error("Missing CMS_DEPLOY_HOOK_URL.");
  console.error("Add to .env.cloudflare (Workers Builds → fuelnfreetime-cms-deployhook → copy URL).");
  process.exit(1);
}

const res = await fetch(hookUrl, { method: "POST" });
const text = await res.text().catch(() => "");

if (!res.ok) {
  console.error(`Deploy hook failed: HTTP ${res.status}`);
  console.error(text.slice(0, 500));
  process.exit(1);
}

console.log("Deploy hook triggered (main rebuild queued).");
if (text) console.log(text.slice(0, 300));
