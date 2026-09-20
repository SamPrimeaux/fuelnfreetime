// src/webhooks/completeful.js
// Receives signed Completeful webhook deliveries.
// Verification: HMAC-SHA256 over `${t}.${rawBody}`, header `X-Capp-Signature: t=<unix>,v1=<hex>`.
// Secret is never in source — looked up from env by topic (COMPLETEFUL_WEBHOOK_SECRET_<TOPIC>).

const STALE_WINDOW_SECONDS = 5 * 60; // matches Completeful's own docs

function topicToEnvSuffix(topic) {
  return String(topic || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function newEventRowId() {
  return `cwe_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function logCompletefulWebhookEvent(env, {
  eventId,
  shopId = null,
  webhookId = null,
  topic,
  providerCreatedAt = null,
  payload = null,
  processingStatus = "received",
  lastError = null,
}) {
  try {
    await env.DB.prepare(
      `INSERT INTO completeful_webhook_events
         (event_id, completeful_shop_id, completeful_webhook_id, topic, provider_created_at, processing_status, payload_json, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(event_id) DO UPDATE SET
         processing_status = excluded.processing_status,
         last_error = excluded.last_error`
    )
      .bind(
        eventId,
        shopId,
        webhookId,
        topic,
        providerCreatedAt,
        processingStatus,
        payload ? JSON.stringify(payload) : null,
        lastError
      )
      .run();
  } catch (err) {
    // Never let audit logging break webhook processing itself.
    console.log("[completeful-webhook] log insert failed", err?.message || err);
  }
}

async function lookupWebhookId(env, topic) {
  try {
    const row = await env.DB.prepare(
      `SELECT completeful_webhook_id, completeful_shop_id FROM completeful_webhook_subscriptions WHERE topic = ? LIMIT 1`
    )
      .bind(topic)
      .first();
    return row || {};
  } catch {
    return {};
  }
}

export async function handleCompletefulWebhook(request, env) {
  const rawBody = await request.text();

  const sigHeader = request.headers.get("x-capp-signature") || "";
  const [tPart, sigPart] = sigHeader.split(",");
  const t = (tPart || "").replace("t=", "").trim();
  const sig = (sigPart || "").replace("v1=", "").trim();

  if (!t || !sig) {
    return Response.json({ error: "missing signature" }, { status: 400 });
  }

  let event = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const topic = event?.type || "unknown";
  const envSuffix = topicToEnvSuffix(topic);
  const secret = env[`COMPLETEFUL_WEBHOOK_SECRET_${envSuffix}`];

  const fallbackEventId = event?.id || newEventRowId();

  if (!secret) {
    await logCompletefulWebhookEvent(env, {
      eventId: fallbackEventId,
      topic,
      payload: event,
      processingStatus: "failed",
      lastError: `no secret configured for topic (expected COMPLETEFUL_WEBHOOK_SECRET_${envSuffix})`,
    });
    return Response.json({ error: "unknown topic" }, { status: 401 });
  }

  // Staleness check first — cheap, avoids doing crypto work on obviously-replayed requests.
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - Number(t)) > STALE_WINDOW_SECONDS) {
    await logCompletefulWebhookEvent(env, {
      eventId: fallbackEventId,
      topic,
      payload: event,
      processingStatus: "failed",
      lastError: "stale signature timestamp",
    });
    return Response.json({ error: "stale" }, { status: 401 });
  }

  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  if (!timingSafeEqualHex(sig.toLowerCase(), expected.toLowerCase())) {
    await logCompletefulWebhookEvent(env, {
      eventId: fallbackEventId,
      topic,
      payload: event,
      processingStatus: "failed",
      lastError: "signature mismatch",
    });
    return Response.json({ error: "bad signature" }, { status: 401 });
  }

  const { completeful_webhook_id: webhookId, completeful_shop_id: shopId } = await lookupWebhookId(env, topic);

  await logCompletefulWebhookEvent(env, {
    eventId: fallbackEventId,
    shopId: shopId || event?.data?.shop_id || null,
    webhookId: webhookId || null,
    topic,
    providerCreatedAt: event?.created || null,
    payload: event,
    processingStatus: "received",
  });

  // Verified and stored. Topic-specific handling (order sync, product publish
  // callbacks, etc.) is deliberately NOT here yet — this receiver's only job
  // right now is: verify, store, ack fast. Dispatch logic comes with the
  // task that actually needs each topic.
  return new Response(null, { status: 200 });
}
