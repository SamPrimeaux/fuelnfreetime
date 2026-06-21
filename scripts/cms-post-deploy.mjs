#!/usr/bin/env node
/**
 * Warm CMS KV snapshots after a Worker deploy.
 *
 * Requires CMS_WARM_SECRET on the Worker:
 *   wrangler secret put CMS_WARM_SECRET
 *
 * Usage:
 *   npm run cms:post-deploy
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

const workerUrl = env.FNF_WORKER_URL || "https://fuelnfreetime.com";
const secret = env.CMS_WARM_SECRET || "";

async function warmViaPublicApi() {
  const slugs = ["site", "home", "shop", "about", "community"];
  for (const slug of slugs) {
    const res = await fetch(`${workerUrl}/api/cms/pages/${slug}`);
    console.log(`${slug}: ${res.ok ? "ok" : `HTTP ${res.status}`}`);
  }
}

async function main() {
  if (!secret) {
    console.warn("CMS_WARM_SECRET not set — falling back to public API warm.");
    await warmViaPublicApi();
    return;
  }

  const res = await fetch(`${workerUrl}/api/internal/cms/warm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Cms-Warm-Secret": secret,
    },
    body: JSON.stringify({ trigger_source: "post-deploy" }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("CMS warm failed:", data.error || res.status);
    process.exit(1);
  }

  console.log(`CMS warm ok — ${data.count}/${data.warmed?.length || 0} pages`);
  for (const row of data.warmed || []) {
    console.log(`  ${row.slug}: ${row.ok ? "ok" : row.error || "failed"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
