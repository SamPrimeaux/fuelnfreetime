export const DEFAULT_NAMESPACE = "agentsam";
export const UID_TOKEN = "__UID__";
const BLOCK_ID_MAX = 40;

export function sanitizeNamespace(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
  return /^[a-z]/.test(raw) ? raw : DEFAULT_NAMESPACE;
}

export function readNamespace(manifest) {
  const value = manifest && manifest.generation && manifest.generation.namespace;
  if (typeof value !== "string" || !value.trim()) return DEFAULT_NAMESPACE;
  return sanitizeNamespace(value);
}

export function sanitizeBlockId(blockId) {
  let raw = String(blockId || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!raw || !/^[a-z]/.test(raw)) raw = "b" + raw;
  return raw.slice(0, BLOCK_ID_MAX).replace(/-$/g, "") || "block";
}

export function nsForms(instanceId, namespace = DEFAULT_NAMESPACE) {
  const ns = sanitizeNamespace(namespace);
  const id = sanitizeBlockId(instanceId);
  const js = ns + "_gen_" + id.replace(/-/g, "_");
  const css = ns + "-gen-" + id;
  return {
    namespace: ns,
    instanceId: id,
    // Compatibility alias for callers written before the placed-instance
    // identity contract was made explicit.
    blockId: id,
    js,
    css,
    customElement: css,
    cssVarPrefix: "--" + css + "-",
    settingVarPrefix: "--" + css + "-setting-",
    scope: '[data-agentsam-block="' + id + '"]',
    token: UID_TOKEN,
  };
}

export function createTokenResolver(blockId, namespace) {
  const forms = nsForms(blockId, namespace);
  let pending = "";
  return {
    forms,
    push(chunk) {
      const input = pending + String(chunk == null ? "" : chunk);
      pending = "";
      let out = "";
      let i = 0;
      while (i < input.length) {
        if (input[i] !== "_") {
          out += input[i++];
          continue;
        }
        const rest = input.slice(i);
        if (rest.startsWith(UID_TOKEN)) {
          out += forms.css;
          i += UID_TOKEN.length;
          continue;
        }
        if (UID_TOKEN.startsWith(rest)) {
          pending = rest;
          break;
        }
        out += input[i++];
      }
      return out;
    },
    flush() {
      const rest = pending;
      pending = "";
      return rest;
    },
  };
}

export function resolveUidToken(code, blockId, namespace) {
  const resolver = createTokenResolver(blockId, namespace);
  return resolver.push(code) + resolver.flush();
}

