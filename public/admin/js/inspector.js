/* App-owned contextual annotation UI. Sends only the reviewed selection and
 * comment, never an entire DOM, hidden fields, credentials, or input values. */
(() => {
  let host, root, active = false, target = null, selection = null;
  let conversationId, requestController;
  const watched = new WeakSet();
  function init() {
    const bar = document.querySelector(".console-topbar-actions");
    if (!bar || bar.querySelector("[data-inspect-toggle]")) return;
    const button = document.createElement("button");
    button.className = "console-icon-btn";
    button.dataset.inspectToggle = "true";
    button.textContent = "⌖";
    button.title = "Inspect & annotate";
    button.setAttribute("aria-label", "Inspect & annotate");
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => { active = !active; button.setAttribute("aria-pressed", String(active)); ensure(); root.querySelector(".hint").hidden = !active; if (!active) root.querySelector(".outline").hidden = true; });
    bar.prepend(button);
    watch(document);
    for (const frame of document.querySelectorAll("iframe")) {
      const attach = () => { try { if (frame.contentDocument) watch(frame.contentDocument, frame); } catch {} };
      frame.addEventListener("load", attach); attach();
    }
  }
  function ensure() {
    if (host?.isConnected) return;
    host = document.createElement("div");
    host.dataset.ecommerceInspector = "true";
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{position:fixed;inset:0;z-index:10000;pointer-events:none;font:14px/1.5 Inter,system-ui,sans-serif;color:#edf0e8}
      *{box-sizing:border-box}[hidden]{display:none!important}
      .outline{position:fixed;border:2px solid #8cab7c;border-radius:5px;background:#86ac7114;pointer-events:none}
      .hint{position:fixed;top:75px;left:50%;transform:translateX(-50%);max-width:90vw;background:#263022;padding:10px 16px;border-radius:24px;box-shadow:0 4px 24px #0003;text-align:center}
      .composer{position:fixed;width:220px;height:44px;background:rgba(255,255,255,.98);color:#1b211c;border:1px solid rgba(30,34,40,.13);border-radius:999px;padding:5px 7px;box-shadow:0 14px 38px #18201826;pointer-events:auto;transition:width .18s ease,height .18s ease,border-radius .18s ease}
      .composer::before{content:"";position:absolute;top:-7px;left:28px;width:12px;height:12px;background:#fff;border-left:1px solid rgba(30,34,40,.13);border-top:1px solid rgba(30,34,40,.13);transform:rotate(45deg)}
      .composer.expanded{width:min(360px,calc(100vw - 24px));height:auto;border-radius:18px;padding:9px}
      .composer-row{display:flex;align-items:center;gap:7px;height:32px}.composer-logo{width:25px;height:25px;border-radius:50%;object-fit:cover;flex:none}.composer textarea{width:100%;height:30px;min-height:30px;max-height:150px;resize:none;overflow:hidden;border:0;background:transparent;color:#1b211c;font:14px/1.35 system-ui;padding:5px 2px;margin:0;outline:0}.composer.expanded textarea{height:88px;overflow:auto;resize:vertical}.composer textarea::placeholder{color:#717971}.composer button{min-height:30px;border:0;border-radius:50%;padding:0;font:inherit;cursor:pointer;background:transparent;color:#556156;display:grid;place-items:center}.composer .send{background:#26352a;color:#fff;width:30px;height:30px;flex:none}.composer .mic{width:28px;height:30px;flex:none}.composer button:disabled{opacity:.5;cursor:wait}.composer .context,.composer label,.composer footer,.composer .reply,.composer .close{display:none}.composer .reply{white-space:pre-wrap;margin:8px 2px 0;color:#3c493d;font-size:13px}.composer.expanded .reply{display:block}.composer.thinking textarea{color:#7e55e8}.composer.thinking textarea::placeholder{color:#7e55e8}.composer.thinking{box-shadow:0 0 0 2px #8b5cf633,0 14px 38px #18201826}
      @media(max-width:600px){.composer{left:12px!important;right:12px;width:auto;bottom:max(12px,env(safe-area-inset-bottom));}.composer::before{display:none}.composer.expanded{width:auto}}
      :focus-visible{outline:3px solid #a7c692;outline-offset:3px}
    </style>
    <div class="outline" hidden></div><div class="hint" hidden>Tap an element to annotate · Esc to exit</div>
    <section class="composer" role="dialog" aria-label="Mini AgentSam composer" hidden>
      <div class="composer-row"><img class="composer-logo" src="https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ac515729-af6b-4ea5-8b10-e581a4d02100/thumbnail" alt="AgentSam"><textarea id="comment" rows="1" placeholder="Ask for changes"></textarea><button class="mic" aria-label="Talk to type"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg></button><button class="send" aria-label="Send"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M12 5l7 7-7 7"/></svg></button></div>
      <p class="context"></p><div class="reply" role="status" aria-live="polite"></div>
    </section>`;
    document.body.appendChild(host);
    root.querySelector("textarea").addEventListener("focus", () => root.querySelector(".composer").classList.add("expanded"));
    root.querySelector(".composer").addEventListener("click", () => root.querySelector(".composer").classList.add("expanded"));
    root.querySelector(".send").onclick = send;
    root.querySelector("textarea").addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); if (e.key === "Escape") close(); });
  }
  function close() {
    requestController?.abort(); active = false;
    root.querySelector(".composer").hidden = true;
    root.querySelector(".composer").classList.remove("expanded", "thinking");
    root.querySelector(".outline").hidden = true;
    root.querySelector(".hint").hidden = true;
    document.querySelector("[data-inspect-toggle]")?.setAttribute("aria-pressed", "false");
    document.querySelector("[data-inspect-toggle]")?.focus();
  }
  function bounds(el, frame) {
    const r = el.getBoundingClientRect(), offset = frame?.getBoundingClientRect();
    return { left: r.left + (offset?.left || 0), top: r.top + (offset?.top || 0), width: r.width, height: r.height };
  }
  function outline(el, frame) {
    const box = root.querySelector(".outline"), r = bounds(el, frame);
    Object.assign(box.style, { left:r.left+"px", top:r.top+"px", width:r.width+"px", height:r.height+"px" }); box.hidden = false;
  }
  function positionComposer(el, frame) {
    const box = root.querySelector(".composer"), r = bounds(el, frame);
    const width = Math.min(390, window.innerWidth - 24);
    let left = Math.max(12, Math.min(window.innerWidth - width - 12, r.left + r.width / 2 - width / 2));
    let top = r.top + r.height + 16;
    if (top + 180 > window.innerHeight) top = Math.max(12, r.top - 196);
    box.style.left = `${left}px`; box.style.top = `${top}px`; box.style.right = "auto"; box.style.bottom = "auto";
  }
  function watch(doc, frame) {
    if (watched.has(doc)) return; watched.add(doc);
    doc.addEventListener("pointerover", e => {
      if (!active || e.target === host || e.target.closest?.("[data-inspect-toggle]")) return;
      ensure(); outline(e.target, frame);
    }, true);
    doc.addEventListener("click", e => {
      if (!active || e.target === host || e.target.closest?.("[data-inspect-toggle]")) return;
      e.preventDefault(); e.stopImmediatePropagation(); ensure();
      target = e.target;
      selection = {
        page: location.pathname,
        frame: frame ? new URL(frame.src, location.href).pathname : undefined,
        tag: target.tagName?.toLowerCase(),
        id: target.id || undefined,
        section: target.closest("[data-section-id]")?.getAttribute("data-section-id"),
        label: target.getAttribute("aria-label") || target.getAttribute("alt") || "",
        text: /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable ? "[editable field; value withheld]" : (target.textContent || "").trim().slice(0, 400),
      };
      conversationId = undefined; active = false;
      outline(target, frame);
      root.querySelector(".hint").hidden = true;
      root.querySelector(".composer").hidden = false;
      root.querySelector(".composer").classList.remove("expanded", "thinking");
      const label = selection.label || selection.section || selection.text || selection.tag || "selected element";
      root.querySelector(".context").textContent = `Selected ${label}`;
      positionComposer(target, frame);
      root.querySelector(".reply").textContent = "";
      root.querySelector("textarea").value = "";
      root.querySelector("textarea").focus();
      document.querySelector("[data-inspect-toggle]")?.setAttribute("aria-pressed", "false");
    }, true);
    doc.addEventListener("keydown", e => { if (e.key === "Escape" && host?.isConnected) close(); });
  }
  async function send() {
    const text = root.querySelector("textarea").value.trim(), button = root.querySelector(".send");
    if (!text || !selection || button.disabled) return;
    const context = { ...selection };
    button.disabled = true;
    root.querySelector(".composer").classList.add("thinking");
    root.querySelector("textarea").placeholder = "MiniAgentSam is thinking…";
    try {
      window.openAgentsamDrawer?.();
      const message = `Annotation request: ${text}\nSelected element: ${context.label || context.section || context.tag || "UI element"}.`;
      if (window.sendAgentsamMessage) {
        window.sendAgentsamMessage(message);
        root.querySelector(".reply").textContent = "Sent to AgentSam · reply opened in the side drawer.";
      } else {
        throw new Error("AgentSam is unavailable. Your direction is retained.");
      }
    } catch (error) {
      if (error.name !== "AbortError") root.querySelector(".reply").textContent = error.message + " You can retry.";
    } finally { button.disabled = false; root.querySelector(".composer").classList.remove("thinking"); root.querySelector("textarea").placeholder = "Ask for changes"; }
  }
  window.initEcommerceInspector = init;
  init();
})();
