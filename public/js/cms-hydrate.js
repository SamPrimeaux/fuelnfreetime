/**
 * Hydrates CMS-managed slots on marketing pages from D1/KV (no stub fallback).
 * Loads page content + global site brand section.
 */
(function () {
  const pageSlug = document.documentElement.dataset.cmsPage;
  if (!pageSlug) return;

  function getPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  function applySections(sections) {
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s.content || {}]));

    document.querySelectorAll("[data-cms]").forEach((el) => {
      const path = el.dataset.cms;
      if (!path) return;
      const dot = path.indexOf(".");
      if (dot < 0) return;

      const sectionKey = path.slice(0, dot);
      const field = path.slice(dot + 1);
      const content = byKey[sectionKey];
      if (!content) return;

      const value = getPath(content, field);
      if (value == null || value === "") return;

      const attr = el.dataset.cmsAttr || "textContent";
      if (attr === "textContent") {
        el.textContent = value;
      } else if (attr === "innerHTML") {
        el.innerHTML = value;
      } else if (attr === "style.backgroundImage" && typeof value === "string") {
        el.style.backgroundImage = `url('${value.replace(/'/g, "\\'")}')`;
      } else {
        el.setAttribute(attr, value);
      }
    });

    document.documentElement.classList.add("cms-hydrated");
  }

  async function fetchPage(slug, preview) {
    const url = `/api/cms/pages/${encodeURIComponent(slug)}${preview ? "?preview=1" : ""}`;
    const res = await fetch(url, preview ? { credentials: "include" } : {});
    if (!res.ok) return null;
    const data = await res.json();
    return data?.page || null;
  }

  async function boot() {
    const preview = new URLSearchParams(location.search).has("preview");
    const slugs = pageSlug === "site" ? ["site"] : ["site", pageSlug];

    try {
      const pages = await Promise.all(slugs.map((s) => fetchPage(s, preview)));
      const sections = pages.filter(Boolean).flatMap((p) => p.sections || []);
      if (sections.length) applySections(sections);
    } catch {
      /* static HTML fallback */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
