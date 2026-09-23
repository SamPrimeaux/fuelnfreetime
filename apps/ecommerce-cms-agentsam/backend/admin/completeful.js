import {
  CompletefulApiError,
  completefulApiBase,
  completefulKeyMode,
  completefulLiveWritesAllowed,
} from "../completeful/client.js";
import {
  getCompletefulCatalogProduct,
  getCompletefulCounts,
  getCompletefulSyncState,
  listCompletefulCatalogMirror,
  listMirroredShops,
  refreshCompletefulShops,
  selectPrimaryCompletefulShop,
  syncCompletefulCatalog,
} from "../completeful/catalog.js";

function json(data, init = {}) {
  return Response.json(data, init);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function providerErrorResponse(error) {
  if (error instanceof CompletefulApiError) {
    return json(
      {
        ok: false,
        provider: "completeful",
        ...error.toJSON(),
      },
      { status: error.status || 502 },
    );
  }

  console.error("[completeful/admin]", error);
  return json(
    {
      ok: false,
      provider: "completeful",
      error: error?.message || "Completeful request failed",
      code: "completeful_internal_error",
    },
    { status: 500 },
  );
}

async function status(env) {
  const [sync, counts, shops] = await Promise.all([
    getCompletefulSyncState(env),
    getCompletefulCounts(env),
    listMirroredShops(env),
  ]);

  const primaryShop = shops.find((shop) => Number(shop.is_primary) === 1) || null;
  const mode = completefulKeyMode(env);

  return json({
    ok: true,
    configured: mode !== "missing",
    provider: "completeful",
    api_base: completefulApiBase(env),
    key_mode: mode,
    allow_live_writes: completefulLiveWritesAllowed(env),
    primary_shop: primaryShop,
    sync,
    counts,
  });
}

export async function handleCompletefulAdminApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (!path.startsWith("/api/admin/completeful")) return null;

  try {
    if (path === "/api/admin/completeful/status" && method === "GET") {
      return status(env);
    }

    if (path === "/api/admin/completeful/shops" && method === "GET") {
      let refresh = null;
      if (url.searchParams.get("refresh") === "1") {
        refresh = await refreshCompletefulShops(env);
      }
      return json({
        ok: true,
        shops: await listMirroredShops(env),
        provider_meta: refresh?.meta || null,
      });
    }

    if (path === "/api/admin/completeful/shops/refresh" && method === "POST") {
      const refreshed = await refreshCompletefulShops(env);
      return json({
        ok: true,
        shops: await listMirroredShops(env),
        provider_meta: refreshed.meta,
      });
    }

    let match = path.match(/^\/api\/admin\/completeful\/shops\/([^/]+)\/select$/);
    if (match && method === "POST") {
      const shopId = decodeURIComponent(match[1]);
      const selected = await selectPrimaryCompletefulShop(env, shopId);
      if (!selected) {
        return json({ ok: false, error: "Completeful shop not found" }, { status: 404 });
      }
      return json({
        ok: true,
        primary_shop_id: shopId,
        shops: await listMirroredShops(env),
      });
    }

    if (path === "/api/admin/completeful/catalog" && method === "GET") {
      const result = await listCompletefulCatalogMirror(env, url);
      return json({ ok: true, ...result });
    }

    if (path === "/api/admin/completeful/catalog/sync" && method === "POST") {
      const body = await readJson(request);
      const result = await syncCompletefulCatalog(env, {
        reset: body.reset !== false,
        limit: body.limit,
        max_pages: body.max_pages,
        include: body.include,
        search: body.search,
      });
      return json({
        ...result,
        sync: await getCompletefulSyncState(env),
        counts: await getCompletefulCounts(env),
      });
    }

    match = path.match(/^\/api\/admin\/completeful\/catalog\/([^/]+)$/);
    if (match && method === "GET") {
      const productId = decodeURIComponent(match[1]);
      const result = await getCompletefulCatalogProduct(env, productId);
      if (!result) {
        return json({ ok: false, error: "Completeful catalog product not found" }, { status: 404 });
      }
      return json({ ok: true, ...result });
    }

    return json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
