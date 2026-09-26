import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import {
  duplicateBlock,
  duplicateSection,
  insertBlock,
  insertSection,
  moveBlock,
  moveSection,
  removeBlock,
  removeSection,
  setSectionVisibility,
} from "../apps/ecommerce-cms-agentsam/backend/cms/api.js";
import { PAGE_REGISTRY } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE page_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      section_key TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      content_json TEXT NOT NULL DEFAULT '{}',
      content_r2_key TEXT,
      content_version INTEGER NOT NULL DEFAULT 0,
      content_hash TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(page_id, section_key)
    );
    INSERT INTO pages (id, slug, title, status) VALUES (1, 'shop', 'Shop', 'published');
    INSERT INTO page_sections
      (page_id, section_key, sort_order, content_json, content_r2_key, content_version, status)
    VALUES
      (1, 'hero', 0, '{}', 'cms/pages/shop/draft/hero.json', 1, 'published'),
      (1, 'collections', 10, '{}', 'cms/pages/shop/draft/collections.json', 1, 'published'),
      (1, 'stories', 20, '{}', 'cms/pages/shop/draft/stories.json', 1, 'published');
  `);

  const adapter = {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) {
          values = args;
          return statement;
        },
        run() {
          const result = db.prepare(sql).run(...values);
          return {
            success: true,
            meta: {
              changes: Number(result.changes || 0),
              last_row_id: Number(result.lastInsertRowid || 0),
            },
          };
        },
        first() {
          return db.prepare(sql).get(...values);
        },
        all() {
          return { results: db.prepare(sql).all(...values) };
        },
      };
      return statement;
    },
  };

  const objects = new Map();
  const putDoc = (key, content, version = 1, status = "draft") => {
    objects.set(
      key,
      JSON.stringify({
        section_key: key.split("/").pop().replace(/\.json$/, ""),
        content,
        version,
        status,
        updated_at: "2026-09-26 09:00:00",
      })
    );
  };

  putDoc(
    "cms/pages/shop/draft/hero.json",
    structuredClone(PAGE_REGISTRY.shop.sections.hero.defaultContent)
  );
  putDoc(
    "cms/pages/shop/draft/collections.json",
    structuredClone(PAGE_REGISTRY.shop.sections.collections.defaultContent)
  );
  putDoc(
    "cms/pages/shop/draft/stories.json",
    structuredClone(PAGE_REGISTRY.shop.sections.stories.defaultContent)
  );

  const env = {
    DB: adapter,
    WEBSITE_ASSETS: {
      async put(key, body) {
        objects.set(key, String(body));
      },
      async get(key) {
        const body = objects.get(key);
        if (body == null) return null;
        return {
          async text() {
            return body;
          },
        };
      },
    },
    CMS_CACHE: {
      async delete() {},
      async get() {
        return null;
      },
      async put() {},
    },
  };

  return {
    db,
    env,
    objects,
    readDraft(sectionKey) {
      const raw = objects.get(`cms/pages/shop/draft/${sectionKey}.json`);
      return raw ? JSON.parse(raw) : null;
    },
  };
}

test("section mutations create real ordered instances, visibility drafts, and removal tombstones", async () => {
  const fx = fixture();
  try {
    const inserted = await insertSection(fx.env, "shop", {
      templateKey: "hero",
      toIndex: 1,
    });
    assert.equal(inserted.ok, true);
    assert.notEqual(inserted.section_key, "hero");

    let rows = fx.db
      .prepare("SELECT section_key, sort_order, status FROM page_sections ORDER BY sort_order, id")
      .all();
    assert.equal(rows[1].section_key, inserted.section_key);

    const insertedDraft = fx.readDraft(inserted.section_key);
    assert.equal(insertedDraft.content.__editor.templateKey, "hero");
    assert.equal(insertedDraft.content.__editor.visibility.enabled, true);

    const hidden = await setSectionVisibility(fx.env, "shop", inserted.section_key, {
      enabled: false,
    });
    assert.equal(hidden.enabled, false);
    assert.equal(
      fx.readDraft(inserted.section_key).content.__editor.visibility.enabled,
      false
    );

    const duplicated = await duplicateSection(
      fx.env,
      "shop",
      inserted.section_key,
      {}
    );
    assert.equal(duplicated.ok, true);
    assert.notEqual(duplicated.section_key, inserted.section_key);

    const moved = await moveSection(
      fx.env,
      "shop",
      duplicated.section_key,
      { toIndex: 0 }
    );
    assert.equal(moved.to_index, 0);
    rows = fx.db
      .prepare("SELECT section_key, sort_order, status FROM page_sections WHERE status != 'removed' ORDER BY sort_order, id")
      .all();
    assert.equal(rows[0].section_key, duplicated.section_key);

    const removed = await removeSection(
      fx.env,
      "shop",
      inserted.section_key
    );
    assert.equal(removed.removed, true);
    const tombstone = fx.db
      .prepare("SELECT status FROM page_sections WHERE section_key = ?")
      .get(inserted.section_key);
    assert.equal(tombstone.status, "removed");
  } finally {
    fx.db.close();
  }
});

test("block mutations use one section document for insert, duplicate, reorder, and remove", async () => {
  const fx = fixture();
  try {
    const before = fx.readDraft("collections").content.__editor.blocks;
    assert.deepEqual(before.map((block) => block.id), ["card1", "card2", "card3"]);

    const inserted = await insertBlock(fx.env, "shop", "collections", {
      templateKey: "collection-card",
      toIndex: 1,
    });
    assert.equal(inserted.ok, true);

    let content = fx.readDraft("collections").content;
    assert.equal(content.__editor.blocks.length, 4);
    assert.equal(content.__editor.blocks[1].id, inserted.block_id);
    assert.equal(content[inserted.block_id].name, "New collection");

    const duplicated = await duplicateBlock(
      fx.env,
      "shop",
      "collections",
      inserted.block_id
    );
    assert.equal(duplicated.ok, true);

    content = fx.readDraft("collections").content;
    assert.equal(content.__editor.blocks.length, 5);
    assert.equal(
      content[duplicated.block_id].name,
      content[inserted.block_id].name
    );

    const moved = await moveBlock(
      fx.env,
      "shop",
      "collections",
      duplicated.block_id,
      { toIndex: 0 }
    );
    assert.equal(moved.to_index, 0);
    content = fx.readDraft("collections").content;
    assert.equal(content.__editor.blocks[0].id, duplicated.block_id);

    const removed = await removeBlock(
      fx.env,
      "shop",
      "collections",
      duplicated.block_id
    );
    assert.equal(removed.removed, true);
    content = fx.readDraft("collections").content;
    assert.equal(
      content.__editor.blocks.some((block) => block.id === duplicated.block_id),
      false
    );
    assert.equal(content[duplicated.block_id], undefined);
  } finally {
    fx.db.close();
  }
});
