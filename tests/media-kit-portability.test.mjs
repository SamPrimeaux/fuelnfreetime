import assert from "node:assert/strict";
import test from "node:test";

import {
  IMAGE_PREVIEW_PRESETS,
  collectionMetaFromDraft,
  createMediaProviderRegistry,
  getImagePreviewPreset,
  normalizeMediaCollectionDraft,
  previewStyleForPreset,
} from "../packages/media-kit/src/index.js";

test("preview presets are provider-neutral and preview-only by default", () => {
  assert.ok(IMAGE_PREVIEW_PRESETS.length >= 5);
  assert.ok(IMAGE_PREVIEW_PRESETS.every((preset) => preset.materialize === false));
  assert.equal(getImagePreviewPreset("hero").aspect_ratio, "16 / 9");
  assert.deepEqual(
    previewStyleForPreset(getImagePreviewPreset("hero"), { focal: { x: 0.25, y: 0.75 } }),
    { aspectRatio: "16 / 9", objectFit: "cover", objectPosition: "25% 75%" }
  );
});

test("collections encode presentation intent without storage assumptions", () => {
  const draft = normalizeMediaCollectionDraft({
    name: "Dirt Bike Launch",
    kind: "gallery",
    status: "draft",
    presentation: { layout: "grid", fit: "cover" },
  });
  assert.equal(draft.kind, "gallery");
  assert.equal(draft.status, "draft");
  assert.deepEqual(collectionMetaFromDraft(draft), {
    kind: "gallery",
    status: "draft",
    presentation: { layout: "grid", fit: "cover" },
  });
});

test("provider registry accepts storage-only deployments", () => {
  const registry = createMediaProviderRegistry([{
    id: "local",
    roles: ["source", "delivery"],
    capabilities: ["list", "read", "write"],
  }]);
  assert.equal(registry.resolve({ role: "source" })?.id, "local");
  assert.equal(registry.resolve({ role: "transform" }), null);
});

test("media-kit package contains no customer-specific identity or bucket constants", async () => {
  const { readFile } = await import("node:fs/promises");
  const { readdir } = await import("node:fs/promises");
  const base = new URL("../packages/media-kit/", import.meta.url);
  const files = ["README.md", ...(await readdir(new URL("src/", base))).map((name) => "src/" + name)];
  const text = (await Promise.all(files.map((name) => readFile(new URL(name, base), "utf8")))).join("\n");
  assert.doesNotMatch(text, /fuelnfreetime|Fuel & Free Time|F&FT|WEBSITE_ASSETS|assets\.fuelnfreetime/i);
});
