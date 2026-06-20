/**
 * Hydrates CMS-managed slots on marketing pages.
 * Static HTML remains the fallback if the API is unavailable.
 */
(function () {
  const page = document.documentElement.dataset.cmsPage;
  if (!page) return;

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
      } else {
        el.setAttribute(attr, value);
      }
    });

    document.documentElement.classList.add("cms-hydrated");
  }

  async function boot() {
    const preview = new URLSearchParams(location.search).has("preview");
    const url = `/api/cms/pages/${encodeURIComponent(page)}${preview ? "?preview=1" : ""}`;

    try {
      const res = await fetch(url, preview ? { credentials: "include" } : {});
      if (!res.ok) return;
      const data = await res.json();
      if (data?.page?.sections?.length) applySections(data.page.sections);
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
