import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BRAND_PROFILE_FIELDS,
  validateBrandProfile,
  getBrandWorkspace,
  patchBrandWorkspace,
  searchBrandAssets,
} from "../apps/ecommerce-cms-agentsam/backend/admin/brand.js";
import { getCompany, updateCompany } from "../apps/ecommerce-cms-agentsam/backend/lib/company.js";

const fixtureMedia = [
  { id: 101, r2_key: "uploads/brand/logo.svg", filename: "main-logo.svg", content_type: "image/svg+xml", alt_text: "Primary logo", folder: "images" },
  { id: 102, r2_key: "uploads/brand/social.webp", filename: "social-image.webp", content_type: "image/webp", alt_text: "Social share image", folder: "images" },
  { id: 103, r2_key: "uploads/campaign/photo.png", filename: "photo.png", content_type: "image/png", alt_text: "Campaign", folder: "products" },
];
function makeEnv() {
  const companyRow = {
    id: 1, slug: "acme", name: "Acme", legal_name: null,
    logo_url: "/media/uploads/brand/logo.svg", favicon_url: "/media/uploads/brand/logo.svg",
    primary_color: "#aabbcc", auth_bg_color: "#ffffff", support_email: "support@example.com",
    website_url: "https://example.com", tagline: "Original tagline",
    meta_json: JSON.stringify({ existing: "preserved", brand_assets: { mark: { media_asset_id: 99, r2_key: "uploads/old.png" } } }),
  };
  const calls = [];
  const env = {
    DB: {
      prepare(sql) {
        const statement = {
          params: [],
          bind(...params) { this.params = params; return this; },
          async first() {
            calls.push({ sql, params: this.params });
            if (sql.includes("SELECT * FROM company")) return { ...companyRow };
            if (sql.includes("COUNT(*)")) {
              const search = this.params[0];
              return { count: search
                ? fixtureMedia.filter((asset) => (asset.filename + asset.alt_text + asset.r2_key).toLowerCase().includes(search)).length
                : fixtureMedia.length };
            }
            if (sql.includes("FROM media_assets") && sql.includes("WHERE id")) return fixtureMedia.find((asset) => asset.id === this.params[0]) || null;
            return null;
          },
          async all() {
            calls.push({ sql, params: this.params });
            let assets = fixtureMedia.slice();
            if (sql.includes("instr(")) {
              const search = this.params[0];
              assets = assets.filter((asset) => (asset.filename + asset.alt_text + asset.r2_key).toLowerCase().includes(search));
            }
            if (sql.includes("LIMIT ? OFFSET ?")) {
              const limit = this.params.at(-2);
              const offset = this.params.at(-1);
              assets = assets.slice(offset, offset + limit);
            }
            return { results: assets };
          },
          async run() {
            calls.push({ sql, params: this.params });
            if (!sql.includes("UPDATE company SET")) throw new Error("Unexpected mutation");
            const [
              name, legal_name, logo_url, favicon_url, primary_color, auth_bg_color,
              support_email, website_url, tagline, meta_json,
            ] = this.params;
            Object.assign(companyRow, {
              name, legal_name, logo_url, favicon_url, primary_color, auth_bg_color,
              support_email, website_url, tagline, meta_json,
            });
            return { success: true };
          },
        };
        return statement;
      },
    },
  };
  return { env, companyRow, calls };
}

test("portable profile contract covers strategy, voice, visual direction, and channels", () => {
  for (const field of ["purpose", "mission", "vision", "originStory", "audience", "positioning", "promise", "values",
    "personality", "voice", "voiceDo", "voiceDont", "keyMessage", "shortDescription",
    "headlineFont", "bodyFont", "imageDirection", "secondaryColor", "textColor", "instagramUrl"]) {
    assert.ok(BRAND_PROFILE_FIELDS[field], field);
  }
  assert.equal(validateBrandProfile({ mission: "New mission" }, { originStory: "Keep this" }).originStory, "Keep this");
  assert.throws(() => validateBrandProfile({ mission: "x".repeat(5000) }), /too_long/);
  assert.throws(() => validateBrandProfile({ extraColumn: "value" }), /unsupported/);
  assert.throws(() => validateBrandProfile({ secondaryColor: "#123" }), /invalid_brand_color/);
  assert.throws(() => validateBrandProfile({ instagramUrl: "javascript:alert(1)" }), /invalid_brand_social_url/);
});

