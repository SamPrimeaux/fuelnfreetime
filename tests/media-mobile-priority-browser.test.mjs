import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, existsSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => readFileSync(path.join(root, name), 'utf8');
const chrome = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome','/usr/bin/chromium'
].find(existsSync);
if (!chrome) throw new Error('Chrome unavailable');

const assets = Array.from({length: 4},(_,i)=>({
  id:i+1,filename:'product-image-'+(i+1)+'.svg',r2_key:'media/test-'+(i+1)+'.svg',
  url:'/mock-image.svg',content_type:'image/svg+xml',status:'ready',size_bytes:1400,
}));
const fixture = {ok:true,assets,counts:{images:216,videos:12,products:6},
  capabilities:{browser_preview:true,can_materialize_derivatives:false},
  albums:[{id:11,name:'Campaign gallery',asset_count:4,meta:{kind:'gallery'}},
    {id:12,name:'Product imagery',asset_count:3}],
  pagination:{page:1,page_size:48,total:234,pages:5,has_prev:false,has_next:true}};
const html = read('apps/ecommerce-cms-agentsam/frontend/static/content.html').replace(
  '<script src="/admin/js/shell.js"></script>',
  `<script>
   window.__errors=[];
   window.addEventListener('error', e=>window.__errors.push(e.message));
   window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
   window.adminFetch=async (url,options)=>{
     if(url.startsWith('/api/admin/media?')) return ${JSON.stringify(fixture)};
     if(url==='/api/admin/media/99') return {ok:true,asset:{id:99,filename:'direct-linked-image.svg',url:'/mock-image.svg',r2_key:'media/direct-linked-image.svg',content_type:'image/svg+xml',status:'ready',size_bytes:1400,folder:'images'}};
     if(url.startsWith('/api/admin/brand')) return {ok:true,company:{name:'Test'},roles:[],profile:{}};
     throw new Error('Unknown test route '+url);
   };
   window.renderShell=function(_route,body,opts){
      document.body.classList.add('console-theme');
      document.body.insertAdjacentHTML('beforeend',body);
      window.setTimeout(()=>opts?.onReady?.(),0);
   };
   </script>`
);
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1');
  const p = url.pathname;
  if(p==='/admin/content')return res.writeHead(200,{'content-type':'text/html'}).end(html);
  if(p==='/admin/media-kit/index.js')return res.writeHead(200,{'content-type':'text/javascript'}).end(`
    export const IMAGE_PREVIEW_PRESETS=[];
    export function getImagePreviewPreset(){return null;}
    export function previewStyleForPreset(){return '';}
    export function previewLabel(){return '';}
  `);
  if(p==='/admin/workbench/media-asset-workbench.js')return res.writeHead(200,{'content-type':'text/javascript'}).end(read('packages/agentsam-workbench/src/media-asset-workbench.js'));
  if(p==='/admin/js/media-library.js'||p==='/admin/js/brand-workspace.js')return res.writeHead(200,{'content-type':'text/javascript'}).end(read('apps/ecommerce-cms-agentsam/frontend/static/js/'+path.basename(p)));
  if(p.startsWith('/admin/css/'))return res.writeHead(200,{'content-type':'text/css'}).end(read('apps/ecommerce-cms-agentsam/frontend/static/css/'+path.basename(p)));
  if(p==='/mock-image.svg')return res.writeHead(200,{'content-type':'image/svg+xml'}).end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#bbb"/></svg>');
  res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const portFinder=http.createServer();
