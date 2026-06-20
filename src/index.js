/**
 * Fuel & Free Time — Worker entry point
 *
 * Bindings (see wrangler.toml):
 *   DB             D1 database "fuelnfreetime"
 *   WEBSITE_ASSETS R2 bucket "fuelnfreetime"
 *   AGENTSAM_WAI   Workers AI
 *   CMS_CACHE      KV namespace "fuelnfreetime-cache"
 *
 * Placeholder only — homepage/shop/about/community routes and the
 * login/dashboard/CMS + ecommerce build come next.
 */
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
        },
      });
    }

    return new Response("Fuel & Free Time — scaffold online. Bindings wired, routes coming next.", {
      headers: { "content-type": "text/plain" },
    });
  },
};
