/**
 * Public storefront API — no auth required.
 */

import { attributionFromCookie, parseCookies, attachAttributionToOrder } from "../lib/attribution.js";
import {
  recordDiscountRedemption,
  validateDiscountForCheckout,
} from "../lib/discounts.js";

function json(data, init = {}) {
  return Response.json(data, init);
}

function formatProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    collection: row.collection,
    price_cents: row.price_cents,
    price: (row.price_cents / 100).toFixed(2),
    image_url: row.image_url,
    status: row.status,
    variant_count: row.variant_count ?? 0,
    total_inventory: row.total_inventory ?? 0,
    sizes: row.sizes || "",
    primary_image: row.primary_image || row.image_url,
  };
}

export async function listStoreProducts(env) {
  const { results } = await env.DB.prepare(
    `SELECT p.*,
            COUNT(v.id) AS variant_count,
            COALESCE(SUM(v.inventory_qty), 0) AS total_inventory,
            GROUP_CONCAT(DISTINCT v.size) AS sizes,
            COALESCE(
              (SELECT m.url FROM product_images pi
               JOIN media_assets m ON m.id = pi.media_asset_id
               WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1),
              p.image_url
            ) AS primary_image
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     WHERE p.status = 'active'
     GROUP BY p.id
     ORDER BY p.updated_at DESC`
  ).all();

  return json({
    ok: true,
    products: results.map(formatProduct),
  });
}

export async function getStoreProduct(env, slug) {
  const product = await env.DB.prepare(
    `SELECT p.*,
            COUNT(v.id) AS variant_count,
            COALESCE(SUM(v.inventory_qty), 0) AS total_inventory
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     WHERE p.slug = ? AND p.status = 'active'
     GROUP BY p.id`
  )
    .bind(slug)
    .first();

  if (!product) return json({ error: "Product not found" }, { status: 404 });

  const { results: variants } = await env.DB.prepare(
    `SELECT id, sku, size, color, price_cents, inventory_qty
     FROM product_variants WHERE product_id = ? ORDER BY id`
  )
    .bind(product.id)
    .all();

  const { results: images } = await env.DB.prepare(
    `SELECT m.id, m.url, m.filename, m.alt_text, pi.position, pi.is_primary
     FROM product_images pi
     JOIN media_assets m ON m.id = pi.media_asset_id
     WHERE pi.product_id = ?
     ORDER BY pi.is_primary DESC, pi.position ASC`
  )
    .bind(product.id)
    .all();

  return json({
    ok: true,
    product: {
      ...formatProduct({
        ...product,
        primary_image: images.find((i) => i.is_primary)?.url || product.image_url,
        sizes: variants.map((v) => v.size).filter(Boolean).join(","),
      }),
      images,
    },
    variants,
  });
}

