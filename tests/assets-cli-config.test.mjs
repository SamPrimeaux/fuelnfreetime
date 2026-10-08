import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const ASSETS = join(ROOT, "apps/ecommerce-cms-agentsam/backend/assets");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const { assetStorage, configureAssetStorage, createAssetStorage, isAssetStorageConfigured, publicUrlsForKey, deliveryUrlForKey } =
  await import("../apps/ecommerce-cms-agentsam/backend/assets/config.js");
const { assetStorageFromWrangler, assetStorageFromProject } = await import("../apps/ecommerce-cms-agentsam/backend/assets/project-config.js");
const { ensureAssetStorage } = await import("../apps/ecommerce-cms-agentsam/backend/assets/runtime.js");
const { discoverChildPrefixes } = await import("../apps/ecommerce-cms-agentsam/backend/assets/completeful-product-assets.js");

// Order matters: module state is per process, so the unconfigured case runs first.
test("storage is unusable until configured, and says how to fix it", () => {
  assert.equal(isAssetStorageConfigured(), false);
  assert.throws(() => assetStorage(), /not configured/);
  assert.throws(() => publicUrlsForKey("a.png"), /not configured/);
});

test("Worker bootstrap derives storage from the company domain, never from a customer constant", async () => {
  const env = {
    ASSET_PUBLIC_BASE_URL: "https://cdn.example.test",
    DB: { prepare: () => ({ first: async () => ({ id: "c1", website_url: "https://shop.example.test/about" }) }) },
  };
  const storage = await ensureAssetStorage(env);
  assert.equal(storage.workerMediaBaseUrl, "https://shop.example.test/media");
  assert.equal(storage.publicBaseUrl, "https://cdn.example.test");
  assert.equal(publicUrlsForKey("p/x.webp").worker, "https://shop.example.test/media/p/x.webp");
  assert.equal(publicUrlsForKey("p/x.webp").cdn, "https://cdn.example.test/p/x.webp");
  // Idempotent: a later call with a different env does not reconfigure.
  assert.equal((await ensureAssetStorage({ DB: null }, new Request("https://other.example.test/"))).workerMediaBaseUrl, "https://shop.example.test/media");
  assert.throws(() => configureAssetStorage({ workerMediaBaseUrl: "https://elsewhere.example.test/media" }), /already configured differently/);
});

test("without a CDN hostname delivery stays on the Worker path and cdn is null", () => {
  const bare = createAssetStorage({ workerMediaBaseUrl: "https://a.example.test/media" });
  assert.equal(bare.publicBaseUrl, null);
  assert.throws(() => createAssetStorage({ workerMediaBaseUrl: "http://a.example.test/media" }), /https/);
  assert.throws(() => createAssetStorage({}), /absolute URL/);
});

test("CLI storage resolves from this project's wrangler.toml", () => {
  const storage = assetStorageFromProject(ROOT);
  const toml = read("wrangler.toml");
  const block = toml.match(/\[\[r2_buckets\]\]\s*binding = "WEBSITE_ASSETS"\s*bucket_name = "([^"]+)"/);
  assert.equal(storage.bucket, block[1]);
  const account = toml.match(/CLOUDFLARE_ACCOUNT_ID = "([^"]+)"/)?.[1];
  if (account) assert.equal(storage.accountId, account);
  assert.equal(storage.workerMediaBaseUrl, `https://${toml.match(/\[\[routes\]\]\s*pattern = "([^"]+)"\s*custom_domain = true/)[1]}/media`);
  assert.equal(storage.publicBaseUrl, toml.match(/ASSET_PUBLIC_BASE_URL = "([^"]+)"/)[1]);
});

test("wrangler parser picks the right binding and refuses a project without one", () => {
  const toml = `[[r2_buckets]]\nbinding = "OTHER"\nbucket_name = "nope"\n\n[[r2_buckets]]\nbinding = "WEBSITE_ASSETS"\nbucket_name = "mine"\n\n[[routes]]\npattern = "x.test"\ncustom_domain = true\n`;
  const parsed = assetStorageFromWrangler(toml, { env: {} });
  assert.equal(parsed.bucket, "mine");
  assert.equal(parsed.workerMediaBaseUrl, "https://x.test/media");
  assert.throws(() => assetStorageFromWrangler("name = 'x'", { env: {} }), /no \[\[r2_buckets\]\]/);
});

test("asset code and CLI carry no deployment literals or product presets", () => {
  const files = readdirSync(ASSETS).filter((f) => f.endsWith(".js")).map((f) => `apps/ecommerce-cms-agentsam/backend/assets/${f}`);
  files.push("apps/ecommerce-cms-agentsam/bin/assets.mjs");
  for (const f of files) {
    assert.doesNotMatch(read(f), /products\/shirts|fuel-n-freetime|[0-9a-f]{32}|https:\/\/(www\.|assets\.)?fuelnfreetime\.com|storage\.json/, f);
  }
  assert.doesNotMatch(read("package.json"), /--prefixes products\//);
});

test("discoverChildPrefixes derives folders from what exists, sorted and unique", async () => {
  const keys = ["products/shirts/a.webp", "products/shirts/b.webp", "products/hat/x.png", "products/loose-file.png", "uploads/ignored.png"].map((key) => ({ key }));
  const seen = [];
  assert.deepEqual(await discoverChildPrefixes("products/", async (p) => { seen.push(p); return keys; }), ["products/hat/", "products/shirts/"]);
  assert.deepEqual(seen, ["products/"]);
  assert.deepEqual(await discoverChildPrefixes("", async () => keys), ["products/", "uploads/"]);
});
