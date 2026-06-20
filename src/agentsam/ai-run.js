/**
 * Workers AI runner with model fallbacks (llama-3.1-8b-instruct retired).
 */

const MODEL_FALLBACKS = [
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fp8",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
];

const MAX_SYSTEM_CHARS = 12000;

function extractReply(result) {
  if (!result) return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.content === "string") return result.content;
  if (Array.isArray(result.messages)) {
    const last = result.messages[result.messages.length - 1];
    if (last?.content) return String(last.content);
  }
  if (result.result?.response) return String(result.result.response);
  return "";
}

function trimSystem(text) {
  const s = String(text || "");
  if (s.length <= MAX_SYSTEM_CHARS) return s;
  return `${s.slice(0, MAX_SYSTEM_CHARS)}\n\n[context truncated]`;
}

export async function runAgentSamAi(env, systemPrompt, userMessage) {
  if (!env.AGENTSAM_WAI) {
    return { ok: false, stub: true, error: "AGENTSAM_WAI not bound" };
  }

  const system = trimSystem(systemPrompt);
  const user = String(userMessage || "").slice(0, 4000);
  let lastError = null;

  for (const model of MODEL_FALLBACKS) {
    try {
      const result = await env.AGENTSAM_WAI.run(model, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 1024,
      });

      const reply = extractReply(result).trim();
      if (reply) return { ok: true, reply, model };
      lastError = new Error("empty_response");
    } catch (err) {
      lastError = err;
      console.error("agentsam ai model failed", model, err?.message || err);
    }
  }

  return {
    ok: false,
    error: lastError?.message || "all_models_failed",
    detail: String(lastError || ""),
  };
}

export { MODEL_FALLBACKS as AGENTSAM_MODELS };
