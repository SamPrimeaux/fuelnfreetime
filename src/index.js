/**
 * Fuel & Free Time — Worker entry point
 *
 * Bindings (see wrangler.toml):
 *   DB             D1 database "fuelnfreetime"
 *   WEBSITE_ASSETS R2 bucket "fuelnfreetime"
 *   AGENTSAM_WAI   Workers AI
 *   CMS_CACHE      KV namespace "fuelnfreetime-cache"
 *   ASSETS         Static files served from /public (index, shop, about, community)
 *
 * Static pages (index/shop/about/community) are served straight from
 * ASSETS. This file only owns the dynamic bits: API routes today, and
 * eventually CMS/cart/checkout as those get built out.
 */

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
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

    if (url.pathname === "/api/newsletter" && request.method === "POST") {
      return handleNewsletter(request, env);
    }

    // html_handling = "none" means Cloudflare won't auto-map "/" to
    // index.html, so do it ourselves before falling through to ASSETS.
    if (url.pathname === "/") {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    // Everything else falls through to the static site in /public
    return env.ASSETS.fetch(request);
  },
};
