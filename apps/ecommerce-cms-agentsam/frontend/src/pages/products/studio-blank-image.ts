import type { CatalogProduct, Variant } from "./studio-model";

/**
 * Select blank catalog garment references for the merchant's editing canvas.
 * Completeful realistic_image_url, gallery images and provider mockups may
 * already contain someone else's demonstration artwork. Those belong in the
 * catalog browsing gallery, never beneath a merchant's editable print layer.
 *
 * Never use the default product image for a different color when a specific
 * catalog variant is selected. That would falsely preview the merchandise.
 */
export function blankGarmentImageSources(
  variant: Variant | null | undefined,
  product: CatalogProduct,
): string[] {
  const sources = variant
    ? [variant.cover_image_url, variant.main_icon_url]
    : [product.cover_image_url, product.main_icon_url];
  return [...new Set(sources.filter((url): url is string => Boolean(url)))];
}
