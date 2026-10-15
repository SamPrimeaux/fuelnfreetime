import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/cms/api.js',import.meta.url),'utf8');
const start=source.indexOf('await env.DB.prepare(' + String.fromCharCode(96) + 'INSERT INTO cms_page_sections');
assert.ok(start>=0,'Expected canonical placement creation inside save pipeline');
const sqlStart=source.indexOf('INSERT INTO cms_page_sections',start);
const sqlEnd=source.indexOf(String.fromCharCode(96) + ')',sqlStart);
const sql=source.slice(sqlStart,sqlEnd);

function database(){
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE page_sections (id INTEGER PRIMARY KEY,page_id INTEGER,section_key TEXT,sort_order INTEGER,status TEXT);');
  db.exec('CREATE TABLE cms_pages (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,legacy_page_id INTEGER UNIQUE);');
  db.exec('CREATE TABLE cms_page_sections (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),account_id TEXT,page_id TEXT,legacy_section_id INTEGER UNIQUE,section_key TEXT,section_type TEXT,sort_order INTEGER,status TEXT,inline_content_json TEXT,content_r2_key TEXT,content_version INTEGER,content_hash TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(page_id,section_key));');
  db.prepare('INSERT INTO cms_pages (id,account_id,legacy_page_id) VALUES (?,?,?)').run('page-a','tenant-a',101);
  db.prepare('INSERT INTO page_sections VALUES (?,?,?,?,?)').run(211,101,'hero',20,'draft');
  db.prepare('INSERT INTO page_sections VALUES (?,?,?,?,?)').run(212,102,'hero',20,'draft');
  return db;
}
test('new legacy sections become real canonical placements under the account-linked page',()=>{
  const db=database();
  const params=['hero','{"hello":"world"}','r2/hero.json',7,'sha256:snapshot',211];
  assert.equal(db.prepare(sql).run(...params).changes,1);
  const row=db.prepare('SELECT * FROM cms_page_sections').get();
  assert.equal(row.account_id,'tenant-a');
  assert.equal(row.page_id,'page-a');
  assert.equal(row.legacy_section_id,211);
  assert.equal(row.section_type,'hero');
  assert.equal(row.content_version,7);
  assert.equal(db.prepare(sql).run(...params).changes,0);
  assert.equal(db.prepare(sql).run('hero','{}','r2/other.json',1,'digest',212).changes,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM cms_page_sections').get().n,1);
  db.close();
});

test('older saves cannot move the canonical pointer backwards',()=>{
  const start=source.indexOf('const pointer = await env.DB.prepare(' + String.fromCharCode(96) + 'UPDATE cms_page_sections');
  assert.ok(start>=0);
  const begin=source.indexOf('UPDATE cms_page_sections',start);
  const end=source.indexOf(String.fromCharCode(96)+')',begin);
  const update=source.slice(begin,end);
  const db=database();
  db.prepare(sql).run('hero','{}','r2/version7.json',7,'hash7',211);
  const row=db.prepare('SELECT id FROM cms_page_sections').get();
  const change=(version)=>db.prepare(update).run('{}','r2/version'+version+'.json',version,'hash'+version,row.id,211,version).changes;
  assert.equal(change(6),0);
  assert.equal(db.prepare('SELECT content_version FROM cms_page_sections').get().content_version,7);
  assert.equal(change(8),1);
  assert.equal(db.prepare('SELECT content_version FROM cms_page_sections').get().content_version,8);
  assert.equal(change(7),0);
  db.close();
});

test('section and block lifecycle operations use guarded canonical persistence',()=>{
  assert.match(source,/reconcileCanonicalBlocks\(env\.DB,/);
  assert.match(source,/UPDATE cms_page_sections SET status='removed'/);
  assert.match(source,/expectedVersion: editable\.row\.content_version/);
  assert.match(source,/canonical: saved\.canonical/);
  assert.doesNotMatch(sql,/PAGE_REGISTRY|fuelnfreetime|shop|heuristic/i);
});
