import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import vm from 'node:vm';
const entry=new URL('../apps/ecommerce-cms-agentsam/cms/authoring/block-projection.ts',import.meta.url).pathname;
let loaded;
async function source(){
  if(loaded)return loaded;
  const bundle=await build({entryPoints:[entry],write:false,bundle:true,platform:'neutral',format:'iife',globalName:'CmsBlocks'});
  const scope={crypto,structuredClone};
  vm.runInNewContext(bundle.outputFiles[0].text,scope);
  return loaded=scope.CmsBlocks;
}
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE cms_section_blocks (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,section_id TEXT NOT NULL,parent_block_id TEXT,block_key TEXT NOT NULL,block_type TEXT NOT NULL,sort_order INTEGER,status TEXT,content_json TEXT,metadata_json TEXT,artifact_id TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(section_id,block_key));');
  sqlite.exec('CREATE TABLE cms_revisions (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),account_id TEXT,entity_type TEXT,entity_id TEXT,revision_number INTEGER,revision_kind TEXT,snapshot_json TEXT,metadata_json TEXT);');
  const db={
    prepare(sql){return {bind(...params){const statement=sqlite.prepare(sql);return {
      async run(){return statement.run(...params)},
      async all(){return {results:statement.all(...params)}}
    }}}},
    async batch(statements){sqlite.exec('BEGIN');try{
      for(const operation of statements)await operation.run();
      sqlite.exec('COMMIT');
    }catch(error){sqlite.exec('ROLLBACK');throw error}}
  };
  const rows=()=>sqlite.prepare('SELECT * FROM cms_section_blocks ORDER BY sort_order').all();
  const receipts=()=>sqlite.prepare('SELECT * FROM cms_revisions').all();
  return {sqlite,db,rows,receipts};
}
const input={accountId:'tenant-a',sectionId:'section-a'};
const doc=(blocks,values={})=>({
  __editor:{blocks:blocks.map(([id,templateKey,enabled])=>({id,templateKey,enabled}))},...values
});
test('insert, update, reorder and hide create stable canonical blocks and revisions',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  const original=doc([['shop','button',true],['heading','heading',true]],{
    shop:{label:'Shop all'},heading:{text:'Welcome'}});
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:original})).inserted,2);
  assert.equal(store.rows().length,2);
  const id=store.rows()[0].id;
  assert.equal(store.receipts().length,2);
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:original})).status,'unchanged');
  assert.equal(store.receipts().length,2);
  const changed=doc([['heading','heading',true],['shop','button',false]],{
    shop:{label:'Explore'},heading:{text:'Welcome'}});
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:changed})).updated,2);
  const shop=store.rows().find(row=>row.block_key==='shop');
  assert.equal(shop.id,id);assert.equal(shop.sort_order,10);assert.equal(shop.status,'hidden');
  assert.equal(JSON.parse(shop.content_json).label,'Explore');
  assert.equal(store.receipts().length,4);store.sqlite.close();
});
test('archive a removed block without deleting history; restore uses stable identity',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  await reconcileCanonicalBlocks(store.db,{...input,content:doc([['a','text',true],['b','button',true]])});
  const id=store.rows().find(row=>row.block_key==='a').id;
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:doc([['b','button',true]])})).archived,1);
  assert.equal(store.rows().find(row=>row.block_key==='a').status,'archived');
  await reconcileCanonicalBlocks(store.db,{...input,content:doc([['a','text',true],['b','button',true]])});
  assert.equal(store.rows().find(row=>row.block_key==='a').id,id);
  assert.equal(store.rows().find(row=>row.block_key==='a').status,'active');store.sqlite.close();
});
test('a document without an editor block list must not empty canonical records',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  await reconcileCanonicalBlocks(store.db,{...input,content:doc([['a','text',true]])});
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:{heading:'hello'}})).status,'not_applicable');
  assert.equal(store.rows().length,1);store.sqlite.close();
});
test('duplicate IDs and nested nodes reject before writes',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,content:{__editor:{blocks:[
    {id:'a',templateKey:'text'},{id:'a',templateKey:'text'}]}}}),/duplicate_block_identity/);
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,content:{__editor:{blocks:[
    {id:'a',templateKey:'text',parentBlockId:'b'}]}}}),/nested_block_requires_native_writer/);
  assert.equal(store.rows().length,0);store.sqlite.close();
});
test('never overwrite imported or artifact-backed blocks',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  store.sqlite.prepare('INSERT INTO cms_section_blocks (id,account_id,section_id,block_key,block_type,sort_order,status,content_json,metadata_json,artifact_id) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run('original','tenant-a','section-a','a','text',0,'active',JSON.stringify({text:'source'}),JSON.stringify({source:'imported'}),'artifact-a');
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,content:doc([['a','text',true]],{a:{text:'override'}})}),/unmanaged_block_collision/);
  assert.equal(JSON.parse(store.rows()[0].content_json).text,'source');
  assert.equal(store.receipts().length,0);store.sqlite.close();
});
test('tenant and section isolation protects unrelated placements',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  await reconcileCanonicalBlocks(store.db,{...input,content:doc([['a','text',true]])});
  await reconcileCanonicalBlocks(store.db,{accountId:'tenant-b',sectionId:'section-b',
    content:doc([['b','button',true]])});
  assert.equal(store.rows().length,2);
  assert.equal(store.rows().find(row=>row.block_key==='a').status,'active');
  store.sqlite.close();
});
