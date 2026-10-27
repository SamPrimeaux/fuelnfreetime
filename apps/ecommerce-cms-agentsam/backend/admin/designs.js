import { CompletefulApiError } from "../completeful/client.js";
import { completefulDesigns } from "../completeful/designs.js";

const JSON_LIMIT = 200_000;
const LIMIT_MAX = 100;
const asJson = (value, fallback) => {
  try { return JSON.parse(value); } catch { return fallback; }
};
const response = (value, status = 200) => Response.json(value, { status });
const invalid = (code, message, status = 400) => Object.assign(new Error(message), { code, status });
const dbResult = (result) => result?.meta?.changes ?? result?.changes ?? 0;
const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const allowedRole = new Set(["owner", "admin", "member"]);
const idOf = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

async function bodyOf(request) {
  const raw = await request.text();
  if (raw.length > JSON_LIMIT) throw invalid("payload_too_large", "Design payload exceeds 200 KB", 413);
  let value;
  try { value = JSON.parse(raw); } catch { throw invalid("invalid_json", "Valid JSON required"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid("invalid_body", "JSON object required");
  return value;
}

async function identity(env, user) {
  if (!user?.id || !user?.account_id) throw invalid("account_required", "Select an account", 403);
  const member = await env.DB.prepare(
    "SELECT role FROM account_memberships WHERE account_id = ? AND user_id = ?"
  ).bind(user.account_id, user.id).first();
  if (!member) throw invalid("membership_required", "Account membership required", 403);
  return { accountId: user.account_id, userId: user.id, role: member.role };
}
const visibleFilter = "(visibility = 'team' OR owner_user_id = ?)";
function writable(row, actor) {
  if (!row || row.account_id !== actor.accountId) throw invalid("not_found", "Design not found", 404);
  if (!allowedRole.has(actor.role)) throw invalid("read_only", "Account is read-only", 403);
  if (actor.role !== "owner" && actor.role !== "admin" && row.owner_user_id !== actor.userId &&
      row.visibility !== "team") throw invalid("not_owner", "Only the owner can modify this private design", 403);
}

function safeName(input, key = "name") {
  if (typeof input !== "string" || !input.trim() || input.trim().length > 120) {
    throw invalid("invalid_" + key, key + " must be 1 to 120 characters");
  }
  return input.trim();
}
function safeTags(input) {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 30 ||
      input.some(t => typeof t !== "string" || t.trim().length < 1 || t.trim().length > 48)) {
    throw invalid("invalid_tags", "Tags must be an array of up to 30 short labels");
  }
  return [...new Set(input.map(t => t.trim()))];
}
function visibilityOf(value) {
  if (value == null) return "team";
  if (!["team", "private"].includes(value)) throw invalid("invalid_visibility", "Visibility must be private or team");
  return value;
}
function canvasOf(value) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw invalid("invalid_canvas", "canvas must be an object");
  return value;
}
async function ensureMedia(env, id, mustBePng = false) {
  if (id == null) return null;
  const value = idOf(id);
  if (!value) throw invalid("invalid_media_asset", "Invalid media asset ID");
  const asset = await env.DB.prepare("SELECT * FROM media_assets WHERE id = ?").bind(value).first();
  if (!asset) throw invalid("missing_media_asset", "Artwork must exist in the media library");
  if (mustBePng && String(asset.content_type || "").toLowerCase() !== "image/png") {
    throw invalid("invalid_print_file", "Prepared print artwork must be PNG");
  }
  return asset;
}
async function placementsOf(env, input) {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 12) throw invalid("invalid_placements", "Up to 12 print placements are supported");
  const slots = new Set(), normalized = [];
  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw invalid("invalid_placement", "Invalid placement");
    const slot = text(item.slot, 40).toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(slot) || slots.has(slot)) {
      throw invalid("invalid_slot", "Print slots must be unique named positions");
    }
    slots.add(slot);
    const original = await ensureMedia(env, item.original_media_asset_id);
    const prepared = await ensureMedia(env, item.prepared_media_asset_id, true);
    const preview = await ensureMedia(env, item.preview_media_asset_id);
    if (prepared && !original) throw invalid("source_required", "Prepared artwork must retain its original media reference");
    const position = {};
    for (const [key, lo, hi, defaultValue] of [
      ["x", 0, 100, 50], ["y", 0, 100, 50], ["scale", 0.1, 100, 80], ["rotation", -360, 360, 0]
    ]) {
      const n = item[key] == null ? defaultValue : Number(item[key]);
      if (!Number.isFinite(n) || n < lo || n > hi) throw invalid("invalid_placement", key + " is outside its permitted range");
      position[key] = n;
    }
    normalized.push({
      slot, ...position,
      original_media_asset_id: original?.id ?? null,
      prepared_media_asset_id: prepared?.id ?? null,
      preview_media_asset_id: preview?.id ?? null,
      showArtwork: item.showArtwork !== false,
      flipX: item.flipX === true, flipY: item.flipY === true,
      trimTransparent: item.trimTransparent === true,
    });
  }
  return normalized;
}
function record(row, revision = null) {
  if (!row) return null;
  const output = {
    id: row.id, account_id: row.account_id, owner_user_id: row.owner_user_id,
    name: row.name, description: row.description, tags: asJson(row.tags_json, []),
    visibility: row.visibility, status: row.status,
    revision: row.current_revision, thumbnail_media_asset_id: row.thumbnail_media_asset_id,
    thumbnail_url: row.thumbnail_url || null,
    created_at: row.created_at, updated_at: row.updated_at,
  };
  if (revision) {
    output.canvas = asJson(revision.canvas_json, {});
    output.placements = asJson(revision.placements_json, []);
  }
  return output;
}
async function getDesign(env, id, actor) {
  const row = await env.DB.prepare(
    "SELECT d.*, m.url AS thumbnail_url FROM merch_designs d LEFT JOIN media_assets m ON m.id=d.thumbnail_media_asset_id WHERE d.id=? AND d.account_id=? AND (d.visibility='team' OR d.owner_user_id=?)"
  ).bind(id, actor.accountId, actor.userId).first();
  if (!row) throw invalid("not_found", "Design not found", 404);
  return row;
}
async function revisionOf(env, id, revision) {
  const row = await env.DB.prepare(
    "SELECT * FROM merch_design_revisions WHERE design_id = ? AND revision = ?"
  ).bind(id, revision).first();
  if (!row) throw invalid("revision_not_found", "Design revision not found", 404);
  return row;
}
async function getCollection(env, id, actor, write = false) {
  const row = await env.DB.prepare(
    "SELECT * FROM merch_design_collections WHERE id = ? AND account_id = ? AND " + visibleFilter
  ).bind(id, actor.accountId, actor.userId).first();
  if (!row) throw invalid("collection_not_found", "Collection not found", 404);
  if (write) writable(row, actor);
  return row;
}
function collectionRecord(row) {
  return { id: row.id, name: row.name, description: row.description, visibility: row.visibility,
    owner_user_id: row.owner_user_id, created_at: row.created_at, updated_at: row.updated_at };
}

