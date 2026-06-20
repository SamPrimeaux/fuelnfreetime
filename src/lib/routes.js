/**
 * Storefront URL aliases — keeps old Shopify paths working after cutover.
 */

const PAGE_ALIASES = new Map([
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
