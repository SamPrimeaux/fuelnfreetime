import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as attachments from "../apps/ecommerce-cms-agentsam/backend/agentsam/attachments.js";

test("attachment helpers do not synthesize user prompts", () => {
  assert.equal("defaultMessageForAttachments" in attachments, false);
});

test("AgentSam UI does not invent attachment-only user speech or auto-send quick actions", async () => {
  const src = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/agentsam-page.js", import.meta.url),
    "utf8",
  );
  assert.equal(src.includes('message || "Review attached file(s)."'), false);
  assert.equal(src.includes('sendMessage(action.prompt || "", action)'), false);
  assert.ok(src.includes("input.value = action.prompt"));
});

test("attachment-only image routing uses vision without synthetic user text", async () => {
  const { resolveAIRouting } = await import(
    "../apps/ecommerce-cms-agentsam/backend/agentsam/ai-registry.js"
  );
  const routing = resolveAIRouting(
    { intent: "general", workflow_key: "fnf_agentsam_chat" },
    "",
    {
      attachments: [
        {
          name: "photo.webp",
          kind: "image",
          url: "/media/uploads/photo.webp",
        },
      ],
    },
  );
  assert.equal(routing.task_type, "image_to_text");
  assert.equal(routing.lane, "vision");
  assert.equal(routing.message, "");
});