async function listDesigns(env, url, actor) {
  const search = text(url.searchParams.get("search") || url.searchParams.get("q") || "", 120);
  const collectionId = text(url.searchParams.get("collection_id") || "", 100);
  const limit = Math.max(1, Math.min(LIMIT_MAX, Number(url.searchParams.get("limit")) || 30));
  const offset = Math.max(0, Math.min(100_000, Number(url.searchParams.get("offset")) || 0));
  if (collectionId) await getCollection(env, collectionId, actor);
  const query = "SELECT d.*, m.url AS thumbnail_url FROM merch_designs d LEFT JOIN media_assets m ON m.id=d.thumbnail_media_asset_id WHERE d.account_id = ? AND " +
    "(d.visibility = 'team' OR d.owner_user_id = ?) AND d.status != 'archived'" +
    (search ? " AND (d.name LIKE ? OR d.description LIKE ? OR d.tags_json LIKE ?)" : "") +
    (collectionId ? " AND EXISTS (SELECT 1 FROM merch_design_collection_items i WHERE i.design_id = d.id AND i.collection_id = ?)" : "") +
    " ORDER BY d.updated_at DESC, d.id DESC LIMIT ? OFFSET ?";
  const params = [actor.accountId, actor.userId];
  if (search) params.push(...Array(3).fill("%" + search.replace(/[%_]/g, "") + "%"));
  if (collectionId) params.push(collectionId);
  params.push(limit + 1, offset);
  const rows = (await env.DB.prepare(query).bind(...params).all()).results || [];
  return response({ ok: true, designs: rows.slice(0, limit).map(row => record(row)),
    pagination: { offset, limit, has_more: rows.length > limit } });
}
async function createDesign(env, request, actor) {
  if (!allowedRole.has(actor.role)) throw invalid("read_only", "Cannot create designs", 403);
  const input = await bodyOf(request);
  const name = safeName(input.name);
  const placements = await placementsOf(env, input.placements);
  const canvas = canvasOf(input.canvas);
  const thumbnail = await ensureMedia(env, input.thumbnail_media_asset_id);
  const id = crypto.randomUUID();
  const values = [id, actor.accountId, actor.userId, name,
    text(input.description, 2000), JSON.stringify(safeTags(input.tags)),
    visibilityOf(input.visibility), thumbnail?.id || null];
  await env.DB.batch([
    env.DB.prepare("INSERT INTO merch_designs (id,account_id,owner_user_id,name,description,tags_json,visibility,thumbnail_media_asset_id) VALUES (?,?,?,?,?,?,?,?)").bind(...values),
    env.DB.prepare("INSERT INTO merch_design_revisions (design_id,revision,canvas_json,placements_json,created_by) VALUES (?,1,?,?,?)")
      .bind(id, JSON.stringify(canvas), JSON.stringify(placements), actor.userId),
  ]);
  return response({ ok: true, design: record(await getDesign(env, id, actor), await revisionOf(env, id, 1)) }, 201);
}
async function patchDesign(env, id, request, actor) {
  const prior = await getDesign(env, id, actor);
  writable(prior, actor);
  if (prior.status === "archived") throw invalid("design_archived", "Archived designs cannot be edited", 409);
  const input = await bodyOf(request);
  const expected = Number(input.expected_revision);
  if (!Number.isSafeInteger(expected) || expected !== prior.current_revision)
    throw invalid("version_conflict", "Refresh before editing this design", 409);
  const name = Object.hasOwn(input, "name") ? safeName(input.name) : prior.name;
  const description = Object.hasOwn(input, "description") ? text(input.description, 2000) : prior.description;
  const tags = Object.hasOwn(input, "tags") ? safeTags(input.tags) : asJson(prior.tags_json, []);
  const visibility = Object.hasOwn(input, "visibility") ? visibilityOf(input.visibility) : prior.visibility;
  const thumbnail = Object.hasOwn(input, "thumbnail_media_asset_id") ?
    await ensureMedia(env, input.thumbnail_media_asset_id) : null;
  const thumbnailId = Object.hasOwn(input, "thumbnail_media_asset_id") ? thumbnail?.id ?? null : prior.thumbnail_media_asset_id;
  const previousRevision = await revisionOf(env, id, prior.current_revision);
  const restoreRevision = input.restore_revision == null ? null : await revisionOf(env, id, Number(input.restore_revision));
  const contentChanged = Object.hasOwn(input, "placements") || Object.hasOwn(input, "canvas") || restoreRevision;
  const placements = Object.hasOwn(input, "placements") ? await placementsOf(env, input.placements)
    : asJson((restoreRevision || previousRevision).placements_json, []);
  const canvas = Object.hasOwn(input, "canvas") ? canvasOf(input.canvas)
    : asJson((restoreRevision || previousRevision).canvas_json, {});
  const update = env.DB.prepare(
    "UPDATE merch_designs SET name=?, description=?, tags_json=?, visibility=?, thumbnail_media_asset_id=?, current_revision=?, status='draft', updated_at=datetime('now') WHERE id=? AND account_id=? AND current_revision=?"
  ).bind(name, description, JSON.stringify(tags), visibility, thumbnailId,
    prior.current_revision + (contentChanged ? 1 : 0), id, actor.accountId, expected);
  if (contentChanged) {
    const steps = await env.DB.batch([
      update,
      env.DB.prepare("INSERT INTO merch_design_revisions (design_id,revision,canvas_json,placements_json,created_by) VALUES (?,?,?,?,?)")
        .bind(id, expected + 1, JSON.stringify(canvas), JSON.stringify(placements), actor.userId),
    ]);
    if (!dbResult(steps[0])) throw invalid("version_conflict", "Design changed during update", 409);
  } else {
    if (!dbResult(await update.run())) throw invalid("version_conflict", "Design changed during update", 409);
  }
  const fresh = await getDesign(env, id, actor);
  return response({ ok: true, design: record(fresh, await revisionOf(env, id, fresh.current_revision)) });
}
async function listCollections(env, actor) {
  const { results = [] } = await env.DB.prepare(
    "SELECT * FROM merch_design_collections WHERE account_id=? AND " + visibleFilter + " ORDER BY updated_at DESC"
  ).bind(actor.accountId, actor.userId).all();
  return response({ ok: true, collections: results.map(collectionRecord) });
}
async function createCollection(env, request, actor) {
  if (!allowedRole.has(actor.role)) throw invalid("read_only", "Cannot create collections", 403);
  const input = await bodyOf(request);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO merch_design_collections (id,account_id,owner_user_id,name,description,visibility) VALUES (?,?,?,?,?,?)"
  ).bind(id, actor.accountId, actor.userId, safeName(input.name), text(input.description, 2000), visibilityOf(input.visibility)).run();
  return response({ ok: true, collection: collectionRecord(await getCollection(env, id, actor)) }, 201);
}
async function patchCollection(env, id, request, actor) {
  const row = await getCollection(env, id, actor, true);
  const input = await bodyOf(request);
  await env.DB.prepare(
    "UPDATE merch_design_collections SET name=?, description=?, visibility=?, updated_at=datetime('now') WHERE id=? AND account_id=?"
  ).bind(Object.hasOwn(input, "name") ? safeName(input.name) : row.name,
    Object.hasOwn(input, "description") ? text(input.description, 2000) : row.description,
    Object.hasOwn(input, "visibility") ? visibilityOf(input.visibility) : row.visibility,
    id, actor.accountId).run();
  return response({ ok: true, collection: collectionRecord(await getCollection(env, id, actor)) });
}
async function collectionMembership(env, designId, collectionId, method, actor) {
  const design = await getDesign(env, designId, actor);
  const collection = await getCollection(env, collectionId, actor, true);
  writable(design, actor);
  if (design.status === "archived") throw invalid("design_archived", "Cannot organize archived designs", 409);
  // A private design must never appear in a collection visible to other members.
  if (design.visibility === "private" && collection.visibility === "team")
    throw invalid("private_design", "A private design cannot be added to a team collection", 409);
  if (method === "PUT") {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO merch_design_collection_items(collection_id,design_id) VALUES(?,?)"
    ).bind(collectionId, designId).run();
  } else {
    await env.DB.prepare("DELETE FROM merch_design_collection_items WHERE collection_id=? AND design_id=?")
      .bind(collectionId, designId).run();
  }
  return response({ ok: true, design_id: designId, collection_id: collectionId, linked: method === "PUT" });
}

