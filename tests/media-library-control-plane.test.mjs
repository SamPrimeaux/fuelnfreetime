import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  batchMedia,
  createMediaAlbum,
  listMedia,
  listMediaAlbums,
  reorderMedia,
} from "../apps/ecommerce-cms-agentsam/backend/admin/media.js";
import { resolveSelectedResource } from "../apps/ecommerce-cms-agentsam/backend/agentsam/selected-resource.js";

function fixture(count = 65) {
  const db = new DatabaseSync(":memory:");
  db.exec([
    "CREATE TABLE media_assets (",
    "id INTEGER PRIMARY KEY AUTOINCREMENT,",
    "r2_key TEXT NOT NULL UNIQUE,",
    "url TEXT NOT NULL,",
    "filename TEXT NOT NULL,",
    "content_type TEXT,",
    "size_bytes INTEGER,",
    "category TEXT,",
    "folder TEXT NOT NULL DEFAULT 'images',",
    "display_order INTEGER NOT NULL DEFAULT 0,",
    "alt_text TEXT,",
    "placement_json TEXT,",
    "meta_json TEXT,",
    "created_at TEXT NOT NULL DEFAULT (datetime('now')),",
    "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    ");",
    "CREATE TABLE media_albums (",
    "id INTEGER PRIMARY KEY AUTOINCREMENT,",
    "slug TEXT NOT NULL UNIQUE,",
    "name TEXT NOT NULL,",
    "description TEXT,",
    "cover_media_asset_id INTEGER,",
    "meta_json TEXT,",
    "created_at TEXT NOT NULL DEFAULT (datetime('now')),",
    "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    ");",
    "CREATE TABLE media_album_assets (",
    "album_id INTEGER NOT NULL,",
    "media_asset_id INTEGER NOT NULL,",
    "position INTEGER NOT NULL DEFAULT 0,",
    "added_at TEXT NOT NULL DEFAULT (datetime('now')),",
    "PRIMARY KEY (album_id, media_asset_id)",
    ");",
    "CREATE TABLE media_asset_jobs (",
    "id TEXT PRIMARY KEY NOT NULL,",
    "media_asset_id INTEGER,",
    "intake_key TEXT NOT NULL,",
    "canonical_key TEXT,",
    "pipeline TEXT,",
    "status TEXT NOT NULL DEFAULT 'queued',",
    "attempts INTEGER NOT NULL DEFAULT 0,",
    "last_error TEXT,",
    "plan_json TEXT,",
    "result_json TEXT,",
    "created_at INTEGER NOT NULL,",
    "updated_at INTEGER NOT NULL,",
    "started_at INTEGER,",
    "finished_at INTEGER",
    ");",
  ].join(" "));

  const insert = db.prepare(
    "INSERT INTO media_assets " +
      "(r2_key,url,filename,content_type,size_bytes,category,folder,display_order,alt_text,meta_json) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?)"
  );

  for (let i = 1; i <= count; i += 1) {
    const dirt = i % 3 === 0;
    const meta = i === 1
      ? JSON.stringify({
          intelligence: {
            suggestions: {
              alt_text: "Dirt bike rider launching from a ramp",
              title: "Launch campaign dirt bike",
              tags: ["dirt-bike", "launch-campaign"],
            },
            protected_fields: {},
          },
          tags: [],
        })
      : "{}";
    insert.run(
      "images/campaign-" + i + ".jpg",
      "/media/images/campaign-" + i + ".jpg",
      (dirt ? "dirtbike-" : "campaign-") + i + ".jpg",
      "image/jpeg",
      1000000 + i,
      dirt ? "campaign" : "image",
      "images",
      i,
      "",
      meta
    );
  }

  const DB = {
    prepare(sql) {
      const statement = db.prepare(sql);
      let args = [];
      const wrapper = {
        bind(...values) {
          args = values;
          return wrapper;
        },
        first() {
          return statement.get(...args);
        },
        all() {
          return { results: statement.all(...args) };
        },
        run() {
          const result = statement.run(...args);
          return {
            success: true,
            meta: {
              changes: Number(result.changes || 0),
              last_row_id: Number(result.lastInsertRowid || 0),
            },
          };
        },
      };
      return wrapper;
    },
  };

  const sent = [];
  return {
    db,
    sent,
    env: {
      DB,
      ASSET_JOBS: {
        async send(message) {
          sent.push(message);
        },
      },
    },
  };
}

async function responseJson(response) {
  assert.ok(response instanceof Response);
  return response.json();
}

