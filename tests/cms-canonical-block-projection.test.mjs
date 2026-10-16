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
  sqlite.exec('CREATE TABLE cms_section_blocks (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,section_id TEXT NOT NULL,parent_block_id TEXT,block_key TEXT NOT NULL,block_type TEXT NOT NULL,sort_order INTEGER,status TEXT,content_json TEXT,metadata_json TEXT,artifact_id TEXT,source_path TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(section_id,block_key));');
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
test('duplicate IDs and unknown parents reject before writes',async()=>{
  const {reconcileCanonicalBlocks}=await source();const store=fixture();
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,content:{__editor:{blocks:[
    {id:'a',templateKey:'text'},{id:'a',templateKey:'text'}]}}}),/duplicate_block_identity/);
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,content:{__editor:{blocks:[
    {id:'a',templateKey:'text',parentBlockId:'b'}]}}}),/unknown_parent:b/);
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

test('Shop collections: migrate matching legacy cards, insert, reload, edit, reorder and restore version',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  const legacy=JSON.stringify({legacy_source:'r2-section-content',legacy_r2_key:'cms/pages/shop/draft/collections.json'});
  const insert=store.sqlite.prepare(`INSERT INTO cms_section_blocks
    (id,account_id,section_id,block_key,block_type,sort_order,status,content_json,metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  for(let i=1;i<=3;i++)insert.run('cmsb_legacy_14_card'+i,'tenant-a','section-a',
    'card'+i,'collection-card',i*10,'active',JSON.stringify({name:'Old '+i}),legacy);
  const snapshot=(ids,newLabel)=>({
    __editor:{blocks:ids.map(id=>({id,templateKey:'collection-card',enabled:true}))},
    ...Object.fromEntries(ids.map(id=>[id,{name:id==='collection-card-9236d036'?newLabel:'New '+id}]))
  });
  const added=snapshot(['card1','card2','card3','collection-card-9236d036'],'New collection');
  const first=await reconcileCanonicalBlocks(store.db,{...input,content:added});
  assert.equal(first.inserted,1);assert.equal(first.updated,3);
  assert.equal(store.rows().length,4);
  for(let i=1;i<=3;i++){
    const row=store.rows().find(r=>r.block_key==='card'+i);
    assert.equal(row.id,'cmsb_legacy_14_card'+i);
    assert.equal(JSON.parse(row.metadata_json).source,'theme-studio-v1');
  }
  const newRow=store.rows().find(r=>r.block_key==='collection-card-9236d036');
  assert.equal(JSON.parse(newRow.content_json).name,'New collection');
  assert.equal(store.receipts().length,4);
  // Exact data reloaded from canonical D1, not __editor JSON.
  const reloaded=store.rows().map(r=>r.block_key);
  assert.deepEqual(reloaded,['card1','card2','card3','collection-card-9236d036']);
  const revised=snapshot(['collection-card-9236d036','card1','card2','card3'],'Revised');
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:revised})).updated,4);
  const modified=store.rows().find(r=>r.block_key==='collection-card-9236d036');
  assert.equal(modified.id,newRow.id);
  assert.equal(modified.sort_order,0);
  assert.equal(JSON.parse(modified.content_json).name,'Revised');
  // Section revision restore replays its old snapshot through the same writer.
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:added})).updated,4);
  assert.equal(store.rows().find(r=>r.id===newRow.id).sort_order,30);
  assert.equal(JSON.parse(store.rows().find(r=>r.id===newRow.id).content_json).name,'New collection');
  assert.equal(store.receipts().length,12);
  store.sqlite.close();
});

test('native nested Revise groups preserve parent IDs, order, edit, archival, and revision evidence',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  const nested=(children,answer)=>({
    __editor:{blocks:[{id:'faq-root',templateKey:'group',enabled:true},
      ...children.map(id=>({id,templateKey:'text',parentBlockId:'faq-root',enabled:true}))]},
    'faq-root':{label:'FAQ'},
    'faq-question':{text:'Question'},
    'faq-answer':{text:answer}
  });
  const original=nested(['faq-question','faq-answer'],'First answer');
  const first=await reconcileCanonicalBlocks(store.db,{...input,content:original});
  assert.equal(first.inserted,3);
  const parent=store.rows().find(r=>r.block_key==='faq-root');
  const answerRow=store.rows().find(r=>r.block_key==='faq-answer');
  assert.ok(parent);
  assert.equal(answerRow.parent_block_id,parent.id);
  assert.deepEqual(store.rows().filter(r=>r.parent_block_id===parent.id)
    .map(r=>r.sort_order).sort((a,b)=>a-b),[0,10]);
  const modified=nested(['faq-answer','faq-question'],'Revised answer');
  const second=await reconcileCanonicalBlocks(store.db,{...input,content:modified});
  assert.equal(second.updated,2);
  assert.equal(store.rows().find(r=>r.block_key==='faq-answer').id,answerRow.id);
  assert.equal(store.rows().find(r=>r.block_key==='faq-answer').sort_order,0);
  assert.equal(JSON.parse(store.rows().find(r=>r.block_key==='faq-answer').content_json).text,'Revised answer');
  const receipts=store.receipts().map(r=>JSON.parse(r.snapshot_json));
  assert.ok(receipts.some(r=>r.operation==='update'&&r.before&&r.after));
  const removed=nested(['faq-answer'],'Revised answer');
  await reconcileCanonicalBlocks(store.db,{...input,content:removed});
  assert.equal(store.rows().find(r=>r.block_key==='faq-question').status,'archived');
  assert.equal(store.rows().find(r=>r.block_key==='faq-question').parent_block_id,parent.id);
  await reconcileCanonicalBlocks(store.db,{...input,content:original});
  assert.equal(store.rows().find(r=>r.block_key==='faq-question').status,'active');
  assert.equal(JSON.parse(store.rows().find(r=>r.block_key==='faq-answer').content_json).text,'First answer');
  store.sqlite.close();
});

test('do not flatten or fabricate imported nested Revise trees',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  store.sqlite.prepare(`INSERT INTO cms_section_blocks
    (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run('revise-parent','tenant-a','section-a',null,
      'imported-group','group',0,'active','{}',JSON.stringify({source:'revise-import'}));
  store.sqlite.prepare(`INSERT INTO cms_section_blocks
    (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run('revise-child','tenant-a','section-a','revise-parent',
      'imported-child','text',0,'active','{"text":"Preserve me"}',JSON.stringify({source:'revise-import'}));
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,
    content:doc([['alias-item','item',true]],{'alias-item':{text:'alias'}})}),
    /imported_tree_requires_native_identity_mapping/);
  assert.equal(store.rows().length,2);
  assert.equal(store.receipts().length,0);
  // New editor-owned nested child may explicitly target a real imported parent.
  const attached={__editor:{blocks:[{id:'new-child',templateKey:'text',
    parentBlockId:'imported-group'}]},'new-child':{text:'Added safely'}};
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:attached})).inserted,1);
  assert.equal(store.rows().find(r=>r.block_key==='new-child').parent_block_id,'revise-parent');
  assert.equal(store.rows().find(r=>r.id==='revise-child').content_json,'{"text":"Preserve me"}');
  store.sqlite.close();
});

test('failed canonical validation does not persist any partial block records',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  const malformed={__editor:{blocks:[
    {id:'root',templateKey:'group',parentBlockId:'leaf'},
    {id:'leaf',templateKey:'text',parentBlockId:'root'}
  ]},root:{},leaf:{}};
  await assert.rejects(reconcileCanonicalBlocks(store.db,{...input,content:malformed}),/cyclic_block_parent/);
  assert.equal(store.rows().length,0);assert.equal(store.receipts().length,0);
  store.sqlite.close();
});

test('explicit native Revise child edit adopts an exact sourced block without flattening its parent',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  const stmt=store.sqlite.prepare(`INSERT INTO cms_section_blocks
    (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,metadata_json,source_path)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  stmt.run('revise-group','tenant-a','section-a',null,'ideas_block_0','group',0,'active',
    '{"layout":"card"}',JSON.stringify({source_theme:'revise',source_block_type:'item'}),'$.blocks.ideas-block-0');
  stmt.run('revise-text','tenant-a','section-a','revise-group','ideas_block_0_0','text',0,'active',
    '{"text":"T"}',JSON.stringify({source_theme:'revise',source_field:'0'}),'$.blocks.ideas-block-0.0');
  const inputDoc={__editor:{blocks:[{id:'ideas_block_0_0',templateKey:'text',
    parentBlockId:'ideas_block_0'}]},ideas_block_0_0:{text:'Edited'}};
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:inputDoc})).updated,1);
  assert.equal(store.rows().find(r=>r.id==='revise-text').parent_block_id,'revise-group');
  assert.equal(JSON.parse(store.rows().find(r=>r.id==='revise-text').content_json).text,'Edited');
  assert.equal(JSON.parse(store.rows().find(r=>r.id==='revise-text').metadata_json).adoptedFrom,
    'revise-import');
  assert.equal(store.rows().find(r=>r.id==='revise-group').content_json,'{"layout":"card"}');
  assert.equal(store.receipts().length,1);
  store.sqlite.close();
});

