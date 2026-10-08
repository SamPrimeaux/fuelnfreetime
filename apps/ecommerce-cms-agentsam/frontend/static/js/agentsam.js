/**
 * AgentSam Side Assistant — docked admin chat (/api/admin/agentsam/chat)
 */

let agentsamDockMode = "docked";

function agentsamMount() {
  return document.getElementById("agentsam-dock") || document.getElementById("console-overlay") || document.body;
}

function renderAgentsamShell() {
  if (document.getElementById("agentsam-drawer")) return;

  const dock = document.getElementById("agentsam-dock");
  agentsamDockMode = dock ? "docked" : "overlay";
  document.body.classList.toggle("agentsam-overlay-mode", agentsamDockMode === "overlay");

  const html = `
    ${agentsamDockMode === "overlay" ? '<div class="agentsam-backdrop drawer-mounted" id="agentsam-backdrop" aria-hidden="true"></div>' : ""}
    <div class="agentsam-drawer drawer-mounted" id="agentsam-drawer" aria-hidden="true" aria-label="AgentSam Side Assistant">
      <header class="agentsam-head">
        <div class="agentsam-brand">
          <span class="agentsam-mark" aria-hidden="true"></span>
          <div>
            <strong>AgentSam</strong>
            <span id="agentsam-status">Context-aware admin chat</span>
          </div>
        </div>
        <div data-assistant-actions="true"><button type="button" data-assistant-action="New chat" aria-label="Start a new chat" title="Start a new chat">＋</button><button type="button" data-assistant-action="Expand" aria-label="Expand Side Assistant" title="Expand Side Assistant">⤢</button></div>
        <span data-context-chip="true"></span>
        <button type="button" class="agentsam-close" id="agentsam-close" aria-label="Close AgentSam Side Assistant">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>
      <div class="agentsam-mcp" id="agentsam-mcp" hidden></div>
      <div class="agentsam-messages" id="agentsam-messages" role="log" aria-live="polite"></div>
      <form class="agentsam-compose" id="agentsam-form">
        <textarea id="agentsam-input" rows="2" placeholder="Ask about this page" autocomplete="off"></textarea>
        <button type="submit" class="agentsam-send" id="agentsam-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </div>
  `;

  agentsamMount().insertAdjacentHTML("beforeend", html);
}

function renderMcpBanner(data) {
  const box = document.getElementById("agentsam-mcp");
  if (!box) return;

  const servers = data?.mcp_servers || [];
  const urls = data?.connect_urls || {};
  const needsBridge = !data?.bridge_configured;
  const needsGithub = servers.some((s) => s.slug === "github" && !s.connected);
  const bridgeReady = data?.bridge_ready;

  if (!needsBridge && !needsGithub) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.hidden = false;
  const parts = [];
  if (needsBridge) {
    parts.push("Set <code>AGENTSAM_BRIDGE_KEY</code> on this Worker (same key as IAM MCP bridge).");
  } else if (bridgeReady) {
    parts.push("Inner Animal MCP bridge connected.");
  }
  if (needsGithub && urls.github_oauth) {
    parts.push(`<a href="${urls.github_oauth}">Connect GitHub</a>.`);
  } else if (needsGithub && urls.iam_github_oauth) {
    parts.push(`<a href="${urls.iam_github_oauth}" target="_blank" rel="noopener">Connect GitHub</a> in IAM for repo tools.`);
  }
  box.innerHTML = parts.join(" ");
}

function updateStatusLine(extra) {
  const status = document.getElementById("agentsam-status");
  if (!status) return;
  status.textContent = extra || "Context-aware admin chat";
}

