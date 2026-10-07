import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=name=>readFileSync(path.join(root,name),'utf8');
const chrome=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
assert.ok(chrome,'Chrome required for real miniAgentSam media test');
const markup=`<!doctype html><html lang="en"><head><title>Media miniAgentSam acceptance</title></head>
<body class="media-detail-active"><header><div class="console-topbar-actions"></div></header>
<section id="media-detail-page"><div id="media-drawer-preview" data-agentsam-media-id="677" data-agentsam-media-filename="fnf-burn-it-gt-backprint-dark-v1.png"><img src="/mock-image.svg" alt="FNF art"></div></section>
<script>window.__sent=null;window.openAgentsamDrawer=()=>{};window.sendAgentsamMessage=async(prompt,{context})=>{window.__sent={prompt,context};return {reply:'Review complete'};};</script>
<script src="/admin/js/inspector.js"></script>
<script>(async function(){
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 let result;
 try{
   let button;
   for(let i=0;i<45;i++){
     button=document.querySelector('[data-inspect-toggle]');
     if(button && !button.disabled)break;
     await wait(80);
   }
   if(!button || button.disabled)throw Error('Top-right Inspect not available on selected media image');
   button.click();
   let composer;
   for(let i=0;i<35;i++){
     const portal=document.querySelector('[data-mini-agentsam]');
     composer=portal?.shadowRoot?.querySelector('.composer');
     if(composer && !composer.hidden)break;
     await wait(80);
   }
   if(!composer || composer.hidden)throw Error('Real miniAgentSam did not open from top-right Inspect');
   const portal=document.querySelector('[data-mini-agentsam]');
   const input=portal.shadowRoot.querySelector('textarea');
   const arrow=portal.shadowRoot.querySelector('button.send').textContent.trim();
   input.value='Review this art for a storefront product';
   portal.shadowRoot.querySelector('button.send').click();
   for(let i=0;i<30 && !window.__sent;i++)await wait(90);
   result={enabled:!button.disabled,composer:!composer.hidden,arrow,sent:window.__sent,label:button.getAttribute('aria-label'),fakePanel:!!document.querySelector('.media-agent-compose')};
 }catch(error){result={error:String(error)};}
 const pre=document.createElement('pre');pre.id='media-agent-result';pre.textContent=JSON.stringify(result);document.body.append(pre);
})()</script></body></html>`;
const paths={
 '/admin/js/inspector.js':'apps/ecommerce-cms-agentsam/frontend/inspector.js',
 '/admin/workbench/index.js':'packages/agentsam-workbench/src/index.js',
 '/admin/workbench/mini-agentsam.js':'packages/agentsam-workbench/src/mini-agentsam.js',
 '/admin/workbench/composer.js':'packages/agentsam-workbench/src/composer.js',
 '/admin/workbench/media-asset-workbench.js':'packages/agentsam-workbench/src/media-asset-workbench.js',
};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url||'/', 'http://localhost');
 if(url.pathname==='/admin/content')return res.writeHead(200,{'content-type':'text/html'}).end(markup);
 if(url.pathname==='/mock-image.svg')return res.writeHead(200,{'content-type':'image/svg+xml'}).end('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#eee"/></svg>');
 if(paths[url.pathname])return res.writeHead(200,{'content-type':'text/javascript'}).end(source(paths[url.pathname]));
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const url=`http://127.0.0.1:${server.address().port}/admin/content?asset=677`;
 const {stdout:dom}=await promisify(execFile)(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=6500','--window-size=1220,850','--dump-dom',url],{timeout:45000,encoding:'utf8',maxBuffer:1<<22});
 const match=dom.match(/<pre id="media-agent-result">([^<]+)<\/pre>/);
 assert.ok(match,'Chrome did not complete media miniAgentSam fixture');
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
 assert.equal(result.error,undefined,JSON.stringify(result));
 assert.equal(result.enabled,true);
 assert.equal(result.composer,true);
 assert.equal(result.arrow,'↑');
 assert.equal(result.fakePanel,false);
 assert.equal(result.sent.context.annotation.id,'677');
 assert.equal(result.sent.context.annotation.type,'media_asset');
 assert.equal(result.sent.context.annotation.surface,'content-library');
 assert.match(result.sent.prompt,/Review this art/);
 console.log('PASS: top-right real miniAgentSam opens on selected media image and sends media-specific annotation context');
}finally{server.close()}
