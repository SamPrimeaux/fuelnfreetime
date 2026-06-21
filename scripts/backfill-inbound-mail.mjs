#!/usr/bin/env node
/**
 * Re-process logged inbound webhook events into mail_messages.
 * Run after fixing inbound handler: npm run mail:backfill
 */

import { execFileSync } from "node:child_process";

const DB = "fuelnfreetime";

function d1(sql) {
  const out = execFileSync(
    "wrangler",
    ["d1", "execute", DB, "--remote", "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  const parsed = JSON.parse(out);
  return parsed[0]?.results || [];
}

function normalizeAddress(value) {
  if (Array.isArray(value)) return value.map((v) => normalizeAddress(v)).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    if (typeof value.email === "string") return value.email.trim();
    if (typeof value.address === "string") return value.address.trim();
  }
  return String(value || "").trim();
}

function esc(value) {
  return String(value || "").replace(/'/g, "''");
}

const events = d1(
  `SELECT provider_id, payload_json FROM mail_webhook_events
   WHERE channel = 'inbound' AND event_type = 'email.received'
   ORDER BY received_at ASC`
);

const mailboxes = d1(`SELECT id, address, label, kind FROM mail_mailboxes ORDER BY sort_order ASC`);
let inserted = 0;
let skipped = 0;

for (const row of events) {
  const providerId = row.provider_id;
  if (!providerId) continue;

  const existing = d1(`SELECT id FROM mail_messages WHERE id = 'in_${providerId}' LIMIT 1`);
  if (existing.length) {
    skipped += 1;
    continue;
  }

  let event;
  try {
    event = JSON.parse(row.payload_json || "{}");
  } catch {
    continue;
  }

  const data = event.data || {};
  const subject = data.subject || "(no subject)";
  const fromEmail = normalizeAddress(data.from);
  const toEmail = normalizeAddress(data.to);
  const preview = (subject || "Inbound message").slice(0, 240);
  const toHaystack = toEmail.toLowerCase();
  const mailbox = mailboxes.find((b) => toHaystack.includes(String(b.address || "").toLowerCase()));
  const labelSlug = (mailbox?.label || mailbox?.address?.split("@")[0] || "primary").toLowerCase();
  const labels = mailbox
    ? ["inbound", mailbox.kind === "payments" ? "payments" : "primary", labelSlug]
    : ["inbound", "primary"];

  const metadata = JSON.stringify({
    source: "resend.inbound.backfill",
    mailbox_id: mailbox?.id || null,
    mailbox_address: mailbox?.address || null,
    event,
  }).replace(/'/g, "''");

  d1(
    `INSERT INTO mail_messages (
       id, direction, from_email, to_email, subject, preview, body_text, body_html,
       status, provider, provider_id, labels_json, metadata_json
     ) VALUES (
       'in_${esc(providerId)}', 'inbound', '${esc(fromEmail)}', '${esc(toEmail)}',
       '${esc(subject)}', '${esc(preview)}', '', '',
       'received', 'resend', '${esc(providerId)}',
       '${esc(JSON.stringify(labels))}', '${metadata}'
     )`
  );
  inserted += 1;
}

console.log(`Backfill complete: ${inserted} inserted, ${skipped} already present, ${events.length} events scanned.`);
