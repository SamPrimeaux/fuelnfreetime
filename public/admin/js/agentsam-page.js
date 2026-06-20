/**
 * AgentSam full-page chat — ChatGPT-style workspace with real attachments, tools, threads.
 */

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 6;

const GITHUB_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;

/** @type {string|null} */
let conversationId = null;
/** @type {Array<any>} */
let pendingAttachments = [];
/** @type {object|null} */
let composeContext = null;
/** @type {string|null} */
let iamLogoUrl = null;
/** @type {object|null} */
let plusMenuConfig = null;
/** @type {object|null} */
let modalToolCall = null;

function $(id) {
  return document.getElementById(id);
}

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function formatBytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(unix) {
  if (!unix) return "";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unix);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function showThread() {
  const thread = $("agentsam-thread");
  const hero = $("agentsam-hero");
  const stage = document.querySelector(".agentsam-page-stage");
  if (thread) thread.hidden = false;
  if (hero) hero.style.display = "none";
  if (stage) stage.classList.add("has-thread");
}

function clearThreadUi() {
  const thread = $("agentsam-thread");
  const hero = $("agentsam-hero");
  const stage = document.querySelector(".agentsam-page-stage");
  if (thread) {
    thread.innerHTML = "";
    thread.hidden = true;
  }
  if (hero) hero.style.display = "";
  if (stage) stage.classList.remove("has-thread");
}

function renderComposeModes() {
  const box = $("agentsam-compose-modes");
  if (!box) return;
  box.innerHTML = "";
  if (!composeContext?.mode) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const chip = document.createElement("div");
  chip.className = "agentsam-page-mode-chip";
  chip.innerHTML = `${composeContext.label || "Creative Studio"} <button type="button" aria-label="Clear mode">&times;</button>`;
  chip.querySelector("button")?.addEventListener("click", () => {
    composeContext = null;
    const input = $("agentsam-page-input");
    if (input) input.placeholder = "Ask anything";
    renderComposeModes();
  });
  box.appendChild(chip);
  const input = $("agentsam-page-input");
  if (input && composeContext.mode === "image") {
    input.placeholder = "Describe the image you want…";
  }
}

function toolIconEl(icon) {
  const wrap = document.createElement("div");
  wrap.className = "agentsam-page-tool-call-icon";
  if (!icon) {
    wrap.textContent = "T";
    return wrap;
  }
  if (icon.type === "image" && icon.url) {
    const img = document.createElement("img");
    img.src = icon.url;
    img.alt = "";
    wrap.appendChild(img);
    return wrap;
  }
  if (icon.type === "svg" && icon.markup) {
    wrap.innerHTML = icon.markup;
    return wrap;
  }
  wrap.textContent = icon.label || "T";
  return wrap;
}

function renderToolCallBlock(toolCall, { running = false } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `agentsam-page-tool-call${running ? " is-running" : ""}`;
  btn.dataset.toolCallId = toolCall.tool_call_id || toolCall.id;

  btn.appendChild(toolIconEl(toolCall.icon));

  const body = document.createElement("div");
  body.className = "agentsam-page-tool-call-body";
  body.innerHTML = `<strong>${toolCall.display_name || "Calling tool"}</strong><span>${toolCall.server || toolCall.provider || ""}</span>`;
  btn.appendChild(body);

  const status = document.createElement("span");
  status.className = "agentsam-page-tool-call-status";
  const st = running ? "running" : toolCall.status || "complete";
  status.textContent = st;
  if (st === "complete") status.classList.add("is-complete");
  if (st === "failed") status.classList.add("is-failed");
  btn.appendChild(status);

  btn.addEventListener("click", () => openToolCallModal(toolCall.tool_call_id || toolCall.id, toolCall));
  return btn;
}

