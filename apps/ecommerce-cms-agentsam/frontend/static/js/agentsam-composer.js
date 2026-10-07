(function() {
  if (customElements.get("agentsam-composer")) return;
  class AgentSamComposer extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = '<style>:host{display:block}.pill{display:flex;align-items:center;gap:7px;border:1px solid rgba(127,127,127,.22);border-radius:999px;padding:6px 8px;background:var(--surface,#fff)}input{min-width:0;flex:1;border:0;outline:0;background:transparent;font:inherit}button{border:0;background:transparent;cursor:pointer}.send{font-size:18px;line-height:1}</style><div class="pill"><button type="button" data-add="true" aria-label="Add">+</button><span data-chip></span><input data-input /><button type="button" data-voice>Voice</button><span data-divider></span><button type="button" data-panel>Panel</button><button class="send" type="button" data-send aria-label="Send">↑</button></div>';
      this.input = root.querySelector("[data-input]");
      this.chip = root.querySelector("[data-chip]");
      root.querySelector("[data-panel]").addEventListener("click", () => this.dispatchEvent(new CustomEvent("open-assistant", { bubbles: true })));
      const submit = () => {
        const text = String(this.input.value || "").trim();
        if (!text) return;
        this.dispatchEvent(new CustomEvent("submit-request", {
          bubbles: true,
          detail: { text },
        }));
      };
      root.querySelector("[data-send]").addEventListener("click", submit);
      this.input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        submit();
      });
    }
    setChip(label) { this.chip.textContent = label || ""; }
    setPlaceholder(text) { this.input.placeholder = text || "Describe the change"; }
  }
  customElements.define("agentsam-composer", AgentSamComposer);
})();
