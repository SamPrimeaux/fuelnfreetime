import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PAGE_REGISTRY, getRegistryPage, listRegistryPages } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";
import { seedPageFromRegistry } from "../apps/ecommerce-cms-agentsam/backend/cms/api.js";
import { reviseAtlas } from "../packages/theme-contract/runtime/revise-atlas-source.js";

const site = JSON.parse(readFileSync("apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json","utf8"));
const media = JSON.parse(readFileSync("apps/ecommerce-cms-agentsam/fixtures/fnf-revise-media-map.json","utf8"));
const expansion=["stories","products","ideas"];
const all=[...expansion,"campaigns"];

test("Revise page registry uses the REAL portable preset owner and never replaces Home",()=>{
  for(const slug of all){
    const page=site.pages.find(p=>p.id===slug);
    assert.ok(page,"fixture missing "+slug);
    const registered=PAGE_REGISTRY[slug];
    assert.equal(registered.defaultStatus,"draft");
    assert.equal(getRegistryPage(slug).status,"draft");
    assert.equal(listRegistryPages().find(p=>p.slug===slug)?.status,"draft");
    assert.equal(Object.keys(registered.sections).length,page.sections.length);
    for(const sec of page.sections){
      const definition=registered.sections[sec.id];
      assert.ok(definition,sec.id);
      const key="revise-atlas/"+sec.preset.split("/")[1];
      const schema=reviseAtlas.schema(key);
      assert.ok(schema,key);
      assert.deepEqual(definition.fields,schema.fields);
      assert.deepEqual(definition.blocks,schema.blocks);
      assert.equal(definition.defaultContent.__editor.themePreset,key);
      assert.equal(definition.defaultContent.__editor.sourcePreset,sec.preset);
      assert.deepEqual(reviseAtlas.validate(key,definition.defaultContent),{ok:true});
    }
  }
  assert.notEqual(PAGE_REGISTRY.home.defaultStatus,"draft");
  assert.equal(getRegistryPage("home").status,"published");
});

test("draft-only Revise pages cannot be implicitly bootstrapped as published",async()=>{
  for(const slug of all){
    const result=await seedPageFromRegistry(undefined,slug);
    assert.equal(result.status,409);
    assert.match(result.error,/Draft-only/);
  }
});

test("full Revise seed is rerunnable D1/R2 draft projection with explicit legacy bridge",()=>{
 const sql=execFileSync(process.execPath,["scripts/build-revise-campaigns-cms-seed.mjs","--pages=stories,products,ideas","--r2-drafts"],{encoding:"utf8"});
 assert.equal((sql.match(/INSERT INTO cms_page_sections/g)||[]).length,13);
 assert.equal((sql.match(/INSERT INTO cms_section_blocks/g)||[]).length,180);
 assert.equal((sql.match(/INSERT INTO cms_revisions/g)||[]).length,16);
 assert.equal((sql.match(/INSERT INTO cms_pages/g)||[]).length,3);
 assert.ok(sql.includes("content_r2_key"));
 assert.ok(sql.includes("cms/pages/stories/history/stories-sticky-card-deck-2.v1."));
 assert.match(sql,/unresolved_media/);
 assert.match(sql,/fnf\.tee\.front/);
 // Only reject mutating SQL statements, not words quoted inside customer copy.
 assert.ok(!/^\s*(?:DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|REPLACE\s+INTO|UPDATE\s+cms_)\b/im.test(sql));
 assert.ok(!sql.includes("store_theme_pages"));
 assert.ok(!sql.includes("cmsp_revise_home"));
 const previous=execFileSync(process.execPath,["scripts/build-revise-campaigns-cms-seed.mjs"],{encoding:"utf8"});
 assert.equal(previous,readFileSync("db/seed-cms-revise-campaigns-20261007.sql","utf8"));
});

test("versioned R2 drafts preserve actual CMS portable content and validate cryptographic hashes",()=>{
 const folder=mkdtempSync(path.join(tmpdir(),"fnf-revise-r2-"));
 try {
  const sql=path.join(folder,"seed.sql");
  execFileSync(process.execPath,["scripts/build-revise-campaigns-cms-seed.mjs",
   "--pages=stories,products,ideas","--r2-drafts","--r2-out="+folder,"--out="+sql]);
  assert.equal(readFileSync(sql,"utf8"),execFileSync(process.execPath,["scripts/build-revise-campaigns-cms-seed.mjs","--pages=stories,products,ideas","--r2-drafts"],{encoding:"utf8"}));
  const manifest=JSON.parse(readFileSync(path.join(folder,"revise-draft-manifest.json"),"utf8"));
  assert.equal(manifest.object_count,13);
  assert.equal(manifest.published,false);
  for(const entry of manifest.objects){
    const payload=readFileSync(path.join(folder,entry.r2_key),"utf8");
    assert.equal(crypto.createHash("sha256").update(payload).digest("hex"),entry.payload_sha256);
    const doc=JSON.parse(payload);
    assert.equal(doc.status,"draft");
    assert.equal(doc.version,1);
    assert.equal(doc.content_hash,entry.content_hash);
    assert.equal(crypto.createHash("sha256").update(JSON.stringify(doc.content)).digest("hex"),entry.content_hash);
    assert.equal(doc.section_key,entry.section_key);
    assert.ok(doc.content.__editor.themePreset.startsWith("revise-atlas/"));
    assert.ok(entry.r2_key.startsWith("cms/pages/"+entry.page+"/history/"));
    assert.ok(entry.r2_key.endsWith(".v1."+entry.content_hash.slice(0,16)+".json"));
  }
  const known=Object.keys(media);
  const count=manifest.objects.filter(e=>e.page==="stories").length;
  assert.equal(count,4);
  assert.ok(known.length>0);
 } finally {rmSync(folder,{recursive:true,force:true});}
});
