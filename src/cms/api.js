import { getStubPage, listStubPages } from "./stubs.js";

const KV_PREFIX = "cms:page:";

function json(data, init = {}) {
  return Response.json(data, init);
}

function parseContent(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
}

function kvKey(slug) {
  return `${KV_PREFIX}${slug}:v1`;
}

function mergeWithStub(slug, sections) {
  const stub = getStubPage(slug);
  if (!stub) return sections;

  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  return stub.sections.map((stubSection) => {
    const existing = byKey[stubSection.key];
    if (!existing) return { ...stubSection, source: "stub" };
    return {
      ...existing,
      content: { ...stubSection.content, ...existing.content },
    };
  });
}

async function loadSectionsFromDb(env, pageId, { publishedOnly = false } = {}) {
  let query = `SELECT section_key, sort_order, content_json, status, updated_at
               FROM page_sections WHERE page_id = ?`;
  if (publishedOnly) query += ` AND status = 'published'`;
  query += ` ORDER BY sort_order ASC, id ASC`;

  const { results } = await env.DB.prepare(query).bind(pageId).all();
  return results.map((row) => ({
    key: row.section_key,
    sort_order: row.sort_order,
    status: row.status,
    content: parseContent(row.content_json),
    updated_at: row.updated_at,
  }));
}

async function loadPageRow(env, slug) {
  return env.DB.prepare(`SELECT id, slug, title, status, updated_at FROM pages WHERE slug = ?`)
    .bind(slug)
    .first();
}

export async function buildPublishedSnapshot(env, slug) {
  const page = await loadPageRow(env, slug);
  if (!page || page.status !== "published") return null;

  const sections = await loadSectionsFromDb(env, page.id, { publishedOnly: true });
  if (!sections.length) return null;

  return {
    slug: page.slug,
    title: page.title,
    status: page.status,
    updated_at: page.updated_at,
    sections,
    source: "database",
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

  return getStubPage(slug);
}

export async function getPreviewPage(env, slug) {
  const page = await loadPageRow(env, slug);
  if (!page) return getStubPage(slug);

  const sections = await loadSectionsFromDb(env, page.id);
  return {
    slug: page.slug,
    title: page.title,
    status: page.status,
    updated_at: page.updated_at,
    sections: mergeWithStub(slug, sections),
    source: "preview",
  };
}

export async function listPagesAdmin(env) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.slug, p.title, p.status, p.updated_at,
            (SELECT COUNT(*) FROM page_sections s WHERE s.page_id = p.id) AS section_count
     FROM pages p
     ORDER BY p.slug ASC`
  ).all();

  if (!results.length) {
    return { ok: true, pages: listStubPages() };
  }

  return { ok: true, pages: results };
}

export async function getPageAdmin(env, slug) {
  const page = await loadPageRow(env, slug);
  if (!page) {
    const stub = getStubPage(slug);
    if (!stub) return null;
    return { ok: true, page: stub, seeded: false };
  }

  const sections = await loadSectionsFromDb(env, page.id);
  return {
    ok: true,
    seeded: true,
    page: {
      slug: page.slug,
      title: page.title,
      status: page.status,
      updated_at: page.updated_at,
      sections: mergeWithStub(slug, sections),
    },
  };
}

export async function updateSection(env, slug, sectionKey, body) {
  let page = await loadPageRow(env, slug);
  if (!page) {
    const seeded = await seedPageFromStub(env, slug);
    if (seeded.error) return seeded;
    page = await loadPageRow(env, slug);
  }

  const content = body?.content;
  if (!content || typeof content !== "object") {
    return { error: "content object required", status: 400 };
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM page_sections WHERE page_id = ? AND section_key = ?`
  )
    .bind(page.id, sectionKey)
    .first();

  if (existing) {
    await env.DB.prepare(
      `UPDATE page_sections
       SET content_json = ?, status = 'draft', updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(JSON.stringify(content), existing.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
       VALUES (?, ?, 0, ?, 'draft', datetime('now'))`
    )
      .bind(page.id, sectionKey, JSON.stringify(content))
      .run();
  }

  await env.DB.prepare(`UPDATE pages SET status = 'draft', updated_at = datetime('now') WHERE id = ?`)
    .bind(page.id)
    .run();

  return { ok: true };
}

export async function publishPage(env, slug) {
  let page = await loadPageRow(env, slug);
  if (!page) {
    const seeded = await seedPageFromStub(env, slug);
    if (seeded.error) return seeded;
    page = await loadPageRow(env, slug);
  }

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

export async function seedPageFromStub(env, slug) {
  const stub = getStubPage(slug);
  if (!stub) return { error: "Unknown page", status: 404 };

  await env.DB.prepare(
    `INSERT OR IGNORE INTO pages (slug, title, status, updated_at) VALUES (?, ?, 'published', datetime('now'))`
  )
    .bind(slug, stub.title)
    .run();

  const page = await loadPageRow(env, slug);

  for (const section of stub.sections) {
    const exists = await env.DB.prepare(
      `SELECT id FROM page_sections WHERE page_id = ? AND section_key = ?`
    )
      .bind(page.id, section.key)
      .first();

    if (!exists) {
      await env.DB.prepare(
        `INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
         VALUES (?, ?, ?, ?, 'published', datetime('now'))`
      )
        .bind(page.id, section.key, section.sort_order, JSON.stringify(section.content))
        .run();
    }
  }

  await writePublishedSnapshot(env, slug);
  return { ok: true, slug };
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

  if (path === "/api/admin/cms/pages" && method === "GET") {
    return json(await listPagesAdmin(env));
  }

  let m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)$/);
  if (m && method === "GET") {
    const data = await getPageAdmin(env, m[1]);
    if (!data) return json({ error: "Page not found" }, { status: 404 });
    return json(data);
  }

  m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)\/publish$/);
  if (m && method === "POST") {
    const result = await publishPage(env, m[1]);
    if (result.error) return json({ error: result.error }, { status: result.status });
    return json(result);
  }

  m = path.match(/^\/api\/admin\/cms\/pages\/([a-z0-9-]+)\/seed$/);
  if (m && method === "POST") {
    const result = await seedPageFromStub(env, m[1]);
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
