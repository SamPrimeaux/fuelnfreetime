/**
 * Merchant approved garment blanks. A supplier mockup's sample artwork is
 * never written here. The caller selects an existing Media Library image.
 */
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const allowedSide = new Set(["front", "back", "left", "right"]);
function parseJson(value) {
  try { return typeof value === "string" ? JSON.parse(value) : value || {}; }
  catch { return {}; }
}
function declaredColor(variant) {
  const attrs = { ...parseJson(variant.attributes_json), ...parseJson(variant.variant_attributes_json) };
  return Object.entries(attrs).find(([k]) => /^colou?r$/i.test(k))?.[1] || "";
}
function sideOf(location) {
  const name = normalize(location.name);
  if (/(^|\s)front(\s|$)/.test(name)) return "front";
  if (/(^|\s)back(\s|$)/.test(name)) return "back";
  if (/(^|\s)left(\s|$)/.test(name)) return "left";
  if (/(^|\s)right(\s|$)/.test(name)) return "right";
  return null;
}

export async function updateBlankGarmentView(env, productId, input = {}, remove = false) {
  const color = normalize(input.color);
  const side = normalize(input.side);
  if (!color || !allowedSide.has(side)) throw new Error("blank_view_color_and_side_required");

  const product = await env.DB.prepare(
    "SELECT completeful_product_id FROM completeful_catalog_products WHERE completeful_product_id=?"
  ).bind(productId).first();
  if (!product) throw new Error("catalog_product_not_found");

  const [{ results: variants = [] }, { results: locations = [] }] = await Promise.all([
    env.DB.prepare("SELECT attributes_json, variant_attributes_json FROM completeful_catalog_variants WHERE completeful_product_id=?")
      .bind(productId).all(),
    env.DB.prepare("SELECT name FROM completeful_catalog_print_locations WHERE completeful_product_id=? AND enabled=1")
      .bind(productId).all(),
  ]);
  if (!variants.some((v) => normalize(declaredColor(v)) === color)) throw new Error("catalog_color_not_found");
  if (!locations.some((l) => sideOf(l) === side)) throw new Error("catalog_print_side_not_found");

  if (remove) {
    await env.DB.prepare(
      "DELETE FROM product_studio_blank_views WHERE completeful_catalog_product_id=? AND color_key=? AND side_key=?"
    ).bind(productId, color, side).run();
    return { ok: true, removed: true, color_key: color, side_key: side };
  }
  const mediaId = Number(input.media_asset_id);
  if (!Number.isSafeInteger(mediaId) || mediaId < 1) throw new Error("media_asset_id_required");
  const asset = await env.DB.prepare(
    "SELECT id,url,content_type FROM media_assets WHERE id=?"
  ).bind(mediaId).first();
  if (!asset || !/^image\/(?:png|jpeg|webp)$/i.test(asset.content_type || ""))
    throw new Error("blank_requires_existing_raster_media_asset");

  const note = String(input.source_note || "").trim().slice(0,500);
  if (!note) throw new Error("blank_photo_provenance_required");
  await env.DB.prepare(
    `INSERT INTO product_studio_blank_views (
       completeful_catalog_product_id,color_key,side_key,media_asset_id,source_note
     ) VALUES(?,?,?,? ,?)
     ON CONFLICT(completeful_catalog_product_id,color_key,side_key)
       DO UPDATE SET media_asset_id=excluded.media_asset_id,
         source_note=excluded.source_note,approved_at=datetime('now'),updated_at=datetime('now')`
  ).bind(productId,color,side,mediaId,note).run();
  return { ok: true, blank_view: { color_key: color, side_key: side, media_asset_id: mediaId,
    image_url: asset.url, source_kind: "curated_media" } };
}
