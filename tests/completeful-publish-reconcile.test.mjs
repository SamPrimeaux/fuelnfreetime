import assert from "node:assert/strict";
import test from "node:test";
import { compareSupplierLinkToDraft } from "../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js";
import { inspectMockupPixels } from "../apps/ecommerce-cms-agentsam/backend/completeful/mockup-renderer.js";

const front="front-id", back="back-id";
const draft = {
  selected_variant_ids:["black","silver","white"],
  print_location_ids:[front,back],
  placement:{ sides:{
    [front]: { original_media_asset_id:760, prepared_media_asset_id:827 },
    [back]: { original_media_asset_id:761, prepared_media_asset_id:825 },
  } },
};
const link = {
  completeful_store_product_id:"saved-supplier-product",
  selection_json:JSON.stringify({variant_ids:["black","silver","white"],print_location_ids:[front]}),
};
test("existing one-sided supplier product cannot certify a revised front/back artwork draft",()=>{
  const result = compareSupplierLinkToDraft(draft,link);
  assert.equal(result.ok,false);
  assert.equal(result.code,"supplier_print_locations_changed");
  assert.deepEqual(result.saved_locations,[front]);
  assert.deepEqual(result.requested_locations,[front,back]);
  assert.match(result.error,/older print layout/);
});
test("old product links lacking location receipts cannot silently certify both sides",()=>{
  const result = compareSupplierLinkToDraft(draft,{...link,
    selection_json:JSON.stringify({variant_ids:draft.selected_variant_ids})});
  assert.equal(result.code,"supplier_print_locations_changed");
});
test("same supplier mapping is reusable without making a second Completeful product",()=>{
  const result = compareSupplierLinkToDraft(draft,{...link,
    selection_json:JSON.stringify({variant_ids:draft.selected_variant_ids,print_location_ids:[back,front]})});
  assert.equal(result.ok,true);
});
test("changing selected supplier variants after link creation requires reconciliation",()=>{
  const result = compareSupplierLinkToDraft(draft,{...link,
    selection_json:JSON.stringify({variant_ids:["black"],print_location_ids:[front,back]})});
  assert.equal(result.code,"supplier_selection_changed");
});
test("a successful supplier API render remains pending visual approval",()=>{
  const bytes = new Uint8Array(64);
  const view=new DataView(bytes.buffer);
  view.setUint32(16,1800);view.setUint32(20,1800);
  const result = inspectMockupPixels(bytes,"image/png");
  assert.deepEqual(result,{width:1800,height:1800,quality:"needs_visual_review",approval:"pending"});
  view.setUint32(16,1);view.setUint32(20,1);
  assert.equal(inspectMockupPixels(bytes,"image/png").quality,"low_resolution_needs_review");
  view.setUint32(16,0);
  assert.throws(()=>inspectMockupPixels(bytes,"image/png"),/mockup_invalid_dimensions/);
});
