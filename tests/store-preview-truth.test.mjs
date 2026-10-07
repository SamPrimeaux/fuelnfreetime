import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(
  path.join(root, "apps/ecommerce-cms-agentsam/frontend/static/store.html"), "utf8"
);
const css = readFileSync(
  path.join(root, "apps/ecommerce-cms-agentsam/frontend/static/css/console.css"), "utf8"
);
const match = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(match, "Online Store must have an executable controller");
const script = new vm.Script(match[1], { filename: "store.html:inline-script" });

function environment(data) {
  const elements = new Map();
  const createNode = (kind = "div") => ({
    kind,
    style: {},
    dataset: {},
    children: [],
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    title: "",
    replaceChildren() { this.children = []; },
    appendChild(node) { this.children.push(node); },
    remove() { this.removed = true; },
    querySelector() { return null; },
    addEventListener() {},
  });
  function elem(id) {
    if (!elements.has(id)) elements.set(id, createNode());
    return elements.get(id);
  }
  for (const [id, width, height] of [
    ["theme-preview-desktop", 720, 450],
    ["theme-preview-mobile", 128, 241]
  ]) {
    const iframe = elem(id);
    iframe.parentElement = {
      clientWidth: width,
      clientHeight: height,
      dataset: {},
      appendChild() {},
      querySelector() { return null; }
    };
    iframe.contentDocument = { body: { children: [{}] } };
  }
  const badge = createNode();
  const observers = [];
  class ResizeObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }
  const context = {
    URL,
    Date,
    Number,
    Math,
    console,
    setTimeout,
    clearTimeout,
    window: { ResizeObserver },
    ResizeObserver,
    location: { origin: "https://fuelnfreetime.com" },
    renderShell() {},
    adminFetch: async () => data,
    document: {
      getElementById: elem,
      createElement: createNode,
      querySelector(selector) {
        if (selector === ".online-store-badge--active") return badge;
        return null;
      },
      querySelectorAll() { return []; }
    }
  };
  script.runInNewContext(context);
  return { elem, badge, observers };
}

function sample(overrides = {}) {
  return {
    store: { visibility: "public" },
    performance: {
      lcp_ms: { status: "unavailable", value: null, source: "web_vitals" },
      inp_ms: { status: "unavailable", value: null, source: "web_vitals" },
      cls: { status: "unavailable", value: null, source: "web_vitals" },
      sessions_desktop: { status: "unavailable", value: null, source: "storefront_sessions" },
      sessions_mobile: { status: "unavailable", value: null, source: "storefront_sessions" }
    },
    active_theme: {
      id: "heuristic",
      name: "Heuristic",
      edit_href: "/admin/theme-editor?slug=home",
      preview_href: "/?preview=1",
      last_saved: "2026-10-05 23:12:00"
    },
    draft_themes: [],
    ...overrides
  };
}

async function settle() {
  await new Promise(resolve => setImmediate(resolve));
}

test("unavailable metrics never stringify their status objects", async () => {
  const { elem } = environment(sample());
  await settle();
  for (const id of ["perf-lcp", "perf-inp", "perf-cls"]) {
    assert.equal(elem(id).textContent, "—", id);
    assert.match(elem(id).title, /Not measured/);
  }
  const counts = elem("perf-sessions").children.map(node => node.textContent);
  assert.deepEqual(counts, ["— Desktop", "— Mobile"]);
});

test("real numeric values format correctly, including a zero-session count", async () => {
  const source = sample();
  source.performance = {
    lcp_ms: { value: 2250, status: "ok" },
    inp_ms: { value: 135, status: "ok" },
    cls: { value: 0.012, status: "ok" },
    sessions_desktop: { value: 0, status: "ok" },
    sessions_mobile: { value: 1256, status: "ok" }
  };
  const { elem } = environment(source);
  await settle();
  assert.equal(elem("perf-lcp").textContent, "2.3 s");
  assert.equal(elem("perf-inp").textContent, "135 ms");
  assert.equal(elem("perf-cls").textContent, "0.012");
  assert.deepEqual(
    elem("perf-sessions").children.map(node => node.textContent),
    ["0 Desktop", "1,256 Mobile"]
  );
});

test("current-theme previews use real published URL and true device widths", async () => {
  const { elem } = environment(sample());
  await settle();
  const desktop = elem("theme-preview-desktop");
  const mobile = elem("theme-preview-mobile");
  assert.equal(desktop.src, "/");
  assert.equal(mobile.src, "/");
  assert.equal(desktop.style.width, "1440px");
  assert.equal(mobile.style.width, "390px");
  assert.equal(desktop.style.transform, "scale(0.5)");
  assert.match(mobile.style.transform, /^scale\(0\.328/);
  desktop.onload();
  mobile.onload();
  assert.equal(desktop.parentElement.dataset.previewStatus, "ready");
  assert.equal(mobile.parentElement.dataset.previewStatus, "ready");
});

test("no active theme fails gracefully without abandoning live storefront preview", async () => {
  const { elem, badge } = environment(sample({ active_theme: null, store: { visibility: "unpublished" } }));
  await settle();
  assert.equal(elem("active-theme-name").textContent, "No active theme");
  assert.equal(badge.textContent, "Not configured");
  assert.equal(elem("store-visibility-label").textContent, "Not published");
  assert.equal(elem("theme-preview-desktop").src, "/");
});

test("Online Store uses the real theme lifecycle without confusing it with Shop CMS page publish", () => {
  assert.doesNotMatch(match[1], /adminFetch\(["']\/api\/admin\/cms\/pages\/shop\/publish/);
  assert.match(match[1], /publish_ready/);
  assert.match(match[1], /Needs review/);
  assert.match(match[1], /\/api\/admin\/store\/themes\/\$\{encodeURIComponent\(btn\.dataset\.themeId\)\}\/publish/);
  assert.match(match[1], /review and runtime readiness are both verified/i);
  assert.match(css, /online-store-preview\[data-preview-status="loading"\]/);
  assert.match(css, /online-store-preview-message/);
});