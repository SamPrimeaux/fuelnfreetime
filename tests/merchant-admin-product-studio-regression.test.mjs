import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("shared admin shell keeps exactly one navigation search and retains inspector/AgentSam anchors", () => {
  const shell = source("apps/ecommerce-cms-agentsam/frontend/shell.js");
  const chrome = shell.slice(shell.indexOf("function renderShell("), shell.indexOf("function bindConsoleGlobalHandlers("));
  assert.match(chrome, /<div class="console-content-column">/);
  assert.match(chrome, /\$\{adminChrome\}/);
  assert.doesNotMatch(chrome, /id="console-command-trigger"/);
  assert.match(chrome, /class="console-sidebar-heading"/);
  assert.match(shell, /data-console-nav-search/);
  assert.match(shell, /id="agentsam-toggle"/);
  assert.match(shell, /class="console-topbar-actions"/);
  assert.match(shell, /if \(\(event\.metaKey \|\| event\.ctrlKey\) && event\.key\.toLowerCase\(\) === "k"\)/);
});

test("product library rows are full-surface links without intercepting Edit actions", () => {
  const css = source("apps/ecommerce-cms-agentsam/frontend/src/pages/products/product-library.css");
  assert.match(css, /\.pl-table \.pl-name::after\{content:"";position:absolute;inset:0;z-index:1\}/);
  assert.match(css, /\.pl-table \.pl-action a\{position:relative;z-index:2\}/);
});

test("Product Studio names its draft, uses verified artboard coordinates and exposes fullscreen edits", () => {
  const studio = source("apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  assert.match(studio, /id="ps-product-title"/);
  assert.match(studio, /value=\{title\} onChange=\{\(event\) => setTitle\(event\.target\.value\)\}/);
  assert.match(studio, /title: title\.trim\(\) \|\| detail\.product\.name/);
  assert.match(studio, /mappedArtboardLoaded && location\?\.artboard_width/);
  assert.match(studio, /showPrintMap \? \[location\?\.artboard_image_url\] : \[\]/);
  assert.match(studio, /artboardReferenceUrl/);
  assert.match(studio, /className="ps-merchant-render-strip"/);
  assert.match(studio, /aria-label="Canvas reference"/);
  assert.match(studio, /aria-label="Enlarged product preview"/);
  assert.match(studio, /Save design changes/);
  assert.match(studio, /mockupPollCount\.current >= 8/);
});

test("supplier-managed inventory is separate from local stock and does not create misleading low-stock alerts", async () => {
  const { groupProductInventory } = await import("../packages/agentsam-merch/src/product-spine.js");
  const result = groupProductInventory([
    { id: 1, product_id: 4, product_title: "Print-on-demand tee", status: "active", sku: "POD", inventory_qty: 0 },
  ], [{ product_id: 4, completeful_catalog_product_id: "catalog-4", sync_status: "linked" }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].source.kind, "connected_provider");
  assert.equal(result[0].source.manages_inventory, false);
  assert.equal(result[0].low_stock_count, 0);
  assert.match(source("apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductLibrary.tsx"), /p\.fulfillment_kind === "supplier"/);
  const inv = source("apps/ecommerce-cms-agentsam/frontend/static/inventory.html");
  assert.match(inv, /Provider managed/);
  assert.match(inv, /Supplier fulfilled/);
});
