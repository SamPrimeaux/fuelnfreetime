import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMediaAsset,
  planAssetIngest,
  publicUrlsForKey,
  deliveryUrlForKey,
  mediaPathForKey,
  FNF_R2,
} from "../lib/assets/index.js";

test("operator lifecycle never uses optimize jargon in plan meta lifecycle", () => {
  const plan = planAssetIngest({
    r2Key: "intake/u1/big.png",
    contentType: "image/png",
    bytes: 4_000_000,
    filename: "big.png",
    folder: "products",
  });
  // Plan still has transform_state for machines; UI must map to processing/ready.
  assert.equal(plan.optimized, false);
  assert.ok(["planned", "no_transform", "unsupported"].includes(plan.transform_state));
  assert.equal(plan.classification.promote_deletes_intake, true);
});

test("master assets skip destructive transform automatically", () => {
  const glb = classifyMediaAsset({
    r2Key: "3d-models/emblem.glb",
    contentType: "model/gltf-binary",
  });
  assert.equal(glb.asset_role, "master");
  assert.equal(glb.promote_deletes_intake, false);

  const svg = classifyMediaAsset({
    r2Key: "brand/logos/mark.svg",
    contentType: "image/svg+xml",
  });
  assert.equal(svg.asset_role, "master");
});

test("canonical URL helpers remain available for ready assets", () => {
  assert.equal(FNF_R2.publicBaseUrl, "https://assets.fuelnfreetime.com");
  assert.ok(deliveryUrlForKey("images/x.webp").includes("/media/"));
  assert.equal(mediaPathForKey("images/x.webp"), "/media/images/x.webp");
  assert.equal(
    publicUrlsForKey("images/x.webp").cdn,
    "https://assets.fuelnfreetime.com/images/x.webp",
  );
});
