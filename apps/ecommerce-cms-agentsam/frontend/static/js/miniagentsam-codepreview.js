(function() {
  if (customElements.get("miniagentsam-codepreview")) return;
  class MiniAgentSamCodePreview extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = '<style>:host{display:block;position:relative;color:var(--te-text,#1c1c1b);font:12px/1.45 ui-monospace,monospace}pre{margin:0;max-height:280px;overflow:auto;white-space:pre-wrap}pre.is-follow{mask-image:linear-gradient(transparent,#000 12px,#000 calc(100% - 18px),transparent)}.phase{font:600 11px/1 system-ui;margin-bottom:6px}button{margin-top:8px}</style><div class="phase" role="status" aria-live="polite"></div><pre tabindex="0"></pre><button type="button">Stop</button>';
      this.phaseEl = root.querySelector(".phase");
      this.pre = root.querySelector("pre");
      this.pre.classList.add("is-follow");
      this.stopButton = root.querySelector("button");
      this.following = true;
      this.pre.addEventListener("scroll", () => {
        const distance = this.pre.scrollHeight - this.pre.scrollTop - this.pre.clientHeight;
        this.following = distance < 12;
        this.pre.classList.toggle("is-follow", this.following);
      });
      this.stopButton.addEventListener("click", () => this.dispatchEvent(new CustomEvent("stop", { bubbles: true })));
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) this.pre.classList.remove("is-follow");
    }
    setPhase(label) {
      this.phaseEl.textContent = label || "";
    }
    appendText(chunk) {
      this.pre.textContent += String(chunk == null ? "" : chunk);
      if (this.following) this.pre.scrollTop = this.pre.scrollHeight;
    }
    clear() {
      this.pre.textContent = "";
      this.phaseEl.textContent = "";
    }
  }
  customElements.define("miniagentsam-codepreview", MiniAgentSamCodePreview);
})();
