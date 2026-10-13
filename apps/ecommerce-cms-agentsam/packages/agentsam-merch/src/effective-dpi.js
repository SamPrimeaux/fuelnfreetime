/**
 * Raster sharpness at its placed physical size. Read source pixel dimensions
 * from the original media asset, never a padded/upscaled production derivative.
 * Screen zoom, canvas CSS size, image metadata DPI and rotation are irrelevant.
 * Returns null rather than inventing physical dimensions when provider geometry
 * or the provider's unit is unavailable.
 */
export function effectiveArtworkDpi({ sourceWidthPx, sourceHeightPx, printWidthIn, printHeightIn, placementWidthPercent }) {
  const valid = [sourceWidthPx, sourceHeightPx, printWidthIn, printHeightIn, placementWidthPercent]
    .every((value) => Number.isFinite(value) && value > 0);
  if (!valid) return null;
  const placedWidthIn = printWidthIn * placementWidthPercent / 100;
  const placedHeightIn = placedWidthIn * sourceHeightPx / sourceWidthPx;
  return {
    dpi: Math.floor(Math.min(sourceWidthPx / placedWidthIn, sourceHeightPx / placedHeightIn)),
    printedWidthIn: placedWidthIn,
    printedHeightIn: placedHeightIn,
    fitsPrintHeight: placedHeightIn <= printHeightIn,
  };
}

/** True physical dimensions, not guessed from an unknown provider unit. */
export function providerPrintSizeIn(location) {
  if (!location) return null;
  const unit = String(location.unit || "").toLowerCase();
  const factor = { in: 1, inch: 1, inches: 1, cm: 1 / 2.54, mm: 1 / 25.4 }[unit]
    ?? (["px", "pixel", "pixels"].includes(unit) && Number(location.dpi) > 0 ? 1 / location.dpi : null);
  if (!factor || !(Number(location.file_width) > 0 && Number(location.file_height) > 0)) return null;
  return { width: Math.round(Number(location.file_width) * factor * 1e6) / 1e6, height: Math.round(Number(location.file_height) * factor * 1e6) / 1e6 };
}
