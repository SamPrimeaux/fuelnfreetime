#!/usr/bin/env node
/**
 * Check whether fuelnfreetime.com nameservers have cut over to Cloudflare.
 * Run: npm run dns:check
 */

import { execSync } from "node:child_process";

const DOMAIN = "fuelnfreetime.com";
const EXPECTED_NS = [
  "jessica.ns.cloudflare.com",
  "mike.ns.cloudflare.com",
];

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

const observed = digNs(DOMAIN);
const expected = EXPECTED_NS.map((n) => n.toLowerCase());
const matched = expected.every((ns) => observed.includes(ns));
const stillShopify =
  observed.some((ns) => ns.includes("shopify")) ||
  observed.some((ns) => ns.includes("googledomains"));

console.log(`\nDNS check — ${DOMAIN}\n`);
console.log("Observed nameservers:");
observed.forEach((ns) => console.log(`  • ${ns}`));
console.log("\nExpected (Cloudflare):");
expected.forEach((ns) => console.log(`  • ${ns}`));

if (matched) {
  console.log("\n✓ Nameservers point to Cloudflare. Zone should activate shortly.");
  console.log("  Next: confirm DNS records in dashboard, then hit https://fuelnfreetime.com/api/health");
  process.exit(0);
}

if (stillShopify) {
  console.log("\n⏳ Still on Shopify/Google Domains nameservers — cutover pending.");
  console.log("  At your registrar, set nameservers to:");
  expected.forEach((ns) => console.log(`    ${ns}`));
  console.log("\n  Until then, use: https://fuelnfreetime.meauxbility.workers.dev");
} else {
  console.log("\n⚠ Nameservers do not match Cloudflare yet.");
}

process.exit(matched ? 0 : 1);
