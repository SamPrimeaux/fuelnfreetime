import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { updateSection, getPreviewPage, seedPageFromRegistry } from "../apps/ecommerce-cms-agentsam/backend/cms/api.js";
import { reviseAtlas } from "../packages/theme-contract/runtime/revise-atlas-source.js";

function sqliteEnv(){
  const sqlite=new DatabaseSync(":memory:");
  sqlite.exec([
    "CREATE TABLE pages(id INTEGER PRIMARY KEY,slug TEXT,title TEXT,status TEXT,updated_at TEXT);",
    "CREATE TABLE page_sections(id INTEGER PRIMARY KEY,page_id INTEGER,section_key TEXT,sort_order INTEGER,content_json TEXT,content_r2_key TEXT,content_version INTEGER,content_hash TEXT,status TEXT,updated_at TEXT);",
    "CREATE TABLE cms_pages(id TEXT PRIMARY KEY,account_id TEXT,legacy_page_id INTEGER,status TEXT,updated_at TEXT);",
    "CREATE TABLE cms_page_sections(id TEXT PRIMARY KEY,account_id TEXT,page_id TEXT,legacy_section_id INTEGER,inline_content_json TEXT,content_r2_key TEXT,content_version INTEGER,content_hash TEXT,status TEXT,updated_at TEXT);",
    "CREATE TABLE cms_revisions(id TEXT PRIMARY KEY DEFAULT(lower(hex(randomblob(16)))),account_id TEXT,entity_type TEXT,entity_id TEXT,revision_number INTEGER,revision_kind TEXT,content_r2_key TEXT,content_hash TEXT,snapshot_json TEXT,metadata_json TEXT,UNIQUE(entity_type,entity_id,revision_number,revision_kind,content_r2_key));"
  ].join("\n"));
  const objects=new Map();
  const DB={
    prepare(query){
      const statement=sqlite.prepare(query);
      let params=[];
      return {
        bind(...values){params=values;return this;},
        async first(){return statement.get(...params)||null;},
        async all(){return {results:statement.all(...params)};},
        async run(){const v=statement.run(...params);return {meta:{changes:v.changes}};}
      };
    }
  };
  const WEBSITE_ASSETS={
    async get(key){const raw=objects.get(key);return raw?{text:async()=>raw}:null;},
    async put(key,payload){objects.set(key,String(payload));}
  };
  return {sqlite,objects,env:{DB,WEBSITE_ASSETS}};
}
test("Revise editable Stories: draft save updates R2, canonical D1 revision and reload without publish",async()=>{
  const {sqlite,objects,env}=sqliteEnv();
  const slug="stories",id="stories-sticky-card-deck-2",account="acct-test";
  const content=reviseAtlas.defaults("revise-atlas/sticky-card-deck");
  assert.ok(content);
  assert.deepEqual(reviseAtlas.validate(content.__editor.themePreset,content),{ok:true});
  const sha=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const hash=sha(content);
  const originalKey="cms/pages/stories/history/"+id+".v1."+hash.slice(0,16)+".json";
  objects.set(originalKey,JSON.stringify({section_key:id,content,status:"draft",version:1,content_hash:hash}));
  sqlite.prepare("INSERT INTO pages VALUES(1,'stories','Project Stories','draft','now')").run();
  sqlite.prepare("INSERT INTO page_sections VALUES(1,1,?,0,'{}',?,1,?,'draft','now')")
    .run(id,originalKey,hash);
  sqlite.prepare("INSERT INTO cms_pages VALUES('cp',?,1,'draft','now')").run(account);
  sqlite.prepare("INSERT INTO cms_page_sections VALUES('cs',?,'cp',1,?,?,1,?,'draft','now')")
    .run(account,JSON.stringify(content),originalKey,hash);
  const before=await getPreviewPage(env,slug);
  assert.equal(before.sections.find(x=>x.key===id).content.heading,content.heading);
  assert.equal(before.status,"draft");
  const changed=structuredClone(content);
  changed.heading="A genuinely edited Story headline";
  const saved=await updateSection(env,slug,id,{content:changed,expected_version:1});
  assert.equal(saved.ok,true,JSON.stringify(saved));
  assert.equal(saved.version,2);
  const state=sqlite.prepare("SELECT * FROM page_sections").get();
  const mirror=sqlite.prepare("SELECT * FROM cms_page_sections").get();
  assert.equal(state.content_version,2);
  assert.equal(mirror.content_version,2);
  assert.equal(state.content_r2_key,mirror.content_r2_key);
  assert.equal(state.content_hash,mirror.content_hash);
  assert.equal(mirror.inline_content_json,JSON.stringify(changed));
  assert.equal(sqlite.prepare("SELECT status FROM cms_pages WHERE id='cp'").get().status,"draft");
  const next=JSON.parse(objects.get(state.content_r2_key));
  assert.equal(next.content.heading,"A genuinely edited Story headline");
  assert.equal(next.content_hash,sha(changed));
  const revision=sqlite.prepare("SELECT * FROM cms_revisions").get();
  assert.equal(revision.revision_kind,"draft");
  assert.equal(revision.revision_number,2);
  assert.equal(revision.content_r2_key,state.content_r2_key);
  assert.equal(JSON.parse(revision.snapshot_json).__editor,undefined);
  const reloaded=await getPreviewPage(env,slug);
  assert.equal(reloaded.sections.find(x=>x.key===id).content.heading,changed.heading);
  assert.equal(reloaded.sections.find(x=>x.key===id).version,2);
  const stale=await updateSection(env,slug,id,{content,expected_version:1});
  assert.equal(stale.status,409);
  assert.equal(stale.code,"cms_version_conflict");
  assert.equal(sqlite.prepare("SELECT content_version FROM page_sections").get().content_version,2);
  assert.ok(![...objects.keys()].some(k=>k.includes("/published/")));
  sqlite.close();
});
test("Draft-only Revise page never seeds or publishes without an import",async()=>{
  const result=await seedPageFromRegistry({}, "stories");
  assert.equal(result.status,409);
});
