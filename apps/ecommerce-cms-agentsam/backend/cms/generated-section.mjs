/**
 * Accepted generated sections use the existing CMS spine: D1 definitions,
 * artifacts and page-section instances, immutable R2 implementations and
 * the legacy private page-section pointer used by the FNF renderer.
 *
 * Execution policy v1: safe, scoped HTML/CSS only. Generated JavaScript is
 * rejected rather than executed in the merchant storefront.
 */
import { acceptGeneratedBlock, nsForms } from "../../frontend/static/js/generation-namespace.mjs";
import { readR2Json, writeR2Json } from "./r2-store.js";

const KEY = /^[a-z][a-z0-9-]{1,39}$/;
const FIELD = /^[a-z][a-zA-Z0-9_]{0,39}$/;
const TAG = /<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi;
const SAFE_TAGS = new Set(["section","div","article","header","h1","h2","h3","h4","h5","h6","p","span","small","strong","em","ul","ol","li","a","img","figure","figcaption","br"]);
const SAFE_ATTRS = new Set(["class","id","href","src","alt","title","loading","role","data-agentsam-block","data-cms","data-cms-attr"]);
const sha256 = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

export function inspectGeneratedSection(record, sectionKey = "preview-section") {
  const definition = record?.definition || {};
  const type = String(definition.type || "");
  if (definition.kind !== "section" || !KEY.test(type)) return { error:"A semantic section type is required", status:422 };
  const settings = record?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings) || !Object.keys(settings).length) {
    return { error:"At least one editable setting is required", status:422 };
  }
  const fields = {};
  for (const [key,value] of Object.entries(settings)) {
    if (!FIELD.test(key) || !["string","number","boolean"].includes(typeof value) ||
      (typeof value === "string" && value.length > 2000) || (typeof value === "number" && !Number.isFinite(value))) {
      return { error:"Invalid generated setting: " + key, status:422 };
    }
    const declared = definition.settings?.[key];
    fields[key] = { type: typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "text",
      label: typeof declared?.label === "string" ? declared.label.slice(0,80) : key.replace(/([A-Z])/g," $1") };
  }
  const canonical = record?.canonical || {};
  const html = String(canonical.html || "");
  const css = String(canonical.css || "");
  const js = String(canonical.js || "");
  if (!html || html.length > 50000 || css.length > 30000 || js.trim()) {
    return { error:"Only bounded, script-free HTML/CSS sections can be installed", status:422 };
  }
  if (/<!--|<!doctype|<\?|&\#(?:x0*3c|0*60);/i.test(html) ||
      /(?:on[a-z]+|style|srcdoc|formaction|xmlns)\s*=/i.test(html) ||
      /(?:javascript:|data:|vbscript:)/i.test(html)) {
    return { error:"Unsafe generated markup", status:422 };
  }
  let cleaned;
  try {
    cleaned = html.replace(TAG, (full, tag, raw) => {
    if (!SAFE_TAGS.has(tag)) throw new Error("Unsupported generated HTML element: " + tag);
    if (full.startsWith("</")) return "";
    const matched = raw.replace(/\s+([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_,key,a,b) => {
      const value = a ?? b;
      if (!SAFE_ATTRS.has(key) && !/^aria-[a-z-]+$/.test(key)) throw new Error("Unsupported HTML attribute: " + key);
      if ((key === "href" || key === "src") && !/^(?:\/(?!\/)|#)/.test(value)) throw new Error("External media/links are not allowed");
      if (key === "data-cms" && !Object.hasOwn(fields, value)) throw new Error("Uneditable generated setting: " + value);
      if (key === "data-cms-attr" && !["href","src","alt","title","textContent"].includes(value)) throw new Error("Unsupported CMS binding");
      return "";
    }).replace(/\s|\//g,"");
    if (matched) throw new Error("Malformed generated markup attributes");
    return "";
    });
  } catch (error) {
    return { error:error.message || "Unsafe generated markup",status:422 };
  }
  if (cleaned.includes("<") || cleaned.includes(">")) return { error:"Invalid generated HTML", status:422 };
  if (!html.includes('data-agentsam-block="__UID__"')) return { error:"Missing section scope", status:422 };
  for (const key of Object.keys(fields)) {
    if (!html.includes('data-cms="' + key + '"')) return { error:"Generated setting has no editable markup binding: " + key, status:422 };
  }
  if (/@|url\s*\(|expression\s*\(|:has\s*\(|!important|position\s*:\s*fixed/i.test(css)) {
    return { error:"Unsupported or unsafe generated CSS", status:422 };
  }
  const forms = nsForms(sectionKey);
  // The UID names classes and ids, while the wrapper uses the stable CMS
  // section identity. Resolve these separately before applying the shared lint.
  const scopedHtml = html.replaceAll('data-agentsam-block="__UID__"',
    'data-agentsam-block="' + forms.blockId + '"');
  const scopedCss = css.replaceAll('[data-agentsam-block="__UID__"]',
    '[data-agentsam-block="' + forms.blockId + '"]');
  const accepted = acceptGeneratedBlock({html:scopedHtml,css:scopedCss,js:""}, {blockId:sectionKey,namespace:"agentsam"});
  if (!accepted.ok) return { error:accepted.error,status:422 };
  const scoped = '[data-agentsam-block="' + forms.blockId + '"]';
  for (const rule of accepted.resolved.css.split("}")) {
    if (!rule.trim()) continue;
    const at = rule.indexOf("{");
    if (at === -1 || !rule.slice(0,at).split(",").every((selector)=>selector.trim().startsWith(scoped))) {
      return { error:"Every CSS selector must be scoped to the generated section",status:422 };
    }
  }
  return { ok:true,type,fields,settings,canonical:{html,css,js:""},definition:{kind:"section",type,label:String(definition.label || type).slice(0,100)} };
}

export async function persistGeneratedImplementation(env, accountId, record, sectionKey, provenance = {}) {
  const checked = inspectGeneratedSection(record,sectionKey);
  if (!checked.ok) return checked;
  if (!env.WEBSITE_ASSETS) return {error:"R2 is not bound",status:503};
  const serialized = JSON.stringify(checked.canonical);
  const digest = await sha256(serialized);
  const artifactId = "cmsa_" + digest.slice(0,24);
  const version = digest.slice(0,16);
  const prefix = "cms/artifacts/section/" + digest + "/";
  const key = prefix + "manifest.json";
  const manifest = { schema:"cms.generated-implementation.v1",canonical:checked.canonical,definition:checked.definition,fields:checked.fields };
  // Content addressing avoids overwriting another version or merchant's original.
  const prior = await readR2Json(env,key);
  if (prior && JSON.stringify(prior) !== JSON.stringify(manifest)) return {error:"Immutable artifact collision",status:409};
  if (!prior) await writeR2Json(env,key,manifest);
  const stored = await readR2Json(env,key);
  if (!stored || JSON.stringify(stored) !== JSON.stringify(manifest)) return {error:"R2 artifact verification failed",status:502};
  const meta = JSON.stringify({generator:"agentsam",namespace:"agentsam",provider:String(provenance.provider||"").slice(0,80),model:String(provenance.model||"").slice(0,120)});
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO cms_artifacts (id,account_id,artifact_key,artifact_type,version,r2_prefix,manifest_r2_key,content_hash,content_mode,status,source_kind,source_ref,metadata_json)
      VALUES (?,? ,?,'section',?,?,?,?,'component','ready','generator','code.generate',?)
      ON CONFLICT(account_id,artifact_key,version) DO NOTHING`)
      .bind(artifactId,accountId,"section/"+digest,version,prefix,key,digest,meta),
    env.DB.prepare(`INSERT INTO cms_definitions (account_id,definition_key,kind,label,category,origin,version,artifact_id,settings_schema_json,allowed_blocks_json,metadata_json,status)
      VALUES (?,?,'section',?,'Generated','generated',?, ?,?,'[]',?,'active')
      ON CONFLICT(account_id,kind,definition_key,version) DO NOTHING`)
      .bind(accountId,checked.type,checked.definition.label,version,artifactId,JSON.stringify(checked.fields),meta),
  ]);
  return {ok:true,...checked,artifactId,version,digest,key};
}

export async function attachGeneratedImplementations(env, slug, sections, accountId = null) {
  if (!sections?.some((s)=>s.content?.__editor?.generated)) return sections;
  let tenant = accountId;
  if (!tenant) {
    const page = await env.DB.prepare("SELECT account_id FROM cms_pages WHERE slug = ? LIMIT 1").bind(slug).first();
    tenant = page?.account_id;
  }
  if (!tenant) return sections;
  return Promise.all(sections.map(async (section)=>{
    const editor = section.content?.__editor;
    if (!editor?.generated || !editor.artifactId) return section;
    const artifact = await env.DB.prepare("SELECT manifest_r2_key,content_hash FROM cms_artifacts WHERE id = ? AND account_id = ? AND status = 'ready'")
      .bind(editor.artifactId,tenant).first();
    if (!artifact) return section;
    const manifest = await readR2Json(env,artifact.manifest_r2_key);
    if (!manifest || manifest.schema !== "cms.generated-implementation.v1") return section;
    const checked = inspectGeneratedSection({canonical:manifest.canonical,definition:manifest.definition,settings:section.content},section.key);
    if (!checked.ok) return section;
    if (await sha256(JSON.stringify(manifest.canonical)) !== artifact.content_hash) return section;
    return {...section,implementation:manifest.canonical};
  }));
}
