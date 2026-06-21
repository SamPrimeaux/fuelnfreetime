/**
 * CMS deploy + cache warm helpers (post-deploy, internal hooks).
 */

import { PAGE_REGISTRY } from "./registry.js";
import { writePublishedSnapshot } from "./api.js";

export async function warmAllCmsPages(env) {
  const slugs = Object.keys(PAGE_REGISTRY);
  const warmed = [];

  for (const slug of slugs) {
    try {
      const snapshot = await writePublishedSnapshot(env, slug);
      warmed.push({ slug, ok: Boolean(snapshot) });
    } catch (err) {
      warmed.push({ slug, ok: false, error: err?.message || String(err) });
    }
  }

  return {
    ok: warmed.every((row) => row.ok),
    warmed,
    count: warmed.filter((row) => row.ok).length,
  };
}

export async function handleCmsWarmInternal(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secret = request.headers.get("X-Cms-Warm-Secret") || "";
  if (!env.CMS_WARM_SECRET || secret !== env.CMS_WARM_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await warmAllCmsPages(env);
  return Response.json({
    ...result,
    trigger_source: body.trigger_source || "internal",
  });
}
