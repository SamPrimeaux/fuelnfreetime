import assert from "node:assert/strict";
import test from "node:test";
import { chooseMediaOutputKey, finalizeMediaAsset } from "../apps/ecommerce-cms-agentsam/backend/assets/process-job.js";
import { configureAssetStorage } from "../apps/ecommerce-cms-agentsam/backend/assets/config.js";

function collisionEnv(owners = {}, objects = []) {
  const objectKeys = new Set(objects);
  const seen = [];
  return {
    seen,
    DB: {
      prepare(sql) {
        assert.match(sql, /SELECT id FROM media_assets WHERE r2_key = \?/);
        return {
          bind(key) {
            return {
              async first() {
                seen.push(key);
                return owners[key] ? { id: owners[key] } : null;
              },
            };
          },
        };
      },
    },
    WEBSITE_ASSETS: {
      async head(key) { return objectKeys.has(key) ? { size: 25 } : null; },
    },
  };
}

const canonical = "images/bdc5133b-49e8-451b-a32e-a7474b6d8fac-2.webp";
const jobId = "maj_a3a89f51baab474f8e44";

test("regression: second upload cannot claim another row's canonical R2 key", async () => {
  const env = collisionEnv({ [canonical]: 799 });
  const output = await chooseMediaOutputKey(env, canonical, 823, jobId);
  assert.equal(output, "images/bdc5133b-49e8-451b-a32e-a7474b6d8fac-2-job-" + jobId + ".webp");
  assert.equal(await chooseMediaOutputKey(env, canonical, 823, jobId), output);
  assert.deepEqual(env.seen, [canonical, output, canonical, output]);
});

test("unclaimed output and same-asset outputs retain the stable key", async () => {
  assert.equal(await chooseMediaOutputKey(collisionEnv(), canonical, 823, jobId), canonical);
  assert.equal(await chooseMediaOutputKey(collisionEnv({ [canonical]: 823 }), canonical, 823, jobId), canonical);
});

test("unregistered R2 objects are never overwritten by a new media job", async () => {
  const env = collisionEnv({}, [canonical]);
  const output = await chooseMediaOutputKey(env, canonical, 823, jobId);
  assert.notEqual(output, canonical);
  assert.match(output, /-job-maj_a3a89f51baab474f8e44\.webp$/);
});

test("a conflicting fallback destination fails without writing storage", async () => {
  const env = collisionEnv({
    [canonical]: 799,
    ["images/bdc5133b-49e8-451b-a32e-a7474b6d8fac-2-job-" + jobId + ".webp"]: 800,
  });
  await assert.rejects(() => chooseMediaOutputKey(env, canonical, 823, jobId), /canonical_destination_conflict/);
});

test("finalization preserves existing metadata when classification omitted optional fields", async () => {
  configureAssetStorage({
    workerMediaBaseUrl: "https://example.test/media",
    publicBaseUrl: "https://assets.example.test",
  });
  let saved;
  const env = { DB: { prepare(sql) {
    assert.match(sql, /UPDATE media_assets/);
    return { bind(...params) { saved = params; return { run: async () => ({ success: true }) }; } };
  } } };
  const asset = { id: 823, r2_key: "intake/art.png",
    meta_json: JSON.stringify({ asset_role: "master", media_role: "logo", pipeline: "original" }) };
  await finalizeMediaAsset(env, asset, {
    canonical_key: "images/art.webp", intake_key: "intake/art.png",
    content_type: "image/webp", output_bytes: 100, source_bytes: 1000,
    savings_pct: 90, filename: "art.webp",
  });
  const meta = JSON.parse(saved[5]);
  assert.equal(meta.asset_role, "master");
  assert.equal(meta.media_role, "logo");
  assert.equal(meta.pipeline, "original");
  assert.equal(meta.lifecycle, "ready");
});
