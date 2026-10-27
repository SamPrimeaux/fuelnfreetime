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
  assert.match(studio, /ctx\.scale\(targetSide\.flipX \? -1 : 1, targetSide\.flipY \? -1 : 1\)/);
  assert.match(studio, /scale\(\$\{flipX \? -1 : 1\}, \$\{flipY \? -1 : 1\}\)/);
});


test("edited placement never reuses prepared artwork or an older provider mockup", async () => {
  const { readFile } = await import("node:fs/promises");
  const code = await readFile(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(code, /preparedFor === currentPlacementKey \? preparedAsset : null/);
  assert.match(code, /preparedFor === currentPlacementKey \? previewAsset : null/);
  assert.match(code, /preparedIsCurrent \? providerRenderUrl : null/);
  // The current UX prepares each active side automatically instead of showing
  // the retired single-side prompt, while still guarding stale prepared files.
  assert.match(code, /const preparedIsCurrent = Boolean\(preparedAsset && preparedFor === currentPlacementKey\)/);
  assert.match(code, /const saved = needsPreparation \? await prepareArtwork\(\) : await saveDraft\(\)/);
  assert.match(code, /setPreparedFor\(placementKey\(asset\?\.id, variantId, locationId/);
});

test("canvas zoom 50/100/150 and rotation 0/90 do not change per-axis DPI", async () => {
  const { studioArtworkQuality } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-artwork-quality.ts");
  const input = { source: { width: 600, height: 600 },
    location: { file_width: 14, file_height: 16, unit: "in", dpi: 300 },
    fileName: "logo.png", scalePercent: 60 };
  for (const canvasZoom of [50, 100, 150]) {
    for (const rotationDegrees of [0, 90]) {
      // The editor's CSS zoom and rotation must never enter this input.
      const quality = studioArtworkQuality(input);
      assert.equal(quality.badge, "71 DPI", `zoom ${canvasZoom}, rotation ${rotationDegrees}`);
      assert.equal(quality.result.printedWidthIn, 8.4);
    }
  }
});

test("trimmed artwork uses the actual visible pixels at the SAME placed width percent", async () => {
  const { alphaBounds } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-alpha-bounds.ts");
  const { studioArtworkQuality } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-artwork-quality.ts");
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  // 4x4 visible rectangle inside an 8x8 image.
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) pixels[(y * 8 + x) * 4 + 3] = 255;
  assert.deepEqual(alphaBounds(pixels, 8, 8), { x: 2, y: 2, width: 4, height: 4 });
  assert.throws(() => alphaBounds(new Uint8ClampedArray(8 * 8 * 4), 8, 8), /no visible pixels/);
  const base = { source: { width: 1200, height: 1200 }, fileName: "logo.png",
    location: { unit: "in", file_width: 14, file_height: 16, dpi: 300 }, scalePercent: 60 };
  const original = studioArtworkQuality(base);
  const trimmed = studioArtworkQuality({ ...base, crop: { x: 300, y: 300, width: 600, height: 600 } });
  assert.equal(original.badge, "142 DPI");
  assert.equal(trimmed.badge, "71 DPI");
  assert.equal(trimmed.result.printedWidthIn, 8.4);
});

test("nonuniform stretch uses the less sharp axis and unrounded threshold comparisons", async () => {
  const { studioArtworkQuality } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-artwork-quality.ts");
  const stretched = effectiveArtworkDpi({ sourceWidthPx: 1000, sourceHeightPx: 1000,
    printWidthIn: 10, printHeightIn: 10, placementWidthPercent: 50, placementHeightPercent: 100 });
  assert.equal(stretched.dpiX, 200);
  assert.equal(stretched.dpiY, 100);
  assert.equal(stretched.dpi, 100);
  const base = { source: { width: 1502, height: 1502 }, fileName: "logo.png",
    location: { unit: "in", file_width: 10, file_height: 10, dpi: 150 }, scalePercent: 100 };
  assert.equal(studioArtworkQuality(base).badge, "150 DPI");
  assert.equal(studioArtworkQuality(base).lowResolution, false);
  const justBelow = studioArtworkQuality({ ...base, source: { width: 1499, height: 1499 } });
  assert.equal(justBelow.badge, "149 DPI");
  assert.equal(justBelow.lowResolution, true);
});

test("provider units convert correctly and unavailable physical sizes stay unknown", async () => {
  const { studioArtworkQuality } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-artwork-quality.ts");
  const source = { width: 4200, height: 4800 };
  for (const location of [
    { unit: "in", file_width: 14, file_height: 16 },
    { unit: "cm", file_width: 35.56, file_height: 40.64 },
    { unit: "mm", file_width: 355.6, file_height: 406.4 },
    { unit: "px", file_width: 4200, file_height: 4800, dpi: 300 },
  ]) {
    const quality = studioArtworkQuality({ source, location, fileName: "logo.png", scalePercent: 100 });
    assert.equal(quality.badge, "300 DPI");
  }
  assert.equal(studioArtworkQuality({ source, location: { file_width: 14, file_height: 16 }, fileName: "logo.png", scalePercent: 100 }).badge, "DPI —");
});

test("editor scale input feeds the SAME badge formatter rendered on the selected-artwork toolbar", async () => {
  const { readFile } = await import("node:fs/promises");
  const { studioArtworkQuality } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-artwork-quality.ts");
  const jsx = await readFile(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(jsx, /value=\{scale\}[\s\S]*?onChange=\{\(e\) => setScale\(Number\(e\.target\.value\)\)\}/);
  assert.match(jsx, /scalePercent: scale/);
  assert.match(jsx, /\{quality\.badge\}/);
  const input = { source: { width: 600, height: 600 }, location: { unit: "in", file_width: 14, file_height: 16, dpi: 300 }, fileName: "logo.png" };
  assert.equal(studioArtworkQuality({ ...input, scalePercent: 60 }).badge, "71 DPI");
  assert.equal(studioArtworkQuality({ ...input, scalePercent: 100 }).badge, "42 DPI");
});

test("SVG is vector, and mixed-content PDFs are not falsely certified as vector", async () => {
  const { studioArtworkQuality } = await import("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-artwork-quality.ts");
  const input = { source: { width: 1200, height: 1200 }, location: { unit: "in", file_width: 14, file_height: 16, dpi: 300 }, scalePercent: 60 };
  assert.equal(studioArtworkQuality({ ...input, fileName: "logo.svg" }).badge, "Vector");
  assert.equal(studioArtworkQuality({ ...input, fileName: "artwork.pdf" }).badge, "PDF");
  assert.equal(studioArtworkQuality({ ...input, fileName: "artwork.pdf" }).result, null);
});

test("Studio crop/trim settings persist and invalidate old production artwork", async () => {
  const { readFile } = await import("node:fs/promises");
  const backend = await readFile(new URL("../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js", import.meta.url), "utf8");
  const studio = await readFile(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(backend, /trimTransparent: Boolean\(body\.placement\?\.trimTransparent/);
  assert.match(backend, /removeFlatBackground: Boolean\(body\.placement\?\.removeFlatBackground/);
  assert.match(backend, /trimTransparent: Boolean\(value\.placement\?\.trimTransparent/);
  assert.match(studio, /setPreparedFor\(placementKey\(/);
  assert.match(studio, /trimTransparent, removeFlatBackground\)/);
  assert.match(studio, /src=\{artworkPreviewUrl\}/);
  assert.match(studio, /aria-label="Canvas zoom" onChange=\{\(event\) => setCanvasZoom/);
});
