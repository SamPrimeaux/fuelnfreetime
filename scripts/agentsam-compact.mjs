#!/usr/bin/env node
/**
 * Trigger AgentSam compaction on production.
 *
 * Requires AGENTSAM_COMPACTION_SECRET on the Worker (wrangler secret put AGENTSAM_COMPACTION_SECRET).
 *
 * Usage:
 *   npm run agentsam:compact
 *   npm run agentsam:compact -- --force
 *   npm run agentsam:compact -- --date=2026-06-19
 *   npm run agentsam:compact -- --skip-trim
 */

const WORKER_URL = process.env.FNF_WORKER_URL || "https://fuelnfreetime.com";
const SECRET = process.env.AGENTSAM_COMPACTION_SECRET || "";

const args = process.argv.slice(2);
const force = args.includes("--force");
const skipTrim = args.includes("--skip-trim");
const dateArg = args.find((a) => a.startsWith("--date="));
const dateKey = dateArg ? dateArg.split("=")[1] : undefined;

async function main() {
  if (!SECRET) {
    console.error("Missing AGENTSAM_COMPACTION_SECRET.");
    console.error("Set it in the shell or ~/inneranimalmedia/.env.cloudflare, then:");
    console.error("  wrangler secret put AGENTSAM_COMPACTION_SECRET");
    console.error("");
    console.error("Alternatively POST /api/admin/agentsam/compaction/run while logged into admin.");
    process.exit(1);
  }

  const res = await fetch(`${WORKER_URL}/api/internal/agentsam/compaction/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Agentsam-Compaction-Secret": SECRET,
    },
    body: JSON.stringify({
      force,
      skip_trim: skipTrim,
      date_key: dateKey,
      trigger_source: "script",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Compaction failed:", data.error || res.statusText);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  process.exit(data.ok === false && !data.skipped ? 1 : 0);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
