import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getRegistryPage, registryForAdmin } from '../apps/ecommerce-cms-agentsam/backend/cms/registry.js';

const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>readFileSync(path.join(root,p),'utf8');
const chrome=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
assert.ok(chrome,'Chrome required to verify contextual miniAgentSam');
const page=getRegistryPage('shop');
page.content_authority='cms-draft-linked';
page.sections=page.sections.map(s=>({...s,version:1,status:'draft'}));
const site=getRegistryPage('site');
const message='Time outside the ordinary.';
const shim=`<script>
window.__agentErrors=[];window.__writes=[];window.__chatCount=0;
window.addEventListener('error',e=>window.__agentErrors.push(e.message));
window.addEventListener('unhandledrejection',e=>window.__agentErrors.push(String(e.reason)));
window.renderShell=(_,html)=>document.body.insertAdjacentHTML('afterbegin',html);
window.adminFetch=async (url,options={})=>{
 if(url.endsWith('/registry'))return ${JSON.stringify(registryForAdmin())};
 if(url.endsWith('/pages/site'))return {page:${JSON.stringify(site)}};
 if(url.endsWith('/pages/shop'))return {seeded:false,page:${JSON.stringify(page)}};
 if(url.endsWith('/pages'))return {pages:[{slug:'shop',title:'Shop',live_route:'/shop'}]};
 if(url.includes('/sections/')&&options.method==='PUT'){window.__writes.push(JSON.parse(options.body));return {version:2};}
 throw Error('Unexpected API '+url);
};</script>`;
const probe=`<script>(async function(){
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function until(fn){for(let i=0;i<45;i++){const val=fn();if(val)return val;await sleep(125)}throw Error('Wait timeout')}
 try{
  const selected=await until(()=>document.getElementById('te-field-hero-headline'));
  const initialValue=selected.value;
  // Select the actual rendered heading. This supplies the correct field key
  // and anchors the mini composer to the canvas, not a generic section row.
  if(innerWidth<=900)document.querySelector('[data-mobile-pane="preview"]').click();
  const preview=document.getElementById('theme-preview');
  const heading=await until(()=>preview.contentDocument?.querySelector('[data-cms="headline"]'));
  heading.click();
  const portal=await until(()=>{const p=document.querySelector('[data-mini-agentsam]');return p&&!p.shadowRoot.querySelector('.composer').hidden?p:null});
  const mini=portal.shadowRoot;
  const initialVisible=!mini.querySelector('.composer').hidden;
  const beforeChatCount=window.__chatCount;
  const caption=document.getElementById('te-selected-path').textContent;
  const sourceRect=mini.querySelector('.outline').getBoundingClientRect();
  const initialComposerRect=mini.querySelector('.composer').getBoundingClientRect();
  const arrow=mini.querySelector('.send').textContent.trim();
  mini.querySelector('textarea').value='Rewrite the selected headline to sound more compelling.';
  mini.querySelector('.send').click();
  const review=await until(()=>document.querySelector('.agentsam-proposal'));
  const proposed=review.querySelector('.agentsam-proposal-text').value;
  const apply=review.querySelector('.agentsam-proposal-actions .is-primary');
  const localReviewExists=!!document.getElementById('te-agent-review');
  const beforeWrites=window.__writes.length;
  const beforeField=document.getElementById('te-field-hero-headline').value;
  const canApply=!apply.disabled;
  apply.click();
  const fieldAfter=document.getElementById('te-field-hero-headline').value;
  const dirty=document.getElementById('te-save-state').textContent;
  const afterApplyWrites=window.__writes.length;
  const sideAssistantOpen=document.body.classList.contains('agentsam-open');
  const previewCta=document.getElementById('theme-preview').contentDocument?.querySelector('[data-cms="ctaPrimary.label"]');
  if(previewCta){previewCta.click();await sleep(120);}
  const focusedGroups=[...document.querySelectorAll('.te-inspector-group__head h3')].map(el=>el.textContent.trim());
  document.getElementById('te-save').click();
  await until(()=>window.__writes.length===1);
  const miniRect=mini.querySelector('.composer').getBoundingClientRect();
  const result={initialValue,initialVisible,beforeChatCount,caption,composerVisible:true,localReviewExists,sideAssistantOpen,focusedGroups,sourceRect:{left:sourceRect.left,right:sourceRect.right,top:sourceRect.top,bottom:sourceRect.bottom},initialComposerRect:{left:initialComposerRect.left,right:initialComposerRect.right,top:initialComposerRect.top,bottom:initialComposerRect.bottom},arrow,proposed,canApply,beforeField,beforeWrites,fieldAfter,dirty,afterApplyWrites,savedWrites:window.__writes.length,saved:window.__writes[0],chatCount:window.__chatCount,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,composerRect:{left:miniRect.left,right:miniRect.right,top:miniRect.top,bottom:miniRect.bottom},errors:window.__agentErrors};
  const pre=document.createElement('pre');pre.id='mini-result';pre.textContent=JSON.stringify(result);document.body.append(pre);
 }catch(error){const pre=document.createElement('pre');pre.id='mini-result';pre.textContent=JSON.stringify({fatal:String(error),note:document.getElementById('te-note')?.textContent,errors:window.__agentErrors,html:document.getElementById('te-inspector-body')?.innerText?.slice(0,150)});document.body.append(pre);}
})()</script>`;
const template=file('apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html')
 .replace('<script src="/admin/js/shell.js"></script>',shim+'<script src="/admin/js/agentsam.js"></script>')
 .replace('</body>',probe+'</body>');
