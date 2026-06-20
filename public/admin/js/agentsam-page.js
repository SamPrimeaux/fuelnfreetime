/**
 * AgentSam full-page chat — single input, intelligent routing, file attachments.
 */

const TOOL_PROMPTS = {
  image: "Generate a premium collection banner direction for Fuel n Freetime — rugged motorsports aesthetic.",
  research: "Deep research: what content and products should fuelnfreetime.com prioritize this quarter?",
  web: "Look up current motorsports apparel trends we should reflect on the shop.",
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_ATTACHMENTS = 6;
const MAX_TEXT_CHARS = 12000;
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "html",
  "css",
  "js",
  "ts",
  "tsx",
  "jsx",
  "xml",
  "yaml",
  "yml",
  "sql",
  "log",
]);

/** @type {Array<any>} */
let pendingAttachments = [];

function $(id) {
  return document.getElementById(id);
}

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function showThread() {
  const thread = $("agentsam-thread");
  const hero = $("agentsam-hero");
  if (thread) thread.hidden = false;
  if (hero) hero.style.display = "none";
}

function formatBytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isImageFile(file) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(file.name || "");
}

function isTextFile(file) {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json" || file.type === "application/javascript") return true;
  return TEXT_EXTENSIONS.has(fileExtension(file.name));
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

async function uploadImageToMedia(file) {
  const form = new FormData();
  form.append("files", file, file.name);
  form.append("prefix", "agentsam/chat/");

  const res = await fetch("/api/admin/media", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.ok || !data.assets?.length) {
    throw new Error(data.error || "Upload failed");
  }
  return data.assets[0];
}

async function buildAttachmentFromFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is too large (max ${formatBytes(MAX_FILE_BYTES)}).`);
  }

  if (isImageFile(file)) {
    const previewUrl = URL.createObjectURL(file);
    const attachment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mime_type: file.type || "image/jpeg",
      kind: "image",
      size_bytes: file.size,
      preview_url: previewUrl,
      url: null,
      image_base64: null,
    };

    if (file.size <= MAX_INLINE_IMAGE_BYTES) {
      const dataUrl = await readFileAsDataUrl(file);
      attachment.image_base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
    } else {
      const asset = await uploadImageToMedia(file);
      attachment.url = asset.url;
    }

    return attachment;
  }

  if (isTextFile(file)) {
    const text = (await readFileAsText(file)).slice(0, MAX_TEXT_CHARS);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mime_type: file.type || "text/plain",
      kind: "text",
      size_bytes: file.size,
      text_content: text,
    };
  }

  if (file.type === "application/pdf" || fileExtension(file.name) === "pdf") {
    throw new Error(`${file.name}: PDF text extraction is not supported yet. Paste text or attach an image.`);
  }

  throw new Error(`${file.name}: unsupported file type. Try images or text files (.txt, .md, .csv, .json).`);
}

function attachmentPayload(attachment) {
  const payload = {
    name: attachment.name,
    mime_type: attachment.mime_type,
    kind: attachment.kind,
    size_bytes: attachment.size_bytes,
  };
  if (attachment.url) payload.url = attachment.url;
  if (attachment.image_base64) payload.image_base64 = attachment.image_base64;
  if (attachment.text_content) payload.text_content = attachment.text_content;
  return payload;
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

    if (attachment.kind === "image" && attachment.preview_url) {
      const img = document.createElement("img");
      img.className = "agentsam-page-attachment-thumb";
      img.src = attachment.preview_url;
      img.alt = attachment.name;
      chip.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.className = "agentsam-page-attachment-icon";
      icon.textContent = attachment.kind === "text" ? "TXT" : "FILE";
      chip.appendChild(icon);
    }

    const meta = document.createElement("div");
    meta.className = "agentsam-page-attachment-meta";
    meta.innerHTML = `<strong>${attachment.name}</strong><span>${formatBytes(attachment.size_bytes)}</span>`;
    chip.appendChild(meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "agentsam-page-attachment-remove";
    remove.setAttribute("aria-label", `Remove ${attachment.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      if (attachment.preview_url) URL.revokeObjectURL(attachment.preview_url);
      pendingAttachments = pendingAttachments.filter((item) => item.id !== attachment.id);
      renderAttachmentTray();
    });
    chip.appendChild(remove);

    tray.appendChild(chip);
  });
}

