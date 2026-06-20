/**
 * Sitewide navigation — defaults + matching (store_settings JSON).
 */

export const DEFAULT_LOGO_URL =
  "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail";

export const DEFAULT_NAV_ITEMS = [
  { id: "home", label: "Home", href: "/", matchPrefixes: ["/", "/index.html"] },
  {
    id: "shop",
    label: "Shop",
    href: "/shop.html",
    matchPrefixes: ["/shop", "/products/", "/collections/"],
  },
  { id: "about", label: "About", href: "/about.html", matchPrefixes: ["/about"] },
  {
    id: "community",
    label: "Community",
    href: "/community.html",
    matchPrefixes: ["/community"],
  },
];

export const DEFAULT_NAV_CONFIG = {
  logoUrl: DEFAULT_LOGO_URL,
  logoHeight: 68,
  brandAccent: "#ff4500",
  brandAccentLight: "#E5A558",
  items: DEFAULT_NAV_ITEMS,
};

export function normalizePath(pathname) {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  return p.toLowerCase();
}

/** Longest matching prefix wins */
export function matchNavItem(pathname, items) {
  const path = normalizePath(pathname);
  let best = null;
  let bestLen = -1;

  for (const item of items) {
    const prefixes = item.matchPrefixes?.length ? item.matchPrefixes : [item.href];
    for (const raw of prefixes) {
      const prefix = normalizePath(raw.replace(/\.html$/, "") || "/");
      const hrefNorm = normalizePath(item.href.replace(/\.html$/, "") || "/");

      if (prefix === "/" && path === "/") {
        if (1 > bestLen) {
          best = item;
          bestLen = 1;
        }
        continue;
      }
      if (prefix === "/" && path !== "/") continue;

      const candidates = [prefix, hrefNorm];
      for (const cand of candidates) {
        if (cand === "/") continue;
        if (path === cand || path.startsWith(cand + "/") || path.startsWith(cand)) {
          const len = cand.length;
          if (len > bestLen) {
            best = item;
            bestLen = len;
          }
        }
      }
    }
  }

  return best;
}

export function sanitizeNavItems(items) {
  if (!Array.isArray(items)) return DEFAULT_NAV_ITEMS;
  const out = items
    .map((item, idx) => {
      const label = String(item?.label || "").trim().slice(0, 40);
      const href = String(item?.href || "").trim().slice(0, 512);
      if (!label || !href || !href.startsWith("/")) return null;
      const matchPrefixes = Array.isArray(item.matchPrefixes)
        ? item.matchPrefixes
            .map((p) => String(p).trim().slice(0, 512))
            .filter((p) => p.startsWith("/"))
        : [href];
      return {
        id: String(item.id || `nav-${idx}`).slice(0, 40),
        label,
        href,
        matchPrefixes: matchPrefixes.length ? matchPrefixes : [href],
        visible: item.visible !== false,
      };
    })
    .filter(Boolean);
  return out.length ? out : DEFAULT_NAV_ITEMS;
}

export function resolveNavConfig(settings = {}) {
  return {
    logoUrl: String(settings.navLogoUrl || DEFAULT_NAV_CONFIG.logoUrl).slice(0, 2048),
    logoHeight: Math.min(120, Math.max(40, Number(settings.navLogoHeight) || DEFAULT_NAV_CONFIG.logoHeight)),
    brandAccent: String(settings.navBrandAccent || DEFAULT_NAV_CONFIG.brandAccent).slice(0, 32),
    brandAccentLight: String(settings.navBrandAccentLight || DEFAULT_NAV_CONFIG.brandAccentLight).slice(0, 32),
    items: sanitizeNavItems(settings.navItems),
  };
}

export function mergeNavIntoSettings(settings, navPatch) {
  const next = { ...settings };
  if (navPatch.logoUrl != null) next.navLogoUrl = navPatch.logoUrl;
  if (navPatch.logoHeight != null) next.navLogoHeight = navPatch.logoHeight;
  if (navPatch.brandAccent != null) next.navBrandAccent = navPatch.brandAccent;
  if (navPatch.brandAccentLight != null) next.navBrandAccentLight = navPatch.brandAccentLight;
  if (navPatch.items != null) next.navItems = sanitizeNavItems(navPatch.items);
  return next;
}
