import {
  hashPassword,
  verifyPassword,
  createSession,
  clearSessionCookie,
  getSessionUser,
  destroySession,
  findAuthUserByEmail,
} from "../lib/auth.js";
import {
  getMailSettings,
  postMailSettings,
  listMailMessages,
  sendMailPreview,
} from "./mail.js";
import {
  uploadMedia,
  listMedia,
  updateMedia,
  reorderMedia,
  syncMediaFromR2,
  platformBindings,
  deleteMedia,
  listProductImages,
  attachProductImage,
  detachProductImage,
  setPrimaryProductImage,
} from "./media.js";
import { handleAdminCmsApi } from "../cms/api.js";
import { getFinanceAnalytics } from "./analytics-finance.js";
import {
  agentsamChat,
  agentsamAiModelsList,
  agentsamAnalyticsSummary,
  agentsamToolsCatalog,
  agentsamDrawerWorkflowsList,
  agentsamMcpStatus,
  agentsamSkillGet,
  agentsamSkillsList,
  agentsamStatus,
  agentsamTools,
  agentsamWorkflowsList,
} from "./agentsam.js";
import {
  agentsamConversationCreate,
  agentsamConversationDelete,
  agentsamConversationGet,
  agentsamConversationPatch,
  agentsamConversationsList,
} from "../agentsam/conversations.js";
import { agentsamFileDelete, agentsamFileGet, agentsamFileUpload } from "../agentsam/files.js";
import { agentsamToolCallGet } from "../agentsam/tool-traces.js";
import {
  agentsamGithubOAuthCallback,
  agentsamGithubOAuthDisconnect,
  agentsamGithubOAuthStart,
  agentsamGithubOAuthStatus,
} from "./agentsam-github.js";
import { onlineStoreOverview, getStorePreferences, postStorePreferences } from "./store.js";

