#!/usr/bin/env node
/**
 * Apply Resend DNS records for fuelnfreetime.com in Cloudflare.
 *
 * Requires CLOUDFLARE_API_TOKEN with Zone.DNS Edit on the zone.
 *   ./scripts/with-cf-admin-env.sh node scripts/setup-resend-dns.mjs
 *   node scripts/setup-resend-dns.mjs --dry-run
 *   node scripts/setup-resend-dns.mjs --enable-receiving   # adds root MX (inbound)
 */

const DOMAIN = "fuelnfreetime.com";
const ZONE_ID = "816a5d2284103e4481987ceeb16c2ca9";

const RESEND_DKIM =
  "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDr1/Q4LltKqpzxwiIj9oBZIiILthLWD7I3ABuchqhsbn2x5t/OYDktvfYHK6qap3cZKgHYriuA/coHM+50R85nUx7QbsQ8J7yEvCQI1o01A3Rps77eH4OvYWYjtp/JJYA5pWdM2hJ2tEZ4ERuYz0gHEHgNL4cDDHJxqfG06ISjYQIDAQAB";

const RECORDS = [
  {
    type: "TXT",
    name: "resend._domainkey",
    content: RESEND_DKIM,
    purpose: "DKIM (domain verification + signing)",
  },
  {
    type: "MX",
    name: "send",
    content: "feedback-smtp.us-east-1.amazonses.com",
    priority: 10,
    purpose: "SPF/MX — outbound sending (send subdomain)",
  },
  {
    type: "TXT",
    name: "send",
    content: "v=spf1 include:amazonses.com ~all",
    purpose: "SPF — outbound sending",
  },
  {
    type: "TXT",
    name: "_dmarc",
    content: "v=DMARC1; p=none;",
    purpose: "DMARC (monitoring)",
  },
];

const RECEIVING_MX = {
  type: "MX",
  name: "@",
  content: "inbound-smtp.us-east-1.amazonaws.com",
  priority: 10,
  purpose: "Inbound mail → Resend (replaces any existing root MX)",
};

const dryRun = process.argv.includes("--dry-run");
const enableReceiving = process.argv.includes("--enable-receiving");
const token = process.env.CLOUDFLARE_API_TOKEN;

function cf(path, init = {}) {
  return fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function fqdn(name) {
  if (name === "@") return DOMAIN;
  return `${name}.${DOMAIN}`;
}

function recordKey(r) {
  return `${r.type}:${r.name}:${r.content}:${r.priority ?? ""}`;
}

async function listRecords() {
  const res = await cf(`/zones/${ZONE_ID}/dns_records?per_page=500`);
  const json = await res.json();
  if (!json.success) throw new Error(json.errors?.[0]?.message || "Could not list DNS records");
  return json.result || [];
}

async function upsertRecord(existing, spec) {
  const body = {
    type: spec.type,
    name: fqdn(spec.name),
    content: spec.content,
    ttl: 1,
    proxied: false,
  };
  if (spec.type === "MX") body.priority = spec.priority;

  if (dryRun) {
    console.log(`  [dry-run] ${spec.type} ${body.name} → ${spec.content}`);
    return;
  }

  const match = existing.find(
    (r) =>
      r.type === spec.type &&
      r.name.toLowerCase() === body.name.toLowerCase() &&
      (spec.type !== "MX" || r.content === spec.content)
  );

  if (match && match.content === spec.content && (spec.type !== "MX" || match.priority === spec.priority)) {
    console.log(`  ✓ exists  ${spec.type} ${body.name}`);
    return;
  }

  if (match) {
    const res = await cf(`/zones/${ZONE_ID}/dns_records/${match.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.errors?.[0]?.message || `PATCH failed for ${body.name}`);
    console.log(`  ↻ updated ${spec.type} ${body.name}`);
    return;
  }

  const res = await cf(`/zones/${ZONE_ID}/dns_records`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.errors?.[0]?.message || `POST failed for ${body.name}`);
  console.log(`  + created ${spec.type} ${body.name}`);
}

async function main() {
  const specs = [...RECORDS];
  if (enableReceiving) specs.push(RECEIVING_MX);

  console.log(`\nResend DNS — ${DOMAIN}${dryRun ? " (dry run)" : ""}\n`);

  if (!token && !dryRun) {
    printManual(specs);
    process.exit(1);
  }

  let existing = [];
  if (token) {
    try {
      existing = await listRecords();
    } catch (err) {
      console.error(`\n⚠ Cloudflare API: ${err.message}`);
      console.error("  Token needs Zone → DNS → Edit for this zone.\n");
      printManual(specs);
      process.exit(1);
    }
  }

  if (enableReceiving) {
    const rootMx = existing.filter((r) => r.type === "MX" && r.name === DOMAIN);
    if (rootMx.length && !dryRun) {
      console.log("⚠ Existing root MX records:");
      rootMx.forEach((r) => console.log(`    ${r.priority} ${r.content}`));
      console.log("  Replacing with Resend inbound MX.\n");
    }
  }

  for (const spec of specs) {
    console.log(`• ${spec.purpose}`);
    await upsertRecord(existing, spec);
  }

  console.log("\nNext steps:");
  console.log("  1. Resend dashboard → Domains → fuelnfreetime.com → Verify (may take a few minutes)");
  console.log("  2. wrangler secret put RESEND_API_KEY  (or ./scripts/set-resend-secrets.sh)");
  console.log("  3. Resend → Webhook (outbound) → https://fuelnfreetime.com/api/webhooks/resend/outbound");
  console.log("  4. Resend → Webhook (inbound)  → https://fuelnfreetime.com/api/webhooks/resend/inbound");
  console.log("  5. Add whsec_ values to .env.cloudflare → ./scripts/set-resend-secrets.sh");
}

function printManual(specs) {
  console.log("Add these in Cloudflare → DNS → fuelnfreetime.com:\n");
  console.log("| Type | Name | Content | Priority |");
  console.log("|------|------|---------|----------|");
  for (const s of specs) {
    const name = s.name === "@" ? DOMAIN : `${s.name}.${DOMAIN}`;
    console.log(`| ${s.type} | ${name} | ${s.content} | ${s.priority ?? "—"} |`);
  }
  console.log("\nDashboard: https://dash.cloudflare.com → fuelnfreetime.com → DNS\n");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
