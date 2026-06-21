#!/usr/bin/env node
/**
 * Fetch full HTML/text from Resend for inbound rows missing body content.
 * Usage: npm run mail:hydrate
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const DB = "fuelnfreetime";

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

function d1(sql) {
  const out = execFileSync("wrangler", ["d1", "execute", DB, "--remote", "--json", "--command", sql], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(out)[0]?.results || [];
}

function esc(value) {
  return String(value || "").replace(/'/g, "''");
}

const env = {
  ...loadEnvFile(path.join(root, ".env.cloudflare")),
  ...process.env,
};
const apiKey = env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY missing — set in .env.cloudflare or environment");
  process.exit(1);
}

const rows = d1(
  `SELECT id, provider_id, subject FROM mail_messages
   WHERE direction = 'inbound'
     AND provider_id IS NOT NULL
     AND (body_html IS NULL OR body_html = '' OR body_text IS NULL OR body_text = '')
   ORDER BY created_at DESC`
);

let updated = 0;
let failed = 0;

for (const row of rows) {
  const providerId = row.provider_id;
  if (!providerId) continue;

  const res = await fetch(`https://api.resend.com/emails/receiving/${providerId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn(`Failed ${providerId}:`, data?.message || res.status);
    failed += 1;
    continue;
  }

  const email = data?.object === "email" ? data : data?.data || data;
  const bodyText = email.text || "";
  const bodyHtml = email.html || "";
  const preview = (bodyText || bodyHtml.replace(/<[^>]+>/g, " ") || row.subject || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  d1(
    `UPDATE mail_messages
     SET body_text = '${esc(bodyText)}',
         body_html = '${esc(bodyHtml)}',
         preview = '${esc(preview)}',
         updated_at = datetime('now')
     WHERE id = '${esc(row.id)}'`
  );
  updated += 1;
  console.log(`Hydrated ${row.id} (${providerId.slice(0, 8)}…)`);
}

console.log(`Hydrate complete: ${updated} updated, ${failed} failed, ${rows.length} candidates.`);
