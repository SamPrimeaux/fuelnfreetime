function parseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function normalizeTheme(row) {
  if (!row) return null;
  const meta = parseJson(row.metadata_json, {});
  const workspaceHref = row.editor_mode === "package"
    ? `/admin/theme-workspace?theme=${encodeURIComponent(row.slug)}&slug=shop`
    : `/admin/theme-editor?slug=shop`;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    package_name: row.package_name,
    package_version: row.package_version || null,
    source_kind: row.source_kind,
    source_ref: row.source_ref || null,
    state: row.state,
    editor_mode: row.editor_mode,
    settings: parseJson(row.settings_json, {}),
    metadata: meta,
    published_at: row.published_at || null,
    last_saved: row.updated_at || null,
    preview_href: row.editor_mode === "package" ? workspaceHref : (row.preview_path || "/"),
    edit_href: workspaceHref,
    publish_ready: meta.publishReady === 1 && meta.runtimeReady === 1,
    review_ready: meta.publishReady === 1,
    runtime_ready: meta.runtimeReady === 1,
  };
}

export async function listStoreThemes(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, slug, name, package_name, package_version, source_kind, source_ref,
              state, editor_mode, preview_path, settings_json, metadata_json,
              published_at, created_at, updated_at
       FROM store_themes
       WHERE state != 'archived'
       ORDER BY CASE state WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC, name ASC`,
    ).all();
    const themes = (results || []).map(normalizeTheme);
    return {
      ok: true,
      source: 'store_themes',
      active_theme: themes.find((theme) => theme.state === 'active') || null,
      draft_themes: themes.filter((theme) => theme.state === 'draft'),
      themes,
    };
  } catch (error) {
    // Allows a code deploy to precede the additive DB migration without taking
    // the Online Store page down. Mutations must still fail closed.
    return {
      ok: false,
      source: 'store_themes_unavailable',
      error: error?.message || String(error),
      active_theme: null,
      draft_themes: [],
      themes: [],
    };
  }
}

export async function getStoreTheme(env, themeIdOrSlug) {
  try {
    const row = await env.DB.prepare(
      `SELECT id, slug, name, package_name, package_version, source_kind, source_ref,
              state, editor_mode, preview_path, settings_json, metadata_json,
              published_at, created_at, updated_at
       FROM store_themes
       WHERE id = ? OR slug = ?
       LIMIT 1`,
    ).bind(themeIdOrSlug, themeIdOrSlug).first();
    return normalizeTheme(row);
  } catch {
    return null;
  }
}

export async function publishStoreTheme(env, themeIdOrSlug, actorId = null) {
  const target = await getStoreTheme(env, themeIdOrSlug);
  if (!target) return { ok: false, status: 404, error: 'Theme not found' };
  if (target.state === 'active') {
    return { ok: true, unchanged: true, active_theme: target, previous_theme: target };
  }
  if (!target.publish_ready) {
    return {
      ok: false,
      status: 409,
      code: 'theme_not_publish_ready',
      error: 'This theme cannot be published yet. It must pass both customer review and storefront runtime readiness.',
    };
  }

  const current = await env.DB.prepare(
    `SELECT id, slug, name, state FROM store_themes WHERE state = 'active' LIMIT 1`,
  ).first();

  const eventMetadata = JSON.stringify({
    previous_theme_id: current?.id || null,
    previous_theme_slug: current?.slug || null,
  });

  try {
    const statements = [];
    if (current?.id) {
      statements.push(
        env.DB.prepare(
          `UPDATE store_themes
           SET state = 'draft', updated_at = datetime('now')
           WHERE id = ? AND state = 'active'`,
        ).bind(current.id),
      );
      statements.push(
        env.DB.prepare(
          `INSERT INTO store_theme_events(theme_id,event_type,from_state,to_state,actor_id,metadata_json)
           VALUES (?, 'unpublished', 'active', 'draft', ?, ?)`,
        ).bind(current.id, actorId, JSON.stringify({ replacement_theme_id: target.id })),
      );
    }

    statements.push(
      env.DB.prepare(
        `UPDATE store_themes
         SET state = 'active', published_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ? AND state = 'draft'`,
      ).bind(target.id),
    );
    statements.push(
      env.DB.prepare(
        `INSERT INTO store_theme_events(theme_id,event_type,from_state,to_state,actor_id,metadata_json)
         VALUES (?, 'published', 'draft', 'active', ?, ?)`,
      ).bind(target.id, actorId, eventMetadata),
    );

    await env.DB.batch(statements);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: 'theme_publish_failed',
      error: error?.message || String(error),
    };
  }

  const next = await listStoreThemes(env);
  return {
    ok: true,
    active_theme: next.active_theme,
    previous_theme: current ? { ...current, state: 'draft' } : null,
    draft_themes: next.draft_themes,
  };
}

export async function setThemePublishReady(env, themeIdOrSlug, ready, actorId = null) {
  const target = await getStoreTheme(env, themeIdOrSlug);
  if (!target) return { ok: false, status: 404, error: 'Theme not found' };
  const metadata = { ...(target.metadata || {}), publishReady: ready ? 1 : 0 };
  await env.DB.prepare(
    `UPDATE store_themes SET metadata_json = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(JSON.stringify(metadata), target.id).run();
  await env.DB.prepare(
    `INSERT INTO store_theme_events(theme_id,event_type,from_state,to_state,actor_id,metadata_json)
     VALUES (?, 'saved', ?, ?, ?, ?)`,
  ).bind(target.id, target.state, target.state, actorId, JSON.stringify({ publishReady: ready ? 1 : 0 })).run();
  return { ok: true, theme: await getStoreTheme(env, target.id) };
}
