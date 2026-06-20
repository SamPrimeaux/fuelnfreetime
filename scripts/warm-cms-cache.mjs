#!/usr/bin/env node
/** Warm CMS KV cache by hitting public read API for each page slug. */
const BASE = process.env.FNF_BASE_URL || "https://fuelnfreetime.meauxbility.workers.dev";
const SLUGS = ["site", "home", "shop", "about", "community"];

(async () => {
  for (const slug of SLUGS) {
    const res = await fetch(`${BASE}/api/cms/pages/${slug}`);
    const ok = res.ok ? "ok" : `HTTP ${res.status}`;
    console.log(`${slug}: ${ok}`);
  }
})();