function appendMessage(role, text, routing) {
  const box = document.getElementById("agentsam-messages");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `agentsam-msg agentsam-msg--${role}`;

  if (role === "assistant" && routing?.workflow?.ui_label) {
    const tag = document.createElement("div");
    tag.className = "agentsam-msg-route";
    tag.textContent = routing.workflow.ui_label;
    el.appendChild(tag);
  }

  const body = document.createElement("div");
  body.textContent = text;
  el.appendChild(body);
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function presentAgentsamProposal(options = {}) {
  initAgentsamDrawer();
  if (options.context) setAgentsamPageContext(options.context);
  openAgentsamDrawer();

  const box = document.getElementById("agentsam-messages");
  if (!box) return null;

  const card = document.createElement("section");
  card.className = "agentsam-msg agentsam-msg--assistant agentsam-proposal";
  card.setAttribute("aria-label", options.title || "AgentSam proposal");

  const route = document.createElement("div");
  route.className = "agentsam-msg-route";
  route.textContent = options.source || "miniAgentSam · proposal";
  card.appendChild(route);

  const title = document.createElement("strong");
  title.className = "agentsam-proposal-title";
  title.textContent = options.title || "Proposed change";
  card.appendChild(title);

  if (options.note) {
    const note = document.createElement("p");
    note.className = "agentsam-proposal-note";
    note.textContent = options.note;
    card.appendChild(note);
  }

  const editor = document.createElement("textarea");
  editor.className = "agentsam-proposal-text";
  editor.value = String(options.text || "");
  editor.setAttribute("aria-label", "Review proposed AgentSam text");
  card.appendChild(editor);

  const actions = document.createElement("div");
  actions.className = "agentsam-proposal-actions";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy";
  copy.addEventListener("click", () => {
    navigator.clipboard?.writeText(editor.value).catch(() => {
      updateStatusLine("Copy is unavailable in this browser.");
    });
  });
  actions.appendChild(copy);

  if (typeof options.onApply === "function") {
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "is-primary";
    apply.textContent = options.applyLabel || "Apply to draft";
    apply.addEventListener("click", async () => {
      try {
        const result = await options.onApply(editor.value);
        if (result === false) return;
        apply.disabled = true;
        apply.textContent = options.appliedLabel || "Applied";
      } catch (error) {
        updateStatusLine(error?.message || "Could not apply proposal.");
      }
    });
    actions.appendChild(apply);
  }

  card.appendChild(actions);
  box.appendChild(card);
  box.scrollTop = box.scrollHeight;
  return card;
}

function setBusy(busy) {
  const send = document.getElementById("agentsam-send");
  const input = document.getElementById("agentsam-input");
  if (send) send.disabled = busy;
  if (input) input.disabled = busy;
}

function buildAgentsamContext(extra = {}) {
  const ctx = {
    page: location.pathname,
    slug: new URLSearchParams(location.search).get("slug") || undefined,
    ...window.__agentsamPageContext,
    ...extra,
  };
  if (
    location.pathname === "/admin/content" &&
    typeof window.getSelectedMediaAssetIds === "function" &&
    !extra.selected_resource
  ) {
    const ids = window.getSelectedMediaAssetIds();
    if (Array.isArray(ids) && ids.length) {
      ctx.selected_resource = {
        type: "media_selection",
        surface: "content-library",
        ids: ids.slice(0, 100),
      };
    }
  }
  return ctx;
}

let drawerRequestActive = false;
let drawerConversationId = null;
async function sendAgentsamMessage(text, options = {}) {
  if (drawerRequestActive) throw new Error("AgentSam is already responding");
  const message = (text || "").trim();
  if (!message) return;

  drawerRequestActive = true;
  appendMessage("user", message);
  setBusy(true);

  const typing = document.createElement("div");
  typing.className = "agentsam-msg agentsam-msg--assistant agentsam-msg--typing";
  typing.textContent = "Thinking…";
  document.getElementById("agentsam-messages")?.appendChild(typing);

  try {
    const res = await fetch("/api/admin/agentsam/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      signal: options.signal,
      body: JSON.stringify({ message, conversation_id: drawerConversationId, context: buildAgentsamContext(options.context), attachments: options.attachments || [] }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) throw new Error(data.error || "Request failed");
    drawerConversationId = data.conversation_id || drawerConversationId;
    appendMessage("assistant", data.reply, data.routing);

    if (data.routing?.workflow?.ui_label) {
      updateStatusLine(`${data.routing.workflow.ui_label} · ${data.routing.classification?.source || "routed"}`);
    }
    if (data.stub) updateStatusLine("Stub mode — bind Workers AI");
    return data;
  } catch (err) {
    typing.remove();
    appendMessage("assistant", err.message || "Something went wrong.");
    if (options.propagateError) throw err;
  } finally {
    drawerRequestActive = false;
    setBusy(false);
    if (document.body.classList.contains("agentsam-open")) {
      document.getElementById("agentsam-input")?.focus();
    }
  }
}

function openAgentsamDrawer() {
  document.body.classList.add("agentsam-open");
  document.getElementById("agentsam-drawer")?.setAttribute("aria-hidden", "false");
  document.getElementById("agentsam-backdrop")?.setAttribute("aria-hidden", "false");
  document.getElementById("agentsam-dock")?.setAttribute("aria-hidden", "false");
  document.getElementById("agentsam-toggle")?.setAttribute("aria-expanded", "true");
  document.getElementById("agentsam-toggle")?.classList.add("is-agentsam-active");
  try {
    sessionStorage.setItem("fnf_agentsam_open", "1");
  } catch {
    /* ignore */
  }
  document.getElementById("agentsam-input")?.focus();
}

function closeAgentsamDrawer() {
  document.body.classList.remove("agentsam-open");
  document.getElementById("agentsam-drawer")?.setAttribute("aria-hidden", "true");
  document.getElementById("agentsam-backdrop")?.setAttribute("aria-hidden", "true");
  document.getElementById("agentsam-dock")?.setAttribute("aria-hidden", "true");
  document.getElementById("agentsam-toggle")?.setAttribute("aria-expanded", "false");
  document.getElementById("agentsam-toggle")?.classList.remove("is-agentsam-active");
  try {
    sessionStorage.setItem("fnf_agentsam_open", "0");
  } catch {
    /* ignore */
  }
}

function bindAgentsamToggle() {
  const toggle = document.getElementById("agentsam-toggle");
  if (!toggle || toggle.dataset.agentsamBound) return;
  toggle.dataset.agentsamBound = "1";
  toggle.addEventListener("click", () => {
    if (document.body.classList.contains("agentsam-open")) closeAgentsamDrawer();
    else openAgentsamDrawer();
  });
}

function bindAgentsamStaticHandlers() {
  if (window.__agentsamStaticHandlers) return;
  window.__agentsamStaticHandlers = true;

  document.getElementById("agentsam-close")?.addEventListener("click", closeAgentsamDrawer);
  document.getElementById("agentsam-backdrop")?.addEventListener("click", closeAgentsamDrawer);
  document.getElementById("agentsam-drawer")?.addEventListener("click", event => {
    const target = event.target.closest?.("[data-assistant-action]");
    if (!target) return;
    const action = target.getAttribute("data-assistant-action");
    if (action === "New chat") {
      drawerConversationId = null;
      const messages = document.getElementById("agentsam-messages");
      messages?.replaceChildren();
      appendMessage("assistant", "New chat ready. I can use the selected page or section as context.");
      document.getElementById("agentsam-input")?.focus();
    } else if (action === "Expand" || action === "Collapse") {
      const drawer = document.getElementById("agentsam-drawer");
      const expanded = !drawer.hasAttribute("data-expanded");
      drawer.toggleAttribute("data-expanded", expanded);
      target.setAttribute("data-assistant-action", expanded ? "Collapse" : "Expand");
      target.setAttribute("aria-label", expanded ? "Dock Side Assistant" : "Expand Side Assistant");
      target.title = expanded ? "Dock Side Assistant" : "Expand Side Assistant";
      target.textContent = expanded ? "⤡" : "⤢";
    }
  });

  document.getElementById("agentsam-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("agentsam-input");
    const val = input?.value || "";
    if (input) input.value = "";
    sendAgentsamMessage(val);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("agentsam-open") && agentsamDockMode === "overlay") {
      closeAgentsamDrawer();
    }
  });
}

