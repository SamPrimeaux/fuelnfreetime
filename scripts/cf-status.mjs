#!/usr/bin/env node
/**
 * Cloudflare cutover status for fuelnfreetime.com
 * Run: npm run cf:status
 * Uses CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN via with-cf-admin-env.sh
 */

import { execSync } from "node:child_process";

const DOMAIN = "fuelnfreetime.com";
const ZONE_ID = "816a5d2284103e4481987ceeb16c2ca9";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "ede6590ac0d2fb7daf155b35653457b2";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!TOKEN) {
  console.error("CLOUDFLARE_API_TOKEN not set — run via: ./scripts/with-cf-admin-env.sh node scripts/cf-status.mjs");
  process.exit(1);
}

async function cf(path) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.json();
}

function digNs(domain) {
  try {
    const out = execSync(`dig +short NS ${domain}`, { encoding: "utf8" });
    return out
      .split("\n")
      .map((s) => s.trim().replace(/\.$/, "").toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const expectedNs = ["jessica.ns.cloudflare.com", "mike.ns.cloudflare.com"];
const observedNs = digNs(DOMAIN);

console.log(`\nCloudflare status — ${DOMAIN}\n`);

const zone = await cf(`/zones?name=${DOMAIN}`);
const z = zone.result?.[0];
if (z) {
  console.log(`Zone status:     ${z.status}${z.activation_failure_reason ? ` (${z.activation_failure_reason})` : ""}`);
  console.log(`Zone ID:         ${z.id}`);
  console.log(`Assigned NS:     ${(z.name_servers || []).join(", ")}`);
  console.log(`Observed NS:     ${(z.observed_name_servers || observedNs).map((n) => n.replace(/\.$/, "")).join(", ")}`);
} else {
  console.log("Zone:            not found or API error");
}

const domains = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/fuelnfreetime/domains`);
if (domains.success) {
  console.log("\nWorker custom domains:");
  for (const d of domains.result || []) {
    console.log(`  • ${d.hostname} → ${d.service} (${d.enabled ? "enabled" : "disabled"})`);
  }
} else {
  console.log("\nWorker domains:  API error", domains.errors);
}

const dns = await cf(`/zones/${ZONE_ID}/dns_records?per_page=20`);
if (dns.success) {
  console.log("\nDNS records (Cloudflare):");
  for (const r of dns.result || []) {
    console.log(`  • ${r.type} ${r.name} → ${r.content}`);
  }
} else {
  console.log("\nDNS records:     unavailable via API while zone is pending (use dashboard)");
}

const nsOk = expectedNs.every((ns) => observedNs.includes(ns));
console.log("\nNameserver cutover:", nsOk ? "✓ complete" : "⏳ waiting on registrar");
if (!nsOk) {
  console.log("  Set at registrar:");
  expectedNs.forEach((ns) => console.log(`    ${ns}`));
  console.log(`\n  Staging URL: https://fuelnfreetime.meauxbility.workers.dev`);
}

process.exit(nsOk ? 0 : 1);