await new Promise(resolve=>portFinder.listen(0,'127.0.0.1',resolve));
const port=portFinder.address().port;
await new Promise(resolve=>portFinder.close(resolve));
const dataDir=mkdtempSync(path.join(tmpdir(),'fnf-media-mobile-'));
const browser=spawn(chrome,['--headless=new','--no-first-run','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--remote-debugging-port='+port,'--remote-allow-origins=*','--user-data-dir='+dataDir,'about:blank'],{stdio:'ignore'});
let socket;
try{
  let target;
  for(let i=0;i<50&&!target;i++){
    await new Promise(r=>setTimeout(r,170));
    try{target=(await(await fetch('http://127.0.0.1:'+port+'/json')).json()).find(item=>item.type==='page');}catch{}
  }
  assert.ok(target?.webSocketDebuggerUrl,'CDP was not available');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',({data})=>{
    const payload=JSON.parse(data);const entry=pending.get(payload.id);
    if(!entry)return;
    pending.delete(payload.id);
    payload.error?entry.reject(new Error(payload.error.message)):entry.resolve(payload.result||{});
  });
  const c=(method,params={})=>new Promise((resolve,reject)=>{
    const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));
  });
  const evaluate=async expression=>{
    const value=await c('Runtime.evaluate',{expression,returnByValue:true});
    if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result?.value;
  };
  await c('Page.enable');await c('Runtime.enable');
  for(const width of [320,360,390,430,744,834,900,1440]){
    await c('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:2,mobile:width<=900});
    await c('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/admin/content?w='+width});
    let metrics;
    for(let i=0;i<45;i++){
      await new Promise(r=>setTimeout(r,140));
      metrics=await evaluate(`location.search==='?w=${width}' && document.querySelectorAll('#media-grid .media-item[data-id]').length===4 ? (()=>{
        const top=document.getElementById('content-view-library').getBoundingClientRect().top;
        const grid=document.getElementById('media-grid').getBoundingClientRect();
        const filters=document.getElementById('media-advanced-controls');
        return {width:innerWidth,docWidth:document.documentElement.scrollWidth,gridOffset:grid.top-top,
          gridCards:document.querySelectorAll('#media-grid .media-item[data-id]').length,
          gridColumns:getComputedStyle(document.getElementById('media-grid')).gridTemplateColumns.split(' ').length,
          filtersHidden:getComputedStyle(filters).display==='none',
          filtersToggleVisible:getComputedStyle(document.getElementById('media-filter-toggle')).display!=='none',
          uploadVisible:document.getElementById('media-upload-btn').getBoundingClientRect().width>20,
          galleryVisible:document.getElementById('media-gallery-new').getBoundingClientRect().width>20,
          dropHidden:getComputedStyle(document.getElementById('media-drop')).display==='none',
          heights:Object.fromEntries(['.media-lib-toolbar','.media-lib-folders','.media-albums-head','.media-albums','.media-pagination-top','#media-batch-bar','#media-drop'].map(selector=>[selector,Math.round(document.querySelector(selector)?.getBoundingClientRect().height||0)])), errors:window.__errors};})() : null;`);
      if(metrics)break;
    }
    assert.ok(metrics,'Page failed to render media cards at '+width);
    assert.equal(metrics.width,width);
    assert.equal(metrics.gridCards,4);
    assert.ok(metrics.docWidth<=width+2,'Horizontal overflow: '+JSON.stringify(metrics));
    assert.deepEqual(metrics.errors,[],'JavaScript errors at '+width);
    assert.ok(metrics.uploadVisible&&metrics.galleryVisible,'Primary actions missing');
    const createVisible = await evaluate(`getComputedStyle(document.querySelector('.media-album-create-mobile')).display!=='none'`);
    assert.equal(createVisible,width<=900,'Album creation should remain available on every viewport');
    if(width<=900){
      assert.ok(metrics.gridOffset<355,'Must expose assets within first compact panel: '+JSON.stringify(metrics));
      assert.equal(metrics.filtersHidden,true);
      assert.equal(metrics.filtersToggleVisible,true);
      assert.equal(metrics.dropHidden,true);
      await evaluate(`document.getElementById('media-filter-toggle').click();`);
      const shown=await evaluate(`getComputedStyle(document.getElementById('media-advanced-controls')).display`);
      assert.equal(shown,'grid','Filters did not open');
      await evaluate(`document.getElementById('media-kind-filter').value='image';document.getElementById('media-kind-filter').dispatchEvent(new Event('change',{bubbles:true}));`);
      const active=await evaluate(`document.getElementById('media-filter-toggle').textContent`);
      assert.match(active,/\(1\)/,'Filter count did not update');
      await evaluate(`document.querySelector('[data-media-album-create]').click()`);
      const dialogOpened=await evaluate(`document.getElementById('media-album-dialog').open`);
      assert.equal(dialogOpened,true,'Creating a new album should open the actual form');
      if(width===390){
        const mobileDetail = await evaluate(`(()=>{document.getElementById('media-album-dialog').close();document.querySelector('#media-grid .media-item[data-id]').click();return {detail:!document.getElementById('media-detail-page').hidden,docWidth:document.documentElement.scrollWidth,viewport:innerWidth,stageWidth:Math.round(document.getElementById('media-drawer-preview-shell').getBoundingClientRect().width),inspectorWidth:Math.round(document.querySelector('.media-workspace-settings').getBoundingClientRect().width)}})()`);
        assert.equal(mobileDetail.detail,true,'Mobile selection must open the dedicated page');
        assert.ok(mobileDetail.docWidth <= mobileDetail.viewport+2, 'Mobile image-detail must not overflow viewport: '+JSON.stringify(mobileDetail));
        assert.ok(mobileDetail.stageWidth > 220, 'Mobile image stage must remain large enough to inspect');
      }
    }else{
      assert.equal(metrics.filtersToggleVisible,false);
      assert.equal(metrics.filtersHidden,false);
    }
    if (width === 1440) {
      const assistant = await evaluate(`(()=>{
        document.querySelector('#media-grid .media-item[data-id]').click();
        const bar=document.querySelector('#media-agent-workbench .media-agent');
        return { visible:bar&&!bar.hidden, detailPage:!document.getElementById('media-detail-page').hidden, url:location.search, overlay:document.querySelector('.media-drawer-backdrop'),
          commentEnabled:!bar.querySelector('[data-media-tool="comment"]').disabled,
          workspaceCols:getComputedStyle(document.querySelector('.media-workspace-body')).gridTemplateColumns.split(' ').length,
          imagePanelWidth:Math.round(document.querySelector('.media-workspace-canvas').getBoundingClientRect().width),
          settingsPanelWidth:Math.round(document.querySelector('.media-workspace-settings').getBoundingClientRect().width),
          markupDisabled:bar.querySelector('[data-media-tool="markup"]').disabled,
          removeBgDisabled:bar.querySelector('[data-media-tool="remove-bg"]').disabled };
      })()`);
      assert.equal(assistant.visible,true,'miniAgentSam should appear for every selected image');
      assert.equal(assistant.detailPage,true,'selected asset must open dedicated detail page');
      assert.match(assistant.url,/asset=1/,'asset deep link must reflect current image');
      assert.equal(assistant.overlay,null,'the old overlay/backdrop must be removed');
      const details = await evaluate(`({ tabsHidden:getComputedStyle(document.querySelector('.content-product-tabs')).display==='none', libraryHidden:getComputedStyle(document.getElementById('content-view-library')).display==='none', backLink:!!document.getElementById('media-detail-back') })`);
      assert.equal(details.tabsHidden,true,'Asset detail must replace media library as a page, not overlay it');
      assert.equal(details.libraryHidden,true,'Media library must not remain visible behind detail');
      assert.equal(details.backLink,true,'Dedicated image page needs back-to-library navigation');
      assert.equal(assistant.workspaceCols,2,'Desktop asset detail should show a two-column canvas and inspector');
      assert.ok(assistant.imagePanelWidth>420,'Media preview must have a useful editing surface: '+JSON.stringify(assistant));
      assert.ok(assistant.settingsPanelWidth>260,'Inspector needs an independent settings pane: '+JSON.stringify(assistant));
      assert.equal(assistant.commentEnabled,true,'SVG images should still support comments');
      assert.match(read('apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js'), /surface: "content-library"/);
      assert.equal(assistant.markupDisabled,true,'vector source cannot silently rasterize into an editable original');
      assert.equal(assistant.removeBgDisabled,true,'unsupported background removal must remain unavailable');
      const back = await evaluate(`(()=>{document.getElementById('media-detail-back').click(); const trigger=document.querySelector('[data-media-actions="1"]'); trigger.click(); const menu=trigger.closest('.media-item').querySelector('.media-card-menu'); return {returned:!document.body.classList.contains('media-detail-active'), url:location.search, menuOpen:!menu.hidden, expanded:trigger.getAttribute('aria-expanded')};})()`);
      assert.equal(back.returned,true,'Back must restore the media library without a modal');
      assert.doesNotMatch(back.url,/asset=/,'Back must clear detail deep link');
      assert.equal(back.menuOpen,true,'Three-dot menu must open on its own card');
      assert.equal(back.expanded,'true','Three-dot menu must expose accessibility state');
      const fromMenu = await evaluate(`(()=>{document.querySelector('[data-media-action="view"]').click();return {detail:!document.getElementById('media-detail-page').hidden,url:location.search};})()`);
      assert.equal(fromMenu.detail,true,'View image menu action must open dedicated page');
      assert.match(fromMenu.url,/asset=1/,'View image menu action must update shareable URL');
      await evaluate(`history.back()`);
      for(let retry=0;retry<15;retry++){if(await evaluate(`!document.body.classList.contains('media-detail-active')`))break; await new Promise(done=>setTimeout(done,120));}
      assert.equal(await evaluate(`document.body.classList.contains('media-detail-active')`),false,'Browser Back should return to gallery');
    }
    if(width===1440){
      await c('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/admin/content?asset=99'});
      let direct=null;
      for(let attempt=0;attempt<40;attempt++){
        await new Promise(done=>setTimeout(done,120));
        direct=await evaluate(`!document.getElementById('media-detail-page')?.hidden && document.getElementById('media-drawer-title')?.textContent==='direct-linked-image.svg' ? {asset:document.getElementById('media-drawer-title').textContent,url:location.search} : null`);
        if(direct)break;
      }
      assert.ok(direct,'Direct image link must load an asset outside the initial gallery page');
      assert.match(direct.url,/asset=99/);
    }
    console.log('PASS',width+'px','grid at +'+Math.round(metrics.gridOffset)+'px','cards '+metrics.gridCards);
  }
}finally{
  if(socket?.readyState===1)socket.close();
  await new Promise(resolve=>{
    if(browser.exitCode!==null)return resolve();
    browser.once('exit',resolve);browser.kill('SIGTERM');setTimeout(resolve,1300).unref();
  });
  await new Promise(resolve=>server.close(resolve));
  try{rmSync(dataDir,{recursive:true,force:true,maxRetries:9,retryDelay:150});}catch{}
}
