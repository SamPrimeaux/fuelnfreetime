/**
 * Storefront URL aliases — keeps old Shopify paths working after cutover.
 */

const PAGE_ALIASES = new Map([
  ["/shop", "/shop.html"],
  ["/shop/", "/shop.html"],
  ["/about", "/about.html"],
  ["/about/", "/about.html"],
  ["/community", "/community.html"],
  ["/community/", "/community.html"],
  ["/pages/shop", "/shop.html"],
  ["/pages/shop/", "/shop.html"],
  ["/pages/community", "/community.html"],
  ["/pages/community/", "/community.html"],
  ["/pages/about", "/about.html"],
  ["/pages/about/", "/about.html"],
  ["/pages/cart", "/cart.html"],
  ["/pages/cart/", "/cart.html"],
  ["/cart", "/cart.html"],
  ["/cart/", "/cart.html"],
  ["/collections/high-octane-performance-gear", "/shop.html"],
  ["/collections/high-octane-performance-gear/", "/shop.html"],
  ["/collections/masters", "/shop.html"],
  ["/collections/masters/", "/shop.html"],
  ["/collections/essentials", "/shop.html"],
  ["/collections/essentials/", "/shop.html"],
]);

/** /pages/* → canonical clean paths (301) */
export const PAGES_CLEAN_REDIRECTS = new Map([
  ["/pages/shop", "/shop"],
  ["/pages/shop/", "/shop"],
  ["/pages/about", "/about"],
  ["/pages/about/", "/about"],
  ["/pages/community", "/community"],
  ["/pages/community/", "/community"],
  ["/pages/cart", "/cart"],
  ["/pages/cart/", "/cart"],
]);

/** Legacy .html URLs → clean paths (301) */
export const STORE_HTML_REDIRECTS = new Map([
  ["/shop.html", "/shop"],
  ["/about.html", "/about"],
  ["/community.html", "/community"],
  ["/cart.html", "/cart"],
]);

export function canonicalHost(hostname) {
  if (hostname === "www.fuelnfreetime.com") return "fuelnfreetime.com";
  return hostname;
}

export function redirectWww(request) {
  const url = new URL(request.url);
  const nextHost = canonicalHost(url.hostname);
  if (nextHost === url.hostname) return null;
  url.hostname = nextHost;
  return Response.redirect(url.toString(), 301);
}

export function resolveStorefrontPath(pathname) {
  return PAGE_ALIASES.get(pathname) || null;
}

export function serveStaticAlias(request, env, destPath) {
  const url = new URL(request.url);
  url.pathname = destPath;
  url.search = "";
  return env.ASSETS.fetch(new Request(url, request));
}
