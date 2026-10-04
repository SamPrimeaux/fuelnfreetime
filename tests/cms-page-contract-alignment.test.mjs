import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PAGE_REGISTRY } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

const homePreset = JSON.parse(
  await readFile(
    new URL("../packages/heuristic-theme/presets/fuel-free-time/pages/home.json", import.meta.url),
    "utf8"
  )
);

test("Home editor registry and storefront composer expose the same section template keys", () => {
  const registryKeys = Object.keys(PAGE_REGISTRY.home.sections).sort();
  const composerKeys = homePreset.sections
    .map((section) => section.cmsKey)
    .filter(Boolean)
    .sort();

  assert.deepEqual(
    registryKeys,
    composerKeys,
    "A CMS section template must not exist unless the storefront preset can render it"
  );
});
