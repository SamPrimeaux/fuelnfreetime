function boundedLimit(value, fallback = 20, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

function likeQuery(value) {
  const text = String(value || "").trim();
  return text ? `%${text.replaceAll("%", "\\%").replaceAll("_", "\\_")}%` : null;
}

export const CORE_EXECUTABLE_TOOL_KEYS = new Set([
  "fnf_store_orders_list",
  "fnf_store_products_list",
  "fnf_cms_pages_list",
  "fnf_media_library_list",
  "fnf_r2_media_list",
  "fnf_agentsam_ai_models",
]);

export async function executeCoreTool(env, tool, params = {}) {
  switch (tool?.tool_key) {
    case "fnf_store_orders_list": {
      const limit = boundedLimit(params.limit, 20, 100);
      const status = String(params.status || "").trim();
      const clauses = [];
      const binds = [];
      if (status) {
        clauses.push("status = ?");
        binds.push(status);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const { results } = await env.DB.prepare(
        `SELECT id, customer_email, status, total_cents, subtotal_cents,
                discount_cents, campaign_id, created_at, paid_at
           FROM orders
           ${where}
           ORDER BY id DESC
           LIMIT ?`,
      )
        .bind(...binds, limit)
        .all();
      return { ok: true, orders: results || [] };
    }

    case "fnf_store_products_list": {
      const limit = boundedLimit(params.limit, 24, 100);
      const { results } = await env.DB.prepare(
        `SELECT p.id, p.slug, p.title, p.collection, p.price_cents, p.status,
                p.image_url,
                COUNT(v.id) AS variant_count,
                COALESCE(SUM(v.inventory_qty), 0) AS inventory_qty
           FROM products p
           LEFT JOIN product_variants v ON v.product_id = p.id
           GROUP BY p.id
           ORDER BY p.updated_at DESC, p.id DESC
           LIMIT ?`,
      )
        .bind(limit)
        .all();
      return { ok: true, products: results || [] };
    }

    case "fnf_cms_pages_list": {
      const limit = boundedLimit(params.limit, 20, 100);
      const { results } = await env.DB.prepare(
        `SELECT id, slug, title, status, updated_at
           FROM pages
           ORDER BY updated_at DESC, id DESC
           LIMIT ?`,
      )
        .bind(limit)
        .all();
      return { ok: true, pages: results || [] };
    }

    case "fnf_media_library_list": {
      const limit = boundedLimit(params.limit, 40, 100);
      const folder = String(params.folder || "").trim();
      const q = likeQuery(params.q);
      const clauses = [];
      const binds = [];
      if (folder) {
        clauses.push("folder = ?");
        binds.push(folder);
      }
      if (q) {
        clauses.push("(filename LIKE ? ESCAPE '\\' OR alt_text LIKE ? ESCAPE '\\')");
        binds.push(q, q);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const { results } = await env.DB.prepare(
        `SELECT id, r2_key, url, filename, content_type, size_bytes,
                category, folder, alt_text, updated_at, created_at
           FROM media_assets
           ${where}
           ORDER BY id DESC
           LIMIT ?`,
      )
        .bind(...binds, limit)
        .all();
      return { ok: true, assets: results || [] };
    }

    case "fnf_r2_media_list": {
      if (!env.WEBSITE_ASSETS?.list) return { ok: false, error: "WEBSITE_ASSETS_not_bound" };
      const limit = boundedLimit(params.limit, 24, 100);
      const prefix = String(params.folder || params.prefix || "").replace(/^\/+/, "");
      const result = await env.WEBSITE_ASSETS.list({ prefix, limit });
      return {
        ok: true,
        prefix,
        objects: (result.objects || []).map((object) => ({
          key: object.key,
          size: object.size,
          uploaded: object.uploaded,
          etag: object.etag,
        })),
        truncated: Boolean(result.truncated),
        cursor: result.cursor || null,
      };
    }

    case "fnf_agentsam_ai_models": {
      const { results } = await env.DB.prepare(
        `SELECT model_id, display_name, task_type, lane, status, priority,
                is_default, is_fallback, supports_tools, supports_vision,
                supports_json, cost_tier
           FROM agentsam_ai
           WHERE status IN ('active','experimental')
           ORDER BY task_type, lane, priority`,
      ).all();
      return { ok: true, models: results || [] };
    }

    default:
      return { ok: false, error: "core_tool_not_implemented", tool_key: tool?.tool_key };
  }
}
