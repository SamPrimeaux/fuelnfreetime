/**
 * Media library: R2 storage + D1 metadata (virtual folders).
 * Folder membership and display_order are D1-only — never R2 copy/move.
 */

const MEDIA_FOLDERS = ["images", "videos", "products"];

const VIDEO_EXTS = new Set(["mp4", "mov", "webm", "m4v", "glb", "usdz"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);
const NON_MEDIA_EXTS = new Set([
  "json",
  "jsonl",
  "txt",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "ts",
  "tsx",
  "map",
  "sql",
  "md",
  "csv",
  "log",
  "yml",
  "yaml",
  "env",
  "lock",
  "gitignore",
]);

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

function extensionOf(key) {
  const name = key.split("/").pop() || "";
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function guessContentType(key) {
  const ext = extensionOf(key);
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    glb: "model/gltf-binary",
    usdz: "model/vnd.usdz+zip",
  };
  return map[ext] || "application/octet-stream";
}

function inferFolder(r2Key, contentType = "") {
  const key = (r2Key || "").toLowerCase();
  const ext = extensionOf(key);
  if (key.startsWith("products/")) return "products";
  if (
    VIDEO_EXTS.has(ext) ||
    key.includes("/videos/") ||
    key.includes("/3d-models/")
  ) {
    return "videos";
  }
  if ((contentType || "").startsWith("video/") || (contentType || "").startsWith("model/")) {
    return "videos";
  }
  return "images";
}

export function isBrowsableMedia(row) {
  const key = row?.r2_key || row?.filename || "";
  const ext = extensionOf(key);
  if (NON_MEDIA_EXTS.has(ext)) return false;

  const ct = String(row?.content_type || guessContentType(key)).toLowerCase();
  if (ct === "application/json" || ct === "application/ld+json") return false;
  if (ct.startsWith("text/") && !ct.startsWith("image/")) return false;

  if (ct.startsWith("image/") || ct.startsWith("video/") || ct.startsWith("model/")) return true;
  if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) return true;

  if (ct === "application/octet-stream" && IMAGE_EXTS.has(ext)) return true;
  return false;
}

