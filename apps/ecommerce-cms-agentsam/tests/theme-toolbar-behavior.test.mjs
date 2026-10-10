import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { getRegistryPage, registryForAdmin } from "../backend/cms/registry.js";

const require = createRequire(new URL("../package.json", import.meta.url));
const { JSDOM } = require("jsdom");
const root = new URL("../frontend/static/js/", import.meta.url);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

async function editorFixture() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://editor.test/admin/theme-editor?slug=shop",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.structuredClone = globalThis.structuredClone;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const writes = [];
  const page = getRegistryPage("shop");
  const site = getRegistryPage("site");
  page.content_authority = "cms-draft-linked";
  page.sections = page.sections.map(section => ({ ...section, version: 1, status: "draft" }));
  site.sections = site.sections.map(section => ({ ...section, version: 1, status: "draft" }));
  w.CSS = { escape: value => String(value).replace(/[^a-zA-Z0-9_-]/g, ch => "\\" + ch) };
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.renderShell = (_route, markup) => w.document.body.insertAdjacentHTML("afterbegin", markup);
  w.fetch = async () => ({ ok: true, json: async () => ({ active_theme: { name: "Heuristic", status: "active" } }) });
  w.adminFetch = async (url, options = {}) => {
    if (url.endsWith("/registry")) return registryForAdmin();
    if (url.endsWith("/pages/site")) return { page: site };
    if (url.endsWith("/pages/shop")) return { page, seeded: false };
    if (url.endsWith("/pages")) return { pages: [{ slug: "shop", title: "Shop", live_route: "/shop" }] };
    if (url.includes("/sections/") && options.method === "PUT") {
      writes.push({ url, ...JSON.parse(options.body) });
      return { version: 2, updated_at: "2026-10-10T02:00:00Z" };
    }
    throw new Error("Unexpected editor API: " + url);
  };
  for (const file of ["pages-shared.js", "agentsam.js", "theme-editor.js"]) {
    w.eval(readFileSync(new URL(file, root), "utf8"));
  }
  await tick();
  await tick();
  await tick();
  return { dom, w, doc: w.document, writes };
}

test("real editor mounts compact toolbar, one drawer and installed page tree", async () => {
  const { dom, doc } = await editorFixture();
  try {
    assert.equal(doc.querySelector("#te-tree-title").textContent, "Shop");
    assert.ok(doc.querySelector('[data-select-section="hero"]'));
    assert.equal(doc.querySelectorAll("#te-save").length, 1);
    assert.equal(doc.querySelector("#te-save").textContent, "Save");
    assert.equal(doc.querySelector("#te-publish").textContent, "Publish live…");
    assert.equal(doc.querySelector(".te-agentsam-mark img")?.getAttribute("src"), "/admin/brand/agentsam-sidekick-symbol.svg");
    assert.ok(doc.getElementById("agentsam-drawer"));
    doc.getElementById("agentsam-toggle").click();
    assert.equal(doc.body.classList.contains("agentsam-open"), true);
    doc.getElementById("agentsam-toggle").click();
    assert.equal(doc.body.classList.contains("agentsam-open"), false);
    assert.equal(doc.getElementById("te-mini-agent-toggle"), null);
    assert.equal(doc.getElementById("te-inspector-toggle"), null);
    assert.equal(doc.querySelectorAll('.theme-studio-toolbar__right .te-icon-btn[title*="Canvas inspection"]').length, 1);
    assert.ok(doc.getElementById("te-inspect-mode").innerHTML.includes("M12.034 12.681"));
    assert.ok(readFileSync(new URL("../frontend/static/brand/agentsam-sidekick-symbol.svg", import.meta.url), "utf8").includes("<svg"));
    assert.equal(doc.getElementById("te-tree-path"), null);
    assert.equal(doc.getElementById("te-library-browse"), null);
    assert.equal(doc.querySelector("#te-more-menu").hidden, true);
    const settings = doc.querySelector('[data-drawer-mode="theme-settings"]');
    settings.click();
    assert.equal(doc.querySelector('[data-drawer-panel="theme-settings"]').hidden, false);
    assert.equal(doc.querySelector('[data-drawer-panel="sections"]').hidden, true);
    doc.querySelector('[data-drawer-mode="app-embeds"]').click();
    assert.equal(doc.querySelector('[data-drawer-panel="app-embeds"]').hidden, false);
    doc.querySelector('[data-drawer-mode="sections"]').click();
    assert.equal(doc.querySelector('[data-drawer-panel="sections"]').hidden, false);
    assert.equal(doc.querySelector('[data-drawer-panel="theme-settings"]').hidden, true);
    doc.getElementById("te-more").click();
    assert.equal(doc.getElementById("te-more-menu").hidden, false);
    doc.getElementById("te-shortcuts").click();
    assert.equal(doc.getElementById("te-shortcuts-help").hidden, false);
    doc.getElementById("te-save-options").click();
    assert.equal(doc.getElementById("te-more-menu").hidden, true);
    assert.equal(doc.getElementById("te-save-menu").hidden, false);
  } finally {
    dom.window.close();
  }
});

