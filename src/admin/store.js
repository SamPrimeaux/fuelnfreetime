import { M } from "../cms/media-paths.js";

function json(data, init = {}) {
  return Response.json(data, init);
}

const DRAFT_THEMES = [
  {
    id: "fnf-copy",
    name: "Copy of Fuel & Free Time",
    meta: "Added: Mar 12, 2026",
    version: "1.0.0",
    edit_href: "/admin/theme-editor.html?slug=shop",
  },
  {
    id: "garage-dark",
    name: "Garage Dark",
    meta: "Added: Feb 8, 2026",
    version: "0.9.2",
    edit_href: "/admin/theme-editor.html?slug=about",
  },
  {
    id: "horizon",
    name: "Horizon",
    meta: "Last saved: Jan 19, 2026",
    version: "0.8.0",
    edit_href: "/admin/theme-editor.html?slug=community",
  },
];

function formatMetric(value, unit = "") {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}${unit}`;
}

const DEFAULT_STORE_PREFERENCES = {
  passwordProtection: false,
  storePassword: "",
  b2bOnly: false,
  homeTitle: "Fuel & Free Time",
  metaDescription: "Earned-not-given lifestyle apparel — built in Lafayette, Louisiana.",
  socialImageUrl: M.highOctane,
  geoRedirect: true,
  languageRedirect: false,
  hcaptchaContact: true,
  hcaptchaAccount: true,
};

const KV_PREFS_KEY = "store:preferences";

async function loadStorePreferences(env) {
  try {
    const row = await env.DB.prepare(`SELECT settings_json FROM store_settings WHERE id = 1`).first();
    if (row?.settings_json) {
      return { ...DEFAULT_STORE_PREFERENCES, ...JSON.parse(row.settings_json) };
    }
  } catch {
    /* table may not exist until migrated */
  }

  if (env.CMS_CACHE) {
    const cached = await env.CMS_CACHE.get(KV_PREFS_KEY, "json");
    if (cached) return { ...DEFAULT_STORE_PREFERENCES, ...cached };
  }

  return { ...DEFAULT_STORE_PREFERENCES };
}

async function saveStorePreferences(env, incoming) {
  const current = await loadStorePreferences(env);
  const next = {
    ...current,
    passwordProtection: !!incoming.passwordProtection,
    b2bOnly: !!incoming.b2bOnly,
    geoRedirect: !!incoming.geoRedirect,
    languageRedirect: !!incoming.languageRedirect,
    hcaptchaContact: !!incoming.hcaptchaContact,
    hcaptchaAccount: !!incoming.hcaptchaAccount,
    homeTitle: String(incoming.homeTitle ?? current.homeTitle).slice(0, 70),
    metaDescription: String(incoming.metaDescription ?? current.metaDescription).slice(0, 320),
    socialImageUrl: String(incoming.socialImageUrl ?? current.socialImageUrl).slice(0, 2048),
  };

  if (incoming.storePassword != null && incoming.storePassword !== "" && incoming.storePassword !== "••••••••") {
    next.storePassword = String(incoming.storePassword).slice(0, 128);
  }

  const json = JSON.stringify(next);

  try {
    await env.DB.prepare(
      `INSERT INTO store_settings (id, settings_json, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at`
    )
      .bind(json)
      .run();
  } catch {
    /* D1 table missing — KV only */
  }

  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put(KV_PREFS_KEY, json);
  }

  return next;
}

export { loadStorePreferences };

export async function getStorePreferences(env) {
  const domain = env.APP_DOMAIN || "fuelnfreetime.com";
  const settings = await loadStorePreferences(env);
  return json({
    ok: true,
    domain,
    settings: {
      ...settings,
      storePassword: settings.storePassword ? "••••••••" : "",
      hasStorePassword: !!settings.storePassword,
    },
  });
}

export async function postStorePreferences(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body?.settings || body;
  const saved = await saveStorePreferences(env, incoming);
  return json({
    ok: true,
    settings: {
      ...saved,
      storePassword: saved.storePassword ? "••••••••" : "",
      hasStorePassword: !!saved.storePassword,
    },
  });
}

export async function onlineStoreOverview(env) {
  const [pagesResult, sectionsMax, publishedPages] = await Promise.all([
    env.DB.prepare(
      `SELECT slug, title, status, updated_at FROM pages ORDER BY updated_at DESC`
    ).all(),
    env.DB.prepare(`SELECT MAX(updated_at) AS last_saved FROM page_sections`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM pages WHERE status = 'published'`).first(),
  ]);

  const domain = env.APP_DOMAIN || "fuelnfreetime.com";

  return json({
    ok: true,
    store: {
      visibility: publishedPages.n > 0 ? "public" : "password",
      url: `https://${domain}`,
    },
    performance: {
      period_days: 30,
      lcp_ms: null,
      inp_ms: null,
      cls: null,
      sessions_desktop: null,
      sessions_mobile: null,
      source: "pending",
    },
    active_theme: {
      id: "fnf-core",
      name: "Fuel & Free Time",
      status: "active",
      version: "1.0.0",
      version_available: null,
      last_saved: sectionsMax?.last_saved || null,
      edit_href: "/admin/theme-editor.html?slug=shop",
      preview_href: "/",
    },
    draft_themes: DRAFT_THEMES,
    pages: pagesResult.results || [],
    metrics_display: {
      lcp: formatMetric(null, " ms"),
      inp: formatMetric(null, " ms"),
      cls: formatMetric(null),
    },
  });
}
