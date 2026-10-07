import test from "node:test";
import assert from "node:assert/strict";
import { attachCmsDefinitions, listCmsDefinitions, normalizeCmsDefinition } from "../apps/ecommerce-cms-agentsam/backend/cms/definition-registry.mjs";
import { registryForAdmin } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

test("D1 CMS definition lookups bind the session account, status, key, and version", async () => {
  const calls = [];
  const env = { DB: { prepare(sql) {
    return { bind(...values) {
      calls.push({ sql, values });
      return { all: async () => ({ results: [{
        id: "cmsd_demo", definition_key: "collections", kind: "section", version: "2",
        label: "Collections Grid", origin: "imported", status: "active",
        settings_schema_json: '{"title":{"type":"text"}}',
        allowed_blocks_json: '["collection-card"]', metadata_json: '{}'
      }] }) };
    } };
  } } };
  const rows = await listCmsDefinitions(env, "acct_alpha", { kind: "section", status: "active", key: "collections", version: "2" });
  assert.equal(rows.length, 1);
  assert.deepEqual(calls[0].values, ["acct_alpha", "section", "active", "collections", "2"]);
  assert.match(calls[0].sql, /a.account_id = d.account_id/);
  assert.deepEqual(rows[0].allowedBlocks, ["collection-card"]);
  assert.equal(rows[0].fields.title.type, "text");
  assert.equal(rows[0].artifact, null);
});

test("invalid or missing account and invalid discovery filters never reach D1", async () => {
  const env = { DB: { prepare() { throw Error("must not query"); } } };
  await assert.rejects(listCmsDefinitions(env, ""), /account_required/);
  await assert.rejects(listCmsDefinitions(env, "acct", { kind: "invalid" }), /invalid_definition_kind/);
  await assert.rejects(listCmsDefinitions(env, "acct", { key: "injected' OR 1=1" }), /invalid_definition_key/);
});

test("definitions enrich real sections but cannot invent fake renderers", () => {
  const known = normalizeCmsDefinition({ id:"cmsd_known", definition_key:"collections", kind:"section", label:"Collection Grid",version:"3", origin:"imported",status:"active", settings_schema_json:"{}", allowed_blocks_json:"[]" });
  const unknown = normalizeCmsDefinition({ id:"cmsd_new", definition_key:"unbuilt-scene", kind:"section",label:"Unbuilt scene",version:"1",origin:"generated",status:"active",settings_schema_json:"{}",allowed_blocks_json:"[]" });
  const draft = normalizeCmsDefinition({ id:"cmsd_draft", definition_key:"products-grid", kind:"section",label:"Products",version:"1",origin:"imported",status:"draft",settings_schema_json:"{}",allowed_blocks_json:"[]" });
  const result = attachCmsDefinitions(registryForAdmin(), [known,unknown,draft]);
  assert.equal(result.pages.shop.sections.collections.definitionVersion, "3");
  assert.equal(result.pages.shop.sections["products-grid"].definitionVersion, undefined);
  assert.equal(result.pages.shop.sections["unbuilt-scene"], undefined);
  assert.equal(result.definitions.find((x)=>x.key==="unbuilt-scene").insertable, false);
  assert.equal(result.definitions.find((x)=>x.key==="collections").insertable, true);
});

test("an artifact without a ready, tenant-matching record is not executable", () => {
  const bad = normalizeCmsDefinition({ id:"cmsd", definition_key:"scene", kind:"section",version:"1",label:"Scene",status:"active",origin:"generated",artifact_id:"x", artifact_status:"building",settings_schema_json:"{}",allowed_blocks_json:"[]" });
  assert.equal(bad.artifact,null);
});

test("admin definition endpoint is account-scoped and validates filters", async () => {
  const { handleAdminCmsApi } = await import("../apps/ecommerce-cms-agentsam/backend/cms/api.js");
  let bound = null;
  const env = { DB: { prepare(sql) {
    return { bind(...values) {
      bound = { sql, values };
      return { all: async () => ({ results: [] }) };
    } };
  } } };
  const request = new Request("https://fuelnfreetime.test/api/admin/cms/definitions?kind=section&status=active");
  const denied = await handleAdminCmsApi(request, env, new URL(request.url));
  assert.equal(denied.status, 403, "A missing account must never permit definition discovery");
  assert.equal(bound, null);

  const allowed = await handleAdminCmsApi(request, env, new URL(request.url), { accountId:"acct_alpha" });
  assert.equal(allowed.status, 200);
  assert.deepEqual((await allowed.json()).definitions, []);
  assert.deepEqual(bound.values, ["acct_alpha", "section", "active"]);

  const invalid = new Request("https://fuelnfreetime.test/api/admin/cms/definitions?kind=../../../oops");
  const bad = await handleAdminCmsApi(invalid, env, new URL(invalid.url), { accountId:"acct_alpha" });
  assert.equal(bad.status, 400);
});

test("admin registry overlays active D1 metadata without replacing section renderers", async () => {
  const { handleAdminCmsApi } = await import("../apps/ecommerce-cms-agentsam/backend/cms/api.js");
  const env = { DB: { prepare(sql) {
    assert.match(sql,/WHERE d.account_id =/);
    return { bind(...values) {
      assert.deepEqual(values, ["acct_alpha","active"]);
      return { all: async () => ({ results: [{
        id:"cmsd_x", definition_key:"collections",kind:"section",version:"1",label:"Collections",
        origin:"imported",status:"active",settings_schema_json:"{}",allowed_blocks_json:"[]"
      }] }) };
    } };
  } } };
  const request = new Request("https://fuelnfreetime.test/api/admin/cms/registry");
  const response = await handleAdminCmsApi(request, env, new URL(request.url), { accountId:"acct_alpha" });
  const data = await response.json();
  assert.equal(data.ok,true);
  assert.equal(data.pages.shop.sections.collections.definitionId,"cmsd_x");
  assert.equal(data.pages.shop.sections.collections.fields[0].key,"title","Real inspector controls must remain intact");
  assert.equal(data.definitions.find((entry)=>entry.key==="collections").insertable,true);
  assert.equal(data.pages.shop.sections["unbuilt-scene"],undefined);
});
