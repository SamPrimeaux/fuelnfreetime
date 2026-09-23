/**
 * CMS section content in R2 — draft, published, and version history.
 */

export function draftKey(slug, sectionKey) {
  return `cms/pages/${slug}/draft/${sectionKey}.json`;
}

export function publishedKey(slug, sectionKey) {
  return `cms/pages/${slug}/published/${sectionKey}.json`;
}

export function historyKey(slug, sectionKey, version) {
  return `cms/pages/${slug}/history/${sectionKey}.v${version}.json`;
}

export function pageMetaKey(slug) {
  return `cms/pages/${slug}/meta.json`;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function readR2Json(env, key) {
  if (!env.WEBSITE_ASSETS) return null;
  const obj = await env.WEBSITE_ASSETS.get(key);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text());
  } catch {
    return null;
  }
}

export async function writeR2Json(env, key, payload) {
  if (!env.WEBSITE_ASSETS) return false;
  const body = JSON.stringify(payload);
  await env.WEBSITE_ASSETS.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return true;
}

export async function writeSectionDraft(env, slug, sectionKey, content, meta = {}) {
  const version = (meta.version ?? 0) + 1;
  const updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);
  const payload = {
    section_key: sectionKey,
    content,
    status: "draft",
    version,
    updated_at,
  };
  const key = draftKey(slug, sectionKey);
  await writeR2Json(env, key, payload);
  await writeR2Json(env, historyKey(slug, sectionKey, version), payload);
  const content_hash = await sha256Hex(JSON.stringify(content));
  return { key, version, updated_at, content_hash };
}

export async function publishSectionToR2(env, slug, sectionKey, draftPayload) {
  const updated_at = new Date().toISOString().replace("T", " ").slice(0, 19);
  const payload = {
    section_key: sectionKey,
    content: draftPayload?.content ?? draftPayload,
    status: "published",
    version: draftPayload?.version ?? 1,
    updated_at,
  };
  const key = publishedKey(slug, sectionKey);
  await writeR2Json(env, key, payload);
  return { key, ...payload };
}

export async function readSectionContent(env, slug, sectionKey, { layer = "draft" } = {}) {
  const key = layer === "published" ? publishedKey(slug, sectionKey) : draftKey(slug, sectionKey);
  let doc = await readR2Json(env, key);
  if (!doc && layer === "draft") {
    doc = await readR2Json(env, publishedKey(slug, sectionKey));
  }
  if (!doc) return null;
  return {
    key: sectionKey,
    content: doc.content || {},
    status: doc.status || "draft",
    version: doc.version || 0,
    updated_at: doc.updated_at || null,
  };
}

export async function loadSectionsFromR2(env, slug, sectionRows, { publishedOnly = false } = {}) {
  const layer = publishedOnly ? "published" : "draft";
  const sections = [];

  for (const row of sectionRows) {
    const r2Key = row.content_r2_key || (publishedOnly ? publishedKey(slug, row.section_key) : draftKey(slug, row.section_key));
    let doc = await readR2Json(env, r2Key);
    if (!doc && publishedOnly) {
      doc = await readR2Json(env, publishedKey(slug, row.section_key));
    }
    if (!doc && !publishedOnly) {
      doc = await readR2Json(env, draftKey(slug, row.section_key));
    }

    let content = doc?.content;
    if (!content && row.content_json) {
      try {
        content = JSON.parse(row.content_json);
      } catch {
        content = {};
      }
    }
    if (!content) content = {};

    sections.push({
      key: row.section_key,
      sort_order: row.sort_order,
      status: publishedOnly ? "published" : row.status || doc?.status || "draft",
      content,
      updated_at: row.updated_at || doc?.updated_at || null,
      version: row.content_version ?? doc?.version ?? 0,
      source: doc ? "r2" : row.content_json ? "d1" : "empty",
    });
  }

  return sections.sort((a, b) => a.sort_order - b.sort_order);
}

/** Phase C — D1 no longer stores body copy */
export const D1_CONTENT_PLACEHOLDER = "{}";
