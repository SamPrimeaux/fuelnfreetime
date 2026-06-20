/**
 * Workers AI runner — D1 registry model selection with safe emergency fallbacks.
 */

import { trackAgentSamEvent, estimateCostUsd, estimateTokens } from "./analytics.js";
import {
  getFallbackChain,
  normalizeChatRouting,
} from "./ai-registry.js";

const MAX_SYSTEM_CHARS = 12000;

function parseJson(raw, fallback = null) {
  try {
    if (raw == null || raw === "") return fallback;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
}

function extractReply(result) {
  if (!result) return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.content === "string") return result.content;
  if (typeof result.text === "string") return result.text;
  if (Array.isArray(result.messages)) {
    const last = result.messages[result.messages.length - 1];
    if (last?.content) return String(last.content);
  }
  if (result.result?.response) return String(result.result.response);
  if (typeof result.description === "string") return result.description;
  return "";
}

function trimSystem(text) {
  const s = String(text || "");
  if (s.length <= MAX_SYSTEM_CHARS) return s;
  return `${s.slice(0, MAX_SYSTEM_CHARS)}\n\n[context truncated]`;
}

function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!u8.length) return "";
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function normalizeImageBytes(result) {
  if (!result) return null;
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  if (result instanceof Uint8Array) return result;
  if (result instanceof ReadableStream) return null;
  if (result?.image instanceof Uint8Array) return result.image;
  if (result?.image instanceof ArrayBuffer) return new Uint8Array(result.image);
  if (Array.isArray(result) && result[0]?.image) {
    const img = result[0].image;
    return img instanceof Uint8Array ? img : new Uint8Array(img);
  }
  return null;
}

async function executeModel(env, model, systemPrompt, userMessage, routing) {
  const defaults =
    model.request_defaults ||
    parseJson(model.request_defaults_json, {}) ||
    {};
  const taskType = model.task_type || routing.task_type;
  const user = String(userMessage || "").slice(0, 4000);

  if (taskType === "image_generation") {
    const result = await env.AGENTSAM_WAI.run(model.model_id, {
      prompt: user,
      ...defaults,
    });
    const bytes = normalizeImageBytes(result);
    if (bytes?.length) {
      return {
        reply:
          "Generated an image from your prompt. Preview is attached in the response metadata.",
        image_base64: bytesToBase64(bytes),
        mime_type: "image/png",
      };
    }
    const text = extractReply(result).trim();
    if (text) return { reply: text };
    throw new Error("empty_image_response");
  }

  if (taskType === "image_to_text") {
    const image = routing.image_base64 || routing.image_url;
    if (!image) throw new Error("vision_requires_image");

    const payload = {
      messages: [
        { role: "system", content: trimSystem(systemPrompt) },
        { role: "user", content: user },
      ],
      max_tokens: defaults.max_tokens || 1200,
      ...defaults,
    };

    if (routing.image_base64) {
      payload.image = routing.image_base64;
    } else {
      payload.image = { url: routing.image_url };
    }

    const result = await env.AGENTSAM_WAI.run(model.model_id, payload);
    const reply = extractReply(result).trim();
    if (reply) return { reply };
    throw new Error("empty_vision_response");
  }

  const result = await env.AGENTSAM_WAI.run(model.model_id, {
    messages: [
      { role: "system", content: trimSystem(systemPrompt) },
      { role: "user", content: user },
    ],
    max_tokens: defaults.max_tokens || 1024,
    ...defaults,
  });

  const reply = extractReply(result).trim();
  if (reply) return { reply };
  throw new Error("empty_response");
}

function analyticsBase(routing) {
  const ctx = routing.analytics || {};
  return {
    ctx: ctx.execution_ctx,
    session_id: ctx.session_id,
    conversation_id: ctx.conversation_id,
    message_id: ctx.message_id,
    run_id: ctx.run_id,
    workflow_key: ctx.workflow_key || routing.workflow_key,
    workflow_id: ctx.workflow_id,
    user_id: ctx.user_id,
    admin_user_id: ctx.admin_user_id,
    user_email: ctx.user_email,
    intent: routing.intent || ctx.intent,
    task_type: routing.task_type,
  };
}

