/**
 * PLANNED media / merch tools. NOT registered.
 *
 * #UNFINISHEDTOOLS (tkt_13207989954e4171, docs/AGENTSAM_MERCH_AND_TOOLS_AUDIT_20261015.md)
 *
 * These are declared here, not in media.ts / commerce.ts, because backend/tools/doctor.mjs fails the
 * gate for any registered tool that has no executor. When an executor exists, move the entry into the
 * matching pack with defineTool(...) and add its key to the executable set so doctor passes.
 *
 * This file deliberately does not import defineTool/ToolInput so it cannot affect the registry types.
 */
import type { JSONSchema } from "json-schema-to-ts";

export interface PlannedTool {
  id: string;
  wireName: string;
  capabilityKey: string;
  description: string;
  risk: "low" | "medium" | "high";
  /** Where the executor should live once built. */
  executor: string;
  /** What must exist before this can be registered. */
  blockedBy: readonly string[];
  inputSchema: JSONSchema;
}

const imageRef = {
  type: "object",
  properties: { media_asset_id: { type: "integer", minimum: 1 }, image_url: { type: "string" } },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const plannedMediaTools: readonly PlannedTool[] = [
  {
    id: "media.image.generate", wireName: "media_image_generate", capabilityKey: "media.image.generate",
    description: "Generate 1-4 candidate artwork images and register them as studio artwork.",
    risk: "low", executor: "backend/agentsam/image-tools.js (to create); replaces ai-run.js hardcoded gpt-image-2 1024x1024 path",
    blockedBy: ["honor size/quality/background/variations/format", "provider chain (openai | google | workers_ai) from agentsam_ai registry"],
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", minLength: 1, maxLength: 1000 },
        background: { type: "string", enum: ["transparent", "white"] },
        size: { type: "string", enum: ["auto", "square", "landscape", "portrait"] },
        quality: { type: "string", enum: ["auto", "high", "medium", "low"] },
        variations: { type: "integer", minimum: 1, maximum: 4, default: 1 },
        format: { type: "string", enum: ["png", "webp", "jpg"] },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    id: "media.image.edit", wireName: "media_image_edit", capabilityKey: "media.image.edit",
    description: "Edit an existing studio artwork with an instruction; saves a new derivative, never overwrites the original.",
    risk: "low", executor: "backend/agentsam/image-tools.js (to create)",
    blockedBy: ["image edit provider (OpenAI /v1/images/edits or platform imgx_edit_image, currently is_active=0 in IAM D1)", "derivative registration in media_assets"],
    inputSchema: {
      type: "object",
      properties: { ...imageRef.properties, prompt: { type: "string", minLength: 1 }, quality: { type: "string", enum: ["auto", "high", "medium", "low"] } },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    id: "media.image.background.remove", wireName: "media_image_background_remove", capabilityKey: "media.image.background.remove",
    description: "Remove the background from an artwork (CF Images segmentation) and save a cutout derivative.",
    risk: "low", executor: "wrap backend/admin/media-background.js removeMediaBackground (exists, HTTP-only today)",
    blockedBy: ["agent-callable wrapper that resolves the actor"],
    inputSchema: { type: "object", properties: { media_asset_id: { type: "integer", minimum: 1 } }, required: ["media_asset_id"], additionalProperties: false },
  },
  {
    id: "media.image.upscale", wireName: "media_image_upscale", capabilityKey: "media.image.upscale",
    description: "Upscale low-resolution artwork to meet a manufacturing profile's effective PPI; saves a derivative.",
    risk: "low", executor: "unknown: provider not chosen",
    blockedBy: ["upscale provider (not found in FNF or IAM registries)", "agentsam-merch executor to decide when upscaling is acceptable vs replace_with_higher_resolution_master"],
    inputSchema: {
      type: "object",
      properties: { ...imageRef.properties, scale: { type: "integer", enum: [2, 4], default: 2 } },
      additionalProperties: false,
    },
  },
  {
    id: "commerce.artwork.preflight", wireName: "commerce_artwork_preflight", capabilityKey: "commerce.artwork.preflight",
    description: "Evaluate artwork against the manufacturing profile for a catalog product + print location.",
    risk: "low", executor: "packages/agentsam-merch evaluateManufacturingCompatibility (exists, pure)",
    blockedBy: ["provider-derived profiles (buildProfileFromPrintLocation)", "tool wrapper that loads asset + print location from D1"],
    inputSchema: {
      type: "object",
      properties: { media_asset_id: { type: "integer", minimum: 1 }, catalog_product_id: { type: "string" }, print_location_id: { type: "string" }, scale_percent: { type: "number", minimum: 5, maximum: 150 } },
      required: ["media_asset_id", "catalog_product_id", "print_location_id"],
      additionalProperties: false,
    },
  },
  {
    id: "commerce.artwork.prepare", wireName: "commerce_artwork_prepare", capabilityKey: "commerce.artwork.prepare",
    description: "Produce the manufacturing derivative (trim, place, convert) and prove it passes preflight.",
    risk: "medium", executor: "agentsam-merch createArtworkPreparer (to create); runtimes browser canvas | Worker env.IMAGES/jSquash | Node sharp",
    blockedBy: ["artwork-prep executor", "computePlacement", "derivative registration"],
    inputSchema: {
      type: "object",
      properties: {
        media_asset_id: { type: "integer", minimum: 1 }, catalog_product_id: { type: "string" }, print_location_id: { type: "string" },
        placement: { type: "object", additionalProperties: true },
      },
      required: ["media_asset_id", "catalog_product_id", "print_location_id"],
      additionalProperties: false,
    },
  },
  {
    id: "commerce.mockup.render", wireName: "commerce_mockup_render", capabilityKey: "commerce.mockup.render",
    description: "Render artwork on every selected color/side via Completeful mockups and store tagged results.",
    risk: "medium", executor: "backend/completeful/mockups.js (to create; logic currently inline in admin/product-studio.js renderDraft)",
    blockedBy: ["per-color loop (resolveMockup uses variants[0] only)", "persist media with meta_json.variant_color", "tkt_a6482217d8ca4be4"],
    inputSchema: {
      type: "object",
      properties: { draft_id: { type: "string" }, colors: { type: "array", items: { type: "string" } }, print_location_ids: { type: "array", items: { type: "string" } } },
      required: ["draft_id"],
      additionalProperties: false,
    },
  },
] as const;
