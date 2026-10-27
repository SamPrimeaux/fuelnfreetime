import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  callCompleteful, completefulApi, COMPLETEFUL_CONTRACT,
  COMPLETEFUL_OPERATIONS, CompletefulContractError,
} from "../apps/ecommerce-cms-agentsam/backend/completeful/api.js";
import { handleCompletefulAdminApi } from "../apps/ecommerce-cms-agentsam/backend/admin/completeful.js";

const env = { CAPP_KEY: "capp_test_contract_smoke", COMPLETEFUL_ALLOW_LIVE_WRITES: false };
const ops = Object.entries(COMPLETEFUL_OPERATIONS);

function demoPath(def) {
  return Object.fromEntries(def.pathParams.map((key, index) => [key, "sample-" + index]));
}
function demoQuery(def) {
  return Object.fromEntries(def.requiredQuery.map(key => [key, "sample"]));
}
function demoBody(def) {
  if (!def.bodyRequired) return undefined;
  return Object.fromEntries(def.requiredBodyFields.map(key => [key, "sample"]));
}
function fetchStub(calls) {
  return async (url, opts) => {
    calls.push({ url: String(url), method: opts.method,
      auth: opts.headers.get("Authorization"), idempotency: opts.headers.get("Idempotency-Key"),
      body: opts.body == null ? null : JSON.parse(opts.body),
    });
    return Response.json({ ok: true, request_id: "provider-smoke" },
      { headers: { "x-capp-dry-run": "true", "x-request-id": "provider-smoke" } });
  };
}
test("Completeful pinned OpenAPI is executable: every HTTP operation has a named callable method", () => {
  const spec = JSON.parse(readFileSync(new URL("../docs/providers/completeful/openapi.json", import.meta.url)));
  const digest = createHash("sha256").update(readFileSync(new URL("../docs/providers/completeful/openapi.json", import.meta.url))).digest("hex");
  assert.equal(COMPLETEFUL_CONTRACT.sha256, digest);
  const keys = Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.keys(methods).filter(method => ["get","post","put","patch","delete"].includes(method))
      .map(method => method.toUpperCase() + " " + path));
  assert.equal(keys.length, 55);
  assert.equal(ops.length, keys.length);
  assert.deepEqual(new Set(ops.map(([, op]) => op.method + " " + op.path)), new Set(keys));
  for (const [name] of ops) {
    const [domain, method] = name.split(".");
    assert.equal(typeof completefulApi[domain]?.[method], "function", name);
  }
});
test("Every defined endpoint dispatches an authenticated HTTP request with concrete path/query and dry-run safety", async () => {
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = fetchStub(calls);
  try {
    for (const [name,def] of ops) {
      const result = await callCompleteful(env, name, {
        path: demoPath(def), query: demoQuery(def), body: demoBody(def),
        idempotencyKey: def.method === "GET" ? null : "contract-test:" + name,
      });
      assert.equal(result.meta.request_id, "provider-smoke", name);
      assert.equal(result.meta.dry_run, true, name);
      assert.equal(calls.at(-1).method, def.method, name);
      const url = new URL(calls.at(-1).url);
      assert.equal(url.origin, "https://vxapi.completeful.com", name);
      assert.equal(url.pathname, "/v1" + def.path.replace(/\{(\w+)\}/g, (_match, key) => encodeURIComponent(demoPath(def)[key])), name);
      assert.equal(calls.at(-1).auth, "Bearer capp_test_contract_smoke", name);
    }
    assert.equal(calls.length, 55);
  } finally { globalThis.fetch = prior; }
});
test("Provider API strictly validates route identity, required print assets, allowed queries and mutation gate", async () => {
  await assert.rejects(() => callCompleteful(env, "unknown.call"), { code: "completeful_invalid_operation_input" });
  await assert.rejects(() => callCompleteful(env, "catalog.mockups", { path: {} }), { code: "completeful_invalid_operation_input" });
  await assert.rejects(() => callCompleteful(env, "catalog.mockups",
    { path: { productId: ".." } }), { code: "completeful_invalid_operation_input" });
  await assert.rejects(() => callCompleteful(env, "catalog.mockups", {
    path: { productId: "t-shirt", shopId: "unexpected" },
  }), { code: "completeful_invalid_operation_input" });
  await assert.rejects(() => callCompleteful(env, "catalog.mockups", {
    path: { productId: "t-shirt" }, query: { unsafe: "any" },
  }), { code: "completeful_invalid_operation_input" });
  await assert.rejects(() => callCompleteful(env, "mockups.render", { body: { mockup_id: "uuid" } }),
    { code: "completeful_invalid_operation_input" });
  await assert.rejects(() => callCompleteful(env, "catalog.products", { query: { limit: 900 } }),
    { code: "completeful_invalid_operation_input" });
  assert.ok(new CompletefulContractError("invalid", "query.limit") instanceof TypeError);
  const live = { CAPP_KEY: "capp_live_mock", COMPLETEFUL_ALLOW_LIVE_WRITES: false };
  await assert.rejects(() => callCompleteful(live, "products.create", {
    path: { shopId: "one" }, body: { catalog_product_id: "sku" },
  }), { code: "completeful_live_writes_disabled" });
});
test("Actual admin catalog mockup endpoint uses provider live API, not D1 mockup rows", async () => {
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = fetchStub(calls);
  try {
    const request = new Request("https://fuelnfreetime.com/api/admin/completeful/catalog/item-27/mockups?print_location_id=back-1");
    const reply = await handleCompletefulAdminApi(request, env, new URL(request.url));
    assert.equal(reply.status, 200);
    const data = await reply.json();
    assert.equal(data.catalog_source, "completeful_live");
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).pathname, "/v1/catalog/products/item-27/mockups");
    assert.equal(new URL(calls[0].url).searchParams.get("print_location_id"), "back-1");
  } finally { globalThis.fetch = prior; }
});
test("OpenAPI contract regeneration is deterministic", async () => {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(process.execPath,
    [new URL("../scripts/providers/sync-completeful-sdk.mjs", import.meta.url).pathname,"--check"],
    { encoding: "utf8" });
  assert.match(out, /Verified TypeScript SDK/);
});
