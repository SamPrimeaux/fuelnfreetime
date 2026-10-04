/**
 * Pure, DOM-free helpers for the admin dock. Everything the dock knows about
 * routes, tabs and agent scope comes from one config object (the app manifest's
 * `dock` block). Nothing here is store-specific.
 *
 * Pattern semantics (used by tab.match and scope.match):
 *   "/admin/orders"     exact path (trailing slash ignored)
 *   "/admin/products/*" children only, not "/admin/products" itself
 *   "*"                 fallback, lowest priority
 * The longest matching pattern wins.
 */

/** Compact shell: the dock shows at or below this width (matches the shell drawer breakpoint). */
export const COMPACT_MAX_WIDTH = 900;

function cleanPath(p) {
  const s = String(p || "/").split("?")[0].split("#")[0];
  return s.length > 1 ? s.replace(/\/+$/, "") : s;
}

function normalizeAccent(value) {
  const accent = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(accent) ? accent : null;
}

export function patternScore(pathname, pattern) {
  const path = cleanPath(pathname);
  const pat = String(pattern || "");
  if (pat === "*") return 1;
  if (pat.endsWith("/*")) {
    const base = cleanPath(pat.slice(0, -2));
    return path.startsWith(base + "/") ? base.length + 2 : 0;
  }
  return path === cleanPath(pat) ? cleanPath(pat).length + 2 : 0;
}

function bestScore(pathname, patterns) {
  return patterns.reduce((max, p) => Math.max(max, patternScore(pathname, p)), 0);
}

export function normalizeDockConfig(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tabs)) return null;
  const tabs = raw.tabs
    .filter((t) => t && typeof t.id === "string" && typeof t.label === "string" && (t.href || t.action))
    .map((t) => ({
      id: t.id,
      label: t.label,
      icon: t.icon || t.id,
      href: t.href || null,
      action: t.action || null,
      match: Array.isArray(t.match) && t.match.length ? t.match : t.href ? [t.href, `${cleanPath(t.href)}/*`] : [],
    }));
  if (!tabs.length) return null;
  const scopes = (Array.isArray(raw.scopes) ? raw.scopes : [])
    .filter((s) => s && typeof s.id === "string" && s.match)
    .map((s) => ({
      id: s.id,
      label: s.label || s.id,
      match: Array.isArray(s.match) ? s.match : [s.match],
      chips: (Array.isArray(s.chips) ? s.chips : [])
        .filter((c) => c && c.label && c.prompt)
        .map((c) => ({ label: String(c.label), prompt: String(c.prompt) })),
    }));
  return {
    startHidden: raw.startHidden === true,
    tabs,
    scopes,
    agent: { label: (raw.agent && raw.agent.label) || "Agent" },
  };
}

export function resolveActiveTab(pathname, tabs) {
  let best = null;
  let bestS = 0;
  for (const tab of tabs) {
    const s = bestScore(pathname, tab.match);
    if (s > bestS) { best = tab; bestS = s; }
  }
  return best ? best.id : null;
}

export function resolveScope(pathname, scopes) {
  let best = null;
  let bestS = 0;
  for (const scope of scopes) {
    const s = bestScore(pathname, scope.match);
    if (s > bestS) { best = scope; bestS = s; }
  }
  return best;
}
