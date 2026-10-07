(function() {
  if (customElements.get("agentsam-composer")) return;
  class AgentSamComposer extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = '<div class="pill"><button type="button" data-add="true">+</button><span data-chip></span><input data-input /><button type="button" data-voice>Voice</button><span data-divider></span><button type="button" data-panel>Panel</button></div>';
      this.input = root.querySelector("[data-input]");
      this.chip = root.querySelector("[data-chip]");
      root.querySelector("[data-panel]").addEventListener("click", () => this.dispatchEvent(new CustomEvent("open-assistant", { bubbles: true })));
    }
    setChip(label) { this.chip.textContent = label || ""; }
    setPlaceholder(text) { this.input.placeholder = text || "Describe the change"; }
  }
  customElements.define("agentsam-composer", AgentSamComposer);
})();
