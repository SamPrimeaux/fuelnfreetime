import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const appRoot=path.resolve(import.meta.dirname,'..');
const [sourceDatabase,targetDatabase,manifestArg='catalog-products.json',sourceRootArg='.']=process.argv.slice(2);
if(!sourceDatabase||!targetDatabase)throw new Error('Usage: register-catalog.mjs <repository-registry-database-id> <catalog-database-id> [manifest] [source-root]');
const manifestPath=path.resolve(appRoot,manifestArg);
const sourceRoot=path.resolve(appRoot,sourceRootArg);
const {CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:token}=process.env;
if(!account||!token)throw new Error('Explicit Cloudflare account and token required');
async function query(database,sql,params=[]){
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({sql,params})});
 const body=await response.json();if(!response.ok||!body.success||body.result.some(r=>!r.success))throw new Error('Catalog query failed: '+JSON.stringify(body.errors));return body.result[0];
}
const remote=execFileSync('git',['remote','get-url','origin'],{cwd:sourceRoot,encoding:'utf8'}).trim();
const match=remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
if(!match)throw new Error('Source repository identity cannot be resolved from origin');
const rows=(await query(sourceDatabase,'SELECT * FROM code_repositories WHERE provider=? AND lower(repo_full_name)=lower(?) AND is_active=1',['github',match[1]])).results;
if(rows.length!==1)throw new Error('RepositoryNotRegisteredOrAmbiguous');
const repo=rows[0];
if(sourceDatabase!==targetDatabase){
 const current=(await query(targetDatabase,'SELECT id,account_id,provider,repo_full_name FROM code_repositories WHERE id=? OR (provider=? AND lower(repo_full_name)=lower(?))',[repo.id,repo.provider,repo.repo_full_name])).results;
 if(current.some(r=>r.id!==repo.id||r.account_id!==repo.account_id||r.provider!==repo.provider||r.repo_full_name.toLowerCase()!==repo.repo_full_name.toLowerCase()))throw new Error('Repository projection conflicts with target registry');
 await query(targetDatabase,'INSERT INTO code_repositories(id,account_id,provider,owner,name,repo_full_name) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[repo.id,repo.account_id,repo.provider,repo.owner,repo.name,repo.repo_full_name]);
}
const manifest=JSON.parse(fs.readFileSync(manifestPath));
for(const p of manifest.products){
 if(!fs.existsSync(path.join(sourceRoot,p.canonical_path)))throw new Error('Canonical source missing: '+p.slug);
 await query(targetDatabase,`INSERT INTO agentsam_products(slug,name,kind,status,repository_id,canonical_path,package_name,version,metadata) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET name=excluded.name,kind=excluded.kind,status=excluded.status,repository_id=excluded.repository_id,canonical_path=excluded.canonical_path,package_name=excluded.package_name,version=excluded.version,metadata=excluded.metadata WHERE json_extract(agentsam_products.metadata,'$.account_id')=json_extract(excluded.metadata,'$.account_id')`,[p.slug,p.name,p.kind,p.status||'wired',repo.id,p.canonical_path,p.package_name||null,p.version||null,JSON.stringify({origin:'developer',account_id:repo.account_id,capabilities:p.capabilities||[]})]);
}
for(const [source,relation,target] of manifest.relationships){
 const result=await query(targetDatabase,`SELECT id,slug FROM agentsam_products WHERE slug IN (?,?) AND repository_id=? AND json_extract(metadata,'$.account_id')=?`,[source,target,repo.id,repo.account_id]);
 const a=result.results.find(r=>r.slug===source),b=result.results.find(r=>r.slug===target);if(!a||!b)throw new Error('Relationship endpoint missing or belongs to another owner');
 await query(targetDatabase,`INSERT INTO asset_relationships(source_type,source_id,target_type,target_id,relationship_type,metadata) VALUES('agentsam_product',?,'agentsam_product',?,?,'{"origin":"developer"}') ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type) DO NOTHING`,[a.id,b.id,relation]);
}
console.log(`Registered ${manifest.products.length} source-verified products and ${manifest.relationships.length} relationships from ${repo.repo_full_name}`);
