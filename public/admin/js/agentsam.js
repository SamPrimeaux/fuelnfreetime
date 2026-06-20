/**
 * Agent Sam — right-side assistant drawer (Workers AI via /api/admin/agentsam/chat)
 */

let selectedWorkflowKey = null;
let drawerWorkflows = [];

function agentsamOverlay() {
  return document.getElementById("console-overlay") || document.body;
}

function renderAgentsamShell() {
  if (document.getElementById("agentsam-drawer")) return;

  const html = `
    <div class="agentsam-backdrop drawer-mounted" id="agentsam-backdrop" aria-hidden="true"></div>
    <aside class="agentsam-drawer drawer-mounted" id="agentsam-drawer" aria-hidden="true" aria-label="Agent Sam">
      <header class="agentsam-head">
        <div class="agentsam-brand">
          <div class="agentsam-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <strong>AgentSam</strong>
            <span id="agentsam-status">Store assistant</span>
          </div>
        </div>
        <button type="button" class="agentsam-close" id="agentsam-close" aria-label="Close Agent Sam">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>
      <div class="agentsam-workflows" id="agentsam-workflows" role="tablist" aria-label="Studio workflows"></div>
      <div class="agentsam-mcp" id="agentsam-mcp" hidden></div>
      <div class="agentsam-messages" id="agentsam-messages" role="log" aria-live="polite"></div>
      <div class="agentsam-prompts" id="agentsam-prompts"></div>
      <form class="agentsam-compose" id="agentsam-form">
        <textarea id="agentsam-input" rows="2" placeholder="Ask anything…" autocomplete="off"></textarea>
        <button type="submit" class="agentsam-send" id="agentsam-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </aside>
  `;

  agentsamOverlay().insertAdjacentHTML("beforeend", html);
}

function selectedWorkflowLabel() {
  if (!selectedWorkflowKey) return "Auto route";
  const wf = drawerWorkflows.find((w) => w.workflow_key === selectedWorkflowKey);
  return wf?.ui_label || wf?.display_name || selectedWorkflowKey;
}

function renderWorkflowPicker() {
  const box = document.getElementById("agentsam-workflows");
  if (!box) return;
  box.innerHTML = "";

  const auto = document.createElement("button");
  auto.type = "button";
  auto.className = `agentsam-workflow${selectedWorkflowKey ? "" : " is-active"}`;
  auto.textContent = "Auto";
  auto.title = "Route by intent";
  auto.addEventListener("click", () => {
    selectedWorkflowKey = null;
    renderWorkflowPicker();
    updateStatusLine();
  });
  box.appendChild(auto);

  drawerWorkflows.forEach((wf) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `agentsam-workflow${selectedWorkflowKey === wf.workflow_key ? " is-active" : ""}`;
    btn.textContent = wf.ui_label || wf.display_name;
    btn.title = wf.ui_description || wf.description || "";
    btn.addEventListener("click", () => {
      selectedWorkflowKey = wf.workflow_key;
      renderWorkflowPicker();
      updateStatusLine();
      const prompts = wf.suggested_prompts?.[0];
      if (prompts) document.getElementById("agentsam-input")?.setAttribute("placeholder", `Ask ${wf.ui_label}…`);
    });
    box.appendChild(btn);
  });
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
  if (needsGithub && urls.iam_github_oauth) {
    parts.push(`<a href="${urls.iam_github_oauth}" target="_blank" rel="noopener">Connect GitHub</a> in IAM for repo tools.`);
  }
  if (!needsGithub && bridgeReady) {
    parts.push(`<a href="${urls.iam_mcp_connect || "#"}" target="_blank" rel="noopener">MCP OAuth</a> optional for personal tokens.`);
  }
  box.innerHTML = parts.join(" ");
}

