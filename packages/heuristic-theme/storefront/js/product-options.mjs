/* Portable product-option projections. Store API remains authority for availability. */
const SIZE_ORDER = ["XXS","XS","S","M","L","XL","2XL","3XL","4XL","5XL","6XL"];
const norm = value => String(value ?? "").trim().toLocaleLowerCase("en-US");
const canonicalSize = value => ({
  xxl:"2XL",xxxl:"3XL",xxxxl:"4XL",xxxxxl:"5XL",xxxxxxl:"6XL",
})[norm(value)] || String(value ?? "").trim();
const unique = values => [...new Map(values.filter(Boolean).map(v => [norm(v),String(v).trim()])).values()];
export function isOrderable(v) {
  if (!v) return false;
  if (typeof v.available === "boolean") return v.available;
  return Number(v.inventory_qty || 0) > 0;
}
export function getProductOptions(variants = []) {
  const items = Array.isArray(variants) ? variants.filter(v => v && v.id != null) : [];
  const colors = unique(items.map(v => v.color));
  const sizes = unique(items.map(v => canonicalSize(v.size))).sort((a,b) => {
    const ai=SIZE_ORDER.indexOf(a.toUpperCase()),bi=SIZE_ORDER.indexOf(b.toUpperCase());
    if (ai>=0&&bi>=0)return ai-bi;
    if(ai>=0)return -1;if(bi>=0)return 1;
    return a.localeCompare(b,undefined,{numeric:true});
  });
  return { colors, sizes, hasColors:colors.length>0, hasSizes:sizes.length>0, count:items.length };
}
export function resolveProductVariant(variants=[], color="", size="") {
  const options=getProductOptions(variants);
  if(options.hasColors&&!norm(color))return null;
  if(options.hasSizes&&!norm(size))return null;
  return (variants||[]).find(v => v && v.id!=null &&
    (!options.hasColors || norm(v.color)===norm(color)) &&
    (!options.hasSizes || norm(canonicalSize(v.size))===norm(canonicalSize(size)))) || null;
}
export function sizeAvailable(variants=[],color="",size="") {
  if (!color && getProductOptions(variants).hasColors) {
    return variants.some(v=>v && norm(canonicalSize(v.size))===norm(canonicalSize(size)) && isOrderable(v));
  }
  return isOrderable(resolveProductVariant(variants,color,size));
}
export function sizeExists(variants=[],color="",size="") {
  if (!color && getProductOptions(variants).hasColors) {
    return variants.some(v=>v && norm(canonicalSize(v.size))===norm(canonicalSize(size)));
  }
  return Boolean(resolveProductVariant(variants,color,size));
}
export function normalizeImages(product = {}) {
  const images=Array.isArray(product.images)?product.images.filter(i=>i && i.url):[];
  if(images.length)return images;
  const url=product.primary_image||product.image_url;
  return url?[{url,alt_text:product.title||"",is_primary:1}]:[];
}
export function imagesForColor(product={},color="") {
  const images=normalizeImages(product);
  if(!norm(color))return { images, reference:false };
  const direct=images.filter(i=>norm(i.color)===norm(color));
  if(direct.length)return {images:direct,reference:false};
  const references=(product.color_images||[]).filter(i=>norm(i.color)===norm(color) && i.url);
  // Provider reference is an actual catalog image, not a decorated FNF photo.
  if(references.length)return {images:references,reference:true};
  return {images,reference:false};
}