async function createDesignFromDraft(env, request, actor) {
  if (!allowedRole.has(actor.role)) throw invalid("read_only", "Cannot save design templates", 403);
  const input = await bodyOf(request);
  const draftId = text(input.draft_id, 120);
  if (!draftId) throw invalid("draft_required", "draft_id required");
  const draft = await env.DB.prepare("SELECT * FROM product_studio_drafts WHERE id=?").bind(draftId).first();
  if (!draft) throw invalid("draft_not_found", "Product Studio draft not found", 404);
  if (Number(input.expected_draft_version) !== Number(draft.version))
    throw invalid("draft_conflict", "Refresh the Studio draft before saving its design", 409);
  const existing = await env.DB.prepare(
    "SELECT design_id FROM merch_design_draft_links WHERE draft_id=? AND account_id=?"
  ).bind(draftId, actor.accountId).first();
  if (existing && input.force_new !== true) {
    const row = await getDesign(env, existing.design_id, actor);
    return response({ ok: true, reused: true, design: record(row, await revisionOf(env, row.id, row.current_revision)) });
  }
  const state = asJson(draft.placement_json, {});
  const active = Object.entries(state.sides || {})
    .filter(([, side]) => side && side.original_media_asset_id && side.showArtwork !== false);
  if (!active.length) throw invalid("no_artwork", "Add artwork to the draft before saving a reusable design", 409);
  const placements = [], seen = new Set();
  for (const [locationId, side] of active) {
    const location = await env.DB.prepare(
      "SELECT name FROM completeful_catalog_print_locations WHERE completeful_product_id=? AND print_location_id=? AND enabled=1"
    ).bind(draft.completeful_catalog_product_id, locationId).first();
    if (!location) throw invalid("invalid_location", "Draft references a print location that is no longer available", 409);
    let slot = text(input.slot_map?.[locationId] || location.name, 40).toLowerCase();
    slot = /\bback\b/.test(slot) ? "back" : /\bfront\b/.test(slot) ? "front" : slot.replace(/[^a-z0-9_-]+/g, "_");
    if (seen.has(slot)) throw invalid("ambiguous_slot", "Supply slot_map for duplicate manufacturer positions");
    seen.add(slot);
    placements.push({ slot, original_media_asset_id: side.original_media_asset_id,
      prepared_media_asset_id: side.prepared_media_asset_id || null,
      preview_media_asset_id: side.preview_media_asset_id || null,
      x: side.x, y: side.y, scale: side.scale, rotation: side.rotation,
      flipX: side.flipX, flipY: side.flipY, showArtwork: side.showArtwork });
  }
  const verified = await placementsOf(env, placements);
  const name = safeName(input.name || draft.title);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO merch_designs (id,account_id,owner_user_id,name,description,tags_json,visibility,thumbnail_media_asset_id) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(id, actor.accountId, actor.userId, name, text(input.description || draft.description, 2000),
      JSON.stringify(safeTags(input.tags)), visibilityOf(input.visibility), draft.preview_media_asset_id || null),
    env.DB.prepare(
      "INSERT INTO merch_design_revisions (design_id,revision,canvas_json,placements_json,created_by) VALUES (?,1,?,?,?)"
    ).bind(id, JSON.stringify({ schema_version: 1, source: "product-studio" }),
      JSON.stringify(verified), actor.userId),
    env.DB.prepare(
      "INSERT INTO merch_design_draft_links(draft_id,design_id,design_revision,account_id,applied_by) VALUES (?,?,1,?,?) ON CONFLICT(draft_id) DO UPDATE SET design_id=excluded.design_id,design_revision=excluded.design_revision,account_id=excluded.account_id,applied_by=excluded.applied_by,applied_at=datetime('now')"
    ).bind(draftId, id, actor.accountId, actor.userId),
  ]);
  return response({ ok: true, reused: false, design: record(await getDesign(env, id, actor),
    await revisionOf(env, id, 1)), draft_id: draftId }, 201);
}

