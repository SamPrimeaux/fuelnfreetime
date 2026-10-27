/**
 * Non-destructive print readiness adjustment. A smaller physical placement
 * raises effective *source* PPI; upscaling raster pixels does not.
 * Larger deficits require a better source rather than silently shrinking a
 * merchant's artwork into an unusably tiny design.
 */
export function suggestPrintScale(input: {
  currentScale: number;
  effectivePpi: number | null | undefined;
  targetPpi: number | null | undefined;
  minimumScale?: number;
  maximumReductionFraction?: number;
}): number | null {
  const { currentScale, effectivePpi, targetPpi } = input;
  const minimumScale = input.minimumScale ?? 5;
  const maximumReductionFraction = input.maximumReductionFraction ?? 0.25;
  if (![currentScale, effectivePpi, targetPpi, minimumScale].every((n) => Number.isFinite(n) && Number(n) > 0) ||
      !Number.isFinite(maximumReductionFraction) || maximumReductionFraction < 0 || maximumReductionFraction >= 1) return null;
  if (Number(effectivePpi) >= Number(targetPpi)) return null;
  // 0.995 provides margin for rounded supplier inputs and export precision.
  const recommended = Math.floor((currentScale * Number(effectivePpi) / Number(targetPpi) * 0.995) * 10) / 10;
  if (recommended < minimumScale || recommended < currentScale * (1 - maximumReductionFraction) ||
      recommended >= currentScale) return null;
  return recommended;
}


// A preflight explanation, not a quality-enhancing transform. The source pixel
// dimensions always remain authoritative; we never certify resampled pixels.
export function printSourceRecommendation(input: {
  currentPpi: number | null | undefined;
  targetPpi: number | null | undefined;
  providerPpi: number | null | undefined;
  printedWidthIn: number | null | undefined;
  printedHeightIn: number | null | undefined;
  sourceWidthPx: number | null | undefined;
  sourceHeightPx: number | null | undefined;
}) {
  const { currentPpi, targetPpi, printedWidthIn, printedHeightIn, sourceWidthPx, sourceHeightPx } = input;
  if (![currentPpi, targetPpi, printedWidthIn, printedHeightIn, sourceWidthPx, sourceHeightPx]
    .every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)) return null;
  const target = Number(targetPpi);
  const current = Number(currentPpi);
  return {
    targetPpi: target,
    source: typeof input.providerPpi === "number" && Number.isFinite(input.providerPpi) && input.providerPpi > 0
      ? "provider" as const : "studio_guideline" as const,
    needsSharperSource: current < target,
    requiredWidthPx: Math.ceil(Number(printedWidthIn) * target),
    requiredHeightPx: Math.ceil(Number(printedHeightIn) * target),
    pixelDensityMultiplier: Math.round((target / current) * 10) / 10,
    sourceWidthPx: Math.round(Number(sourceWidthPx)),
    sourceHeightPx: Math.round(Number(sourceHeightPx)),
  };
}