test('unchanged imported Revise aliases allow section styling without minting duplicate native blocks',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  const insert=store.sqlite.prepare(`INSERT INTO cms_section_blocks
    (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,metadata_json,source_path)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  insert.run('revise-group','tenant-a','section-a',null,'ideas_block_0','group',0,'active',
    '{"layout":"card"}',JSON.stringify({source_theme:'revise'}),'$.blocks.ideas-block-0');
  insert.run('revise-child','tenant-a','section-a','revise-group','ideas_block_0_0','text',0,'active',
    '{"text":"T"}',JSON.stringify({source_theme:'revise'}),'$.blocks.ideas-block-0.0');
  const prior={__editor:{sourceContract:'revise/site-section-v1',blocks:[
    {id:'ideas-block-0',templateKey:'item',enabled:true}]},
    'ideas-block-0':'Time is the real horsepower',background:'#000'};
  const styling={...structuredClone(prior),background:'#fafafa'};
  assert.equal((await reconcileCanonicalBlocks(store.db,{
    ...input,content:styling,previousContent:prior})).status,'not_applicable');
  assert.equal(store.rows().length,2);
  assert.equal(store.receipts().length,0);
  const changed={...styling,'ideas-block-0':'Changed'};
  await assert.rejects(reconcileCanonicalBlocks(store.db,{
    ...input,content:changed,previousContent:prior}),
    /imported_tree_requires_native_identity_mapping/);
  assert.equal(store.rows().length,2);
  assert.equal(store.receipts().length,0);
  store.sqlite.close();
});

test('portable primitive item labels normalize into a typed block value',async()=>{
  const {reconcileCanonicalBlocks}=await source();
  const store=fixture();
  const portable={__editor:{blocks:[{id:'item-1',templateKey:'item',enabled:true}]},
    'item-1':'Designed to move'};
  assert.equal((await reconcileCanonicalBlocks(store.db,{...input,content:portable})).inserted,1);
  assert.deepEqual(JSON.parse(store.rows()[0].content_json),{value:'Designed to move'});
  store.sqlite.close();
});
