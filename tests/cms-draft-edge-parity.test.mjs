import test from "node:test";
import assert from "node:assert/strict";
import {loadEdgeHydrationContext, applyCmsSlotValue, CmsSectionScopeHandler, CmsSlotHandler} from "../apps/ecommerce-cms-agentsam/backend/cms/edge-hydrate.js";
import {transformStorefrontHtml} from "../apps/ecommerce-cms-agentsam/backend/cms/html-rewriter.js";
import {canReadCmsDraft} from "../apps/ecommerce-cms-agentsam/backend/cms/api.js";

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

test("legacy section-relative HTML slots resolve without replacing its classes or layout",()=>{
 const scope={stack:[]},section=new CmsSectionScopeHandler(scope);
 const slots=new CmsSlotHandler({header:{title:"Ready to ride"},hero:{title:"Original editorial scene"}},scope);
 const captured=[];
 const element=(attrs)=>({
  getAttribute(k){return attrs[k]??null;},
  setInnerContent(value){captured.push(value);},
  onEndTag(fn){this.end=fn;},
  end(){},
 });
 const header=element({"data-cms-section":"header",class:"old-header old-glass"});
 const hero=element({"data-cms-section":"hero",class:"original-shape"});
 section.element(header);
 slots.element(element({"data-cms":"title","data-cms-attr":"textContent"}));
 section.element(hero);
 slots.element(element({"data-cms":"title","data-cms-attr":"textContent"}));
 hero.end();
 slots.element(element({"data-cms":"title","data-cms-attr":"textContent"}));
 header.end();
 assert.deepEqual(captured,["Ready to ride","Original editorial scene","Ready to ride"]);
 assert.deepEqual(scope.stack,[]);
 assert.equal(header.getAttribute("class"),"old-header old-glass");
 assert.equal(hero.getAttribute("class"),"original-shape");
});

test("preview HTML rejects unauthenticated requests without hydration or shared caching",async()=>{
 const response=new Response("<!doctype html><h1>Public scene</h1>",{headers:{"content-type":"text/html"}});
 const preview=await transformStorefrontHtml(response,{}, "shop",new Request("https://test.invalid/shop?preview=1"));
 assert.equal(preview.status,401);
 assert.match(preview.headers.get("cache-control"),/no-store/);
 assert.doesNotMatch(await preview.text(),/Public scene/);
});

test("preview requires canonical site and page ownership in the same account",async()=>{
 const visited=[];
 const env={DB:{prepare(sql){
   return {bind(...args){
     visited.push(args);
     return {first:async()=>args[1]==="site"?{id:"owned-site"}:null};
   }};
 }}};
 assert.equal(await canReadCmsDraft(env,"shop","acct_demo"),false);
 assert.deepEqual(visited,[["acct_demo","site"],["acct_demo","shop"]]);
 assert.equal(await canReadCmsDraft(env,"shop",null),false);
 const second={DB:{prepare(){
  return {bind(){return {first:async()=>({id:"owned"})}}};
 }}};
 assert.equal(await canReadCmsDraft(second,"shop","acct_demo"),true);
});