function hashPrompt(prompt) {
  let hash = 2166136261;
  const text = String(prompt || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function provenanceRecord(input = {}) {
  return {
    generator: "agentsam",
    namespace: sanitizeNamespace(input.namespace || DEFAULT_NAMESPACE),
    model: String(input.model || ""),
    promptHash: hashPrompt(input.prompt || ""),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function detectProvenance(code) {
  const text = String(code || "");
  if (text.includes(UID_TOKEN) || /agentsam[-_]gen[-_]/.test(text) || /"generator"\s*:\s*"agentsam"/.test(text)) return "agentsam";
  if (/ai_gen_/.test(text)) return "foreign-ai";
  return "unknown";
}

const GLOBAL_SELECTOR = /(^|[,{]\s*)(body|html|header|footer|main|:root|\*)\b/;

export function lintGeneratedBlock(resolved, forms) {
  const violations = [];
  const html = String(resolved.html || "");
  const css = String(resolved.css || "");
  const js = String(resolved.js || "");
  const scope = 'data-agentsam-block="' + forms.blockId + '"';
  if (!html.includes(scope)) violations.push("markup must be wrapped in " + forms.scope);
  const ids = html.match(/\sid="([^"]+)"/g) || [];
  ids.forEach(function(attr) {
    if (!attr.includes(forms.css)) violations.push("id missing namespace: " + attr);
  });
  const classes = html.match(/\sclass="([^"]+)"/g) || [];
  classes.forEach(function(attr) {
    attr.slice(attr.indexOf('"') + 1, -1).split(/\s+/).filter(Boolean).forEach(function(name) {
      if (!name.startsWith(forms.css)) violations.push("class missing namespace: " + name);
    });
  });
  const tags = html.match(/<([a-z][a-z0-9-]*)\b/g) || [];
  tags.forEach(function(tag) {
    const name = tag.slice(1);
    if (name.includes("-") && !name.startsWith(forms.css)) violations.push("custom element missing namespace: " + name);
  });
  const vars = css.match(/--[a-z0-9-]+/g) || [];
  vars.forEach(function(name) {
    if (!name.startsWith(forms.cssVarPrefix.slice(0, -1)) && !name.startsWith(forms.cssVarPrefix)) violations.push("css var missing namespace: " + name);
  });
  if (GLOBAL_SELECTOR.test(css)) violations.push("bare global selector");
  if (!css.includes(forms.scope) && css.trim()) violations.push("css must be scoped under " + forms.scope);
  const trimmedJs = js.trim();
  if (trimmedJs && !/^\(\s*function\b|^\(\s*\(\s*\)\s*=>|^export\b/.test(trimmedJs)) violations.push("js must be an IIFE or module");
  if (/(^|\n)\s*(var|let|const)\s+[A-Za-z_$]/.test(trimmedJs) && !/^\(/.test(trimmedJs) && !trimmedJs.startsWith("export")) violations.push("top-level binding");
  if (/window\.[A-Za-z_$][\w$]*\s*=/.test(js)) violations.push("window write");
  if (/customElements\.define\s*\(/.test(js) && !/customElements\.get\s*\(/.test(js)) violations.push("customElements.define without get() guard");
  const surface = [html, css, js].join(String.fromCharCode(10));
  const denied = [
    [/\beval\s*\(/, "eval"],
    [/new\s+Function\s*\(/, "new Function"],
    [/document\.write\s*\(/, "document.write"],
    [/document\.cookie/, "document.cookie"],
    [/\bfetch\s*\(/, "fetch"],
    [/XMLHttpRequest/, "XMLHttpRequest"],
    [/\bWebSocket\s*\(/, "WebSocket"],
    [/importScripts\s*\(/, "importScripts"],
    [/window\.(parent|top)\b/, "window.parent/top"],
    [/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i, "external src/href"],
    [/(?:src|href)\s*=\s*["']javascript:/i, "javascript url"],
  ];
  denied.forEach(function(rule) {
    if (rule[0].test(surface)) violations.push("denied: " + rule[1]);
  });
  return { ok: violations.length === 0, violations };
}

export function acceptGeneratedBlock(canonical, options = {}) {
  const forms = nsForms(options.blockId, options.namespace);
  const resolve = function(code) {
    return {
      html: resolveUidToken(code.html, options.blockId, options.namespace),
      css: resolveUidToken(code.css, options.blockId, options.namespace),
      js: resolveUidToken(code.js, options.blockId, options.namespace),
    };
  };
  let current = canonical;
  let lint = lintGeneratedBlock(resolve(current), forms);
  let repaired = false;
  if (!lint.ok && typeof options.repair === "function") {
    repaired = true;
    current = options.repair(current, lint.violations) || current;
    lint = lintGeneratedBlock(resolve(current), forms);
  }
  if (!lint.ok) {
    return { ok: false, saved: false, repaired, violations: lint.violations, error: lint.violations.join("; ") };
  }
  return {
    ok: true,
    saved: true,
    repaired,
    canonical: current,
    resolved: resolve(current),
    forms,
    provenance: provenanceRecord({ namespace: forms.namespace, model: options.model, prompt: options.prompt }),
  };
}

export function scanSections(sections) {
  return (sections || []).map(function(section) {
    return {
      key: section && section.key || "",
      provenance: detectProvenance(JSON.stringify(section || {})),
      rewrite: false,
    };
  });
}

export async function persistScanReport(report, write) {
  try {
    if (typeof write === "function") await write(report);
    return { ok: true, fatal: false };
  } catch (error) {
    return { ok: false, fatal: false, error: String(error && error.message || error) };
  }
}

export function gateGeneratedSave(body) {
  const blob = JSON.stringify(body || {});
  if (detectProvenance(blob) !== "agentsam") return { ok: true };
  const blockId = (body && (body.blockId || body.block_key)) || "block";
  const namespace = body && (body.namespace || (body.provenance && body.provenance.namespace));
  const forms = nsForms(blockId, namespace);
  const code = (body && (body.code || body.canonical)) || { html: blob, css: "", js: "" };
  const lint = lintGeneratedBlock({
    html: code.html || "",
    css: code.css || "",
    js: code.js || "",
  }, forms);
  if (!lint.ok) return { ok: false, status: 422, error: lint.violations.join("; "), violations: lint.violations };
  return { ok: true };
}

export async function guardSectionWrite(body, write) {
  const gate = gateGeneratedSave(body);
  if (!gate.ok) return { ok: false, status: gate.status, error: gate.error, written: false };
  if (typeof write === "function") await write(body);
  return { ok: true, written: true };
}
