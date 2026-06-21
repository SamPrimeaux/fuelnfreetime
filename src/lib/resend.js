/**
 * Resend transactional email (Workers fetch API — no SDK required).
 * Secrets: RESEND_API_KEY, RESEND_WEBHOOK_SECRET_OUTBOUND, RESEND_WEBHOOK_SECRET_INBOUND
 */

const RESEND_API = "https://api.resend.com";

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseFromAddress(from, fallbackName = "Fuel & Free Time") {
  const raw = (from || "").trim();
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  if (raw.includes("@")) return { name: fallbackName, email: raw };
  return { name: fallbackName, email: raw };
}

export function resendConfigured(env) {
  return Boolean(env.RESEND_API_KEY);
}

export async function sendResendEmail(env, { from, to, subject, html, text, replyTo, tags = [] }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const fromParsed = parseFromAddress(from || env.RESEND_FROM || "hello@fuelnfreetime.com");
  const recipients = Array.isArray(to) ? to : [to];
  const body = {
    from: fromParsed.name ? `${fromParsed.name} <${fromParsed.email}>` : fromParsed.email,
    to: recipients,
    subject: subject || "(no subject)",
    html: html || `<p>${stripHtml(text || "")}</p>`,
    text: text || stripHtml(html || ""),
  };

  if (replyTo) body.reply_to = replyTo;
  if (tags.length) {
    body.tags = tags.map((t) => (typeof t === "string" ? { name: t, value: "1" } : t));
  }

  const res = await fetch(`${RESEND_API}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data?.message || data?.error || `Resend HTTP ${res.status}`,
      status: res.status,
      details: data,
    };
  }

  return { ok: true, id: data.id, provider: "resend" };
}

function decodeWhsec(secret) {
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify Resend/Svix webhook signature. Returns parsed JSON event. */
export async function verifyResendWebhook(request, secret) {
  if (!secret) throw new Error("Webhook signing secret not configured");

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) throw new Error("Missing Svix headers");

  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
    throw new Error("Webhook timestamp outside tolerance");
  }

  const keyBytes = decodeWhsec(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedContent = `${id}.${timestamp}.${payload}`;
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signedContent));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  const valid = signature.split(" ").some((part) => {
    if (!part.startsWith("v1,")) return false;
    return timingSafeEqual(expected, part.slice(3));
  });
  if (!valid) throw new Error("Invalid webhook signature");

  return JSON.parse(payload);
}

export async function getResendDomainStatus(env, domain = "fuelnfreetime.com") {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const res = await fetch(`${RESEND_API}/domains`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.message || `HTTP ${res.status}` };
  }

  const row = (data.data || []).find((d) => d.name === domain);
  return {
    ok: true,
    domain,
    found: Boolean(row),
    status: row?.status || "not_found",
    records: row?.records || null,
  };
}
