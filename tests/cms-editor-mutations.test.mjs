import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import {
  duplicateBlock,
  getPageAdmin,
  getPublishedPage,
  publishPage,
  duplicateSection,
  insertBlock,
  insertSection,
  moveBlock,
  moveSection,
  removeBlock,
  removeSection,
  setSectionVisibility,
  updateSection,
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
  const publishedCache = new Map();
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
      async delete(key) { publishedCache.delete(key); },
      async get(key) { return publishedCache.get(key) || null; },
      async put(key, body) { publishedCache.set(key, JSON.parse(body)); },
    },
  };

  return {
    db,
    env,
    objects,
    readDraft(sectionKey) {
      const row = db
        .prepare(
          `SELECT content_r2_key FROM page_sections WHERE page_id = 1 AND section_key = ?`
        )
        .get(sectionKey);
      const key = row?.content_r2_key || `cms/pages/shop/draft/${sectionKey}.json`;
      const raw = objects.get(key);
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

test("explicit draft save uses immutable R2 revision pointers and rejects stale versions", async () => {
  const fx = fixture();
  try {
    const current = structuredClone(fx.readDraft("hero").content);
    current.headline = "Fresh edit";

    const saved = await updateSection(fx.env, "shop", "hero", {
      content: current,
      expected_version: 1,
    });
    assert.equal(saved.ok, true);
    assert.equal(saved.version, 2);

    const row = fx.db
      .prepare(
        "SELECT content_version, content_r2_key FROM page_sections WHERE page_id = 1 AND section_key = 'hero'"
      )
      .get();
    assert.equal(row.content_version, 2);
    assert.match(
      row.content_r2_key,
      /^cms\/pages\/shop\/history\/hero\.v2\.[a-f0-9]{16}\.json$/
    );
    assert.equal(fx.readDraft("hero").content.headline, "Fresh edit");

    const stale = await updateSection(fx.env, "shop", "hero", {
      content: { ...current, headline: "Stale overwrite" },
      expected_version: 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.code, "cms_version_conflict");
    assert.equal(stale.current_version, 2);

    const after = fx.db
      .prepare(
        "SELECT content_version, content_r2_key FROM page_sections WHERE page_id = 1 AND section_key = 'hero'"
      )
      .get();
    assert.equal(after.content_version, 2);
    assert.equal(after.content_r2_key, row.content_r2_key);
    assert.equal(fx.readDraft("hero").content.headline, "Fresh edit");
  } finally {
    fx.db.close();
  }
});

test("merchant can add Revise/FNF sections, edit, reload draft, and publish one real document", async () => {
  const fx = fixture();
  try {
    // The current live storefront must remain untouched while the merchant
    // edits a genuine portable section using the existing D1/R2 authorities.
    await publishPage(fx.env, "shop"); // Seed the realistic live snapshot/KV state.
    const original = await getPublishedPage(fx.env, "shop");
    assert.ok(original?.sections?.length >= 3);
    const added = await insertSection(fx.env, "shop", {
      templateKey: "portable",
      themePreset: "revise/faq",
      toIndex: 1,
    });
    assert.equal(added.ok, true, JSON.stringify(added));

    const beforePublish = await getPublishedPage(fx.env, "shop");
    assert.ok(beforePublish?.sections?.length >= 3, "Public KV snapshot remains readable during a draft.");
    assert.equal(beforePublish.sections.some(section => section.key === added.section_key), false,
      "Draft sections must not automatically become publicly visible.");

    const freshDraft = await getPageAdmin(fx.env, "shop");
    const current = freshDraft.page.sections.find(section => section.key === added.section_key);
    assert.ok(current);
    assert.equal(current.content.__editor.themePreset, "revise/faq");
    const edited = structuredClone(current.content);
    edited.title = "What customer 123 needs to know";
    edited.card1.question = "When do orders ship?";
    edited.card1.answer = "Orders ship within our published fulfillment estimate.";

    const saved = await updateSection(fx.env, "shop", added.section_key, {
      content: edited,
      expected_version: current.version,
    });
    assert.equal(saved.ok, true, JSON.stringify(saved));

    const reloaded = await getPageAdmin(fx.env, "shop");
    const sameSection = reloaded.page.sections.find(section => section.key === added.section_key);
    assert.equal(sameSection.content.title, edited.title);
    assert.equal(sameSection.content.card1.answer, edited.card1.answer);
    assert.equal(sameSection.content.__editor.themePreset, "revise/faq");

    const rejected = await updateSection(fx.env, "shop", added.section_key, {
      content: { ...sameSection.content, malicious: "<script>alert(1)</script>" },
      expected_version: saved.version,
    });
    assert.equal(rejected.status, 400, "Unknown/unsafe section fields must be rejected by the API.");

    const duplicated = await duplicateSection(fx.env, "shop", added.section_key);
    assert.equal(duplicated.ok, true, JSON.stringify(duplicated));
    const duplicatedContent = fx.readDraft(duplicated.section_key).content;
    assert.equal(duplicatedContent.title, edited.title);
    assert.equal(duplicatedContent.__editor.themePreset, "revise/faq");

    const published = await publishPage(fx.env, "shop");
    assert.equal(published.ok, true);
    const storefront = await getPublishedPage(fx.env, "shop");
    const live = storefront.sections.find(section => section.key === added.section_key);
    assert.equal(live.content.title, edited.title);
    assert.equal(live.content.card1.answer, edited.card1.answer);
    assert.equal(live.content.__editor.themePreset, "revise/faq");
    assert.equal(
      storefront.sections.find(section => section.key === duplicated.section_key).content.title,
      edited.title
    );
  } finally {
    fx.db.close();
  }
});
