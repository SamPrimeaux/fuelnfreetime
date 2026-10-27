import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MERCH_HERO_VERSION, normalizeMerchHero,
  parseMerchHero, renderMerchHero, safeMerchUrl,
} from "../packages/agentsam-merch/src/merch-hero.js";

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
  assert.equal(out.accentColor, "#64748b");
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

test("TypeScript collection presentation and storefront use the same renderer", () => {
  const sync = readFileSync(new URL("../scripts/sync-app-frontend.mjs", import.meta.url), "utf8");
  const site = readFileSync(new URL("../packages/heuristic-theme/storefront/js/store-collections.js", import.meta.url), "utf8");
  const presentation = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/CollectionPresentation.tsx", import.meta.url), "utf8");
  const model = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/model.ts", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../db/migrate-collection-hero-generator-20261027.sql", import.meta.url), "utf8");
  assert.match(sync, /globalName: 'AgentSamMerchHero'/);
  assert.match(site, /AgentSamMerchHero\.renderMerchHero/);
  assert.match(presentation, /import \{ renderMerchHero \} from/);
  assert.match(presentation, /dangerouslySetInnerHTML=\{\{__html:html\+showcaseHtml\}\}/);
  assert.match(model, /hero_settings_json: JSON\.stringify\(hero\)/);
  assert.match(schema, /ADD COLUMN hero_settings_json/);
});

test("shared assortment recipes and TypeScript Product Studio handoff use the connected catalog", () => {
  const products = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/CollectionProducts.tsx", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/CollectionEditor.tsx", import.meta.url), "utf8");
  const client = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/api.ts", import.meta.url), "utf8");
  const model = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/model.ts", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductStudioPage.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../apps/ecommerce-cms-agentsam/backend/admin/api.js", import.meta.url), "utf8");
  assert.match(client, /\/api\/admin\/completeful\/catalog\?/);
  assert.match(model, /MERCH_ASSORTMENT_RECIPES/);
  assert.match(products, /STARTER_KITS/);
  assert.match(editor, /collection_id=\$\{encodeURIComponent\(savedId\)\}/);
  assert.match(studio, /collectionId=\{collectionId\}/);
  assert.match(workspace, /products\/add/);
  assert.match(admin, /function validateProductPlan/);
  assert.match(admin, /addAdminCollectionProduct/);
});
