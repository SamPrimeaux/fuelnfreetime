#!/usr/bin/env node
/**
 * Provision @fuelnfreetime.com mailboxes and send welcome messages via Resend.
 * Usage: node scripts/provision-mailboxes.mjs
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

async function sendEmail(apiKey, { from, to, subject, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || body.error || `HTTP ${res.status}`);
  return body.id;
}

async function main() {
  const env = { ...loadEnvFile(path.join(root, ".env.cloudflare")), ...process.env };
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey?.startsWith("re_")) {
    console.error("RESEND_API_KEY required in .env.cloudflare");
    process.exit(1);
  }

  console.log("Applying mail_mailboxes migration + seed…");
  execSync("npx wrangler d1 execute fuelnfreetime --remote --file=db/migrate-mail-mailboxes.sql", {
    cwd: root,
    stdio: "inherit",
  });
  execSync("npx wrangler d1 execute fuelnfreetime --remote --file=db/seed-mail-mailboxes.sql", {
    cwd: root,
    stdio: "inherit",
  });

  const sends = [
    {
      from: "Fuel & Free Time Payments <payments@fuelnfreetime.com>",
      to: "info@inneranimals.com",
      subject: "payments@fuelnfreetime.com is live",
      text: "The payments@fuelnfreetime.com sender is configured for Stripe receipts, payouts, and billing notices. Inbound mail to payments@ routes to the admin mail UI under Email → Payments.",
    },
    {
      from: "Sam Primeaux <sam@fuelnfreetime.com>",
      to: "info@inneranimals.com",
      subject: "Your sam@fuelnfreetime.com inbox is ready",
      text: "sam@fuelnfreetime.com is provisioned on fuelnfreetime.com. Inbound mail to this address appears in Admin → Email → Sam @fuelnfreetime.",
    },
    {
      from: "Connor McNeely <connor@fuelnfreetime.com>",
      to: "connordmcneely@leadershiplegacydigital.com",
      subject: "Your connor@fuelnfreetime.com inbox is ready",
      text: "connor@fuelnfreetime.com is provisioned on fuelnfreetime.com. Inbound mail to this address appears in Admin → Email → Connor @fuelnfreetime.",
    },
    {
      from: "Fuel & Free Time <hello@fuelnfreetime.com>",
      to: "sam@fuelnfreetime.com",
      subject: "Inbound routing test for sam@",
      text: "Loopback test — if Resend inbound MX is active, this message should appear in the Sam inbox in admin.",
    },
    {
      from: "Fuel & Free Time <hello@fuelnfreetime.com>",
      to: "connor@fuelnfreetime.com",
      subject: "Inbound routing test for connor@",
      text: "Loopback test — if Resend inbound MX is active, this message should appear in the Connor inbox in admin.",
    },
    {
      from: "Fuel & Free Time Payments <payments@fuelnfreetime.com>",
      to: "payments@fuelnfreetime.com",
      subject: "Inbound routing test for payments@",
      text: "Loopback test — if Resend inbound MX is active, this message should appear in the Payments inbox in admin.",
    },
  ];

  for (const msg of sends) {
    process.stdout.write(`Sending: ${msg.from} → ${msg.to}… `);
    try {
      const id = await sendEmail(apiKey, msg);
      console.log(`ok (${id})`);
    } catch (err) {
      console.log(`failed (${err.message})`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("\nDone. Open /admin/email and use the Email dropdown for Sam, Connor, and Payments inboxes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
