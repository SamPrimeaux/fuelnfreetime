/**
 * @inneranimalmedia/admin-dock — mobile/tablet glass dock.
 *
 * One capsule. The agent is a tab inside it (config: a tab with action "agent"), not a
 * separate button. Three presentations in the same capsule:
 *   nav      tabs from config
 *   edit     a page publishes save state; the capsule shows hint, discard, save (+ agent)
 *   compose  the agent tab morphs the capsule into a composer with scope chips
 * Swipe the capsule down to tuck it away (a small handle stays); swipe the handle up, or
 * tap it, to bring it back. In compose, swiping down closes the composer instead.
 *
 * Framework-neutral: the host passes config (the app manifest's `dock` block) and bindings.
 *
 *   mountAdminDock({ config, host: { send, open, openNav } })
 *
 * Pages in edit flows publish their save state with window.publishDockEdit(detail), or:
 *   window.__adminDockEdit = detail;
 *   document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail }));
 * where detail = { active, hint, dirty, canSave, saveLabel, onSave, discardHref, onDiscard }.
 */
import { COMPACT_MAX_WIDTH, normalizeDockConfig, resolveActiveTab, resolveScope } from "./scope.js";

export { COMPACT_MAX_WIDTH, normalizeDockConfig, resolveActiveTab, resolveScope };

const HIDDEN_KEY = "admin-dock:hidden";
const DRAG_START_PX = 10;
const HIDE_DISTANCE_PX = 44;
const FLICK_PX_PER_MS = 0.5;
const SHOW_DISTANCE_PX = 16;

const ICONS = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  products: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  orders: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  sparkle: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  chevronUp: '<path d="M6 15l6-6 6 6"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};

