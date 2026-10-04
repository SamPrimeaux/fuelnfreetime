import assert from "node:assert/strict";
import test from "node:test";
import { cmsSectionEnabled, cmsTemplateKey, projectCmsSections } from "../packages/heuristic-theme/storefront/js/cms-structure.js";

const presetSections = [
  {
    id: "home-hero",
    type: "hero.editorial",
    cmsKey: "hero",
    appearance: { width: "full-bleed" },
    motion: { preset: "fade", intensity: 0.1 },
    blocks: [],
    visibility: { enabled: true },
  },
  {
    id: "home-story",
    type: "story.immersive",
    cmsKey: "manifesto",
    appearance: { width: "contained" },
    motion: { preset: "fade", intensity: 0.1 },
    blocks: [],
    visibility: { enabled: true },
  },
];

test("cmsTemplateKey prefers persisted template identity for duplicated sections", () => {
  assert.equal(cmsTemplateKey({ key: "hero-acde1234", content: { __editor: { templateKey: "hero" } } }), "hero");
});

test("cmsSectionEnabled honors persisted visibility and removed state", () => {
  assert.equal(cmsSectionEnabled({ key: "hero", status: "published", content: {} }), true);
  assert.equal(cmsSectionEnabled({ key: "hero", status: "published", content: { __editor: { visibility: { enabled: false } } } }), false);
  assert.equal(cmsSectionEnabled({ key: "hero", status: "removed", content: {} }), false);
});

test("projectCmsSections makes CMS order and duplicated instances authoritative", () => {
  const projected = projectCmsSections(presetSections, [
    { key: "manifesto", sort_order: 20, status: "published", content: { line1: "Story" } },
    {
      key: "hero-acde1234",
      sort_order: 10,
      status: "published",
      content: {
        titleLine1: "Duplicate",
        __editor: {
          templateKey: "hero",
          layout: { width: "wide" },
          motion: { preset: "parallax", intensity: 0.4 },
        },
      },
    },
    { key: "hero", sort_order: 30, status: "published", content: { titleLine1: "Original" } },
  ]);

  assert.deepEqual(projected.map((section) => section.cmsKey), ["hero-acde1234", "manifesto", "hero"]);
  assert.equal(projected[0].cmsTemplateKey, "hero");
  assert.equal(projected[0].id, "home-hero--hero-acde1234");
  assert.equal(projected[0].appearance.width, "wide");
  assert.equal(projected[0].motion.preset, "parallax");
  assert.equal(projected[0].motion.intensity, 0.4);
  assert.equal(projected[0].cmsContent.titleLine1, "Duplicate");
});

test("projectCmsSections omits CMS-hidden instances", () => {
  const projected = projectCmsSections(presetSections, [
    { key: "hero", sort_order: 0, status: "published", content: { __editor: { visibility: { enabled: false } } } },
    { key: "manifesto", sort_order: 10, status: "published", content: {} },
  ]);
  assert.deepEqual(projected.map((section) => section.cmsKey), ["manifesto"]);
});

test("projectCmsSections skips legacy instances whose renderer template has been retired", () => {
  const ignored = [];
  const projected = projectCmsSections(
    presetSections,
    [
      { key: "hero", sort_order: 0, status: "published", content: {} },
      { key: "comingSoon", sort_order: 10, status: "published", content: {} },
    ],
    {
      onUnregistered: (section, templateKey) => ignored.push({ key: section.key, templateKey }),
    }
  );

  assert.deepEqual(projected.map((section) => section.cmsKey), ["hero"]);
  assert.deepEqual(ignored, [{ key: "comingSoon", templateKey: "comingSoon" }]);
});