export async function createStoreCheckout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const items = Array.isArray(body.items) ? body.items : [];
  const discountCode = (body.discount_code || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, { status: 400 });
  }
  if (!items.length) {
    return json({ error: "Cart is empty" }, { status: 400 });
  }

  let totalCents = 0;
  const lineItems = [];

  for (const item of items) {
    const variant = await env.DB.prepare(
      `SELECT v.*, p.title, p.slug, p.status, p.collection
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE v.id = ?`
    )
      .bind(item.variant_id)
      .first();

    if (!variant || variant.status !== "active") {
      return json({ error: `Variant ${item.variant_id} unavailable` }, { status: 400 });
    }

    const qty = Math.max(1, Math.min(10, Math.round(Number(item.qty || 1))));
    if (variant.inventory_qty < qty) {
      return json({ error: `Only ${variant.inventory_qty} left for ${variant.size}` }, { status: 400 });
    }

    const unitCents = variant.price_cents ?? (await env.DB.prepare(`SELECT price_cents FROM products WHERE id = ?`).bind(variant.product_id).first())?.price_cents ?? 0;
    totalCents += unitCents * qty;
    lineItems.push({ variant, qty, unitCents });
  }

  const subtotalCents = totalCents;
  let discountCents = 0;
  let discountId = null;
  let appliedCode = null;
  let freeShipping = false;

  if (discountCode) {
    const validation = await validateDiscountForCheckout(env, discountCode, {
      customerEmail: email,
      subtotalCents,
      lineItems,
      itemCount: lineItems.reduce((n, li) => n + li.qty, 0),
    });
    if (!validation.ok) {
      return json({ error: validation.error }, { status: 400 });
    }
    discountCents = validation.discount_cents || 0;
    freeShipping = !!validation.free_shipping;
    discountId = validation.discount?.id || null;
    appliedCode = validation.discount?.code || discountCode;
    totalCents = Math.max(0, totalCents - discountCents);
  }

  const orderResult = await env.DB.prepare(
    `INSERT INTO orders (
       customer_email, status, total_cents, subtotal_cents, discount_cents,
       discount_id, discount_code, created_at
     ) VALUES (?, 'pending', ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(email, totalCents, subtotalCents, discountCents, discountId, appliedCode)
    .run();

  const orderId = orderResult.meta.last_row_id;

  const cookies = parseCookies(request.headers.get("Cookie"));
  const attribution =
    body.attribution ||
    attributionFromCookie(cookies) ||
    (body.utm_campaign
      ? {
          campaign_id: body.campaign_id || null,
          utm_source: body.utm_source || null,
          utm_medium: body.utm_medium || null,
          utm_campaign: body.utm_campaign || null,
          visit_id: body.visit_id || null,
        }
      : null);

  if (attribution) {
    await attachAttributionToOrder(env, orderId, attribution);
  }

  for (const { variant, qty, unitCents } of lineItems) {
    await env.DB.prepare(
      `INSERT INTO order_items (order_id, variant_id, title, qty, price_cents)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(orderId, variant.id, `${variant.title} — ${variant.size || variant.sku}`, qty, unitCents)
      .run();

    await env.DB.prepare(
      `UPDATE product_variants SET inventory_qty = inventory_qty - ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(qty, variant.id)
      .run();
  }

  if (discountId) {
    await recordDiscountRedemption(env, {
      discountId,
      orderId,
      customerEmail: email,
      amountCents: discountCents,
    });
  }

  return json({
    ok: true,
    order_id: orderId,
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    free_shipping: freeShipping,
    total_cents: totalCents,
    total: (totalCents / 100).toFixed(2),
    message: "Order received — payment integration coming soon. We'll email you confirmation.",
  });
}

export async function handleStoreApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/store/meta" && method === "GET") {
    const { loadStorePreferences } = await import("../admin/store.js");
    const prefs = await loadStorePreferences(env);
    return json({
      ok: true,
      meta: {
        homeTitle: prefs.homeTitle,
        metaDescription: prefs.metaDescription,
        socialImageUrl: prefs.socialImageUrl,
      },
    });
  }

  if (path === "/api/store/nav" && method === "GET") {
    const { getStoreNav } = await import("../admin/store.js");
    return getStoreNav(env);
  }

  if (path === "/api/store/products" && method === "GET") {
    return listStoreProducts(env);
  }

  const m = path.match(/^\/api\/store\/products\/([^/]+)$/);
  if (m && method === "GET") {
    return getStoreProduct(env, decodeURIComponent(m[1]));
  }

  if (path === "/api/store/checkout" && method === "POST") {
    return createStoreCheckout(request, env);
  }

  if (path === "/api/store/discounts/validate" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    const code = (body.code || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!code) return json({ error: "Discount code required" }, { status: 400 });
    if (!items.length) return json({ error: "Cart is empty" }, { status: 400 });

    let totalCents = 0;
    const lineItems = [];
    for (const item of items) {
      const variant = await env.DB.prepare(
        `SELECT v.*, p.title, p.slug, p.status, p.collection
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE v.id = ?`
      )
        .bind(item.variant_id)
        .first();
      if (!variant || variant.status !== "active") {
        return json({ error: `Variant ${item.variant_id} unavailable` }, { status: 400 });
      }
      const qty = Math.max(1, Math.min(10, Math.round(Number(item.qty || 1))));
      const unitCents =
        variant.price_cents ??
        (await env.DB.prepare(`SELECT price_cents FROM products WHERE id = ?`).bind(variant.product_id).first())
          ?.price_cents ??
        0;
      totalCents += unitCents * qty;
      lineItems.push({ variant, qty, unitCents });
    }

    const validation = await validateDiscountForCheckout(env, code, {
      customerEmail: (body.email || "").trim().toLowerCase(),
      subtotalCents: totalCents,
      lineItems,
      itemCount: lineItems.reduce((n, li) => n + li.qty, 0),
    });

    if (!validation.ok) {
      return json({ ok: false, error: validation.error }, { status: 400 });
    }

    const totalAfter = Math.max(0, totalCents - (validation.discount_cents || 0));
    return json({
      ok: true,
      code: validation.discount?.code || code,
      title: validation.discount?.title || "",
      discount_cents: validation.discount_cents || 0,
      free_shipping: !!validation.free_shipping,
      subtotal_cents: totalCents,
      total_cents: totalAfter,
      subtotal: (totalCents / 100).toFixed(2),
      total: (totalAfter / 100).toFixed(2),
      message: validation.message,
    });
  }

  return json({ error: "Not found" }, { status: 404 });
}
