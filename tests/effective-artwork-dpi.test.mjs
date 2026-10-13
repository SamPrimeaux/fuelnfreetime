import assert from "node:assert/strict";
import test from "node:test";
import { effectiveArtworkDpi, providerPrintSizeIn } from "../apps/ecommerce-cms-agentsam/packages/agentsam-merch/src/effective-dpi.js";

test("effective DPI uses original pixels at actual printed physical width", () => {
  const printArea = { printWidthIn: 14, printHeightIn: 16 };
  assert.equal(effectiveArtworkDpi({ sourceWidthPx: 600, sourceHeightPx: 600, ...printArea, placementWidthPercent: 60 }).dpi, 71);
  assert.equal(effectiveArtworkDpi({ sourceWidthPx: 1254, sourceHeightPx: 1254, ...printArea, placementWidthPercent: 60 }).dpi, 149);
  assert.equal(effectiveArtworkDpi({ sourceWidthPx: 4200, sourceHeightPx: 4800, ...printArea, placementWidthPercent: 100 }).dpi, 300);
  assert.equal(effectiveArtworkDpi({ sourceWidthPx: 1254, sourceHeightPx: 1254, ...printArea, placementWidthPercent: 100 }).dpi, 89);
});
test("provider units are required; zoom and metadata must not enter calculation", () => {
  assert.deepEqual(providerPrintSizeIn({ unit: "in", file_width: 14, file_height: 16 }), { width: 14, height: 16 });
  assert.deepEqual(providerPrintSizeIn({ unit: "px", dpi: 300, file_width: 4200, file_height: 4800 }), { width: 14, height: 16 });
  assert.equal(providerPrintSizeIn({ file_width: 4200, file_height: 4800 }), null);
  assert.equal(effectiveArtworkDpi({ sourceWidthPx: 0, sourceHeightPx: 600, printWidthIn: 14, printHeightIn: 16, placementWidthPercent: 60 }), null);
  assert.equal(effectiveArtworkDpi({ sourceWidthPx: 1000, sourceHeightPx: 2000, printWidthIn: 14, printHeightIn: 16, placementWidthPercent: 100 }).fitsPrintHeight, false);
});

test("Product Studio backend persists artwork flips as design revisions", async () => {
  const { readFile } = await import("node:fs/promises");
  const backend = await readFile(new URL("../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js", import.meta.url), "utf8");
  const studio = await readFile(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(backend, /flipX: Boolean\(body\.placement\?\.flipX/);
  assert.match(backend, /flipY: Boolean\(body\.placement\?\.flipY/);
  assert.match(backend, /flipX: Boolean\(value\.placement\?\.flipX/);
  assert.match(studio, /ctx\.scale\(flipX \? -1 : 1, flipY \? -1 : 1\)/);
  assert.match(studio, /scale\(\$\{flipX \? -1 : 1\}, \$\{flipY \? -1 : 1\}\)/);
});


test("edited placement never reuses prepared artwork or an older provider mockup", async () => {
  const { readFile } = await import("node:fs/promises");
  const code = await readFile(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(code, /preparedFor === currentPlacementKey \? preparedAsset : null/);
  assert.match(code, /preparedFor === currentPlacementKey \? previewAsset : null/);
  assert.match(code, /preparedIsCurrent \? providerRenderUrl : null/);
  assert.match(code, /Prepare the updated artwork before rendering the mockup/);
  assert.match(code, /setPreparedFor\(currentPlacementKey\)/);
});
