/**
 * Hydrates CMS-managed slots on marketing pages from D1/KV.
 * Also applies the generic editor settings contract and page section ordering.
 */
(function () {
  const pageSlug = document.documentElement.dataset.cmsPage;
  if (!pageSlug) return;

  function getPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  function editorStyle() {
    if (document.getElementById("cms-editor-runtime-style")) return;
    const style = document.createElement("style");
    style.id = "cms-editor-runtime-style";
    style.textContent = [
      '[data-cms-width="contained"]{width:min(100%,1200px)!important;margin-inline:auto!important}',
      '[data-cms-width="wide"]{width:min(100%,1440px)!important;margin-inline:auto!important}',
      '[data-cms-width="full-bleed"]{width:100%!important;max-width:none!important}',
      '@media(max-width:767px){[data-cms-hide-mobile="true"]{display:none!important}}'
    ].join("");
    document.head?.appendChild(style);
  }

  function resolveSlot(el, byKey) {
    const path = el.dataset.cms;
    if (!path) return null;

    const dot = path.indexOf(".");
    if (dot >= 0) {
      const sectionKey = path.slice(0, dot);
      const content = byKey[sectionKey];
      if (content) return { content, field: path.slice(dot + 1) };
    }

    const section = el.closest?.("[data-cms-section]");
    const sectionKey = section?.dataset.cmsSection;
    const content = sectionKey ? byKey[sectionKey] : null;
    if (!content) return null;
    return { content, field: path };
  }

  function applyEditorSettings(sectionEl, content) {
    const editor = content?.__editor;
    if (!editor || typeof editor !== "object") return;

    const visibility = editor.visibility || {};
    sectionEl.hidden = visibility.enabled === false;

    const layout = editor.layout || {};
    if (layout.width && layout.width !== "inherit") sectionEl.dataset.cmsWidth = layout.width;
    else delete sectionEl.dataset.cmsWidth;

    if (layout.alignment && layout.alignment !== "inherit") {
      sectionEl.style.textAlign = layout.alignment;
    } else {
      sectionEl.style.removeProperty("text-align");
    }
    if (Number.isFinite(Number(layout.columns))) {
      const columns = Math.max(1, Math.min(12, Number(layout.columns)));
      sectionEl.dataset.cmsColumns = String(columns);
      sectionEl.style.setProperty("--cms-layout-columns", String(columns));
    } else {
      delete sectionEl.dataset.cmsColumns;
      sectionEl.style.removeProperty("--cms-layout-columns");
    }

    const spacing = editor.spacing || {};
    if (Number.isFinite(Number(spacing.paddingTop))) {
      sectionEl.style.paddingTop = Number(spacing.paddingTop) + "px";
    }
    if (Number.isFinite(Number(spacing.paddingBottom))) {
      sectionEl.style.paddingBottom = Number(spacing.paddingBottom) + "px";
    }

    const appearance = editor.appearance || {};
    if (appearance.backgroundEnabled && appearance.backgroundColor) {
      sectionEl.style.backgroundColor = appearance.backgroundColor;
    } else {
      sectionEl.style.removeProperty("background-color");
    }

    const motion = editor.motion || {};
    if (motion.preset && motion.preset !== "inherit") sectionEl.dataset.hMotion = motion.preset;
    if (motion.intensity !== undefined && motion.intensity !== null && motion.intensity !== "") {
      sectionEl.dataset.hMotionIntensity = String(motion.intensity);
    }

    const responsive = editor.responsive || {};
    sectionEl.dataset.cmsHideMobile = responsive.hideMobile === true ? "true" : "false";
  }

  function rewriteCloneIdentity(node, fromKey, toKey) {
    node.dataset.cmsSection = toKey;
    node.querySelectorAll("[data-cms]").forEach((el) => {
      const value = el.dataset.cms || "";
      if (value.startsWith(fromKey + ".")) {
        el.dataset.cms = toKey + value.slice(fromKey.length);
      }
    });

    const idMap = new Map();
    node.querySelectorAll("[id]").forEach((el) => {
      const original = el.id;
      const next = original + "--" + toKey;
      idMap.set(original, next);
      el.id = next;
    });
    node.querySelectorAll("[href^='#']").forEach((el) => {
      const original = el.getAttribute("href").slice(1);
      if (idMap.has(original)) el.setAttribute("href", "#" + idMap.get(original));
    });
    node.querySelectorAll("[for]").forEach((el) => {
      const original = el.getAttribute("for");
      if (idMap.has(original)) el.setAttribute("for", idMap.get(original));
    });
    return node;
  }

  function ensureDynamicSections(sections) {
    const existing = new Map(
      Array.from(document.querySelectorAll("[data-cms-section]")).map((el) => [el.dataset.cmsSection, el])
    );
    const templateSnapshot = new Map(existing);

    for (const section of sections) {
      if (existing.has(section.key)) continue;
      const templateKey = section.content?.__editor?.templateKey;
      const template = templateKey ? templateSnapshot.get(templateKey) : null;
      if (!template) continue;
      const clone = rewriteCloneIdentity(template.cloneNode(true), templateKey, section.key);
      clone.dataset.cmsDynamic = "true";
      template.parentNode?.appendChild(clone);
      existing.set(section.key, clone);
    }
  }

  function applySectionOrder(sections) {
    const ordered = sections
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((section) => document.querySelector('[data-cms-section="' + CSS.escape(section.key) + '"]'))
      .filter(Boolean);

    const groups = new Map();
    for (const node of ordered) {
      if (!node.parentNode) continue;
      if (!groups.has(node.parentNode)) groups.set(node.parentNode, []);
      groups.get(node.parentNode).push(node);
    }
    for (const [parent, nodes] of groups) {
      for (const node of nodes) parent.appendChild(node);
    }
  }

  function rewriteBlockIdentity(node, fromId, toId, templateKey) {
    node.dataset.cmsBlock = toId;
    if (templateKey) node.dataset.cmsBlockTemplate = templateKey;
    node.querySelectorAll("[data-cms]").forEach((el) => {
      const value = el.dataset.cms || "";
      if (value.startsWith(fromId + ".")) {
        el.dataset.cms = toId + value.slice(fromId.length);
      }
    });
    if ((node.dataset.cms || "").startsWith(fromId + ".")) {
      node.dataset.cms = toId + node.dataset.cms.slice(fromId.length);
    }

    const idMap = new Map();
    node.querySelectorAll("[id]").forEach((el) => {
      const original = el.id;
      const next = original + "--" + toId;
      idMap.set(original, next);
      el.id = next;
    });
    node.querySelectorAll("[href^='#']").forEach((el) => {
      const original = el.getAttribute("href").slice(1);
      if (idMap.has(original)) el.setAttribute("href", "#" + idMap.get(original));
    });
    return node;
  }

  function applyBlocks(sectionEl, content) {
    const blockMeta = content?.__editor?.blocks;
    if (!Array.isArray(blockMeta)) return;

    const existing = new Map(
      Array.from(sectionEl.querySelectorAll("[data-cms-block]")).map((el) => [el.dataset.cmsBlock, el])
    );
    const templates = new Map();
    for (const el of existing.values()) {
      const templateKey = el.dataset.cmsBlockTemplate;
      if (templateKey && !templates.has(templateKey)) templates.set(templateKey, el.cloneNode(true));
    }

    const allowed = new Set(blockMeta.map((block) => block.id));
    for (const [id, node] of existing) {
      if (!allowed.has(id)) node.hidden = true;
    }

    for (const block of blockMeta) {
      let node = existing.get(block.id);
      if (!node) {
        const template = templates.get(block.templateKey);
        if (!template) continue;
        const sourceId = template.dataset.cmsBlock;
        node = rewriteBlockIdentity(template.cloneNode(true), sourceId, block.id, block.templateKey);
        template.parentNode?.appendChild(node);
        const anchor = Array.from(sectionEl.querySelectorAll("[data-cms-block-template]"))
          .find((candidate) => candidate.dataset.cmsBlockTemplate === block.templateKey);
        anchor?.parentNode?.appendChild(node);
        existing.set(block.id, node);
      }
      node.hidden = block.enabled === false;
    }

    const orderedNodes = blockMeta
      .map((block) => existing.get(block.id))
      .filter(Boolean);
    const groups = new Map();
    for (const node of orderedNodes) {
      if (!node.parentNode) continue;
      if (!groups.has(node.parentNode)) groups.set(node.parentNode, []);
      groups.get(node.parentNode).push(node);
    }
    for (const [parent, nodes] of groups) {
      for (const node of nodes) parent.appendChild(node);
    }
  }

  function applySections(sections) {
    editorStyle();
    const byKey = Object.fromEntries(sections.map((section) => [section.key, section.content || {}]));

    ensureDynamicSections(sections);
    applySectionOrder(sections);

    document.querySelectorAll("[data-cms-section]").forEach((sectionEl) => {
      const content = byKey[sectionEl.dataset.cmsSection];
      if (content) {
        applyEditorSettings(sectionEl, content);
        applyBlocks(sectionEl, content);
      }
    });

    document.querySelectorAll("[data-cms]").forEach((el) => {
      const resolved = resolveSlot(el, byKey);
      if (!resolved) return;

      const value = getPath(resolved.content, resolved.field);
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
      const pages = await Promise.all(slugs.map((entry) => fetchPage(entry, preview)));
      const sections = pages.filter(Boolean).flatMap((page) => page.sections || []);
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
