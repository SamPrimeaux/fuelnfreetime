import test from "node:test";
import assert from "node:assert/strict";
import { __setApplicationAccountId } from "../apps/ecommerce-cms-agentsam/backend/lib/account-context.js";
import { runAgentSamAi } from "../apps/ecommerce-cms-agentsam/backend/agentsam/ai-run.js";

const image64 = "iVBORw0KGgo=";
const accountId = "acct_vision_contract";
const routing = {
  task_type: "image_to_text", lane: "vision", has_image: true,
  image_base64: image64, image_mime_type: "image/png",
  message: "Describe the attached artwork.",
  workflow_key: "fnf_agentsam_chat",
};
function model(provider, supportsVision = 1) {
  return {
    model_id: provider === "openai" ? "gpt-test-vision" : "@cf/test/vision",
    display_name: "Vision test", provider,
    status: "active", task_type: "image_to_text", lane: "vision",
    priority: 1, is_default: 1, is_fallback: 0,
    supports_vision: supportsVision, supports_tools: 0,
    request_defaults_json: "{}", cost_tier: "low",
  };
}
function envFor(row, other = {}) {
  return {
    DB: {
      prepare(sql) {
        return { bind(...args) {
          return {
            async all() {
              if (!sql.includes("FROM agentsam_ai")) return { results: [] };
              assert.equal(args[0], accountId);
              return { results: [row] };
            },
            async first() { return null; },
            async run() { return { success: true, meta: { changes: 1 } }; },
          };
        } };
      },
    },
    ...other,
  };
}

test("OpenAI Responses receives real PNG bytes and user text in one multimodal request", async () => {
  __setApplicationAccountId(accountId);
  const originalFetch = globalThis.fetch;
  let posted;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    posted = JSON.parse(options.body);
    assert.match(options.headers.authorization, /^Bearer /);
    return Response.json({ output_text: "I can see the image." });
  };
  try {
    const result = await runAgentSamAi(envFor(model("openai"), { OPENAI_API_KEY: "local-test-only" }),
      "You can inspect uploaded artwork.", routing.message, routing);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.selected_model, "gpt-test-vision");
    assert.equal(posted.model, "gpt-test-vision");
    const user = posted.input.find(x => x.role === "user");
    assert.deepEqual(user.content, [
      { type: "input_text", text: "Describe the attached artwork." },
      { type: "input_image", image_url: "data:image/png;base64," + image64 },
    ]);
  } finally { globalThis.fetch = originalFetch; __setApplicationAccountId(null); }
});

test("Workers AI vision keeps the same image and prompt in its native message shape", async () => {
  __setApplicationAccountId(accountId);
  let posted;
  const env = envFor(model("workers_ai"), {
    AGENTSAM_WAI: { async run(id, payload) {
      assert.equal(id, "@cf/test/vision");
      posted = payload;
      return { response: "Artwork inspected." };
    } },
  });
  try {
    const result = await runAgentSamAi(env, "Inspect accurately.", routing.message, routing);
    assert.equal(result.ok, true, JSON.stringify(result));
    const user = posted.messages.find(x => x.role === "user");
    assert.deepEqual(user.content, [
      { type: "text", text: "Describe the attached artwork." },
      { type: "image_url", image_url: { url: "data:image/png;base64," + image64 } },
    ]);
  } finally { __setApplicationAccountId(null); }
});

test("missing vision capability never turns an image request into a successful text-only answer", async () => {
  __setApplicationAccountId(accountId);
  let invoked = 0;
  const env = envFor(model("workers_ai", 0), {
    AGENTSAM_WAI: { async run() { invoked++; return { response: "Text-only answer" }; } },
  });
  try {
    const result = await runAgentSamAi(env, "Review the image.", "Check this image", routing);
    assert.equal(result.ok, false);
    assert.equal(invoked, 0);
    assert.match(result.user_reply, /vision support/);
  } finally { __setApplicationAccountId(null); }
});
