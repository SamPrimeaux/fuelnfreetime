import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const file=(path)=>readFileSync(resolve(root,path),'utf8');
const app='apps/ecommerce-cms-agentsam';
test('customer pins source-identical reusable Ecommerce UI and manifest defaults',()=>{
 const output=execFileSync(process.execPath,['scripts/sync-ecommerce-sdk-ui.mjs','--check'],{cwd:root,encoding:'utf8'});
 assert.match(output,/ECOMMERCE_SDK_UI_PARITY_PASS/);
 const ledger=JSON.parse(file(app+'/sdk-ui-sync.lock.json'));
 assert.equal(Object.keys(ledger.sdk_files_sha256).length,5);
 const catalog=JSON.parse(file(app+'/frontend/static/theme-editor/embed-catalog.json'));
 assert.equal(catalog.apps.length,5);
 assert.equal(catalog.preview_only,true);
 assert.deepEqual(catalog.apps.map(x=>x.key).sort(),
  ['announcement_bar','announcement_modal','contact_form','newsletter_modal','newsletter_subscribe'].sort());
});
test('FNF keeps its authoritative Theme Studio and CMS preview while including SDK review components',()=>{
 const html=file(app+'/frontend/static/theme-editor.html');
 for(const part of ['theme-preview-runtime.js','theme-editor.js','theme-embed-review.js','theme-embed-review.css'])
  assert.ok(html.includes(part),'missing production editor asset: '+part);
 assert.ok(!html.includes('\\n<link')&&!html.includes('\\n<script'),'invalid escaped HTML newline');
 const controller=file(app+'/frontend/static/js/theme-editor.js');
 assert.match(controller,/window\.CmsThemeSettings/);
 assert.match(controller,/function renderPageOptions/);
 const embeds=file(app+'/frontend/static/js/theme-embed-review.js');
 assert.match(embeds,/Not installed/);
 assert.match(embeds,/No information was sent/);
 assert.doesNotMatch(embeds,/Copy preview JSON/);
});
test('customer guard enforces SDK UI hashes before deploying',()=>{
 const scripts=JSON.parse(file('package.json')).scripts;
 assert.match(scripts['build:admin'],/sync:cms-ui:check/);
 assert.match(file('scripts/guard-boundaries.mjs'),/sync-ecommerce-sdk-ui\.mjs/);
});
