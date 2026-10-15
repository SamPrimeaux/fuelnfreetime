import type { JSONSchema } from "json-schema-to-ts";
import { defineTool, type ToolInput } from "../types.ts";

export const mediaLibraryInputSchema = {
  type: "object",
  properties: {
    folder: { type: "string" }, q: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 40 },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
export type MediaLibraryInput = ToolInput<typeof mediaLibraryInputSchema>;

export const semanticSearchInputSchema = {
  type: "object",
  properties: {
    query: { type: "string", minLength: 1 },
    source_type: { type: "string", enum: ["product", "cms", "skill", "repo", "brand"] },
    top_k: { type: "integer", minimum: 1, maximum: 100, default: 8 },
  },
  required: ["query"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export type SemanticSearchInput = ToolInput<typeof semanticSearchInputSchema>;

// #UNFINISHEDTOOLS: only media.library.list and search.semantic are registered. The image/merch tools
// (generate, edit, background.remove, upscale, artwork preflight/prepare, mockup render) are declared in
// ./media.planned.ts and must be moved here with defineTool(...) once each has an executor, because
// backend/tools/doctor.mjs fails the gate for a registered tool with no handler.
// Audit: docs/AGENTSAM_MERCH_AND_TOOLS_AUDIT_20261015.md (F4). Tracked: tkt_13207989954e4171.
export const mediaTools = [
  defineTool({
    id: "media.library.list", wireName: "media_library_list",
    capabilityKey: "media.library.read", description: "Browse assets registered to the authorized merchant.",
    access: "merchant", risk: "low", handlerKind: "core",
    legacyHandlerKey: "fnf_media_library_list", legacyAliases: ["fnf_media_library_list"],
    inputSchema: mediaLibraryInputSchema,
  }),
  defineTool({
    id: "search.semantic", wireName: "search_semantic",
    capabilityKey: "retrieval.semantic.search", description: "Search merchant-authorized indexed content.",
    access: "merchant", risk: "low", handlerKind: "vectorize",
    legacyHandlerKey: "fnf_semantic_search", legacyAliases: ["fnf_semantic_search"],
    inputSchema: semanticSearchInputSchema,
  }),
] as const;
