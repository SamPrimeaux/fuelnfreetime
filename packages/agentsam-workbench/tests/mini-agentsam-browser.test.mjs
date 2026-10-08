import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const source = (relative) => readFileSync(path.join(root, relative), 'utf8');

test('miniAgentSam stays compact on focus and expands tools only by explicit action', { skip: !chrome }, async () => {
  const html = '<!doctype html><html><body><div id="target" style="position:absolute;left:260px;top:180px;width:180px;height:50px">Target</div><script type="module" src="/fixture.js"></script></body></html>';
  const fixture = [
    "import { createMiniAgentSam } from '/mini-agentsam.js';",
    "const wait=ms=>new Promise(r=>setTimeout(r,ms));",
    "const calls=[];const proposals=[];",
    "const mini=createMiniAgentSam({send:async({prompt,resource})=>{calls.push({prompt,resource});if(prompt==='fail')throw Error('Temporary request failure');return {reply:'Suggested copy'};},onResult:value=>proposals.push(value)});",
    "const target=document.getElementById('target');",
    "mini.select({type:'test.resource',id:'one'},()=>target.getBoundingClientRect());",
    "await wait(40);",
    "const portal=document.querySelector('[data-mini-agentsam]');",
    "const shadow=portal.shadowRoot;",
    "const composer=shadow.querySelector('.composer');",
    "const input=shadow.querySelector('textarea');",
    "const expand=shadow.querySelector('.expand');",
    "const more=shadow.querySelector('.more');",
    "const tools=shadow.querySelector('.tools');",
    "const before=composer.getBoundingClientRect();",
    "const inputWidth=Math.round(input.getBoundingClientRect().width);",
    "const buttons=[...shadow.querySelectorAll('.row button')].map(button=>button.getBoundingClientRect());",
    "const doesOverlap=buttons.some((button,i)=>i>0 && button.left < buttons[i-1].right);",
    "input.focus(); await wait(40); const focused=composer.getBoundingClientRect();",
    "const focusedExpanded=composer.classList.contains('message-expanded');",
    "expand.click(); await wait(40); const explicit=composer.getBoundingClientRect(); const expandedHeight=input.getBoundingClientRect().height;",
    "more.click(); await wait(40);",
    "const expandedToolsVisible=!tools.hidden;const expandedAria=expand.getAttribute('aria-expanded');const expandedToolsAria=more.getAttribute('aria-expanded');",
    "expand.click();more.click();",
    "input.value='Review the hero';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await wait(80);",
    "const afterSend={calls:calls.slice(),proposalCount:proposals.length,inputValue:input.value,status:shadow.querySelector('.status').textContent};",
    "input.value='fail';shadow.querySelector('.send').click();await wait(80);",
    "const afterFailure={calls:calls.length,proposalCount:proposals.length,inputValue:input.value,status:shadow.querySelector('.status').textContent,disabled:shadow.querySelector('.send').disabled};",
    "const samePortalCount=document.querySelectorAll('[data-mini-agentsam]').length;",
    "mini.select({type:'test.resource',id:'two'},()=>({left:innerWidth-8,top:innerHeight-8,width:3,height:3}));await wait(30);",
    "const edge=composer.getBoundingClientRect();const edgeInside=edge.left>=12&&edge.right<=innerWidth-12&&edge.top>=12&&edge.bottom<=innerHeight-12;",
    "const beforeClose=composer.hidden;shadow.querySelector('.more').click();const expandedBeforeClose=mini.expanded;mini.close();const afterClose={hidden:composer.hidden,expanded:mini.expanded,portalCount:document.querySelectorAll('[data-mini-agentsam]').length};",
    "const result={samePortalCount,edgeInside,beforeClose,expandedBeforeClose,afterClose,beforeWidth:Math.round(before.width),inputWidth,doesOverlap,viewport:innerWidth,focusedWidth:Math.round(focused.width),explicitWidth:Math.round(explicit.width),focusedExpanded,explicitExpanded:expandedHeight===88,expandedHeight:Math.round(expandedHeight),toolsVisible:expandedToolsVisible,expandAria:expandedAria,toolsAria:expandedToolsAria,afterSend,afterFailure,position:{left:before.left,right:before.right,top:before.top,bottom:before.bottom}};",
    "const pre=document.createElement('pre'); pre.id='result'; pre.textContent=JSON.stringify(result); document.body.append(pre);"
  ].join('\n');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url||'/', 'http://localhost').pathname;
    if(pathname==='/') return res.writeHead(200,{'content-type':'text/html'}).end(html);
    if(pathname==='/fixture.js') return res.writeHead(200,{'content-type':'text/javascript'}).end(fixture);
    if(pathname==='/mini-agentsam.js') return res.writeHead(200,{'content-type':'text/javascript'}).end(source('packages/agentsam-workbench/src/mini-agentsam.js').replace('./composer.js','/composer.js'));
    if(pathname==='/composer.js') return res.writeHead(200,{'content-type':'text/javascript'}).end(source('packages/agentsam-workbench/src/composer.js'));
    res.writeHead(404).end();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const url='http://127.0.0.1:'+server.address().port+'/';
    const {stdout}=await promisify(execFile)(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=2500','--window-size=900,700','--dump-dom',url],{timeout:30000,encoding:'utf8',maxBuffer:1<<20});
    const match=stdout.match(/<pre id="result">([^<]+)<\/pre>/);
    assert.ok(match,'browser fixture did not finish');
    const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
    assert.equal(result.beforeWidth,416);
    assert.ok(result.inputWidth>=180,`Text input too narrow: ${result.inputWidth}px`);
    assert.equal(result.doesOverlap,false,'toolbar controls must not collide');
    assert.equal(result.samePortalCount,1,'Repeat selection must reuse existing composer');
    assert.equal(result.edgeInside,true,'Composer must clamp inside viewport at right/bottom edges');
    assert.equal(result.beforeClose,false);
    assert.equal(result.expandedBeforeClose,true);
    assert.equal(result.afterClose.hidden,true);
    assert.equal(result.afterClose.expanded,false);
    assert.equal(result.afterClose.portalCount,1);
    assert.equal(result.focusedWidth,416);
    assert.equal(result.focusedExpanded,false);
    assert.equal(result.explicitWidth,416);
    assert.equal(result.explicitExpanded,true);
    assert.equal(result.expandedHeight,88);
    assert.equal(result.toolsVisible,true);
    assert.equal(result.expandAria,'true');
    assert.equal(result.toolsAria,'true');
    assert.deepEqual(result.afterSend.calls.map(x=>x.prompt),['Review the hero']);
    assert.equal(result.afterSend.calls[0].resource.id,'one');
    assert.equal(result.afterSend.proposalCount,1);
    assert.equal(result.afterSend.inputValue,'');
    assert.match(result.afterSend.status,/Reply in AgentSam/);
    assert.equal(result.afterFailure.proposalCount,1,'Failed response cannot create proposal');
    assert.equal(result.afterFailure.inputValue,'fail','The input must be recoverable after an error');
    assert.equal(result.afterFailure.disabled,false);
    assert.match(result.afterFailure.status,/Temporary request failure/);
    assert.ok(result.position.left>=0 && result.position.right<=result.viewport,'Composer must be on screen');
  } finally { server.close(); }
});
