import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MERCH_HERO_VERSION, normalizeMerchHero,
  parseMerchHero, renderMerchHero, safeMerchUrl,
} from "../packages/fnf-theme/src/sections/merch-hero/merch-hero.js";

test("reusable hero contract allows layouts, palettes, artwork, CTA and background settings", () => {
  const raw = {
    layout: "right", backgroundMode: "image", backgroundImageUrl: "/media/sunset.webp",
    artworkUrl: "/media/diesel-truck-logo.png", headline: "DIESEL DRIVEN",
    eyebrow: "Fuel & Free Time", subheadline: "Built for the long haul.",
    overlay: 65, artworkScale: 90, focus: "right", height: "immersive",
    primaryCta: { label: "SHOP THIS COLLECTION", href: "#collection-products" },
    secondaryCta: { label: "Read the story", href: "/about" },
  };
  const parsed = parseMerchHero(JSON.stringify(raw), { title: "Diesel Driven" });
  const html = renderMerchHero(parsed);
  assert.equal(parsed.version, MERCH_HERO_VERSION);
  assert.equal(parsed.layout, "right");
  assert.equal(parsed.overlay, 65);
  assert.match(html, /DIESEL DRIVEN/);
  assert.match(html, /merch-hero--right/);
  assert.match(html, /merch-hero--immersive/);
  assert.match(html, /src="\/media\/diesel-truck-logo\.png"/);
  assert.match(html, /src="\/media\/sunset\.webp"/);
  assert.match(html, /href="#collection-products"/);
  assert.match(html, /href="\/about"/);
});

test("malicious text, URLs and invalid CSS settings cannot inject markup or javascript links", () => {
  const out = normalizeMerchHero({
    headline: '<img src=x onerror="alert(1)">',
    artworkUrl: "javascript:alert(1)",
    backgroundImageUrl: "data:text/html,evil",
    accentColor: "red;position:fixed",
    textColor: "#ffbb00",
    layout: "not-a-layout", overlay: 999, artworkScale: -4,
    primaryCta: { label: '<script>oops</script>', href: 'javascript:alert(1)' },
    secondaryCta: { label: "safe", href: "https://example.org/drop" },
  });
  assert.equal(out.accentColor, "#ff7619");
  assert.equal(out.textColor, "#ffbb00");
  assert.equal(out.artworkUrl, "");
  assert.equal(out.backgroundImageUrl, "");
  assert.equal(out.layout, "split");
  assert.equal(out.overlay, 90);
  assert.equal(out.artworkScale, 30);
  assert.equal(safeMerchUrl("//evil.com", true), "");
  assert.equal(safeMerchUrl("http://insecure.example.org/logo.png"), "");
  const html = renderMerchHero(out);
  assert.doesNotMatch(html, /<script>|<img src=x|href="javascript/);
  assert.match(html, /&lt;img/);
  assert.match(html, /href="https:\/\/example.org\/drop"/);
  assert.equal(parseMerchHero("bad json", { title: "Shop" }).headline, "Shop");
});

test("collections preview and storefront use the same packaged renderer", () => {
  const sync = readFileSync(new URL("../scripts/sync-app-frontend.mjs", import.meta.url), "utf8");
  const site = readFileSync(new URL("../packages/heuristic-theme/storefront/js/store-collections.js", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/collection-manager.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/collections.html", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../db/migrate-collection-hero-generator-20261027.sql", import.meta.url), "utf8");
  assert.match(sync, /globalName: 'AgentSamMerchHero'/);
  assert.match(site, /AgentSamMerchHero\.renderMerchHero/);
  assert.match(editor, /merchHero\(\)\.renderMerchHero\(config/);
  assert.match(editor, /hero_settings_json: JSON\.stringify\(heroConfigFromForm\(\)\)/);
  assert.match(html, /id="cm-hero-preview"/);
  assert.match(schema, /ALTER TABLE store_collections/);
  assert.match(schema, /ADD COLUMN hero_settings_json/);
});

test("collection lineup presets use live Completeful catalog and preserved product studio context", () => {
  const editor = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/collection-manager.js", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductStudioPage.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../apps/ecommerce-cms-agentsam/backend/admin/api.js", import.meta.url), "utf8");
  assert.match(editor, /\/api\/admin\/completeful\/catalog\?/);
  assert.match(editor, /starterKits/);
  assert.match(editor, /product_plan_json:/);
  assert.match(editor, /chosenId\) url\.searchParams\.set\("collection_id"/);
  assert.match(studio, /collectionId=\{collectionId\}/);
  assert.match(studio, /collectionId \? .*collection_id/);
  assert.match(workspace, /products\/add/);
  assert.match(admin, /function validateProductPlan/);
  assert.match(admin, /addAdminCollectionProduct/);
});
