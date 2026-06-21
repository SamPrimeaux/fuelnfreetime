import { verifyResendWebhook } from "../lib/resend.js";

const OUTBOUND_EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
]);

async function logWebhookEvent(env, channel, event) {
  const type = event?.type || "unknown";
  const providerId = event?.data?.email_id || event?.data?.id || null;
  try {
    await env.DB.prepare(
      `INSERT INTO mail_webhook_events (id, channel, event_type, provider_id, payload_json)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        `mwe_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
        channel,
        type,
        providerId,
        JSON.stringify(event)
      )
      .run();
  } catch {
    console.log(`[resend-${channel}]`, type, providerId);
  }
  return { type, providerId };
}

async function applyOutboundEvent(env, event) {
  const type = event?.type;
  const data = event?.data || {};
  const providerId = data.email_id || data.id;
  if (!providerId) return;

  const statusMap = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.failed": "failed",
  };
  const status = statusMap[type];
  if (!status) return;

  await env.DB.prepare(
    `UPDATE mail_messages
     SET status = ?, metadata_json = ?, updated_at = datetime('now')
     WHERE provider_id = ? AND direction = 'outbound'`
  )
    .bind(status, JSON.stringify({ last_event: event }), providerId)
    .run()
    .catch(() => {});
}

async function applyInboundEvent(env, event, apiKey) {
  if (event?.type !== "email.received") return;
  const data = event.data || {};
  const providerId = data.email_id || data.id;
  if (!providerId) return;

  let subject = data.subject || "(no subject)";
  let fromEmail = data.from || "";
  let toEmail = Array.isArray(data.to) ? data.to.join(", ") : data.to || "";
  let bodyText = "";
  let bodyHtml = "";

  if (apiKey && providerId) {
    try {
      const res = await fetch(`https://api.resend.com/emails/receiving/${providerId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const row = await res.json().catch(() => ({}));
      if (res.ok) {
        subject = row.subject || subject;
        fromEmail = row.from || fromEmail;
        toEmail = row.to || toEmail;
        bodyText = row.text || bodyText;
        bodyHtml = row.html || bodyHtml;
      }
    } catch {
      /* metadata-only path is fine */
    }
  }

  const preview = (bodyText || subject || "Inbound message").slice(0, 240);
  await env.DB.prepare(
    `INSERT INTO mail_messages (
       id, direction, from_email, to_email, subject, preview, body_text, body_html,
       status, provider, provider_id, labels_json, metadata_json
     ) VALUES (?, 'inbound', ?, ?, ?, ?, ?, ?, 'received', 'resend', ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  )
    .bind(
      `in_${providerId}`,
      fromEmail,
      toEmail,
      subject,
      preview,
      bodyText,
      bodyHtml,
      providerId,
      JSON.stringify(["inbound", "primary"]),
      JSON.stringify({ source: "resend.inbound", event })
    )
    .run()
    .catch(() => {});
}

export async function handleResendOutboundWebhook(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secret =
    env.RESEND_WEBHOOK_SECRET_OUTBOUND || env.RESEND_WEBHOOK_SECRET || "";
  let event;
  try {
    event = await verifyResendWebhook(request, secret);
  } catch (err) {
    return Response.json({ error: err.message || "Invalid webhook" }, { status: 401 });
  }

  const { type, providerId } = await logWebhookEvent(env, "outbound", event);
  if (OUTBOUND_EVENTS.has(type)) {
    await applyOutboundEvent(env, event);
  }

  return Response.json({ ok: true, channel: "outbound", type, provider_id: providerId });
}

export async function handleResendInboundWebhook(request, env) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const secret = env.RESEND_WEBHOOK_SECRET_INBOUND || "";
  let event;
  try {
    event = await verifyResendWebhook(request, secret);
  } catch (err) {
    return Response.json({ error: err.message || "Invalid webhook" }, { status: 401 });
  }

  const { type, providerId } = await logWebhookEvent(env, "inbound", event);
  if (type === "email.received") {
    await applyInboundEvent(env, event, env.RESEND_API_KEY);
  }

  return Response.json({ ok: true, channel: "inbound", type, provider_id: providerId });
}

/** Legacy single endpoint — treats as outbound. */
export async function handleResendWebhookLegacy(request, env) {
  return handleResendOutboundWebhook(request, env);
}
