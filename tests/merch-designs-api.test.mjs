import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  handleDesignsAdminApi, handleCompletefulDesignValidationApi,
} from "../apps/ecommerce-cms-agentsam/backend/admin/designs.js";
import { completefulDesigns } from "../apps/ecommerce-cms-agentsam/backend/completeful/designs.js";

function createDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  sqlite.exec(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  sqlite.exec("CREATE TABLE IF NOT EXISTS completeful_shops (completeful_shop_id TEXT, is_primary INTEGER, is_active INTEGER)");
  sqlite.exec("CREATE TABLE IF NOT EXISTS completeful_catalog_print_locations (completeful_product_id TEXT, print_location_id TEXT, enabled INTEGER)");
  const stmt = (sql) => ({
    sql, params: [],
    bind(...params) { this.params = params; return this; },
    first() { return sqlite.prepare(sql).get(...this.params) || null; },
    all() { return { results: sqlite.prepare(sql).all(...this.params) }; },
    run() { const r = sqlite.prepare(sql).run(...this.params); return { meta: { changes: Number(r.changes) } }; },
  });
  return {
    prepare: stmt,
    batch: async (operations) => {
      sqlite.exec("BEGIN");
      try {
        const result = operations.map(s => s.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
    },
    exec(sql) { sqlite.exec(sql); },
    close() { sqlite.close(); },
    scalar(sql, ...params) { return sqlite.prepare(sql).get(...params); },
  };
}
function fixture() {
  const db = createDb();
  db.exec("INSERT INTO accounts(id,account_key,display_name) VALUES ('account-1','a1','A1'),('account-2','a2','A2')");
  db.exec("INSERT INTO auth_users(id,email,password_hash,salt) VALUES ('owner-1','owner@test.invalid','x','x'),('member-1','member@test.invalid','x','x'),('viewer-1','viewer@test.invalid','x','x'),('owner-2','second@test.invalid','x','x')");
  db.exec("INSERT INTO account_memberships(account_id,user_id,role) VALUES ('account-1','owner-1','owner'),('account-1','member-1','member'),('account-1','viewer-1','viewer'),('account-2','owner-2','owner')");
  db.exec("INSERT INTO media_assets(id,r2_key,url,filename,content_type) VALUES (1,'art/original-logo.jpg','/media/original.jpg','original.jpg','image/jpeg'),(2,'studio/prepared/front.png','/media/front.png','front.png','image/png'),(3,'studio/prepared/back.png','/media/back.png','back.png','image/png'),(4,'art/original-back.jpg','/media/back.jpg','back.jpg','image/jpeg')");
  db.exec("INSERT INTO products(id,slug,title) VALUES (1,'blank-sand-tee','Blank Tee')");
  db.exec("INSERT INTO product_studio_drafts(id,product_id,completeful_catalog_product_id,selected_variant_ids_json,print_locations_json,title) VALUES ('draft-1',1,'garment-1','[\"variant-1\"]','[\"front-id\",\"back-id\"]','Sand Tee')");
  db.exec("INSERT INTO completeful_catalog_print_locations(completeful_product_id,print_location_id,enabled) VALUES ('garment-1','front-id',1),('garment-1','back-id',1)");
  db.exec("INSERT INTO completeful_shops(completeful_shop_id,is_primary,is_active) VALUES ('shop-1',1,1)");
  return { DB: db, APP_DOMAIN: "fuelnfreetime.test", CAPP_KEY: "capp_test_dummy", COMPLETEFUL_ALLOW_LIVE_WRITES: false };
}
const users = {
  owner: { id: "owner-1", account_id: "account-1" },
  member: { id: "member-1", account_id: "account-1" },
  viewer: { id: "viewer-1", account_id: "account-1" },
  other: { id: "owner-2", account_id: "account-2" },
  forged: { id: "owner-2", account_id: "account-1" },
};
const sides = [
  { slot: "front", original_media_asset_id: 1, prepared_media_asset_id: 2, x: 30, y: 22, scale: 25 },
  { slot: "back", original_media_asset_id: 4, prepared_media_asset_id: 3, x: 50, y: 42, scale: 88 },
];
async function invoke(env, user, path, method = "GET", input) {
  const request = new Request("https://fuelnfreetime.test/api/admin/" + path, {
    method, ...(input === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
  });
  const out = await handleDesignsAdminApi(request, env, new URL(request.url), user);
  return { status: out.status, data: await out.json() };
}
async function createTemplate(env, placements = sides, input = {}) {
  const response = await invoke(env, users.owner, "designs", "POST", {
    name: "Template 1 - Motorsport Tee",
    description: "Small front F&FT logo, large circular motorsport graphic on back",
    tags: ["motorsport", "t-shirt"], visibility: "team",
    canvas: { garment: { color: "sand", type: "tee" } },
    placements, ...input,
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data.design;
}

test("design API: records template, search, version history, optimistic conflict and archive", async () => {
  const env = fixture();
  try {
    const created = await createTemplate(env);
    assert.equal(created.placements.length, 2);
    assert.equal(created.revision, 1);
    assert.deepEqual(created.tags, ["motorsport", "t-shirt"]);
    const results = await invoke(env, users.member, "designs?search=Motorsport");
    assert.equal(results.data.designs.length, 1);
    const updated = await invoke(env, users.owner, "designs/" + created.id, "PATCH", {
      expected_revision: 1, name: "Template 1 - Revised", placements: [{ ...sides[0], scale: 27 }, sides[1]],
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.data));
    assert.equal(updated.data.design.revision, 2);
    const old = await invoke(env, users.owner, "designs/" + created.id + "?revision=1");
    assert.equal(old.data.design.placements[0].scale, 25);
    const stale = await invoke(env, users.owner, "designs/" + created.id, "PATCH", { expected_revision: 1, name: "stale" });
    assert.equal(stale.status, 409);
    const history = await invoke(env, users.owner, "designs/" + created.id + "/revisions");
    assert.deepEqual(history.data.revisions.map(v => v.revision), [2, 1]);
    const archive = await invoke(env, users.owner, "designs/" + created.id, "DELETE");
    assert.equal(archive.status, 200);
    const browse = await invoke(env, users.owner, "designs");
    assert.equal(browse.data.designs.length, 0);
    assert.equal(env.DB.scalar("SELECT COUNT(*) AS n FROM merch_design_revisions").n, 2);
  } finally { env.DB.close(); }
});
test("account and team visibility: private designs isolated; forged account membership fails", async () => {
  const env = fixture();
  try {
    const privateDesign = await createTemplate(env, sides, { visibility: "private" });
    assert.equal((await invoke(env, users.owner, "designs/" + privateDesign.id)).status, 200);
    assert.equal((await invoke(env, users.member, "designs/" + privateDesign.id)).status, 404);
    assert.equal((await invoke(env, users.other, "designs/" + privateDesign.id)).status, 404);
    assert.equal((await invoke(env, users.forged, "designs")).status, 403);
    assert.equal((await invoke(env, users.viewer, "designs", "POST", { name: "forbidden" })).status, 403);
    assert.equal((await invoke(env, users.member, "designs/" + privateDesign.id, "PATCH", { expected_revision: 1, name: "leaked" })).status, 404);
  } finally { env.DB.close(); }
});
test("collections: organize team designs, cannot disclose private designs through team collection", async () => {
  const env = fixture();
  try {
    const team = await createTemplate(env);
    const privateDesign = await createTemplate(env, sides, { visibility: "private" });
    const col = await invoke(env, users.owner, "design-collections", "POST", { name: "Motorsport", visibility: "team" });
    assert.equal(col.status, 201);
    const id = col.data.collection.id;
    const linked = await invoke(env, users.owner, "designs/" + team.id + "/collections/" + id, "PUT");
    assert.equal(linked.status, 200);
    const list = await invoke(env, users.member, "designs?collection_id=" + id);
    assert.deepEqual(list.data.designs.map(d => d.id), [team.id]);
    const rejected = await invoke(env, users.owner, "designs/" + privateDesign.id + "/collections/" + id, "PUT");
    assert.equal(rejected.status, 409);
  } finally { env.DB.close(); }
});
test("apply: maps versioned two-sided design to explicit Completeful print locations", async () => {
  const env = fixture();
  try {
    const design = await createTemplate(env);
    const result = await invoke(env, users.owner, "designs/" + design.id + "/apply", "POST", {
      draft_id: "draft-1", expected_draft_version: 1,
      print_location_map: { front: "front-id", back: "back-id" },
    });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.status, "draft");
    assert.equal(result.data.needs_preparation, true);
    const row = env.DB.scalar("SELECT version,placement_json,print_locations_json,state,completeful_design_id FROM product_studio_drafts WHERE id='draft-1'");
    assert.equal(row.version, 2);
    assert.equal(row.state, "draft");
    const placement = JSON.parse(row.placement_json);
    assert.equal(placement.sides["front-id"].prepared_media_asset_id, null);
    assert.equal(placement.sides["back-id"].prepared_media_asset_id, null);
    assert.equal(placement.design.id, design.id);
    assert.equal(env.DB.scalar("SELECT COUNT(*) AS n FROM merch_design_draft_links").n, 1);
    const stale = await invoke(env, users.owner, "designs/" + design.id + "/apply", "POST", {
      draft_id: "draft-1", expected_draft_version: 1,
      print_location_map: { front: "front-id", back: "back-id" },
    });
    assert.equal(stale.status, 409);
  } finally { env.DB.close(); }
});
test("print validation uses stored PNG and local provider print location rather than caller art URL", async () => {
  const env = fixture();
  const oldFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body), auth: opts.headers.get("Authorization") });
    return Response.json({ valid: true }, { headers: { "x-capp-dry-run": "true" } });
  };
  try {
    const request = new Request("https://fuelnfreetime.test/api/admin/completeful/print-files/validate", {
      method: "POST", body: JSON.stringify({ media_asset_id: 2, catalog_product_id: "garment-1",
        print_location_id: "front-id", art_url: "https://malicious.invalid/ignore" }),
    });
    const result = await handleCompletefulDesignValidationApi(request, env, users.owner);
    assert.equal(result.status, 200, JSON.stringify(await result.clone().json()));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.art_url, "https://fuelnfreetime.test/media/front.png");
    assert.match(calls[0].url, /\/print-files\/validate$/);
    assert.equal(calls[0].auth, "Bearer capp_test_dummy");
    const invalid = await handleCompletefulDesignValidationApi(new Request(request.url, {
      method: "POST", body: JSON.stringify({ media_asset_id: 1, catalog_product_id: "garment-1", print_location_id: "front-id" }),
    }), env, users.owner);
    assert.equal(invalid.status, 400);
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = oldFetch; env.DB.close(); }
});
test("provider design sync in test mode validates first and never stores a fictional live design id", async () => {
  const env = fixture();
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ path: new URL(url).pathname, method: options.method });
    return Response.json(new URL(url).pathname.endsWith("/designs") ? { design: { id: "dry-design" } } : { valid: true },
      { headers: { "x-capp-dry-run": "true" } });
  };
  try {
    const design = await createTemplate(env);
    const sync = await invoke(env, users.owner, "designs/" + design.id + "/completeful/sync", "POST", {
      slot: "front", catalog_product_id: "garment-1", print_location_id: "front-id",
    });
    assert.equal(sync.status, 200, JSON.stringify(sync.data));
    assert.equal(sync.data.dry_run, true);
    assert.equal(sync.data.linked, false);
    assert.deepEqual(calls.map(x => x.path), ["/v1/print-files/validate", "/v1/designs"]);
    assert.equal(env.DB.scalar("SELECT COUNT(*) AS n FROM merch_design_provider_links").n, 0);
  } finally { globalThis.fetch = prior; env.DB.close(); }
});
test("live mutation gate refuses Completeful writes without explicit operator enablement", async () => {
  const env = fixture();
  env.CAPP_KEY = "capp_live_mock";
  assert.throws(() => completefulDesigns.create(env, { name: "Nope" }, "idempotent-test"),
    { code: "completeful_live_writes_disabled" });
  env.DB.close();
});

