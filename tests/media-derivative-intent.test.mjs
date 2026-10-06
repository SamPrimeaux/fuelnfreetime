import assert from "node:assert/strict";
import test from "node:test";
import { classifyMediaAsset } from "../lib/assets/classify.js";
import { planAssetIngest } from "../lib/assets/worker-hook.js";

test("generic production intent retains a production master without provider knowledge", () => {
  const classification = classifyMediaAsset({
    r2Key: "tenant-a/jobs/production-art.png",
    contentType: "image/png",
    bytes: 11_000_000,
    width: 4200,
    height: 4800,
    production: { requiresMaster: true },
  });
  assert.equal(classification.asset_role, "master");
  assert.equal(classification.promote_deletes_intake, false);
  assert.equal(classification.output_format, "image/png");
});

test("preserve policy is portable and bypasses optimization regardless of key naming", () => {
  const plan = planAssetIngest({
    r2Key: "tenant-a/arbitrary/path/output.png",
    contentType: "image/png",
    bytes: 11_000_000,
    filename: "output.png",
    derivativeRole: "manufacturing",
    transformPolicy: "preserve",
    sourceAssetId: 42,
    sourceKey: "tenant-a/originals/burn-it-gt.svg",
  });

  assert.equal(plan.derivative_role, "manufacturing");
  assert.equal(plan.transform_policy, "preserve");
  assert.equal(plan.transform_state, "no_transform");
  assert.equal(plan.execution.mode, "none");
  assert.equal(plan.canonical_key, plan.intake_key);
  assert.equal(plan.classification.promote_deletes_intake, false);
  assert.equal(plan.classification.output_format, "image/png");
  assert.equal(plan.meta.derivative_role, "manufacturing");
  assert.equal(plan.meta.lineage.source_asset_id, "42");
  assert.equal(plan.meta.lineage.source_key, "tenant-a/originals/burn-it-gt.svg");
});

test("auto policy still creates a delivery derivative when appropriate", () => {
  const plan = planAssetIngest({
    r2Key: "tenant-a/gallery/photo.png",
    contentType: "image/png",
    bytes: 2_000_000,
    filename: "photo.png",
    derivativeRole: "storefront/gallery",
    transformPolicy: "auto",
  });
  assert.equal(plan.transform_policy, "auto");
  assert.equal(plan.execution.mode, "cli_or_node");
  assert.notEqual(plan.canonical_key, plan.intake_key);
});
