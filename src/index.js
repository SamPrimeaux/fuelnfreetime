/**
 * Fuel & Free Time — Worker entry point
 *
 * Bindings (see wrangler.toml):
 *   DB             D1 database "fuelnfreetime"
 *   WEBSITE_ASSETS R2 bucket "fuelnfreetime"
 *   AGENTSAM_WAI   Workers AI
 *   CMS_CACHE      KV namespace "fuelnfreetime-cache"
 *   ASSETS         Static files served from /public (marketing pages + /admin dashboard)
 */

import { handleAdminApi } from "./admin/api.js";
import { handleStoreApi } from "./store/api.js";
import { getSessionUser } from "./lib/auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleNewsletter(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const sourcePage = (body.source_page || "").slice(0, 200);

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Enter a valid email" }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO newsletter_subscribers (email, source_page, created_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(email) DO NOTHING`
    )
      .bind(email, sourcePage)
      .run();
  } catch (err) {
    return Response.json({ error: "Could not save signup" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

// Serve an object straight out of the media R2 bucket. Public — these are
// product/marketing images meant to be viewed on the storefront.
async function handleMediaServe(request, env, key) {
  const object = await env.WEBSITE_ASSETS.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

// Any response tied to admin session state must never be cached at the
// edge — otherwise one user's authenticated page can get served to the
// next unauthenticated visitor straight from cache.
function noStore(response) {
  const r = new Response(response.body, response);
  r.headers.set("cache-control", "private, no-store");
  return r;
}

const ADMIN_PUBLIC_PAGES = new Set(["/admin/login.html"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") {
      return Response.json({
        ok: true,
        app: env.APP_NAME,
        bindings: {
          db: !!env.DB,
          r2: !!env.WEBSITE_ASSETS,
          ai: !!env.AGENTSAM_WAI,
          kv: !!env.CMS_CACHE,
          assets: !!env.ASSETS,
        },
      });
    }

    if (path === "/api/newsletter" && request.method === "POST") {
      return handleNewsletter(request, env);
    }

    if (path.startsWith("/api/store/")) {
      return handleStoreApi(request, env, url);
    }

    if (path.startsWith("/api/admin/")) {
      return noStore(await handleAdminApi(request, env, url));
    }

    if (path.startsWith("/media/")) {
      return handleMediaServe(request, env, path.slice("/media/".length));
    }

    // /admin and /admin/ resolve based on session state
    if (path === "/admin" || path === "/admin/") {
      const user = await getSessionUser(request, env);
      const dest = user ? "/admin/dashboard/overview.html" : "/admin/login.html";
      return noStore(Response.redirect(new URL(dest, request.url), 302));
    }

    // Every /admin/*.html page is session-dependent (gated or shows a
    // user-specific shell), so none of it may be cached at the edge.
    if (path.startsWith("/admin/") && path.endsWith(".html")) {
      if (!ADMIN_PUBLIC_PAGES.has(path)) {
        const user = await getSessionUser(request, env);
        if (!user) {
          return noStore(Response.redirect(new URL("/admin/login.html", request.url), 302));
        }
      }
      return noStore(await env.ASSETS.fetch(request));
    }

    // Shopify-style /pages/* routes on custom domain
    if (path === "/pages/shop" || path === "/pages/shop/") {
      return Response.redirect(new URL("/shop.html", request.url), 301);
    }

    const productMatch = path.match(/^\/products\/([^/]+)\/?$/);
    if (productMatch) {
      const productUrl = new URL(request.url);
      productUrl.pathname = "/product.html";
      productUrl.searchParams.set("slug", productMatch[1]);
      return env.ASSETS.fetch(new Request(productUrl, request));
    }

    // html_handling = "none" means Cloudflare won't auto-map "/" to
    // index.html, so do it ourselves before falling through to ASSETS.
    if (path === "/") {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    // Everything else falls through to the static site in /public
    return env.ASSETS.fetch(request);
  },
};