function appendBubble(role, text, routing, attachments = []) {
  showThread();
  const thread = $("agentsam-thread");
  if (!thread) return null;

  const wrap = document.createElement("div");
  wrap.className = `agentsam-page-bubble agentsam-page-bubble--${role}`;

  if (role === "assistant" && routing) {
    const route = document.createElement("div");
    route.className = "agentsam-page-route";

    if (routing.workflow?.ui_label || routing.workflow?.name) {
      const chip = document.createElement("span");
      chip.textContent = routing.workflow.ui_label || routing.workflow.name;
      route.appendChild(chip);
    } else if (routing.classification?.intent) {
      const chip = document.createElement("span");
      chip.textContent = routing.classification.intent;
      route.appendChild(chip);
    }

    (routing.mcp_servers || []).forEach((mcp) => {
      const chip = document.createElement("span");
      chip.className = `is-mcp${mcp.status !== "ready" ? " is-planned" : ""}`;
      chip.textContent = `${mcp.name} · ${mcp.status}`;
      route.appendChild(chip);
    });

    if (route.childElementCount) wrap.appendChild(route);
  }

  if (attachments.length) {
    const media = document.createElement("div");
    media.className = "agentsam-page-bubble-attachments";

    attachments.forEach((attachment) => {
      if (attachment.kind === "image" && attachment.preview_url) {
        const img = document.createElement("img");
        img.src = attachment.preview_url;
        img.alt = attachment.name;
        media.appendChild(img);
      } else {
        const file = document.createElement("div");
        file.className = "agentsam-page-bubble-file";
        file.textContent = `${attachment.name} · ${formatBytes(attachment.size_bytes)}`;
        media.appendChild(file);
      }
    });

    wrap.appendChild(media);
  }

  const body = document.createElement("div");
  body.textContent = text;
  wrap.appendChild(body);
  thread.appendChild(wrap);
  thread.scrollTop = thread.scrollHeight;
  return wrap;
}

function setBusy(busy) {
  const send = $("agentsam-page-send");
  const input = $("agentsam-page-input");
  const fileInput = $("agentsam-file-input");
  if (send) send.disabled = busy;
  if (input) input.disabled = busy;
  if (fileInput) fileInput.disabled = busy;
}

function setStatus(message) {
  const status = $("agentsam-page-status");
  if (status && message) status.textContent = message;
}

async function sendMessage(text, attachments = pendingAttachments) {
  const message = (text || "").trim();
  const outgoing = attachments.map(attachmentPayload);
  if (!message && !outgoing.length) return;

  const displayAttachments = attachments.slice();
  appendBubble("user", message || "Review attached file(s).", null, displayAttachments);
  setBusy(true);

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
        context: {
          page: "/admin/agentsam",
          has_image: outgoing.some((a) => a.kind === "image" || a.image_base64 || a.url),
        },
      }),
    });
    const data = await res.json();
    typing?.remove();
    if (!res.ok) throw new Error(data.error || "Request failed");
    appendBubble("assistant", data.reply, data.routing);

    const status = $("agentsam-page-status");
    if (status && data.routing?.workflow?.name) {
      status.textContent = `Routed via ${data.routing.workflow.name} · ${data.routing.classification?.intent || "general"}`;
    }
    if (data.stub && status) {
      status.textContent = "Workers AI not bound — routing works; bind AGENTSAM_WAI for live replies.";
    }

    pendingAttachments.forEach((attachment) => {
      if (attachment.preview_url) URL.revokeObjectURL(attachment.preview_url);
    });
    pendingAttachments = [];
    renderAttachmentTray();
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