async function openToolCallModal(id, fallback = null) {
  const modal = $("agentsam-tool-modal");
  const body = $("agentsam-tool-modal-body");
  const title = $("agentsam-tool-modal-title");
  if (!modal || !body) return;

  let call = fallback;
  if (id) {
    try {
      const res = await fetch(`/api/admin/agentsam/tool-calls/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        call = data.tool_call || call;
      }
    } catch {
      /* use fallback */
    }
  }
  if (!call) return;

  modalToolCall = call;
  if (title) title.textContent = call.display_name || "Tool call";
  body.innerHTML = `
    <dl class="agentsam-tool-modal-kv">
      <dt>Tool</dt><dd>${call.display_name || call.tool_key || "—"}</dd>
      <dt>Provider</dt><dd>${call.server || call.provider || "—"}</dd>
      <dt>Status</dt><dd>${call.status || "—"}</dd>
      <dt>Duration</dt><dd>${call.duration_ms != null ? `${call.duration_ms} ms` : "—"}</dd>
    </dl>
    ${call.input_preview ? `<div><strong>Request</strong><pre class="agentsam-tool-modal-pre">${escapeHtml(call.input_preview)}</pre></div>` : ""}
    ${call.output_preview ? `<div><strong>Response</strong><pre class="agentsam-tool-modal-pre">${escapeHtml(call.output_preview)}</pre></div>` : ""}
    ${call.error ? `<div><strong>Error</strong><pre class="agentsam-tool-modal-pre">${escapeHtml(call.error)}</pre></div>` : ""}
  `;
  modal.hidden = false;
}

function closeToolModal() {
  const modal = $("agentsam-tool-modal");
  if (modal) modal.hidden = true;
  modalToolCall = null;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function appendRouteChips(wrap, chips) {
  if (!chips?.length) return;
  const route = document.createElement("div");
  route.className = "agentsam-page-route";
  chips.forEach((chip) => {
    const el = document.createElement("span");
    if (chip.kind === "tool") el.classList.add("is-mcp");
    el.textContent = chip.label;
    route.appendChild(el);
  });
  wrap.appendChild(route);
}

function appendBubble(role, text, { routeChips = [], attachments = [], toolCalls = [] } = {}) {
  showThread();
  const thread = $("agentsam-thread");
  if (!thread) return null;

  const wrap = document.createElement("div");
  wrap.className = `agentsam-page-bubble agentsam-page-bubble--${role}`;

  if (role === "assistant") appendRouteChips(wrap, routeChips);

  if (attachments.length) {
    const media = document.createElement("div");
    media.className = "agentsam-page-bubble-attachments";
    attachments.forEach((attachment) => {
      if (attachment.preview_url && attachment.kind === "image") {
        const img = document.createElement("img");
        img.src = attachment.preview_url;
        img.alt = attachment.name || attachment.file_name || "attachment";
        media.appendChild(img);
      } else {
        const file = document.createElement("div");
        file.className = "agentsam-page-bubble-file";
        file.textContent = `${attachment.name || attachment.file_name} · ${formatBytes(attachment.size_bytes || attachment.file_size_bytes)}`;
        media.appendChild(file);
      }
    });
    wrap.appendChild(media);
  }

  if (toolCalls.length) {
    toolCalls.forEach((tc) => wrap.appendChild(renderToolCallBlock(tc)));
  }

  const body = document.createElement("div");
  body.textContent = text;
  wrap.appendChild(body);
  thread.appendChild(wrap);
  thread.scrollTop = thread.scrollHeight;
  return wrap;
}

function setBusy(busy) {
  $("agentsam-page-send") && ($("agentsam-page-send").disabled = busy);
  $("agentsam-page-input") && ($("agentsam-page-input").disabled = busy);
  $("agentsam-file-input") && ($("agentsam-file-input").disabled = busy);
}

async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file, file.name);
  if (conversationId) form.append("conversation_id", conversationId);

  const res = await fetch("/api/admin/agentsam/files/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");
  return data;
}

async function handleFilesSelected(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const remaining = MAX_ATTACHMENTS - pendingAttachments.length;
  if (remaining <= 0) return;

  for (const file of files.slice(0, remaining)) {
    if (file.size > MAX_FILE_BYTES) continue;
    try {
      const uploaded = await uploadFile(file);
      const previewUrl =
        uploaded.kind === "image" ? uploaded.preview_url : null;
      pendingAttachments.push({
        id: uploaded.attachment_id,
        attachment_id: uploaded.attachment_id,
        name: uploaded.file_name,
        mime_type: uploaded.mime_type,
        kind: uploaded.kind,
        size_bytes: uploaded.file_size_bytes,
        preview_url: previewUrl,
        url: uploaded.preview_url,
      });
    } catch (err) {
      appendBubble("assistant", err.message || "Upload failed.");
    }
  }
  renderAttachmentTray();
  $("agentsam-page-input")?.focus();
}

function renderAttachmentTray() {
  const tray = $("agentsam-attachments");
  if (!tray) return;
  tray.innerHTML = "";
  if (!pendingAttachments.length) {
    tray.hidden = true;
    return;
  }
  tray.hidden = false;
  pendingAttachments.forEach((attachment) => {
    const chip = document.createElement("div");
    chip.className = "agentsam-page-attachment";

    if (attachment.preview_url) {
      const img = document.createElement("img");
      img.className = "agentsam-page-attachment-thumb";
      img.src = attachment.preview_url;
      img.alt = attachment.name;
      chip.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.className = "agentsam-page-attachment-icon";
      icon.textContent = "FILE";
      chip.appendChild(icon);
    }

    const meta = document.createElement("div");
    meta.className = "agentsam-page-attachment-meta";
    meta.innerHTML = `<strong>${attachment.name}</strong><span>${formatBytes(attachment.size_bytes)}</span>`;
    chip.appendChild(meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "agentsam-page-attachment-remove";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      pendingAttachments = pendingAttachments.filter((a) => a.id !== attachment.id);
      renderAttachmentTray();
    });
    chip.appendChild(remove);
    tray.appendChild(chip);
  });
}

function attachmentPayload() {
  return pendingAttachments.map((a) => ({
    attachment_id: a.attachment_id,
    name: a.name,
    mime_type: a.mime_type,
    kind: a.kind,
    size_bytes: a.size_bytes,
  }));
}

function buildSendContext() {
  const ctx = {
    page: "/admin/agentsam",
    conversation_id: conversationId,
    has_image: pendingAttachments.some((a) => a.kind === "image"),
  };
  if (composeContext) {
    ctx.workflow_key = composeContext.workflow_key;
    ctx.task_type = composeContext.task_type;
    ctx.lane = composeContext.lane;
    ctx.mode = composeContext.mode;
  }
  return ctx;
}

async function sendMessage(text, actionContext = null) {
  const message = (text || "").trim();
  const outgoing = attachmentPayload();
  const ctx = actionContext || composeContext;
  if (!message && !outgoing.length) return;

  const displayAttachments = pendingAttachments.slice();
  appendBubble("user", message || "Review attached file(s).", { attachments: displayAttachments });
  setBusy(true);

  const runningTools = [];
  const typing = appendBubble("assistant", "Thinking…");
  typing?.classList.add("agentsam-page-typing");

  try {
    const res = await fetch("/api/admin/agentsam/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        message,
        attachments: outgoing,
        conversation_id: conversationId,
        workflow_key: ctx?.workflow_key,
        task_type: ctx?.task_type,
        lane: ctx?.lane,
        context: buildSendContext(),
      }),
    });
    const data = await res.json();
    typing?.remove();

    if (!res.ok) throw new Error(data.error || "Request failed");

    if (data.conversation_id) conversationId = data.conversation_id;

    const assistantWrap = appendBubble("assistant", data.reply, {
      routeChips: data.route_chips || [],
      toolCalls: data.tool_calls || [],
    });

    if (data.ai?.image_base64) {
      const img = document.createElement("img");
      img.src = `data:${data.ai.mime_type || "image/png"};base64,${data.ai.image_base64}`;
      img.alt = "Generated image";
      img.style.maxWidth = "240px";
      img.style.borderRadius = "12px";
      img.style.marginTop = "10px";
      assistantWrap?.appendChild(img);
    }

    pendingAttachments = [];
    renderAttachmentTray();
    composeContext = null;
    renderComposeModes();
    $("agentsam-page-input") && ($("agentsam-page-input").placeholder = "Ask anything");
    hydrateRecentActivity();
  } catch (err) {
    typing?.remove();
    appendBubble("assistant", err.message || "Something went wrong.");
  } finally {
    setBusy(false);
    const input = $("agentsam-page-input");
    if (input) {
      input.value = "";
      autoResize(input);
      input.focus();
    }
  }
}

function openFilePicker() {
  const input = $("agentsam-file-input");
  if (!input) return;
  input.value = "";
  input.click();
}

function closeToolMenu() {
  $("agentsam-tool-menu")?.setAttribute("hidden", "");
  $("agentsam-plus")?.setAttribute("aria-expanded", "false");
}

function toggleToolMenu() {
  const menu = $("agentsam-tool-menu");
  const plus = $("agentsam-plus");
  if (!menu || !plus) return;
  if (menu.hasAttribute("hidden")) {
    menu.removeAttribute("hidden");
    plus.setAttribute("aria-expanded", "true");
  } else {
    closeToolMenu();
  }
}

function renderMcpList(servers) {
  const list = $("agentsam-mcp-list");
  if (!list) return;
  list.innerHTML = "";

  (servers || []).forEach((s) => {
    const row = document.createElement("div");
    row.className = "agentsam-page-mcp";
    const icon =
      /inner animal|iam|mcp/i.test(s.display_name || s.name || "")
        ? `<img class="agentsam-page-mcp-icon" src="${iamLogoUrl || ""}" alt="">`
        : /github/i.test(s.display_name || s.name || "")
          ? `<span style="display:inline-flex;color:#ececec">${GITHUB_SVG}</span>`
          : "";
    row.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px">${icon}<span>${s.display_name || s.name}</span></span><small class="${s.connected || s.status === "READY" ? "is-ready" : ""}">${s.status || (s.connected ? "READY" : "—")}</small>`;
    list.appendChild(row);
  });
}

function renderChips(actions) {
  const box = $("agentsam-page-chips");
  if (!box) return;
  box.innerHTML = "";
  (actions || []).forEach((action) => {
    if (action.enabled === false) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      if (action.mode === "image") {
        composeContext = {
          mode: "image",
          label: "Creative Studio",
          workflow_key: action.workflow_key,
          task_type: action.task_type,
          lane: action.lane,
        };
        renderComposeModes();
        $("agentsam-page-input")?.focus();
        return;
      }
      sendMessage(action.prompt || "", action);
    });
    box.appendChild(btn);
  });
}

