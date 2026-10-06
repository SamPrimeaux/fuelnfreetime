import assert from "node:assert/strict";
/**
 * Production section regression: real Theme Editor iframe load, no infinite srcdoc loop. Node stdlib + local Chrome.
 *
 * Usage:
 *   node tests/launch/theme-editor-merchant-smoke.mjs
 *   FNF_THEME_SOURCE_ROOT=/Users/samprimeaux/fuelnfreetime-theme-studio-v1 \
 *     node tests/launch/theme-editor-merchant-smoke.mjs
 *
 * Exit 1 while critical merchant checkpoints are absent; this is an intentional
 * RED gate until the owning Theme Studio lane finishes the product.
 * No writes or production calls occur. CMS APIs are fixture-backed.
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.resolve(process.env.FNF_THEME_SOURCE_ROOT || root);
const src = path.join(sourceRoot, "apps/ecommerce-cms-agentsam/frontend");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find(existsSync);
if (!chrome) {
  console.error("FAIL: Chrome required for visible editor QA (not an automatic skip)");
  process.exit(1);
}

const registryUrl = pathToFileURL(
  path.join(sourceRoot, "apps/ecommerce-cms-agentsam/backend/cms/registry.js")
).href;
const { getRegistryPage, listRegistryPages, registryForAdmin } = await import(registryUrl);
const json = (res, data) => {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const probe = String.raw`<script>
setTimeout(function () {
  const iframe=document.getElementById("theme-preview");
  let srcdocChanges=0;
  const mutation=new MutationObserver(records=>{srcdocChanges+=records.filter(r=>r.attributeName==="srcdoc").length;});
  mutation.observe(iframe,{attributes:true});
  document.querySelector('[data-theme-preview="fnf"]')?.click();
  document.getElementById("te-add-section")?.click();
  setTimeout(function () {
    const doc=iframe.contentDocument;
    const value={
      theme:doc?.documentElement?.dataset.theme || null,
      main:!!doc?.querySelector("main"),
      htmlLength:doc?.body?.innerHTML.length || 0,
      nativeSectionCount:doc?.querySelectorAll("[data-cms-section]").length || 0,
      srcdocChanges,
      hasReviseSection:document.getElementById("te-section-catalog")?.textContent.includes("Sticky curtain hero") || false,
      hasFnfSection:document.getElementById("te-section-catalog")?.textContent.includes("Image scene hero") || false,
      hasFakeVariant:document.getElementById("te-section-catalog")?.textContent.includes("Pinned media grid") || false,
    };
    const p=document.createElement("pre");p.id="fnf-audit-result";p.textContent=JSON.stringify(value);document.body.appendChild(p);
    mutation.disconnect();
  },1800);
},2300);
</script>`;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;
  if (p === "/api/admin/cms/registry") return json(res, registryForAdmin());
  if (p === "/api/admin/cms/pages/shop") return json(res, { ok: true, page: getRegistryPage("shop") });
  if (p === "/api/admin/cms/pages/site") return json(res, { ok: true, page: getRegistryPage("site") });
  if (p === "/api/admin/cms/pages") return json(res, { ok: true, pages: listRegistryPages() });
  if (p === "/api/admin/me") return json(res, { ok: true, user: { id: 1, role: "owner", email: "merchant@example.com", display_name: "Merchant" }, role: "owner", email: "merchant@example.com" });
  if (p === "/api/admin/media") return json(res, { ok: true, assets: [] });
  if (p === "/api/admin/products") return json(res, { ok: true, products: [] });
  if (p === "/api/store/collections") return json(res, { ok: true, collections: [] });
  if (p.startsWith("/api/")) return json(res, { ok: true });
  if (p === "/shop") return void res.writeHead(200, { "content-type": "text/html" }).end('<!doctype html><html><body><section data-cms-section="hero">Storefront preview fixture</section></body></html>');
  if (p === "/admin/dock/dock.config.json") return json(res, { ok: true });
  if (p === "/admin/js/theme-preview-registry.js") {
    res.writeHead(200, {"content-type":"text/javascript"});
    return void res.end(readFileSync(path.join(sourceRoot, "packages/theme-contract/runtime/theme-preview-registry.js")));
  }
  if (p === "/admin/js/theme-preview-runtime.js") {
    res.writeHead(200, {"content-type":"text/javascript"});
    return void res.end(readFileSync(path.join(sourceRoot, "packages/fnf-theme/src/editor/preview-adapter.js")));
  }
  if (p === "/admin/js/portable-sections.js" || p === "/js/portable-sections.js") {
    res.writeHead(200, {"content-type":"text/javascript"});
    return void res.end(readFileSync(path.join(sourceRoot, "packages/theme-contract/runtime/portable-sections.js")));
  }
  if (p === "/js/portable-sections.css") {
    res.writeHead(200, {"content-type":"text/css"});
    return void res.end(readFileSync(path.join(sourceRoot, "packages/theme-contract/runtime/portable-sections.css")));
  }

  let file = null;
  if (p === "/admin/theme-editor") file = path.join(src, "static/theme-editor.html");
  else if (p === "/admin/js/shell.js") file = path.join(src, "shell.js");
  else if (p.startsWith("/admin/js/")) file = path.join(src, "static/js", p.slice("/admin/js/".length));
  else if (p.startsWith("/admin/css/")) file = path.join(src, "static/css", p.slice("/admin/css/".length));
  else if (p === "/admin/favicon.svg") file = path.join(src, "public/favicon.svg");
  if (!file || !file.startsWith(src) || !existsSync(file)) {
    res.writeHead(404).end("Not found"); return;
  }
  const type = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "image/svg+xml";
  let contents = readFileSync(file, "utf8");
  if (p === "/admin/theme-editor") contents = contents.replace("</body>", probe + "</body>");
  res.writeHead(200, { "content-type": type + "; charset=utf-8" }).end(contents);
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const viewportWidth = Number(process.env.FNF_AUDIT_WIDTH || 1440);
const address = "http://127.0.0.1:" + server.address().port + "/admin/theme-editor?slug=shop";
let dom;
try {
  ({ stdout: dom } = await run(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--virtual-time-budget=9000", "--dump-dom", "--window-size="+viewportWidth+",1000", address
  ], {encoding:"utf8",maxBuffer:1<<23,timeout:55000}));
} finally {
  server.close();
}
const m = dom.match(/<pre id="fnf-audit-result">([^<]+)<\/pre>/);
if (!m) {
  console.error("FAIL: editor did not render a probe; inspect Chrome console/network");
  process.exit(1);
}
const decoded = m[1]
  .replaceAll("&quot;", '"')
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;","<")
  .replaceAll("&gt;",">");
const observed=JSON.parse(decoded);
console.log("SOURCE:",sourceRoot);
console.log("OBSERVED:",JSON.stringify(observed,null,2));
assert.equal(observed.theme,"fnf","FNF iframe must load a real document, not a white canvas");
assert.equal(observed.main,true);
assert.ok(observed.htmlLength > 800,"Rendered FNF preview HTML must be nonempty");
assert.ok(observed.nativeSectionCount >= 4,"FNF preview must render real CMS sections");
assert.ok(observed.srcdocChanges < 5,"Do not navigate in an iframe load/srcdoc feedback loop");
assert.equal(observed.hasReviseSection,true,"All real donor sections must appear regardless of theme");
assert.equal(observed.hasFnfSection,true);
assert.equal(observed.hasFakeVariant,false,"Unimplemented visual aliases must not appear");
console.log("PASS: actual Theme Studio FNF iframe renders, does not loop, and offers shared real sections");