test("existing Studio front/back artwork can be saved as a reusable design without a new supplier product", async () => {
  const env = fixture();
  try {
    env.DB.exec("UPDATE product_studio_drafts SET placement_json = '{\"sides\":{\"front-id\":{\"x\":32,\"y\":25,\"scale\":27,\"original_media_asset_id\":1,\"prepared_media_asset_id\":2,\"showArtwork\":true},\"back-id\":{\"x\":50,\"y\":50,\"scale\":86,\"original_media_asset_id\":4,\"prepared_media_asset_id\":3,\"showArtwork\":true}}}' WHERE id = 'draft-1'");
    // Actual catalog names arrive from Completeful's synced mirror.
    env.DB.exec("ALTER TABLE completeful_catalog_print_locations ADD COLUMN name TEXT");
    env.DB.exec("UPDATE completeful_catalog_print_locations SET name=CASE WHEN print_location_id='front-id' THEN 'Front' ELSE 'Back' END");
    const r = await invoke(env, users.owner, "designs/from-draft", "POST", {
      draft_id: "draft-1", expected_draft_version: 1, name: "Template 1 - Sand Tee",
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.deepEqual(r.data.design.placements.map(p => p.slot), ["front", "back"]);
    assert.equal(r.data.design.placements[1].scale, 86);
    const repeated = await invoke(env, users.owner, "designs/from-draft", "POST", {
      draft_id: "draft-1", expected_draft_version: 1,
    });
    assert.equal(repeated.status, 200);
    assert.equal(repeated.data.design.id, r.data.design.id);
    assert.equal(env.DB.scalar("SELECT COUNT(*) AS n FROM merch_designs").n, 1);
  } finally { env.DB.close(); }
});

test("provider export job is linked to the saved design and cannot be polled without its local ownership link", async () => {
  const env = fixture();
  const oldFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ path: new URL(url).pathname, method: opts.method });
    return Response.json(opts.method === "POST" ? { export: { id: "export-1", status: "queued" } }
      : { export: { id: "export-1", status: "succeeded", output_url: "https://assets.example/ready.png" } });
  };
  try {
    const design = await createTemplate(env);
    env.CAPP_KEY = "capp_live_mock";
    env.COMPLETEFUL_ALLOW_LIVE_WRITES = true;
    env.DB.prepare("INSERT INTO merch_design_provider_links(design_id,design_revision,provider,shop_id,slot,provider_design_id) VALUES (?,1,'completeful','shop-1','front','linked-front')").bind(design.id).run();
    const response = await invoke(env, users.owner, "designs/" + design.id + "/completeful/exports", "POST", {
      slot: "front", format: "png", max_size: 2048,
    });
    assert.equal(response.status, 201, JSON.stringify(response.data));
    assert.equal(response.data.tracked, true);
    assert.equal(env.DB.scalar("SELECT COUNT(*) AS n FROM merch_design_exports").n, 1);
    const status = await invoke(env, users.owner, "designs/" + design.id + "/completeful/exports/export-1");
    assert.equal(status.status, 200, JSON.stringify(status.data));
    assert.equal(status.data.export.status, "succeeded");
    assert.equal(env.DB.scalar("SELECT status FROM merch_design_exports").status, "succeeded");
    const denied = await invoke(env, users.other, "designs/" + design.id + "/completeful/exports/export-1");
    assert.equal(denied.status, 404);
    assert.deepEqual(calls.map(x => x.path), ["/v1/designs/linked-front/exports", "/v1/designs/exports/export-1"]);
  } finally { globalThis.fetch = oldFetch; env.DB.close(); }
});
