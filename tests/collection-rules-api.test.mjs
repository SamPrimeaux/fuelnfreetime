import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { updateAdminCollectionRules, getAdminCollection, listAdminCollections } from "../apps/ecommerce-cms-agentsam/backend/admin/api.js";
import { getStoreCollection, listStoreCollections } from "../apps/ecommerce-cms-agentsam/backend/store/collections.js";

function fixture(){
  const db=new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE products(id INTEGER PRIMARY KEY,slug TEXT,title TEXT,description TEXT,collection TEXT,
      price_cents INTEGER,image_url TEXT,status TEXT,updated_at TEXT);
    CREATE TABLE product_variants(id INTEGER PRIMARY KEY,product_id INTEGER,size TEXT,inventory_qty INTEGER);
    CREATE TABLE media_assets(id INTEGER PRIMARY KEY,url TEXT);
    CREATE TABLE product_images(product_id INTEGER,media_asset_id INTEGER,is_primary INTEGER);
    CREATE TABLE store_collections(id INTEGER PRIMARY KEY,slug TEXT,title TEXT,description TEXT,status TEXT,
      sort_order INTEGER,updated_at TEXT);
    CREATE TABLE store_collection_products(collection_id INTEGER,product_id INTEGER,sort_order INTEGER);
    INSERT INTO products VALUES
      (1,'fuel-tee','Fuel Tee','', 'Essentials',2900,'/shirt.jpg','active',datetime('now')),
      (2,'cap','Trucker Cap','', 'Accessories',3000,'/hat.jpg','active',datetime('now')),
      (3,'fuel-crew','Fuel Crewneck','', 'Essentials',4900,'/crew.jpg','active',datetime('now')),
      (4,'fuel-draft','Fuel Draft Tee','', 'Essentials',2900,'/draft.jpg','draft',datetime('now'));
    INSERT INTO store_collections VALUES (1,'tees','Tees','','active',1,datetime('now'));
    INSERT INTO store_collection_products VALUES(1,2,0);
  `);
  db.exec(readFileSync(new URL("../db/migrate-store-collection-rules-20261027.sql",import.meta.url),"utf8"));
  const prep=(sql,values=[])=>({
    bind(...args){return prep(sql,args)},
    first(){return db.prepare(sql).get(...values)||null},
    all(){return {results:db.prepare(sql).all(...values)}},
    run(){const result=db.prepare(sql).run(...values);return {meta:{last_row_id:Number(result.lastInsertRowid)}}},
  });
  return {db,env:{DB:{prepare:(sql)=>prep(sql),batch:async(stmts)=>Promise.all(stmts.map(s=>s.run()))}}};
}
function req(rules){return new Request("https://test.example/api/admin/collections/1/rules",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(rules)});}
test("additive collection rule migration preserves existing manual products",async()=>{
  const {db,env}=fixture();
  try{
    const initial=await (await getStoreCollection(env,"tees")).json();
    assert.deepEqual(initial.products.map(p=>p.id),[2]);
    assert.equal((await (await listStoreCollections(env)).json()).collections[0].product_count,1);
    assert.equal((await (await getAdminCollection(null,env,1)).json()).rules.mode,"manual");
  }finally{db.close();}
});
test("automatic and hybrid rule updates change storefront selection, never manufacture or publish draft items",async()=>{
  const {db,env}=fixture();
  try{
    const config={mode:"automatic",match:"all",conditions:[{field:"title",operator:"contains",value:"Fuel"}],excludedIds:[3]};
    assert.equal((await updateAdminCollectionRules(req(config),env,1)).status,200);
    const auto=await (await getStoreCollection(env,"tees")).json();
    assert.deepEqual(auto.products.map(p=>p.id),[1]);
    assert.equal((await (await listStoreCollections(env)).json()).collections[0].product_count,1);
    assert.equal((await (await listAdminCollections(null,env)).json()).collections[0].product_count,1);
    assert.equal((await updateAdminCollectionRules(req({...config,mode:"hybrid"}),env,1)).status,200);
    const hybrid=await (await getStoreCollection(env,"tees")).json();
    assert.deepEqual(hybrid.products.map(p=>p.id),[2,1]);
    assert.equal((await (await getAdminCollection(null,env,1)).json()).rules.mode,"hybrid");
  }finally{db.close();}
});
test("invalid automatic rules rejected without altering saved policies",async()=>{
  const {db,env}=fixture();
  try{
    assert.equal((await updateAdminCollectionRules(req({mode:"automatic",conditions:[]}),env,1)).status,400);
    assert.equal((await updateAdminCollectionRules(req({mode:"automatic",match:"all",conditions:[{field:"sku",operator:"contains",value:"x"}]}),env,1)).status,400);
    assert.equal((await (await getAdminCollection(null,env,1)).json()).rules.mode,"manual");
  }finally{db.close();}
});
