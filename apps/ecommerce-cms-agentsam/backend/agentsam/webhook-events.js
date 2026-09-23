import { FNF_TENANT_ID, FNF_WORKSPACE_ID } from "./constants.js";

/** Registry row IDs from agentsam_webhooks (db/seed-agentsam-fnf-hooks-webhooks-v2.sql). */
export const WEBHOOK_ENDPOINT_IDS = {
  resend_inbound: "awh_resend_inbound",
  resend_outbound: "awh_resend_outbound",
  resend_legacy: "awh_resend_events",
};

function newRowId() {
  return `whe_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function pickWebhookHeaders(request) {
  const keys = [
    "svix-id",
    "svix-timestamp",
    "svix-signature",
    "content-type",
    "user-agent",
  ];
  const out = {};
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value) out[key] = value;
  }
  return out;
}

export function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

export function resendEventMeta(event) {
  const eventType = event?.type || "unknown";
  const eventId = event?.data?.email_id || event?.data?.id || null;
  return { eventType, eventId };
}

export async function insertAgentSamWebhookEvent(env, {
  endpointId,
  provider,
  eventType,
  eventId = null,
  payload = null,
  headers = null,
  metadata = {},
  status = "received",
  signatureValid = true,
  ipAddress = null,
  errorMessage = null,
  processingError = null,
}) {
  const id = newRowId();
  const receivedAt = Math.floor(Date.now() / 1000);
  const processedAt =
    status === "processed" || status === "failed" || status === "ignored"
      ? receivedAt
      : null;

  try {
    await env.DB.prepare(
      `INSERT INTO agentsam_webhook_events (
         id, tenant_id, workspace_id, endpoint_id, provider, event_type, event_id,
         payload_json, headers_json, metadata_json, status, signature_valid, ip_address,
         error_message, processing_error, received_at_unix, processed_at_unix
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        FNF_TENANT_ID,
        FNF_WORKSPACE_ID,
        endpointId || null,
        provider,
        eventType,
        eventId,
        payload != null ? JSON.stringify(payload) : null,
        headers != null ? JSON.stringify(headers) : null,
        JSON.stringify(metadata),
        status,
        signatureValid ? 1 : 0,
        ipAddress,
        errorMessage,
        processingError,
        receivedAt,
        processedAt
      )
      .run();
    return id;
  } catch (err) {
    console.error("[agentsam_webhook_events] insert failed", err?.message || err);
    return null;
  }
}

export async function updateAgentSamWebhookEvent(env, id, {
  status,
  errorMessage = null,
  processingError = null,
  metadata = null,
}) {
  if (!id) return;

  const processedAt = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare(
      `UPDATE agentsam_webhook_events
       SET status = ?,
           error_message = COALESCE(?, error_message),
           processing_error = COALESCE(?, processing_error),
           metadata_json = CASE WHEN ? IS NOT NULL THEN ? ELSE metadata_json END,
           processed_at_unix = ?
       WHERE id = ?`
    )
      .bind(
        status,
        errorMessage,
        processingError,
        metadata != null ? 1 : null,
        metadata != null ? JSON.stringify(metadata) : null,
        processedAt,
        id
      )
      .run();
  } catch (err) {
    console.error("[agentsam_webhook_events] update failed", err?.message || err);
  }
}
