import { verifyResendWebhookPayload, fetchReceivedEmail } from "../lib/resend.js";
import { listMailboxes } from "../lib/mail-mailboxes.js";
import {
  WEBHOOK_ENDPOINT_IDS,
  clientIp,
  insertAgentSamWebhookEvent,
  pickWebhookHeaders,
  resendEventMeta,
  updateAgentSamWebhookEvent,
} from "../agentsam/webhook-events.js";

const OUTBOUND_EVENTS = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.opened",
  "email.clicked",
]);

async function logMailWebhookEvent(env, channel, event) {
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

function normalizeAddress(value) {
  if (Array.isArray(value)) return value.map((v) => normalizeAddress(v)).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    if (typeof value.email === "string") return value.email.trim();
    if (typeof value.address === "string") return value.address.trim();
  }
  return String(value || "").trim();
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
    "email.opened": "opened",
    "email.clicked": "clicked",
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
  let fromEmail = normalizeAddress(data.from);
  let toEmail = normalizeAddress(data.to);
  let bodyText = "";
  let bodyHtml = "";

  if (apiKey && providerId) {
    const received = await fetchReceivedEmail(env, providerId);
    if (received.ok) {
      subject = received.subject || subject;
      fromEmail = normalizeAddress(received.from) || fromEmail;
      toEmail = normalizeAddress(received.to) || toEmail;
      bodyText = received.text || bodyText;
      bodyHtml = received.html || bodyHtml;
    }
  }

  const preview = (bodyText || subject || "Inbound message").slice(0, 240);
  const mailboxes = await listMailboxes(env).catch(() => []);
  const toHaystack = toEmail.toLowerCase();
  const mailbox = mailboxes.find((b) => {
    const addr = b.address.toLowerCase();
    return toHaystack.includes(addr);
  });
  const labelSlug = (mailbox?.label || mailbox?.address?.split("@")[0] || "primary").toLowerCase();
  const labels = mailbox
    ? ["inbound", mailbox.kind === "payments" ? "payments" : "primary", labelSlug]
    : ["inbound", "primary"];

  await env.DB.prepare(
    `INSERT INTO mail_messages (
       id, direction, from_email, to_email, subject, preview, body_text, body_html,
       status, provider, provider_id, labels_json, metadata_json
     ) VALUES (?, 'inbound', ?, ?, ?, ?, ?, ?, 'received', 'resend', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       from_email = excluded.from_email,
       to_email = excluded.to_email,
       subject = excluded.subject,
       preview = excluded.preview,
       body_text = CASE WHEN excluded.body_text != '' THEN excluded.body_text ELSE mail_messages.body_text END,
       body_html = CASE WHEN excluded.body_html != '' THEN excluded.body_html ELSE mail_messages.body_html END,
       labels_json = excluded.labels_json,
       metadata_json = excluded.metadata_json,
       updated_at = datetime('now')`
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
      JSON.stringify(labels),
      JSON.stringify({
        source: "resend.inbound",
        mailbox_id: mailbox?.id || null,
        mailbox_address: mailbox?.address || null,
        event,
      })
    )
    .run()
    .catch(() => {});
}

async function handleResendChannel(request, env, { channel, endpointId, secret }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const payload = await request.text();
  const headers = pickWebhookHeaders(request);
  const ipAddress = clientIp(request);

  let event;
  try {
    event = await verifyResendWebhookPayload(payload, request.headers, secret);
  } catch (err) {
    let parsed = null;
    try {
      parsed = JSON.parse(payload);
    } catch {
      parsed = null;
    }

    await insertAgentSamWebhookEvent(env, {
      endpointId,
      provider: "resend",
      eventType: parsed?.type || "auth.failed",
      eventId: parsed?.data?.email_id || parsed?.data?.id || null,
      payload: parsed,
      headers,
      metadata: { channel, phase: "verify" },
      status: "failed",
      signatureValid: false,
      ipAddress,
      errorMessage: err?.message || "Invalid webhook",
    });

    return Response.json({ error: err.message || "Invalid webhook" }, { status: 401 });
  }

  const { eventType, eventId } = resendEventMeta(event);
  const agentsamEventId = await insertAgentSamWebhookEvent(env, {
    endpointId,
    provider: "resend",
    eventType,
    eventId,
    payload: event,
    headers,
    metadata: { channel, mail_table: "mail_messages" },
    status: "processing",
    ipAddress,
  });

  const { type, providerId } = await logMailWebhookEvent(env, channel, event);

  try {
    if (channel === "outbound") {
      if (OUTBOUND_EVENTS.has(type)) {
        await applyOutboundEvent(env, event);
      }
    } else if (type === "email.received") {
      await applyInboundEvent(env, event, env.RESEND_API_KEY);
    }

    const handled =
      channel === "outbound" ? OUTBOUND_EVENTS.has(type) : type === "email.received";

    await updateAgentSamWebhookEvent(env, agentsamEventId, {
      status: handled ? "processed" : "ignored",
      metadata: { channel, provider_id: providerId, mail_logged: true },
    });

    return Response.json({
      ok: true,
      channel,
      type,
      provider_id: providerId,
      agentsam_event_id: agentsamEventId,
    });
  } catch (err) {
    await updateAgentSamWebhookEvent(env, agentsamEventId, {
      status: "failed",
      processingError: err?.message || "Webhook processing failed",
      metadata: { channel, provider_id: providerId },
    });
    console.error(`[resend-${channel}]`, err);
    return Response.json(
      { ok: false, error: err?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function handleResendOutboundWebhook(request, env) {
  const secret =
    env.RESEND_WEBHOOK_SECRET_OUTBOUND || env.RESEND_WEBHOOK_SECRET || "";
  return handleResendChannel(request, env, {
    channel: "outbound",
    endpointId: WEBHOOK_ENDPOINT_IDS.resend_outbound,
    secret,
  });
}

export async function handleResendInboundWebhook(request, env) {
  const secret = env.RESEND_WEBHOOK_SECRET_INBOUND || "";
  return handleResendChannel(request, env, {
    channel: "inbound",
    endpointId: WEBHOOK_ENDPOINT_IDS.resend_inbound,
    secret,
  });
}

/** Legacy single endpoint — treats as outbound. */
export async function handleResendWebhookLegacy(request, env) {
  const secret =
    env.RESEND_WEBHOOK_SECRET_OUTBOUND || env.RESEND_WEBHOOK_SECRET || "";
  return handleResendChannel(request, env, {
    channel: "outbound",
    endpointId: WEBHOOK_ENDPOINT_IDS.resend_legacy,
    secret,
  });
}