async function applyDesign(env, designId, request, actor) {
  if (!allowedRole.has(actor.role)) throw invalid("read_only", "Cannot apply designs", 403);
  const design = await getDesign(env, designId, actor);
  if (design.status === "archived") throw invalid("design_archived", "Cannot apply archived designs", 409);
  const input = await bodyOf(request);
  const draftId = text(input.draft_id, 120);
  const expected = Number(input.expected_draft_version);
  if (!draftId || !Number.isSafeInteger(expected) || expected < 1)
    throw invalid("invalid_draft", "draft_id and expected_draft_version required");
  const draft = await env.DB.prepare("SELECT * FROM product_studio_drafts WHERE id=?").bind(draftId).first();
  if (!draft) throw invalid("draft_not_found", "Product Studio draft not found", 404);
  if (Number(draft.version) !== expected) throw invalid("draft_conflict", "Refresh the product draft before applying a design", 409);
  if (!["draft", "prepared", "error"].includes(draft.state))
    throw invalid("draft_locked", "Only editable product drafts can receive a template", 409);
  const revisionNumber = input.revision == null ? design.current_revision : Number(input.revision);
  const revision = await revisionOf(env, designId, revisionNumber);
  const placements = asJson(revision.placements_json, []);
  if (!placements.length) throw invalid("empty_design", "Add artwork placements before applying this design", 409);
  const mapping = input.print_location_map;
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping))
    throw invalid("location_map_required", "Map design slots to supplier print locations");
  if (Object.keys(mapping).length !== placements.length)
    throw invalid("location_map_incomplete", "Map every design slot exactly once");
  const mapped = new Set();
  // Prepared artboard pixels belong to their original print location.
  // Always carry the source + placement recipe to a new garment, never its
  // prior manufacturing derivative without new supplier preflight.
  const updated = {};
  for (const placement of placements) {
    const locationId = text(mapping[placement.slot], 120);
    if (!locationId || mapped.has(locationId)) throw invalid("invalid_location_map", "Each slot needs its own print location");
    mapped.add(locationId);
    const location = await env.DB.prepare(
      "SELECT * FROM completeful_catalog_print_locations WHERE completeful_product_id=? AND print_location_id=? AND enabled=1"
    ).bind(draft.completeful_catalog_product_id, locationId).first();
    if (!location) throw invalid("invalid_location", "Print location is not available on the selected garment", 409);
    updated[locationId] = { ...placement, prepared_media_asset_id: null, preview_media_asset_id: null };
    delete updated[locationId].slot;
  }
  const placementJson = asJson(draft.placement_json, {});
  const main = placements.find(p => p.slot === "front") || placements[0];
  const locations = [...mapped];
  const prepared = false; // A new target needs a fresh manufacturing derivative.
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE product_studio_drafts SET placement_json=?,print_locations_json=?,original_media_asset_id=?,prepared_media_asset_id=?,preview_media_asset_id=?,state=?,version=version+1,completeful_design_id=NULL,completeful_render_id=NULL,completeful_render_url=NULL,completeful_render_status=NULL,updated_at=datetime('now') WHERE id=? AND version=?"
    ).bind(JSON.stringify({ ...placementJson, sides: updated, design: { id: designId, revision: revisionNumber } }),
      JSON.stringify(locations), main.original_media_asset_id, null, null,
      prepared ? "prepared" : "draft", draftId, expected),
    env.DB.prepare(
      "INSERT INTO merch_design_draft_links(draft_id,design_id,design_revision,account_id,applied_by) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM product_studio_drafts WHERE id=? AND version=?) ON CONFLICT(draft_id) DO UPDATE SET design_id=excluded.design_id,design_revision=excluded.design_revision,account_id=excluded.account_id,applied_by=excluded.applied_by,applied_at=datetime('now')"
    ).bind(draftId, designId, revisionNumber, actor.accountId, actor.userId, draftId, expected + 1),
  ]);
  if (!dbResult(results[0])) throw invalid("draft_conflict", "Draft changed during template application", 409);
  return response({ ok: true, draft_id: draftId, design_id: designId,
    design_revision: revisionNumber, print_location_ids: locations,
    status: "draft", needs_preparation: true });
}
function publicMediaUrl(env, row) {
  if (!row?.url) return null;
  if (/^https:\/\//i.test(row.url)) return row.url;
  const domain = String(env.APP_DOMAIN || "").trim();
  const base = domain ? (domain.startsWith("https://") ? domain : "https://" + domain)
    : String(env.ASSET_PUBLIC_BASE_URL || "").trim();
  if (!/^https:\/\//i.test(base)) return null;
  if (!domain && row.r2_key) return base.replace(/\/$/, "") + "/" + row.r2_key.replace(/^\/+/, "");
  return base.replace(/\/$/, "") + "/" + String(row.url).replace(/^\/+/, "");
}
async function syncProvider(env, designId, request, actor) {
  const design = await getDesign(env, designId, actor);
  writable(design, actor);
  const input = await bodyOf(request);
  const slot = text(input.slot, 40);
  const revision = await revisionOf(env, designId, design.current_revision);
  const placement = asJson(revision.placements_json, []).find(p => p.slot === slot);
  if (!placement || !placement.prepared_media_asset_id || !placement.original_media_asset_id)
    throw invalid("artwork_not_prepared", "Prepare the selected print side before syncing", 409);
  const art = await ensureMedia(env, placement.prepared_media_asset_id, true);
  const artUrl = publicMediaUrl(env, art);
  if (!artUrl) throw invalid("artwork_not_public", "Prepared artwork needs a public HTTPS delivery URL", 409);
  const shop = await env.DB.prepare(
    "SELECT completeful_shop_id FROM completeful_shops WHERE is_primary=1 AND is_active=1 LIMIT 1"
  ).first();
  if (!shop?.completeful_shop_id) throw invalid("shop_required", "Select a Completeful shop", 409);
  await validateSupplierArtwork(env, art, input.catalog_product_id, input.print_location_id);
  const previous = await env.DB.prepare(
    "SELECT provider_design_id FROM merch_design_provider_links WHERE design_id=? AND design_revision=? AND provider='completeful' AND shop_id=? AND slot=?"
  ).bind(designId, design.current_revision, shop.completeful_shop_id, slot).first();
  if (previous) return response({ ok: true, reused: true, design_id: designId, provider_design_id: previous.provider_design_id });
  const { data, meta } = await completefulDesigns.create(env, {
    name: design.name + " · " + slot, shop_id: shop.completeful_shop_id,
    artfile_url: artUrl, tags: ["product-studio", designId, slot], collection: "product-studio",
  }, "merch:" + designId + ":r" + design.current_revision + ":" + shop.completeful_shop_id + ":" + slot);
  const providerId = data?.design?.id || data?.id;
  if (!providerId && !meta?.dry_run) throw invalid("provider_design_missing", "Completeful did not return a design ID", 502);
  // A capp_test_ dry-run does not create a persisted provider resource.
  if (!meta.dry_run && providerId) {
    await env.DB.prepare(
      "INSERT INTO merch_design_provider_links (design_id,design_revision,provider,shop_id,slot,provider_design_id) VALUES (?,?,'completeful',?,?,?) ON CONFLICT(design_id,design_revision,provider,shop_id,slot) DO NOTHING"
    ).bind(designId, design.current_revision, shop.completeful_shop_id, slot, providerId).run();
  }
  return response({ ok: true, design_id: designId, provider_design_id: providerId || null,
    dry_run: Boolean(meta?.dry_run), linked: !meta?.dry_run, request_id: meta?.request_id }, meta?.dry_run ? 200 : 201);
}
async function exportProvider(env, designId, request, actor) {
  const design = await getDesign(env, designId, actor);
  writable(design, actor);
  const input = await bodyOf(request);
  const slot = text(input.slot, 40);
  const shop = await env.DB.prepare(
    "SELECT completeful_shop_id FROM completeful_shops WHERE is_primary=1 AND is_active=1 LIMIT 1"
  ).first();
  if (!shop?.completeful_shop_id) throw invalid("shop_required", "Select a Completeful shop", 409);
  const provider = await env.DB.prepare(
    "SELECT provider_design_id FROM merch_design_provider_links WHERE design_id=? AND design_revision=? AND provider='completeful' AND shop_id=? AND slot=?"
  ).bind(designId, design.current_revision, shop.completeful_shop_id, slot).first();
  if (!provider) throw invalid("provider_design_missing", "Sync the print side with Completeful first", 409);
  const format = input.format || "png";
  if (!["json", "png", "jpeg", "svg"].includes(format)) throw invalid("invalid_format", "Unsupported export format");
  const result = await completefulDesigns.export(env, provider.provider_design_id, {
    format, max_size: Math.min(4096, Math.max(128, Number(input.max_size) || 1600)),
  }, "merch-export:" + designId + ":r" + design.current_revision + ":" + slot + ":" + format);
  const exportId = result.data?.export?.id || result.data?.id;
  if (!result.meta.dry_run && exportId) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO merch_design_exports (id,account_id,design_id,design_revision,slot,provider,provider_export_id,format,status) VALUES (?,?,?,? ,?,'completeful',?,?,?)"
    ).bind(crypto.randomUUID(), actor.accountId, designId, design.current_revision, slot, exportId, format,
      result.data?.export?.status || "queued").run();
  }
  return response({ ok: true, ...result.data, dry_run: Boolean(result.meta.dry_run),
    tracked: !result.meta.dry_run && Boolean(exportId) }, result.meta.status === 202 ? 202 : 201);
}
async function exportStatus(env, designId, exportId, actor) {
  await getDesign(env, designId, actor);
  const row = await env.DB.prepare(
    "SELECT * FROM merch_design_exports WHERE account_id=? AND design_id=? AND provider='completeful' AND provider_export_id=?"
  ).bind(actor.accountId, designId, exportId).first();
  if (!row) throw invalid("export_not_found", "Export is not linked to this design", 404);
  const { data, meta } = await completefulDesigns.getExport(env, exportId);
  if (data?.export?.status) {
    await env.DB.prepare("UPDATE merch_design_exports SET status=? WHERE id=?")
      .bind(String(data.export.status), row.id).run();
  }
  return response({ ok: true, ...data, request_id: meta?.request_id });
}
async function validateSupplierArtwork(env, media, catalogId, locationId) {
  const productId = text(catalogId, 120);
  const printLocationId = text(locationId, 120);
  if (!productId || !printLocationId)
    throw invalid("supplier_selection_required", "Select a catalog product and print location");
  const location = await env.DB.prepare(
    "SELECT print_location_id FROM completeful_catalog_print_locations WHERE completeful_product_id=? AND print_location_id=? AND enabled=1"
  ).bind(productId, printLocationId).first();
  if (!location) throw invalid("unknown_print_location", "Supplier print location is not valid for the selected garment", 409);
  const url = publicMediaUrl(env, media);
  if (!url || !url.startsWith("https://")) throw invalid("artwork_not_public", "Artwork requires a public HTTPS delivery URL", 409);
  const { data, meta } = await completefulDesigns.validatePrintFile(env, {
    art_url: url, catalog_product_id: productId, print_location_id: printLocationId,
  });
  if (data?.valid === false || data?.ok === false)
    throw invalid("provider_print_file_rejected", "Completeful rejected this prepared print file", 422);
  return { data, meta };
}
export async function handleCompletefulDesignValidationApi(request, env, user) {
  try {
    const actor = await identity(env, user);
    if (!allowedRole.has(actor.role)) throw invalid("read_only", "Print validation requires edit permission", 403);
    const input = await bodyOf(request);
    const media = await ensureMedia(env, input.media_asset_id, true);
    const result = await validateSupplierArtwork(env, media, input.catalog_product_id, input.print_location_id);
    return response({ ok: true, validation: result.data, request_id: result.meta?.request_id });
  } catch (error) {
    if (error instanceof CompletefulApiError) return response({ ok: false, ...error.toJSON() }, error.status);
    if (error?.status) return response({ ok: false, error: error.message, code: error.code }, error.status);
    console.error("[designs/validate]", error);
    return response({ ok: false, code: "validation_unavailable", error: "Print file validation unavailable" }, 500);
  }
}
export async function handleCompletefulDesignListApi(env, url, user) {
  try {
    const actor = await identity(env, user);
    const shop = await env.DB.prepare(
      "SELECT completeful_shop_id FROM completeful_shops WHERE is_primary=1 AND is_active=1 LIMIT 1"
    ).first();
    if (!shop?.completeful_shop_id) throw invalid("shop_required", "Select a Completeful shop", 409);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
    const result = await completefulDesigns.list(env, {
      shopId: shop.completeful_shop_id,
      search: text(url.searchParams.get("search"), 120),
      limit,
      cursor: text(url.searchParams.get("cursor"), 300) || null,
    });
    return response({ ok: true, provider: "completeful", ...result.data });
  } catch (error) {
    if (error instanceof CompletefulApiError) return response({ ok: false, ...error.toJSON() }, error.status);
    if (error?.status) return response({ ok: false, code: error.code, error: error.message }, error.status);
    console.error("[completeful/designs]", error);
    return response({ ok: false, code: "provider_designs_unavailable", error: "Could not list provider designs" }, 500);
  }
}