function icon(name, size = 22) {
  const body = ICONS[name] || ICONS.dot;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** The visitor's choice this session ("1" / "0"), or null when they have not swiped yet. */
function readHidden(win) {
  try {
    const v = win.sessionStorage.getItem(HIDDEN_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch { return null; }
}
function writeHidden(win, hidden) {
  try { win.sessionStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0"); } catch { /* storage unavailable: per-page only */ }
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
  const hasAgent = config.tabs.some((t) => t.action === "agent");

  const tabsHtml = config.tabs
    .map((tab) => {
      const current = tab.id === activeTab;
      const inner = `<span class="admin-dock__tab-icon">${icon(tab.icon)}</span><span class="admin-dock__tab-label">${esc(tab.label)}</span>`;
      if (tab.href) return `<a class="admin-dock__tab" href="${esc(tab.href)}" data-tab="${esc(tab.id)}"${current ? ' aria-current="page"' : ""}>${inner}</a>`;
      const agentCls = tab.action === "agent" ? " admin-dock__tab--agent" : "";
      return `<button type="button" class="admin-dock__tab${agentCls}" data-tab="${esc(tab.id)}" data-action="${esc(tab.action)}">${inner}</button>`;
    })
    .join("");

  const chipsHtml = (scope?.chips || [])
    .map((c, i) => `<button type="button" class="admin-dock__chip" data-chip="${i}">${esc(c.label)}</button>`)
    .join("");

  const root = doc.createElement("div");
  root.className = "admin-dock";
  root.setAttribute("data-admin-dock", "");
  root.setAttribute("data-mode", "nav");
  root.setAttribute("data-hidden", "false");
  if (config.agent.accent) root.style.setProperty("--admin-dock-accent", config.agent.accent);
  root.innerHTML = `
    <div class="admin-dock__veil" hidden></div>
    <div class="admin-dock__main">
      <div class="admin-dock__context" hidden>
        <div class="admin-dock__scope"><span>Scope</span><strong>${esc(scope?.label || "This page")}</strong></div>
        ${chipsHtml ? `<div class="admin-dock__chips">${chipsHtml}</div>` : ""}
        <p class="admin-dock__note" role="status" aria-live="polite" hidden></p>
      </div>
      <section class="admin-dock__peek" data-state="idle" aria-live="polite" hidden>
        <div class="admin-dock__peek-grab" aria-hidden="true"><span></span></div>
        <div class="admin-dock__peek-head">
          <strong>${esc(agentLabel)}</strong>
          <span class="admin-dock__peek-status"></span>
        </div>
        <p class="admin-dock__peek-text"></p>
        <div class="admin-dock__peek-actions">
          <button type="button" class="admin-dock__peek-link" data-peek-action="expand" hidden>Show more</button>
          <button type="button" class="admin-dock__peek-link admin-dock__peek-link--primary" data-peek-action="open">Open chat</button>
        </div>
      </section>
      <div class="admin-dock__bar">
        <button type="button" class="admin-dock__grab" aria-label="Hide navigation"><span></span></button>
        <nav class="admin-dock__panel admin-dock__tabs" aria-label="Quick navigation">${tabsHtml}</nav>
        <div class="admin-dock__panel admin-dock__edit" hidden>
          ${hasAgent ? `<button type="button" class="admin-dock__icon-btn admin-dock__icon-btn--agent" data-action="agent" aria-label="Ask ${esc(agentLabel)}">${icon("sparkle", 22)}</button>` : ""}
          <span class="admin-dock__hint" role="status" aria-live="polite"></span>
          <a class="admin-dock__icon-btn" data-edit="discard" href="#" aria-label="Discard changes">${icon("undo", 20)}</a>
          <button type="button" class="admin-dock__btn admin-dock__btn--primary" data-edit="save" disabled>Save</button>
        </div>
        <form class="admin-dock__panel admin-dock__compose" hidden>
          <button type="button" class="admin-dock__icon-btn" data-action="close-compose" aria-label="Close ${esc(agentLabel)}">${icon("close", 20)}</button>
          <input class="admin-dock__input" type="text" enterkeyhint="send" autocomplete="off" autocapitalize="sentences" placeholder="Ask ${esc(agentLabel)}…" aria-label="Message ${esc(agentLabel)}">
          <button type="submit" class="admin-dock__send" aria-label="Send">${icon("send", 20)}</button>
        </form>
      </div>
    </div>
    <button type="button" class="admin-dock__handle" aria-label="Show navigation">${icon("chevronUp", 18)}<span></span></button>`;
  doc.body.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const veil = $(".admin-dock__veil");
  const main = $(".admin-dock__main");
  const bar = $(".admin-dock__bar");
  const context = $(".admin-dock__context");
  const note = $(".admin-dock__note");
  const peekEl = $(".admin-dock__peek");
  const peekStatus = $(".admin-dock__peek-status");
  const peekTextEl = $(".admin-dock__peek-text");
  const peekExpand = $('[data-peek-action="expand"]');
  const peekOpen = $('[data-peek-action="open"]');
  const tabsPanel = $(".admin-dock__tabs");
  const editPanel = $(".admin-dock__edit");
  const composePanel = $(".admin-dock__compose");
  const input = $(".admin-dock__input");
  const sendEl = $(".admin-dock__send");
  const handle = $(".admin-dock__handle");
  const grab = $(".admin-dock__grab");
  const hintEl = $(".admin-dock__hint");
  const discardEl = $('[data-edit="discard"]');
  const saveEl = $('[data-edit="save"]');

  let composing = false;
  let busy = false;
  // Session choice wins; otherwise the manifest default (dock.startHidden, false unless set).
  let hidden = readHidden(win) ?? config.startHidden;
  let edit = null;
  let peek = { visible: false, state: "idle", text: "", expanded: false };

  function setNote(text) {
    note.textContent = text || "";
    note.hidden = !text;
  }

  function dismissPeek({ focus = false } = {}) {
    if (!peek.visible) return;
    peek = { visible: false, state: "idle", text: "", expanded: false };
    render();
    if (focus) bar.querySelector('[data-action="agent"]')?.focus?.({ preventScroll: true });
  }

  function setPeek(state, text = "") {
    peek = {
      visible: true,
      state,
      text: String(text || ""),
      expanded: false,
    };
    render();
  }

  function render() {
    const editing = Boolean(edit && edit.active);
    const mode = composing ? "compose" : editing ? "edit" : "nav";
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-hidden", String(hidden));
    tabsPanel.hidden = mode !== "nav";
    editPanel.hidden = mode !== "edit";
    composePanel.hidden = mode !== "compose";
    context.hidden = mode !== "compose";
    veil.hidden = !composing || hidden;
    peekEl.hidden = !peek.visible || hidden;
    peekEl.dataset.state = peek.state;
    peekEl.classList.toggle("is-expanded", peek.expanded);
    peekStatus.textContent = peek.state === "pending" ? "Thinking…" : peek.state === "error" ? "Needs attention" : "";
    peekTextEl.textContent = peek.text;
    peekTextEl.hidden = !peek.text;
    peekExpand.hidden = peek.state !== "success" || peek.text.length < 180;
    peekExpand.textContent = peek.expanded ? "Show less" : "Show more";
    peekOpen.disabled = typeof host.open !== "function";
    main.inert = hidden;
    handle.tabIndex = hidden ? 0 : -1;
    doc.body.classList.toggle("admin-dock-compose", composing);
    doc.body.classList.toggle("admin-dock-has-edit", editing);
    doc.body.classList.toggle("admin-dock-hidden", hidden);
    doc.body.classList.toggle("admin-dock-peek", peek.visible && !hidden);
    input.disabled = busy;
    sendEl.disabled = busy;
    if (editing) {
      hintEl.textContent = edit.hint || "";
      hintEl.classList.toggle("is-dirty", Boolean(edit.dirty));
      saveEl.textContent = edit.saveLabel || "Save";
      saveEl.disabled = !edit.canSave;
      discardEl.hidden = !(edit.discardHref || edit.onDiscard);
      discardEl.setAttribute("href", edit.discardHref || "#");
    }
  }

  function setHidden(next, { focus = false } = {}) {
    hidden = Boolean(next);
    if (hidden) composing = false;
    writeHidden(win, hidden);
    render();
    if (focus) (hidden ? handle : bar.querySelector(".admin-dock__tab, .admin-dock__btn"))?.focus?.();
  }

  function setComposing(next) {
    const shouldCompose = Boolean(next);
    if (shouldCompose) dismissPeek();
    composing = shouldCompose;
    if (composing && hidden) setHidden(false);
    setNote("");
    render();
    if (composing) input.focus();
    else bar.querySelector('[data-action="agent"]')?.focus?.({ preventScroll: true });
  }

  async function submit(text) {
    const prompt = String(text || "").trim();
    if (!prompt || busy) return;
    if (typeof host.send !== "function") {
      composing = false;
      setPeek("error", `${agentLabel} is not available on this page.`);
      return;
    }

    busy = true;
    setNote("");
    setPeek("pending");
    input.value = "";
    composing = false;
    render();

    try {
      const data = await Promise.resolve(host.send(prompt, {
        propagateError: true,
        context: { dock_scope: scope ? { id: scope.id, label: scope.label } : null },
      }));
      const reply = String(data?.reply || "").trim();
      if (!reply) throw new Error(`${agentLabel} returned no reply.`);
      setPeek("success", reply);
    } catch (err) {
      setPeek("error", err?.message || "Could not send.");
    } finally {
      busy = false;
      render();
    }
  }

  // ---- taps ----
  root.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.getAttribute("data-action");
    if (action === "agent") setComposing(!composing);
    else if (action === "close-compose") setComposing(false);
    else if (action === "nav") host.openNav?.();
  });
  composePanel.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });
  root.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => submit(scope.chips[Number(btn.dataset.chip)]?.prompt));
  });
  saveEl.addEventListener("click", () => edit?.onSave?.());
  discardEl.addEventListener("click", (event) => {
    if (edit?.onDiscard) {
      event.preventDefault();
      edit.onDiscard();
    } else if (!edit?.discardHref) {
      event.preventDefault();
    }
  });
  grab.addEventListener("click", () => (composing ? setComposing(false) : setHidden(true, { focus: true })));
  handle.addEventListener("click", () => setHidden(false, { focus: true }));

  peekEl.addEventListener("click", (event) => {
    const action = event.target.closest("[data-peek-action]")?.dataset.peekAction;
    if (action === "expand") {
      peek.expanded = !peek.expanded;
      render();
    } else if (action === "open") {
      host.open?.();
      dismissPeek();
    }
  });

  function onDocumentPointerDown(event) {
    if (peek.visible && !peekEl.contains(event.target)) dismissPeek();
  }
  function onDockKeyDown(event) {
    if (event.key !== "Escape") return;
    if (composing) setComposing(false);
    else if (peek.visible) dismissPeek({ focus: true });
  }
  doc.addEventListener("pointerdown", onDocumentPointerDown, true);
  doc.addEventListener("keydown", onDockKeyDown);

  // ---- peek card: swipe down dismisses it; upward expansion arrives with the half-sheet phase ----
  let peekDrag = null;
  peekEl.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("button")) return;
    peekDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: win.performance.now(), dy: 0, active: false };
  });
  peekEl.addEventListener("pointermove", (event) => {
    if (!peekDrag || event.pointerId !== peekDrag.id) return;
    const dx = event.clientX - peekDrag.x;
    const dy = event.clientY - peekDrag.y;
    if (!peekDrag.active) {
      if (Math.abs(dy) < DRAG_START_PX || Math.abs(dy) < Math.abs(dx)) return;
      if (dy < 0) { peekDrag = null; return; }
      peekDrag.active = true;
      peekEl.classList.add("is-dragging");
      try { peekEl.setPointerCapture(event.pointerId); } catch { /* synthetic or released pointer */ }
    }
    peekDrag.dy = Math.max(0, dy);
    peekEl.style.transform = `translateY(${peekDrag.dy}px)`;
    peekEl.style.opacity = String(Math.max(0.25, 1 - peekDrag.dy / 120));
  });
  function endPeekDrag(event) {
    if (!peekDrag || (event && event.pointerId !== peekDrag.id)) return;
    const { active, dy, t } = peekDrag;
    peekDrag = null;
    peekEl.classList.remove("is-dragging");
    peekEl.style.transform = "";
    peekEl.style.opacity = "";
    if (!active || event?.type === "pointercancel") return;
    const elapsed = Math.max(1, win.performance.now() - t);
    if (dy > HIDE_DISTANCE_PX || dy / elapsed > FLICK_PX_PER_MS) dismissPeek();
  }
  peekEl.addEventListener("pointerup", endPeekDrag);
  peekEl.addEventListener("pointercancel", endPeekDrag);

  // ---- swipe: down on the capsule hides it (closes the composer in compose); up on the handle shows it ----
  let swallowClick = false;
  function swallowNextClick() {
    swallowClick = true;
    win.setTimeout(() => { swallowClick = false; }, 60);
  }
  root.addEventListener("click", (event) => {
    if (!swallowClick) return;
    event.preventDefault();
    event.stopPropagation();
    swallowClick = false;
  }, true);

  let drag = null;
  bar.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("input")) return; // keep text selection and caret working
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: win.performance.now(), dy: 0, active: false };
  });
  bar.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) < DRAG_START_PX || Math.abs(dy) < Math.abs(dx)) return;
      if (dy < 0) { drag = null; return; }
      drag.active = true;
      root.classList.add("is-dragging");
      try { bar.setPointerCapture(event.pointerId); } catch { /* synthetic or released pointer */ }
    }
    drag.dy = Math.max(0, dy);
    main.style.transform = `translateY(${drag.dy}px)`;
    main.style.opacity = String(Math.max(0.35, 1 - drag.dy / 160));
  });
  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const { active, dy, t } = drag;
    drag = null;
    if (!active) return;
    root.classList.remove("is-dragging");
    main.style.transform = "";
    main.style.opacity = "";
    swallowNextClick();
    const elapsed = Math.max(1, win.performance.now() - t);
    if (event?.type === "pointercancel") return;
    if (dy > HIDE_DISTANCE_PX || dy / elapsed > FLICK_PX_PER_MS) {
      if (composing) setComposing(false);
      else setHidden(true);
    }
  }
  bar.addEventListener("pointerup", endDrag);
  bar.addEventListener("pointercancel", endDrag);

  let lift = null;
  handle.addEventListener("pointerdown", (event) => {
    lift = { id: event.pointerId, y: event.clientY };
  });
  handle.addEventListener("pointermove", (event) => {
    if (!lift || event.pointerId !== lift.id) return;
    if (lift.y - event.clientY > SHOW_DISTANCE_PX) {
      lift = null;
      swallowNextClick();
      setHidden(false);
    }
  });
  const endLift = () => { lift = null; };
  handle.addEventListener("pointerup", endLift);
  handle.addEventListener("pointercancel", endLift);

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
    const liftPx = Math.max(0, win.innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty("--admin-dock-kb", `${Math.round(liftPx)}px`);
  }
  vv?.addEventListener("resize", syncKeyboard);
  vv?.addEventListener("scroll", syncKeyboard);

  if (!doc.body.classList.contains("admin-dock-off")) doc.body.classList.add("admin-dock-active");
  render();

  return {
    root,
    setEdit,
    setComposing,
    setHidden,
    destroy() {
      mq.removeEventListener("change", syncVisible);
      vv?.removeEventListener("resize", syncKeyboard);
      vv?.removeEventListener("scroll", syncKeyboard);
      doc.removeEventListener("pointerdown", onDocumentPointerDown, true);
      doc.removeEventListener("keydown", onDockKeyDown);
      doc.body.classList.remove("admin-dock-active", "admin-dock-visible", "admin-dock-compose", "admin-dock-has-edit", "admin-dock-hidden", "admin-dock-peek");
      root.remove();
    },
  };
}
