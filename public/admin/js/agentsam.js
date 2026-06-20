/**
 * Agent Sam — right-side assistant drawer (Workers AI via /api/admin/agentsam/chat)
 */

const AGENTSAM_PROMPTS = [
  "Summarize today's store activity",
  "Which products are low on stock?",
  "Draft hero copy for the shop page",
  "What should I publish next on the site?",
];

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
            <strong>Agent Sam</strong>
            <span id="agentsam-status">Store assistant</span>
          </div>
        </div>
        <button type="button" class="agentsam-close" id="agentsam-close" aria-label="Close Agent Sam">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>
      <div class="agentsam-messages" id="agentsam-messages" role="log" aria-live="polite"></div>
      <div class="agentsam-prompts" id="agentsam-prompts"></div>
      <form class="agentsam-compose" id="agentsam-form">
        <textarea id="agentsam-input" rows="2" placeholder="Ask anything about your store…" autocomplete="off"></textarea>
        <button type="submit" class="agentsam-send" id="agentsam-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </aside>
  `;

  agentsamOverlay().insertAdjacentHTML("beforeend", html);
}

function appendMessage(role, text) {
  const box = document.getElementById("agentsam-messages");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `agentsam-msg agentsam-msg--${role}`;
  el.textContent = text;
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

  try {
    const res = await fetch("/api/admin/agentsam/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        message,
        context: {
          page: location.pathname,
          slug: new URLSearchParams(location.search).get("slug") || undefined,
        },
      }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) throw new Error(data.error || "Request failed");
    appendMessage("assistant", data.reply);
    if (data.stub) {
      document.getElementById("agentsam-status").textContent = "Stub mode — bind Workers AI";
    }
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

  fetch("/api/admin/agentsam/status", { credentials: "include" })
    .then((r) => r.json())
    .then((d) => {
      if (d.ok && d.bound) {
        document.getElementById("agentsam-status").textContent = "Powered by Workers AI";
      }
    })
    .catch(() => {});
}

function initAgentsamDrawer() {
  renderAgentsamShell();
  bindAgentsamToggle();

  const prompts = document.getElementById("agentsam-prompts");
  if (prompts && !prompts.childElementCount) {
    AGENTSAM_PROMPTS.forEach((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "agentsam-chip";
      btn.textContent = label;
      btn.addEventListener("click", () => sendAgentsamMessage(label));
      prompts.appendChild(btn);
    });
  }

  const messages = document.getElementById("agentsam-messages");
  if (messages && !messages.childElementCount) {
    appendMessage(
      "assistant",
      "I'm Agent Sam — ask about products, inventory, pages, content, or what to publish next."
    );
  }

  bindAgentsamStaticHandlers();
}

window.openAgentsamDrawer = openAgentsamDrawer;
window.sendAgentsamMessage = sendAgentsamMessage;
window.initAgentsamDrawer = initAgentsamDrawer;