export async function handleDesignsAdminApi(request, env, url, user) {
  try {
    const actor = await identity(env, user);
    const path = url.pathname;
    const method = request.method;
    if (path === "/api/admin/designs/from-draft" && method === "POST")
      return await createDesignFromDraft(env, request, actor);
    if (path === "/api/admin/designs") {
      if (method === "GET") return await listDesigns(env, url, actor);
      if (method === "POST") return await createDesign(env, request, actor);
    }
    if (path === "/api/admin/design-collections") {
      if (method === "GET") return await listCollections(env, actor);
      if (method === "POST") return await createCollection(env, request, actor);
    }
    let match = path.match(/^\/api\/admin\/design-collections\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      if (method === "GET") {
        const collection = await getCollection(env, id, actor);
        const { results: items = [] } = await env.DB.prepare(
          "SELECT d.* FROM merch_designs d JOIN merch_design_collection_items i ON i.design_id=d.id WHERE i.collection_id=? AND d.account_id=? AND (d.visibility='team' OR d.owner_user_id=?) AND d.status!='archived' ORDER BY i.added_at DESC"
        ).bind(id, actor.accountId, actor.userId).all();
        return response({ ok: true, collection: collectionRecord(collection),
          designs: items.map(row => record(row)) });
      }
      if (method === "PATCH") return await patchCollection(env, id, request, actor);
      if (method === "DELETE") {
        await getCollection(env, id, actor, true);
        await env.DB.prepare("DELETE FROM merch_design_collections WHERE id=? AND account_id=?")
          .bind(id, actor.accountId).run();
        return response({ ok: true, deleted: id });
      }
    }
    match = path.match(/^\/api\/admin\/designs\/([^/]+)\/collections\/([^/]+)$/);
    if (match && ["PUT", "DELETE"].includes(method))
      return await collectionMembership(env, decodeURIComponent(match[1]), decodeURIComponent(match[2]), method, actor);
    const exportPath = path.match(/^\/api\/admin\/designs\/([^/]+)\/completeful\/exports\/([^/]+)$/);
    if (exportPath && method === "GET")
      return await exportStatus(env, decodeURIComponent(exportPath[1]), decodeURIComponent(exportPath[2]), actor);
    match = path.match(/^\/api\/admin\/designs\/([^/]+)(?:\/(revisions|apply|completeful\/sync|completeful\/exports))?$/);
    if (!match) return response({ ok: false, error: "Unknown Designs endpoint" }, 404);
    const id = decodeURIComponent(match[1]);
    const action = match[2];
    if (action === "apply" && method === "POST") return await applyDesign(env, id, request, actor);
    if (action === "completeful/sync" && method === "POST") return await syncProvider(env, id, request, actor);
    if (action === "completeful/exports" && method === "POST") return await exportProvider(env, id, request, actor);
    if (action === "revisions" && method === "GET") {
      await getDesign(env, id, actor);
      const { results = [] } = await env.DB.prepare(
        "SELECT revision,created_by,created_at FROM merch_design_revisions WHERE design_id=? ORDER BY revision DESC"
      ).bind(id).all();
      return response({ ok: true, design_id: id, revisions: results });
    }
    if (!action && method === "GET") {
      const row = await getDesign(env, id, actor);
      const revisionNumber = url.searchParams.get("revision");
      const revision = await revisionOf(env, id, revisionNumber == null ? row.current_revision : Number(revisionNumber));
      const { results: links = [] } = await env.DB.prepare(
        "SELECT provider,shop_id,slot,provider_design_id,sync_status,design_revision FROM merch_design_provider_links WHERE design_id=?"
      ).bind(id).all();
      const { results: collections = [] } = await env.DB.prepare(
        "SELECT c.id,c.name FROM merch_design_collections c JOIN merch_design_collection_items i ON i.collection_id=c.id WHERE i.design_id=? AND c.account_id=? AND (c.visibility='team' OR c.owner_user_id=?)"
      ).bind(id, actor.accountId, actor.userId).all();
      const { results: products = [] } = await env.DB.prepare(
        "SELECT l.draft_id,l.design_revision,d.product_id,d.title,d.state FROM merch_design_draft_links l JOIN product_studio_drafts d ON d.id=l.draft_id WHERE l.design_id=? AND l.account_id=?"
      ).bind(id, actor.accountId).all();
      return response({ ok: true, design: record(row, revision), viewed_revision: revision.revision,
        collections, provider_links: links, product_links: products });
    }
    if (!action && method === "PATCH") return await patchDesign(env, id, request, actor);
    if (!action && method === "DELETE") {
      const row = await getDesign(env, id, actor);
      writable(row, actor);
      await env.DB.prepare("UPDATE merch_designs SET status='archived',updated_at=datetime('now') WHERE id=? AND account_id=?")
        .bind(id, actor.accountId).run();
      return response({ ok: true, archived: id });
    }
    return response({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof CompletefulApiError) return response({ ok: false, ...error.toJSON() }, error.status);
    if (error?.code && error?.status) return response({ ok: false, error: error.message, code: error.code }, error.status);
    console.error("[designs/admin]", error);
    return response({ ok: false, error: "Design operation failed", code: "designs_internal_error" }, 500);
  }
}