test("media list is server-paged and search-filtered before rendering", async () => {
  const { env } = fixture(65);
  const page2 = await responseJson(
    await listMedia(
      new Request("https://example.test/api/admin/media"),
      env,
      new URL("https://example.test/api/admin/media?view=images&page=2&page_size=48&sync=0")
    )
  );

  assert.equal(page2.pagination.total, 65);
  assert.equal(page2.pagination.pages, 2);
  assert.equal(page2.pagination.page, 2);
  assert.equal(page2.assets.length, 17);
  assert.equal(page2.pagination.has_prev, true);
  assert.equal(page2.pagination.has_next, false);

  const search = await responseJson(
    await listMedia(
      new Request("https://example.test/api/admin/media"),
      env,
      new URL("https://example.test/api/admin/media?view=images&q=dirtbike&page=1&page_size=48&sync=0")
    )
  );
  assert.equal(search.pagination.total, 21);
  assert.ok(search.assets.every((asset) => asset.filename.startsWith("dirtbike-")));
});


test("non-media registry rows do not inflate media pagination or folder counts", async () => {
  const { db, env } = fixture(65);
  const insert = db.prepare(
    "INSERT INTO media_assets " +
      "(r2_key,url,filename,content_type,size_bytes,category,folder,display_order,alt_text,meta_json) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?)"
  );

  for (let i = 1; i <= 100; i += 1) {
    insert.run(
      "agentsam/thread-payloads/conv-" + i + "/messages.jsonl",
      "/media/agentsam/thread-payloads/conv-" + i + "/messages.jsonl",
      "messages.jsonl",
      "application/octet-stream",
      100 + i,
      "internal",
      "images",
      1000 + i,
      "",
      "{}"
    );
  }

  const response = await responseJson(
    await listMedia(
      new Request("https://example.test/api/admin/media"),
      env,
      new URL("https://example.test/api/admin/media?view=images&page=1&page_size=48&sync=0")
    )
  );

  assert.equal(response.pagination.total, 65);
  assert.equal(response.pagination.pages, 2);
  assert.equal(response.assets.length, 48);
  assert.equal(response.counts.images, 65);
  assert.ok(response.assets.every((asset) => !asset.r2_key.startsWith("agentsam/")));
});

test("media sorting is explicit and deterministic", async () => {
  const { env } = fixture(6);

  const newest = await responseJson(
    await listMedia(
      new Request("https://example.test/api/admin/media"),
      env,
      new URL("https://example.test/api/admin/media?view=all&sort=newest&page=1&page_size=48&sync=0")
    )
  );
  assert.deepEqual(newest.assets.map((asset) => Number(asset.id)).slice(0, 3), [6, 5, 4]);

  const name = await responseJson(
    await listMedia(
      new Request("https://example.test/api/admin/media"),
      env,
      new URL("https://example.test/api/admin/media?view=all&sort=name&page=1&page_size=48&sync=0")
    )
  );
  assert.deepEqual(
    name.assets.map((asset) => asset.filename),
    [...name.assets.map((asset) => asset.filename)].sort((a, b) => a.localeCompare(b))
  );
});

test("media batch actions reuse deterministic job machinery and virtual folders", async () => {
  const { env, db, sent } = fixture(5);

  const optimize = await responseJson(
    await batchMedia(
      new Request("https://example.test/api/admin/media/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [1, 2], action: "optimize" }),
      }),
      env
    )
  );
  assert.equal(optimize.ok, true);
  assert.equal(optimize.jobs.length, 2);
  assert.equal(sent.length, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM media_asset_jobs").get().n, 2);

  const moved = await responseJson(
    await batchMedia(
      new Request("https://example.test/api/admin/media/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [1, 2], action: "move", folder: "products" }),
      }),
      env
    )
  );
  assert.equal(moved.updated, 2);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM media_assets WHERE folder='products'").get().n,
    2
  );

  const seo = await responseJson(
    await batchMedia(
      new Request("https://example.test/api/admin/media/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [1], action: "accept_suggestions" }),
      }),
      env
    )
  );
  assert.equal(seo.updated, 1);
  assert.equal(
    db.prepare("SELECT alt_text FROM media_assets WHERE id=1").get().alt_text,
    "Dirt bike rider launching from a ramp"
  );
});

