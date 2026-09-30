import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js", import.meta.url),
  "utf8",
);

test("media library mount is idempotent and explicitly destroyable", () => {
  assert.match(source, /window\.destroyMediaLibrary\s*=\s*destroyMediaLibrary/);
  assert.match(source, /lifecycleController\s*=\s*new AbortController\(\)/);
  assert.match(source, /destroyMediaLibrary\(\);[\s\S]*lifecycleController\s*=\s*new AbortController/);
  assert.match(source, /missing required elements/);
});

test("rendered media controls use stable-root event delegation", () => {
  assert.match(source, /function bindDelegatedLibraryInteractions\(\)/);
  assert.match(source, /mountListener\(els\.folders, "click"/);
  assert.match(source, /mountListener\(els\.albums, "click"/);
  assert.match(source, /mountListener\(els\.grid, "click"/);
  assert.match(source, /mountListener\(els\.batchBar, "click"/);
  assert.doesNotMatch(source, /querySelectorAll\("\.media-folder-tile"\)\.forEach/);
  assert.doesNotMatch(source, /querySelectorAll\("\.media-item"\)\.forEach/);
});

test("optional placement controls cannot block core media mount", () => {
  const coreIndex = source.indexOf("bindDelegatedLibraryInteractions();");
  const optionalIndex = source.indexOf("bindPlacementControls();", coreIndex);
  assert.ok(coreIndex > 0);
  assert.ok(optionalIndex > coreIndex);
  assert.match(source.slice(optionalIndex - 80, optionalIndex + 160), /try\s*\{[\s\S]*bindPlacementControls\(\)/);
});