async function handleFilesSelected(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const remaining = MAX_ATTACHMENTS - pendingAttachments.length;
  if (remaining <= 0) {
    setStatus(`Maximum ${MAX_ATTACHMENTS} attachments per message.`);
    return;
  }

  const batch = files.slice(0, remaining);
  const errors = [];

  for (const file of batch) {
    try {
      const attachment = await buildAttachmentFromFile(file);
      pendingAttachments.push(attachment);
    } catch (err) {
      errors.push(err.message || String(err));
    }
  }

  renderAttachmentTray();

  if (errors.length) {
    setStatus(errors.join(" "));
  } else {
    setStatus("Attachments ready — add a prompt or send to review.");
  }

  $("agentsam-page-input")?.focus();
}

function closeToolMenu() {
  const menu = $("agentsam-tool-menu");
  const plus = $("agentsam-plus");
  menu?.setAttribute("hidden", "");
  plus?.setAttribute("aria-expanded", "false");
}

function toggleToolMenu() {
  const menu = $("agentsam-tool-menu");
  const plus = $("agentsam-plus");
  if (!menu || !plus) return;
  const open = menu.hasAttribute("hidden");
  if (open) {
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
    row.innerHTML = `<span>${s.display_name}</span><small class="${s.connected ? "is-ready" : ""}">${s.status}</small>`;
    list.appendChild(row);
  });
}

function renderChips(actions) {
  const box = $("agentsam-page-chips");
  if (!box) return;
  box.innerHTML = "";
  (actions || []).forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", () => sendMessage(action.prompt));
    box.appendChild(btn);
  });
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

  fileInput?.addEventListener("change", () => {
    handleFilesSelected(fileInput.files);
  });

  menu?.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-tool");
      closeToolMenu();
      if (key === "attach") {
        openFilePicker();
        return;
      }
      const prompt = TOOL_PROMPTS[key];
      if (prompt) sendMessage(prompt);
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu?.contains(e.target) && e.target !== plus) closeToolMenu();
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) {
    sendMessage(q);
    history.replaceState(null, "", "/admin/agentsam");
  } else {
    input?.focus();
  }
}

function renderGithubBanner(gh, connectUrls) {
  const box = $("agentsam-page-github");
  if (!box) return;

  const params = new URLSearchParams(location.search);
  const flash = params.get("github");

  if (gh?.connected) {
    box.hidden = false;
    box.className = "agentsam-page-github is-ok";
    box.textContent = `GitHub connected (${gh.scoped_repo}) · ${gh.login || gh.source || "ready"}`;
    if (flash) history.replaceState(null, "", "/admin/agentsam");
    return;
  }

  box.hidden = false;
  box.className = "agentsam-page-github";
  const connect = connectUrls?.fnf_github_oauth || "/api/admin/agentsam/github/start";
  let msg = `GitHub not connected for ${gh?.scoped_repo || "SamPrimeaux/fuelnfreetime"}. `;
  if (flash === "oauth_not_configured") {
    msg = "GitHub OAuth app not configured yet (FNF_GITHUB_CLIENT_ID/SECRET). Service token may still work. ";
  } else if (flash === "no_repo_access") {
    msg = "GitHub account connected but cannot access fuelnfreetime repo. ";
  } else if (flash === "connected") {
    msg = "GitHub connected. ";
  }
  box.innerHTML = `${msg}<a href="${connect}">Connect GitHub</a> (repo-scoped)`;
  if (flash) history.replaceState(null, "", "/admin/agentsam");
}

async function boot() {
  bindUi();
  try {
    const [toolsRes, ghRes] = await Promise.all([
      fetch("/api/admin/agentsam/tools", { credentials: "include" }),
      fetch("/api/admin/agentsam/github/status", { credentials: "include" }),
    ]);
    const data = await toolsRes.json();
    const gh = await ghRes.json();
    if (data.ok) {
      renderMcpList(data.mcp_servers);
      renderChips(data.quick_actions);
      renderGithubBanner(gh, data.connect_urls);
    }
  } catch {
    renderChips([
      { label: "Create an image", prompt: TOOL_PROMPTS.image },
      { label: "Write or edit", prompt: "Draft shop hero copy for the new collection drop." },
      { label: "Look something up", prompt: TOOL_PROMPTS.web },
    ]);
  }
}

boot();
