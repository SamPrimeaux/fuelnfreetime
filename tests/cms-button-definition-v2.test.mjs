import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { normalizeCmsDefinition } from '../apps/ecommerce-cms-agentsam/backend/cms/definition-registry.mjs';
import { createAuthoringEngine } from '../apps/ecommerce-cms-agentsam/cms/authoring/engine.ts';
import '../apps/ecommerce-cms-agentsam/packages/theme-contract/runtime/portable-sections.js';

test('Button v2 is a versioned, idempotent entry in the existing cms_definitions table', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`
      CREATE TABLE cms_pages(account_id TEXT);
      CREATE TABLE cms_definitions (
        id TEXT DEFAULT (lower(hex(randomblob(8)))),account_id TEXT,
        definition_key TEXT,kind TEXT,label TEXT,category TEXT,origin TEXT,version TEXT,
        settings_schema_json TEXT,allowed_blocks_json TEXT,metadata_json TEXT,status TEXT,
        UNIQUE(account_id,kind,definition_key,version)
      );
      INSERT INTO cms_pages VALUES ('a'),('a'),('b');
    `);
    const migration = readFileSync(new URL('../db/migrate-cms-button-definition-v2-20261015.sql',import.meta.url),'utf8');
    db.exec(migration); db.exec(migration);
    const rows = db.prepare('SELECT * FROM cms_definitions ORDER BY account_id').all();
    assert.equal(rows.length,2);
    assert.deepEqual(rows.map(x=>x.account_id),['a','b']);
    const def = normalizeCmsDefinition(rows[0]);
    assert.equal(def.version,'2');
    assert.equal(def.fields.href.type,'link');
    assert.equal(def.fields.openInNewTab.type,'boolean');
    assert.equal(def.fields.label.label,'Button text');
    const engine = createAuthoringEngine([def]);
    const inspector = engine.inspector('block','button',{ label:'Go', href:'/shop', openInNewTab:true });
    assert.equal(inspector.find(x=>x.key==='openInNewTab').value,true);
    assert.equal(inspector.find(x=>x.key==='href').value,'/shop');
  } finally { db.close(); }
});
test('Button target setting changes actual safe portable Hero markup',()=>{
  const api=globalThis.ThemePortableSections;
  const content=api.defaults('revise/sticky-curtain');
  content.ctaPrimary.openInNewTab=true;
  assert.deepEqual(api.validate('revise/sticky-curtain',content),{ok:true});
  const html=api.render({key:'hero',content});
  assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  assert.match(html,/href="\/shop"/);
  content.ctaPrimary.openInNewTab=false;
  assert.doesNotMatch(api.render({key:'hero',content}),/target="_blank"/);
  content.ctaPrimary.openInNewTab='true';
  assert.equal(api.validate('revise/sticky-curtain',content).ok,false);
});
test('nested D1 setting names are validated by the same typed engine',()=>{
  const row={id:'cta',definition_key:'cta-band',kind:'section',version:'1',label:'CTA',origin:'package',status:'active',
    settings_schema_json:JSON.stringify({'action.label':{type:'text'},'action.href':{type:'link'}}),
    allowed_blocks_json:'[]',metadata_json:'{}'};
  const def=normalizeCmsDefinition(row);
  const engine=createAuthoringEngine([def]);
  assert.deepEqual(engine.inspector('section','cta-band',{}).map(x=>x.key),['action.label','action.href']);
});
