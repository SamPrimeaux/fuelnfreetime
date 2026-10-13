import type { JSONSchema } from "json-schema-to-ts";
import { defineTool, type ToolInput } from "../types.ts";

export const modelsInputSchema = {
  type: "object",
  properties: { task_type: { type: "string" }, lane: { type: "string" } },
  additionalProperties: false,
} as const satisfies JSONSchema;
export type ModelsListInput = ToolInput<typeof modelsInputSchema>;

export const agentTools = [
  defineTool({
    id: "agent.models.list", wireName: "agent_models_list",
    capabilityKey: "agentsam.models.read", description: "Read available AgentSam model registry metadata.",
    access: "merchant", risk: "low", handlerKind: "core",
    legacyHandlerKey: "fnf_agentsam_ai_models", legacyAliases: ["fnf_agentsam_ai_models"],
    inputSchema: modelsInputSchema,
  }),
] as const;
