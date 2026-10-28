/**
 * Media Library dock adapter — existing media-library.js remains the only owner of
 * selection, albums, gallery, optimization, inspector and asset CRUD.
 * This bridge routes mobile dock actions to those same accessible controls.
 */
const $ = (selector) => document.querySelector(selector);

export function mountMediaWorkspaceDock() {
  const owner = "media-library";
  let selectedIds = window.getSelectedMediaAssetIds?.() || [];
  let detailId = document.body.classList.contains("media-detail-active")
    ? Number(new URL(window.location.href).searchParams.get("asset")) || null
    : null;

  const getBatch = (action) => $('[data-media-batch="' + action + '"]');
  const availableAlbums = () => {
    const select = $('[data-media-batch-album]');
    return Boolean(select && select.querySelectorAll('option[value]:not([value=""])').length);
  };
  const canPrepare = () => Boolean(getBatch("optimize"));
  const click = (selector) => $(selector)?.click();

  function publish() {
    const count = selectedIds.length;
    const open = Boolean(detailId && document.body.classList.contains("media-detail-active"));
    let actions;
    let label;
    if (open) {
      label = "Media details";
      actions = [
        { id: "detail-edit", label: "Edit", icon: "edit", invoke: true },
        { id: "detail-seo", label: "SEO", icon: "filter", invoke: true },
        { id: "detail-save", label: "Save", icon: "save", invoke: true },
        { id: "detail-download", label: "Download", icon: "download", invoke: true },
        { id: "detail-close", label: "Close", icon: "close", invoke: true },
      ];
    } else if (count > 0) {
      label = count + (count === 1 ? " media asset selected" : " media assets selected");
      const openable = count === 1 && $('[data-id="' + selectedIds[0] + '"].media-item');
      actions = [
        openable ? { id: "selected-open", label: "Open", icon: "gallery", invoke: true }
          : { id: "selected-page", label: "Select page", icon: "check", invoke: true },
        { id: "selected-album", label: availableAlbums() ? "Add to album" : "New album", icon: "album", invoke: true },
        { id: "selected-gallery", label: "Gallery", icon: "gallery", invoke: true },
        canPrepare() ? { id: "selected-prepare", label: "Prepare", icon: "layers", invoke: true }
          : { id: "selected-more", label: "More", icon: "menu", invoke: true },
        { id: "selected-clear", label: "Clear", icon: "close", invoke: true },
      ];
    } else {
      label = "Media Library";
      actions = [
        { id: "upload", label: "Upload", icon: "upload", invoke: true },
        { id: "filters", label: "Filters", icon: "filter", invoke: true },
        { id: "album", label: "New album", icon: "album", invoke: true },
        { id: "gallery", label: "Gallery", icon: "gallery", invoke: true },
        { id: "more", label: "More", icon: "menu" },
      ];
    }
    const next = { owner, label, actions };
    window.__adminDockWorkspace = next;
    document.dispatchEvent(new CustomEvent("admin-dock:workspace", { detail: next }));
    document.body.classList.toggle("media-dock-selection", count > 0 && !open);
    if (!count) $("#media-batch-bar")?.classList.remove("dock-tools-expanded");
  }

  function revealSelectionTools() {
    const bar = $("#media-batch-bar");
    if (!bar) return null;
    bar.classList.add("dock-tools-expanded");
    bar.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return bar;
  }

  function focusSelect(element) {
    if (!element) return;
    element.focus({ preventScroll: true });
    try {
      if (typeof element.showPicker === "function") element.showPicker();
      else element.click();
    } catch { element.click(); }
  }

  function onInvoke(event) {
    if (window.__adminDockWorkspace?.owner !== owner) return;
    const id = event.detail?.id;
    switch (id) {
      case "upload": click("#media-upload-btn"); break;
      case "filters": click("#media-filter-toggle"); break;
      case "album": click("#media-album-new"); break;
      case "gallery": click("#media-gallery-new"); break;
      case "selected-open":
        $('[data-id="' + selectedIds[0] + '"].media-item')?.click();
        break;
      case "selected-page": getBatch("page")?.click(); break;
      case "selected-album":
        if (!availableAlbums()) click("#media-album-new");
        else focusSelect(revealSelectionTools()?.querySelector("[data-media-batch-album]"));
        break;
      case "selected-gallery": getBatch("gallery")?.click(); break;
      case "selected-prepare": getBatch("optimize")?.click(); break;
      case "selected-more": {
        const menu = revealSelectionTools()?.querySelector(".media-batch-more");
        if (menu) menu.open = true;
        break;
      }
      case "selected-clear": getBatch("clear")?.click(); break;
      case "detail-edit": {
        const target = $("#media-agent-workbench") || $("#media-field-filename");
        target?.scrollIntoView({ block: "start", behavior: "smooth" });
        if (!$("#media-agent-workbench")) target?.focus({ preventScroll: true });
        break;
      }
      case "detail-seo":
        click('[data-media-inspector-tab="seo"]');
        $('[data-media-inspector-panel="seo"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        break;
      case "detail-save": click("#media-drawer-save"); break;
      case "detail-download": click("#media-drawer-download"); break;
      case "detail-close": click("#media-drawer-close"); break;
    }
  }

  function onSelection(event) {
    selectedIds = Array.isArray(event.detail?.ids)
      ? event.detail.ids.map(Number).filter(Number.isSafeInteger)
      : (window.getSelectedMediaAssetIds?.() || []);
    publish();
  }
  function onDetail(event) {
    detailId = Number(event.detail?.id) || null;
    publish();
  }
  window.addEventListener("agentsam:media-selection", onSelection);
  window.addEventListener("agentsam:media-detail-change", onDetail);
  document.addEventListener("admin-dock:invoke", onInvoke);
  publish();
  return () => {
    window.removeEventListener("agentsam:media-selection", onSelection);
    window.removeEventListener("agentsam:media-detail-change", onDetail);
    document.removeEventListener("admin-dock:invoke", onInvoke);
    document.body.classList.remove("media-dock-selection");
    if (window.__adminDockWorkspace?.owner === owner) {
      window.__adminDockWorkspace = null;
      document.dispatchEvent(new CustomEvent("admin-dock:workspace", { detail: null }));
    }
  };
}
