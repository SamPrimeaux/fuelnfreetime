/**
 * Portable storefront option matrix. Display unique options, retaining the
 * local variant ID as cart authority. No inventory or supplier-stock guesses.
 */
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
const text = (value) => String(value ?? "").trim();
export const optionKey = (value) => text(value).toLocaleLowerCase("en-US");

export function variantIsLocallyAvailable(variant) {
  return Number(variant?.inventory_qty || 0) > 0;
}

export function buildProductOptions(variants = []) {
  const rows = Array.isArray(variants) ? variants.filter((v) => v && v.id != null) : [];
  const sizes = new Map();
  const colors = new Map();
  for (const row of rows) {
    const size = text(row.size || row.sku || "One size");
    const color = text(row.color);
    if (!sizes.has(optionKey(size))) sizes.set(optionKey(size), size);
    if (color && !colors.has(optionKey(color))) colors.set(optionKey(color), color);
  }
  const sortedSizes = [...sizes.values()].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
  return { colors: [...colors.values()], sizes: sortedSizes, count: rows.length };
}

export function resolveSelectedVariant(variants = [], { color = "", size = "" } = {}) {
  const chosenSize = optionKey(size);
  const chosenColor = optionKey(color);
  if (!chosenSize) return null;
  const options = (Array.isArray(variants) ? variants : []).filter(
    (v) => v && optionKey(v.size || v.sku || "One size") === chosenSize
  );
  return options.find((v) => optionKey(v.color) === chosenColor) || null;
}

export function sizeHasVariant(variants = [], color = "", size = "") {
  return Boolean(resolveSelectedVariant(variants, { color, size }));
}
