import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {imagesForColor} from "../packages/heuristic-theme/storefront/js/product-options.mjs";
import {cartTotals,changeCartLine,cartLineLabel} from "../packages/heuristic-theme/storefront/js/cart-model.mjs";
import {resolveStorefrontPath} from "../apps/ecommerce-cms-agentsam/backend/lib/routes.js";
import {checkoutUrls} from "../apps/ecommerce-cms-agentsam/backend/store/stripe.js";
const line={variant_id:20,product_id:12,slug:"hoodie",title:"Classic Hoodie",size:"M",color:"Ash",qty:2,price_cents:3499,image:"/media/hoodie.png"};
test("one basket model preserves real variant IDs, colors, sizing and cents",()=>{
  const list=[line];
  assert.deepEqual(cartTotals(list),{count:2,subtotal_cents:6998});
  assert.equal(cartLineLabel(line),"Ash · Size M");
  const incremented=changeCartLine(list,0,"inc");
  assert.equal(incremented[0].variant_id,20);
  assert.equal(incremented[0].qty,3);
  assert.equal(list[0].qty,2,"original state remains immutable");
  assert.deepEqual(changeCartLine([line],0,"remove"),[]);
  assert.deepEqual(changeCartLine([line],4,"remove"),list);
});
test("quantity limits and removing last item are deterministic",()=>{
  assert.equal(changeCartLine([{...line,qty:10}],0,"inc")[0].qty,10);
  assert.deepEqual(changeCartLine([{...line,qty:1}],0,"dec"),[]);
  assert.equal(cartTotals([]).count,0);
});
test("checkout is a stable route and the previous cart route remains compatible",()=>{
  for(const route of ["/checkout","/checkout/","/cart","/pages/cart"])assert.equal(resolveStorefrontPath(route),"/cart.html");
  const urls=checkoutUrls(new Request("https://store.example.com/api/store/checkout/session"));
  assert.equal(urls.cancel,"https://store.example.com/checkout?cancelled=1");
});
test("drawer is installed once through shared header, not duplicated per-page",()=>{
  const root=readFileSync("packages/heuristic-theme/storefront/js/store-shell.js","utf8");
  const drawer=readFileSync("packages/heuristic-theme/storefront/js/store-drawer.mjs","utf8");
  const cart=readFileSync("packages/heuristic-theme/storefront/cart.html","utf8");
  assert.match(root,/import\("\.\/store-drawer\.mjs"\)/);
  assert.match(root,/data-cart-open/);
  assert.match(drawer,/role="dialog" aria-modal="true"/);
  assert.match(drawer,/fnf:cart-added/);
  assert.match(cart,/id="fnf-footer-mount"/);
  assert.doesNotMatch(cart,/powered by Stripe/i);
  assert.doesNotMatch(cart,/Shipping milestone unlocked/);
});

test("color gallery shows both supplier references without mixing another color",()=>{
  const product={images:[{url:"/merchant-black.jpg",color:"Black"}],color_images:[
    {url:"https://catalog.example/ash-front.jpg",color:"Ash",source:"supplier_reference"},
    {url:"https://catalog.example/ash-back.jpg",color:"Ash",source:"supplier_reference"}
  ]};
  const chosen=imagesForColor(product,"Ash");
  assert.equal(chosen.reference,true);
  assert.deepEqual(chosen.images.map(x=>x.url),[
    "https://catalog.example/ash-front.jpg","https://catalog.example/ash-back.jpg"
  ]);
  assert.deepEqual(imagesForColor(product,"Black").images.map(x=>x.url),["/merchant-black.jpg"]);
});
