#!/usr/bin/env node
/**
 * Generate db/seed-cms-full.sql from src/cms/registry.js
 * Run: node scripts/generate-cms-seed.mjs
 */
import { writeFileSync } from "node:fs";
import { PAGE_REGISTRY } from "../src/cms/registry.js";

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

const lines = [
  "-- Auto-generated from src/cms/registry.js — do not edit by hand",
  "-- Run: npm run db:seed:cms:full",
  "",
];

for (const [slug, def] of Object.entries(PAGE_REGISTRY)) {
  lines.push(
    `INSERT INTO pages (slug, title, status, updated_at) VALUES ('${sqlEscape(slug)}', '${sqlEscape(def.title)}', 'published', datetime('now'))`,
    `ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'published', updated_at = datetime('now');`,
    ""
  );
}

for (const [slug, def] of Object.entries(PAGE_REGISTRY)) {
  for (const [sectionKey, sec] of Object.entries(def.sections)) {
    const json = sqlEscape(JSON.stringify(sec.defaultContent));
    lines.push(`INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, '${sqlEscape(sectionKey)}', ${sec.sortOrder}, '${json}', 'published', datetime('now')
FROM pages p WHERE p.slug = '${sqlEscape(slug)}'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');`);
    lines.push("");
  }
}

writeFileSync(new URL("../db/seed-cms-full.sql", import.meta.url), lines.join("\n"));
console.log("Wrote db/seed-cms-full.sql");
