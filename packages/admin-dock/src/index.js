/**
 * @inneranimalmedia/admin-dock — mobile/tablet glass dock.
 *
 * One capsule, three presentations (nav | compose | edit) plus a detached agent
 * orb. Framework-neutral: the host passes config (from the app manifest) and
 * three bindings. No store-specific strings, no env vars.
 *
 *   mountAdminDock({ config, host: { send, open, openNav } })
 *
 * Pages in edit flows publish their save state with:
 *   window.__adminDockEdit = detail;
 *   document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail }));
 * where detail = { active, hint, dirty, canSave, saveLabel, onSave, discardHref, onDiscard }.
 */
import { COMPACT_MAX_WIDTH, normalizeDockConfig, resolveActiveTab, resolveScope } from "./scope.js";

export { COMPACT_MAX_WIDTH, normalizeDockConfig, resolveActiveTab, resolveScope };

const ICONS = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  products: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  orders: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  sparkle: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  send: '<path d="M5 12h13M12 5l7 7-7 7"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};

function icon(name, size = 22) {
  const body = ICONS[name] || ICONS.dot;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function mountAdminDock(options = {}) {
  const doc = options.document || document;
  const win = doc.defaultView || window;
  const config = normalizeDockConfig(options.config);
  if (!config) return null;
  const host = options.host || {};
  const pathname = options.pathname || win.location.pathname;

  doc.querySelector("[data-admin-dock]")?.remove();

  const activeTab = resolveActiveTab(pathname, config.tabs);
  const scope = resolveScope(pathname, config.scopes);
  const agentLabel = config.agent.label;

  const tabsHtml = config.tabs
    .map((tab) => {
      const current = tab.id === activeTab;
      const inner = `${icon(tab.icon)}<span>${esc(tab.label)}</span>`;
      return tab.href
        ? `<a class="admin-dock__tab" href="${esc(tab.href)}" data-tab="${esc(tab.id)}"${current ? ' aria-current="page"' : ""}>${inner}</a>`
        : `<button type="button" class="admin-dock__tab" data-tab="${esc(tab.id)}" data-action="${esc(tab.action)}">${inner}</button>`;
    })
    .join("");

  const chipsHtml = (scope?.chips || [])
    .map((c, i) => `<button type="button" class="admin-dock__chip" data-chip="${i}">${esc(c.label)}</button>`)
    .join("");

  const root = doc.createElement("div");
  root.className = "admin-dock";
  root.setAttribute("data-admin-dock", "");
  root.setAttribute("data-mode", "nav");
  root.innerHTML = `
    <div class="admin-dock__main">
      <div class="admin-dock__context" hidden>
        <div class="admin-dock__scope"><span>Scope</span><strong>${esc(scope?.label || "This page")}</strong></div>
        ${chipsHtml ? `<div class="admin-dock__chips">${chipsHtml}</div>` : ""}
        <p class="admin-dock__note" role="status" aria-live="polite" hidden></p>
      </div>
      <div class="admin-dock__bar">
        <nav class="admin-dock__panel admin-dock__tabs" aria-label="Quick navigation">${tabsHtml}</nav>
        <div class="admin-dock__panel admin-dock__edit" hidden>
          <span class="admin-dock__hint" role="status" aria-live="polite"></span>
          <a class="admin-dock__btn" data-edit="discard" href="#">Discard</a>
          <button type="button" class="admin-dock__btn admin-dock__btn--primary" data-edit="save" disabled>Save</button>
        </div>
        <form class="admin-dock__panel admin-dock__compose" hidden>
          <input class="admin-dock__input" type="text" enterkeyhint="send" autocomplete="off" autocapitalize="sentences" placeholder="Ask ${esc(agentLabel)}…" aria-label="Message ${esc(agentLabel)}">
          <button type="submit" class="admin-dock__send" aria-label="Send">${icon("send", 20)}</button>
        </form>
      </div>
    </div>
    <button type="button" class="admin-dock__orb" aria-label="Ask ${esc(agentLabel)}" aria-expanded="false">
      <span class="admin-dock__orb-open">${icon("sparkle", 24)}</span>
      <span class="admin-dock__orb-close">${icon("close", 22)}</span>
    </button>`;
  doc.body.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const context = $(".admin-dock__context");
  const note = $(".admin-dock__note");
  const tabsPanel = $(".admin-dock__tabs");
  const editPanel = $(".admin-dock__edit");
  const composePanel = $(".admin-dock__compose");
  const input = $(".admin-dock__input");
  const orb = $(".admin-dock__orb");
  const hintEl = $(".admin-dock__hint");
  const discardEl = $('[data-edit="discard"]');
  const saveEl = $('[data-edit="save"]');

  let composing = false;
  let busy = false;
  let edit = null;

  function setNote(text) {
    note.textContent = text || "";
    note.hidden = !text;
  }

  function render() {
    const editing = Boolean(edit && edit.active);
    const mode = composing ? "compose" : editing ? "edit" : "nav";
    root.setAttribute("data-mode", mode);
    tabsPanel.hidden = mode !== "nav";
    editPanel.hidden = mode !== "edit";
    composePanel.hidden = mode !== "compose";
    context.hidden = mode !== "compose";
    orb.setAttribute("aria-expanded", String(composing));
    orb.setAttribute("aria-label", composing ? `Close ${agentLabel} composer` : `Ask ${agentLabel}`);
    doc.body.classList.toggle("admin-dock-compose", composing);
    doc.body.classList.toggle("admin-dock-has-edit", editing);
    input.disabled = busy;
    if (editing) {
      hintEl.textContent = edit.hint || "";
      hintEl.classList.toggle("is-dirty", Boolean(edit.dirty));
      saveEl.textContent = edit.saveLabel || "Save";
      saveEl.disabled = !edit.canSave;
      discardEl.hidden = !(edit.discardHref || edit.onDiscard);
      discardEl.setAttribute("href", edit.discardHref || "#");
    }
  }

  function setComposing(next) {
    composing = Boolean(next);
    setNote("");
    render();
    if (composing) input.focus();
  }

  async function submit(text) {
    const prompt = String(text || "").trim();
    if (!prompt || busy) return;
    if (typeof host.send !== "function") {
      setNote(`${agentLabel} is not available on this page.`);
      return;
    }
    busy = true;
    setNote("");
    render();
    try {
      const pending = Promise.resolve(host.send(prompt, { context: { dock_scope: scope ? { id: scope.id, label: scope.label } : null } }));
      // A rejected send (agent busy, not loaded) lands almost immediately; a real reply takes longer.
      const early = await Promise.race([
        pending.then(() => null, (err) => err || new Error("Could not send.")),
        new Promise((resolve) => setTimeout(() => resolve(null), 60)),
      ]);
      if (early) throw early;
      host.open?.();
      input.value = "";
      composing = false;
    } catch (err) {
      setNote(err?.message || "Could not send.");
    } finally {
      busy = false;
      render();
    }
  }

  orb.addEventListener("click", () => setComposing(!composing));
  composePanel.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });
  root.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => submit(scope.chips[Number(btn.dataset.chip)]?.prompt));
  });
  root.querySelectorAll('[data-action="nav"]').forEach((btn) => btn.addEventListener("click", () => host.openNav?.()));
  saveEl.addEventListener("click", () => edit?.onSave?.());
  discardEl.addEventListener("click", (event) => {
    if (edit?.onDiscard) {
      event.preventDefault();
      edit.onDiscard();
    } else if (!edit?.discardHref) {
      event.preventDefault();
    }
  });
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && composing) setComposing(false);
  });

  function setEdit(detail) {
    edit = detail && detail.active ? detail : null;
    render();
  }
  doc.addEventListener("admin-dock:edit", (event) => setEdit(event.detail));
  if (win.__adminDockEdit) setEdit(win.__adminDockEdit);

  // Visibility follows the compact-shell breakpoint; CSS keys off these classes.
  const mq = win.matchMedia(`(max-width: ${COMPACT_MAX_WIDTH}px)`);
  function syncVisible() {
    root.classList.toggle("is-visible", mq.matches);
    doc.body.classList.toggle("admin-dock-visible", mq.matches);
    if (!mq.matches && composing) setComposing(false);
  }
  mq.addEventListener("change", syncVisible);
  syncVisible();

  // Keep the dock above the on-screen keyboard (iOS keeps fixed elements on the layout viewport).
  const vv = win.visualViewport;
  function syncKeyboard() {
    if (!vv) return;
    const lift = Math.max(0, win.innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty("--admin-dock-kb", `${Math.round(lift)}px`);
  }
  vv?.addEventListener("resize", syncKeyboard);
  vv?.addEventListener("scroll", syncKeyboard);

  doc.body.classList.add("admin-dock-active");
  render();

  return {
    root,
    setEdit,
    setComposing,
    destroy() {
      mq.removeEventListener("change", syncVisible);
      vv?.removeEventListener("resize", syncKeyboard);
      vv?.removeEventListener("scroll", syncKeyboard);
      doc.body.classList.remove("admin-dock-active", "admin-dock-visible", "admin-dock-compose", "admin-dock-has-edit");
      root.remove();
    },
  };
}
