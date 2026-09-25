/**
 * Product Studio catalog model — aligned to agentsam.commerce.catalog.v1.
 * Provider-specific ids (completeful_*) are optional aliases from the host adapter.
 */

export type CatalogProduct = {
  /** Canonical catalog id for Product Studio / commerce.catalog */
  catalog_product_id: string;
  name: string;
  product_type?: string;
  print_type?: string;
  material?: string;
  sku?: string;
  available?: number;
  pricing_currency?: string;
  fulfillment_cost_free_cents?: number | null;
  realistic_image_url?: string;
  cover_image_url?: string;
  main_icon_url?: string;
  variant_count?: number;
  print_location_count?: number;
  mockup_count?: number;
  provider?: string;
  provider_product_id?: string;
  /** @deprecated adapter alias — prefer catalog_product_id */
  completeful_product_id?: string;
};

export type Variant = {
  catalog_variant_id: string;
  variant_title?: string;
  name?: string;
  cover_image_url?: string;
  realistic_image_url?: string;
  provider_variant_id?: string;
  /** @deprecated adapter alias — prefer catalog_variant_id */
  completeful_variant_id?: string;
};

export type PrintLocation = {
  print_location_id: string;
  name: string;
  enabled: number;
  file_width?: number;
  file_height?: number;
  dpi?: number;
  unit?: string;
  artboard_image_url?: string;
};

export type ProductDetail = {
  product: CatalogProduct;
  variants: Variant[];
  print_locations: PrintLocation[];
  images: { url: string; thumbnail_url?: string }[];
  mockups: {
    mockup_id: string;
    name: string;
    preview_url?: string;
    active: number;
  }[];
};

export type MediaAsset = {
  id: number;
  url: string;
  filename: string;
  content_type?: string;
  size_bytes?: number;
};

export type CatalogResponse = {
  items: CatalogProduct[];
  pagination: { total: number; has_more: boolean };
};

/** Resolve canonical product id from catalog contract or Completeful adapter alias. */
export function catalogProductId(p: CatalogProduct | null | undefined): string {
  if (!p) return "";
  return (
    p.catalog_product_id ||
    p.provider_product_id ||
    p.completeful_product_id ||
    ""
  );
}

/** Resolve canonical variant id from catalog contract or Completeful adapter alias. */
export function catalogVariantId(v: Variant | null | undefined): string {
  if (!v) return "";
  return (
    v.catalog_variant_id ||
    v.provider_variant_id ||
    v.completeful_variant_id ||
    ""
  );
}

/**
 * Normalize host/admin payloads that still emit completeful_* into commerce.catalog shape.
 */
export function normalizeCatalogProduct(
  raw: Partial<CatalogProduct> & Record<string, unknown>,
): CatalogProduct {
  const completefulId =
    typeof raw.completeful_product_id === "string"
      ? raw.completeful_product_id
      : undefined;
  const catalogId =
    (typeof raw.catalog_product_id === "string" && raw.catalog_product_id) ||
    (typeof raw.provider_product_id === "string" && raw.provider_product_id) ||
    completefulId ||
    "";
  return {
    ...raw,
    catalog_product_id: catalogId,
    name: String(raw.name || ""),
    provider: typeof raw.provider === "string" ? raw.provider : "completeful",
    provider_product_id:
      (typeof raw.provider_product_id === "string" && raw.provider_product_id) ||
      completefulId,
    completeful_product_id: completefulId || catalogId || undefined,
  };
}

export function normalizeVariant(
  raw: Partial<Variant> & Record<string, unknown>,
): Variant {
  const completefulId =
    typeof raw.completeful_variant_id === "string"
      ? raw.completeful_variant_id
      : undefined;
  const catalogId =
    (typeof raw.catalog_variant_id === "string" && raw.catalog_variant_id) ||
    (typeof raw.provider_variant_id === "string" && raw.provider_variant_id) ||
    completefulId ||
    "";
  return {
    ...raw,
    catalog_variant_id: catalogId,
    provider_variant_id:
      (typeof raw.provider_variant_id === "string" && raw.provider_variant_id) ||
      completefulId,
    completeful_variant_id: completefulId || catalogId || undefined,
  };
}

export const productImage = (p: CatalogProduct) =>
  p.realistic_image_url || p.cover_image_url || p.main_icon_url;

export function printPixelSize(location?: PrintLocation) {
  if (
    !location?.file_width ||
    !location.file_height ||
    location.file_width <= 0 ||
    location.file_height <= 0
  )
    return null;
  const unit = location.unit?.toLowerCase();
  const dpi = location.dpi && location.dpi > 0 ? location.dpi : 300;
  const factor =
    unit === "px" || unit === "pixel" || unit === "pixels"
      ? 1
      : unit === "in" || unit === "inch" || unit === "inches"
        ? dpi
        : unit === "cm"
          ? dpi / 2.54
          : unit === "mm"
            ? dpi / 25.4
            : null;
  return factor == null
    ? null
    : {
        width: Math.round(location.file_width * factor),
        height: Math.round(location.file_height * factor),
      };
}

export function printSizeLabel(location?: PrintLocation) {
  if (!location?.file_width || !location.file_height)
    return "Print dimensions not supplied";
  const pixels = printPixelSize(location);
  return `${location.file_width} × ${location.file_height} ${location.unit || "(unit not supplied)"}${pixels && location.unit?.toLowerCase() !== "px" ? ` · ${pixels.width} × ${pixels.height} px` : ""}`;
}

export function costLabel(p: CatalogProduct) {
  if (p.fulfillment_cost_free_cents == null) return "Cost on request";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: p.pricing_currency || "USD",
    }).format(p.fulfillment_cost_free_cents / 100);
  } catch {
    return `${(p.fulfillment_cost_free_cents / 100).toFixed(2)} ${p.pricing_currency || "USD"}`;
  }
}