function updateStatusLine(extra) {
  const status = document.getElementById("agentsam-status");
  if (!status) return;
  const wf = selectedWorkflowLabel();
  status.textContent = extra || `${wf} · Workers AI`;
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

function setBusy(busy) {
  const send = document.getElementById("agentsam-send");
  const input = document.getElementById("agentsam-input");
  if (send) send.disabled = busy;
  if (input) input.disabled = busy;
}

async function sendAgentsamMessage(text) {
  const message = (text || "").trim();
  if (!message) return;

  appendMessage("user", message);
  setBusy(true);

  const typing = document.createElement("div");
  typing.className = "agentsam-msg agentsam-msg--assistant agentsam-msg--typing";
  typing.textContent = "Thinking…";
  document.getElementById("agentsam-messages")?.appendChild(typing);

  const context = {
    page: location.pathname,
    slug: new URLSearchParams(location.search).get("slug") || undefined,
  };
  if (selectedWorkflowKey) context.workflow_key = selectedWorkflowKey;

  try {
    const res = await fetch("/api/admin/agentsam/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, context }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) throw new Error(data.error || "Request failed");
    appendMessage("assistant", data.reply, data.routing);

    if (data.routing?.workflow?.ui_label) {
      updateStatusLine(`${data.routing.workflow.ui_label} · ${data.routing.classification?.source || "routed"}`);
    }
    if (data.stub) updateStatusLine("Stub mode — bind Workers AI");
  } catch (err) {
    typing.remove();
    appendMessage("assistant", err.message || "Something went wrong.");
  } finally {
    setBusy(false);
    document.getElementById("agentsam-input")?.focus();
  }
}

function openAgentsamDrawer() {
  document.body.classList.add("agentsam-open");
  document.getElementById("agentsam-drawer")?.setAttribute("aria-hidden", "false");
  document.getElementById("agentsam-backdrop")?.setAttribute("aria-hidden", "false");
  document.getElementById("agentsam-toggle")?.setAttribute("aria-expanded", "true");
  document.getElementById("agentsam-toggle")?.classList.add("is-agentsam-active");
  document.getElementById("agentsam-input")?.focus();
}

function closeAgentsamDrawer() {
  document.body.classList.remove("agentsam-open");
  document.getElementById("agentsam-drawer")?.setAttribute("aria-hidden", "true");
  document.getElementById("agentsam-backdrop")?.setAttribute("aria-hidden", "true");
  document.getElementById("agentsam-toggle")?.setAttribute("aria-expanded", "false");
  document.getElementById("agentsam-toggle")?.classList.remove("is-agentsam-active");
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

  document.getElementById("agentsam-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("agentsam-input");
    const val = input?.value || "";
    if (input) input.value = "";
    sendAgentsamMessage(val);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("agentsam-open")) {
      closeAgentsamDrawer();
    }
  });
}

async function loadAgentsamMeta() {
  try {
    const [statusRes, toolsRes] = await Promise.all([
      fetch("/api/admin/agentsam/status", { credentials: "include" }),
      fetch("/api/admin/agentsam/tools", { credentials: "include" }),
    ]);
    const status = await statusRes.json();
    const tools = await toolsRes.json();

    if (tools.ok && Array.isArray(tools.drawer_workflows)) {
      drawerWorkflows = tools.drawer_workflows;
      renderWorkflowPicker();
    }

    if (status.ok) {
      renderMcpBanner(status);
      if (status.bound) updateStatusLine();
    }

    const wf = drawerWorkflows[0];
    const prompts = document.getElementById("agentsam-prompts");
    if (prompts && !prompts.childElementCount) {
      const chips =
        wf?.suggested_prompts?.slice(0, 3) || [
          "Summarize today's store activity",
          "Draft hero copy for the shop page",
          "What should we publish next?",
        ];
      chips.forEach((label) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "agentsam-chip";
        btn.textContent = label;
        btn.addEventListener("click", () => sendAgentsamMessage(label));
        prompts.appendChild(btn);
      });
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
      "I'm AgentSam — pick a studio workflow or leave Auto. One input handles content, creative, brand, store ops, and repo work."
    );
  }

  bindAgentsamStaticHandlers();
  loadAgentsamMeta();
}

window.openAgentsamDrawer = openAgentsamDrawer;
window.sendAgentsamMessage = sendAgentsamMessage;
window.initAgentsamDrawer = initAgentsamDrawer;
