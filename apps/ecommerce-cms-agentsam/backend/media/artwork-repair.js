/**
 * Production artwork repair: original R2 bytes -> inspected print geometry ->
 * source recovery or non-destructive candidate -> deliberate merchant approval.
 * No CDN-resized image is considered a master and reconstructed pixels are
 * NEVER automatically certified as manufacturing detail.
 */
import decodePng from "@jsquash/png/decode.js";
import decodeWebp from "@jsquash/webp/decode.js";
import decodeJpeg from "@jsquash/jpeg/decode.js";
import encodePng from "@jsquash/png/encode.js";
import { loadSourceImage, saveImageDerivative, editImageWithPrompt } from "./image-operations.js";
import { effectiveArtworkDpi } from "../../packages/agentsam-merch/src/geometry.js";

const MAX_RASTER_PIXELS = 20_000_000;
const MAX_CANDIDATES = 8;
const derivativePattern = /^(?:prepared|placement)-|-(?:ai-edit|resample|print-trim|cutout)\.png$/i;

function parsed(value) {
  if (!value) return {};
  try { return typeof value === "string" ? JSON.parse(value) || {} : value; }
  catch { return {}; }
}

function stem(value) {
  return String(value || "").toLowerCase()
    .replace(/\.[a-z0-9]{2,6}$/i, "")
    .replace(/-(?:ai-edit|resample|print-trim|cutout|background-remove)$/i, "")
    .replace(/[^a-z0-9]+/g, "").slice(0, 100);
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function printIntent(input = {}) {
  const printWidthIn = numeric(input.print_width_in);
  const printHeightIn = numeric(input.print_height_in);
  const targetPpi = numeric(input.target_ppi) || 300;
  if (!printWidthIn || !printHeightIn || printWidthIn > 60 || printHeightIn > 60 ||
      targetPpi < 72 || targetPpi > 1200) throw new Error("invalid_print_geometry");
  return { printWidthIn, printHeightIn, targetPpi };
}

async function decodeSource(source) {
  await (await import("../assets/worker-codecs-wasm.js")).prepareWorkerCodecs();
  const bytes = source.bytes.buffer.slice(source.bytes.byteOffset, source.bytes.byteOffset + source.bytes.byteLength);
  const decoded = source.mime === "image/png" ? await decodePng(bytes)
    : source.mime === "image/webp" ? await decodeWebp(bytes) : await decodeJpeg(bytes);
  if (!decoded?.width || !decoded?.height ||
      decoded.width * decoded.height > MAX_RASTER_PIXELS) throw new Error("source_dimensions_exceed_limit");
  return decoded;
}

export function opaqueCrop(image) {
  const { width, height, data } = image;
  let left = width, top = height, right = -1, bottom = -1;
  // Fully/near-transparent pixels contribute no print detail.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }
  return right < left ? null : { x: left, y: top, width: right-left+1, height: bottom-top+1 };
}

async function verifiedSupplierRequirement(env, intent = {}) {
  const productId = String(intent.catalog_product_id || "").trim();
  const locationId = String(intent.print_location_id || "").trim();
  if (!productId || !locationId) return null;
  const row = await env.DB.prepare(
    `SELECT * FROM completeful_catalog_print_locations
       WHERE completeful_product_id = ? AND print_location_id = ? AND enabled = 1 LIMIT 1`,
  ).bind(productId, locationId).first();
  if (!row) return null;
  const raw = parsed(row.raw_json);
  const requiredFormat = raw.required_format || raw.file_format || raw.production_format;
  const supplierPpi = numeric(row.dpi);
  // This is a declared supplier target, not proof of an approved SKU file.
  return { ppi: supplierPpi, format: requiredFormat || null,
    status: supplierPpi && requiredFormat ? "supplier_declared" : "supplier_profile_incomplete" };
}

export function inspectDecodedArtwork(image, intent, provenance = {}, supplier = null) {
  const crop = opaqueCrop(image);
  if (!crop) return { status: "empty_artwork", source_px: { width: image.width, height: image.height },
    crop: null, effective_ppi: null, recommendation: "replace_empty_source", production_ready: false };
  const geometry = effectiveArtworkDpi({
    sourceWidthPx: image.width, sourceHeightPx: image.height,
    cropWidthPx: crop.width, cropHeightPx: crop.height,
    printWidthIn: intent.printWidthIn, printHeightIn: intent.printHeightIn,
    placementWidthPercent: 100,
  });
  const targetPpi = supplier?.ppi || intent.targetPpi;
  const needsDetail = !geometry || geometry.exactDpi < targetPpi;
  const transformed = Boolean(provenance.is_ai_reconstruction || provenance.is_resample);
  const profileComplete = Boolean(supplier?.status === "supplier_declared");
  return {
    status: needsDetail ? "needs_detail" : transformed ? "visual_review_required"
      : profileComplete ? "supplier_resolution_check_passed" : "guideline_met",
    source_px: { width: image.width, height: image.height },
    crop, effective_ppi: geometry?.exactDpi ?? null,
    print_inches: { width: intent.printWidthIn, height: geometry?.printedHeightIn ?? null },
    target_ppi: targetPpi, target_source: supplier?.ppi ? "supplier_declared" : "studio_guideline",
    required_active_px: { width: Math.ceil(intent.printWidthIn * targetPpi),
      height: Math.ceil((geometry?.printedHeightIn || intent.printHeightIn) * targetPpi) },
    recovered_detail_verified: !transformed, requires_visual_review: transformed,
    production_ready: false, // PPI alone can never certify manufacturing acceptance.
    recommendation: needsDetail ? "find_sharper_master_or_reconstruct_for_review" :
      transformed ? "compare_original_before_using" : "check_supplier_profile_and_export",
  };
}

async function relatedMasters(env, source, intent, supplier) {
  const parentId = Number(parsed(source.row.meta_json)?.media_edit?.source_media_asset_id || 0);
  const rootStem = stem(source.row.filename);
  const raw = rootStem ? String(source.row.filename || "").replace(/\.[^.]+$/, "").slice(0, 35) : "";
  const results = [];
  const seen = new Set([Number(source.row.id)]);
  if (parentId > 0 && parentId !== Number(source.row.id)) {
    try {
      const parent = await loadSourceImage(env, parentId);
      seen.add(parentId);
      const image = await decodeSource(parent);
      results.push({ asset: { id: parent.row.id, filename: parent.row.filename,
        url: "/media/" + parent.row.r2_key },
        relation: "original_source", assessment: inspectDecodedArtwork(image, intent, {
          is_resample: String(parent.row.r2_key || "").includes("/resample/"),
        }, supplier) });
    } catch { /* Missing source remains explicit; do not invent a recovery. */ }
  }
  if (raw.length < 3) return results;
  const prefix = raw.slice(0, 24).replace(/[\\%_]/g, "");
  const query = await env.DB.prepare(
    `SELECT id,filename,r2_key,content_type,meta_json FROM media_assets
      WHERE lower(filename) LIKE lower(?) AND id != ? ORDER BY id DESC LIMIT 30`,
  ).bind(prefix + "%", Number(source.row.id)).all();
  for (const row of query.results || []) {
    if (results.length >= MAX_CANDIDATES) break;
    if (seen.has(Number(row.id)) || stem(row.filename) !== rootStem ||
        derivativePattern.test(String(row.filename)) ||
        String(row.r2_key || "").startsWith("derivatives/")) continue;
    seen.add(Number(row.id));
    try {
      const candidate = await loadSourceImage(env, row.id);
      const image = await decodeSource(candidate);
      results.push({ asset: { id: row.id, filename: row.filename,
        url: "/media/" + row.r2_key },
        relation: "matching_library_master",
        assessment: inspectDecodedArtwork(image, intent, {}, supplier) });
    } catch { /* Skip corrupt/unavailable candidates; never claim they're originals. */ }
  }
  return results.sort((a,b) => (b.assessment.effective_ppi || 0) - (a.assessment.effective_ppi || 0));
}

export async function inspectArtworkRepair(env, mediaAssetId, input) {
  const intent = printIntent(input);
  const source = await loadSourceImage(env, mediaAssetId); // bytes from R2 original, never delivery URL
  const image = await decodeSource(source);
  const meta = parsed(source.row.meta_json);
  const operation = String(meta.media_edit?.operation || "");
  const supplier = await verifiedSupplierRequirement(env, input);
  const assessment = inspectDecodedArtwork(image, intent, {
    is_ai_reconstruction: operation === "ai-reconstruct" || operation === "ai-edit",
    is_resample: operation === "resample",
  }, supplier);
  const masters = await relatedMasters(env, source, intent, supplier);
  return { ok: true, source_preserved: true,
    source: { id: source.row.id, filename: source.row.filename,
      url: "/media/" + source.row.r2_key, bytes: source.bytes.length },
    assessment, supplier, candidates: masters,
    available_actions: {
      recover_master: masters.length > 0,
      trim_transparent: Boolean(assessment.crop &&
        (assessment.crop.x || assessment.crop.y ||
         assessment.crop.width !== image.width || assessment.crop.height !== image.height)),
      remove_background: Boolean(env.IMAGES?.input),
      reconstruct: Boolean(env.OPENAI_API_KEY),
    },
    limitation: "A source-size calculation cannot certify print quality; AI reconstruction requires side-by-side visual approval.",
  };
}

export async function repairArtworkCandidate(env, mediaAssetId, input, actorId) {
  if (!actorId) throw new Error("actor_required");
  const method = String(input?.method || "");
  const allowed = new Set(["trim_transparent", "remove_background", "reconstruct", "recover_master"]);
  if (!allowed.has(method)) throw new Error("invalid_repair_method");
  const inspection = await inspectArtworkRepair(env, mediaAssetId, input);
  if (method === "recover_master") {
    const id = Number(input.candidate_media_asset_id);
    const found = inspection.candidates.find(c=>Number(c.asset.id)===id);
    if (!found) throw new Error("candidate_not_related_to_source");
    return { ok: true, method, source_preserved: true, candidate: found.asset,
      assessment: found.assessment, requires_visual_review: false,
      applied: false };
  }
  let result;
  if (method === "remove_background") {
    if (!env.IMAGES?.input) throw new Error("segmentation_provider_not_configured");
    const { removeMediaBackground } = await import("../admin/media-background.js");
    const response = await removeMediaBackground(
      new Request("https://local/api/admin/media/background", { method:"POST" }),
      env, String(mediaAssetId), { id: actorId },
    );
    const data = await response.json();
    if (!response.ok || !data.asset) throw new Error(data.code || data.error || "segmentation_failed");
    result = { asset: data.asset };
  } else if (method === "reconstruct") {
    if (input.confirm_changes !== true) throw new Error("reconstruction_approval_required");
    const prompt = "Faithfully reconstruct and refine the supplied artwork as a clean professional print master. Preserve all logos, words, spelling, shapes, composition, color relationships, and identity. Do not invent or modify text, add new objects, alter design, crop elements, or add a watermark. Restore edges and remove compression artifacts. Return a transparent PNG if the source has transparency. Any reconstructed letter or detail must be visually checked by the merchant.";
    const response = await editImageWithPrompt(env, {
      media_asset_id: Number(mediaAssetId), model_id: input.model_id,
      prompt, actor_id: actorId,
    });
    result = response;
  } else {
    const source = await loadSourceImage(env, mediaAssetId);
    const img = await decodeSource(source);
    const crop = opaqueCrop(img);
    if (!crop) throw new Error("empty_artwork");
    if (crop.width === img.width && crop.height === img.height) throw new Error("already_tightly_cropped");
    const data = new Uint8ClampedArray(crop.width * crop.height * 4);
    for (let y = 0; y < crop.height; y++) {
      const start = ((crop.y + y) * img.width + crop.x) * 4;
      data.set(img.data.subarray(start,start+crop.width*4),y*crop.width*4);
    }
    const output = new Uint8Array(await encodePng({ data, width: crop.width, height: crop.height }));
    const asset = await saveImageDerivative(env, source.row, output, {
      kind: "print-trim", actorId, metadata: {
        crop, quality_claim:"original_pixels_preserved_no_detail_added", print_ready:false,
      },
    });
    result = { asset };
  }
  const resultInspection = await inspectArtworkRepair(env, result.asset.id, input);
  return { ok: true, method, source_preserved: true, applied: false,
    candidate: result.asset, assessment: resultInspection.assessment,
    requires_visual_review: method === "reconstruct" || method === "remove_background",
    original_assessment: inspection.assessment,
    message: "Candidate saved separately; visually compare before selecting it. No supplier approval was issued.",
  };
}
