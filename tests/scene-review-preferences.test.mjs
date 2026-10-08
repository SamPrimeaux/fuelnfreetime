import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
import {handleSceneReview} from "../apps/ecommerce-cms-agentsam/backend/admin/scene-review.js";
import {resolveNavConfig} from "../apps/ecommerce-cms-agentsam/backend/lib/site-nav.js";

function mock(){
  let row={settings_json:JSON.stringify({homeTitle:"FNF",navItems:[{id:"home",label:"Home",href:"/",matchPrefixes:["/"],visible:true}],announcementText:"Original announcement"})};
  const cache=new Map();
  const env={
    DB:{prepare(sql){return {
      first:async()=>row,
      bind(value){return {run:async()=> {
        const parsed=JSON.parse(row.settings_json);
        parsed.sceneReview=JSON.parse(value);
        row.settings_json=JSON.stringify(parsed);
        return {meta:{changes:1}};
      }}}
    }}},
    CMS_CACHE:{get:async key=>cache.get(key)||null,put:async(key,val)=>{cache.set(key,val);},delete:async key=>{cache.delete(key);}},
    WEBSITE_ASSETS:{get:async key=>key==="cms/pages/bridge-fly/app.js"?{body:new Response("console.log('scene')").body}:null}
  };
  return {env,read:()=>JSON.parse(row.settings_json)};
}
async function run(env,path,opts={}){const url=new URL(path,"https://fuelnfreetime.com");return handleSceneReview(new Request(url,opts),env,url);}
test("review preview defaults to closed and no assets can be retrieved",async()=>{
  const {env}=mock();
  const page=await run(env,"/review/bridge-fly");
  assert.equal(page.status,404);
  assert.match(page.headers.get("x-robots-tag"),/noindex/);
  const asset=await run(env,"/review/bridge-fly/assets/app.js");
  assert.equal(asset.status,404);
  const admin=await run(env,"/api/admin/scene-review");
  assert.deepEqual((await admin.json()).enabled,false);
});
test("owner must set a strong password, and review activation preserves merchant settings",async()=>{
  const {env,read}=mock();
  const short=await run(env,"/api/admin/scene-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true,password:"short"})});
  assert.equal(short.status,400);
  const missing=await run(env,"/api/admin/scene-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true})});
  assert.equal(missing.status,400);
  const enabled=await run(env,"/api/admin/scene-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true,password:"a-strong-private-demo-password"})});
  assert.equal(enabled.status,200);
  assert.equal((await enabled.json()).assetPrivacyReady,false);
  const current=read();
  assert.equal(current.homeTitle,"FNF");
  assert.equal(current.announcementText,"Original announcement");
  assert.equal(current.sceneReview.enabled,true);
  assert.equal(current.sceneReview.passwordHash.length,64);
  assert(!JSON.stringify(current).includes("a-strong-private-demo-password"));
});
test("protected reviewer loads original R2 scene only after password and signed cookie",async()=>{
  const {env}=mock();
  await run(env,"/api/admin/scene-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:true,password:"a-strong-private-demo-password"})});
  const before=await run(env,"/review/bridge-fly/assets/app.js");
  assert.equal(before.status,401);
  const form=new URLSearchParams({password:"a-strong-private-demo-password"});
  const unlocked=await run(env,"/review/bridge-fly/unlock",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","cf-connecting-ip":"198.51.100.4"},body:form});
  assert.equal(unlocked.status,303);
  const cookie=unlocked.headers.get("set-cookie");
  assert.match(cookie,/HttpOnly/);
  assert.match(cookie,/Secure/);
  assert.match(cookie,/SameSite=Lax/);
  const permitted=await run(env,"/review/bridge-fly/assets/app.js",{headers:{cookie:cookie.split(";")[0]}});
  assert.equal(permitted.status,200);
  assert.match(await permitted.text(),/console.log/);
  assert.match(permitted.headers.get("cache-control"),/no-store/);
  const ownerPage=await run(env,"/review/bridge-fly",{headers:{cookie:cookie.split(";")[0]}});
  assert.equal(ownerPage.status,200);
  assert.match(await ownerPage.text(),/original Golden Gate flyover prototype/i);
  const traversal=await run(env,"/review/bridge-fly/assets/%2e%2e/app.js",{headers:{cookie:cookie.split(";")[0]}});
  assert.notEqual(traversal.status,200);
});
test("disabling review invalidates reviewer cookies and never enables storewide password",async()=>{
  const {env,read}=mock();
  const post=data=>run(env,"/api/admin/scene-review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  await post({enabled:true,password:"a-strong-private-demo-password"});
  const unlock=await run(env,"/review/bridge-fly/unlock",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({password:"a-strong-private-demo-password"})});
  const cookie=unlock.headers.get("set-cookie").split(";")[0];
  await post({enabled:false});
  assert.equal((await run(env,"/review/bridge-fly",{headers:{cookie}})).status,404);
  assert.equal(read().passwordProtection,undefined);
  await post({enabled:true});
  const old=await run(env,"/review/bridge-fly/assets/app.js",{headers:{cookie}});
  assert.equal(old.status,401);
});
test("existing public header consumes real persisted marquee preferences",()=>{
  const config=resolveNavConfig({
    announcementEnabled:true,announcementText:"Fuel hard · Live free",announcementHref:"/shop",
    announcementStyle:"marquee",announcementBgColor:"#121212",announcementTextColor:"#fdfdfd"
  });
  assert.deepEqual(config.announcement,{enabled:true,text:"Fuel hard · Live free",href:"/shop",
    style:"marquee",backgroundColor:"#121212",textColor:"#fdfdfd"});
  assert.equal(resolveNavConfig({announcementBgColor:"javascript:alert(1)"}).announcement.backgroundColor,"#161616");
});
test("preferences expose public crawler discovery without a parallel credential authority",()=>{
  const doc=readFileSync("apps/ecommerce-cms-agentsam/frontend/static/preferences.html","utf8");
  assert.match(doc,/id="prefs-assets-dialog"/);
  assert.match(doc,/data-pick-asset="nav"/);
  assert.match(doc,/data-pick-asset="social"/);
  assert.match(doc,/id="announcement-style"/);
  assert.match(doc,/robots\.txt/);
  assert.match(doc,/sitemap\.xml/);
  assert.match(doc,/site\.scrape/);
  assert.doesNotMatch(doc,/crawler-credential-form|data-credential-tab|X-Crawler-Signature/);
  assert.doesNotMatch(doc,/Create signature<\/button>/);
  for(const match of doc.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new Script(match[1]);
});
