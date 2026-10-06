import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildBrandRolePatch,
  buildClearBrandRolePatch,
} from "../apps/ecommerce-cms-agentsam/backend/admin/brand.js";

const company = {
  logoUrl: null,
  faviconUrl: null,
  meta: { existing: true },
};

const asset = {
  id: 42,
  r2_key: "uploads/brand/logo.webp",
  filename: "logo.webp",
  content_type: "image/webp",
};

test("brand role assignment points company identity at canonical media authority", () => {
  const patch = buildBrandRolePatch(company, "logo", asset);
  assert.equal(patch.logoUrl, "/media/uploads/brand/logo.webp");
  assert.equal(patch.meta.logo_asset_key, "uploads/brand/logo.webp");
  assert.equal(patch.meta.brand_assets.logo.media_asset_id, 42);
  assert.equal(patch.meta.existing, true);
});

test("social image is metadata projection, not another asset store", () => {
  const patch = buildBrandRolePatch(company, "social_image", asset);
  assert.equal(patch.meta.social_image_url, "/media/uploads/brand/logo.webp");
  assert.equal(patch.meta.brand_assets.social_image.r2_key, "uploads/brand/logo.webp");
});

test("clearing a role preserves unrelated company metadata", () => {
  const assigned = {
    ...company,
    logoUrl: "/media/uploads/brand/logo.webp",
    meta: buildBrandRolePatch(company, "logo", asset).meta,
  };
  const patch = buildClearBrandRolePatch(assigned, "logo");
  assert.equal(patch.logoUrl, null);
  assert.equal(patch.meta.existing, true);
  assert.equal(patch.meta.brand_assets.logo, undefined);
});

test("Brand workspace frontend honors the parsed adminFetch transport contract", () => {
  const source = fs.readFileSync(
    new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /const data = await adminFetch\(path/);
  assert.doesNotMatch(source, /response\.json\(\)/);
  assert.doesNotMatch(source, /!response\.ok/);
});
