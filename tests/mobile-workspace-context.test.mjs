import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mountMediaWorkspaceDock } from "../apps/ecommerce-cms-agentsam/frontend/static/js/media-workspace-dock.js";

const file = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Wave 2 Product selection is a separate accessible control and does not add speculative bulk writes", () => {
  const src = file("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductLibrary.tsx");
  assert.match(src, /const \[selectedIds, setSelectedIds\]/);
  assert.match(src, /aria-pressed=\{selectedIds\.has\(p\.id\)\}/);
  assert.match(src, /function toggleProduct\(id: number\)/);
  assert.match(src, /selectedProducts\.map/);
  assert.match(src, /onlySelected/);
  assert.match(src, /admin-dock:workspace/);
  assert.doesNotMatch(src, /\/api\/admin\/products\/bulk/);
});

test("Wave 2 Media dock follows list, selection and detail, and invokes only existing controls", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const css = file("../apps/ecommerce-cms-agentsam/frontend/static/css/media-library.css");
  // A prior pass accidentally cut this stylesheet after '.media-age'.
  assert.match(css, /\.media-agent-editor \[hidden\]/);
  assert.match(css, /\.media-detail-page/);
  assert.match(css, /body\.admin-dock-workspace\.media-dock-selection/);

  const makeClassList = () => {
    const classes = new Set();
    return {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value),
      toggle: (value, condition) => {
        if (condition) classes.add(value);
        else classes.delete(value);
      },
    };
  };
  const tapped = new Map();
  const control = (name) => ({
    click: () => tapped.set(name, (tapped.get(name) || 0) + 1),
    scrollIntoView: () => {},
    focus: () => {},
    querySelectorAll: () => [],
  });
  let providerAvailable = false;
  const album = { ...control("album-picker"), querySelectorAll: () => [{}], showPicker: () => tapped.set("album-picker", 1) };
  const moreMenu = { open: false };
  const bar = {
    classList: makeClassList(),
    scrollIntoView: () => {},
    querySelector: (s) => s.includes("batch-album") ? album : s === ".media-batch-more" ? moreMenu : null,
  };
  const body = { classList: makeClassList() };
  const doc = new EventTarget();
  const win = new EventTarget();
  doc.body = body;
  const batch = Object.fromEntries(["clear","page","gallery","optimize"].map((x) => [x, control(x)]));
  doc.querySelector = (s) => {
    const batchKey = s.match(/^\[data-media-batch="(.+)"\]$/)?.[1];
    if (batchKey) return batchKey === "optimize" && !providerAvailable ? null : batch[batchKey];
    if (s === "#media-batch-bar") return bar;
    if (s === '[data-media-batch-album]') return album;
    if (s.includes(".media-item")) return control("open-asset");
    if (s === "#media-agent-workbench") return control("edit");
    if (s === '[data-media-inspector-tab="seo"]') return control("seo");
    if (s === '[data-media-inspector-panel="seo"]') return control("seo-panel");
    return control(s);
  };
  win.getSelectedMediaAssetIds = () => [];
  globalThis.window = win;
  globalThis.document = doc;
  const send = (id) => doc.dispatchEvent(new CustomEvent("admin-dock:invoke", { detail: { id } }));
  let dispose = () => {};
  try {
    dispose = mountMediaWorkspaceDock();
    assert.deepEqual(win.__adminDockWorkspace.actions.map((a) => a.label), ["Upload","Filters","New album","Gallery","More"]);
    send("upload");
    assert.equal(tapped.get("#media-upload-btn"), 1);

    win.dispatchEvent(new CustomEvent("agentsam:media-selection", { detail: { ids: [12] } }));
    assert.match(win.__adminDockWorkspace.label, /1 media asset selected/);
    assert.deepEqual(win.__adminDockWorkspace.actions.map((a) => a.label), ["Open","Add to album","Gallery","More","Clear"]);
    send("selected-open");
    assert.equal(tapped.get("open-asset"), 1);
    send("selected-album");
    assert.equal(tapped.get("album-picker"), 1);

    body.classList.add("media-detail-active");
    win.dispatchEvent(new CustomEvent("agentsam:media-detail-change", { detail: { id: 12 } }));
    assert.deepEqual(win.__adminDockWorkspace.actions.map((a) => a.label), ["Edit","SEO","Save","Download","Close"]);
    send("detail-seo");
    send("detail-save");
    assert.equal(tapped.get("seo"), 1);
    assert.equal(tapped.get("#media-drawer-save"), 1);

    body.classList.remove("media-detail-active");
    win.dispatchEvent(new CustomEvent("agentsam:media-detail-change", { detail: { id: null } }));
    providerAvailable = true;
    win.dispatchEvent(new CustomEvent("agentsam:media-selection", { detail: { ids: [12, 13] } }));
    assert.deepEqual(win.__adminDockWorkspace.actions.map((a) => a.label), ["Gallery","Add to album","Prepare","More","Clear"]);
    send("selected-prepare");
    send("selected-more");
    assert.equal(tapped.get("optimize"), 1);
    assert.equal(moreMenu.open, true);
    send("selected-clear");
    assert.equal(tapped.get("clear"), 1);
  } finally {
    dispose();
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