function json(data, init = {}) {
  return Response.json(data, init);
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ----- Auth -----

async function login(request, env) {
  const body = await readJson(request);
  if (!body || !body.email || !body.password) {
    return json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await findAuthUserByEmail(env, body.email.trim().toLowerCase());
  if (!user) return json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(body.password, user.password_hash, user.salt);
  if (!ok) return json({ error: "Invalid credentials" }, { status: 401 });

  const cookie = await createSession(env, user.id);
  return json(
    { ok: true, email: user.email, role: user.role },
    { headers: { "set-cookie": cookie } }
  );
}

async function logout(request, env) {
  await destroySession(request, env);
  return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
}

async function me(request, env, user) {
  return json({
    ok: true,
    email: user.email,
    role: user.role || "member",
    display_name: user.display_name || user.email,
  });
}

async function changePassword(request, env, user) {
  const body = await readJson(request);
  if (!body || !body.current_password || !body.new_password) {
    return json({ error: "Current and new password required" }, { status: 400 });
  }
  if (body.new_password.length < 8) {
    return json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const row = await env.DB.prepare(`SELECT password_hash, salt FROM auth_users WHERE id = ?`)
    .bind(user.id)
    .first();

  if (!row) return json({ error: "User not found" }, { status: 404 });

  const ok = await verifyPassword(body.current_password, row.password_hash, row.salt);
  if (!ok) return json({ error: "Current password is incorrect" }, { status: 401 });

  const { hash, salt } = await hashPassword(body.new_password);
  await env.DB.prepare(
    `UPDATE auth_users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(hash, salt, user.id)
    .run();

  return json({ ok: true });
}

// ----- Dashboard overview -----

async function overview(request, env) {
  const [productCount, inventorySum, lowStock, subscriberCount, recentSubs, orderCount] =
    await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM products`).first(),
      env.DB.prepare(`SELECT COALESCE(SUM(inventory_qty), 0) AS n FROM product_variants`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM product_variants WHERE inventory_qty <= 3`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM newsletter_subscribers`).first(),
      env.DB.prepare(
        `SELECT email, source_page, created_at FROM newsletter_subscribers ORDER BY id DESC LIMIT 5`
      ).all(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM orders`).first(),
    ]);

  return json({
    ok: true,
    products: productCount.n,
    inventory_units: inventorySum.n,
    low_stock_variants: lowStock.n,
    subscribers: subscriberCount.n,
    recent_subscribers: recentSubs.results,
    orders: orderCount.n,
  });
}

// ----- Products -----

async function listProducts(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT p.*,
            COUNT(v.id) AS variant_count,
            COALESCE(SUM(v.inventory_qty), 0) AS total_inventory
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     GROUP BY p.id
     ORDER BY p.updated_at DESC`
  ).all();
  return json({ ok: true, products: results });
}

async function getProduct(request, env, id) {
  const product = await env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  if (!product) return json({ error: "Not found" }, { status: 404 });

  const { results: variants } = await env.DB.prepare(
    `SELECT * FROM product_variants WHERE product_id = ? ORDER BY id`
  )
    .bind(id)
    .all();

  return json({ ok: true, product, variants });
}

async function createProduct(request, env) {
  const body = await readJson(request);
  if (!body || !body.title) return json({ error: "Title required" }, { status: 400 });

  const slug = (body.slug && body.slug.trim()) || slugify(body.title);
  const priceCents = Math.round(Number(body.price_cents || body.price || 0));

  try {
    const result = await env.DB.prepare(
      `INSERT INTO products (slug, title, description, collection, price_cents, image_url, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        slug,
        body.title.trim(),
        body.description || null,
        body.collection || null,
        priceCents,
        body.image_url || null,
        body.status || "draft"
      )
      .run();

    return json({ ok: true, id: result.meta.last_row_id });
  } catch (err) {
    return json({ error: "Could not create product (slug may already exist)" }, { status: 400 });
  }
}

async function updateProduct(request, env, id) {
  const body = await readJson(request);
  if (!body) return json({ error: "Invalid body" }, { status: 400 });

  const priceCents = Math.round(Number(body.price_cents || body.price || 0));
  const slug = body.slug?.trim();

  if (slug) {
    await env.DB.prepare(
      `UPDATE products
       SET slug = ?, title = ?, description = ?, collection = ?, price_cents = ?, image_url = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        slug,
        body.title,
        body.description || null,
        body.collection || null,
        priceCents,
        body.image_url || null,
        body.status || "draft",
        id
      )
      .run();
  } else {
    await env.DB.prepare(
      `UPDATE products
       SET title = ?, description = ?, collection = ?, price_cents = ?, image_url = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        body.title,
        body.description || null,
        body.collection || null,
        priceCents,
        body.image_url || null,
        body.status || "draft",
        id
      )
      .run();
  }

  return json({ ok: true });
}

async function deleteProduct(request, env, id) {
  await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

// ----- Variants -----

async function createVariant(request, env, productId) {
  const body = await readJson(request);
  if (!body || !body.sku) return json({ error: "SKU required" }, { status: 400 });

  try {
    const result = await env.DB.prepare(
      `INSERT INTO product_variants (product_id, sku, size, color, price_cents, inventory_qty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        productId,
        body.sku.trim(),
        body.size || null,
        body.color || null,
        body.price_cents != null ? Math.round(Number(body.price_cents)) : null,
        Math.round(Number(body.inventory_qty || 0))
      )
      .run();

    return json({ ok: true, id: result.meta.last_row_id });
  } catch (err) {
    return json({ error: "Could not create variant (SKU may already exist)" }, { status: 400 });
  }
}

async function updateVariant(request, env, id) {
  const body = await readJson(request);
  if (!body) return json({ error: "Invalid body" }, { status: 400 });

  await env.DB.prepare(
    `UPDATE product_variants
     SET sku = ?, size = ?, color = ?, price_cents = ?, inventory_qty = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      body.sku,
      body.size || null,
      body.color || null,
      body.price_cents != null ? Math.round(Number(body.price_cents)) : null,
      Math.round(Number(body.inventory_qty || 0)),
      id
    )
    .run();

  return json({ ok: true });
}

async function patchVariantInventory(request, env, id) {
  const body = await readJson(request);
  if (!body || body.inventory_qty == null) {
    return json({ error: "inventory_qty required" }, { status: 400 });
  }

  await env.DB.prepare(
    `UPDATE product_variants SET inventory_qty = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(Math.round(Number(body.inventory_qty)), id)
    .run();

  return json({ ok: true });
}

async function deleteVariant(request, env, id) {
  await env.DB.prepare(`DELETE FROM product_variants WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

// ----- Inventory (flat view) -----

async function listInventory(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.sku, v.size, v.color, v.inventory_qty, v.price_cents AS variant_price_cents,
            p.id AS product_id, p.title AS product_title, p.price_cents AS product_price_cents, p.status
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     ORDER BY v.inventory_qty ASC, p.title ASC`
  ).all();
  return json({ ok: true, inventory: results });
}

// ----- Orders -----

async function listOrders(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`
  ).all();
  return json({ ok: true, orders: results });
}

// ----- Subscribers -----

async function listSubscribers(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, email, source_page, created_at FROM newsletter_subscribers ORDER BY id DESC LIMIT 500`
  ).all();
  return json({ ok: true, subscribers: results });
}

// ----- Router -----

export async function handleAdminApi(request, env, url, executionCtx = null) {
  const path = url.pathname;
  const method = request.method;

  // Public (no session required)
  if (path === "/api/admin/login" && method === "POST") {
    return login(request, env);
  }

  // Everything below requires a valid session
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  if (path === "/api/admin/logout" && method === "POST") return logout(request, env);
  if (path === "/api/admin/me" && method === "GET") return me(request, env, user);
  if (path === "/api/admin/account/password" && method === "POST") {
    return changePassword(request, env, user);
  }
  if (path === "/api/admin/overview" && method === "GET") return overview(request, env);
  if (path === "/api/admin/store/online" && method === "GET") {
    return onlineStoreOverview(env);
  }
  if (path === "/api/admin/store/preferences" && method === "GET") {
    return getStorePreferences(env);
  }
  if (path === "/api/admin/store/preferences" && method === "POST") {
    return postStorePreferences(request, env);
  }

  if (path === "/api/admin/products" && method === "GET") return listProducts(request, env);
  if (path === "/api/admin/products" && method === "POST") return createProduct(request, env);

  let m = path.match(/^\/api\/admin\/products\/(\d+)$/);
  if (m && method === "GET") return getProduct(request, env, m[1]);
  if (m && method === "PUT") return updateProduct(request, env, m[1]);
  if (m && method === "DELETE") return deleteProduct(request, env, m[1]);

  m = path.match(/^\/api\/admin\/products\/(\d+)\/variants$/);
  if (m && method === "POST") return createVariant(request, env, m[1]);

  m = path.match(/^\/api\/admin\/variants\/(\d+)$/);
  if (m && method === "PUT") return updateVariant(request, env, m[1]);
  if (m && method === "DELETE") return deleteVariant(request, env, m[1]);

  m = path.match(/^\/api\/admin\/variants\/(\d+)\/inventory$/);
  if (m && method === "PATCH") return patchVariantInventory(request, env, m[1]);

  if (path === "/api/admin/inventory" && method === "GET") return listInventory(request, env);
  if (path === "/api/admin/orders" && method === "GET") return listOrders(request, env);
  if (path === "/api/admin/subscribers" && method === "GET") return listSubscribers(request, env);

  if (path === "/api/admin/media" && method === "POST") return uploadMedia(request, env);
  if (path === "/api/admin/media" && method === "GET") return listMedia(request, env, url);
  if (path === "/api/admin/media/sync" && method === "POST") {
    return json(await syncMediaFromR2(env));
  }
  if (path === "/api/admin/media/reorder" && method === "POST") return reorderMedia(request, env);
  if (path === "/api/admin/platform/bindings" && method === "GET") return platformBindings(env);

  m = path.match(/^\/api\/admin\/media\/(\d+)$/);
  if (m && method === "PATCH") return updateMedia(request, env, m[1]);
  if (m && method === "DELETE") return deleteMedia(request, env, m[1]);

  m = path.match(/^\/api\/admin\/products\/(\d+)\/images$/);
  if (m && method === "GET") return listProductImages(request, env, m[1]);
  if (m && method === "POST") return attachProductImage(request, env, m[1]);

  m = path.match(/^\/api\/admin\/products\/(\d+)\/images\/(\d+)$/);
  if (m && method === "DELETE") return detachProductImage(request, env, m[1], m[2]);

  m = path.match(/^\/api\/admin\/products\/(\d+)\/images\/(\d+)\/primary$/);
  if (m && method === "POST") return setPrimaryProductImage(request, env, m[1], m[2]);

  if (path === "/api/admin/mail/settings" && method === "GET") return getMailSettings(env);
  if (path === "/api/admin/mail/settings" && method === "POST") return postMailSettings(request, env);
  if (path === "/api/admin/mail/messages" && method === "GET") return listMailMessages();
  if (path === "/api/admin/mail/send" && method === "POST") return sendMailPreview(request, env);

  if (path === "/api/admin/agentsam/chat" && method === "POST") {
    return agentsamChat(request, env, executionCtx);
  }
  if (path === "/api/admin/agentsam/files/upload" && method === "POST") {
    return agentsamFileUpload(request, env);
  }
  let fileMatch = path.match(/^\/api\/admin\/agentsam\/files\/([a-z0-9_]+)$/);
  if (fileMatch && method === "GET") return agentsamFileGet(env, fileMatch[1]);
  if (fileMatch && method === "DELETE") return agentsamFileDelete(env, fileMatch[1]);
  if (path === "/api/admin/agentsam/conversations" && method === "GET") {
    return agentsamConversationsList(env);
  }
  if (path === "/api/admin/agentsam/conversations" && method === "POST") {
    return agentsamConversationCreate(request, env);
  }
  let convMatch = path.match(/^\/api\/admin\/agentsam\/conversations\/([a-z0-9_]+)$/);
  if (convMatch && method === "GET") return agentsamConversationGet(env, convMatch[1]);
  if (convMatch && method === "PATCH") return agentsamConversationPatch(request, env, convMatch[1]);
  if (convMatch && method === "DELETE") return agentsamConversationDelete(env, convMatch[1]);
  let toolCallMatch = path.match(/^\/api\/admin\/agentsam\/tool-calls\/([a-z0-9_]+)$/);
  if (toolCallMatch && method === "GET") return agentsamToolCallGet(env, toolCallMatch[1]);
  if (path === "/api/admin/agentsam/status" && method === "GET") {
    const user = await getSessionUser(request, env);
    return agentsamStatus(env, user?.id || null);
  }
  if (path === "/api/admin/agentsam/tools" && method === "GET") {
    return agentsamTools(env);
  }
  if (path === "/api/admin/agentsam/ai/models" && method === "GET") {
    return agentsamAiModelsList(env);
  }
  if (path === "/api/admin/agentsam/tools/catalog" && method === "GET") {
    return agentsamToolsCatalog(env);
  }
  if (path === "/api/admin/agentsam/analytics/summary" && method === "GET") {
    return agentsamAnalyticsSummary(env, url);
  }
  if (path === "/api/admin/analytics/finance" && method === "GET") {
    const range = url.searchParams.get("range") || "30d";
    const data = await getFinanceAnalytics(env, range);
    return json(data);
  }
  if (path === "/api/admin/agentsam/mcp/status" && method === "GET") {
    const user = await getSessionUser(request, env);
    return agentsamMcpStatus(env, user?.id || null);
  }
  if (path === "/api/admin/agentsam/github/start" && method === "GET") {
    return agentsamGithubOAuthStart(request, env);
  }
  if (path === "/api/admin/agentsam/github/callback" && method === "GET") {
    return agentsamGithubOAuthCallback(request, env);
  }
  if (path === "/api/admin/agentsam/github/status" && method === "GET") {
    return agentsamGithubOAuthStatus(request, env);
  }
  if (path === "/api/admin/agentsam/github/disconnect" && method === "POST") {
    return agentsamGithubOAuthDisconnect(request, env);
  }
  if (path === "/api/admin/agentsam/workflows" && method === "GET") {
    return agentsamWorkflowsList(env);
  }
  if (path === "/api/admin/agentsam/workflows/drawer" && method === "GET") {
    return agentsamDrawerWorkflowsList(env);
  }
  if (path === "/api/admin/agentsam/skills" && method === "GET") {
    return agentsamSkillsList(env, url);
  }

  let skillMatch = path.match(/^\/api\/admin\/agentsam\/skills\/([a-z0-9-]+)$/);
  if (skillMatch && method === "GET") {
    return agentsamSkillGet(env, skillMatch[1], url);
  }

  const liveMatch = path.match(/^\/api\/admin\/cms\/live\/([a-z0-9-]+)$/);
  if (liveMatch) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });
    if (!env.CMS_EDITOR) return json({ error: "Live editor not configured" }, { status: 503 });

    const pageSlug = liveMatch[1];
    const id = env.CMS_EDITOR.idFromName(pageSlug);
    const stub = env.CMS_EDITOR.get(id);
    const doUrl = new URL(request.url);
    doUrl.searchParams.set("slug", pageSlug);
    return stub.fetch(new Request(doUrl.toString(), request));
  }

  const cmsResponse = await handleAdminCmsApi(request, env, url);
  if (cmsResponse) return cmsResponse;

  return json({ error: "Not found" }, { status: 404 });
}
