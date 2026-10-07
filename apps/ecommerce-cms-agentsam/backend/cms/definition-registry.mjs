/**
 * Account-scoped D1 definition discovery for the existing FNF Theme Studio.
 * Definitions describe settings and semantics; the source/portable storefront
 * renderer remains the implementation authority until an artifact is verified.
 */
const KEY = /^[a-z][a-z0-9-]{0,63}$/;
const KIND = new Set(["section", "block"]);
const STATUS = new Set(["active", "draft", "deprecated", "archived"]);

function parseJson(value, fallback) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeCmsDefinition(row) {
  const fields = parseJson(row.settings_schema_json, {});
  return {
    id: row.id,
    key: row.definition_key,
    kind: row.kind,
    version: row.version,
    label: row.label,
    description: row.description || "",
    category: row.category || "General",
    origin: row.origin,
    status: row.status,
    fields,
    allowedBlocks: Array.isArray(parseJson(row.allowed_blocks_json, []))
      ? parseJson(row.allowed_blocks_json, []).filter((item) => typeof item === "string" && KEY.test(item))
      : [],
    maxBlocks: row.max_blocks == null ? null : Number(row.max_blocks),
    metadata: parseJson(row.metadata_json, {}),
    artifact: row.artifact_id && row.artifact_status === "ready"
      ? { id: row.artifact_id, type: row.artifact_type, version: row.artifact_version,
          manifestR2Key: row.manifest_r2_key, contentHash: row.content_hash }
      : null,
  };
}

export async function listCmsDefinitions(env, accountId, filters = {}) {
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new Error("cms_definition_account_required");
  }
  if (filters.kind && !KIND.has(filters.kind)) throw new Error("invalid_definition_kind");
  if (filters.status && !STATUS.has(filters.status)) throw new Error("invalid_definition_status");
  if (filters.key && !KEY.test(filters.key)) throw new Error("invalid_definition_key");
  if (filters.version && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,47}$/.test(filters.version)) {
    throw new Error("invalid_definition_version");
  }
  let query = `SELECT d.id, d.definition_key, d.kind, d.label, d.description,
    d.category, d.origin, d.version, d.status, d.artifact_id,
    d.settings_schema_json, d.allowed_blocks_json, d.max_blocks, d.metadata_json,
    a.status AS artifact_status, a.artifact_type, a.version AS artifact_version,
    a.manifest_r2_key, a.content_hash
    FROM cms_definitions d
    LEFT JOIN cms_artifacts a ON a.id = d.artifact_id AND a.account_id = d.account_id
    WHERE d.account_id = ?`;
  const binds = [accountId];
  for (const [param, column] of [["kind", "d.kind"], ["status", "d.status"], ["key", "d.definition_key"], ["version", "d.version"]]) {
    if (filters[param]) {
      query += ` AND ${column} = ?`;
      binds.push(filters[param]);
    }
  }
  query += " ORDER BY d.kind, d.definition_key, d.version DESC LIMIT 300";
  const result = await env.DB.prepare(query).bind(...binds).all();
  return (result.results || []).map(normalizeCmsDefinition);
}

/**
 * Bridge an ACTIVE semantic definition to an ALREADY RENDERABLE host section.
 * Never synthesize an unimplemented visual section from a database record.
 */
export function attachCmsDefinitions(registry, definitions) {
  const pages = structuredClone(registry.pages || {});
  const indexed = new Map();
  for (const definition of definitions) {
    if (definition.status !== "active" || definition.kind !== "section") continue;
    const old = indexed.get(definition.key);
    if (!old || String(definition.version).localeCompare(String(old.version), undefined, { numeric: true }) > 0) {
      indexed.set(definition.key, definition);
    }
  }
  for (const page of Object.values(pages)) {
    // Generated definitions are installable only when a validated, ready R2
    // implementation exists. They share the same typed inspector contract.
    // The editor's native catalog remains restricted to known insertable
    // templates; a generated definition is installed via explicit acceptance.
    for (const definition of indexed.values()) {
      if (definition.origin !== "generated" || !definition.artifact || page.sections?.[definition.key]) continue;
      const fields = Object.entries(definition.fields || {}).map(([key, spec]) => ({
        key, label: String(spec?.label || key), type: spec?.type || "text",
      }));
      if (!fields.length) continue;
      page.sections[definition.key] = {
        sortOrder: 1000,
        label: definition.label,
        icon: "section",
        capabilities: { edit:true,media:true,settings:true,reorder:true,duplicate:true,remove:true,blocks:false },
        fields, blocks:[],settings:[],guardrails:{ allowRawCss:false,allowRawHtml:false },
        definitionKey:definition.key, definitionVersion:definition.version,
        definitionOrigin:"generated", definitionId:definition.id,
      };
    }
    for (const [key, section] of Object.entries(page.sections || {})) {
      const definition = indexed.get(key);
      if (!definition) continue;
      // Existing source/renderer and typed inspector remain the implementation.
      section.definitionKey = definition.key;
      section.definitionVersion = definition.version;
      section.definitionOrigin = definition.origin;
      section.definitionStatus = definition.status;
      section.definitionId = definition.id;
    }
  }
  const known = new Set(Object.values(pages).flatMap((page) => Object.keys(page.sections || {})));
  return {
    ...registry,
    pages,
    definitions: definitions.map((definition) => ({
      ...definition,
      insertable: definition.status === "active" && definition.kind === "section" && known.has(definition.key),
    })),
  };
}