async function loadAgentsamMeta() {
  try {
    const statusRes = await fetch("/api/admin/agentsam/status", { credentials: "include" });
    const status = await statusRes.json().catch(() => ({}));

    if (status.ok) {
      renderMcpBanner(status);
      if (status.bound) updateStatusLine();
    }

  } catch {
    /* offline */
  }
}

function initAgentsamDrawer() {
  renderAgentsamShell();
  bindAgentsamToggle();

  const messages = document.getElementById("agentsam-messages");
  if (messages && !messages.childElementCount) {
    appendMessage(
      "assistant",
      "Ask about this page, store operations, customers, content, or repository work. I’ll route the request using the current admin context."
    );
  }

  bindAgentsamStaticHandlers();
  loadAgentsamMeta();

  try {
    if (sessionStorage.getItem("fnf_agentsam_open") === "1") openAgentsamDrawer();
  } catch {
    /* ignore */
  }
}

function setAgentsamPageContext(ctx) {
  window.__agentsamPageContext = { ...(window.__agentsamPageContext || {}), ...ctx };
}

window.openAgentsamDrawer = openAgentsamDrawer;
window.closeAgentsamDrawer = closeAgentsamDrawer;
window.sendAgentsamMessage = sendAgentsamMessage;
window.presentAgentsamProposal = presentAgentsamProposal;
window.initAgentsamDrawer = initAgentsamDrawer;
window.setAgentsamPageContext = setAgentsamPageContext;
