/**
 * Media library: R2-backed uploads tracked in D1 (media_assets), so every
 * image survives independently of any single product and can be reused
 * across the catalog. product_images is the join table that attaches
 * assets to products with ordering + a primary flag.
 */

function json(data, init = {}) {
  return Response.json(data, init);
}

function sanitizeFilename(name) {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot === -1 ? name : name.slice(0, lastDot);
  const ext = lastDot === -1 ? "" : name.slice(lastDot).toLowerCase();
  const cleanBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return (cleanBase || "file") + ext.replace(/[^a-z0-9.]/g, "");
}

async function uniqueKey(env, prefix, filename) {
  let key = prefix + filename;
  const existing = await env.DB.prepare(`SELECT 1 FROM media_assets WHERE r2_key = ?`)
    .bind(key)
    .first();
  if (!existing) return key;

  const lastDot = filename.lastIndexOf(".");
  const base = lastDot === -1 ? filename : filename.slice(0, lastDot);
  const ext = lastDot === -1 ? "" : filename.slice(lastDot);
  for (let i = 2; i < 1000; i++) {
    key = `${prefix}${base}-${i}${ext}`;
    const row = await env.DB.prepare(`SELECT 1 FROM media_assets WHERE r2_key = ?`)
      .bind(key)
      .first();
    if (!row) return key;
  }
  return `${prefix}${base}-${Date.now()}${ext}`;
}

// POST /api/admin/media — multipart upload, supports multiple files at once.
// Fields: files (one or more), prefix (optional, default "uploads/"), category (optional)
export async function uploadMedia(request, env) {
  const form = await request.formData();
  const files = form.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
  if (!files.length) return json({ error: "No files provided" }, { status: 400 });

  let prefix = (form.get("prefix") || "uploads/").toString();
  if (!prefix.endsWith("/")) prefix += "/";
  prefix = prefix.replace(/^\/+/, "");
  const category = form.get("category") ? form.get("category").toString() : null;

  const created = [];
  for (const file of files) {
    const filename = sanitizeFilename(file.name || "upload");
    const key = await uniqueKey(env, prefix, filename);
    const buf = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";

    await env.WEBSITE_ASSETS.put(key, buf, { httpMetadata: { contentType } });

    const url = "/media/" + key;
    const result = await env.DB.prepare(
      `INSERT INTO media_assets (r2_key, url, filename, content_type, size_bytes, category)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(key, url, filename, contentType, buf.byteLength, category)
      .run();

    created.push({
      id: result.meta.last_row_id,
      r2_key: key,
      url,
      filename,
      content_type: contentType,
      size_bytes: buf.byteLength,
      category,
    });
  }

  return json({ ok: true, assets: created });
}

export async function listMedia(request, env, url) {
  const category = url.searchParams.get("category");
  const stmt = category
    ? env.DB.prepare(`SELECT * FROM media_assets WHERE category = ? ORDER BY id DESC`).bind(category)
    : env.DB.prepare(`SELECT * FROM media_assets ORDER BY id DESC`);
  const { results } = await stmt.all();
  return json({ ok: true, assets: results });
}

export async function deleteMedia(request, env, id) {
  const asset = await env.DB.prepare(`SELECT r2_key FROM media_assets WHERE id = ?`).bind(id).first();
  if (!asset) return json({ error: "Not found" }, { status: 404 });

  await env.WEBSITE_ASSETS.delete(asset.r2_key);
  await env.DB.prepare(`DELETE FROM media_assets WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

// ----- Product <-> image associations -----

export async function listProductImages(request, env, productId) {
  const { results } = await env.DB.prepare(
    `SELECT pi.id AS link_id, pi.position, pi.is_primary, m.*
     FROM product_images pi
     JOIN media_assets m ON m.id = pi.media_asset_id
     WHERE pi.product_id = ?
     ORDER BY pi.is_primary DESC, pi.position ASC`
  )
    .bind(productId)
    .all();
  return json({ ok: true, images: results });
}

export async function attachProductImage(request, env, productId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.media_asset_id) return json({ error: "media_asset_id required" }, { status: 400 });

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?`
  )
    .bind(productId)
    .first();
  const isFirst = countRow.n === 0;

  try {
    await env.DB.prepare(
      `INSERT INTO product_images (product_id, media_asset_id, position, is_primary)
       VALUES (?, ?, ?, ?)`
    )
      .bind(productId, body.media_asset_id, countRow.n, isFirst ? 1 : 0)
      .run();
  } catch (err) {
    return json({ error: "Image already attached to this product" }, { status: 400 });
  }

  if (isFirst) {
    const asset = await env.DB.prepare(`SELECT url FROM media_assets WHERE id = ?`)
      .bind(body.media_asset_id)
      .first();
    if (asset) {
      await env.DB.prepare(`UPDATE products SET image_url = ? WHERE id = ?`)
        .bind(asset.url, productId)
        .run();
    }
  }

  return json({ ok: true });
}

export async function detachProductImage(request, env, productId, mediaAssetId) {
  await env.DB.prepare(
    `DELETE FROM product_images WHERE product_id = ? AND media_asset_id = ?`
  )
    .bind(productId, mediaAssetId)
    .run();
  return json({ ok: true });
}

export async function setPrimaryProductImage(request, env, productId, mediaAssetId) {
  await env.DB.prepare(`UPDATE product_images SET is_primary = 0 WHERE product_id = ?`)
    .bind(productId)
    .run();
  await env.DB.prepare(
    `UPDATE product_images SET is_primary = 1 WHERE product_id = ? AND media_asset_id = ?`
  )
    .bind(productId, mediaAssetId)
    .run();

  const asset = await env.DB.prepare(`SELECT url FROM media_assets WHERE id = ?`)
    .bind(mediaAssetId)
    .first();
  if (asset) {
    await env.DB.prepare(`UPDATE products SET image_url = ? WHERE id = ?`)
      .bind(asset.url, productId)
      .run();
  }

  return json({ ok: true });
}
