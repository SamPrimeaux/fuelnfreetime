import {
  getRegistryPage,
  listRegistryPages,
  mergeWithRegistry,
  registryForAdmin,
  PAGE_REGISTRY,
} from "./registry.js";
import {
  draftKey,
  publishedKey,
  writeSectionDraft,
  publishSectionToR2,
  loadSectionsFromR2,
  readR2Json,
  readSectionContent,
  D1_CONTENT_PLACEHOLDER,
} from "./r2-store.js";

const KV_PREFIX = "cms:page:";

/** Phase C — D1 stores pointers only, not section bodies */
const WRITE_D1_CONTENT_JSON = false;

function json(data, init = {}) {
  return Response.json(data, init);
}

function parseContent(raw) {
  if (!raw || raw === D1_CONTENT_PLACEHOLDER) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
}

function extractPreview(content) {
  if (!content || typeof content !== "object") return "";
  const text =
    content.subheadline ||
    content.headline ||
    content.titleLine2 ||
    content.titleLine1 ||
    content.eyebrow ||
    "";
  return String(text).replace(/\s+/g, " ").trim();
}

function previewFromRegistry(slug) {
  const page = getRegistryPage(slug);
  if (!page?.sections?.length) return "";
  return extractPreview(page.sections[0].content);
}

function kvKey(slug) {
  return `${KV_PREFIX}${slug}:v1`;
}

async function loadSectionRows(env, pageId, { publishedOnly = false } = {}) {
  let query = `SELECT section_key, sort_order, content_json, content_r2_key, content_version, content_hash, status, updated_at
               FROM page_sections WHERE page_id = ?`;
  if (publishedOnly) query += ` AND status = 'published'`;
  query += ` ORDER BY sort_order ASC, id ASC`;

  const { results } = await env.DB.prepare(query).bind(pageId).all();
  return results;
}

async function loadSectionsFromDb(env, slug, pageId, { publishedOnly = false } = {}) {
  const rows = await loadSectionRows(env, pageId, { publishedOnly });
  return loadSectionsFromR2(env, slug, rows, { publishedOnly });
}

async function previewForPage(env, slug, pageId, previewJson) {
  const fromD1 = extractPreview(parseContent(previewJson));
  if (fromD1) return fromD1;

  const first = await env.DB.prepare(
    `SELECT section_key FROM page_sections WHERE page_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1`
  )
    .bind(pageId)
    .first();

  if (first) {
    const doc = await readSectionContent(env, slug, first.section_key);
    if (doc?.content) return extractPreview(doc.content);
  }

  return previewFromRegistry(slug);
}

async function loadPageRow(env, slug) {
  return env.DB.prepare(`SELECT id, slug, title, status, updated_at FROM pages WHERE slug = ?`)
    .bind(slug)
    .first();
}

async function persistSectionDraft(env, slug, pageId, sectionKey, content, sortOrder = 0) {
  const existing = await env.DB.prepare(
    `SELECT id, content_version FROM page_sections WHERE page_id = ? AND section_key = ?`
  )
    .bind(pageId, sectionKey)
    .first();

  const r2Meta = await writeSectionDraft(env, slug, sectionKey, content, {
    version: existing?.content_version ?? 0,
  });

  const r2_key = draftKey(slug, sectionKey);
  const d1Json = WRITE_D1_CONTENT_JSON ? JSON.stringify(content) : D1_CONTENT_PLACEHOLDER;

  if (existing) {
    await env.DB.prepare(
      `UPDATE page_sections
       SET content_json = ?, content_r2_key = ?, content_version = ?, content_hash = ?,
           status = 'draft', updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(d1Json, r2_key, r2Meta.version, r2Meta.content_hash, existing.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO page_sections
       (page_id, section_key, sort_order, content_json, content_r2_key, content_version, content_hash, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))`
    )
      .bind(pageId, sectionKey, sortOrder, d1Json, r2_key, r2Meta.version, r2Meta.content_hash)
      .run();
  }

  return r2Meta;
}

