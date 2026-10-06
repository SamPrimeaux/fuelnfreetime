/*
 * Generate an idempotent SQL seed over the current company SSOT, not a new
 * brand authority. Existing merchant values and media assignments win.
 * Run only with explicit user approval for filling brand records.
 *
 * node scripts/brand/build-fnf-brand-seed.mjs > /tmp/fnf-brand-seed.sql
 * ./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=/tmp/fnf-brand-seed.sql
 */
import { readFileSync } from "node:fs";
import { BRAND_PROFILE_FIELDS } from "../../apps/ecommerce-cms-agentsam/backend/admin/brand.js";
const root = new URL("../../", import.meta.url);
const source = JSON.parse(readFileSync(new URL("docs/brand/fnf-brand-profile-prefill.v1.json", root), "utf8"));
const tokens = JSON.parse(readFileSync(new URL(source.tokenSource, root), "utf8"));
if (source.brand !== "Fuel & Free Time" || source.status !== "working-draft") throw new Error("Unexpected brand seed");
if (source.profile.headlineFont !== tokens.type.display ||
    source.profile.bodyFont !== tokens.type.body ||
    source.profile.secondaryColor !== tokens.color.accentSoft ||
    source.profile.textColor !== tokens.color.ink) {
  throw new Error("Profile typography/colors no longer match active theme tokens");
}
for (const [key, value] of Object.entries(source.profile)) {
  if (!Object.hasOwn(BRAND_PROFILE_FIELDS, key) ||
      typeof value !== "string" || value.length > BRAND_PROFILE_FIELDS[key]) {
    throw new Error("Invalid seed field: " + key);
  }
}
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const profile = JSON.stringify(source.profile);
const provenance = JSON.stringify({
  path: source.source, version: source.sourceVersion,
  tokenSource: source.tokenSource, status: source.status,
  note: source.reviewNote,
});
// SQLite json_patch(defaults, existing) preserves customer edits.
const original = "COALESCE(NULLIF(meta_json,''),'{}')";
let metadata = "json_set(" + original +
  ", '$.brand_profile', json_patch(json(" + quote(profile) +
  "), COALESCE(json_extract(" + original +
  ", '$.brand_profile'),'{}')), '$.brand_profile_source', COALESCE(json_extract(" +
  original + ", '$.brand_profile_source'),json(" + quote(provenance) + ")))";
for (const [role, asset] of Object.entries(source.assetRoles)) {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(asset.r2_key)) throw new Error("Unsafe R2 key");
  const entry = JSON.stringify({
    media_asset_id: asset.media_asset_id,
    r2_key: asset.r2_key,
    url: "/media/" + asset.r2_key,
  });
  const path = "$.brand_assets." + role;
  metadata = "json_set(" + metadata + ", '" + path +
    "', COALESCE(json_extract(" + original + ",'" + path +
    "'), json(" + quote(entry) + ")))";
}
console.log("-- Working-draft brand source; preserve merchant overrides. No new brand database.");
console.log("UPDATE company SET meta_json = " + metadata +
  ", updated_at=unixepoch() WHERE slug='fuelnfreetime' AND id='co_fuelnfreetime';");