function applyPlusMenuConfig(config) {
  plusMenuConfig = config || {};
  const imageBtn = $("agentsam-menu-image");

  if (imageBtn && config.image) {
    imageBtn.textContent = config.image.label || "Create image";
    imageBtn.disabled = !config.image.enabled;
    imageBtn.hidden = config.image.enabled === false;
  }
}

async function hydrateRecentActivity() {
  const foot = document.querySelector(".console-sidenav-foot");
  if (!foot) return;

  let conversations = [];
  try {
    const res = await fetch("/api/admin/agentsam/conversations", { credentials: "include" });
    const data = await res.json();
    if (data.ok) conversations = data.conversations || [];
  } catch {
    return;
  }

  const label = foot.querySelector(".console-recent-label");
  foot.innerHTML = "";
  if (label) {
    const lbl = document.createElement("div");
    lbl.className = "console-recent-label";
    lbl.textContent = "Recent activity";
    foot.appendChild(lbl);
  } else {
    foot.innerHTML = `<div class="console-recent-label">Recent activity</div>`;
  }

  if (!conversations.length) {
    const empty = document.createElement("div");
    empty.className = "console-recent-empty";
    empty.textContent = "No recent AgentSam threads yet.";
    foot.appendChild(empty);
  } else {
    conversations.slice(0, 8).forEach((conv) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "console-recent-item is-agentsam";
      item.innerHTML = `${escapeHtml(conv.title || "Untitled")}<small>${formatRelativeTime(conv.last_active_unix)}</small>`;
      item.addEventListener("click", () => loadConversation(conv.id));
      foot.appendChild(item);
    });
  }

  const divider = document.createElement("div");
  divider.className = "console-sidenav-divider";
  foot.appendChild(divider);

  const settings = document.createElement("a");
  settings.href = "/admin/account";
  settings.className = "console-nav-item";
  settings.textContent = "Settings";
  foot.appendChild(settings);
}

