import { sendResendEmail, resendConfigured, getResendDomainStatus } from "../lib/resend.js";

const DEFAULT_SETTINGS = {
  gmailAddress: "",
  gmailDisplayName: "",
  gmailSyncWindow: "Last 30 days",
  gmailReadMeta: true,
  gmailReadBodies: true,
  gmailSend: true,
  gmailDrafts: true,
  resendFrom: "hello@fuelnfreetime.com",
  resendDomain: "fuelnfreetime.com",
  resendReplyTo: "",
  resendApiKey: "",
  resendTransactional: true,
  resendCampaign: false,
  resendTracking: false,
  resendWebhooks: true,
  defaultInbox: "Gmail",
  defaultSender: "Gmail for replies, Resend for app mail",
  syncCadence: "Every 15 minutes",
  agentMode: "Draft only",
  autoLabel: true,
  clientPriority: true,
  reviewBeforeSend: true,
};

function sanitizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (merged.resendApiKey && merged.resendApiKey.includes("•")) {
    delete merged.resendApiKey;
  }
  return merged;
}

function redactSettings(settings) {
  return {
    ...settings,
    resendApiKey: settings.resendApiKey ? "••••••••" : "",
  };
}

async function loadSettings(env) {
  try {
    const row = await env.DB.prepare(
      `SELECT settings_json FROM mail_settings WHERE id = 1`
    ).first();
    if (row?.settings_json) {
      return sanitizeSettings(JSON.parse(row.settings_json));
    }
  } catch {
    // Table may not exist yet — fall through to KV/defaults
  }

  const cached = await env.CMS_CACHE.get("mail:settings", "json");
  return sanitizeSettings(cached);
}

async function saveSettings(env, settings) {
  const existing = await loadSettings(env);
  const next = { ...existing, ...settings };
  if (!settings.resendApiKey) next.resendApiKey = existing.resendApiKey || "";

  const json = JSON.stringify(next);
  try {
    await env.DB.prepare(
      `INSERT INTO mail_settings (id, settings_json, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at`
    )
      .bind(json)
      .run();
  } catch {
    await env.CMS_CACHE.put("mail:settings", json);
  }
  return next;
}

function providerStatus(settings, env) {
  const resendReady =
    resendConfigured(env) && settings.resendFrom && settings.resendTransactional;
  return {
    gmail: settings.gmailAddress ? "connected" : "disconnected",
    resend: resendReady ? "configured" : resendConfigured(env) ? "pending" : "pending",
    resend_domain: resendConfigured(env) ? "check_dashboard" : "no_api_key",
    webhooks: {
      outbound: Boolean(env.RESEND_WEBHOOK_SECRET_OUTBOUND || env.RESEND_WEBHOOK_SECRET),
      inbound: Boolean(env.RESEND_WEBHOOK_SECRET_INBOUND),
    },
  };
}

function initialsFor(name, email) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function formatMailDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function rowToMessage(row, index) {
  const labels = JSON.parse(row.labels_json || "[]");
  const from = row.from_email || "Unknown";
  const senderName = from.includes("@") ? from.split("@")[0] : from;
  return {
    id: row.id,
    db_id: row.id,
    direction: row.direction,
    initials: initialsFor(senderName, from),
    color: row.direction === "inbound" ? "teal" : "orange",
    sender: senderName,
    email: from,
    subject: row.subject || "(no subject)",
    preview: row.preview || row.body_text?.slice(0, 160) || "",
    date: formatMailDate(row.created_at),
    fullDate: row.created_at,
    labels: labels.length ? labels : row.direction === "inbound" ? ["primary"] : ["updates"],
    type:
      row.direction === "inbound"
        ? "Inbound via Resend receiving."
        : `Outbound · ${row.status || "queued"}`,
    unread: row.status === "received" || row.status === "sent",
    starred: false,
    needs: row.direction === "inbound",
    brand: row.direction === "inbound" ? "Inbound" : "Fuel & Free Time",
    tag: row.direction === "inbound" ? "Inbound" : "Sent",
    headline: row.subject || "(no subject)",
    cta: row.direction === "inbound" ? "Reply" : "View status",
    body_text: row.body_text || "",
    body_html: row.body_html || "",
    status: row.status,
    provider_id: row.provider_id,
    _sort: index,
  };
}

async function recordOutboundMessage(env, { id, from, to, subject, body, status = "sent" }) {
  const preview = (body || subject || "").slice(0, 240);
  await env.DB.prepare(
    `INSERT INTO mail_messages (
       id, direction, from_email, to_email, subject, preview, body_text,
       status, provider, provider_id, labels_json, metadata_json
     ) VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, 'resend', ?, ?, ?)`
  )
    .bind(
      `out_${id}`,
      from,
      to,
      subject,
      preview,
      body,
      status,
      id,
      JSON.stringify(["primary", "sent"]),
      JSON.stringify({ source: "admin.compose" })
    )
    .run()
    .catch(() => {});
}