export async function runAgentSamAi(env, systemPrompt, userMessage, routing = {}) {
  if (!env.AGENTSAM_WAI) {
    return { ok: false, stub: true, error: "AGENTSAM_WAI not bound" };
  }

  const normalized = normalizeChatRouting(routing);
  const chain = await getFallbackChain(env, normalized);
  const attemptedModels = [];
  let selectedModel = null;
  let lastError = null;
  let fallbackUsed = false;
  const aiStarted = Date.now();
  const trackOpts = analyticsBase(routing);

  for (let index = 0; index < chain.length; index += 1) {
    const model = chain[index];
    const started = Date.now();

    try {
      const output = await executeModel(
        env,
        model,
        systemPrompt,
        userMessage,
        normalized
      );

      if (!output?.reply && !output?.image_base64) {
        throw new Error("empty_response");
      }

      if (index > 0) fallbackUsed = true;
      selectedModel = model;

      const durationMs = Date.now() - started;
      attemptedModels.push({
        model_id: model.model_id,
        display_name: model.display_name || model.model_id,
        lane: model.lane,
        task_type: model.task_type,
        index,
        ok: true,
        duration_ms: durationMs,
        emergency: !!model.emergency,
      });

      const inputTokens = estimateTokens(userMessage) + estimateTokens(systemPrompt);
      const outputTokens = estimateTokens(output.reply);
      const aiLatencyMs = Date.now() - aiStarted;
      const costTier = model.cost_tier || "unknown";
      const estimatedCostUsd = estimateCostUsd(inputTokens, outputTokens, costTier);

      await trackAgentSamEvent(
        env,
        {
          event_type: "ai_model",
          event_name: "model_selected",
          status: "success",
          provider: "workers_ai",
          model_id: model.model_id,
          model_lane: model.lane,
          task_type: normalized.task_type,
          fallback_used: fallbackUsed,
          fallback_attempt_index: index,
          attempted_models: attemptedModels,
          ai_latency_ms: durationMs,
          metadata: { emergency: !!model.emergency, registry: !model.emergency },
        },
        trackOpts
      );

      return {
        ok: true,
        reply: output.reply,
        image_base64: output.image_base64 || null,
        mime_type: output.mime_type || null,
        model: model.model_id,
        selected_model: model.model_id,
        model_lane: model.lane,
        task_type: normalized.task_type,
        auxiliary_task_type: normalized.auxiliary_task_type || null,
        attempted_models: attemptedModels,
        fallback_used: fallbackUsed,
        registry: !model.emergency,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        estimated_cost_usd: estimatedCostUsd,
        ai_latency_ms: aiLatencyMs,
        cost_tier: costTier,
      };
    } catch (err) {
      lastError = err;
      const durationMs = Date.now() - started;
      attemptedModels.push({
        model_id: model.model_id,
        display_name: model.display_name || model.model_id,
        lane: model.lane,
        task_type: model.task_type,
        index,
        ok: false,
        error: err?.message || String(err),
        duration_ms: durationMs,
        emergency: !!model.emergency,
      });

      await trackAgentSamEvent(
        env,
        {
          event_type: "ai_model",
          event_name: "model_fallback",
          status: "fallback",
          provider: "workers_ai",
          model_id: model.model_id,
          model_lane: model.lane,
          task_type: normalized.task_type,
          fallback_used: 1,
          fallback_attempt_index: index,
          error_code: err?.message || "model_failed",
          error_message: err?.message || String(err),
          error_stage: "ai_run",
          ai_latency_ms: durationMs,
          attempted_models: attemptedModels,
        },
        trackOpts
      );

      console.error(
        "agentsam ai model failed",
        model.model_id,
        err?.message || err
      );
    }
  }

  return {
    ok: false,
    error: lastError?.message || "all_models_failed",
    selected_model: selectedModel?.model_id || null,
    model_lane: normalized.lane,
    task_type: normalized.task_type,
    attempted_models: attemptedModels,
    fallback_used: attemptedModels.length > 1,
    ai_latency_ms: Date.now() - aiStarted,
  };
}
