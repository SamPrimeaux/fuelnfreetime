import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkPackage, loadPatterns, scanText } from "../scripts/check-publish-denylist.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const patterns = loadPatterns();
const hit = (s) => scanText(s, patterns).length > 0;

test("customer identity is caught in every spelling", () => {
  for (const s of ["fuelnfreetime", "FuelNFreeTime.com", "Fuel & Free Time", "fuel and free time", "Fuel N Free Time", "fuel-n-free-time", "https://cdn.shopify.com/s/files/1/0666/4060/9411/files/x.png", "ad23b2d9-e2e4-4ad6-eb81-9e4c983df000"]) {
    assert.ok(hit(s), `should flag: ${s}`);
  }
});

test("the stock theme name and generic words are allowed", () => {
  for (const s of ["fnf", "@inneranimalmedia/fnf-theme", "--fnf-color-brand-primary", "fnf-light", "free time to ride", "fuel your style"]) {
    assert.ok(!hit(s), `should allow: ${s}`);
  }
});

test("@inneranimalmedia/fnf-theme tarball contains no customer identity", () => {
  assert.deepEqual(checkPackage(path.join(root, "packages/fnf-theme"), patterns), []);
});

test("fnf-theme exports resolve and the demo site ships", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const pkg = JSON.parse(readFileSync(path.join(root, "packages/fnf-theme/package.json"), "utf8"));
  assert.ok(!Object.keys(pkg.exports).some((k) => /fuelnfreetime/i.test(k)));
  assert.ok(pkg.exports["./sites/demo"]);
  for (const [k, v] of Object.entries(pkg.exports)) if (!v.includes("*")) assert.ok(existsSync(path.join(root, "packages/fnf-theme", v)), `${k} -> ${v}`);
});
