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

/**
 * Completeful uses attribute scopes such as {"Color":"Moss"} for garment
 * mockups, NOT necessarily a list of variant IDs. Never reject a real
 * provider Back image merely because its scope is attribute-based.
 */
function scopeMatchesVariant(scope: string | null | undefined, variantId: string,
  attributes: Record<string, string>): boolean {
  if (!scope?.trim()) return false;
  try {
    const parsed: unknown = JSON.parse(scope);
    if (Array.isArray(parsed)) return parsed.some((value) => String(value) === variantId);
    if (parsed && typeof parsed === "object") {
      const values = parsed as Record<string, unknown>;
      for (const key of ["variant_ids", "catalog_variant_ids", "completeful_variant_ids", "variants"]) {
        const candidate = values[key];
        if (Array.isArray(candidate)) return candidate.some((value) => String(value) === variantId);
      }
      const entries = Object.entries(values);
      if (!entries.length) return false;
      return entries.every(([key, value]) => {
        if (value == null || typeof value === "object") return false;
        const found = Object.entries(attributes).find(([candidate]) =>
          candidate.trim().toLowerCase() === key.trim().toLowerCase());
        return Boolean(found && found[1].trim().toLowerCase() === String(value).trim().toLowerCase());
      });
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * An exact supplier color/side catalog picture is a REFERENCE, not an empty
 * garment plate and not a completed decorated merchant mockup.
 */
export function exactCatalogSideReference(
  mockups: readonly StudioSideMockup[],
  locationId: string,
  variantId: string,
  attributes: Record<string, string>,
): string | null {
  return mockups.find((mockup) =>
    mockup.active !== 0 &&
    mockup.print_location_id === locationId &&
    Boolean(mockup.preview_url) &&
    Boolean(mockup.variant_scope_json?.trim()) &&
    scopeMatchesVariant(mockup.variant_scope_json, variantId, attributes)
  )?.preview_url || null;
}

/**
 * If Completeful supplies only an unscoped photo for a print location,
 * it is still a useful SIDE reference (never a verified color or blank).
 * Keep it separate from clean candidates and never overlay print artwork.
 */
export function unscopedCatalogSideReference(
  mockups: readonly StudioSideMockup[],
  locationId: string,
): string | null {
  return mockups.find((m) =>
    m.active !== 0 &&
    m.print_location_id === locationId &&
    typeof m.preview_url === "string" && m.preview_url.length > 0 &&
    (!m.variant_scope_json || m.variant_scope_json.trim() === "" ||
      m.variant_scope_json.trim() === "{}" || m.variant_scope_json.trim() === "null")
  )?.preview_url || null;
}

/**
 * Product Studio blank-view registry. This is merchant curation (not provider
 * catalog state), scoped by physical product + exact color + print side.
 * A photo approved for one color or side must never be borrowed for another.
 */
export type ApprovedBlankView = {
  color_key: string;
  side_key: string;
  image_url: string;
  source_kind?: string;
  media_asset_id?: number;
};

export function approvedBlankView(
  entries: readonly ApprovedBlankView[] | null | undefined,
  color: string,
  side: string,
): string | null {
  const key = (value: string) => String(value || "").trim().toLowerCase();
  return entries?.find((entry) =>
    key(entry.color_key) === key(color) && key(entry.side_key) === key(side) &&
    typeof entry.image_url === "string" && entry.image_url.length > 0
  )?.image_url || null;
}

/**
 * Completeful's mockup preview and the unprinted garment background are
 * siblings. Only derive a candidate for an EXACT color + print location
 * match. This is an unverified candidate until an image actually loads.
 * The supplier sample remains a clearly labeled fallback if unavailable.
 */
export function exactCatalogBlankCandidate(
  mockups: readonly StudioSideMockup[],
  locationId: string,
  variantId: string,
  attributes: Record<string, string>,
): string | null {
  const reference = exactCatalogSideReference(mockups, locationId, variantId, attributes);
  if (!reference) return null;
  try {
    const url = new URL(reference);
    if (url.protocol !== "https:" ||
        url.origin !== "https://jvkydnvdajcfnqysmuwt.supabase.co" ||
        !/^\/storage\/v1\/object\/public\/product-images\/mockups\/[^/]+\/[^/]+\/preview\.png$/i.test(url.pathname) ||
        url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/preview\.png$/i, "/background.png");
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Print placement is not a different artwork every time someone changes a
 * shirt color or size. For preview freshness only, compare every stored
 * placement input except variantId (slot 1). Supplier render lookup still
 * requires the exact variant color and print location.
 */
export function samePrintPlacementAcrossColors(stored: string | null | undefined, current: string): boolean {
  if (!stored) return false;
  if (stored === current) return true;
  try {
    const left: unknown = JSON.parse(stored);
    const right: unknown = JSON.parse(current);
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === 11 && right.length === 11 &&
      left.every((value, index) => index === 1 || value === right[index]);
  } catch {
    return false;
  }
}

export function selectStudioSideImage(
  mockups: readonly StudioSideMockup[],
  locationId: string,
  variantId: string,
  artboardImage: string | null | undefined,
  frontVariantImage: string | null | undefined,
  isFront: boolean,
  variantAttributes: Record<string, string> = {},
  distinctProviderSideArtboard = false,
): string | null {
  const sideMockups = mockups.filter((mockup) =>
    mockup.active !== 0 &&
    mockup.print_location_id === locationId &&
    Boolean(mockup.preview_url)
  );
  const exactVariant = sideMockups.find((mockup) =>
    Boolean(mockup.variant_scope_json?.trim()) &&
    scopeMatchesVariant(mockup.variant_scope_json, variantId, variantAttributes)
  );
  if (exactVariant?.preview_url) return exactVariant.preview_url;
  // Catalog print-area artboards are real provider assets. Some products
  // (for example sunglasses Left/Right) have distinct side images even when
  // mockups are not variant-scoped. Do not discard those assets.
  // Never accept a mirrored Front URL as proof of a Back view.
  if (!isFront && distinctProviderSideArtboard && artboardImage) return artboardImage;
  // Generic artboard photos and unscoped mockups often depict only the
  // default (black) garment, regardless of the selected color. A preview of
  // an unverified color is worse than a truthful side-correct silhouette.
  // A front catalog image is safe only for the selected front variant.
  if (isFront) return frontVariantImage || artboardImage || null;
  return null;
}
