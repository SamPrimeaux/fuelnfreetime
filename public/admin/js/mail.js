const ICONS = {
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path></svg>',
};

const MAIL_DEFAULTS = {
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

function normalizeSettings(settings) {
  return { ...MAIL_DEFAULTS, ...(settings || {}) };
}

let messages = [];
let selectedId = null;
let activeFilter = "all";
let selectedContextId = null;
let toastTimer;
let adminEmail = "";

async function bootMailApp() {
  const root = document.getElementById("mail-root");
  if (!root) return;

  if (document.getElementById("mailApp")) {
    await initMailApp();
    return;
  }

  root.innerHTML =
    '<div class="mail-boot-loading"><p>Loading inbox…</p></div>';

  try {
    const res = await fetch("/admin/partials/mail-app.html", {
      credentials: "same-origin",
      headers: { Accept: "text/html" },
    });
    const html = await res.text();
    if (!res.ok || !html.includes('id="mailApp"')) {
      throw new Error(
        res.status === 401 || res.status === 302
          ? "Session expired — refresh and sign in again"
          : `Could not load mail UI (HTTP ${res.status})`
      );
    }
    root.innerHTML = html;
    await initMailApp();
  } catch (err) {
    root.innerHTML = `<div class="mail-boot-error">
      <h2>Email workspace could not load</h2>
      <p>${err.message || "Unknown error"}</p>
      <button type="button" class="primary-button" onclick="location.reload()">Reload page</button>
      <a href="/admin/login" class="ghost-button" style="display:inline-flex;margin-top:12px;text-decoration:none">Sign in again</a>
    </div>`;
  }
}

async function initMailApp() {
  try {
    const me = await adminFetch("/api/admin/me");
    adminEmail = me.email || "";
  } catch {
    /* shell handles redirect */
  }

  try {
    const data = await adminFetch("/api/admin/mail/messages");
    messages = data.messages || [];
  } catch {
    messages = [];
  }

  selectedId = messages[0]?.id ?? null;
  selectedContextId = selectedId;

  bindMailEvents();
  await loadRemoteSettings();
  updateBadges();
  renderRows();
  renderReader();
  updateComposeFromOptions();
}

function $(id) {
  return document.getElementById(id);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("open"), 2200);
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
  updateSettingsPreview(merged);
  updateRailStatus(merged);
  updateComposeFromOptions(merged);
}

async function loadRemoteSettings() {
  try {
    const data = await adminFetch("/api/admin/mail/settings");
    hydrateSettings(data.settings || {});
    const pill = $("accountStatusPill");
    if (pill && data.providers) {
      const count = [data.providers.gmail, data.providers.resend].filter(
        (s) => s === "connected" || s === "configured"
      ).length;
      pill.textContent = `${count} active`;
      pill.classList.toggle("connected", count > 0);
    }
    $("gmailStatus")?.classList.toggle("connected", data.providers?.gmail === "connected");
    $("gmailStatus") && ($("gmailStatus").textContent = data.providers?.gmail === "connected" ? "Connected" : "Disconnected");
    $("resendStatus")?.classList.toggle("connected", data.providers?.resend === "configured");
    $("resendStatus") &&
      ($("resendStatus").textContent =
        data.providers?.resend === "configured" ? "Connected" : "Pending DNS / API key");
  } catch (err) {
    console.warn("Mail settings:", err);
    hydrateSettings(MAIL_DEFAULTS);
  }
}

async function persistSettings(section) {
  const settings = collectSettings();
  if (settings.gmailAddress && !validateEmail(settings.gmailAddress)) {
    showToast("Enter a valid Gmail address");
    return;
  }
  if (settings.resendFrom && !validateEmail(settings.resendFrom)) {
    showToast("Enter a valid Resend from email");
    return;
  }
  if (settings.resendReplyTo && !validateEmail(settings.resendReplyTo)) {
    showToast("Enter a valid reply-to email");
    return;
  }

  try {
    await adminFetch("/api/admin/mail/settings", {
      method: "POST",
      body: JSON.stringify({ section, settings }),
    });
    showToast("Settings saved");
    await loadRemoteSettings();
  } catch (err) {
    showToast(err.message || "Could not save settings");
  }
}

