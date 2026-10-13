/**
 * Select an image for a specific print location and variant.
 * Never reuse a front catalog photo for an unverified back/side view.
 */
export type StudioSideMockup = {
  active?: number;
  preview_url?: string | null;
  print_location_id?: string | null;
  variant_scope_json?: string | null;
};

function scopeMatchesVariant(scope: string | null | undefined, variantId: string): boolean {
  if (!scope?.trim()) return true;
  try {
    const parsed: unknown = JSON.parse(scope);
    if (Array.isArray(parsed)) return parsed.some((value) => String(value) === variantId);
    if (parsed && typeof parsed === "object") {
      const values = parsed as Record<string, unknown>;
      for (const key of ["variant_ids", "catalog_variant_ids", "completeful_variant_ids", "variants"]) {
        const candidate = values[key];
        if (Array.isArray(candidate)) return candidate.some((value) => String(value) === variantId);
      }
    }
  } catch {
    return false;
  }
  return false; // Unknown scopes are not proof of the selected garment color.
}

export function selectStudioSideImage(
  mockups: readonly StudioSideMockup[],
  locationId: string,
  variantId: string,
  artboardImage: string | null | undefined,
  frontVariantImage: string | null | undefined,
  isFront: boolean,
): string | null {
  const sideMockups = mockups.filter((mockup) =>
    mockup.active !== 0 &&
    mockup.print_location_id === locationId &&
    Boolean(mockup.preview_url)
  );
  const exactVariant = sideMockups.find((mockup) =>
    Boolean(mockup.variant_scope_json?.trim()) &&
    scopeMatchesVariant(mockup.variant_scope_json, variantId)
  );
  if (exactVariant?.preview_url) return exactVariant.preview_url;
  // Generic artboard photos and unscoped mockups often depict only the
  // default (black) garment, regardless of the selected color. A preview of
  // an unverified color is worse than a truthful side-correct silhouette.
  // A front catalog image is safe only for the selected front variant.
  if (isFront) return frontVariantImage || artboardImage || null;
  return null;
}