test("brand profile edits persist in existing company metadata and keep older fields/assignments", async () => {
  const { env, calls } = makeEnv();
  const request = new Request("https://example.com/api/admin/brand", {
    method: "PATCH",
    body: JSON.stringify({
      company: { name: "Acme Studio", tagline: null, primaryColor: "#332211" },
      profile: {
        mission: "Build lasting goods",
        voice: "Confident, clear, and grounded.",
        audience: "Design-minded customers",
        headlineFont: "Georgia",
        secondaryColor: "#f7ca4d",
      },
    }),
  });
  const response = await patchBrandWorkspace(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.company.name, "Acme Studio");
  assert.equal(body.company.tagline, null, "Explicit clear must persist");
  assert.equal(body.company.primaryColor, "#332211");
  assert.equal(body.profile.mission, "Build lasting goods");
  assert.equal(body.profile.voice, "Confident, clear, and grounded.");
  assert.equal(body.profile.secondaryColor, "#f7ca4d");
  assert.equal(body.company.meta.existing, "preserved");
  assert.equal(body.company.meta.brand_assets.mark.media_asset_id, 99);
  assert.equal(calls.filter(({sql}) => sql.includes("UPDATE company SET")).length, 1, "Save should use one DB update");
});

test("clearing a brand logo and favicon persists explicit null and preserves all other metadata", async () => {
  const { env } = makeEnv();
  await updateCompany(env, { logoUrl: null, faviconUrl: null, websiteUrl: null, tagline: null });
  const company = await getCompany(env);
  assert.equal(company.logoUrl, null);
  assert.equal(company.faviconUrl, null);
  assert.equal(company.websiteUrl, null);
  assert.equal(company.tagline, null);
  assert.equal(company.meta.existing, "preserved");
});

test("media search is paginated server-side and not limited to recent 120 entries", async () => {
  const { env, calls } = makeEnv();
  const response = await searchBrandAssets(new Request("https://example.com/api/admin/brand/assets?q=logo&page=1"), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.total, 1);
  assert.equal(data.assets[0].filename, "main-logo.svg");
  assert.equal(data.assets[0].url, "/media/uploads/brand/logo.svg");
  assert.equal(data.page_size, 48);
  assert.equal(data.has_more, false);
  assert.ok(calls.some(({sql}) => sql.includes("instr(") && sql.includes("LIMIT ? OFFSET ?")));
});

test("bad values are rejected without writing brand metadata", async () => {
  const { env, calls } = makeEnv();
  const request = new Request("https://example.com/api/admin/brand", {
    method: "PATCH", body: JSON.stringify({
      company: { name: "Acme Studio" }, profile: { secondaryColor: "not-a-color" }
    })
  });
  const result = await patchBrandWorkspace(request, env);
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error, "invalid_brand_color");
  assert.equal(calls.filter(({sql}) => sql.includes("UPDATE company SET")).length, 0);
});

test("Brand Studio UI exposes all profile fields and real media controls", () => {
  const html = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/content.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js", import.meta.url), "utf8");
  for (const key of Object.keys(BRAND_PROFILE_FIELDS)) {
    assert.match(html, new RegExp('data-brand-profile="' + key + '"'), key);
  }
  assert.match(html, /brand-picker-more/);
  assert.match(html, /brand-save-bottom/);
  assert.match(js, /\/api\/admin\/brand\/assets\?page=/);
  assert.match(js, /loadPickerPage\(pickerPage \+ 1\)/);
  assert.match(js, /bindImageFallback\(grid\)/);
  assert.match(js, /Save your brand changes before assigning an asset/);
});