function buildPayload(settings = normalizeSettings(collectSettings()), section = "preview") {
  return {
    section,
    accounts: [
      {
        provider: "gmail",
        address: settings.gmailAddress,
        displayName: settings.gmailDisplayName,
        syncWindow: settings.gmailSyncWindow,
        permissions: {
          readMetadata: settings.gmailReadMeta,
          readBodies: settings.gmailReadBodies,
          sendReplies: settings.gmailSend,
          createDrafts: settings.gmailDrafts,
        },
      },
      {
        provider: "resend",
        from: settings.resendFrom,
        domain: settings.resendDomain,
        replyTo: settings.resendReplyTo,
        apiKeySet: !!settings.resendApiKey && !settings.resendApiKey.includes("•"),
        delivery: {
          transactional: settings.resendTransactional,
          campaign: settings.resendCampaign,
          tracking: settings.resendTracking,
          webhooks: settings.resendWebhooks,
        },
      },
    ],
    routing: {
      inboxSource: settings.defaultInbox,
      defaultSender: settings.defaultSender,
      syncCadence: settings.syncCadence,
      agentMode: settings.agentMode,
      autoLabel: settings.autoLabel,
      clientPriority: settings.clientPriority,
      reviewBeforeSend: settings.reviewBeforeSend,
    },
  };
}

function updateSettingsPreview(settings = normalizeSettings(collectSettings())) {
  const preview = $("payloadPreview");
  if (preview) preview.textContent = JSON.stringify(buildPayload(settings), null, 2);
}

function updateRailStatus(settings = normalizeSettings(collectSettings())) {
  const inbox = settings.defaultInbox || MAIL_DEFAULTS.defaultInbox;
  const resendPart = settings.resendTransactional ? "Resend sends store mail." : "Resend paused.";
  const route = $("railRouteLabel");
  if (route) route.textContent = `${inbox} receives. ${resendPart}`;
  const sync = $("railSyncText");
  if (sync) {
    sync.textContent = settings.gmailAddress
      ? settings.syncCadence || MAIL_DEFAULTS.syncCadence
      : "Configure Gmail or Resend";
  }
  $("syncDot")?.classList.toggle("warning", !settings.gmailAddress || !settings.resendTransactional);
}

function updateComposeFromOptions(settings = normalizeSettings(collectSettings())) {
  const select = $("composeFrom");
  if (!select) return;
  const options = [];
  if (settings.gmailAddress) {
    options.push(`<option value="gmail">${settings.gmailAddress} via Gmail</option>`);
  }
  if (settings.resendFrom) {
    options.push(`<option value="resend">${settings.resendFrom} via Resend</option>`);
  }
  if (!options.length) {
    options.push(`<option value="resend">hello@fuelnfreetime.com via Resend (configure in settings)</option>`);
  }
  select.innerHTML = options.join("");
}

function renderAccounts(settings = normalizeSettings(collectSettings())) {
  const list = $("accountsList");
  if (!list) return;
  list.innerHTML = `
    <div class="account-row">
      <div class="provider-icon gmail">GM</div>
      <div class="account-main"><strong>${settings.gmailAddress || "Gmail not set"}</strong><span>Inbox sync, drafts, and replies</span></div>
      <button class="provider-pill ${settings.gmailAddress ? "connected" : "warning"}" type="button" data-settings-tab="gmail">Gmail</button>
    </div>
    <div class="account-row">
      <div class="provider-icon resend">RS</div>
      <div class="account-main"><strong>${settings.resendFrom || "Resend sender not set"}</strong><span>${settings.resendDomain || "fuelnfreetime.com"} — orders &amp; newsletters</span></div>
      <button class="provider-pill ${settings.resendTransactional ? "connected" : "warning"}" type="button" data-settings-tab="resend">Resend</button>
    </div>
    <div class="account-row">
      <div class="provider-icon add">+</div>
      <div class="account-main"><strong>Add another mailbox</strong><span>Additional Gmail or verified sender.</span></div>
      <button class="provider-pill" type="button" id="inlineAddAccount">Add</button>
    </div>`;
}

