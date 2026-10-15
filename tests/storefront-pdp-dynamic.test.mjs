import test from "node:test";
import assert from "node:assert/strict";
import {
 getProductOptions,resolveProductVariant,isOrderable,sizeAvailable,sizeExists,
 imagesForColor,
} from "../packages/heuristic-theme/storefront/js/product-options.mjs";

const sizes=["2XL","3XL","L","M","S","XL"];
const colors=["Ash","Black","Bone","Charcoal","Forest","Navy","Moss","Clay",
  "Sand","Stone","Slate","Wine","Olive","Steel","Heather"];
const variants=colors.flatMap((color,ci)=>sizes.map((size,si)=>({
 id:ci*6+si+1,color,size,price_cents:3499,inventory_qty:0,
 available:true,fulfillment:"supplier",available_qty:null
})));

test("ninety linked supplier variants project to 15 unique colors and six sizes",()=>{
 const o=getProductOptions(variants);
 assert.equal(o.count,90);assert.equal(o.colors.length,15);
 assert.deepEqual(o.sizes,["S","M","L","XL","2XL","3XL"]);
 assert.ok(variants.every(v=>isOrderable(v)));
});

test("selected color and size preserve the exact local variant ID",()=>{
 assert.equal(resolveProductVariant(variants,"Black","XL").id,12);
 assert.ok(sizeAvailable(variants,"Black","XL"));
 assert.ok(sizeExists(variants,"Ash","XL"));
 assert.ok(sizeExists(variants,"","XL"),"sizes exist before color is selected");
 assert.ok(sizeAvailable(variants,"","XL"),"size-first selection remains possible");
 assert.equal(resolveProductVariant(variants,"Black",""),null);
 assert.equal(resolveProductVariant(variants,"","M"),null);
});

test("supplier XXL labels appear uniformly as 2XL without changing variant ID",()=>{
 const rows=[{id:71,color:"Navy",size:"XXL",available:true,inventory_qty:0}];
 assert.deepEqual(getProductOptions(rows).sizes,["2XL"]);
 assert.equal(resolveProductVariant(rows,"Navy","2XL").id,71);
});

test("stock-managed inventory is different from linked supplier availability",()=>{
 assert.equal(isOrderable({available:false,inventory_qty:20}),false);
 assert.equal(isOrderable({available:true,inventory_qty:0,fulfillment:"supplier"}),true);
 assert.equal(isOrderable({inventory_qty:2}),true);
 assert.equal(isOrderable({inventory_qty:0}),false);
});

test("hat with no sizes or variants renders no size selector and cannot be ordered",()=>{
 const opts=getProductOptions([]);
 assert.equal(opts.hasColors,false);assert.equal(opts.hasSizes,false);
 assert.equal(resolveProductVariant([]),null);
 const one=[{id:8,size:"",color:"",available:true,inventory_qty:1}];
 assert.equal(resolveProductVariant(one).id,8);
});

test("color image associations prefer merchant product photo over supplier reference",()=>{
 const p={images:[{url:"/media/black.png",color:"Black"},
   {url:"/media/detail.png"}],color_images:[
   {url:"https://provider.test/ash.png",color:"Ash",source:"supplier_reference"},
   {url:"https://provider.test/black.png",color:"Black",source:"supplier_reference"}]};
 assert.equal(imagesForColor(p,"Black").images[0].url,"/media/black.png");
 assert.equal(imagesForColor(p,"Black").reference,false);
 assert.equal(imagesForColor(p,"Ash").images[0].url,"https://provider.test/ash.png");
 assert.equal(imagesForColor(p,"Ash").reference,true);
 assert.equal(imagesForColor(p,"Unknown").images[0].url,"/media/black.png");
});
