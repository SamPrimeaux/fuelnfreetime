import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const editor = readFileSync(join(root,"apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js"),"utf8");
const bootstrap = readFileSync(join(root,"apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor-generation-bootstrap.mjs"),"utf8");
const surfaces = readFileSync(join(root,"apps/ecommerce-cms-agentsam/frontend/static/js/generation-surfaces.mjs"),"utf8");
const portable = readFileSync(join(root,"packages/theme-contract/runtime/portable-sections.js"),"utf8");
const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(portable, sandbox);
const start = editor.indexOf("    function catalogVisual(entry) {");
const end = editor.indexOf("\n    function renderCatalog(query)", start);
const source = editor.slice(start, end);
const escape = text => String(text).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const catalogVisual = new Function("window","cmsEscapeAttr","cmsEscapeHtml","humanize",source+"\nreturn catalogVisual;")(
  {ThemePortableSections:sandbox.ThemePortableSections}, escape, escape, value=>String(value));
test("portable section cards use the actual installed section renderer and shared stylesheet", () => {
  const entry = sandbox.ThemePortableSections.catalog().find(x=>x.id==="revise/sticky-curtain");
  assert.ok(entry);
  const preview = catalogVisual(entry);
  assert.match(preview, /<iframe/);
  assert.match(preview, /sandbox=""/);
  assert.match(preview, /\/js\/portable-sections\.css/);
  assert.match(preview, /ps-hero-copy/);
  assert.match(preview, /srcdoc="/);
});
test("catalog distinguishes nonportable structural cards from real renderer previews", () => {
  const preview = catalogVisual({id:"native/hero",preset:"unknown",label:"Native Hero",type:"hero"});
  assert.match(preview, /te-catalog-structure/);
  assert.doesNotMatch(preview, /<iframe/);
});
test("catalog and generated sections share the existing real CMS install flow", () => {
  assert.match(editor, /data-start-section-generation/);
  assert.match(editor, /theme-editor:generate-request/);
  assert.match(bootstrap, /flow\.openRequest\(\)/);
  assert.match(bootstrap, /bridge\.acceptGenerated\(/);
  assert.match(surfaces, /Accept into private draft/);
  assert.match(surfaces, /preview\.setAttribute\("sandbox", ""\)/);
});

test("generation workspace offers a real accessible vertical dragbar and contextual source preview", () => {
  assert.match(surfaces, /aria-label", "Resize AgentSam generation workspace"/);
  assert.match(surfaces, /bar\.addEventListener\("pointerdown"/);
  assert.match(surfaces, /bar\.addEventListener\("keydown"/);
  assert.match(surfaces, /te-generation-progress/);
  assert.match(surfaces, /miniagentsam-codepreview/);
});
