import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {patchVariantInventory,listInventory} from '../apps/ecommerce-cms-agentsam/backend/admin/api.js';

function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const sql of [
    'CREATE TABLE products (id INTEGER PRIMARY KEY,title TEXT,price_cents INTEGER,status TEXT)',
    'CREATE TABLE product_variants (id INTEGER PRIMARY KEY,product_id INTEGER,sku TEXT,size TEXT,color TEXT,inventory_qty INTEGER,price_cents INTEGER,updated_at TEXT)',
    'CREATE TABLE completeful_product_links (id INTEGER PRIMARY KEY,product_id INTEGER,completeful_store_product_id TEXT,completeful_catalog_product_id TEXT,sync_status TEXT)',
    "INSERT INTO products VALUES (1,'Store Tee',2000,'active'),(2,'Print Hoodie',3200,'draft')",
    "INSERT INTO product_variants VALUES (11,1,'TEE-S','S','Black',5,2000,null),(12,1,'TEE-M','M','Black',3,2000,null),(21,2,'POD-L','L','Gray',0,3200,null)",
    "INSERT INTO completeful_product_links VALUES (1,2,'store-hoodie','catalog-hoodie','synced')",
  ])db.exec(sql);
  const env={DB:{prepare(sql){
    return {bind(...args){return {
      async first(){return db.prepare(sql).get(...args)||null;},
      async all(){return {results:db.prepare(sql).all(...args)};},
      async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}};}
    }},async all(){return {results:db.prepare(sql).all()}}};
  }}};
  return {env,db};
}
const request=(quantity,expected)=>new Request('https://example.test/api/admin/variants/11/inventory',{
  method:'PATCH',headers:{'content-type':'application/json'},
  body:JSON.stringify({inventory_qty:quantity,expected_inventory_qty:expected}),
});

test('inventory is grouped by the canonical store product even with Completeful linked',async()=>{
  const {env}=fixture();
  const response=await listInventory(new Request('https://example.test/api/admin/inventory'),env);
  const data=await response.json();
  assert.equal(data.ok,true);
  assert.equal(data.inventory.length,3);
  const manual=data.groups.find(g=>g.id===1);
  const connected=data.groups.find(g=>g.id===2);
  assert.equal(manual.variants.length,2);
  assert.equal(manual.source.label,'Store-managed');
  assert.equal(connected.source.provider,'completeful');
  assert.equal(connected.source.catalog_id,'catalog-hoodie');
});

test('stale inventory changes fail with 409 and cannot overwrite checkout adjustments',async()=>{
  const {env,db}=fixture();
  const saved=await patchVariantInventory(request(4,5),env,11);
  assert.equal(saved.status,200);
  const stale=await patchVariantInventory(request(2,5),env,11);
  assert.equal(stale.status,409);
  const data=await stale.json();
  assert.equal(data.code,'stale_inventory');
  assert.equal(data.inventory_qty,4);
  assert.equal(db.prepare('SELECT inventory_qty FROM product_variants WHERE id=11').get().inventory_qty,4);
});
test('negative/fractional quantities and missing variants fail without writes',async()=>{
  const {env,db}=fixture();
  assert.equal((await patchVariantInventory(request(-1,5),env,11)).status,400);
  assert.equal((await patchVariantInventory(request(2.5,5),env,11)).status,400);
  assert.equal((await patchVariantInventory(request(5,5),env,500)).status,404);
  assert.equal(db.prepare('SELECT inventory_qty FROM product_variants WHERE id=11').get().inventory_qty,5);
});
