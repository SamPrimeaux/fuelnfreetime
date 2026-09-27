/**
 * Media library: R2 storage + D1 metadata (virtual folders).
 * Folder membership and display_order are D1-only — never R2 copy/move.
 * Uploads: intake → classify → enqueue job → automatic process/promote → ready.
 */

import {
  planAssetIngest,
  applyAcceptedSuggestions,
  guessMimeFromKey,
  deliveryUrlForKey,
  mediaPathForKey,
  publicUrlsForKey,
  FNF_R2,
  createAssetJob,
  enqueueAssetJob,
  processAssetJobById,
} from "../assets/product-optimize.js";

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
  return guessMimeFromKey(key);
}

function parseMeta(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function resolveContentType(row) {
  const key = row?.r2_key || row?.filename || "";
  const ct = String(row?.content_type || "").toLowerCase();
  if (ct && ct !== "application/octet-stream") return row.content_type;
  return guessContentType(key);
}

function publicUrlFields(r2Key) {
  const key = String(r2Key || "").replace(/^\/+/, "");
  const urls = publicUrlsForKey(key);
  return {
    url: mediaPathForKey(key),
    delivery_url: deliveryUrlForKey(key, { preferWorker: true }),
    cdn_url: urls.cdn,
    public_base_url: FNF_R2.publicBaseUrl,
  };
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
  const contentType = resolveContentType(row);
  const urls = publicUrlFields(row.r2_key);
  const meta = parseMeta(row.meta_json);
  const lifecycle = meta?.lifecycle || (meta?.optimization?.status === "ready" ? "ready" : null) || "ready";
  const opt = meta?.optimization || null;
  return {
    id: row.id,
    r2_key: row.r2_key,
    url: urls.url,
    delivery_url: urls.delivery_url,
    cdn_url: urls.cdn_url,
    public_base_url: urls.public_base_url,
    filename: row.filename,
    content_type: contentType,
    size_bytes: row.size_bytes,
    category: row.category,
    folder: row.folder || inferFolder(row.r2_key, contentType),
    display_order: row.display_order ?? 0,
    alt_text: row.alt_text || "",
    placement,
    meta,
    /** Operator-facing lifecycle — never expose pipeline jargon. */
    status: lifecycle === "processing" || lifecycle === "uploading" ? lifecycle : lifecycle === "failed" ? "failed" : "ready",
    display: opt
      ? {
          format: (opt.output_format || contentType || "").replace(/^image\//, "").toUpperCase() || null,
          width: opt.width || null,
          height: opt.height || null,
          bytes: opt.output_bytes || row.size_bytes || null,
        }
      : {
          format: (contentType || "").replace(/^image\//, "").replace(/^video\//, "").replace(/^model\//, "").toUpperCase() || null,
          width: null,
          height: null,
          bytes: row.size_bytes || null,
        },
    suggestions: meta?.intelligence?.suggestions || meta?.suggestions || null,
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
          mediaPathForKey(obj.key),
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

  // Fix stale application/octet-stream for known media extensions (black-thumb root cause).
  const mimeFixes = [
    ["%.jpg", "image/jpeg"],
    ["%.jpeg", "image/jpeg"],
    ["%.png", "image/png"],
    ["%.gif", "image/gif"],
    ["%.webp", "image/webp"],
    ["%.svg", "image/svg+xml"],
    ["%.mp4", "video/mp4"],
    ["%.webm", "video/webm"],
    ["%.mov", "video/quicktime"],
    ["%.glb", "model/gltf-binary"],
    ["%.usdz", "model/vnd.usdz+zip"],
  ];
  for (const [like, mime] of mimeFixes) {
    await env.DB.prepare(
      `UPDATE media_assets
       SET content_type = ?, updated_at = datetime('now')
       WHERE lower(r2_key) LIKE ? AND (content_type IS NULL OR content_type = '' OR content_type = 'application/octet-stream')`
    )
      .bind(mime, like)
      .run();
  }

  // Prefer /media/ compatibility paths in D1; delivery_url is derived at read time.
  await env.DB.prepare(
    `UPDATE media_assets
     SET url = '/media/' || r2_key
     WHERE url IS NULL OR url = '' OR url LIKE 'https://assets.fuelnfreetime.com/%'`
  ).run();

  return { ok: true, scanned, inserted, counts: await folderCounts(env) };
}

export async function uploadMedia(request, env, executionCtx = null) {
  const form = await request.formData();
  const files = form.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
  if (!files.length) return json({ error: "No files provided" }, { status: 400 });

  const category = form.get("category") ? form.get("category").toString() : null;
  const folderHint = form.get("folder") ? normalizeFolder(form.get("folder").toString()) : null;
  let prefix = (form.get("prefix") || "intake/").toString();
  if (!prefix.endsWith("/")) prefix += "/";
  prefix = prefix.replace(/^\/+/, "");

  const created = [];
  for (const file of files) {
    const filename = sanitizeFilename(file.name || "upload");
    const intakeKey = await uniqueKey(env, prefix, filename);
    const buf = await file.arrayBuffer();
    const contentType = file.type || guessContentType(intakeKey);
    const folder = folderHint || inferFolder(intakeKey, contentType);
    const displayOrder = await nextDisplayOrder(env, folder);

    await env.WEBSITE_ASSETS.put(intakeKey, buf, { httpMetadata: { contentType } });

    const plan = planAssetIngest({
      r2Key: intakeKey,
      contentType,
      bytes: buf.byteLength,
      filename,
      folder,
    });

    const urls = publicUrlFields(intakeKey);
    const meta = {
      ...plan.meta,
      lifecycle: "processing",
      intelligence: plan.intelligence,
      tags: plan.tags,
      // Keep workflow keys in diagnostics only — never operator-facing.
      _diagnostics: {
        workflow_key: plan.workflow_key,
        transform_state: plan.transform_state,
        canonical_key: plan.canonical_key,
      },
    };

    let result;
    try {
      result = await env.DB.prepare(
        `INSERT INTO media_assets
           (r2_key, url, filename, content_type, size_bytes, category, folder, display_order, meta_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(
          intakeKey,
          urls.url,
          filename,
          contentType,
          buf.byteLength,
          category,
          folder,
          displayOrder,
          JSON.stringify(meta),
        )
        .run();
    } catch (err) {
      if (String(err?.message || err).includes("meta_json")) {
        result = await env.DB.prepare(
          `INSERT INTO media_assets
             (r2_key, url, filename, content_type, size_bytes, category, folder, display_order, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
          .bind(
            intakeKey,
            urls.url,
            filename,
            contentType,
            buf.byteLength,
            category,
            folder,
            displayOrder,
          )
          .run();
      } else {
        throw err;
      }
    }

    const mediaId = result.meta.last_row_id;
    let jobId = null;
    try {
      jobId = await createAssetJob(env, {
        mediaAssetId: mediaId,
        intakeKey,
        canonicalKey: plan.canonical_key,
        pipeline: plan.classification?.pipeline,
        plan,
      });
      await enqueueAssetJob(env, jobId, { media_asset_id: mediaId });
    } catch (err) {
      console.error("[media/upload] job create/enqueue failed", err?.message || err);
    }

    const runJob = jobId
      ? processAssetJobById(env, jobId, { runtime: "worker" }).catch((err) => {
          console.error("[media/upload] auto-process failed", jobId, err?.message || err);
        })
      : null;
    if (runJob && typeof executionCtx?.waitUntil === "function") {
      executionCtx.waitUntil(runJob);
    } else if (runJob) {
      // Best-effort inline when no execution context (still automatic).
      await runJob;
    }

    // Re-read after possible inline finalize.
    const fresh =
      (await env.DB.prepare(`SELECT * FROM media_assets WHERE id = ?`).bind(mediaId).first()) || {
        id: mediaId,
        r2_key: intakeKey,
        url: urls.url,
        filename,
        content_type: contentType,
        size_bytes: buf.byteLength,
        category,
        folder,
        display_order: displayOrder,
        alt_text: "",
        meta_json: JSON.stringify(meta),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

    const asset = rowToAsset(fresh);
    created.push({
      ...asset,
      job_id: jobId,
      suggestions: plan.intelligence?.suggestions || null,
    });
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

  let meta = parseMeta(asset.meta_json) || {};
  if (Array.isArray(body.accept_suggestions) && body.accept_suggestions.length) {
    const applied = applyAcceptedSuggestions(
      {
        title: meta.title || filename,
        alt_text: altText,
        tags: meta.tags || [],
      },
      meta.intelligence || { suggestions: meta.suggestions, protected_fields: {} },
      body.accept_suggestions,
    );
    meta = {
      ...meta,
      accepted_suggestions: applied.accepted,
      skipped_suggestions: applied.skipped,
      title: applied.metadata.title,
      tags: applied.metadata.tags,
    };
    if (applied.accepted.includes("alt_text") && applied.metadata.alt_text != null) {
      // Only write alt when explicitly accepted and not protected.
    }
  }
  // Never silently overwrite human alt_text from suggestions unless accepted.
  let nextAlt = altText;
  if (
    Array.isArray(body.accept_suggestions) &&
    body.accept_suggestions.includes("alt_text") &&
    !(meta.intelligence?.protected_fields?.alt_text) &&
    meta.intelligence?.suggestions?.alt_text
  ) {
    nextAlt = String(meta.intelligence.suggestions.alt_text).slice(0, 500);
  }

  try {
    await env.DB.prepare(
      `UPDATE media_assets
       SET filename = ?, alt_text = ?, folder = ?, display_order = ?, placement_json = ?, meta_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(filename, nextAlt, folder, displayOrder, placementJson, JSON.stringify(meta), id)
      .run();
  } catch (err) {
    if (String(err?.message || err).includes("meta_json")) {
      await env.DB.prepare(
        `UPDATE media_assets
         SET filename = ?, alt_text = ?, folder = ?, display_order = ?, placement_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(filename, nextAlt, folder, displayOrder, placementJson, id)
        .run();
    } else {
      throw err;
    }
  }

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
