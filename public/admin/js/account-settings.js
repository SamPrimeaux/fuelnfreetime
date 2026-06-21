const MAIL_DEFAULTS = {
  gmailAddress: "",
  gmailDisplayName: "",
  gmailSyncWindow: "Last 30 days",
  gmailReadMeta: true,
  gmailReadBodies: true,
  gmailSend: true,
  gmailDrafts: true,
  resendFrom: "hello@fuelnfreetime.com",
  resendPaymentsFrom: "payments@fuelnfreetime.com",
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

let toastTimer;

function $(id) {
  return document.getElementById(id);
}

function showAccountToast(message) {
  const toast = $("accountToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("open"), 2200);
}

function normalizeSettings(settings) {
  return { ...MAIL_DEFAULTS, ...(settings || {}) };
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function collectSettings() {
  const get = (id) => $(id);
  const checkbox = (id) => !!get(id)?.checked;
  return {
    gmailAddress: get("gmailAddress")?.value.trim() || "",
    gmailDisplayName: get("gmailDisplayName")?.value.trim() || "",
    gmailSyncWindow: get("gmailSyncWindow")?.value || "Last 30 days",
    gmailReadMeta: checkbox("gmailReadMeta"),
    gmailReadBodies: checkbox("gmailReadBodies"),
    gmailSend: checkbox("gmailSend"),
    gmailDrafts: checkbox("gmailDrafts"),
    resendFrom: get("resendFrom")?.value.trim() || "",
    resendPaymentsFrom: get("resendPaymentsFrom")?.value.trim() || "payments@fuelnfreetime.com",
    resendDomain: get("resendDomain")?.value.trim() || "",
    resendReplyTo: get("resendReplyTo")?.value.trim() || "",
    resendApiKey: get("resendApiKey")?.value.trim() || "",
    resendTransactional: checkbox("resendTransactional"),
    resendCampaign: checkbox("resendCampaign"),
    resendTracking: checkbox("resendTracking"),
    resendWebhooks: checkbox("resendWebhooks"),
    defaultInbox: get("defaultInbox")?.value || "Gmail",
    defaultSender: get("defaultSender")?.value || "Gmail for replies, Resend for app mail",
    syncCadence: get("syncCadence")?.value || "Every 15 minutes",
    agentMode: get("agentMode")?.value || "Draft only",
    autoLabel: checkbox("autoLabel"),
    clientPriority: checkbox("clientPriority"),
    reviewBeforeSend: checkbox("reviewBeforeSend"),
  };
}

function hydrateSettings(settings) {
  const merged = normalizeSettings(settings);
  Object.entries(merged).forEach(([key, value]) => {
    const el = $(key);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!value;
    else el.value = value;
  });
  renderAccounts(merged);
}

function renderAccounts(settings = normalizeSettings(collectSettings())) {
  const list = $("accountsList");
  if (!list) return;
  list.innerHTML = `
    <div class="account-row">
      <div class="account-row-icon gmail">GM</div>
      <div class="account-row-main"><strong>${settings.gmailAddress || "Gmail not connected"}</strong><span>Inbox sync, drafts, and replies</span></div>
      <button class="account-pill ${settings.gmailAddress ? "connected" : "warning"}" type="button" data-mail-tab="gmail">Gmail</button>
    </div>
    <div class="account-row">
      <div class="account-row-icon resend">RS</div>
      <div class="account-row-main"><strong>${settings.resendFrom || "Resend sender not set"}</strong><span>${settings.resendDomain || "fuelnfreetime.com"} — orders &amp; newsletters</span></div>
      <button class="account-pill ${settings.resendTransactional ? "connected" : "warning"}" type="button" data-mail-tab="resend">Resend</button>
    </div>`;
}

function switchMailPanel(tab) {
  document.querySelectorAll(".account-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mailTab === tab);
  });
  document.querySelectorAll(".account-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `mail-panel-${tab}`);
  });
  history.replaceState(null, "", tab === "accounts" ? "/admin/account#mail" : `/admin/account#mail-${tab}`);
}

function renderMailboxes(mailboxes = []) {
  const list = $("mailboxList");
  if (!list) return;
  if (!mailboxes.length) {
    list.innerHTML = `<p style="margin:0;color:#64748b;font-size:13px">No mailboxes seeded yet. Run <code>npm run mail:provision</code>.</p>`;
    return;
  }
  list.innerHTML = mailboxes
    .map(
      (box) => `
    <div class="account-webhook-row">
      <div><strong>${box.label}</strong> <span>${box.kind}</span></div>
      <code>${box.address}</code>
      <span style="font-size:12px;color:#64748b">${box.owner_name || "Shared"}${box.owner_auth_email ? ` · notifies ${box.owner_auth_email}` : ""}</span>
      <a href="/admin/email?mailbox=${box.address.split("@")[0]}" style="font-size:12px;font-weight:600">Open inbox →</a>
    </div>`
    )
    .join("");
}

async function loadMailSettings() {
  try {
    const [settingsRes, statusRes, boxesRes] = await Promise.all([
      adminFetch("/api/admin/mail/settings"),
      adminFetch("/api/admin/mail/resend/status").catch(() => null),
      adminFetch("/api/admin/mail/mailboxes").catch(() => ({ mailboxes: [] })),
    ]);
    hydrateSettings(settingsRes.settings || {});
    renderMailboxes(boxesRes.mailboxes || []);

    const pill = $("accountStatusPill");
    if (pill && settingsRes.providers) {
      const count = [settingsRes.providers.gmail, settingsRes.providers.resend].filter(
        (s) => s === "connected" || s === "configured"
      ).length;
      pill.textContent = `${count} active`;
      pill.classList.toggle("connected", count > 0);
    }

    $("gmailStatus")?.classList.toggle("connected", settingsRes.providers?.gmail === "connected");
    if ($("gmailStatus")) {
      $("gmailStatus").textContent =
        settingsRes.providers?.gmail === "connected" ? "Connected" : "Not connected";
    }
    $("resendStatus")?.classList.toggle("connected", settingsRes.providers?.resend === "configured");
    if ($("resendStatus")) {
      $("resendStatus").textContent =
        settingsRes.providers?.resend === "configured" ? "Configured" : "Pending DNS / API key";
    }

    const wh = statusRes?.webhooks;
    if ($("webhookOutboundUrl") && wh?.outbound_url) $("webhookOutboundUrl").textContent = wh.outbound_url;
    if ($("webhookInboundUrl") && wh?.inbound_url) $("webhookInboundUrl").textContent = wh.inbound_url;
    if ($("webhookOutboundStatus")) {
      $("webhookOutboundStatus").textContent = settingsRes.providers?.webhooks?.outbound
        ? "Secret set on Worker"
        : "Add RESEND_WEBHOOK_SECRET_OUTBOUND";
    }
    if ($("webhookInboundStatus")) {
      $("webhookInboundStatus").textContent = settingsRes.providers?.webhooks?.inbound
        ? "Secret set on Worker"
        : "Add RESEND_WEBHOOK_SECRET_INBOUND";
    }
  } catch (err) {
    console.warn("Mail settings:", err);
    hydrateSettings(MAIL_DEFAULTS);
  }
}

async function persistSettings(section) {
  const settings = collectSettings();
  if (settings.gmailAddress && !validateEmail(settings.gmailAddress)) {
    showAccountToast("Enter a valid Gmail address");
    return;
  }
  if (settings.resendFrom && !validateEmail(settings.resendFrom)) {
    showAccountToast("Enter a valid Resend from email");
    return;
  }
  if (settings.resendReplyTo && !validateEmail(settings.resendReplyTo)) {
    showAccountToast("Enter a valid reply-to email");
    return;
  }

  try {
    await adminFetch("/api/admin/mail/settings", {
      method: "POST",
      body: JSON.stringify({ section, settings }),
    });
    showAccountToast("Settings saved");
    await loadMailSettings();
  } catch (err) {
    showAccountToast(err.message || "Could not save settings");
  }
}

async function sendResendTest() {
  const settings = normalizeSettings(collectSettings());
  const to = adminEmail || settings.resendReplyTo || settings.resendFrom;
  if (!to) {
    showAccountToast("Set a reply-to or from address first");
    return;
  }
  try {
    const data = await adminFetch("/api/admin/mail/send", {
      method: "POST",
      body: JSON.stringify({
        to,
        subject: "Fuel & Free Time — Resend E2E test",
        body: "If you received this, Resend outbound mail is working for fuelnfreetime.com.",
        fromProvider: "resend",
        test: true,
      }),
    });
    showAccountToast(data.sent ? data.message || "Test sent" : data.message || data.error || "Send failed");
  } catch (err) {
    showAccountToast(err.message || "Test failed");
  }
}

let adminEmail = "";

function bindAccountPage() {
  document.querySelectorAll(".account-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchMailPanel(btn.dataset.mailTab));
  });
  document.querySelector(".account-page")?.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-mail-tab]");
    if (tabBtn && !tabBtn.classList.contains("account-tab")) {
      switchMailPanel(tabBtn.dataset.mailTab);
    }
  });
  $("accountsList")?.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-mail-tab]");
    if (tabBtn) switchMailPanel(tabBtn.dataset.mailTab);
  });

  $("saveAllSettings")?.addEventListener("click", () => persistSettings("all"));
  $("saveGmail")?.addEventListener("click", () => persistSettings("gmail"));
  $("saveResend")?.addEventListener("click", () => persistSettings("resend"));
  $("saveRouting")?.addEventListener("click", () => persistSettings("routing"));
  $("connectGmail")?.addEventListener("click", () =>
    showAccountToast("Gmail OAuth route: /api/admin/mail/oauth/gmail (next)")
  );
  $("testResend")?.addEventListener("click", sendResendTest);

  const hash = location.hash.replace(/^#/, "");
  if (hash.startsWith("mail-")) switchMailPanel(hash.slice(5));
  else if (hash === "mail") switchMailPanel("accounts");

  loadMailSettings();
}

window.initAccountPage = async function initAccountPage() {
  try {
    const me = await adminFetch("/api/admin/me");
    adminEmail = me.email || "";
    if ($("accountEmail")) $("accountEmail").textContent = adminEmail || "—";
    if ($("accountRole")) $("accountRole").textContent = me.role || "admin";
  } catch {
    /* redirect handled by shell */
  }
  bindAccountPage();
};
