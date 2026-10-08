import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const seed = readFileSync("db/seed-cms-revise-campaigns-20261007.sql", "utf8");
const globals = readFileSync("db/seed-cms-global-inline-hydration-20261007.sql", "utf8");
const media = JSON.parse(readFileSync("apps/ecommerce-cms-agentsam/fixtures/fnf-revise-media-map.json", "utf8"));

test("Revise campaigns seed is canonical, draft-only and linked to compatibility rows", () => {
  assert.match(seed, /INSERT INTO pages .*campaigns/);
  assert.match(seed, /INSERT INTO cms_pages/);
  assert.match(seed, /template_key.*revise/);
  assert.equal((seed.match(/INSERT INTO cms_page_sections/g) || []).length, 4);
  assert.ok((seed.match(/INSERT INTO cms_section_blocks/g) || []).length >= 40);
  assert.match(seed, /campaigns-pinned-media-grid-2/);
  assert.match(seed, /collection-split-media/);
  assert.match(seed, /parent_block_id/);
  assert.match(seed, /'group'/);
  assert.match(seed, /'image'/);
  assert.doesNotMatch(seed, /store_themes|store_theme_pages|theme-workspace/);
  assert.doesNotMatch(seed, /'published'|DELETE FROM|DROP TABLE/);
});

test("Revise campaigns media map points at FNF media delivery paths", () => {
  for (const [key, entry] of Object.entries(media)) {
    assert.ok(key);
    assert.match(entry.r2_key, /^[a-z0-9][a-z0-9_./-]+$/i);
    assert.equal(entry.url, "/media/" + entry.r2_key);
  }
});

test("global hydration only fills existing empty normalized globals", () => {
  assert.match(globals, /global_key = 'brand'/);
  assert.match(globals, /global_key = 'footer'/);
  assert.match(globals, /inline_content_json = '\{\}'/);
  assert.match(globals, /inline_hydrated_from_r2/);
  assert.doesNotMatch(globals, /INSERT INTO cms_globals|DELETE FROM|store_theme/);
});

test("seed builder is deterministic", () => {
  const actual = execFileSync(process.execPath, ["scripts/build-revise-campaigns-cms-seed.mjs"], { encoding: "utf8" });
  assert.equal(actual, seed);
});
test("Revise package artifact seed matches the immutable manifest", () => {
  const manifest = readFileSync("apps/ecommerce-cms-agentsam/fixtures/revise-theme-artifact-manifest.json", "utf8");
  const artifactSeed = readFileSync("db/seed-cms-revise-theme-artifact-20261007.sql", "utf8");
  assert.match(manifest, /"schema":"cms\.package-artifact\.v1"/);
  assert.match(manifest, /"package":"@inneranimalmedia\/revise-theme"/);
  assert.match(artifactSeed, /cmsa_f6b40d147e64eaf9b947e395/);
  assert.match(artifactSeed, /f6b40d147e64eaf9b947e395f3d44628c1706b53c4194c9cbedafeec9a61bfbd/);
  assert.doesNotMatch(artifactSeed, /store_theme/);
});

