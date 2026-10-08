#!/usr/bin/env node
/** Generated authority inventory; no network, secrets, data writes or deployments. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
const config=JSON.parse(read("docs/package-authority.json"));
const arg=process.argv[2];
if (!["--stdout","--check","--write"].includes(arg) || process.argv.length!==3) {
  console.error("Usage: node scripts/package-authority.mjs --stdout|--check|--write");process.exit(2);
}
const errors=[];
const local=[];
for (const slug of fs.readdirSync(path.join(root,"packages")).sort()) {
  const file="packages/"+slug+"/package.json";
  if (!exists(file)) continue;
  const m=JSON.parse(read(file));
  local.push({name:m.name,version:m.version,private:m.private===true,path:"packages/"+slug});
}
const app=JSON.parse(read("apps/ecommerce-cms-agentsam/package.json"));
local.push({name:app.name,version:app.version,private:app.private===true,path:"apps/ecommerce-cms-agentsam"});
local.sort((a,b)=>a.name.localeCompare(b.name));
const names=new Set(local.map(x=>x.name));
if(names.size!==local.length)errors.push("Duplicate FNF workspace package names");
for(const item of local)if(!config.local_roles?.[item.name])errors.push("Unmapped local package "+item.name);
for(const name of Object.keys(config.local_roles||{}))if(!names.has(name))errors.push("Missing local package "+name);
const sdkNames=new Set();
for(const item of config.sdk_authorities||[]){
  if(!item.name?.startsWith("@inneranimalmedia/")||sdkNames.has(item.name))errors.push("Invalid SDK entry "+item.name);
  sdkNames.add(item.name);
  if(item.status==="SOURCE_UNVERIFIED" && (item.sdk_path||item.audited_version))errors.push("Unverified source claims a version: "+item.name);
  if(item.status!=="SOURCE_UNVERIFIED" && (!item.sdk_path||!item.audited_version))errors.push("SDK snapshot lacks source/version: "+item.name);
}
// Opt-in cross-repository verification. The FNF CI checkout cannot assume SDK
// repository credentials or package sources are available.
const sdkRoot=process.env.AGENTSAM_SDK_ROOT?.trim();
if(sdkRoot){
  for(const item of config.sdk_authorities||[]){
    if(!item.sdk_path)continue;
    const file=path.resolve(sdkRoot,item.sdk_path,"package.json");
    if(!fs.existsSync(file)){errors.push("SDK package source missing: "+file);continue;}
    try{
      const manifest=JSON.parse(fs.readFileSync(file,"utf8"));
      if(manifest.name!==item.name)errors.push("SDK package name drift: "+item.sdk_path+" expected "+item.name+" got "+manifest.name);
      if(manifest.version!==item.audited_version)errors.push("SDK version drift: "+item.name+" expected "+item.audited_version+" got "+manifest.version);
    }catch(e){errors.push("SDK package manifest unreadable: "+file+" — "+e.message);}
  }
}
for(const item of config.legacy||[]){
  if(!exists(item.path))errors.push("Legacy entrypoint no longer exists: "+item.path);
  if(!item.status||!item.note)errors.push("Legacy entrypoint has no disposition: "+item.path);
}
for(const file of ["README.md","docs/ARCHITECTURE-AUTHORITY.md"]){
  if(!exists(file)){errors.push("Missing "+file);continue;}
  const mentions=new Set(read(file).match(/@inneranimalmedia\/[a-z][a-z0-9-]*/g)||[]);
  for(const mention of mentions)if(!names.has(mention)&&!sdkNames.has(mention))errors.push(file+" references unknown authority "+mention);
}
if(!read("README.md").includes("docs/ARCHITECTURE-AUTHORITY.md") ||
   !read("README.md").toLowerCase().includes("production infrastructure"))
  errors.push("README lacks architecture map or existing production infrastructure statement");

