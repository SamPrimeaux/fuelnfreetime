import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASSET_STORAGE } from "../lib/assets/config.js";
import { discoverChildPrefixes } from "../lib/assets/completeful-product-assets.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("storage.json is the single source and agrees with wrangler.toml", () => {
  const toml = read("wrangler.toml");
  assert.ok(toml.includes(`CLOUDFLARE_ACCOUNT_ID = "${ASSET_STORAGE.accountId}"`), "account id drifted from wrangler.toml");
  const block = toml.match(/\[\[r2_buckets\]\]\s*binding = "([^"]+)"\s*bucket_name = "([^"]+)"/);
  assert.ok(block, "no r2 bucket in wrangler.toml");
  assert.equal(block[1], ASSET_STORAGE.binding);
  assert.equal(block[2], ASSET_STORAGE.bucket);
});

test("asset code and CLI carry no deployment literals or product presets", () => {
  for (const f of ["bin/fnf-assets.mjs", "lib/assets/config.js"]) {
    const src = read(f);
    assert.doesNotMatch(src, /products\/shirts|fuel-n-freetime|ede6590ac0d2fb7daf155b35653457b2|https:\/\/(www\.)?fuelnfreetime\.com/, f);
  }
  assert.doesNotMatch(read("package.json"), /--prefixes products\//);
});

test("discoverChildPrefixes derives folders from what exists, sorted and unique", async () => {
  const keys = [
    "products/shirts/a.webp", "products/shirts/b.webp", "products/hat/x.png",
    "products/loose-file.png", "uploads/ignored.png",
  ].map((key) => ({ key }));
  const seen = [];
  const out = await discoverChildPrefixes("products/", async (p) => { seen.push(p); return keys; });
  assert.deepEqual(out, ["products/hat/", "products/shirts/"]);
  assert.deepEqual(seen, ["products/"]);
  assert.deepEqual(await discoverChildPrefixes("", async () => keys), ["products/", "uploads/"]);
});
