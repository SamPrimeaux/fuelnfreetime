export type CatalogProduct = {
  completeful_product_id: string;
  catalog_product_id?: string;
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
};
export type Variant = {
  completeful_variant_id: string;
  variant_title?: string;
  name?: string;
  cover_image_url?: string;
  realistic_image_url?: string;
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
