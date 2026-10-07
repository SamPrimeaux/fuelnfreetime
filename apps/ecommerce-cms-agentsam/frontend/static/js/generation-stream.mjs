import { acceptGeneratedBlock, createTokenResolver } from "./generation-namespace.mjs";

export const SECTION_ORDER = ["definition", "markup", "css", "js", "settings"];
export const PHASE_LABELS = {
  definition: "Defining section",
  markup: "Writing markup",
  css: "Styling",
  js: "Adding motion",
  settings: "Defining settings",
  checking: "Checking",
  repairing: "Repairing",
  ready: "Ready",
  error: "Error",
};
export const GENERATION_PROMPT_PREFIX = [
  "Output tagged sections in order: <<<definition>>>, <<<markup>>>, <<<css>>>, <<<js>>>, <<<settings>>>.",
  "In <<<definition>>> emit one JSON object with kind ('section' or 'block'), a stable kebab-case type, a merchant-facing label, and optional settings schema.",
  "Write the literal token __UID__ for every generated id, class, custom element, and css variable.",
  "Do not write a namespace prefix. Do not emit eval, fetch, document.write, external src, or window.parent.",
  "Wrap markup in data-agentsam-block. Scope css under that wrapper. Wrap js in an IIFE.",
  "Declare settings as key=value lines. Reference every setting from css or markup.",
].join(" ");

export function parseGeneratedDefinition(text, fallback = {}) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(text || "").trim() || "{}");
  } catch {
    parsed = {};
  }
  const kind = parsed.kind === "block" ? "block" : "section";
  const type = String(parsed.type || fallback.type || "generated-section").trim().toLowerCase();
  const safeType = /^[a-z][a-z0-9-]{1,63}$/.test(type) ? type : "generated-section";
  const label = String(parsed.label || fallback.label || safeType.replace(/-/g, " ")).trim();
  return {
    kind,
    type: safeType,
    label,
    settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {},
    blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
  };
}

export function parseGeneratedSettings(text) {
  const out = {};
  String(text || "").split(/\r?\n/).forEach(function(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    if (!key) return;
    if (/^(true|false)$/i.test(raw)) {
      out[key] = raw.toLowerCase() === "true";
      return;
    }
    if (raw !== "" && Number.isFinite(Number(raw))) {
      out[key] = Number(raw);
      return;
    }
    out[key] = raw;
  });
  return out;
}

export function createPreviewSink() {
  return {
    text: "",
    append(chunk) {
      this.text += String(chunk == null ? "" : chunk);
    },
  };
}

export function createSectionParser() {
  let pending = "";
  let section = null;
  const parts = { definition: "", markup: "", css: "", js: "", settings: "" };
  return {
    parts,
    push(chunk) {
      const events = [];
      const input = pending + String(chunk || "");
      pending = "";
      let i = 0;
      while (i < input.length) {
        const open = input.indexOf("<<<", i);
        if (open === -1) {
          const rest = input.slice(i);
          if (rest.endsWith("<") || rest.endsWith("<<")) {
            pending = rest.slice(rest.lastIndexOf("<"));
            const head = rest.slice(0, rest.lastIndexOf("<"));
            if (section && head) {
              parts[section] += head;
              events.push({ section, text: head });
            }
          } else if (section && rest) {
            parts[section] += rest;
            events.push({ section, text: rest });
          }
          break;
        }
        if (open > i && section) {
          const text = input.slice(i, open);
          parts[section] += text;
          events.push({ section, text });
        }
        const close = input.indexOf(">>>", open + 3);
        if (close === -1) {
          pending = input.slice(open);
          break;
        }
        const name = input.slice(open + 3, close).trim();
        if (SECTION_ORDER.includes(name)) {
          section = name;
          events.push({ section, phase: PHASE_LABELS[name], text: "" });
        }
        i = close + 3;
      }
      return events;
    },
  };
}

export function createGenerationSession(options) {
  const controller = new AbortController();
  const sink = options.sink || createPreviewSink();
  const parser = createSectionParser();
  const resolver = createTokenResolver(options.blockId, options.namespace);
  let aborted = false;
  let record = null;
  const phases = [];
  return {
    id: options.id,
    signal: controller.signal,
    sink,
    phases,
    aborted() { return aborted; },
    record() { return record; },
    abort() {
      aborted = true;
      controller.abort();
      if (options.onAbort) options.onAbort();
    },
    async run() {
      return options.lock.run(options.id, async () => {
        try {
          const transport = options.transport;
          const consumeChunk = (chunk) => {
            if (aborted) return;
            for (const event of parser.push(chunk)) {
              if (event.phase) {
                phases.push(event.phase);
                if (options.onPhase) options.onPhase(event.phase);
              }
              if (event.text) sink.append(resolver.push(event.text));
            }
          };
          const response = await transport({
            signal: controller.signal,
            promptPrefix: GENERATION_PROMPT_PREFIX,
            model: options.model || "",
            onChunk: consumeChunk,
            onPhase: options.onPhase,
          });
          const chunks = response && response.chunks ? response.chunks : [];
          for (const chunk of chunks) consumeChunk(chunk);
          sink.append(resolver.flush());
          if (aborted) return { ok: false, aborted: true, record: null, saved: false };
          phases.push(PHASE_LABELS.checking);
          const accepted = acceptGeneratedBlock({
            html: parser.parts.markup,
            css: parser.parts.css,
            js: parser.parts.js,
          }, {
            blockId: options.blockId,
            namespace: options.namespace,
            model: options.model || "",
            prompt: options.prompt || "",
            repair: options.repair,
          });
          if (!accepted.ok) {
            phases.push(PHASE_LABELS.error);
            return { ok: false, saved: false, record: null, error: accepted.error, phases };
          }
          if (accepted.repaired) phases.push(PHASE_LABELS.repairing);
          record = {
            blockId: options.blockId,
            canonical: accepted.canonical,
            provenance: { ...accepted.provenance, ...(response?.provenance || {}) },
            definition: parseGeneratedDefinition(parser.parts.definition, {
              type: options.semanticType,
              label: options.semanticLabel,
            }),
            settings: parseGeneratedSettings(parser.parts.settings),
          };
          phases.push(PHASE_LABELS.ready);
          return { ok: true, saved: true, record, phases };
        } finally {
          if (aborted) record = null;
        }
      });
    },
  };
}
