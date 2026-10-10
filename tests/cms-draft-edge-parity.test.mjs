import test from "node:test";
import assert from "node:assert/strict";
import {loadEdgeHydrationContext, applyCmsSlotValue} from "../apps/ecommerce-cms-agentsam/backend/cms/edge-hydrate.js";

const published={
 site:{slug:"site",sections:[{key:"header",content:{background:"#fdfdfd",brand:"Published logo",nav:{link:"/shop"}}}]},
 shop:{slug:"shop",sections:[{key:"hero",content:{backgroundImage:"/media/live-hero.webp",title:"Published hero"}}]}
};
const draft={
 site:{slug:"site",sections:[{key:"header",content:{background:"#171717",brand:"Draft logo",nav:{link:"/shop"}}}]},
 shop:{slug:"shop",sections:[{key:"hero",content:{backgroundImage:"/media/draft-hero.webp",title:"Draft hero"}}]}
};

test("published and private draft use the same named HTML slot map without mixing revisions",async()=>{
 const env={};
 const reads=[];
 const fetchFor=(pages)=>async(_env,slug)=>{reads.push(slug);return pages[slug];};
 const live=await loadEdgeHydrationContext(env,"shop",{loadPage:fetchFor(published)});
 const preview=await loadEdgeHydrationContext(env,"shop",{preview:true,loadPage:fetchFor(draft)});
 assert.deepEqual(reads,["site","shop","site","shop"]);
 assert.equal(live.hydrated,true);assert.equal(preview.hydrated,true);
 assert.equal(live.sectionsByKey.header.background,"#fdfdfd");
 assert.equal(preview.sectionsByKey.header.background,"#171717");
 assert.equal(live.sectionsByKey.hero.title,"Published hero");
 assert.equal(preview.sectionsByKey.hero.title,"Draft hero");
 assert.equal(published.site.sections[0].content.brand,"Published logo");
});
test("old annotated HTML keeps attributes, classes, styles and media while slots are editable",()=>{
 const attrs=new Map([["data-cms-attr","style.backgroundImage"],["class","hero hero--legacy"],["style","color: white; padding: 12px; background-image: url('/original.jpg')"]]);
 const element={
  getAttribute(name){return attrs.get(name)||null;},
  setAttribute(name,value){attrs.set(name,value);},
  setInnerContent(){throw Error("Only image style should be updated");}
 };
 assert.equal(applyCmsSlotValue(element,"hero.backgroundImage",{hero:{backgroundImage:"/media/draft-hero.webp"}}),true);
 assert.equal(attrs.get("class"),"hero hero--legacy");
 assert.match(attrs.get("style"),/color: white/);
 assert.match(attrs.get("style"),/padding: 12px/);
 assert.match(attrs.get("style"),/draft-hero.webp/);
 assert.doesNotMatch(attrs.get("style"),/original.jpg/);
});
