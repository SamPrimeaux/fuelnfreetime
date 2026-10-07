import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { acceptGeneratedSection, getPageAdmin, publishPage, getPublishedPage, updateSection, listGeneratedRevisions, restoreGeneratedRevision } from "../apps/ecommerce-cms-agentsam/backend/cms/api.js";
import { attachCmsDefinitions, listCmsDefinitions } from "../apps/ecommerce-cms-agentsam/backend/cms/definition-registry.mjs";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE pages (id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT UNIQUE,title TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE page_sections (id INTEGER PRIMARY KEY AUTOINCREMENT,page_id INTEGER REFERENCES pages(id),section_key TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,
      content_json TEXT NOT NULL DEFAULT '{}',content_r2_key TEXT,content_version INTEGER NOT NULL DEFAULT 0,content_hash TEXT,status TEXT DEFAULT 'draft',
      updated_at TEXT DEFAULT (datetime('now')),UNIQUE(page_id,section_key));
    CREATE TABLE cms_pages (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,slug TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',updated_at TEXT DEFAULT (datetime('now')),UNIQUE(account_id,slug));
    CREATE TABLE cms_artifacts (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,artifact_key TEXT NOT NULL,artifact_type TEXT NOT NULL,version TEXT NOT NULL,
      r2_prefix TEXT NOT NULL,manifest_r2_key TEXT NOT NULL,content_hash TEXT NOT NULL,content_mode TEXT NOT NULL,status TEXT NOT NULL,source_kind TEXT,source_ref TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',UNIQUE(account_id,artifact_key,version));
    CREATE TABLE cms_definitions (id TEXT PRIMARY KEY DEFAULT ('cmsd_'||lower(hex(randomblob(8)))),account_id TEXT NOT NULL,definition_key TEXT NOT NULL,
      kind TEXT NOT NULL,label TEXT NOT NULL,description TEXT,category TEXT,origin TEXT NOT NULL,version TEXT NOT NULL,artifact_id TEXT REFERENCES cms_artifacts(id),
      settings_schema_json TEXT NOT NULL,allowed_blocks_json TEXT NOT NULL,max_blocks INTEGER,metadata_json TEXT NOT NULL,status TEXT NOT NULL,
      UNIQUE(account_id,kind,definition_key,version));
    CREATE TABLE cms_page_sections (id TEXT PRIMARY KEY DEFAULT ('cmss_'||lower(hex(randomblob(8)))),account_id TEXT NOT NULL,page_id TEXT NOT NULL REFERENCES cms_pages(id),
      legacy_section_id INTEGER UNIQUE,section_key TEXT NOT NULL,section_type TEXT NOT NULL,sort_order INTEGER NOT NULL,status TEXT NOT NULL,
      inline_content_json TEXT DEFAULT '{}',content_r2_key TEXT,content_version INTEGER,content_hash TEXT,metadata_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),UNIQUE(page_id,section_key));
    CREATE TABLE cms_revisions (id TEXT PRIMARY KEY DEFAULT ('cmsr_'||lower(hex(randomblob(8)))),account_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL,revision_kind TEXT NOT NULL,content_r2_key TEXT,content_hash TEXT,snapshot_json TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at TEXT DEFAULT (datetime('now')));
    INSERT INTO pages (id,slug,title,status) VALUES (1,'shop','Shop','draft');
    INSERT INTO cms_pages (id,account_id,slug) VALUES ('cmsp_shop','acct_alpha','shop');
  `);
  const objects = new Map();
  const cache = new Map();
  const adapter = {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {bind(...args) {
        return {
          run: async () => { const result = stmt.run(...args); return {meta:{changes:Number(result.changes)}}; },
          first: async () => stmt.get(...args) || null,
          all: async () => ({results:stmt.all(...args)}),
        };
      }};
    },
    async batch(items) { for (const item of items) await item.run(); },
  };
  const env = { DB:adapter,WEBSITE_ASSETS:{
    async put(key,content) {objects.set(key,String(content));},
    async get(key) {const value=objects.get(key);return value===undefined?null:{text:async()=>value};},
  },CMS_CACHE:{
    async get(key) {return cache.get(key)||null;},
    async put(key,body) {cache.set(key,JSON.parse(body));},
    async delete(key) {cache.delete(key);},
  }};
  return {db,env,objects,cache};
}
const record = (label = "Featured story") => ({
  definition:{kind:"section",type:"featured-story",label,settings:{headline:{label:"Headline"}}},
  settings:{headline:label,eyebrow:"Made for the hours you've earned"},
  canonical:{
    html:'<section data-agentsam-block="__UID__" class="__UID__"><p data-cms="eyebrow">Earned hours</p><h2 data-cms="headline">Featured story</h2></section>',
    css:'[data-agentsam-block="__UID__"] { padding: 24px; } [data-agentsam-block="__UID__"] h2 { color: #fff; }',
    js:"",
  },
});
test("accepting a semantic AgentSam section commits immutable R2, D1 definition, instance and history",async()=>{
  const fx=fixture();
  try {
    const added=await acceptGeneratedSection(fx.env,"shop","acct_alpha",{record:record(),provenance:{provider:"openai",model:"test-model"}});
    assert.equal(added.ok,true,JSON.stringify(added));
    assert.equal(added.published,false);
    assert.match(added.section_key,/^featured-story-[0-9a-f]{8}$/);
    const definition=fx.db.prepare("SELECT * FROM cms_definitions").get();
    assert.equal(definition.definition_key,"featured-story");
    assert.equal(definition.status,"active");
    assert.equal(definition.origin,"generated");
    const artifact=fx.db.prepare("SELECT * FROM cms_artifacts").get();
    assert.equal(artifact.id,added.artifact_id);
    assert.ok(fx.objects.has(artifact.manifest_r2_key));
    const canonical=fx.db.prepare("SELECT * FROM cms_page_sections").get();
    assert.equal(canonical.section_type,"featured-story");
    assert.equal(canonical.status,"draft");
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM cms_revisions").get().n,1);
    assert.equal(fx.db.prepare("SELECT status FROM pages WHERE slug='shop'").get().status,"draft");
    assert.equal(fx.cache.size,0,"Accept does not publish or overwrite cache");
    const admin=await getPageAdmin(fx.env,"shop");
    const found=admin.page.sections.find((s)=>s.key===added.section_key);
    assert.equal(found.content.headline,"Featured story");
    assert.match(found.implementation.html,/data-agentsam-block/);
    const registry=attachCmsDefinitions({pages:{shop:{title:"Shop",sections:{}}}},await listCmsDefinitions(fx.env,"acct_alpha",{status:"active"}));
    assert.equal(registry.pages.shop.sections["featured-story"].fields[0].key,"headline");
    assert.equal(registry.definitions[0].origin,"generated");
    const modified=structuredClone(found.content);
    modified.headline="More free time";
    const saved=await updateSection(fx.env,"shop",added.section_key,{content:modified,expected_version:found.version});
    assert.equal(saved.ok,true,JSON.stringify(saved));
    const fresh=await getPageAdmin(fx.env,"shop");
    assert.equal(fresh.page.sections.find((s)=>s.key===added.section_key).content.headline,"More free time");
    const publish=await publishPage(fx.env,"shop");
    assert.equal(publish.ok,true);
    const publicPage=await getPublishedPage(fx.env,"shop");
    assert.equal(publicPage.sections.find((s)=>s.key===added.section_key).content.headline,"More free time");
    assert.ok(publicPage.sections.find((s)=>s.key===added.section_key).implementation);
    await fx.env.CMS_CACHE.delete("cms:page:shop:v1");
    const recovered=await getPublishedPage(fx.env,"shop");
    assert.ok(recovered.sections.find((s)=>s.key===added.section_key).implementation);
  } finally { fx.db.close(); }
});
test("revising a generated section creates immutable versions without changing its semantic identity",async()=>{
  const fx=fixture();
  try {
    const first=await acceptGeneratedSection(fx.env,"shop","acct_alpha",{record:record()});
    assert.equal(first.ok,true,JSON.stringify(first));
    const revisedRecord=record("Updated story");
    revisedRecord.canonical.css='[data-agentsam-block="__UID__"] { padding: 32px; } [data-agentsam-block="__UID__"] h2 { color: #fff; }';
    const next=await acceptGeneratedSection(fx.env,"shop","acct_alpha",{
      sectionKey:first.section_key,expectedVersion:first.version,record:revisedRecord,
    });
    assert.equal(next.ok,true,JSON.stringify(next));
    assert.equal(next.section_key,first.section_key);
    assert.equal(next.revision_number,2);
    assert.notEqual(next.artifact_id,first.artifact_id,"Code changes should be versioned separately");
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM cms_revisions").get().n,2);
    const stale=await acceptGeneratedSection(fx.env,"shop","acct_alpha",{
      sectionKey:first.section_key,expectedVersion:first.version,record:record("Race lost"),
    });
    assert.equal(stale.status,409);
    const wrong=await acceptGeneratedSection(fx.env,"shop","acct_other",{record:record()});
    assert.equal(wrong.status,409,"Cannot install into another account");
  } finally { fx.db.close(); }
});
test("unsafe generated code and script injection are rejected before D1/R2 writes",async()=>{
  const fx=fixture();
  try {
    for(const mutate of [
      (r)=>{r.canonical.js="(function(){ window.steal=true })()";},
      (r)=>{r.canonical.html='<section data-agentsam-block="__UID__" onclick="evil()">Hello</section>';},
      (r)=>{r.canonical.css='body { display:none; }';},
    ]){
      const draft=record();
      mutate(draft);
      const reply=await acceptGeneratedSection(fx.env,"shop","acct_alpha",{record:draft});
      assert.equal(reply.status,422,JSON.stringify(reply));
    }
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM cms_artifacts").get().n,0);
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM cms_page_sections").get().n,0);
    assert.equal(fx.objects.size,0);
  } finally { fx.db.close(); }
});

test("merchant can restore an earlier generated section revision privately without overwriting publication",async()=>{
  const fx=fixture();
  try {
    const initial=await acceptGeneratedSection(fx.env,"shop","acct_alpha",{record:record("Original headline")});
    assert.equal(initial.ok,true);
    const admin=await getPageAdmin(fx.env,"shop");
    const target=admin.page.sections.find((s)=>s.key===initial.section_key);
    const edited=structuredClone(target.content);
    edited.headline="Draft headline changed";
    const saved=await updateSection(fx.env,"shop",initial.section_key,{content:edited,expected_version:target.version});
    assert.equal(saved.ok,true);
    const revisions=await listGeneratedRevisions(fx.env,"shop",initial.section_key,"acct_alpha");
    assert.deepEqual(revisions.revisions.map((r)=>r.number),[2,1]);
    const denied=await listGeneratedRevisions(fx.env,"shop",initial.section_key,"acct_other");
    assert.equal(denied.status,404);
    const stale=await restoreGeneratedRevision(fx.env,"shop",initial.section_key,"acct_alpha",{revisionNumber:1,expectedVersion:target.version});
    assert.equal(stale.status,409);
    const restored=await restoreGeneratedRevision(fx.env,"shop",initial.section_key,"acct_alpha",
      {revisionNumber:1,expectedVersion:saved.version});
    assert.equal(restored.ok,true,JSON.stringify(restored));
    assert.equal(restored.published,false);
    assert.equal(restored.revision_number,3);
    const after=await getPageAdmin(fx.env,"shop");
    assert.equal(after.page.sections.find((s)=>s.key===initial.section_key).content.headline,"Original headline");
    assert.equal(fx.db.prepare("SELECT content_version FROM cms_page_sections").get().content_version,restored.version);
    assert.equal(fx.db.prepare("SELECT COUNT(*) AS n FROM cms_revisions").get().n,3);
    assert.equal(fx.cache.size,0,"Rollback must not publish");
  } finally {fx.db.close();}
});
