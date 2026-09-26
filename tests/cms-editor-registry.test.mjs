import test from "node:test";
import assert from "node:assert/strict";

import {
  CMS_FIELD_TYPES,
  PAGE_REGISTRY,
  mergeWithRegistry,
  normalizeCmsField,
  registryForAdmin,
} from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

test("CMS editor registry exposes the reusable GUI field contract", () => {
  assert.deepEqual(CMS_FIELD_TYPES, [
    "text",
    "rich_text",
    "textarea",
    "boolean",
    "select",
    "range",
    "number",
    "color",
    "link",
    "media",
    "video",
    "product",
    "collection",
    "variant",
  ]);

  const admin = registryForAdmin();
  const hero = admin.pages.shop.sections.hero;

  assert.equal(hero.label, "Hero");
  assert.equal(hero.capabilities.edit, true);
  assert.equal(hero.capabilities.reorder, true);
  assert.equal(hero.capabilities.duplicate, true);
  assert.equal(hero.capabilities.remove, true);
  assert.ok(Array.isArray(hero.settings));
  assert.ok(hero.settings.some((field) => field.key === "__editor.layout.width" && field.type === "select"));
  assert.ok(hero.settings.some((field) => field.key === "__editor.spacing.paddingTop" && field.type === "range"));
  assert.ok(hero.settings.some((field) => field.key === "__editor.visibility.enabled" && field.type === "boolean"));
  assert.ok(hero.guardrails);
  assert.ok(hero.motion);
  assert.ok(hero.responsive);
});

test("legacy URL fields normalize to link, media, and video controls without losing media compatibility", () => {
  assert.equal(normalizeCmsField({ key: "ctaHref", label: "CTA link", type: "url" }).type, "link");

  const image = normalizeCmsField({
    key: "imageUrl",
    label: "Image",
    type: "url",
    media: true,
  });
  assert.equal(image.type, "media");
  assert.equal(image.media, true);

  const video = normalizeCmsField({
    key: "videoUrl",
    label: "Video",
    type: "url",
    media: true,
  });
  assert.equal(video.type, "video");
  assert.equal(video.media, true);
});

test("registry merge preserves ordered dynamic section instances and honors removed tombstones", () => {
  const heroDefault = structuredClone(PAGE_REGISTRY.shop.sections.hero.defaultContent);
  const dynamic = {
    key: "hero-abcd1234",
    sort_order: 5,
    status: "draft",
    content: {
      ...heroDefault,
      headline: "Duplicate hero",
      __editor: { templateKey: "hero" },
    },
    source: "r2",
  };

  const removedCanonical = {
    key: "hero",
    sort_order: 0,
    status: "removed",
    content: {
      ...heroDefault,
      __editor: { removed: true, visibility: { enabled: false } },
    },
    source: "r2",
  };

  const merged = mergeWithRegistry("shop", [removedCanonical, dynamic]);
  assert.equal(merged.some((section) => section.key === "hero"), false);
  assert.equal(merged.some((section) => section.key === dynamic.key), true);
  assert.equal(merged.find((section) => section.key === dynamic.key).content.headline, "Duplicate hero");

  const orders = merged.map((section) => Number(section.sort_order || 0));
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
});
