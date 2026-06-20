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

const DEMO_MESSAGES = [
  {
    id: 1,
    initials: "FN",
    color: "orange",
    sender: "Newsletter Subscriber",
    email: "rider@example.com",
    subject: "New signup from shop page",
    preview: "A visitor subscribed to Fuel & Free Time updates from the homepage newsletter form.",
    date: "Today",
    fullDate: "Today at 9:14 AM",
    labels: ["client", "primary"],
    type: "Store lead. New subscriber — consider a welcome sequence via Resend.",
    unread: true,
    starred: false,
    needs: true,
    brand: "Fuel & Free Time",
    tag: "Newsletter",
    headline: "New subscriber from the storefront",
    cta: "View subscriber",
  },
  {
    id: 2,
    initials: "CF",
    color: "teal",
    sender: "Cloudflare",
    email: "noreply@notify.cloudflare.com",
    subject: "Worker deployment succeeded: fuelnfreetime",
    preview: "Your latest Worker version deployed successfully to fuelnfreetime.meauxbility.workers.dev.",
    date: "Today",
    fullDate: "Today at 8:02 AM",
    labels: ["updates"],
    type: "Infrastructure notice. Deployment healthy — no action required.",
    unread: true,
    starred: false,
    needs: false,
    brand: "Cloudflare",
    tag: "Deploy",
    headline: "Worker deploy completed",
    cta: "View deployment",
  },
  {
    id: 3,
    initials: "RS",
    color: "dark",
    sender: "Resend",
    email: "notifications@resend.com",
    subject: "Domain verification pending for fuelnfreetime.com",
    preview: "Add the DNS records shown in Resend to verify your sending domain.",
    date: "Yesterday",
    fullDate: "Yesterday at 4:18 PM",
    labels: ["action", "updates"],
    type: "Sending setup. Complete DNS verification before enabling transactional mail.",
    unread: false,
    starred: true,
    needs: true,
    brand: "Resend",
    tag: "Action required",
    headline: "Verify fuelnfreetime.com for sending",
    cta: "Open DNS guide",
  },
  {
    id: 4,
    initials: "SH",
    color: "purple",
    sender: "Shopify",
    email: "mailer@shopify.com",
    subject: "Order sync integration available",
    preview: "Connect your catalog to sync inventory and order notifications.",
    date: "Yesterday",
    fullDate: "Yesterday at 11:02 AM",
    labels: ["updates"],
    type: "Platform update. Review when expanding checkout integrations.",
    unread: false,
    starred: false,
    needs: false,
    brand: "Shopify",
    tag: "Integration",
    headline: "Order sync tools are available",
    cta: "Learn more",
  },
  {
    id: 5,
    initials: "OR",
    color: "teal",
    sender: "Store Orders",
    email: "orders@fuelnfreetime.com",
    subject: "Order #1042 confirmation ready to send",
    preview: "A pending order is ready for a Resend transactional confirmation once checkout is live.",
    date: "Oct 30",
    fullDate: "Oct 30, 2025 at 6:20 PM",
    labels: ["primary", "action"],
    type: "Transactional mail. Preview the order confirmation template before sending.",
    unread: true,
    starred: false,
    needs: true,
    brand: "Fuel & Free Time",
    tag: "Order",
    headline: "Order confirmation is queued",
    cta: "Preview email",
  },
];

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

function providerStatus(settings) {
  return {
    gmail: settings.gmailAddress ? "connected" : "disconnected",
    resend: settings.resendFrom && settings.resendTransactional ? "configured" : "pending",
  };
}

export async function getMailSettings(env) {
  const settings = await loadSettings(env);
  return {
    ok: true,
    settings: redactSettings(settings),
    providers: providerStatus(settings),
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
    providers: providerStatus(saved),
    section: body.section || "all",
  });
}

export async function listMailMessages() {
  return Response.json({ ok: true, messages: DEMO_MESSAGES, source: "demo" });
}

export async function sendMailPreview(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.to || !body?.subject) {
    return Response.json({ error: "to and subject required" }, { status: 400 });
  }

  const settings = await loadSettings(env);
  const provider =
    body.fromProvider === "gmail" ? "gmail" : "resend";

  return Response.json({
    ok: true,
    preview: true,
    provider,
    payload: {
      from:
        provider === "gmail"
          ? settings.gmailAddress || "(gmail not configured)"
          : settings.resendFrom,
      to: body.to,
      subject: body.subject,
      replyTo: settings.resendReplyTo || settings.gmailAddress || null,
      body: body.body || "",
    },
    message: "Send preview accepted — wire Resend/Gmail in Worker when ready.",
  });
}
