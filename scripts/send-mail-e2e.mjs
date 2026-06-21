#!/usr/bin/env node
/**
 * Send one real Resend email and record it in D1 for E2E verification.
 * Usage: node scripts/send-mail-e2e.mjs [to-email]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

function queryAdminEmail() {
  try {
    const out = execSync(
      'npx wrangler d1 execute fuelnfreetime --remote --command "SELECT email FROM auth_users ORDER BY created_at ASC LIMIT 1" --json',
      { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const parsed = JSON.parse(out);
    const row = parsed?.[0]?.results?.[0];
    return row?.email || null;
  } catch {
    return null;
  }
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(root, ".env.cloudflare")),
    ...process.env,
  };
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !apiKey.startsWith("re_")) {
    console.error("RESEND_API_KEY missing. Set it in .env.cloudflare or the environment.");
    process.exit(1);
  }

  const to = (process.argv[2] || queryAdminEmail() || "").trim().toLowerCase();
  if (!to) {
    console.error("No recipient. Pass an email or ensure auth_users has a row in D1.");
    process.exit(1);
  }

  const from = "Fuel & Free Time <hello@fuelnfreetime.com>";
  const subject = "Fuel & Free Time — Resend E2E confirmation";
  const text =
    "This is a live end-to-end test from the fuelnfreetime Worker mail integration. If you received this, outbound Resend is working.";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      tags: [{ name: "source", value: "e2e-script" }],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Resend API error:", body);
    process.exit(1);
  }

  const resendId = body.id;
  const msgId = `out_${resendId}`;
  const preview = text.slice(0, 240).replace(/'/g, "''");
  const safeSubject = subject.replace(/'/g, "''");
  const safeText = text.replace(/'/g, "''");
  const safeTo = to.replace(/'/g, "''");
  const sql = `-- e2e mail insert
INSERT INTO mail_messages (
  id, direction, from_email, to_email, subject, preview, body_text,
  status, provider, provider_id, labels_json, metadata_json
) VALUES (
  '${msgId}', 'outbound', 'hello@fuelnfreetime.com', '${safeTo}',
  '${safeSubject}', '${preview}', '${safeText}',
  'sent', 'resend', '${resendId}', '["primary","sent"]', '{"source":"e2e-script"}'
) ON CONFLICT(id) DO UPDATE SET status = 'sent', updated_at = datetime('now');
`;

  const sqlFile = path.join(root, "scripts/.mail-e2e-insert.sql");
  fs.writeFileSync(sqlFile, sql);
  execSync(`npx wrangler d1 execute fuelnfreetime --remote --file=${sqlFile}`, {
    cwd: root,
    stdio: "inherit",
  });
  fs.unlinkSync(sqlFile);

  console.log(`E2E mail sent to ${to} (Resend id: ${resendId})`);
  console.log(`Recorded in D1 mail_messages as ${msgId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