test("undo/redo alter real CMS draft fields; Save writes draft but never publishes", async () => {
  const { dom, w, doc, writes } = await editorFixture();
  try {
    const field = doc.getElementById("te-field-hero-headline");
    assert.ok(field);
    const original = field.value;
    const next = "Updated customer headline";
    field.value = next;
    field.dispatchEvent(new w.Event("input", { bubbles: true }));
    assert.equal(doc.getElementById("te-undo").disabled, false);
    assert.match(doc.getElementById("te-save-state").textContent, /Unsaved/);
    doc.getElementById("te-undo").click();
    assert.equal(doc.getElementById("te-field-hero-headline").value, original);
    assert.equal(doc.getElementById("te-redo").disabled, false);
    doc.getElementById("te-redo").click();
    assert.equal(doc.getElementById("te-field-hero-headline").value, next);
    doc.getElementById("te-save").click();
    await tick();
    await tick();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].content.headline, next);
    assert.ok(writes[0].url.includes("/sections/hero"));
    assert.equal(doc.getElementById("te-save-state").textContent, "Saved");
    assert.equal(doc.getElementById("te-publish").textContent, "Publish live…");
    doc.querySelector('[data-device="mobile"]').click();
    assert.equal(doc.getElementById("te-preview-device").dataset.device, "mobile");
    assert.equal(doc.querySelector('[data-device="mobile"]').getAttribute("aria-pressed"), "true");
    doc.getElementById("te-inspect-mode").click();
    assert.equal(doc.getElementById("te-inspect-mode").getAttribute("aria-pressed"), "false");
    doc.getElementById("te-inspector-close").click();
    assert.equal(doc.querySelector(".theme-studio").dataset.inspector, "closed");
    doc.getElementById("te-inspect-mode").click();
    assert.equal(doc.querySelector(".theme-studio").dataset.inspector, "open");
    assert.equal(doc.getElementById("te-inspect-mode").getAttribute("aria-pressed"), "true");
    const hintTarget = doc.querySelector('[data-drawer-mode="sections"]');
    hintTarget.focus();
    assert.equal(doc.querySelector("#te-hover-help").hidden, false);
    assert.match(doc.querySelector("#te-hover-help").textContent, /Sections/);
    hintTarget.blur();
    assert.equal(doc.querySelector("#te-hover-help").hidden, true);
  } finally {
    dom.window.close();
  }
});

test("a real edit keeps Save actionable after automatic draft persistence",async()=>{
 const {dom,w,doc,writes}=await editorFixture();
 try{
  const save=doc.getElementById("te-save");
  assert.equal(save.disabled,true,"clean editor starts with nothing to save");
  const field=doc.getElementById("te-field-hero-headline");
  field.value="Save CTA remains ready";
  field.dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.equal(save.disabled,false,"first keystroke enables Save immediately");
  assert.equal(save.classList.contains("is-dirty"),true);
  await new Promise(resolve=>setTimeout(resolve,1100));
  await tick();await tick();
  assert.equal(writes.length,1,"private autosave writes once");
  assert.equal(save.disabled,false,"Save remains clickable after private autosave");
  assert.equal(save.classList.contains("is-dirty"),false);
  save.click();
  await tick();
  assert.equal(writes.length,1,"Save with no pending changes does not write a duplicate revision");
  assert.match(doc.getElementById("te-note").textContent,/saved/i);
 } finally {dom.window.close();}
});

test("explicit Publish live does not invoke browser confirm or issue concurrent publishes",async()=>{
 const {dom,w,doc}=await editorFixture();
 try{
  let confirmCalls=0,publishCalls=0;
  w.confirm=()=>{confirmCalls++;return false;};
  const original=w.adminFetch;
  let complete;
  w.adminFetch=async (url,options)=>{
   if(url==="/api/admin/cms/pages/shop/publish"&&options?.method==="POST"){
    publishCalls++;
    await new Promise(resolve=>complete=resolve);
    return {published_at:"2026-10-10T05:00:00Z"};
   }
   return original(url,options);
  };
  const option=doc.getElementById("te-save-options");
  option.click();
  assert.equal(doc.getElementById("te-save-menu").hidden,false);
  doc.getElementById("te-publish").click();
  assert.equal(confirmCalls,0,"explicit menu selection is the publish intent");
  assert.equal(doc.getElementById("te-save-menu").hidden,true);
  assert.equal(option.getAttribute("aria-expanded"),"false");
  await tick();
  assert.equal(publishCalls,1);
  assert.equal(doc.getElementById("te-publish").disabled,true);
  doc.getElementById("te-publish").click();
  await tick();
  assert.equal(publishCalls,1,"one publish request while the first is in flight");
  complete();
  await tick();await tick();
  assert.equal(doc.getElementById("te-publish").disabled,false);
  assert.match(doc.getElementById("te-note").textContent,/Published/i);
 } finally {dom.window.close();}
});
