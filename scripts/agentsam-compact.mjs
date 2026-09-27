#!/usr/bin/env node
/**
 * Trigger AgentSam compaction via authenticated admin API.
 *
 * Production authority: Worker scheduled() cron.
 * Manual: POST /api/admin/agentsam/maintenance/compact with admin session cookie.
 *
 * Usage:
 *   FNF_ADMIN_SESSION_COOKIE='fnf_admin_session=...' npm run agentsam:compact
 *   npm run agentsam:compact -- --force
 */

const WORKER_URL = process.env.FNF_WORKER_URL || "https://fuelnfreetime.com";
const COOKIE = process.env.FNF_ADMIN_SESSION_COOKIE || "";

const args = process.argv.slice(2);
const force = args.includes("--force");
const skipTrim = args.includes("--skip-trim");
const dateArg = args.find((a) => a.startsWith("--date="));
const dateKey = dateArg ? dateArg.split("=")[1] : undefined;

async function main() {
  if (!COOKIE) {
    console.error("Missing FNF_ADMIN_SESSION_COOKIE.");
    console.error("Compaction no longer uses AGENTSAM_COMPACTION_SECRET.");
    console.error("Normal runs are scheduled(); manual runs need an admin session:");
    console.error("  POST /api/admin/agentsam/maintenance/compact");
    process.exit(1);
  }

  const res = await fetch(`${WORKER_URL}/api/admin/agentsam/maintenance/compact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: COOKIE,
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
