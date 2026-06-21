#!/usr/bin/env node
/**
 * Embed FNF CMS + products + repo docs → fnf-agentsam-bge-m3-1024 (FNF_VECTORIZE).
 *
 * Usage:
 *   node scripts/embed-fnf-content.mjs
 *   node scripts/embed-fnf-content.mjs --dry-run
 *   node scripts/embed-fnf-content.mjs --source cms|product|repo|all
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const TENANT_ID = "tenant_fuelnfreetime";
const WORKSPACE_ID = "ws_fuelnfreetime";
const VECTORIZE_INDEX = "fnf-agentsam-bge-m3-1024";
const EMBED_MODEL = "@cf/baai/bge-m3";
const EMBED_DIMS = 1024;
const CHUNK_MIN_TOKENS = 500;
const CHUNK_MAX_TOKENS = 800;
const OVERLAP_RATIO = 0.1;

const REPO_DOC_PATHS = [
  "AGENTS.md",
  "docs/AGENTSAM-SKILLS.md",
  "docs/AGENTSAM-PROMPT-SYSTEM.md",
  "docs/AGENTSAM-FEATURE-GATES.md",
  "docs/RUNTIME-CONTRACTS-COMMERCE.md",
  "docs/RUNTIME-CONTRACTS-STRIPE.md",
  "docs/FNF-CMS-SPRINT-2026-06-20.md",
  "docs/cms-deploy-hooks.md",
  "docs/FNF-RUNTIME-OPS-2026-06-21.md",
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SOURCE_FILTER = (() => {
  const idx = args.indexOf("--source");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const eq = args.find((a) => a.startsWith("--source="));
  return eq ? eq.split("=")[1] : "all";
})();

function sh(cmd, opts = {}) {
  if (DRY_RUN && !opts.allowDry) {
    console.log("[dry-run]", cmd);
    return "";
  }
  return execSync(cmd, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: opts.silent ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "inherit"],
    ...opts,
  });
}

function loadCfEnv() {
  const iamEnv = path.join(process.env.HOME || "", "inneranimalmedia/.env.cloudflare");
  if (fs.existsSync(iamEnv)) {
    for (const line of fs.readFileSync(iamEnv, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
  if (process.env.CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN && !process.env.CLOUDFLARE_API_TOKEN) {
    process.env.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN;
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID_INNERANIMALS ||
    "ede6590ac0d2fb7daf155b35653457b2";
  if (!token) {
    console.error("Missing Cloudflare API token (~/inneranimalmedia/.env.cloudflare)");
    process.exit(1);
  }
  return { token, accountId };
}

function contentHash(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function chunkId(sourceType, sourceKey, chunkIndex, hash) {
  return `fnf_${sourceType}_${sourceKey}_${chunkIndex}_${hash.slice(0, 16)}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

function chunkText(text, { minTokens = CHUNK_MIN_TOKENS, maxTokens = CHUNK_MAX_TOKENS } = {}) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const minChars = minTokens * 4;
  const maxChars = maxTokens * 4;
  const overlapChars = Math.floor(maxChars * OVERLAP_RATIO);

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks = [];
  let buf = "";

  const flush = () => {
    const piece = buf.trim();
    if (piece.length >= Math.min(minChars, maxChars / 2) || !chunks.length) {
      chunks.push(piece);
    }
    buf = piece.slice(Math.max(0, piece.length - overlapChars));
  };

  for (const para of paragraphs) {
    const candidate = buf ? `${buf}\n\n${para}` : para;
    if (candidate.length > maxChars && buf.trim()) {
      flush();
      buf = para;
    } else {
      buf = candidate;
    }
  }
  if (buf.trim()) {
    if (buf.length > maxChars) {
      for (let i = 0; i < buf.length; i += maxChars - overlapChars) {
        chunks.push(buf.slice(i, i + maxChars).trim());
      }
    } else {
      chunks.push(buf.trim());
    }
  }

  return chunks.filter(Boolean);
}

function parseD1Json(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (parsed[0]?.results) return parsed[0].results;
      return parsed;
    }
    if (parsed?.results) return parsed.results;
    return [];
  } catch {
    return [];
  }
}

function d1Query(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const out = sh(
    `./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --command "${escaped}" --json`,
    { silent: true, allowDry: DRY_RUN }
  );
  if (DRY_RUN) return [];
  return parseD1Json(out);
}

function extractSectionText(contentJson) {
  if (!contentJson) return "";
  try {
    const data = typeof contentJson === "string" ? JSON.parse(contentJson) : contentJson;
    if (typeof data === "string") return data;
    if (data?.text) return String(data.text);
    if (data?.body) return String(data.body);
    if (data?.html) return String(data.html).replace(/<[^>]+>/g, " ");
    if (Array.isArray(data?.blocks)) {
      return data.blocks
        .map((b) => b?.text || b?.content || b?.value || "")
        .filter(Boolean)
        .join("\n\n");
    }
    return JSON.stringify(data);
  } catch {
    return String(contentJson);
  }
}

function loadCmsDocuments() {
  const rows = d1Query(
    `SELECT p.slug AS page_slug, p.title AS page_title, p.status AS page_status,
            ps.section_key, ps.content_json, ps.content_hash
     FROM pages p
     LEFT JOIN page_sections ps ON ps.page_id = p.id
     ORDER BY p.slug, ps.sort_order`
  );

  const docs = [];
  for (const row of rows) {
    const text = extractSectionText(row.content_json);
    if (!text.trim()) continue;
    docs.push({
      source_type: "cms",
      source_key: `${row.page_slug}/${row.section_key || "page"}`,
      title: `${row.page_title || row.page_slug} — ${row.section_key || "section"}`,
      text: `# ${row.page_title || row.page_slug}\n\n${text}`,
      page_status: row.page_status,
    });
  }
  return docs;
}

function loadProductDocuments() {
  const rows = d1Query(
    `SELECT slug, title, description, collection, status FROM products ORDER BY slug`
  );
  return rows
    .map((row) => {
      const text = [
        `# ${row.title}`,
        row.collection ? `Collection: ${row.collection}` : "",
        row.description || "",
        `Status: ${row.status}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      return {
        source_type: "product",
        source_key: row.slug,
        title: row.title,
        text,
      };
    })
    .filter((d) => d.text.trim().length > 20);
}

function loadRepoDocuments() {
  const docs = [];
  for (const rel of REPO_DOC_PATHS) {
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    docs.push({
      source_type: "repo",
      source_key: rel,
      title: path.basename(rel),
      text,
    });
  }
  return docs;
}

function loadExistingChunks() {
  const rows = d1Query(
    `SELECT chunk_id, content_hash, source_type, source_key FROM agentsam_vector_chunks WHERE workspace_id = '${WORKSPACE_ID}'`
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.chunk_id, row);
  }
  return map;
}

async function embedBatch(token, accountId, texts) {
  if (!texts.length) return [];
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBED_MODEL}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(`Embed failed HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  const vectors = json.result?.data || json.result || json.data || [];
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error(`Unexpected embed response shape (${vectors?.length} vs ${texts.length})`);
  }
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== EMBED_DIMS) {
      throw new Error(`Bad embedding dims: ${v?.length}`);
    }
  }
  return vectors;
}

async function vectorizeUpsert(token, accountId, vectors) {
  if (!vectors.length) return;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/upsert`;
  const ndjson = vectors
    .map((v) => JSON.stringify({ id: v.id, values: v.values, metadata: v.metadata }))
    .join("\n");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-ndjson",
    },
    body: ndjson,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(`Vectorize upsert HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
}

function sqlEscape(s) {
  return String(s ?? "").replace(/'/g, "''");
}

function upsertChunkRegistry(chunks) {
  if (!chunks.length || DRY_RUN) return;
  const statements = chunks.map(
    (c) => `INSERT INTO agentsam_vector_chunks (chunk_id, content_hash, source_type, source_key, workspace_id, tenant_id, vectorize_index, embedded_at, updated_at)
VALUES ('${sqlEscape(c.chunk_id)}', '${sqlEscape(c.content_hash)}', '${sqlEscape(c.source_type)}', '${sqlEscape(c.source_key)}', '${WORKSPACE_ID}', '${TENANT_ID}', '${VECTORIZE_INDEX}', datetime('now'), datetime('now'))
ON CONFLICT(chunk_id) DO UPDATE SET
  content_hash = excluded.content_hash,
  embedded_at = datetime('now'),
  updated_at = datetime('now');`
  );
  const file = path.join(REPO_ROOT, "db/.embed-chunks-tmp.sql");
  fs.writeFileSync(file, statements.join("\n"));
  sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=${file}`);
  fs.unlinkSync(file);
}

async function main() {
  const { token, accountId } = loadCfEnv();

  let documents = [];
  if (SOURCE_FILTER === "all" || SOURCE_FILTER === "cms") documents.push(...loadCmsDocuments());
  if (SOURCE_FILTER === "all" || SOURCE_FILTER === "product") documents.push(...loadProductDocuments());
  if (SOURCE_FILTER === "all" || SOURCE_FILTER === "repo") documents.push(...loadRepoDocuments());

  console.log(`Loaded ${documents.length} source document(s) [filter=${SOURCE_FILTER}]`);

  const existing = loadExistingChunks();
  const pending = [];

  for (const doc of documents) {
    const chunks = chunkText(doc.text);
    chunks.forEach((chunkTextValue, index) => {
      const hash = contentHash(chunkTextValue);
      const id = chunkId(doc.source_type, doc.source_key, index, hash);
      if (existing.get(id)?.content_hash === hash) return;

      pending.push({
        chunk_id: id,
        content_hash: hash,
        source_type: doc.source_type,
        source_key: doc.source_key,
        title: doc.title,
        chunk_index: index,
        text: chunkTextValue,
      });
    });
  }

  const skipped = documents.reduce((n, d) => n + chunkText(d.text).length, 0) - pending.length;
  console.log(`Chunks pending embed: ${pending.length} (skipped unchanged: ${skipped})`);

  if (!pending.length) {
    console.log("✓ Nothing to embed — index is up to date");
    return;
  }

  if (DRY_RUN) {
    console.log("[dry-run] Would embed", pending.length, "chunks");
    return;
  }

  sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/migrate-agentsam-skill-revisions.sql`);

  const BATCH = 8;
  let embedded = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embedBatch(
      token,
      accountId,
      batch.map((c) => c.text)
    );

    const upsertPayload = batch.map((chunk, idx) => ({
      id: chunk.chunk_id,
      values: vectors[idx],
      metadata: {
        workspace_id: WORKSPACE_ID,
        tenant_id: TENANT_ID,
        source_type: chunk.source_type,
        source_key: chunk.source_key,
        title: chunk.title,
        chunk_index: chunk.chunk_index,
        content_hash: chunk.content_hash,
        text_preview: chunk.text.slice(0, 500),
      },
    }));

    await vectorizeUpsert(token, accountId, upsertPayload);
    upsertChunkRegistry(batch);
    embedded += batch.length;
    console.log(`  embedded ${embedded}/${pending.length}`);
  }

  console.log(`✓ Embedded ${embedded} chunk(s) → ${VECTORIZE_INDEX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
