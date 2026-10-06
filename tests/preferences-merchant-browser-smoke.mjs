/**
 * Real Chrome GUI smoke for merchant preferences.
 * A minimal auth-aware shell/API fixture is used; no production settings
 * or media assets are written by this test.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const exec=promisify(execFile);
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const assets=path.join(base,"dist/assets");
const browser=["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","/usr/bin/google-chrome","/usr/bin/chromium"].find(existsSync);
assert(browser,"Chrome is required for preferences merchant UX smoke");
const fixtures={
  settings:{homeTitle:"Fuel & Free Time",metaDescription:"Real projects, real stories",
    socialImageUrl:"",navLogoUrl:"",navLogoHeight:58,navBrandAccent:"#ff4500",navBrandAccentLight:"#E5A558",
    announcementEnabled:false,announcementText:"",announcementHref:"",announcementStyle:"static",
    announcementBgColor:"#161616",announcementTextColor:"#ffffff"},
  nav:{items:[{id:"home",label:"Home",href:"/",matchPrefixes:["/"],visible:true}]},
  domain:"fuelnfreetime.com"
};
const assetsFixture=[
{id:"logo",url:"/media/brand-logo.svg",filename:"FNF primary logo.svg",content_type:"image/svg+xml",folder:"brand"},
{id:"social",url:"/media/social-cover.svg",filename:"Campaign cover.svg",content_type:"image/svg+xml",folder:"brand"}
];
const stub='window.renderShell=function(route,html){document.body.insertAdjacentHTML("afterbegin",html)};'+
  'window.publishDockEdit=function(){};'+
  'window.adminFetch=async function(url,opts){'+
  'if(url.startsWith("/api/admin/media"))return {assets:'+JSON.stringify(assetsFixture)+'};'+
  'if(opts&&opts.method==="POST"){window.__prefsSaved=JSON.parse(opts.body).settings;return {settings:window.__prefsSaved,nav:'+JSON.stringify(fixtures.nav)+',domain:"fuelnfreetime.com"};}'+
  'return '+JSON.stringify(fixtures)+';};';
const probe='<script>(async function(){'+
  'var q=function(s){return document.querySelector(s)};'+
  'var wait=function(ms){return new Promise(r=>setTimeout(r,ms))};'+
  'try{await wait(350);'+
  'q("[data-pick-asset=social]").click();await wait(200);'+
  'var cardCount=document.querySelectorAll(".prefs-asset-tile").length;'+
  'document.querySelectorAll(".prefs-asset-tile")[1].click();'+
  'q("[data-pick-asset=nav]").click();await wait(200);'+
  'document.querySelectorAll(".prefs-asset-tile")[0].click();'+
  'q("#announcement-enabled").checked=true;'+
  'q("#announcement-text").value="Fuel hard · Live free";'+
  'q("#announcement-style").value="marquee";'+
  'q("#announcement-bg").value="#102030";'+
  'q("#announcement-color").value="#fafafa";'+
  'q("#announcement-style").dispatchEvent(new Event("change",{bubbles:true}));'+
  'q("#save-prefs-btn").click();await wait(250);'+
  'var state={title:document.title,cardCount:cardCount,social:q("#social-image-url").value,'+
  'logo:q("#nav-logo-url").value,navRows:document.querySelectorAll(".prefs-nav-row").length,'+
  'announcement:q("#announcement-preview").dataset.style,track:q("#announcement-preview__track")?.children.length||q(".prefs-announcement-preview__track").children.length,'+
  'saved:window.__prefsSaved,noOverflow:document.documentElement.scrollWidth<=innerWidth+1,'+
  'dialogClosed:!q("#prefs-assets-dialog").open,signatureButton:!!q("#create-signature-btn")};'+
  'var pre=document.createElement("pre");pre.id="prefs-qa";pre.textContent=JSON.stringify(state);document.body.appendChild(pre);'+
  '}catch(e){var pre=document.createElement("pre");pre.id="prefs-qa";pre.textContent=JSON.stringify({error:String(e)});document.body.appendChild(pre);}'+
  '})();</script>';
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url||"/","http://localhost").pathname;
 if(pathname==="/admin/js/shell.js"){res.writeHead(200,{"content-type":"application/javascript"}).end(stub);return;}
 if(pathname.startsWith("/media/")){res.writeHead(200,{"content-type":"image/svg+xml"}).end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"><rect width="300" height="150" fill="#111"/><text x="24" y="80" font-size="27" fill="#fff">FNF</text></svg>');return;}
 const relative=pathname==="/admin/preferences"?"admin/preferences.html":pathname.slice(1);
 const file=path.resolve(assets,relative);
 if(!file.startsWith(assets+path.sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return;}
 let body=readFileSync(file);
 if(relative.endsWith(".html"))body=Buffer.from(body.toString("utf8").replace("</body>",probe+"</body>"));
 res.writeHead(200,{"content-type":relative.endsWith(".css")?"text/css":relative.endsWith(".js")?"application/javascript":"text/html; charset=utf-8"}).end(body);
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
try{
 for(const width of [390,744,1440]){
  const url="http://127.0.0.1:"+server.address().port+"/admin/preferences";
  const {stdout}=await exec(browser,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
    "--virtual-time-budget=5500","--window-size="+width+",1000","--dump-dom",url],{timeout:60000,encoding:"utf8",maxBuffer:1<<24});
  const m=stdout.match(/<pre id="prefs-qa">([^<]+)<\/pre>/);
  assert(m,"Preferences interaction report missing at "+width);
  const state=JSON.parse(m[1].replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&lt;","<"));
  assert(!state.error,"Browser UI exception: "+state.error);
  assert.equal(state.cardCount,2);
  assert.equal(state.social,"/media/social-cover.svg");
  assert.equal(state.logo,"/media/brand-logo.svg");
  assert.equal(state.announcement,"marquee");
  assert.equal(state.saved?.announcementStyle,"marquee");
  assert.equal(state.saved?.announcementBgColor,"#102030");
  assert.equal(state.saved?.socialImageUrl,"/media/social-cover.svg");
  assert.equal(state.saved?.navLogoUrl,"/media/brand-logo.svg");
  assert.equal(state.navRows,1);
  assert.equal(state.dialogClosed,true);
  assert.equal(state.signatureButton,false);
  assert.equal(state.noOverflow,true,"Preferences overflows "+width+"px");
  console.log("PASS preferences "+width+"px: media selection → announcement preview → saved payload");
 }
} finally {server.close()}
