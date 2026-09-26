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

async function main() {
  if (!secret) {
    throw new Error(
      "CMS_WARM_SECRET is required; refusing to report a public cache read as a CMS warm",
    );
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

  const warmedCount = data.warmed_count ?? data.count ?? 0;
  const skippedCount = data.skipped_count ?? 0;
  const errorCount = data.error_count ?? (data.warmed || []).filter((row) => !row.ok).length;
  console.log(
    `CMS warm ok — ${warmedCount} warmed, ${skippedCount} skipped, ${errorCount} errors`
  );
  for (const row of data.warmed || []) {
    const state = row.skipped
      ? `skipped (${row.reason || "not published"})`
      : row.ok
        ? "warmed"
        : row.error || "failed";
    console.log(`  ${row.slug}: ${state}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