async function publishSectionsToR2(env, slug, pageId) {
  const { results } = await env.DB.prepare(
    `SELECT section_key, content_json, content_r2_key, content_version, status FROM page_sections WHERE page_id = ?`
  )
    .bind(pageId)
    .all();

  for (const row of results) {
    let draft = await readR2Json(env, row.content_r2_key || draftKey(slug, row.section_key));
    if (!draft) {
      const content = parseContent(row.content_json);
      if (Object.keys(content).length) {
        draft = { content, version: row.content_version || 1 };
      }
    }
    if (draft) {
      await publishSectionToR2(env, slug, row.section_key, draft);
    }
  }
}

export async function buildPublishedSnapshot(env, slug) {
  const page = await loadPageRow(env, slug);
  if (!page || page.status !== "published") return null;

  const sections = await loadSectionsFromDb(env, slug, page.id, { publishedOnly: true });
  if (!sections.length) return null;

  return {
    slug: page.slug,
    title: page.title,
    status: page.status,
    updated_at: page.updated_at,
    sections: sections.map(({ key, sort_order, status, content, updated_at }) => ({
      key,
      sort_order,
      status,
      content,
      updated_at,
    })),
    source: "r2",
  };
}

export async function writePublishedSnapshot(env, slug) {
  const snapshot = await buildPublishedSnapshot(env, slug);
  if (!snapshot) {
    await env.CMS_CACHE?.delete(kvKey(slug));
    return null;
  }
  if (env.CMS_CACHE) {
    await env.CMS_CACHE.put(kvKey(slug), JSON.stringify(snapshot), {
      metadata: { updated_at: snapshot.updated_at },
    });
  }
  return snapshot;
}

export async function getPublishedPage(env, slug) {
  if (env.CMS_CACHE) {
    const cached = await env.CMS_CACHE.get(kvKey(slug), "json");
    if (cached?.sections?.length) return { ...cached, source: "kv" };
  }

  const snapshot = await buildPublishedSnapshot(env, slug);
  if (snapshot) {
    if (env.CMS_CACHE) {
      await env.CMS_CACHE.put(kvKey(slug), JSON.stringify(snapshot));
    }
    return snapshot;
  }

  return null;
}

export async function getPreviewPage(env, slug) {
  const page = await loadPageRow(env, slug);
  if (!page) {
    const reg = getRegistryPage(slug);
    if (!reg) return null;
    return { ...reg, status: "draft", source: "preview" };
  }

  const sections = await loadSectionsFromDb(env, slug, page.id);
  return {
    slug: page.slug,
    title: page.title,
    status: page.status,
    updated_at: page.updated_at,
    sections: mergeWithRegistry(slug, sections),
    source: "preview",
  };
}

