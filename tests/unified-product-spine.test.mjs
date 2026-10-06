import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  groupProductInventory, resolveProductSource, validateInventoryAdjustment,
} from '../packages/agentsam-merch/src/product-spine.js';

const rows=[
  {id:11,product_id:1,product_title:'Local Tee',sku:'TEE-M',size:'M',color:'Black',inventory_qty:8,status:'active'},
  {id:12,product_id:1,product_title:'Local Tee',sku:'TEE-S',size:'S',color:'Black',inventory_qty:2,status:'active'},
  {id:21,product_id:2,product_title:'Print Hoodie',sku:'POD-BLACK',size:'M',inventory_qty:0,status:'draft'},
];

test('all suppliers use the same merchant product ID and variant list',()=>{
  const groups=groupProductInventory(rows,[{
    product_id:2,completeful_catalog_product_id:'catalog-002',sync_status:'pending'
  }]);
  assert.equal(groups.length,2);
  const tee=groups.find(g=>g.id===1),pod=groups.find(g=>g.id===2);
  assert.equal(tee.source.kind,'merchant_managed');
  assert.equal(tee.variants.length,2);
  assert.equal(tee.total_available,10);
  assert.equal(tee.low_stock_count,1);
  assert.equal(pod.source.kind,'connected_provider');
  assert.equal(pod.source.provider,'completeful');
  assert.equal(pod.source.catalog_id,'catalog-002');
  assert.equal(pod.variants[0].sku,'POD-BLACK');
});
test('invalid rows and duplicate provider links cannot duplicate products',()=>{
  const groups=groupProductInventory([...rows,{id:'bad',product_id:2},rows[0]],[{
    product_id:2,completeful_catalog_product_id:'new',
  },{product_id:2,completeful_catalog_product_id:'old'}]);
  assert.equal(groups.length,2);
  assert.equal(groups.find(g=>g.id===2).source.catalog_id,'new');
  assert.equal(groups.find(g=>g.id===1).variants.length,2);
});
test('other wholesalers reuse the identical merchant product and variant spine',()=>{
  const provider={product_id:1,provider:'wholesale_partner',catalog_id:'wholesale-123',external_id:'item-07',sync_status:'active'};
  const groups=groupProductInventory(rows,[provider]);
  assert.equal(groups.find(g=>g.id===1).source.provider,'wholesale_partner');
  assert.equal(groups.find(g=>g.id===1).source.external_id,'item-07');
  assert.equal(groups.find(g=>g.id===1).variants.length,2);
  assert.equal(resolveProductSource({id:3},{provider:'some_vendor'}).kind,'merchant_managed');
});
test('unknown supplier is never invented; owned products remain merchant-managed',()=>{
  assert.equal(resolveProductSource({id:8}).provider,null);
  assert.throws(()=>resolveProductSource({id:'oops'}),TypeError);
});
test('inventory requests reject fractions, invalid units and stale expected versions',()=>{
  assert.deepEqual(validateInventoryAdjustment('5','3'),{quantity:5,expected:3});
  for(const qty of [-1,1.7,'',null,'NaN',100000001])assert.throws(()=>validateInventoryAdjustment(qty),RangeError);
  assert.throws(()=>validateInventoryAdjustment(3,'bad'),RangeError);
});
test('inventory UI is valid JavaScript and backed by conditional update',()=>{
  const html=fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/inventory.html',import.meta.url),'utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match);
  new vm.Script(match[1],{filename:'inventory.html'});
  assert.match(match[1],/expected_inventory_qty: expected/);
  assert.match(match[1],/data-product-id/);
  assert.match(match[1],/inventory-groups/);
  const api=fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/admin/api.js',import.meta.url),'utf8');
  assert.match(api,/WHERE id = \? AND inventory_qty = \?/);
  assert.match(api,/groupProductInventory\(results \|\| \[\], links\)/);
});