function normalizeFolder(folder) {
  const f = (folder || "images").toLowerCase();
  return MEDIA_FOLDERS.includes(f) ? f : "images";
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
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

async function nextDisplayOrder(env, folder) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(MAX(display_order), 0) AS n FROM media_assets WHERE folder = ?`
  )
    .bind(folder)
    .first();
  return (row?.n || 0) + 1;
}

function rowToAsset(row) {
  let placement = null;
  if (row.placement_json) {
    try {
      placement = JSON.parse(row.placement_json);
    } catch {
      placement = null;
    }
  }
  return {
    id: row.id,
    r2_key: row.r2_key,
    url: row.url,
    filename: row.filename,
    content_type: row.content_type,
    size_bytes: row.size_bytes,
    category: row.category,
    folder: row.folder || inferFolder(row.r2_key, row.content_type),
    display_order: row.display_order ?? 0,
    alt_text: row.alt_text || "",
    placement,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

async function folderCounts(env) {
  const { results } = await env.DB.prepare(
    `SELECT folder, r2_key, content_type, filename FROM media_assets`
  ).all();
  const counts = { images: 0, videos: 0, products: 0 };
  for (const row of results) {
    if (!isBrowsableMedia(row)) continue;
    const f = normalizeFolder(row.folder);
    counts[f] = (counts[f] || 0) + 1;
  }
  return counts;
}

export async function syncMediaFromR2(env) {
  const { results: existingRows } = await env.DB.prepare(`SELECT r2_key FROM media_assets`).all();
  const existingKeys = new Set(existingRows.map((r) => r.r2_key));

  let cursor;
  let inserted = 0;
  let scanned = 0;

  do {
    const page = await env.WEBSITE_ASSETS.list({ cursor, limit: 1000 });
    for (const obj of page.objects) {
      scanned += 1;
      if (existingKeys.has(obj.key)) continue;

      const filename = obj.key.split("/").pop() || obj.key;
      const contentType = guessContentType(obj.key);
      if (!isBrowsableMedia({ r2_key: obj.key, content_type: contentType, filename })) continue;

      const folder = inferFolder(obj.key, contentType);
      const order = await nextDisplayOrder(env, folder);

      await env.DB.prepare(
        `INSERT INTO media_assets
           (r2_key, url, filename, content_type, size_bytes, category, folder, display_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(
          obj.key,
          "/media/" + obj.key,
          filename,
          contentType,
          obj.size,
          null,
          folder,
          order
        )
        .run();

      existingKeys.add(obj.key);
      inserted += 1;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  // Normalize folder on rows that predate virtual folders
  await env.DB.prepare(
    `UPDATE media_assets SET folder = 'products' WHERE r2_key LIKE 'products/%' AND folder != 'products'`
  ).run();
  await env.DB.prepare(
    `UPDATE media_assets SET folder = 'videos'
     WHERE (lower(r2_key) LIKE '%.mp4' OR lower(r2_key) LIKE '%.mov' OR lower(r2_key) LIKE '%.webm'
            OR lower(r2_key) LIKE '%.glb' OR lower(r2_key) LIKE '%.usdz'
            OR r2_key LIKE 'archive/shopify-import/videos/%'
            OR r2_key LIKE 'archive/shopify-import/3d-models/%')
       AND folder != 'videos'`
  ).run();

  return { ok: true, scanned, inserted, counts: await folderCounts(env) };
}

export async function uploadMedia(request, env) {
  const form = await request.formData();
  const files = form.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
  if (!files.length) return json({ error: "No files provided" }, { status: 400 });

  let prefix = (form.get("prefix") || "uploads/").toString();
  if (!prefix.endsWith("/")) prefix += "/";
  prefix = prefix.replace(/^\/+/, "");
  const category = form.get("category") ? form.get("category").toString() : null;
  const folderHint = form.get("folder") ? normalizeFolder(form.get("folder").toString()) : null;

  const created = [];
  for (const file of files) {
    const filename = sanitizeFilename(file.name || "upload");
    const key = await uniqueKey(env, prefix, filename);
    const buf = await file.arrayBuffer();
    const contentType = file.type || guessContentType(key);
    const folder = folderHint || inferFolder(key, contentType);
    const displayOrder = await nextDisplayOrder(env, folder);

    await env.WEBSITE_ASSETS.put(key, buf, { httpMetadata: { contentType } });

    const url = "/media/" + key;
    const result = await env.DB.prepare(
      `INSERT INTO media_assets
         (r2_key, url, filename, content_type, size_bytes, category, folder, display_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(key, url, filename, contentType, buf.byteLength, category, folder, displayOrder)
      .run();

    created.push(
      rowToAsset({
        id: result.meta.last_row_id,
        r2_key: key,
        url,
        filename,
        content_type: contentType,
        size_bytes: buf.byteLength,
        category,
        folder,
        display_order: displayOrder,
        alt_text: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );
  }

  return json({ ok: true, assets: created });
}

export async function listMedia(request, env, url) {
  const folderParam = url.searchParams.get("folder");
  const view = url.searchParams.get("view") || "images";
  const prefix = (url.searchParams.get("prefix") || "").trim().replace(/^\/+/, "");
  const doSync = url.searchParams.get("sync") === "1";

  if (doSync) {
    try {
      await syncMediaFromR2(env);
    } catch (err) {
      console.error("media sync failed", err);
    }
  }

  const counts = await folderCounts(env);

  let assets;

  if (prefix) {
    const like = `${prefix.replace(/[%_]/g, "")}%`;
    const { results } = await env.DB.prepare(
      `SELECT * FROM media_assets WHERE r2_key LIKE ? ORDER BY display_order ASC, id ASC`
    )
      .bind(like)
      .all();
    assets = results.map(rowToAsset);
  } else if (folderParam && MEDIA_FOLDERS.includes(folderParam)) {
    const { results } = await env.DB.prepare(
      `SELECT * FROM media_assets WHERE folder = ? ORDER BY display_order ASC, id ASC`
    )
      .bind(folderParam)
      .all();
    assets = results.map(rowToAsset);
  } else if (view === "all") {
    const { results } = await env.DB.prepare(
      `SELECT * FROM media_assets ORDER BY folder ASC, display_order ASC, id ASC`
    ).all();
    assets = results.map(rowToAsset);
  } else {
    const { results } = await env.DB.prepare(
      `SELECT * FROM media_assets WHERE folder = 'images' ORDER BY display_order ASC, id ASC`
    ).all();
    assets = results.map(rowToAsset);
  }

  assets = assets.filter(isBrowsableMedia);

  return json({
    ok: true,
    assets,
    counts,
    folders: MEDIA_FOLDERS,
    view: folderParam || view,
    prefix: prefix || null,
  });
}

export async function updateMedia(request, env, id) {
  const body = await readJson(request);
  if (!body) return json({ error: "Invalid body" }, { status: 400 });

  const asset = await env.DB.prepare(`SELECT * FROM media_assets WHERE id = ?`).bind(id).first();
  if (!asset) return json({ error: "Not found" }, { status: 404 });

  const filename = body.filename != null ? String(body.filename).trim().slice(0, 255) : asset.filename;
  const altText = body.alt_text != null ? String(body.alt_text).trim().slice(0, 500) : asset.alt_text;
  const folder =
    body.folder != null ? normalizeFolder(body.folder) : normalizeFolder(asset.folder);
  const displayOrder =
    body.display_order != null ? Math.round(Number(body.display_order)) : asset.display_order;

  let placementJson = asset.placement_json;
  if (body.placement !== undefined) {
    if (body.placement === null) {
      placementJson = null;
    } else if (typeof body.placement === "object") {
      placementJson = JSON.stringify(body.placement);
    }
  }

  await env.DB.prepare(
    `UPDATE media_assets
     SET filename = ?, alt_text = ?, folder = ?, display_order = ?, placement_json = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(filename, altText, folder, displayOrder, placementJson, id)
    .run();

  const updated = await env.DB.prepare(`SELECT * FROM media_assets WHERE id = ?`).bind(id).first();
  return json({ ok: true, asset: rowToAsset(updated) });
}

export async function reorderMedia(request, env) {
  const body = await readJson(request);
  if (!body || !Array.isArray(body.items)) {
    return json({ error: "items array required" }, { status: 400 });
  }

  for (const item of body.items) {
    if (!item?.id) continue;
    const folder = item.folder != null ? normalizeFolder(item.folder) : undefined;
    if (folder != null && item.display_order != null) {
      await env.DB.prepare(
        `UPDATE media_assets SET folder = ?, display_order = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(folder, Math.round(Number(item.display_order)), item.id)
        .run();
    } else if (folder != null) {
      await env.DB.prepare(
        `UPDATE media_assets SET folder = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(folder, item.id)
        .run();
    } else if (item.display_order != null) {
      await env.DB.prepare(
        `UPDATE media_assets SET display_order = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(Math.round(Number(item.display_order)), item.id)
        .run();
    }
  }

  return json({ ok: true, counts: await folderCounts(env) });
}

export async function deleteMedia(request, env, id) {
  const asset = await env.DB.prepare(`SELECT r2_key FROM media_assets WHERE id = ?`).bind(id).first();
  if (!asset) return json({ error: "Not found" }, { status: 404 });

  await env.DB.prepare(`DELETE FROM product_images WHERE media_asset_id = ?`).bind(id).run();
  await env.WEBSITE_ASSETS.delete(asset.r2_key);
  await env.DB.prepare(`DELETE FROM media_assets WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

export async function platformBindings(env) {
  return json({
    ok: true,
    bindings: {
      d1: !!env.DB,
      r2: !!env.WEBSITE_ASSETS,
      kv: !!env.CMS_CACHE,
      workers_ai: !!env.AGENTSAM_WAI,
      assets: !!env.ASSETS,
    },
    note: "Admin CRUD uses Worker bindings (D1/R2/KV/AI) — no separate API keys at runtime.",
  });
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
  } catch {
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
