import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  batchMedia,
  createMediaAlbum,
  listMedia,
  listMediaAlbums,
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
          "&page=1&page_size=48&sync=0"
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
