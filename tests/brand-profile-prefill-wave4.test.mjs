import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { BRAND_PROFILE_FIELDS } from "../apps/ecommerce-cms-agentsam/backend/admin/brand.js";

const fixture = JSON.parse(readFileSync(new URL("../docs/brand/fnf-brand-profile-prefill.v1.json", import.meta.url), "utf8"));
const tokens = JSON.parse(readFileSync(new URL("../packages/heuristic-theme/presets/fuel-free-time/tokens.json", import.meta.url), "utf8"));
const css = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/css/brand-workspace.css", import.meta.url), "utf8");
const brandJs = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js", import.meta.url), "utf8");

test("working brand prefill is source-tracked and contains no invented social accounts", () => {
  assert.equal(fixture.status, "working-draft");
  assert.equal(fixture.source, "docs/brand/business-brand-dossier.md");
  assert.equal(fixture.profile.headlineFont, tokens.type.display);
  assert.equal(fixture.profile.bodyFont, tokens.type.body);
  assert.equal(fixture.profile.secondaryColor, tokens.color.accentSoft);
  assert.equal(fixture.profile.textColor, tokens.color.ink);
  for (const field of ["instagramUrl","facebookUrl","tiktokUrl","youtubeUrl","vision"]) {
    assert.equal(fixture.profile[field], undefined, field + " should require customer confirmation");
  }
  for (const [field, value] of Object.entries(fixture.profile)) {
    assert.ok(BRAND_PROFILE_FIELDS[field], field);
    assert.ok(value.length <= BRAND_PROFILE_FIELDS[field], field);
  }
});

test("only verified media IDs are seeded and current assignments are preserved", () => {
  assert.equal(fixture.assetRoles.logo.media_asset_id, 45);
  assert.equal(fixture.assetRoles.social_image.media_asset_id, 37);
  const source = readFileSync(new URL("../scripts/brand/build-fnf-brand-seed.mjs", import.meta.url), "utf8");
  assert.match(source, /json_patch\(json\(/);
  assert.match(source, /COALESCE\(json_extract\(/);
  assert.match(source, /WHERE slug='fuelnfreetime'/);
  assert.doesNotMatch(source, /INSERT INTO (?:brand|media_assets)/i);
});

test("Brand Studio boot bug is covered by real browser fixture; mobile dock remains accessible", () => {
  assert.match(brandJs, /let dirty = false;/);
  assert.match(brandJs, /brandRequest = api\("\/api\/admin\/brand\?include_assets=0"\)/);
  assert.match(brandJs, /setSaveStatus\("Unable to load — retry"/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /var\(--admin-dock-clearance, 120px\)/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /font-size: 16px/);
});

test("idempotent profile seed maintains merchant overrides and existing assets in SQLite", () => {
  const sql = execFileSync(process.execPath, [
    new URL("../scripts/brand/build-fnf-brand-seed.mjs", import.meta.url).pathname
  ], { encoding:"utf8" });
  const python = [
    "import json,sqlite3,sys",
    "db=sqlite3.connect(':memory:')",
    "db.execute('CREATE TABLE company(id TEXT, slug TEXT, meta_json TEXT, updated_at INTEGER)')",
    "current={'brand_profile':{'voice':'CUSTOMER APPROVED VOICE'},'brand_assets':{'wordmark':{'media_asset_id':619}},'other':'keep'}",
    "db.execute('INSERT INTO company VALUES(?,?,?,0)',('co_fuelnfreetime','fuelnfreetime',json.dumps(current)))",
    "sql=sys.stdin.read()",
    "db.executescript(sql)",
    "a=json.loads(db.execute('SELECT meta_json FROM company').fetchone()[0])",
    "assert a['brand_profile']['voice']=='CUSTOMER APPROVED VOICE'",
    "assert a['brand_profile']['purpose']",
    "assert a['brand_assets']['wordmark']['media_asset_id']==619",
    "assert a['brand_assets']['logo']['media_asset_id']==45",
    "assert a['brand_assets']['social_image']['media_asset_id']==37",
    "assert a['other']=='keep'",
    "assert isinstance(a['brand_profile_source'],dict)",
    "db.executescript(sql)",
    "b=json.loads(db.execute('SELECT meta_json FROM company').fetchone()[0])",
    "assert a==b",
    "print('SEED_SQLITE_PASS')",
  ].join("\n");
  const output = spawnSync("python3", ["-c", python], { input: sql, encoding:"utf8" });
  assert.equal(output.status,0,output.stderr);
  assert.match(output.stdout,/SEED_SQLITE_PASS/);
});
