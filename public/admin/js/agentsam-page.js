/**
 * AgentSam full-page chat — single input, intelligent routing.
 */

const TOOL_PROMPTS = {
  attach: "Review this attachment for Fuel & Free Time brand fit and suggest edits.",
  image: "Generate a premium collection banner direction for Fuel n Freetime — rugged motorsports aesthetic.",
  research: "Deep research: what content and products should fuelnfreetime.com prioritize this quarter?",
  web: "Look up current motorsports apparel trends we should reflect on the shop.",
};

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

function appendBubble(role, text, routing) {
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
  if (send) send.disabled = busy;
  if (input) input.disabled = busy;
}

async function sendMessage(text) {
  const message = (text || "").trim();
  if (!message) return;

  appendBubble("user", message);
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
        context: { page: "/admin/agentsam" },
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

  menu?.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-tool");
      closeToolMenu();
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

async function boot() {
  bindUi();
  try {
    const res = await fetch("/api/admin/agentsam/tools", { credentials: "include" });
    const data = await res.json();
    if (data.ok) {
      renderMcpList(data.mcp_servers);
      renderChips(data.quick_actions);
    }
  } catch {
    renderChips([
      { label: "Create an image", prompt: TOOL_PROMPTS.image },
      { label: "Write or edit", prompt: TOOL_PROMPTS.attach.replace("attachment", "shop hero copy") },
      { label: "Look something up", prompt: TOOL_PROMPTS.web },
    ]);
  }
}

boot();
