#!/usr/bin/env node
/**
 * Customer release adapter for the canonical AgentSam Ecommerce CMS UI.
 * Synchronize ONLY self-contained shared editor modules from the SDK.
 * Do not overwrite FNF's editor controller, routes, preview adapter or storefront.
 *
 * --sync  requires the local SDK checkout, refreshes files/manifests and receipts.
 * --check works in CI with only this repository; compares pinned source digests
 *         and generated embed metadata. With --upstream it additionally checks
 *         the current SDK workspace, detecting unsynced upstream edits.
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const app=join(root,'apps/ecommerce-cms-agentsam');
const sdk=resolve(process.env.AGENTSAM_SDK_ROOT||join(root,'../agentsam-sdk'));
const upstream=join(sdk,'apps/ecommerce-cms-agentsam');
const lockPath=join(app,'sdk-ui-sync.lock.json');
const files=[
 'frontend/static/js/theme-embed-review.js',
 'frontend/static/css/theme-embed-review.css',
 'frontend/static/js/theme-settings-live.js',
 'frontend/static/css/theme-settings-live.css',
 'scripts/sync-theme-embed-catalog.mjs',
];
const manifests=['agentsam.app.json','apps/resend/agentsam.app.json'];
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
const hashFile=async path=>digest(await readFile(path));
const embedDefinitions=async(base,rel)=>{
 const data=JSON.parse(await readFile(join(base,rel),'utf8'));
 return Array.isArray(data.storefront_embeds)?data.storefront_embeds:[];
};
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const mode=process.argv.includes('--sync')?'sync':process.argv.includes('--check')?'check':null;
assert(mode,'Usage: node scripts/sync-ecommerce-sdk-ui.mjs --sync | --check [--upstream]');
if(mode==='sync'){
 const fileHashes={};
 for(const rel of files){
  const src=join(upstream,rel),dest=join(app,rel);
  const hash=await hashFile(src);
  await mkdir(dirname(dest),{recursive:true});
  await copyFile(src,dest);
  fileHashes[rel]=hash;
 }
 const manifestHashes={};
 for(const rel of manifests){
  const target=join(app,rel);
  const sourceEmbeds=await embedDefinitions(upstream,rel);
  const old=JSON.parse(await readFile(target,'utf8'));
  old.storefront_embeds=structuredClone(sourceEmbeds);
  await writeFile(target,JSON.stringify(old,null,2)+'\n');
  manifestHashes[rel]=digest(JSON.stringify(sourceEmbeds));
 }
 execFileSync(process.execPath,[join(app,'scripts/sync-theme-embed-catalog.mjs')],{stdio:'inherit'});
 const catalogHash=await hashFile(join(app,'frontend/static/theme-editor/embed-catalog.json'));
 // Link the copied source to an actual committed SDK revision, never to
 // uncommitted workspace content misidentified as a published source commit.
 const revision=execFileSync('git',['-C',sdk,'rev-parse','origin/main'],{encoding:'utf8'}).trim();
 for(const rel of files){
  const committed=execFileSync('git',['-C',sdk,'show',revision+':apps/ecommerce-cms-agentsam/'+rel]);
  assert(digest(committed)===fileHashes[rel],'SDK UI source has uncommitted changes: '+rel);
 }
 for(const rel of manifests){
  const committed=JSON.parse(execFileSync('git',['-C',sdk,'show',revision+':apps/ecommerce-cms-agentsam/'+rel],{encoding:'utf8'}));
  assert(digest(JSON.stringify(committed.storefront_embeds||[]))===manifestHashes[rel],
    'SDK embed manifest has uncommitted changes: '+rel);
 }
 const receipt={schema:'agentsam.ecommerce-cms-ui-sync.v1',
  sdk_source:'SamPrimeaux/agentsam-sdk/apps/ecommerce-cms-agentsam',
  sdk_source_commit:revision, sdk_files_sha256:fileHashes,
  storefront_embed_definitions_sha256:manifestHashes, embed_catalog_sha256:catalogHash,
  scope:'Editor UI only. FNF routes, storefront, product models, and customer data remain independent.',
  sdk_npm_release_required:false};
 await writeFile(lockPath,JSON.stringify(receipt,null,2)+'\n');
 console.log('Synced '+files.length+' SDK-owned UI modules and '+manifests.length+' embed manifest contracts. No npm release.');
}
if(mode==='check'){
 const receipt=JSON.parse(await readFile(lockPath,'utf8'));
 assert(receipt.schema==='agentsam.ecommerce-cms-ui-sync.v1','Unexpected UI sync schema');
 assert(Object.keys(receipt.sdk_files_sha256).length===files.length,'UI module list drift');
 for(const rel of files){
  const expected=receipt.sdk_files_sha256[rel];
  assert(expected && (await hashFile(join(app,rel)))===expected,'SDK-owned UI file drift: '+rel);
  if(process.argv.includes('--upstream'))
   assert((await hashFile(join(upstream,rel)))===expected,'SDK has newer unsynced UI source: '+rel);
 }
 for(const rel of manifests){
  const actual=digest(JSON.stringify(await embedDefinitions(app,rel)));
  assert(actual===receipt.storefront_embed_definitions_sha256[rel],'Embed manifest drift: '+rel);
  if(process.argv.includes('--upstream'))
   assert(digest(JSON.stringify(await embedDefinitions(upstream,rel)))===actual,'Upstream embed definitions changed: '+rel);
 }
 execFileSync(process.execPath,[join(app,'scripts/sync-theme-embed-catalog.mjs'),'--check'],{stdio:'inherit'});
 assert((await hashFile(join(app,'frontend/static/theme-editor/embed-catalog.json')))===receipt.embed_catalog_sha256,
  'Generated embed catalog differs from pinned SDK contract');
 console.log('ECOMMERCE_SDK_UI_PARITY_PASS: '+files.length+' source modules + '+manifests.length+' embed contract files');
}