test("media albums curate selected assets without moving the originals", async () => {
  const { env, db } = fixture(8);

  const created = await responseJson(
    await createMediaAlbum(
      new Request("https://example.test/api/admin/media/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Dirt Bike Launch",
          description: "Campaign selects and gallery candidates",
        }),
      }),
      env
    )
  );
  assert.equal(created.ok, true);
  assert.equal(created.album.name, "Dirt Bike Launch");
  assert.equal(created.album.meta.kind, "album");
  assert.equal(created.album.meta.status, "draft");
  const albumId = Number(created.album.id);
  assert.ok(albumId > 0);

  const added = await responseJson(
    await batchMedia(
      new Request("https://example.test/api/admin/media/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: [1, 2, 3],
          action: "album_add",
          album_id: albumId,
        }),
      }),
      env
    )
  );
  assert.equal(added.added, 3);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM media_album_assets WHERE album_id=?").get(albumId).n,
    3
  );

  const filtered = await responseJson(
    await listMedia(
      new Request("https://example.test/api/admin/media"),
      env,
      new URL(
        "https://example.test/api/admin/media?view=all&album_id=" +
          albumId +
          "&page=1&page_size=48&sort=manual&sync=0"
      )
    )
  );
  assert.equal(filtered.pagination.total, 3);
  assert.deepEqual(filtered.assets.map((asset) => Number(asset.id)), [1, 2, 3]);
  assert.equal(filtered.active_album_id, albumId);

  const removed = await responseJson(
    await batchMedia(
      new Request("https://example.test/api/admin/media/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: [2],
          action: "album_remove",
          album_id: albumId,
        }),
      }),
      env
    )
  );
  assert.equal(removed.updated, 1);

  const albums = await responseJson(
    await listMediaAlbums(
      new Request("https://example.test/api/admin/media/albums"),
      env
    )
  );
  assert.equal(albums.albums[0].asset_count, 2);

  assert.equal(
    db.prepare("SELECT folder FROM media_assets WHERE id=1").get().folder,
    "images"
  );
});


test("gallery collections persist portable kind and presentation metadata", async () => {
  const { env } = fixture(3);
  const created = await responseJson(
    await createMediaAlbum(
      new Request("https://example.test/api/admin/media/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Launch Gallery",
          description: "Existing plus device uploads",
          kind: "gallery",
          status: "draft",
          presentation: { layout: "grid", fit: "cover" },
        }),
      }),
      env
    )
  );
  assert.equal(created.album.meta.kind, "gallery");
  assert.equal(created.album.meta.status, "draft");
  assert.deepEqual(created.album.meta.presentation, { layout: "grid", fit: "cover" });

  const listed = await responseJson(await listMediaAlbums(new Request("https://example.test/api/admin/media/albums"), env));
  assert.equal(listed.albums[0].meta.kind, "gallery");
});

test("album reorder updates membership positions without touching base media order", async () => {
  const { env, db } = fixture(5);
  db.prepare("INSERT INTO media_albums (slug,name) VALUES (?,?)").run("launch", "Launch");
  const albumId = Number(db.prepare("SELECT id FROM media_albums WHERE slug='launch'").get().id);
  for (const [position, id] of [1, 2, 3].entries()) {
    db.prepare("INSERT INTO media_album_assets (album_id,media_asset_id,position) VALUES (?,?,?)")
      .run(albumId, id, position + 1);
  }
  const before = db.prepare("SELECT id,display_order FROM media_assets WHERE id IN (1,2,3) ORDER BY id").all();

  const response = await responseJson(
    await reorderMedia(
      new Request("https://example.test/api/admin/media/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          album_id: albumId,
          items: [
            { id: 3, position: 1 },
            { id: 1, position: 2 },
            { id: 2, position: 3 },
          ],
        }),
      }),
      env
    )
  );
  assert.equal(response.ok, true);
  assert.deepEqual(
    db.prepare("SELECT media_asset_id FROM media_album_assets WHERE album_id=? ORDER BY position").all(albumId).map((r) => Number(r.media_asset_id)),
    [3, 1, 2]
  );
  assert.deepEqual(
    db.prepare("SELECT id,display_order FROM media_assets WHERE id IN (1,2,3) ORDER BY id").all(),
    before
  );
});

test("AgentSam media selection is server-verified and bounded", async () => {
  const { env } = fixture(5);

  const resolved = await resolveSelectedResource(env, {
    type: "media_selection",
    surface: "content-library",
    ids: [3, 1, 2],
  });

  assert.equal(resolved.type, "media_selection");
  assert.equal(resolved.surface, "content-library");
  assert.equal(resolved.count, 3);
  assert.deepEqual(resolved.ids, [1, 2, 3]);
  assert.equal(resolved.assets[0].filename, "campaign-1.jpg");

  await assert.rejects(
    () =>
      resolveSelectedResource(env, {
        type: "media_selection",
        surface: "content-library",
        ids: [1, 999],
      }),
    /do not belong/
  );
});

test("AgentSam single media asset context is server-verified", async () => {
  const { env } = fixture(5);

  const resolved = await resolveSelectedResource(env, {
    type: "media_asset",
    surface: "content-library",
    id: 2,
  });

  assert.equal(resolved.type, "media_asset");
  assert.equal(resolved.surface, "content-library");
  assert.equal(resolved.id, 2);
  assert.equal(resolved.filename, "campaign-2.jpg");
  assert.equal(resolved.source.provider, "r2");
  assert.equal(resolved.source.key, "images/campaign-2.jpg");

  await assert.rejects(
    () =>
      resolveSelectedResource(env, {
        type: "media_asset",
        surface: "content-library",
        id: 999,
      }),
    /does not belong/
  );
});
