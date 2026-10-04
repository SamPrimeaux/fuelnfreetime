import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPACT_MAX_WIDTH, normalizeDockConfig, patternScore, resolveActiveTab, resolveScope } from "../packages/admin-dock/src/scope.js";

const read = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const app = read("../apps/ecommerce-cms-agentsam/agentsam.app.json");
const twin = read("../apps/ecommerce-cms-agentsam/.agentsam/app.json");

test("pattern semantics: exact, children-only, fallback, trailing slash", () => {
  assert.ok(patternScore("/admin/orders", "/admin/orders") > 0);
  assert.ok(patternScore("/admin/orders/", "/admin/orders") > 0);
  assert.equal(patternScore("/admin/orders/12", "/admin/orders"), 0);
  assert.ok(patternScore("/admin/orders/12", "/admin/orders/*") > 0);
  assert.equal(patternScore("/admin/orders", "/admin/orders/*"), 0);
  assert.equal(patternScore("/admin/anything", "*"), 1);
  assert.equal(patternScore("/admin/orders?tab=open", "/admin/orders") > 0, true);
});

test("normalizeDockConfig rejects empty or malformed config and drops bad entries", () => {
  assert.equal(normalizeDockConfig(null), null);
  assert.equal(normalizeDockConfig({ tabs: [] }), null);
  assert.equal(normalizeDockConfig({ tabs: [{ id: "x" }] }), null);
  const cfg = normalizeDockConfig({
    tabs: [{ id: "a", label: "A", href: "/a" }, { label: "no id", href: "/b" }],
    scopes: [{ id: "s", match: "/a", chips: [{ label: "ok", prompt: "p" }, { label: "no prompt" }] }, { id: "bad" }],
  });
  assert.equal(cfg.tabs.length, 1);
  assert.deepEqual(cfg.tabs[0].match, ["/a", "/a/*"]);
  assert.equal(cfg.scopes.length, 1);
  assert.equal(cfg.scopes[0].chips.length, 1);
  assert.equal(cfg.agent.label, "Agent");
  assert.equal("breakpoint" in cfg, false);
});

test("manifest dock block: twin manifests agree and the dock feature is registered", () => {
  assert.ok(app.dock, "agentsam.app.json needs a dock block");
  assert.deepEqual(app.dock, twin.dock);
  assert.ok(app.features.includes("admin.mobile-dock"));
  assert.ok(twin.features.includes("admin.mobile-dock"));
});

test("manifest dock block: ids unique, one nav action, one agent action, every tab is a link or an action", () => {
  const cfg = normalizeDockConfig(app.dock);
  assert.ok(cfg);
  const ids = cfg.tabs.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(cfg.tabs.filter((t) => t.action === "nav").length, 1);
  assert.equal(cfg.tabs.filter((t) => t.action === "agent").length, 1, "the agent is a tab inside the dock, exactly once");
  const agentAt = cfg.tabs.findIndex((t) => t.action === "agent");
  assert.ok(agentAt > 0 && agentAt < cfg.tabs.length - 1, "agent sits between the other tabs, not on an edge");
  for (const t of cfg.tabs) assert.ok(t.href || ["nav", "agent"].includes(t.action), `${t.id} needs href or a nav/agent action`);
  assert.ok(cfg.tabs.length <= 5, "a phone dock holds at most 5 tabs");
});

test("routing against the real manifest", () => {
  const cfg = normalizeDockConfig(app.dock);
  assert.equal(resolveActiveTab("/admin/home", cfg.tabs), "home");
  assert.equal(resolveActiveTab("/admin/orders/1042", cfg.tabs), "orders");
  assert.equal(resolveActiveTab("/admin/product-edit", cfg.tabs), "products");
  assert.equal(resolveActiveTab("/admin/inventory", cfg.tabs), "products");
  assert.equal(resolveActiveTab("/admin/growth", cfg.tabs), null);
  assert.equal(resolveScope("/admin/products", cfg.scopes).id, "products");
  assert.equal(resolveScope("/admin/products/create", cfg.scopes).id, "product");
  assert.equal(resolveScope("/admin/product-edit", cfg.scopes).id, "product");
  assert.equal(resolveScope("/admin/orders", cfg.scopes).id, "orders");
  assert.equal(resolveScope("/admin/growth", cfg.scopes).id, "page");
});

test("dock config stays store-neutral and free of env-style knobs", () => {
  const text = JSON.stringify(app.dock);
  assert.doesNotMatch(text, /Fuel|FNF_|process\.env|\$\{/);
});

test("compact breakpoint matches the shell drawer breakpoint", () => {
  assert.equal(COMPACT_MAX_WIDTH, 900);
  const admin = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/css/admin.css", import.meta.url), "utf8");
  assert.match(admin, /@media \(max-width: 900px\)/);
});