const assets={
 '/admin/js/agentsam.js':'apps/ecommerce-cms-agentsam/frontend/static/js/agentsam.js',
 '/admin/js/pages-shared.js':'apps/ecommerce-cms-agentsam/frontend/static/js/pages-shared.js',
 '/admin/js/portable-sections.js':'packages/theme-contract/runtime/portable-sections.js',
 '/admin/js/theme-preview-registry.js':'packages/theme-contract/runtime/theme-preview-registry.js',
 '/admin/js/theme-preview-runtime.js':'packages/fnf-theme/src/editor/preview-adapter.js',
 '/admin/js/theme-editor.js':'apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js',
 '/admin/js/theme-editor-mini-agentsam.mjs':'apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor-mini-agentsam.mjs',
 '/admin/brand/mini-agentsam-trigger.svg':'apps/ecommerce-cms-agentsam/frontend/static/brand/mini-agentsam-trigger.svg',
 '/admin/workbench/index.js':'packages/agentsam-workbench/src/index.js',
 '/admin/workbench/mini-agentsam.js':'packages/agentsam-workbench/src/mini-agentsam.js',
 '/admin/workbench/composer.js':'packages/agentsam-workbench/src/composer.js',
 '/admin/css/theme-editor.css':'apps/ecommerce-cms-agentsam/frontend/static/css/theme-editor.css',
 '/admin/css/console.css':'apps/ecommerce-cms-agentsam/frontend/static/css/console.css',
 '/admin/css/admin.css':'apps/ecommerce-cms-agentsam/frontend/static/css/admin.css',
 '/js/cms-hydrate.js':'packages/heuristic-theme/storefront/js/cms-hydrate.js',
};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url||'/', 'http://localhost').pathname;
 if(url==='/admin/theme-editor')return res.writeHead(200,{'content-type':'text/html'}).end(template);
 if(url==='/shop')return res.writeHead(200,{'content-type':'text/html'}).end(file('packages/heuristic-theme/storefront/shop.html'));
 if(url==='/api/admin/agentsam/chat'){
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=JSON.parse(raw);
  if(!body.context?.selected_resource?.id)return res.writeHead(400,{'content-type':'application/json'}).end('{"error":"Missing CMS selection"}');
  return res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({reply:message,conversation_id:'test-cms-chat'}));
 }
 if(assets[url])return res.writeHead(200,{'content-type':url.endsWith('.css')?'text/css':url.endsWith('.svg')?'image/svg+xml':'text/javascript'}).end(file(assets[url]));
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const url='http://127.0.0.1:'+server.address().port+'/admin/theme-editor?slug=shop';
 for(const width of [1440,390]){
 const {stdout:dom}=await exec(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=9000','--window-size='+width+',1000','--dump-dom',url],{timeout:60000,encoding:'utf8',maxBuffer:1<<22});
 const match=dom.match(/<pre id="mini-result">([^<]+)<\/pre>/);
 assert.ok(match,'Chrome did not complete miniAgentSam workflow at '+width+'px');
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
 console.log(JSON.stringify(result,null,2));
 assert.equal(result.fatal,undefined);
 assert.equal(result.composerVisible,true);
 assert.equal(result.initialVisible,true,'Selecting a CMS section must reveal contextual miniAgentSam beside the selected canvas element');
 assert.equal(result.beforeChatCount,0,'Selection must never send an AI request');
 assert.equal(result.arrow,'↑','Send must be an upward arrow');
 assert.ok(result.initialComposerRect.right>=result.sourceRect.left-10 && result.initialComposerRect.left<=result.sourceRect.right+10, 'Composer must anchor beside the selected canvas element');
 assert.ok(Math.abs(result.initialComposerRect.bottom-result.sourceRect.top)<150 || Math.abs(result.initialComposerRect.top-result.sourceRect.bottom)<150, 'Composer must appear near the selected canvas element');
 assert.match(result.caption,/hero.*headline/i);
 assert.equal(result.proposed,message);
 assert.equal(result.canApply,true);
 assert.equal(result.localReviewExists,false,'Theme inspector must not render a second proposal composer');
 assert.equal(result.sideAssistantOpen,true,'miniAgentSam proposal must open in the AgentSam Side Assistant');
 assert.ok(result.focusedGroups.includes('Buttons and links'),'CTA selection must expose button/link controls');
 assert.ok(!result.focusedGroups.includes('Media'),'CTA selection must not show unrelated media fields');
 assert.equal(result.beforeWrites,0);
 assert.equal(result.afterApplyWrites,0,'Only Save may persist a draft');
 assert.equal(result.beforeField,result.initialValue);
 assert.equal(result.fieldAfter,message);
 assert.match(result.dirty,/Unsaved changes/);
 assert.equal(result.savedWrites,1);
 assert.equal(result.saved.content.headline,message);
 assert.deepEqual(result.errors,[]);
 assert.ok(result.documentWidth<=result.viewport+2,'Editor must fit viewport without horizontal overflow');
 assert.ok(result.composerRect.left>=0 && result.composerRect.right<=result.viewport+2,'Composer must stay inside viewport');
 console.log('PASS '+width+'px: selected CMS headline → miniAgentSam → Side Assistant proposal → approve locally → explicit Save, no publish');
 }
}finally{server.close()}
