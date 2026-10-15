import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  listStoreThemes, getStoreTheme, selectThemePreview, publishStoreTheme, setThemePublishReady,
} from '../apps/ecommerce-cms-agentsam/backend/cms/theme-authority.mjs';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE cms_pages (id TEXT,account_id TEXT);
    CREATE TABLE cms_artifacts (
      id TEXT PRIMARY KEY,account_id TEXT,artifact_key TEXT,version TEXT,status TEXT,
      artifact_type TEXT,manifest_r2_key TEXT,metadata_json TEXT,source_ref TEXT,
      source_kind TEXT,created_at TEXT
    );
    CREATE TABLE cms_globals (
      id TEXT PRIMARY KEY,account_id TEXT,global_key TEXT,global_type TEXT,status TEXT,
      inline_content_json TEXT,content_version INTEGER DEFAULT 0,updated_at TEXT,
      UNIQUE(account_id,global_key)
    );
    CREATE TABLE cms_revisions (
      account_id TEXT,entity_type TEXT,entity_id TEXT,revision_number INTEGER,
      revision_kind TEXT,snapshot_json TEXT,metadata_json TEXT,
      UNIQUE(entity_type,entity_id,revision_number,revision_kind)
    );
    INSERT INTO cms_pages VALUES ('p1','merchant-a'),('p2','merchant-b');
    INSERT INTO cms_artifacts VALUES
      ('art-a','merchant-a','theme/revise','0.2.0','ready','theme','cms/artifacts/revise/manifest.json','{}','@inneranimalmedia/revise-theme@0.2.0','package','2026-10-15'),
      ('art-b','merchant-b','theme/customer','1','ready','theme','cms/artifacts/customer/manifest.json','{}','merchant-theme','package','2026-10-15');
  `);
  const env = { DB: {
    prepare(sql) { return { bind(...params) { return {
      async first() { return db.prepare(sql).get(...params) || null; },
      async all() { return { results: db.prepare(sql).all(...params) }; },
      async run() { const meta = db.prepare(sql).run(...params); return { meta: { changes: meta.changes } }; },
    }; } }; },
  }};
  return { db, env };
}
test('canonical artifact inventory is tenant-scoped; no store_themes or store_theme_pages', async () => {
  const { db, env } = fixture();
  try {
    const a = await listStoreThemes(env,'merchant-a');
    assert.equal(a.ok,true);
    assert.equal(a.source,'cms_artifacts+cms_globals');
    assert.deepEqual(a.themes.map(t=>t.slug),['heuristic','revise']);
    assert.equal(a.active_theme.slug,'heuristic');
    assert.equal(a.preview_theme.slug,'heuristic');
    assert.equal(await getStoreTheme(env,'customer','merchant-a'),null);
    assert.equal((await listStoreThemes(env,'merchant-b')).themes[1].slug,'customer');
    assert.equal((await listStoreThemes(env)).ok,false, 'multi-tenant implicit account must fail closed');
  } finally { db.close(); }
});
test('preview persists in cms_globals, creates revisions, rejects stale version and disallows unverified publication', async () => {
  const { db, env } = fixture();
  try {
    assert.equal((await selectThemePreview(env,'missing','merchant-a')).status,404);
    const selected = await selectThemePreview(env,'revise','merchant-a',0);
    assert.equal(selected.ok,true);
    assert.equal(selected.content_version,1);
    const reload = await listStoreThemes(env,'merchant-a');
    assert.equal(reload.preview_theme.slug,'revise');
    assert.equal(reload.active_theme.slug,'heuristic');
    assert.equal((await selectThemePreview(env,'heuristic','merchant-a',0)).code,'theme_version_conflict');
    const review = await setThemePublishReady(env,'revise',true,null,'merchant-a');
    assert.equal(review.ok,true);
    assert.equal((await publishStoreTheme(env,'revise',null,'merchant-a')).code,'theme_runtime_not_verified');
    assert.equal((await listStoreThemes(env,'merchant-a')).active_theme.slug,'heuristic');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM cms_revisions').get().n,2);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM cms_globals').get().n,1);
    assert.equal((await listStoreThemes(env,'merchant-b')).preview_theme.slug,'heuristic');
  } finally { db.close(); }
});
