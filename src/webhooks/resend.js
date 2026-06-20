import { verifyResendWebhook } from "../lib/resend.js";

/**
 * POST /api/agentsam/webhooks/resend
 * Resend delivery / bounce / inbound metadata events (Svix-signed).
 */
export async function handleResendWebhook(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let event;
  try {
    event = await verifyResendWebhook(request, env.RESEND_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: err.message || "Invalid webhook" }, { status: 401 });
  }

  const type = event?.type || "unknown";
  const emailId = event?.data?.email_id || event?.data?.id || null;

  try {
    await env.DB.prepare(
      `INSERT INTO agentsam_webhook_events (
         id, tenant_id, endpoint_id, provider, event_type, event_id, payload_json, status, signature_valid
       ) VALUES (?, 'tenant_fuelnfreetime', 'awh_resend_events', 'resend', ?, ?, ?, 'received', 1)`
    )
      .bind(
        `rwh_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
        type,
        emailId || request.headers.get("svix-id"),
        JSON.stringify(event)
      )
      .run();
  } catch {
    console.log("[resend-webhook]", type, emailId);
  }

  return Response.json({ ok: true, type });
}