export async function listPagesAdmin(env) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.slug, p.title, p.status, p.updated_at,
            (SELECT COUNT(*) FROM page_sections s WHERE s.page_id = p.id) AS section_count,
            (SELECT content_json FROM page_sections s
             WHERE s.page_id = p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS preview_json
     FROM pages p
     ORDER BY p.title ASC`
  ).all();

  const pages = [];
  for (const row of results) {
    pages.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      updated_at: row.updated_at,
      section_count: row.section_count,
      preview: await previewForPage(env, row.slug, row.id, row.preview_json),
    });
  }

  return { ok: true, pages };
}

export async function getPageAdmin(env, slug) {
  const page = await loadPageRow(env, slug);
  if (!page) {
    const reg = getRegistryPage(slug);
    if (!reg) return null;
    return { ok: true, page: { ...reg, status: "draft" }, seeded: false };
  }

  const sections = await loadSectionsFromDb(env, slug, page.id);
  return {
    ok: true,
    seeded: true,
    page: {
      slug: page.slug,
      title: page.title,
      status: page.status,
      updated_at: page.updated_at,
      sections: mergeWithRegistry(slug, sections),
    },
  };
}

export async function updatePageMeta(env, slug, body) {
  let page = await loadPageRow(env, slug);
  if (!page) {
    const seeded = await seedPageFromRegistry(env, slug);
    if (seeded.error) return seeded;
    page = await loadPageRow(env, slug);
  }

  const title = body?.title?.trim();
  const status = body?.status;

  if (title) {
    await env.DB.prepare(
      `UPDATE pages SET title = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(title, page.id)
      .run();
  }

  if (status === "draft" || status === "published") {
    await env.DB.prepare(
      `UPDATE pages SET status = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(status, page.id)
      .run();
    if (status === "published") {
      await publishSectionsToR2(env, slug, page.id);
      await writePublishedSnapshot(env, slug);
    } else {
      await env.CMS_CACHE?.delete(kvKey(slug));
    }
  }

  return { ok: true };
}

export async function updateSection(env, slug, sectionKey, body) {
  let page = await loadPageRow(env, slug);
  if (!page) {
    const seeded = await seedPageFromRegistry(env, slug);
    if (seeded.error) return seeded;
    page = await loadPageRow(env, slug);
  }

  const content = body?.content;
  if (!content || typeof content !== "object") {
    return { error: "content object required", status: 400 };
  }

  const meta = await persistSectionDraft(env, slug, page.id, sectionKey, content);

  await env.DB.prepare(`UPDATE pages SET status = 'draft', updated_at = datetime('now') WHERE id = ?`)
    .bind(page.id)
    .run();

  return { ok: true, version: meta.version, updated_at: meta.updated_at };
}

export async function publishPage(env, slug) {
  let page = await loadPageRow(env, slug);
  if (!page) {
    const seeded = await seedPageFromRegistry(env, slug);
    if (seeded.error) return seeded;
    page = await loadPageRow(env, slug);
  }

  await publishSectionsToR2(env, slug, page.id);

  await env.DB.prepare(
    `UPDATE page_sections SET status = 'published', updated_at = datetime('now') WHERE page_id = ?`
  )
    .bind(page.id)
    .run();

  await env.DB.prepare(
    `UPDATE pages SET status = 'published', updated_at = datetime('now') WHERE id = ?`
  )
    .bind(page.id)
    .run();

  const snapshot = await writePublishedSnapshot(env, slug);
  return { ok: true, published_at: snapshot?.updated_at || null };
}

export async function seedPageFromRegistry(env, slug) {
  const reg = getRegistryPage(slug);
  if (!reg) return { error: "Unknown page", status: 404 };

  await env.DB.prepare(
    `INSERT INTO pages (slug, title, status, updated_at)
     VALUES (?, ?, 'published', datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET title = excluded.title, updated_at = datetime('now')`
  )
    .bind(slug, reg.title)
    .run();

  const page = await loadPageRow(env, slug);

  for (const section of reg.sections) {
    const r2Meta = await writeSectionDraft(env, slug, section.key, section.content, { version: 0 });
    await publishSectionToR2(env, slug, section.key, {
      content: section.content,
      version: r2Meta.version,
    });

    const r2_key = draftKey(slug, section.key);
    const d1Json = WRITE_D1_CONTENT_JSON ? JSON.stringify(section.content) : D1_CONTENT_PLACEHOLDER;

    await env.DB.prepare(
      `INSERT INTO page_sections
       (page_id, section_key, sort_order, content_json, content_r2_key, content_version, content_hash, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))
       ON CONFLICT(page_id, section_key) DO UPDATE SET
         sort_order = excluded.sort_order,
         content_json = excluded.content_json,
         content_r2_key = excluded.content_r2_key,
         content_version = excluded.content_version,
         content_hash = excluded.content_hash,
         status = 'published',
         updated_at = datetime('now')`
    )
      .bind(
        page.id,
        section.key,
        section.sort_order,
        d1Json,
        r2_key,
        r2Meta.version,
        r2Meta.content_hash
      )
      .run();
  }

  await env.DB.prepare(`UPDATE pages SET status = 'published', updated_at = datetime('now') WHERE id = ?`)
    .bind(page.id)
    .run();

  await writePublishedSnapshot(env, slug);
  return { ok: true, slug };
}

/** Backfill R2 from legacy D1 content_json rows */
export async function backfillSectionsToR2(env) {
  const { results } = await env.DB.prepare(
    `SELECT ps.id, ps.page_id, ps.section_key, ps.content_json, ps.content_r2_key, ps.content_version, ps.status,
            p.slug
     FROM page_sections ps
     JOIN pages p ON p.id = ps.page_id`
  ).all();

  let migrated = 0;
  for (const row of results) {
    if (row.content_r2_key) continue;
    const content = parseContent(row.content_json);
    if (!Object.keys(content).length) continue;

    const r2Meta = await writeSectionDraft(env, row.slug, row.section_key, content, {
      version: row.content_version || 0,
    });
    if (row.status === "published") {
      await publishSectionToR2(env, row.slug, row.section_key, {
        content,
        version: r2Meta.version,
      });
    }

    await env.DB.prepare(
      `UPDATE page_sections
       SET content_json = ?, content_r2_key = ?, content_version = ?, content_hash = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(D1_CONTENT_PLACEHOLDER, draftKey(row.slug, row.section_key), r2Meta.version, r2Meta.content_hash, row.id)
      .run();

    migrated++;
  }

  return { ok: true, migrated };
}

