import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { reviseAtlas } from "../packages/theme-contract/runtime/revise-atlas-source.js";
import { DatabaseSync } from "node:sqlite";

import {
  duplicateBlock,
  getPageAdmin,
  getPreviewPage,
  restoreSectionRevision,
  getPublishedPage,
  importLivePageDraft,
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
    -- Legacy fixtures carry empty canonical mirrors, matching the migrated
    -- production schema while legacy CMS paths remain compatible.
    CREATE TABLE cms_pages (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,legacy_page_id INTEGER UNIQUE,
      slug TEXT,status TEXT DEFAULT 'draft',updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE cms_page_sections (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      account_id TEXT NOT NULL,page_id TEXT,legacy_section_id INTEGER UNIQUE,section_key TEXT,
      section_type TEXT,sort_order INTEGER DEFAULT 0,status TEXT DEFAULT 'draft',
      inline_content_json TEXT DEFAULT '{}',content_r2_key TEXT,
      content_version INTEGER DEFAULT 0,content_hash TEXT,metadata_json TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now')),UNIQUE(page_id,section_key));
    CREATE TABLE cms_section_blocks (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,section_id TEXT NOT NULL,
      parent_block_id TEXT,block_key TEXT NOT NULL,block_type TEXT NOT NULL,sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',content_json TEXT DEFAULT '{}',metadata_json TEXT DEFAULT '{}',
      artifact_id TEXT,source_path TEXT,updated_at TEXT DEFAULT (datetime('now')),UNIQUE(section_id,block_key));
    CREATE TABLE cms_revisions (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      account_id TEXT,entity_type TEXT,entity_id TEXT,revision_number INTEGER,revision_kind TEXT,
      content_r2_key TEXT,content_hash TEXT,snapshot_json TEXT,metadata_json TEXT);
    CREATE TRIGGER seed_test_canonical_page AFTER INSERT ON pages
      BEGIN INSERT INTO cms_pages (id,account_id,legacy_page_id,slug)
      VALUES ('cmsp_legacy_' || NEW.id,'test-tenant',NEW.id,NEW.slug);
      END;
    INSERT INTO pages (id, slug, title, status) VALUES (1, 'shop', 'Shop', 'published');
    INSERT INTO page_sections
      (page_id, section_key, sort_order, content_json, content_r2_key, content_version, status)
    VALUES
      (1, 'hero', 0, '{}', 'cms/pages/shop/draft/hero.json', 1, 'published'),
      (1, 'collections', 10, '{}', 'cms/pages/shop/draft/collections.json', 1, 'published'),
      (1, 'stories', 20, '{}', 'cms/pages/shop/draft/stories.json', 1, 'published');
  `);

  const adapter = {
    async batch(statements) {
      db.exec('BEGIN');
      try { for (const statement of statements) await statement.run(); db.exec('COMMIT'); }
      catch(error) { db.exec('ROLLBACK'); throw error; }
    },
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
    await fx.env.CMS_CACHE.delete("cms:page:shop:v1");
    const recoveredPublication = await getPublishedPage(fx.env, "shop");
    assert.equal(recoveredPublication.source, "r2-manifest", "R2 must recover public composition after KV eviction");
    assert.deepEqual(recoveredPublication.sections.map((section) => section.key),
      original.sections.map((section) => section.key), "Private draft ordering must not leak after cache eviction");
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

test("a real storefront imports into a private draft without publishing synthetic registry sections", async () => {
  const fx = fixture();
  try {
    fx.db.exec("DELETE FROM page_sections; DELETE FROM pages;");
    const before = await getPageAdmin(fx.env, "shop");
    assert.equal(before.seeded, false);
    assert.equal(before.page.content_authority, "storefront-html");

    const invalid = await importLivePageDraft(fx.env, "shop", {
      sections: [{ key: "fictional", content: { headline: "Not on the site" } }]
    });
    assert.equal(invalid.status, 400);
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM pages").get().n, 0);

    const liveHero = structuredClone(PAGE_REGISTRY.shop.sections.hero.defaultContent);
    liveHero.eyebrow = "The earned hours collection";
    liveHero.headline = "Time is the\nreal horsepower.";
    liveHero.subheadline = "Hard-wearing essentials for garage nights";
    const imported = await importLivePageDraft(fx.env, "shop", {
      sections: [{ key: "hero", content: liveHero }]
    });
    assert.equal(imported.ok, true);
    assert.equal(imported.published, false);
    assert.equal(imported.imported_sections, 1);
    assert.equal(fx.db.prepare("SELECT status FROM pages WHERE slug='shop'").get().status, "draft");
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM page_sections").get().n, 1);

    const draft = await getPageAdmin(fx.env, "shop");
    assert.equal(draft.seeded, true);
    assert.equal(draft.page.sections.length, 1, "missing HTML sections are never fabricated");
    assert.equal(draft.page.sections[0].content.headline, liveHero.headline);
    assert.equal(draft.page.sections[0].content.__editor.source, "live-storefront");
    assert.equal(await getPublishedPage(fx.env, "shop"), null);
    const again = await importLivePageDraft(fx.env, "shop", {
      sections: [{ key: "hero", content: liveHero }]
    });
    assert.equal(again.status, 409, "repeat import must not overwrite customer drafts");

    const published = await publishPage(fx.env, "shop");
    assert.equal(published.ok, true);
    const publicPage = await getPublishedPage(fx.env, "shop");
    assert.equal(publicPage.sections.length, 1);
    assert.equal(publicPage.sections[0].content.headline, liveHero.headline);
  } finally { fx.db.close(); }
});

test("reconciling a seeded legacy draft archives old sections and preserves the live site", async () => {
  const fx = fixture();
  try {
    fx.db.exec("UPDATE pages SET status = 'draft' WHERE slug = 'shop'");
    const original = structuredClone(PAGE_REGISTRY.shop.sections.hero.defaultContent);
    original.headline = "Time is the\nreal horsepower.";

    const stale = await importLivePageDraft(fx.env, "shop", {
      mode: "reconcile",
      sections: [{ key: "hero", expected_version: 0, content: original }]
    });
    assert.equal(stale.status, 409, "stale writes are refused");

    const replaced = await importLivePageDraft(fx.env, "shop", {
      mode: "reconcile",
      sections: [{ key: "hero", expected_version: 1, content: original }]
    });
    assert.equal(replaced.ok, true);
    assert.equal(replaced.imported_sections, 1);
    assert.equal(replaced.retired_sections, 2);
    assert.equal(replaced.published, false);
    assert.ok(replaced.archive_key);
    const archive = JSON.parse(fx.objects.get(replaced.archive_key));
    assert.equal(archive.sections.length, 3);
    const rowStates = fx.db.prepare(
      "SELECT section_key, status FROM page_sections ORDER BY sort_order"
    ).all();
    assert.deepEqual(rowStates.map((r) => r.status), ["draft", "removed", "removed"]);
    const admin = await getPageAdmin(fx.env, "shop");
    assert.equal(admin.page.content_authority, "cms-draft-linked");
    assert.deepEqual(admin.page.sections.map((r) => r.key), ["hero"]);
    assert.equal(admin.page.sections[0].content.headline, original.headline);
    assert.equal(await getPublishedPage(fx.env, "shop"), null);
  } finally { fx.db.close(); }
});

test("a cached public CMS publication cannot be replaced by an HTML-source reconciliation", async () => {
  const fx = fixture();
  try {
    fx.db.exec("UPDATE pages SET status='draft' WHERE slug='shop'");
    await fx.env.CMS_CACHE.put("cms:page:shop:v1", JSON.stringify({
      slug: "shop", status: "published",
      sections: [{ key: "hero", status: "published", content: { headline: "Customer content" } }]
    }));
    const result = await importLivePageDraft(fx.env, "shop", {
      mode: "reconcile", sections: [{
        key: "hero", expected_version: 1, content: { headline: "Static source" }
      }]
    });
    assert.equal(result.status, 409);
    const admin = await getPageAdmin(fx.env, "shop");
    assert.notEqual(admin.page.sections[0].content.headline, "Static source");
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM page_sections").get().n, 3);
  } finally { fx.db.close(); }
});

test("customer imports actual 4319 before/after content through one real CMS draft mutation", async () => {
  const fx = fixture();
  try {
    const donor = JSON.parse(fs.readFileSync(new URL(
      "../apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json", import.meta.url), "utf8"));
    const section = donor.pages.find((p) => p.id === "campaigns").sections
      .find((s) => s.preset === "revise/before-after");
    const content = reviseAtlas.fromSiteSection(section, donor.media);
    assert.deepEqual(reviseAtlas.validate(content.__editor.themePreset, content), { ok:true });
    const imported = await insertSection(fx.env, "shop", {
      templateKey: "portable",
      themePreset: content.__editor.themePreset,
      content,
    });
    assert.equal(imported.ok, true);
    assert.equal(imported.template_key, "portable");
    const stored = fx.readDraft(imported.section_key);
    assert.equal(stored.content.heading, content.heading);
    assert.equal(stored.content.__editor.sourcePreset, "revise/before-after");
    const admin = await getPageAdmin(fx.env, "shop");
    assert.equal(admin.page.status, "draft");
    assert.ok(admin.page.sections.some((s) => s.key === imported.section_key));
    assert.equal(await getPublishedPage(fx.env, "shop"), null,
      "Adding a section must not automatically publish the site");

    const invalid = structuredClone(content);
    invalid.beforeKey = "javascript:alert(1)";
    const rejected = await insertSection(fx.env, "shop", {
      templateKey: "portable", themePreset: invalid.__editor.themePreset,
      content: invalid,
    });
    assert.equal(rejected.status, 400, "Untrusted sourced media is rejected");
    const rows = fx.db.prepare(
      "SELECT COUNT(*) AS n FROM page_sections WHERE page_id = 1"
    ).get().n;
    assert.equal(rows, 4, "Failed imports do not create partial sections");
  } finally { fx.db.close(); }
});

test("a seeded private draft remains editable when a separate live HTML route exists", async () => {
  const { resolvePageAuthority } = await import("../apps/ecommerce-cms-agentsam/backend/cms/page-authority.js");
  const routes = [{ page: "shop", path: "/shop", handler: "cms-page" }];
  assert.equal(resolvePageAuthority("shop", routes, { seeded: true, cmsPublished: false }).content_authority, "cms-draft-only");
  assert.equal(resolvePageAuthority("shop", routes, { seeded: false, cmsPublished: false }).content_authority, "storefront-html");
  assert.equal(resolvePageAuthority("shop", routes, { seeded: true, cmsPublished: true }).content_authority, "cms-published");
});

test("Shop editorial and product grids share native edit, duplicate, move, hide, reload and publish operations", async () => {
  const fx = fixture();
  try {
    await publishPage(fx.env, "shop");
    const before = await getPublishedPage(fx.env, "shop");
    assert.ok(before.sections.length >= 3);

    const editorial = await insertSection(fx.env, "shop", { templateKey: "editorial-grid", toIndex: 2 });
    const products = await insertSection(fx.env, "shop", { templateKey: "products-grid", toIndex: 3 });
    assert.equal(editorial.section_key, "editorial-grid");
    assert.equal(products.section_key, "products-grid");

    const draft = await getPageAdmin(fx.env, "shop");
    const editorialRow = draft.page.sections.find((s) => s.key === "editorial-grid");
    const productRow = draft.page.sections.find((s) => s.key === "products-grid");
    assert.equal(editorialRow.content.tile1.headline, "Run it past redline");
    assert.equal(productRow.content.title, "Shop all gear");

    const editedEditorial = structuredClone(editorialRow.content);
    editedEditorial.tile1.headline = "Ride into the weekend";
    assert.equal((await updateSection(fx.env, "shop", editorial.section_key, {
      content: editedEditorial, expected_version: editorialRow.version
    })).ok, true);

    const editedProducts = structuredClone(productRow.content);
    editedProducts.title = "Available gear";
    assert.equal((await updateSection(fx.env, "shop", products.section_key, {
      content: editedProducts, expected_version: productRow.version
    })).ok, true);
    assert.equal("products" in editedProducts, false, "Catalog data must remain outside CMS");

    const duplicate = await duplicateSection(fx.env, "shop", editorial.section_key);
    assert.equal(duplicate.ok, true);
    assert.equal((await setSectionVisibility(fx.env, "shop", duplicate.section_key, { enabled: false })).ok, true);
    assert.equal((await moveSection(fx.env, "shop", products.section_key, { toIndex: 0 })).ok, true);

    const restored = await getPageAdmin(fx.env, "shop");
    assert.equal(restored.page.sections.find((s) => s.key === products.section_key).content.title, "Available gear");
    assert.equal(restored.page.sections.find((s) => s.key === editorial.section_key).content.tile1.headline, "Ride into the weekend");
    assert.equal(restored.page.sections.find((s) => s.key === duplicate.section_key).content.__editor.visibility.enabled, false);

    const publicBefore = await getPublishedPage(fx.env, "shop");
    assert.equal(publicBefore.sections.some((s) => s.key === "products-grid"), false,
      "Private grid edits must not leak to public composition");
    assert.equal((await publishPage(fx.env, "shop")).ok, true);
    const publicAfter = await getPublishedPage(fx.env, "shop");
    assert.equal(publicAfter.sections.find((s) => s.key === "products-grid").content.title, "Available gear");
    assert.equal(publicAfter.sections.find((s) => s.key === "editorial-grid").content.tile1.headline, "Ride into the weekend");
    assert.equal(publicAfter.sections.find((s) => s.key === duplicate.section_key).content.__editor.visibility.enabled, false);

    assert.equal((await removeSection(fx.env, "shop", duplicate.section_key)).ok, true);
    const stillPublic = await getPublishedPage(fx.env, "shop");
    assert.ok(stillPublic.sections.some((s) => s.key === duplicate.section_key),
      "Removing a private instance cannot remove the last published copy");
  } finally {
    fx.db.close();
  }
});


test("global theme color and Custom CSS changes persist to existing D1/R2 CMS site brand revision",async()=>{
 const fx=fixture();
 try {
   fx.db.exec("INSERT INTO pages(id,slug,title,status) VALUES(2,'site','Global','published')");
   fx.db.exec("INSERT INTO page_sections(page_id,section_key,sort_order,content_json,content_r2_key,content_version,status) VALUES(2,'brand',1,'{}','cms/pages/site/draft/brand.json',1,'published')");
   const content={logoUrl:"/original-logo.svg",tagline:"Existing brand",
     __editor:{themeSettings:{colors:{accent:"#ff3366",canvas:"#101010"},font:"Inter",buttonRadius:18,
       customCss:".shop-hero h1 {letter-spacing: 1px;}"}}
   };
   const rejected=await updateSection(fx.env,"site","brand",{
     content:{...content,__editor:{themeSettings:{customCss:"@import url(https://bad.example/track.css)"}}},
     expected_version:1,
   });
   assert.equal(rejected.status,422);
   assert.equal(fx.db.prepare("SELECT content_version FROM page_sections WHERE page_id=2 AND section_key='brand'").get().content_version,1);
   const saved=await updateSection(fx.env,"site","brand",{content,expected_version:1});
   assert.equal(saved.ok,true);
   const row=fx.db.prepare("SELECT content_version,content_r2_key,status FROM page_sections WHERE page_id=2 AND section_key='brand'").get();
   assert.equal(row.content_version,2);
   assert.ok(row.content_r2_key.startsWith("cms/pages/site/history/brand.v2."));
   const draft=JSON.parse(fx.objects.get(row.content_r2_key));
   assert.equal(draft.content.logoUrl,"/original-logo.svg","preserve the original site brand data");
   assert.equal(draft.content.__editor.themeSettings.colors.accent,"#ff3366");
   assert.match(draft.content.__editor.themeSettings.customCss,/letter-spacing/);
 }finally{fx.db.close();}
});


test("section-specific CSS is validated and versioned in the existing CMS section document",async()=>{
 const fx=fixture();
 try {
   const original=structuredClone(fx.readDraft('hero').content);
   const forbidden={...original,__editor:{...(original.__editor||{}),customCss:'.h-display { background-image: url(https://tracker.test/a); }'}};
   const denied=await updateSection(fx.env,'shop','hero',{content:forbidden,expected_version:1});
   assert.equal(denied.status,422,"unsafe CSS is not persisted");
   const next={...original,__editor:{...(original.__editor||{}),customCss:'.h-display { color: #123456; }'}};
   const result=await updateSection(fx.env,'shop','hero',{content:next,expected_version:1});
   assert.equal(result.ok,true);
   const after=fx.readDraft('hero');
   assert.equal(after.content.__editor.customCss,'.h-display { color: #123456; }');
   assert.equal(after.content.headline,original.headline,"original authored content survives CSS editing");
 } finally {fx.db.close();}
});

test("production-shaped Shop migration adopts three cards, inserts fourth, previews, edits, reorders and restores",async()=>{
  const fx=fixture();
  try{
    const canonicalSection='cmss_legacy_14';
    fx.db.prepare(`INSERT INTO cms_page_sections
      (id,account_id,page_id,legacy_section_id,section_key,section_type,
       sort_order,status,inline_content_json,content_r2_key,content_version)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(canonicalSection,'test-tenant','cmsp_legacy_1',2,'collections','collections',10,'draft',
        JSON.stringify(fx.readDraft('collections').content),
        'cms/pages/shop/draft/collections.json',1);
    const legacyMeta=JSON.stringify({legacy_source:'r2-section-content',
      legacy_r2_key:'cms/pages/shop/draft/collections.json',family:'card'});
    const insert=fx.db.prepare(`INSERT INTO cms_section_blocks
      (id,account_id,section_id,block_key,block_type,sort_order,status,content_json,metadata_json)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    for(let i=1;i<=3;i++)insert.run('cmsb_legacy_14_card'+i,'test-tenant',canonicalSection,
      'card'+i,'collection-card',i*10,'active',
      JSON.stringify({name:'Outdated card '+i}),legacyMeta);

    const added=await insertBlock(fx.env,'shop','collections',
      {templateKey:'collection-card',toIndex:3});
    assert.equal(added.ok,true);
    assert.equal(added.canonical.status,'linked');
    assert.equal(added.canonical.blocks.inserted,1);
    assert.equal(added.canonical.blocks.updated,3);
    const rows=()=>fx.db.prepare(`SELECT * FROM cms_section_blocks
      WHERE section_id=? AND status!='archived' ORDER BY sort_order,id`).all(canonicalSection);
    assert.equal(rows().length,4);
    assert.equal(rows().find(r=>r.block_key===added.block_id).block_type,'collection-card');
    assert.equal(JSON.parse(rows()[0].metadata_json).source,'theme-studio-v1');
    assert.equal(rows()[0].id,'cmsb_legacy_14_card1');

    const initialPreview=await getPreviewPage(fx.env,'shop');
    const collection=initialPreview.sections.find(s=>s.key==='collections');
    assert.equal(collection.content.__editor.blocks.length,4);
    assert.ok(collection.content.__editor.blocks.some(b=>b.id===added.block_id));

    const renamed=structuredClone(collection.content);
    renamed[added.block_id].name='Actually edited';
    const edited=await updateSection(fx.env,'shop','collections',{content:renamed,expected_version:2});
    assert.equal(edited.ok,true);
    assert.equal(JSON.parse(rows().find(r=>r.block_key===added.block_id).content_json).name,'Actually edited');

    const moved=await moveBlock(fx.env,'shop','collections',added.block_id,{toIndex:0});
    assert.equal(moved.ok,true);
    assert.equal(rows()[0].block_key,added.block_id);
    assert.equal((await getPageAdmin(fx.env,'shop')).page.sections.find(s=>s.key==='collections')
      .content.__editor.blocks[0].id,added.block_id);

    const restored=await restoreSectionRevision(fx.env,'shop','collections',
      'test-tenant',{revision_number:2,expected_version:4});
    assert.equal(restored.ok,true);
    assert.equal(restored.restored_revision,2);
    assert.equal(rows()[3].block_key,added.block_id);
    assert.equal(JSON.parse(rows()[3].content_json).name,'New collection');
    assert.equal((await getPreviewPage(fx.env,'shop')).sections.find(s=>s.key==='collections')
      .content.__editor.blocks[3].id,added.block_id);
    assert.ok(fx.db.prepare(`SELECT COUNT(*) AS n FROM cms_revisions
      WHERE entity_type='block' AND entity_id=?`).get(rows()[3].id).n>=3);
    assert.ok(fx.db.prepare(`SELECT COUNT(*) AS n FROM cms_revisions
      WHERE entity_type='section' AND entity_id=?`).get(canonicalSection).n>=4);
  }finally{fx.db.close();}
});

test("native nested Revise block edits, reorder, reload and revision restoration use same canonical rows",async()=>{
  const fx=fixture();
  try{
    fx.db.prepare(`INSERT INTO pages (slug,title,status) VALUES ('ideas','Ideas','draft')`).run();
    const legacyPage=fx.db.prepare(`SELECT id FROM pages WHERE slug='ideas'`).get().id;
    fx.db.prepare(`INSERT INTO page_sections
      (page_id,section_key,sort_order,content_json,content_r2_key,content_version,status)
      VALUES (?,?,0,'{}',?,1,'draft')`).run(legacyPage,'ideas-faq','cms/pages/ideas/draft/ideas-faq.json');
    const sectionId=fx.db.prepare(`SELECT id FROM page_sections WHERE page_id=?`).get(legacyPage).id;
    const canonicalId='cmss_revise_ideas_faq_test';
    fx.db.prepare(`INSERT INTO cms_page_sections
      (id,account_id,page_id,legacy_section_id,section_key,section_type,status,content_version)
      VALUES (?,?,?,?,?,'faq','draft',1)`).run(canonicalId,'test-tenant',
        'cmsp_legacy_'+legacyPage,sectionId,'ideas-faq');
    const content=(order,answer)=>({
      __editor:{templateKey:'faq',blocks:[
        {id:'faq-root',templateKey:'group',enabled:true},
        ...order.map(id=>({id,templateKey:'text',enabled:true,parentBlockId:'faq-root'}))
      ]},
      'faq-root':{title:'Ideas FAQ'},'faq-q':{text:'What is real?'},'faq-a':{text:answer}
    });
    fx.objects.set('cms/pages/ideas/draft/ideas-faq.json',JSON.stringify({
      section_key:'ideas-faq',content:content(['faq-q','faq-a'],'Original'),
      status:'draft',version:1
    }));
    const v2=await updateSection(fx.env,'ideas','ideas-faq',{
      content:content(['faq-q','faq-a'],'Original'),expected_version:1});
    assert.equal(v2.ok,true);
    const rows=()=>fx.db.prepare(`SELECT * FROM cms_section_blocks
      WHERE section_id=? ORDER BY sort_order,id`).all(canonicalId);
    const parent=rows().find(r=>r.block_key==='faq-root');
    const originalAnswer=rows().find(r=>r.block_key==='faq-a');
    assert.equal(originalAnswer.parent_block_id,parent.id);
    const v3=await updateSection(fx.env,'ideas','ideas-faq',{
      content:content(['faq-a','faq-q'],'Changed'),expected_version:2});
    assert.equal(v3.ok,true);
    assert.equal(rows().find(r=>r.block_key==='faq-a').id,originalAnswer.id);
    assert.equal(rows().find(r=>r.block_key==='faq-a').sort_order,0);
    assert.equal(JSON.parse(rows().find(r=>r.block_key==='faq-a').content_json).text,'Changed');
    const preview=await getPreviewPage(fx.env,'ideas');
    assert.equal(preview.sections.find(s=>s.key==='ideas-faq').content.__editor.blocks[1].id,'faq-a');
    const restore=await restoreSectionRevision(fx.env,'ideas','ideas-faq','test-tenant',
      {revision_number:2,expected_version:3});
    assert.equal(restore.ok,true);
    assert.equal(JSON.parse(rows().find(r=>r.block_key==='faq-a').content_json).text,'Original');
    assert.equal(rows().find(r=>r.block_key==='faq-a').sort_order,10);
    assert.equal(rows().find(r=>r.block_key==='faq-a').parent_block_id,parent.id);
    assert.equal((await getPreviewPage(fx.env,'ideas')).sections.find(s=>s.key==='ideas-faq').content.__editor.blocks[2].id,'faq-a');
    const foreign=await restoreSectionRevision(fx.env,'ideas','ideas-faq','other-tenant',
      {revision_number:2});
    assert.equal(foreign.status,404);
  }finally{fx.db.close();}
});
