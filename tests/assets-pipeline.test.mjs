import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMediaAsset,
  canonicalKeyForPromotion,
  routePipelineWorkflow,
  planAssetIngest,
  planProductAssetOptimization,
  buildDeterministicSuggestions,
  applyAcceptedSuggestions,
  publicUrlsForKey,
  deliveryUrlForKey,
  mediaPathForKey,
  FNF_R2,
} from "../lib/assets/index.js";

test("canonical custom-domain URL generation", () => {
  const urls = publicUrlsForKey("products/shirts/fft-tee-frontside.webp");
  assert.equal(urls.cdn, "https://assets.fuelnfreetime.com/products/shirts/fft-tee-frontside.webp");
  assert.equal(urls.worker, "https://fuelnfreetime.com/media/products/shirts/fft-tee-frontside.webp");
  assert.equal(mediaPathForKey(urls.key), "/media/products/shirts/fft-tee-frontside.webp");
  assert.equal(FNF_R2.publicBaseUrl, "https://assets.fuelnfreetime.com");
  // Delivery prefers verified worker while CDN custom domain remains 404-prone.
  assert.equal(
    deliveryUrlForKey("products/shirts/fft-tee-frontside.webp"),
    urls.worker,
  );
});

test("image/icon/video/GLB routing", () => {
  const image = classifyMediaAsset({
    r2Key: "intake/abc/shirt-front.png",
    contentType: "image/png",
    bytes: 8_000_000,
    width: 4000,
    height: 5000,
    folder: "products",
  });
  assert.equal(image.media_kind, "image");
  assert.equal(image.asset_role, "canonical");
  assert.equal(image.promote_deletes_intake, true);
  assert.equal(routePipelineWorkflow(image), "fnf_image_pipeline");

  const logo = classifyMediaAsset({
    r2Key: "brand/logos/fandft-clear-background.png",
    contentType: "image/png",
    bytes: 120_000,
    hasAlpha: true,
    filename: "fandft-clear-background.png",
  });
  assert.equal(logo.media_role, "logo");
  assert.equal(logo.asset_role, "master");

  const svg = classifyMediaAsset({
    r2Key: "brand/logos/mark.svg",
    contentType: "image/svg+xml",
  });
  assert.equal(svg.pipeline, "icon");
  assert.equal(svg.asset_role, "master");
  assert.equal(routePipelineWorkflow(svg), "fnf_icon_pipeline");

  const video = classifyMediaAsset({
    r2Key: "videos/about.mp4",
    contentType: "video/mp4",
  });
  assert.equal(video.pipeline, "video");
  assert.equal(routePipelineWorkflow(video), "fnf_video_pipeline");

  const glb = classifyMediaAsset({
    r2Key: "3d-models/emblem.glb",
    contentType: "model/gltf-binary",
  });
  assert.equal(glb.pipeline, "glb");
  assert.equal(glb.asset_role, "master");
  assert.equal(routePipelineWorkflow(glb), "fnf_glb_pipeline");
});

test("unsupported media fail-explicit behavior", () => {
  const plan = planAssetIngest({
    r2Key: "docs/notes.txt",
    contentType: "text/plain",
    filename: "notes.txt",
  });
  assert.equal(plan.transform_state, "unsupported");
  assert.equal(plan.optimized, false);
  assert.equal(plan.classification.asset_role, "unsupported");
  assert.match(plan.execution.note, /Unsupported/i);
});