/** @deprecated */ export const seedPageFromStub = seedPageFromRegistry;

export async function bootstrapAllPages(env) {
  const slugs = Object.keys(PAGE_REGISTRY);
  const results = [];
  for (const slug of slugs) {
    results.push(await seedPageFromRegistry(env, slug));
  }
  return { ok: true, pages: results };
}

export async function handlePublicCmsApi(request, env, url) {
  const path = url.pathname;
  const preview = url.searchParams.get("preview") === "1";

  const match = path.match(/^\/api\/cms\/pages\/([a-z0-9-]+)$/);
  if (!match || request.method !== "GET") {
    return json({ error: "Not found" }, { status: 404 });
  }

  const slug = match[1];

  if (preview) {
    const { getSessionUser } = await import("../lib/auth.js");
    const user = await getSessionUser(request, env);
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const page = await getPreviewPage(env, slug);
    if (!page) return json({ error: "Page not found" }, { status: 404 });
    return json({ ok: true, page });
  }

  const page = await getPublishedPage(env, slug);
  if (!page) return json({ error: "Page not found" }, { status: 404 });

  return json(
    { ok: true, page },
    {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}

export async function handleAdminCmsApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/admin/cms/warm" && method === "POST") {
    const { warmAllCmsPages } = await import("./deploy.js");
    return json(await warmAllCmsPages(env));
  }

  if (path === "/api/admin/cms/registry" && method === "GET") {
    return json(registryForAdmin());
  }

  if (path === "/api/admin/cms/bootstrap" && method === "POST") {
    return json(await bootstrapAllPages(env));
  }

  if (path === "/api/admin/cms/backfill-r2" && method === "POST") {
    const backfill = await backfillSectionsToR2(env);
    for (const slug of Object.keys(PAGE_REGISTRY)) {
      await writePublishedSnapshot(env, slug);
    }
    return json(backfill);
  }

  if (path === "/api/admin/cms/pages" && method === "GET") {
    return json(await listPagesAdmin(env));
  }

  let m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)$/);
  if (m && method === "GET") {
    const data = await getPageAdmin(env, m[1]);
    if (!data) return json({ error: "Page not found" }, { status: 404 });
    return json(data);
  }
  if (m && method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, { status: 400 });
    }
    const result = await updatePageMeta(env, m[1], body);
    if (result.error) return json({ error: result.error }, { status: result.status });
    return json(result);
  }

  m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)\/publish$/);
  if (m && method === "POST") {
    const result = await publishPage(env, m[1]);
    if (result.error) return json({ error: result.error }, { status: result.status });
    return json(result);
  }

  m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)\/seed$/);
  if (m && method === "POST") {
    const result = await seedPageFromRegistry(env, m[1]);
    if (result.error) return json({ error: result.error }, { status: result.status });
    return json(result);
  }

  m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)\/sections\/([a-z0-9-]+)$/);
  if (m && method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, { status: 400 });
    }
    const result = await updateSection(env, m[1], m[2], body);
    if (result.error) return json({ error: result.error }, { status: result.status });
    return json(result);
  }

  return null;
}
