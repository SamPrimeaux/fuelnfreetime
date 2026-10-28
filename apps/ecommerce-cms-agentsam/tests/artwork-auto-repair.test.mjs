import test from "node:test";
import assert from "node:assert/strict";
import { planArtworkAutoRepair } from "../backend/media/artwork-repair.js";

const current = { assessment: { effective_ppi: 148, status: "needs_detail" },
  candidates: [], available_actions: { trim_transparent: false,
    remove_background: false, reconstruct: true } };

test("auto repair recovers an actual sharper related master before any mutation", () => {
  const inspection = { ...current, candidates: [
    { asset: { id: 42, filename: "brand-original.png" },
      assessment: { effective_ppi: 325, recovered_detail_verified: true } },
    { asset: { id: 43, filename: "brand-resample.png" },
      assessment: { effective_ppi: 600, recovered_detail_verified: false } },
  ], available_actions: { ...current.available_actions, trim_transparent: true } };
  assert.deepEqual(planArtworkAutoRepair(inspection), { method: "recover_master",
    candidate_media_asset_id: 42 });
});
test("auto repair uses lossless transparent trim before other transforms", () => {
  assert.deepEqual(planArtworkAutoRepair({ ...current,
    available_actions: { ...current.available_actions, trim_transparent: true } }),
    { method: "trim_transparent" });
});
test("background cleanup yields a candidate rather than approved print artwork", () => {
  assert.deepEqual(planArtworkAutoRepair({ ...current,
    available_actions: { ...current.available_actions, remove_background: true } }),
    { method: "remove_background" });
});
test("AI reconstruction requires explicit opt in, enabled provider and model", () => {
  assert.equal(planArtworkAutoRepair(current), null);
  assert.equal(planArtworkAutoRepair(current, { allow_reconstruct: true }), null);
  assert.equal(planArtworkAutoRepair(current, { model_id: "gpt-image-1" }), null);
  assert.deepEqual(planArtworkAutoRepair(current,
    { allow_reconstruct: true, model_id: "gpt-image-1" }),
    { method: "reconstruct", model_id: "gpt-image-1", confirm_changes: true });
});
test("no synthetic size increase or false print approval is returned", () => {
  assert.equal(planArtworkAutoRepair({ ...current, candidates: [
    { asset: { id: 77, filename: "big-resample.png" },
      assessment: { effective_ppi: 900, recovered_detail_verified: false } }
  ] }), null);
});


test("with consent, actual detail reconstruction takes precedence over cosmetic cleanup", () => {
  const needsPixels = { ...current, available_actions: {
    trim_transparent: true, remove_background: true, reconstruct: true
  } };
  assert.deepEqual(planArtworkAutoRepair(needsPixels,
    { allow_reconstruct: true, model_id: "configured-image-model" }),
    { method: "reconstruct", model_id: "configured-image-model", confirm_changes: true });
  assert.deepEqual(planArtworkAutoRepair(needsPixels),
    { method: "trim_transparent" });
});