function updateBadges() {
  const unread = messages.filter((m) => m.unread).length;
  const needs = messages.filter((m) => m.needs).length;
  const inboxBadge = $("inboxBadge");
  if (inboxBadge) inboxBadge.textContent = String(unread);
  const needsBadge = $("needsBadge");
  if (needsBadge) needsBadge.textContent = String(needs);
  const sub = $("folderSubhead");
  if (sub) sub.textContent = `${unread} unread · demo inbox`;
}

function labelsHTML(labels) {
  return (labels || [])
    .map((label) => {
      const cls =
        label === "primary" ? "primary" : label === "action" ? "action" : label === "client" ? "client" : "";
      return `<span class="label ${cls}">${label}</span>`;
    })
    .join("");
}

function filteredMessages() {
  const query = ($("mailSearch")?.value || "").trim().toLowerCase();
  return messages.filter((m) => {
    if (activeFilter === "unread" && !m.unread) return false;
    if (activeFilter === "starred" && !m.starred) return false;
    if (activeFilter === "needs" && !m.needs) return false;
    if (query) {
      const haystack = `${m.sender} ${m.email} ${m.subject} ${m.preview} ${(m.labels || []).join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function renderRows() {
  const rows = $("rows");
  if (!rows) return;
  const data = filteredMessages();
  $("metaCount") && ($("metaCount").textContent = `${data.length} messages shown`);

  rows.innerHTML =
    data
      .map(
        (message) => `
    <article class="message-row ${message.unread ? "unread" : ""} ${message.id === selectedId ? "selected" : ""}" data-id="${message.id}" tabindex="0">
      <div class="avatar ${message.color}">${message.unread ? '<span class="unread-dot"></span>' : ""}${message.initials}</div>
      <div class="row-main">
        <div class="row-top"><div class="sender">${message.sender}</div><div class="date">${message.date}</div></div>
        <div class="subject">${message.subject}</div>
        <div class="preview">${message.preview}</div>
        <div class="label-row">${labelsHTML(message.labels)}</div>
      </div>
      <button class="star-button ${message.starred ? "active" : ""}" type="button" data-star="${message.id}" aria-label="Star message">${ICONS.star}</button>
    </article>`
      )
      .join("") ||
    `<div class="empty-state"><div class="empty-card"><h2>No messages found</h2><p>Try a different filter or connect Gmail in settings.</p></div></div>`;
}

function renderReader() {
  const readerBody = $("readerBody");
  if (!readerBody) return;
  const message = messages.find((item) => item.id === selectedId);
  const inboxTo = adminEmail || "admin@fuelnfreetime.com";

  if (!message) {
    readerBody.innerHTML = `<div class="empty-state"><div class="empty-card"><h2>Select a message</h2><p>Choose an email from the list, or open settings to connect Gmail and Resend.</p><div class="empty-actions"><button class="small-pill primary" type="button" id="openSettingsEmpty">Mail settings</button></div></div></div>`;
    $("openSettingsEmpty")?.addEventListener("click", () => openSettings("accounts"));
    return;
  }

  readerBody.innerHTML = `
    <div class="message-header-card">
      <div class="message-header-main">
        <div class="big-avatar avatar ${message.color}">${message.initials}</div>
        <div class="subject-stack">
          <h2>${message.subject}</h2>
          <p>${message.sender} &lt;${message.email}&gt;</p>
        </div>
        <div class="header-date">${message.fullDate}</div>
      </div>
      <div class="meta-grid">
        <div class="meta-item"><b>To</b><span>${inboxTo}</span></div>
        <div class="meta-item"><b>Source</b><span>${message.labels?.includes("promotions") ? "Gmail / Promotions" : "Gmail / Primary"}</span></div>
        <div class="meta-item"><b>Labels</b><span>${(message.labels || []).join(", ")}</span></div>
        <div class="meta-item"><b>Status</b><span>${message.needs ? "Needs review" : "No immediate action"}</span></div>
      </div>
      <div class="sam-strip">
        <div class="sam-copy"><strong>Inbox assistant</strong><span>${message.type}</span></div>
        <div class="sam-actions">
          <button class="small-pill primary" type="button" data-action="summarize">Summarize</button>
          <button class="small-pill" type="button" data-action="draft">Draft reply</button>
        </div>
      </div>
    </div>
    <div class="email-frame">
      <article class="email-canvas">
        <div class="email-hero">
          <div class="email-brand">${message.brand}</div>
          <div class="email-kicker">${message.tag}</div>
          <h3>${message.headline}</h3>
        </div>
        <div class="email-body">
          <p>${message.preview}</p>
          <p>${message.type}</p>
          <div class="email-cta">${message.cta}</div>
          <div class="email-cards">
            <div class="mini-card"><strong>Read</strong><span>Focused reader with full thread context.</span></div>
            <div class="mini-card"><strong>Act</strong><span>Reply via Gmail or send store mail via Resend.</span></div>
            <div class="mini-card"><strong>Route</strong><span>Settings control inbox sync and sending paths.</span></div>
          </div>
        </div>
      </article>
    </div>`;
}

function selectMessage(id) {
  selectedId = Number(id);
  selectedContextId = selectedId;
  const message = messages.find((item) => item.id === selectedId);
  if (message) message.unread = false;
  updateBadges();
  renderRows();
  renderReader();
  setMobilePanel("reader");
}

function openCompose(mode) {
  const message = messages.find((item) => item.id === selectedId) || messages[0];
  $("composeTitle").textContent = mode;
  $("composeTo").value = mode === "New message" ? "" : message?.email || "";
  $("composeSubject").value = mode === "New message" ? "" : `Re: ${message?.subject || ""}`;
  $("composeText").value =
    mode === "New message"
      ? ""
      : `Hi ${(message?.sender || "there").split(" ")[0]},\n\nThanks for reaching out. I'm reviewing this now and will follow up shortly.\n\n— Fuel & Free Time`;
  $("composeSheet")?.classList.add("open");
}

async function sendCompose() {
  const to = $("composeTo")?.value.trim();
  const subject = $("composeSubject")?.value.trim();
  const body = $("composeText")?.value.trim();
  const fromProvider = $("composeFrom")?.value || "resend";

  if (!to || !subject) {
    showToast("To and subject required");
    return;
  }

  try {
    const data = await adminFetch("/api/admin/mail/send", {
      method: "POST",
      body: JSON.stringify({ to, subject, body, fromProvider }),
    });
    $("composeSheet")?.classList.remove("open");
    showToast(data.sent ? data.message || "Sent" : data.message || data.error || "Preview only");
  } catch (err) {
    showToast(err.message || "Send failed");
  }
}

function openSettings(tab = "accounts") {
  loadRemoteSettings();
  $("settingsBackdrop")?.classList.add("open");
  $("settingsBackdrop")?.setAttribute("aria-hidden", "false");
  switchSettingsTab(tab);
}

function closeSettings() {
  $("settingsBackdrop")?.classList.remove("open");
  $("settingsBackdrop")?.setAttribute("aria-hidden", "true");
}

function switchSettingsTab(tab) {
  document.querySelectorAll(".mail-root .settings-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTab === tab);
  });
  document.querySelectorAll(".mail-root .settings-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `settings-${tab}`);
  });
}

function closeMenus() {
  $("contextMenu")?.classList.remove("open");
  $("moreMenu")?.classList.remove("open");
}

function menuAction(action) {
  closeMenus();
  if (action === "open") selectMessage(selectedContextId);
  if (action === "reply") openCompose("Reply");
  if (action === "replyAll") openCompose("Reply all");
  if (action === "forward") openCompose("Forward");
  if (action === "unread") {
    const m = messages.find((x) => x.id === selectedContextId);
    if (m) m.unread = true;
    updateBadges();
    renderRows();
    showToast("Marked unread");
  }
  if (action === "archive") showToast("Archived (preview)");
  if (action === "delete") showToast("Deleted (preview)");
  if (action === "settings") openSettings("accounts");
  if (action === "summarize") showToast("Summary ready (preview)");
  if (action === "task") showToast("Task created (preview)");
}

function setMobilePanel(panel) {
  if (!window.matchMedia("(max-width: 820px)").matches) return;
  const mailApp = $("mailApp");
  if (mailApp) mailApp.dataset.mobile = panel;
  document.querySelectorAll("#mobileTabs button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.panel === panel);
  });
}