async function loadConversation(id) {
  if (!id) return;
  conversationId = id;
  clearThreadUi();
  showThread();

  try {
    const res = await fetch(`/api/admin/agentsam/conversations/${encodeURIComponent(id)}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load thread");

    (data.messages || []).forEach((msg) => {
      appendBubble(msg.role === "user" ? "user" : "assistant", msg.content || "", {
        attachments: msg.attachments || [],
        routeChips: msg.routing
          ? [{ label: msg.routing.workflow_label || msg.routing.workflow_key, kind: "workflow" }]
          : [],
        toolCalls: msg.tool_calls || [],
      });
    });
  } catch (err) {
    appendBubble("assistant", err.message || "Could not load conversation.");
  }
}

function bindUi() {
  const form = $("agentsam-page-form");
  const input = $("agentsam-page-input");
  const plus = $("agentsam-plus");
  const menu = $("agentsam-tool-menu");
  const fileInput = $("agentsam-file-input");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(input?.value || "");
  });

  input?.addEventListener("input", () => autoResize(input));
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form?.requestSubmit();
    }
  });

  plus?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleToolMenu();
  });

  fileInput?.addEventListener("change", () => handleFilesSelected(fileInput.files));

  menu?.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-tool");
      closeToolMenu();
      if (key === "attach") {
        openFilePicker();
        return;
      }
      if (key === "image" && plusMenuConfig?.image?.enabled) {
        composeContext = {
          mode: "image",
          label: "Creative Studio",
          workflow_key: plusMenuConfig.image.workflow_key || "fnf_creative_studio",
          task_type: "image_generation",
          lane: "image",
        };
        renderComposeModes();
        input?.focus();
        return;
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu?.contains(e.target) && e.target !== plus) closeToolMenu();
  });

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeToolModal);
  });

  $("agentsam-tool-modal-copy")?.addEventListener("click", async () => {
    if (!modalToolCall) return;
    const text = [
      modalToolCall.display_name,
      modalToolCall.status,
      modalToolCall.input_preview,
      modalToolCall.output_preview,
      modalToolCall.error,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) {
    sendMessage(q);
    history.replaceState(null, "", "/admin/agentsam");
  } else {
    input?.focus();
  }
}

async function boot() {
  bindUi();
  try {
    const [toolsRes] = await Promise.all([
      fetch("/api/admin/agentsam/tools", { credentials: "include" }),
    ]);
    const data = await toolsRes.json();
    if (data.ok) {
      iamLogoUrl = data.iam_logo_url;
      renderMcpList(data.mcp_servers);
      renderChips(data.quick_actions);
      applyPlusMenuConfig(data.plus_menu);
    }
  } catch {
    renderChips([
      { label: "Write or edit", prompt: "Draft shop hero copy.", enabled: true },
    ]);
  }
  hydrateRecentActivity();
}

boot();
