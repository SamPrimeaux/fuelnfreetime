import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderMerchCollectionShowcase, collectionShowcaseStyle } from "../packages/agentsam-merch/src/collection-showcase.js";

test("real catalog images generate hero-coordinated editorial showcase without inventing reverse views",()=>{
  const html=renderMerchCollectionShowcase({
    title:"Good Hours", description:"Limited selection",
    hero:{backgroundColor:"#101416",accentColor:"#00d9ea"},
    links:{productBase:"/products",shop:"/shop"},
    products:[
      {id:1,title:"Fuel Tee",slug:"fuel-tee",primary_image:"/media/tee-front.webp",price_cents:3500},
      {id:2,title:"Cap",slug:"cap",primary_image:"/media/cap.webp",price_cents:2000},
      {id:3,title:"Tumbler",slug:"tumbler",primary_image:"",price_cents:2400},
    ]
  });
  assert.match(html,/merch-showcase--editorial/);
  assert.match(html,/product--featured/);
  assert.match(html,/\/products\/fuel-tee/);
  assert.match(html,/\/media\/tee-front.webp/);
  assert.match(html,/Product photo pending/);
  assert.doesNotMatch(html,/back\.webp/);
  assert.match(html,/\$35\.00/);
});
test("safe portable product cards escape markup and require host routes",()=>{
  const html=renderMerchCollectionShowcase({
    title:"<script>alert(1)</script>",
    hero:{headline:"<img onerror=evil>",backgroundColor:"#f4f5f2"},
    products:[{id:7,title:"<img src=x>",slug:"javascript:alert(1)",primary_image:"javascript:alert(1)"}],
    links:{productBase:"//bad.example/products",shop:"javascript:bad"},
  });
  assert.match(html,/merch-showcase--minimal/);
  assert.doesNotMatch(html,/<script>|<img src=x>|href="javascript:|href="\/\/bad/);
  assert.doesNotMatch(html,/href="\/products/);
  assert.equal(collectionShowcaseStyle({hero:{backgroundColor:"#e9e0d0"}}).mode,"lifestyle");
});
test("storefront and TypeScript editor import the same packaged showcase",()=>{
  const page=readFileSync(new URL("../packages/heuristic-theme/storefront/collection.html",import.meta.url),"utf8");
  const store=readFileSync(new URL("../packages/heuristic-theme/storefront/js/store-collections.js",import.meta.url),"utf8");
  const sync=readFileSync(new URL("../scripts/sync-app-frontend.mjs",import.meta.url),"utf8");
  const editor=readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/collections/CollectionPresentation.tsx",import.meta.url),"utf8");
  assert.match(page,/\/js\/merch-showcase\.js/);
  assert.match(page,/\/css\/merch-showcase\.css/);
  assert.match(store,/AgentSamMerchShowcase\.renderMerchCollectionShowcase/);
  assert.doesNotMatch(store,/\\\$\{window\.AgentSamMerchHero/);
  assert.match(editor,/import \{ renderMerchCollectionShowcase \}/);
  assert.match(sync,/entryPoints: \[path\.join\(root, 'packages\/agentsam-merch\/src\/collection-showcase\.js'\)\]/);
});