export async function getMailSettings(env) {
  const settings = await loadSettings(env);
  return {
    ok: true,
    settings: redactSettings(settings),
    providers: providerStatus(settings, env),
  };
}

export async function postMailSettings(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const current = await loadSettings(env);
  const incoming = body.settings || body;
  const saved = await saveSettings(env, incoming);

  return Response.json({
    ok: true,
    settings: redactSettings(saved),
    providers: providerStatus(saved, env),
    section: body.section || "all",
  });
}

export async function getMailPartial(request, env) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/admin/partials/mail-app.html";
  const res = await env.ASSETS.fetch(new Request(assetUrl, request));
  if (!res.ok) {
    return Response.json({ error: "Mail UI partial missing" }, { status: 502 });
  }
  const html = await res.text();
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });
}

export async function listMailMessages(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, direction, from_email, to_email, subject, preview, body_text, body_html,
              status, provider, provider_id, labels_json, created_at
       FROM mail_messages
       ORDER BY datetime(created_at) DESC
       LIMIT 100`
    ).all();

    return Response.json({
      ok: true,
      messages: (results || []).map(rowToMessage),
      source: "d1",
    });
  } catch {
    return Response.json({ ok: true, messages: [], source: "d1" });
  }
}

export async function sendMailPreview(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.to || !body?.subject) {
    return Response.json({ error: "to and subject required" }, { status: 400 });
  }

  const settings = await loadSettings(env);
  const provider = body.fromProvider === "gmail" ? "gmail" : "resend";
  const payload = {
    from:
      provider === "gmail"
        ? settings.gmailAddress || "(gmail not configured)"
        : settings.resendFrom,
    to: body.to,
    subject: body.subject,
    replyTo: settings.resendReplyTo || settings.gmailAddress || null,
    body: body.body || "",
  };

  if (provider === "gmail") {
    return Response.json({
      ok: true,
      preview: true,
      sent: false,
      provider,
      payload,
      message: "Gmail send not wired yet — preview only.",
    });
  }

  if (!settings.resendTransactional) {
    return Response.json({
      ok: false,
      preview: true,
      sent: false,
      provider,
      payload,
      error: "Resend transactional sending is disabled in mail settings.",
    }, { status: 400 });
  }

  if (!resendConfigured(env)) {
    return Response.json({
      ok: true,
      preview: true,
      sent: false,
      provider,
      payload,
      message: "Preview only — run: wrangler secret put RESEND_API_KEY",
    });
  }

  const html = payload.body.includes("<")
    ? payload.body
    : `<p>${payload.body.replace(/\n/g, "<br>")}</p>`;

  const result = await sendResendEmail(env, {
    from: settings.resendFrom,
    to: body.to,
    subject: body.subject,
    html,
    text: payload.body,
    replyTo: payload.replyTo,
    tags: body.test ? ["admin-test"] : ["admin-compose"],
  });

  if (!result.ok) {
    return Response.json({
      ok: false,
      preview: false,
      sent: false,
      provider,
      payload,
      error: result.error,
      details: result.details,
    }, { status: 502 });
  }

  await recordOutboundMessage(env, {
    id: result.id,
    from: settings.resendFrom,
    to: body.to,
    subject: body.subject,
    body: payload.body,
    status: "sent",
  });

  return Response.json({
    ok: true,
    preview: false,
    sent: true,
    provider,
    payload,
    resend_id: result.id,
    message: `Sent via Resend (${result.id})`,
  });
}

export async function getResendStatus(env) {
  const settings = await loadSettings(env);
  const domain = settings.resendDomain || "fuelnfreetime.com";
  const status = await getResendDomainStatus(env, domain);
  const appDomain = env.APP_DOMAIN || "fuelnfreetime.com";
  return Response.json({
    ok: true,
    configured: resendConfigured(env),
    domain,
    resend: status,
    providers: providerStatus(settings, env),
    webhooks: {
      outbound_url: `https://${appDomain}/api/webhooks/resend/outbound`,
      inbound_url: `https://${appDomain}/api/webhooks/resend/inbound`,
      legacy_url: `https://${appDomain}/api/agentsam/webhooks/resend`,
      outbound_events: [
        "email.sent",
        "email.delivered",
        "email.delivery_delayed",
        "email.bounced",
        "email.complained",
        "email.failed",
      ],
      inbound_events: ["email.received"],
    },
  });
}