function initDragHandles() {
  let activeHandle = null;
  let startX = 0;
  let startValue = 0;

  document.querySelectorAll(".mail-root .drag-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      activeHandle = handle.dataset.handle;
      startX = event.clientX;
      const rail = document.querySelector(".mail-root .mail-rail");
      const list = document.querySelector(".mail-root .message-list");
      startValue =
        activeHandle === "rail" ? rail.getBoundingClientRect().width : list.getBoundingClientRect().width;
      handle.setPointerCapture(event.pointerId);
      document.body.style.userSelect = "none";
    });
  });

  window.addEventListener("pointermove", (event) => {
    if (!activeHandle) return;
    const delta = event.clientX - startX;
    const root = document.querySelector(".mail-root");
    if (activeHandle === "rail") {
      const width = Math.max(190, Math.min(310, startValue + delta));
      root.style.setProperty("--rail-w", `${width}px`);
    } else {
      const width = Math.max(340, Math.min(560, startValue + delta));
      root.style.setProperty("--list-w", `${width}px`);
    }
  });
  window.addEventListener("pointerup", () => {
    activeHandle = null;
    document.body.style.userSelect = "";
  });
}

function bindMailEvents() {
  const rows = $("rows");
  rows?.addEventListener("click", (event) => {
    const star = event.target.closest("[data-star]");
    if (star) {
      event.stopPropagation();
      const message = messages.find((item) => item.id === Number(star.dataset.star));
      if (message) message.starred = !message.starred;
      renderRows();
      return;
    }
    const row = event.target.closest(".message-row");
    if (row) selectMessage(row.dataset.id);
  });

  $("filterTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll("#filterTabs button").forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
    renderRows();
  });

  $("mailSearch")?.addEventListener("input", renderRows);
  $("composeButton")?.addEventListener("click", () => openCompose("New message"));
  $("closeCompose")?.addEventListener("click", () => $("composeSheet")?.classList.remove("open"));
  $("sendButton")?.addEventListener("click", sendCompose);
  $("draftButton")?.addEventListener("click", () => {
    $("composeSheet")?.classList.remove("open");
    showToast("Draft saved (preview)");
  });
  $("refreshButton")?.addEventListener("click", async () => {
    try {
      const data = await adminFetch("/api/admin/mail/messages");
      messages = data.messages || messages;
      renderRows();
      renderReader();
      updateBadges();
      showToast("Inbox refreshed");
    } catch {
      showToast("Refresh failed");
    }
  });
  $("triageButton")?.addEventListener("click", () => showToast("Triage preview — connect Gmail to run live"));
  $("settingsButton")?.addEventListener("click", () => openSettings("accounts"));
  $("quickSettingsButton")?.addEventListener("click", () => openSettings("accounts"));
  $("closeSettings")?.addEventListener("click", closeSettings);
  $("settingsBackdrop")?.addEventListener("click", (event) => {
    if (event.target === $("settingsBackdrop")) closeSettings();
  });
  $("saveAllSettings")?.addEventListener("click", () => persistSettings("all"));
  $("saveGmail")?.addEventListener("click", () => persistSettings("gmail"));
  $("saveResend")?.addEventListener("click", () => persistSettings("resend"));
  $("saveRouting")?.addEventListener("click", () => persistSettings("routing"));
  $("connectGmail")?.addEventListener("click", () => showToast("Gmail OAuth route: /api/admin/mail/oauth/gmail (next)"));
  $("testResend")?.addEventListener("click", async () => {
    const settings = normalizeSettings(collectSettings());
    const to = settings.resendFrom || settings.resendReplyTo;
    if (!to) {
      showToast("Set a Resend from address first");
      return;
    }
    try {
      const data = await adminFetch("/api/admin/mail/send", {
        method: "POST",
        body: JSON.stringify({
          to,
          subject: "Fuel & Free Time — Resend test",
          body: "If you received this, Resend is wired correctly for fuelnfreetime.com.",
          fromProvider: "resend",
          test: true,
        }),
      });
      showToast(data.sent ? data.message || "Test sent" : data.message || data.error || "Test preview");
    } catch (err) {
      showToast(err.message || "Test failed");
    }
  });
  $("copyPayload")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("payloadPreview")?.textContent || "");
      showToast("Payload copied");
    } catch {
      showToast("Copy unavailable");
    }
  });

  document.querySelector(".mail-root .settings-nav")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-settings-tab]");
    if (button) switchSettingsTab(button.dataset.settingsTab);
  });
  $("accountsList")?.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-settings-tab]");
    if (tabButton) switchSettingsTab(tabButton.dataset.settingsTab);
    if (event.target.closest("#inlineAddAccount")) switchSettingsTab("gmail");
  });
  $("addGmailAccount")?.addEventListener("click", () => switchSettingsTab("gmail"));
  $("addResendAccount")?.addEventListener("click", () => switchSettingsTab("resend"));

  document.querySelectorAll(".mail-root .settings-modal input, .mail-root .settings-modal select").forEach((el) => {
    const refresh = () => {
      const current = normalizeSettings(collectSettings());
      updateSettingsPreview(current);
      renderAccounts(current);
      updateRailStatus(current);
    };
    el.addEventListener("input", refresh);
    el.addEventListener("change", refresh);
  });

  $("railToggle")?.addEventListener("click", () => {
    $("mailApp")?.classList.toggle("rail-collapsed");
  });
  $("mobileBack")?.addEventListener("click", () => setMobilePanel("list"));
  $("mobileTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-panel]");
    if (button) setMobilePanel(button.dataset.panel);
  });

  document.querySelector(".mail-root .reader-toolbar")?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "reply" || action === "replyAll" || action === "forward") {
      openCompose(action === "reply" ? "Reply" : action === "replyAll" ? "Reply all" : "Forward");
    } else if (action === "star") {
      const m = messages.find((x) => x.id === selectedId);
      if (m) m.starred = !m.starred;
      renderRows();
      showToast("Star updated");
    } else {
      showToast(`${action} ready (preview)`);
    }
  });

  $("contextMenu")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-menu-action]");
    if (button) menuAction(button.dataset.menuAction);
  });
  $("moreMenu")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-menu-action]");
    if (button) menuAction(button.dataset.menuAction);
  });
  $("moreButton")?.addEventListener("click", (event) => {
    closeMenus();
    const menu = $("moreMenu");
    menu?.classList.add("open");
    if (menu) {
      menu.style.left = `${Math.min(event.clientX - 200, window.innerWidth - 280)}px`;
      menu.style.top = `${event.clientY + 12}px`;
    }
  });

  document.querySelectorAll(".mail-root .nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".mail-root .nav-item").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const label = item.querySelector(".nav-label")?.textContent || "Inbox";
      $("folderTitle") && ($("folderTitle").textContent = label);
      setMobilePanel("list");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenus();
      $("composeSheet")?.classList.remove("open");
      closeSettings();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("mailSearch")?.focus();
    }
  });

  initDragHandles();
}