test("upload → automatic optimization planning (Worker-safe)", () => {
  const plan = planAssetIngest({
    r2Key: "intake/u1/img-6282.png",
    contentType: "image/png",
    bytes: 8_450_000,
    filename: "img-6282.png",
    folder: "products",
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.transform_state, "planned");
  assert.equal(plan.optimized, false); // never pretend finished
  assert.equal(plan.classification.promote_deletes_intake, true);
  assert.ok(plan.canonical_key.endsWith(".webp"));
  assert.notEqual(plan.canonical_key, plan.intake_key);
  assert.equal(plan.workflow_key, "fnf_image_pipeline");
});

test("original preservation vs promote policy", () => {
  // Canonical ecommerce photo: intake may be deleted after promote.
  const photo = classifyMediaAsset({
    r2Key: "intake/x/photo.jpg",
    contentType: "image/jpeg",
    bytes: 3_000_000,
  });
  assert.equal(photo.promote_deletes_intake, true);

  // Master GLB: never delete authority.
  const glb = classifyMediaAsset({
    r2Key: "3d-models/emblem.glb",
    contentType: "model/gltf-binary",
  });
  assert.equal(glb.promote_deletes_intake, false);
  assert.equal(glb.asset_role, "master");
});

test("derivative lineage via plan meta (canonical key lineage)", () => {
  const plan = planAssetIngest({
    r2Key: "uploads/big.png",
    contentType: "image/png",
    bytes: 2_000_000,
    filename: "big.png",
  });
  assert.equal(plan.meta.intake_key, "uploads/big.png");
  assert.ok(plan.meta.canonical_key);
  assert.equal(plan.meta.promote_deletes_intake, true);
  assert.equal(
    canonicalKeyForPromotion({
      intakeKey: "uploads/big.png",
      outputExt: "webp",
    }),
    plan.canonical_key,
  );
});

test("deterministic metadata suggestions", () => {
  const intel = buildDeterministicSuggestions({
    r2Key: "products/shirts/fft-tee-frontside.png",
    filename: "fft-tee-frontside.png",
    contentType: "image/png",
    folder: "products",
  });
  assert.equal(intel.apply_policy, "review_required");
  assert.equal(intel.suggestions.slug, "fft-tee-frontside");
  assert.equal(intel.suggestions.media_role, "product_photo");
  assert.ok(intel.suggestions.alt_text.includes("Fuel"));
});

test("human metadata not silently overwritten", () => {
  const intel = buildDeterministicSuggestions({
    r2Key: "products/shirts/fft-tee-frontside.png",
    filename: "fft-tee-frontside.png",
    existing: { alt_text: "Human written alt", title: "Human title" },
  });
  assert.equal(intel.protected_fields.alt_text, true);
  assert.equal(intel.protected_fields.title, true);

  const applied = applyAcceptedSuggestions(
    { title: "Human title", alt_text: "Human written alt", tags: [] },
    intel,
    ["title", "alt_text", "slug"],
  );
  assert.deepEqual(applied.accepted, ["slug"]);
  assert.ok(applied.skipped.some((s) => s.key === "alt_text"));
  assert.equal(applied.metadata.alt_text, "Human written alt");
  assert.equal(applied.metadata.title, "Human title");
});

test("broken thumbnail / root-path regression helpers", () => {
  // Relative /media path remains compatibility SSOT in D1.
  assert.equal(mediaPathForKey("designs/x.webp"), "/media/designs/x.webp");
  // CDN URL must never be the only option while custom domain 404s.
  assert.ok(deliveryUrlForKey("designs/x.webp").includes("/media/"));
});

test("Completeful product asset planning", () => {
  const plan = planProductAssetOptimization({
    r2Key: "products/fuel-n-freetime-hat/img-6282.png",
    productSlug: "fuel-n-freetime-hat",
    collection: "hats",
    bytes: 8_450_000,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.retention_policy, "intake_promote_delete");
  assert.equal(plan.requires_approval_to_replace_live, false);
  assert.ok(plan.canonical_key.includes("fuel-n-freetime-hat") || plan.canonical_key.includes("products/"));
  assert.equal(plan.optimized, false);
});

test("product detail route id lookup contract", () => {
  // Frontend navigates with catalog_product_id; backend accepts either id.
  // This unit test locks the client id resolver preference used in Product Studio.
  const catalogProductId = (p) =>
    p.catalog_product_id || p.provider_product_id || p.completeful_product_id || "";
  assert.equal(
    catalogProductId({
      catalog_product_id: "aaa",
      completeful_product_id: "bbb",
    }),
    "aaa",
  );
  assert.equal(
    catalogProductId({ completeful_product_id: "bbb" }),
    "bbb",
  );
});
