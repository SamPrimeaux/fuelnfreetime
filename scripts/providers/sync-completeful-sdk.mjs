#!/usr/bin/env node
/**
 * Offline-installed SDK provider artifact, NOT a second source implementation.
 * Authoritative TS: agentsam-sdk/packages/providers/completeful/src/core.
 *
 * --sync: build SDK and copy only emitted dist + package metadata.
 * --check: verify vendored dist bytes and pinned OpenAPI hash without needing SDK source.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const folder=path.join(root,'vendor/agentsam-provider-completeful');
const sdk=process.env.AGENTSAM_SDK_ROOT ||
  path.resolve(root,'../agentsam-sdk/packages/providers/completeful');
const hash=(x)=>createHash('sha256').update(x).digest('hex');
const files=['client.js','client.d.ts','generated/operations.generated.js',
  'generated/operations.generated.d.ts','generated/types.generated.js','generated/types.generated.d.ts'];
const read=(file)=>fs.readFileSync(file);
const localHash=hash(read(path.join(root,'docs/providers/completeful/openapi.json')));
if(process.argv.includes('--sync')){
  const p=JSON.parse(read(path.join(sdk,'package.json')));
  execFileSync('npm',['run','build'],{cwd:sdk,stdio:'inherit'});
  const sdkContract=JSON.parse(read(path.join(sdk,'openapi/openapi.json')));
  if(hash(read(path.join(sdk,'openapi/openapi.json')))!==localHash)
    throw Error('FNF OpenAPI drift: synchronize pinned specs deliberately before syncing provider');
  const dist=path.join(sdk,'dist');
  fs.mkdirSync(path.join(folder,'dist/generated'),{recursive:true});
  const content={};
  for(const file of files){
    const bytes=read(path.join(dist,file));
    fs.writeFileSync(path.join(folder,'dist',file),bytes);
    content[file]=hash(bytes);
  }
  fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({
    package:p.name,version:p.version,api_spec_sha256:localHash,
    sdk_source:'agentsam-sdk/packages/providers/completeful/src/core',
    artifacts:content,
    format:'compiled-typescript-only',
  },null,2)+'\n');
  fs.writeFileSync(path.join(folder,'package.json'),JSON.stringify({
    name:p.name,version:p.version,type:'module',private:true,
    exports:{
      '.':{'types':'./dist/client.d.ts','default':'./dist/client.js'},
      './api':{'types':'./dist/client.d.ts','default':'./dist/client.js'},
      './types':{'types':'./dist/generated/types.generated.d.ts','default':'./dist/generated/operations.generated.js'},
    },
  },null,2)+'\n');
  console.log('Synced canonical TypeScript SDK runtime '+p.version);
}else if(process.argv.includes('--check')){
  const manifest=JSON.parse(read(path.join(folder,'manifest.json')));
  if(manifest.api_spec_sha256!==localHash||manifest.format!=='compiled-typescript-only')
    throw Error('Vendored provider OpenAPI hash mismatch');
  const installed=JSON.parse(read(path.join(folder,'package.json')));
  const rootPackage=JSON.parse(read(path.join(root,'package.json')));
  const packageName='@inneranimalmedia/agentsam-provider-completeful';
  if(manifest.package!==packageName || installed.name!==packageName ||
    installed.version!==manifest.version ||
    rootPackage.dependencies?.[packageName]!=='file:vendor/agentsam-provider-completeful')
    throw Error('Installed Completeful package identity/version/dependency mismatch');
  if(installed.exports?.['./api']?.default!=='./dist/client.js')
    throw Error('Compiled TypeScript provider export missing');
  for(const file of files){
    if(manifest.artifacts[file]!==hash(read(path.join(folder,'dist',file))))
      throw Error('Vendored Completeful SDK artifact changed without an SDK build: '+file);
  }
  console.log('Verified TypeScript SDK '+manifest.version+
    ' / '+Object.keys(manifest.artifacts).length+' build artifacts / OpenAPI '+localHash.slice(0,12));
}else{
  throw Error('Usage: node scripts/providers/sync-completeful-sdk.mjs --sync|--check');
}
