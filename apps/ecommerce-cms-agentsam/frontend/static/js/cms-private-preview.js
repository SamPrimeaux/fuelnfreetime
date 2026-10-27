/**
 * Read-only viewer of the SAME CMS draft consumed by Theme Studio.
 * Runs behind the existing /admin session gate; never publishes a page or
 * mutates CMS state. A missing public route is not a missing draft preview.
 */
const params = new URLSearchParams(location.search);
const slug = params.get("slug") || "";
const theme = params.get("theme") || "heuristic";
const valid = /^[a-z0-9-]{1,100}$/;
const sourcePages = new Set(["about", "collaborate", "community", "home", "policies", "shop", "terms", "cart", "product", "collection", "collections", "order-confirmation"]);
const title = document.getElementById("page-name");
const frame = document.getElementById("draft-frame");
const edit = document.getElementById("editor-link");

function errorView(message) {
  const panel = document.createElement("div");
  panel.className = "draft-error";
  const heading = document.createElement("h1");
  heading.textContent = "Draft preview unavailable";
  const body = document.createElement("p");
  body.textContent = message;
  panel.append(heading, body);
  frame.replaceWith(panel);
}
async function read(path) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in to preview this draft." : "CMS draft unavailable (" + response.status + ").");
  const data = await response.json();
  if (!data?.page) throw new Error("This account does not have the requested CMS page.");
  return data.page;
}
function applyFields(node, sections) {
  for (const section of sections || []) {
    const root = [...node.querySelectorAll("[data-cms-section]")].find(el=>el.getAttribute("data-cms-section") === section.key);
    if (!root) continue;
    const content=section.content || {};
    for (const target of root.querySelectorAll("[data-cms]")) {
      const key = target.getAttribute("data-cms");
      const value = content[key];
      if (typeof value !== "string" && typeof value !== "number") continue;
      if (target.matches("img")) target.setAttribute("src", String(value));
      else if (target.matches("a") && /href|link|url/i.test(key)) target.setAttribute("href", String(value));
      else target.textContent = String(value);
    }
  }
}
async function sourceHeuristic(page, site) {
  // Exact original Heuristic document and its CSS; not a synthetic generic
  // page. For a slug without an implemented source template, report that
  // specific missing theme adapter, never show an unrelated storefront page.
  const sourceSlug = slug === "products" ? "shop" : slug;
  if (!sourcePages.has(sourceSlug)) throw new Error("Heuristic has no full-page source template for " + slug + ". Select Revise or FNF for this CMS document.");
  const response = await fetch("/admin/theme-previews/heuristic/" + sourceSlug + ".html", { credentials:"same-origin",cache:"no-store" });
  if (!response.ok) throw new Error("Heuristic source template unavailable (" + response.status + ").");
  const doc = new DOMParser().parseFromString(await response.text(), "text/html");
  doc.querySelectorAll("script").forEach(el=>el.remove());
  // Keep the authentic Heuristic header/footer implementation; omit the
  // public CMS hydrator, analytics, commerce mutations and checkout scripts.
  for (const source of ["/js/store-shell.js", "/js/global-footer.js"]) {
    const script=doc.createElement("script");script.src=source;script.defer=true;doc.body.append(script);
  }
  doc.querySelectorAll('meta[name="robots"]').forEach(el=>el.remove());
  const robots=doc.createElement("meta");robots.name="robots";robots.content="noindex,nofollow";doc.head.append(robots);
  applyFields(doc,site?.sections);
  applyFields(doc,page?.sections);
  // Page CSS and original authored markup remain as delivered by the full
  // theme package, including interactive fields and background styles.
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
async function show() {
  if (!valid.test(slug) || !valid.test(theme)) throw new Error("Invalid CMS preview parameters.");
  title.textContent = slug;
  edit.href = "/admin/theme-editor?slug=" + encodeURIComponent(slug) + "&theme=" + encodeURIComponent(theme);
  const [page,site] = await Promise.all([
    read("/api/admin/cms/pages/" + encodeURIComponent(slug)),
    read("/api/admin/cms/pages/site"),
  ]);
  title.textContent = page.title || slug;
  document.getElementById("theme-name").textContent = theme.toUpperCase();
  const registry=window.ThemeStudioPreview;
  if (!registry?.getTheme(theme)) throw new Error("Theme source renderer not registered: " + theme);
  const html = theme==="heuristic" ? await sourceHeuristic(page,site) : registry.render(theme,page,site);
  if (!html || !/<main(?:\s|>)/i.test(html)) throw new Error("Selected full theme did not return a complete page renderer.");
  frame.srcdoc=html;
}
show().catch(error => errorView(error.message || String(error)));
