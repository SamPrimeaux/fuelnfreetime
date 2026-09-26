import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PAGE_REGISTRY } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";
import {
  PAGES_CLEAN_REDIRECTS,
  STORE_HTML_REDIRECTS,
  resolveStorefrontPath,
} from "../apps/ecommerce-cms-agentsam/backend/lib/routes.js";
import { slugForStorefrontPath } from "../apps/ecommerce-cms-agentsam/backend/cms/html-rewriter.js";

const storefrontFile = (name) =>
  readFile(new URL(`../packages/heuristic-theme/storefront/${name}`, import.meta.url), "utf8");

test("global footer CMS contract owns the desired support destinations", () => {
  const footer = PAGE_REGISTRY.site.sections.footer;
  assert.ok(footer);
  assert.equal(footer.defaultContent.exploreCollaborateHref, "/collaborate");
  assert.equal(footer.defaultContent.supportPoliciesHref, "/policies");
  assert.equal(footer.defaultContent.supportTermsHref, "/terms");
  assert.equal(footer.fields.find((field) => field.key === "instagramUrl").type, "link");
  assert.equal(footer.fields.find((field) => field.key === "newsletterButtonLabel").type, "text");
});

test("collaborate policies and terms are real CMS-registered storefront routes", () => {
  for (const slug of ["collaborate", "policies", "terms"]) {
    assert.ok(PAGE_REGISTRY[slug], `${slug} must be registered`);
    assert.equal(resolveStorefrontPath(`/${slug}`), `/${slug}.html`);
    assert.equal(STORE_HTML_REDIRECTS.get(`/${slug}.html`), `/${slug}`);
    assert.equal(PAGES_CLEAN_REDIRECTS.get(`/pages/${slug}`), `/${slug}`);
    assert.equal(slugForStorefrontPath(`/${slug}`), slug);
  }
});

test("primary storefront pages all mount the one global footer implementation", async () => {
  for (const file of [
    "home.html",
    "shop.html",
    "about.html",
    "community.html",
    "collaborate.html",
    "policies.html",
    "terms.html",
  ]) {
    const html = await storefrontFile(file);
    assert.match(html, /id="fnf-footer-mount"/, `${file} needs the global footer mount`);
    assert.match(html, /\/css\/global-footer\.css/, `${file} needs shared footer styles`);
    assert.match(html, /\/js\/global-footer\.js/, `${file} needs shared footer renderer`);
  }
});

test("about and community no longer bake the canonical footer into each page", async () => {
  for (const file of ["about.html", "community.html"]) {
    const html = await storefrontFile(file);
    assert.doesNotMatch(html, /<footer class="fnf-footer"/);
    assert.doesNotMatch(html, /===== FOOTER STYLES =====/);
  }
});

test("shop gains the canonical footer without replacing its shared store header", async () => {
  const html = await storefrontFile("shop.html");
  assert.match(html, /id="fnf-store-mount"/);
  assert.match(html, /\/js\/store-shell\.js/);
  assert.match(html, /id="fnf-footer-mount"/);
});
