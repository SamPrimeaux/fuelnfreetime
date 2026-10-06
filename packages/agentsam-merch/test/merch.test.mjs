import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COLLECTION_CANDIDATE_STATE,
  COMPATIBILITY_STATUS,
  approvalsComplete,
  createCollectionCandidate,
  createManufacturingProfileRegistry,
  evaluateManufacturingCompatibility,
  planMediaDerivatives,
  transitionCollectionCandidate,
  validateManufacturingProfile,
} from "../src/index.js";

async function profile(name) {
  return JSON.parse(await readFile(new URL(`../profiles/${name}`, import.meta.url), "utf8"));
}

test("profile data validates", async () => {
  for (const name of [
    "completeful/dtg-back-large.json",
    "completeful/laser-engraving.json",
    "generic/embroidery-digitization.json",
  ]) {
    const result = validateManufacturingProfile(await profile(name));
    assert.equal(result.ok, true, `${name}: ${result.errors.join(", ")}`);
  }
});

test("large transparent PNG is ready for the operator-defined DTG profile", async () => {
  const result = evaluateManufacturingCompatibility(
    {
      format: "png",
      mediaKind: "raster",
      widthPx: 4500,
      heightPx: 5100,
      bytes: 12000000,
      colorSpace: "srgb",
      hasAlpha: true
    },
    await profile("completeful/dtg-back-large.json"),
    { printWidthIn: 14, printHeightIn: 16 },
  );
  assert.equal(result.status, COMPATIBILITY_STATUS.READY);
  assert.equal(result.requirementsVerified, false);
  assert.equal(result.productionReady, false);
  assert.ok(result.effectivePpi >= 300);
});

test("low-resolution raster is not falsely called production ready", async () => {
  const result = evaluateManufacturingCompatibility(
    { format: "png", mediaKind: "raster", widthPx: 1500, heightPx: 1500, colorSpace: "srgb" },
    await profile("completeful/dtg-back-large.json"),
    { printWidthIn: 14, printHeightIn: 16 },
  );
  assert.equal(result.status, COMPATIBILITY_STATUS.NEEDS_VARIANT);
  assert.ok(result.issues.some((issue) => issue.code === "insufficient_resolution"));
});

test("engraving rejects gradient/open-path artwork", async () => {
  const result = evaluateManufacturingCompatibility(
    {
      format: "svg",
      mediaKind: "vector",
      colorMode: "full-color",
      hasGradients: true,
      hasOpenPaths: true,
      hasLiveText: true
    },
    await profile("completeful/laser-engraving.json"),
  );
  assert.equal(result.status, COMPATIBILITY_STATUS.NEEDS_VARIANT);
  assert.ok(result.actions.includes("simplify_gradients"));
  assert.ok(result.actions.includes("close_paths"));
});

test("embroidery stops at prepared for digitization", async () => {
  const result = evaluateManufacturingCompatibility(
    {
      format: "svg",
      mediaKind: "vector",
      colorMode: "spot",
      hasGradients: false,
      hasOpenPaths: false,
      hasLiveText: false
    },
    await profile("generic/embroidery-digitization.json"),
  );
  assert.equal(result.status, COMPATIBILITY_STATUS.PREPARED_FOR_DIGITIZATION);
  assert.equal(result.productionReady, false);
});

test("manufacturing and storefront derivatives remain separate", async () => {
  const plan = planMediaDerivatives({
    asset: { format: "png", mediaKind: "raster", widthPx: 4500, heightPx: 5100, colorSpace: "srgb" },
    profile: await profile("completeful/dtg-back-large.json"),
    target: { printWidthIn: 14, printHeightIn: 16 },
  });
  assert.equal(plan.source.immutableAuthority, true);
  assert.equal(plan.manufacturing.format, "png");
  assert.equal(plan.storefront.format, "webp");
  assert.equal(plan.manufacturing.mustNotUseStorefrontDerivative, true);
});

test("profile registry selects using data selectors", async () => {
  const registry = createManufacturingProfileRegistry([
    await profile("completeful/dtg-back-large.json"),
    await profile("completeful/laser-engraving.json"),
  ]);
  assert.equal(
    registry.select({
      manufacturer: "completeful",
      process: "dtg",
      locationName: "Back",
      printWidthIn: 14,
    })?.id,
    "completeful.dtg.back-large",
  );
});

test("collection lab uses explicit approvals and valid transitions", () => {
  const concept = createCollectionCandidate({
    id: "burn-it-gt-back-tee",
    designId: "burn-it-gt",
    collectionPath: ["Fuel & Free Time", "Performance", "Burn It GT"],
    approvals: { artwork: true, wording: true, palette: true, visualIdentity: true },
  });
  assert.equal(approvalsComplete(concept), true);
  const approved = transitionCollectionCandidate(
    concept,
    COLLECTION_CANDIDATE_STATE.APPROVED_ART,
  );
  assert.equal(approved.state, COLLECTION_CANDIDATE_STATE.APPROVED_ART);
  assert.throws(() =>
    transitionCollectionCandidate(approved, COLLECTION_CANDIDATE_STATE.PUBLISHED),
  );
});