let tracked=[];
try{tracked=execFileSync("git",["ls-files","-z"],{cwd:root,encoding:"utf8"}).split("\0").filter(Boolean);}
catch(e){errors.push("Cannot inspect tracked source: "+e.message);}
const scan=tracked.filter(f=>/^(apps\/ecommerce-cms-agentsam\/(backend|frontend|bin)\/|lib\/assets\/|scripts\/)/.test(f) &&
  /\.(js|mjs|cjs|ts|tsx|jsx|json)$/.test(f) &&
  !/(^|\/)(node_modules|dist|tests|test|fixtures)\//.test(f) && exists(f))
  .map(file=>({file,lines:read(file).split(/\r?\n/)}));
function findEvidence(pkg){
  if(pkg.path.startsWith("apps/"))return ["apps/ecommerce-cms-agentsam/package.json"];
  const slug=pkg.path.split("/").pop();
  const tokens=[pkg.name,"packages/"+slug+"/","/admin/"+slug.replace(/^agentsam-/,"")+"/"];
  const out=[];
  for(const f of scan){
    for(let i=0;i<f.lines.length;i++){
      const line=f.lines[i];
      if(tokens.some(token=>line.includes(token)) && /(from |import\(|require\(|join\(|cp\(|entryPoints|export \* from|path\.resolve|\/admin\/)/.test(line)){
        out.push(f.file);break;
      }
    }
    if(out.length===4)break;
  }
  return out;
}
for(const p of local)p.evidence=findEvidence(p);
const tick=String.fromCharCode(96);
const q=x=>tick+x+tick;
const esc=x=>String(x??"").replaceAll("|","\\|").replace(/\r?\n/g," ");
const link=x=>"["+x+"](../../"+x.split(":")[0]+(x.includes(":")?"#L"+x.split(":")[1]:"")+")";
const table=(headers,rows)=>[
  "| "+headers.join(" | ")+" |",
  "| "+headers.map(()=>"---").join(" | ")+" |",
  ...rows.map(row=>"| "+row.map(esc).join(" | ")+" |")
].join("\n");
const status=p=>p.path.startsWith("apps/")?"APPLICATION":p.evidence.length?"ACTIVE REFERENCE":"AVAILABLE";
const localRows=local.map(p=>[q(p.name),link(p.path),q(p.version),p.private?"private":"publishable manifest",status(p),config.local_roles[p.name],p.evidence.map(link).join(", ")||"—"]);
const sdkRows=config.sdk_authorities.map(p=>[q(p.name),p.sdk_path?q("agentsam-sdk/"+p.sdk_path):"source unverified",p.audited_version?q(p.audited_version):"—",p.status,p.role+(p.note?" — "+p.note:"")]);
const legacyRows=config.legacy.map(p=>[link(p.path),p.status,p.note]);
const overlap=local.filter(p=>sdkNames.has(p.name));
const output=[
 "# Generated package authority inventory",
 "",
 "> Generated from current FNF manifests and tracked runtime references by "+q("scripts/package-authority.mjs")+". Edit "+q("docs/package-authority.json")+" or manifests, then run "+q("node scripts/package-authority.mjs --write")+".",
 "> Audit snapshot: "+config.snapshot_date+". SDK rows are a separately checked source snapshot, not a live cross-repo or deployment verification.",
 "",
 "## Local FNF workspace packages",
 "",
 "ACTIVE REFERENCE means a source/bundle reference exists, **not** a deployed integration or feature parity proof.",
 "",
 table(["Package","Workspace","Version","Manifest","Observed reference","Role","Evidence"],localRows),
 "",
 "## Canonical SDK authority targets",
 "",
 "CONVERGING = upstream implementation exists, but FNF delegation/parity is not established. AVAILABLE = upstream source found; no FNF integration claimed. SOURCE_UNVERIFIED = source location was not confirmed.",
 "",
 table(["Package","SDK path","Audited version","Status","Authority"],sdkRows),
 "",
 "## Same-name FNF/SDK packages",
 "",
 ...(overlap.length?overlap.map(p=>"- "+q(p.name)+": local "+q(p.version)+" and separately audited SDK "+q(config.sdk_authorities.find(s=>s.name===p.name)?.audited_version||"?")+". Resolve import/bundle authority explicitly; a same-name package is not automatically the same implementation."):["None found."]),
 "",
 "## Existing operators and compatibility paths",
 "",
 table(["Entrypoint","Status","Next action / boundary"],legacyRows),
 "",
 "## Verification limitations",
 "",
 "- FNF roles, files, versions and app references are checked against THIS checkout. A package presence or import is not a deployment readiness result.",
 "- SDK source paths and versions came from a separate checked SDK workspace on "+config.snapshot_date+"; this CI job cannot infer or certify the current SDK HEAD.",
 "- Source-unverified dependencies remain explicitly flagged, rather than described as active.",
 "- Missing local manifest, obsolete entrypoint, unknown package mention or generated drift fails --check.",
 "- Merchant bindings, fnf_* compatibility IDs and business resources are allowed; generic algorithm duplication must pass a parity/migration gate.",
 ""
].join("\n");
const relative="docs/generated/package-authority.md";
if(arg==="--write"){fs.mkdirSync(path.dirname(path.join(root,relative)),{recursive:true});fs.writeFileSync(path.join(root,relative),output);}
if(arg==="--stdout")process.stdout.write(output);
if(arg==="--check" && (!exists(relative)||read(relative)!==output))errors.push("Stale generated inventory. Run node scripts/package-authority.mjs --write");
if(errors.length){for(const message of errors)console.error("AUTHORITY ERROR: "+message);process.exit(1);}
if(arg==="--check")console.log("Authority check passed: "+local.length+" FNF packages; "+config.sdk_authorities.length+" SDK targets; "+config.legacy.length+" legacy paths.");
if(arg==="--write")console.log("Updated "+relative);
