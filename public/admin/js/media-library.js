/**
 * Virtual-folder media library (D1 metadata; R2 keys unchanged on move/reorder).
 */
(function () {
  const FOLDERS = [
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "products", label: "Products" },
  ];

  const FOLDER_ICON =
    '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  let assets = [];
  let counts = { images: 0, videos: 0, products: 0 };
  let activeFolder = null;
  let selected = null;
  let dragId = null;
  let syncedOnce = false;

  const els = {};

  function fmtBytes(n) {
    if (!n) return "—";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function isModel3d(a) {
    const ct = (a.content_type || "").toLowerCase();
    const ext = (a.filename || "").split(".").pop()?.toLowerCase() || "";
    return ct.includes("model") || ext === "glb" || ext === "usdz" || ext === "gltf";
  }

  function mediaUrl(a) {
    return new URL(a.url, location.origin).href;
  }

  function thumbHtml(a) {
    const ct = (a.content_type || "").toLowerCase();
    if (isModel3d(a)) {
      const src = mediaUrl(a);
      return `<model-viewer src="${src}" camera-orbit="45deg 70deg 110%" disable-zoom disable-pan interaction-prompt="none" loading="lazy" reveal="auto"></model-viewer>`;
    }
    if (ct.startsWith("image/")) {
      return `<img src="${a.url}" alt="" loading="lazy">`;
    }
    if (ct.startsWith("video/")) {
      return `<video src="${a.url}" muted preload="metadata"></video>`;
    }
    const ext = (a.filename || "").split(".").pop() || "file";
    return `<span class="media-file-icon">${ext.slice(0, 4)}</span>`;
  }

  function previewHtml(a) {
    const ct = (a.content_type || "").toLowerCase();
    if (isModel3d(a)) {
      const src = mediaUrl(a);
      const ext = (a.filename || "").split(".").pop()?.toLowerCase() || "";
      if (ext === "usdz") {
        return `<model-viewer src="${src}" ios-src="${src}" camera-controls touch-action="pan-y" auto-rotate shadow-intensity="1" exposure="1" ar ar-modes="webxr scene-viewer quick-look" alt="${a.alt_text || a.filename}"></model-viewer>`;
      }
      return `<model-viewer src="${src}" camera-controls touch-action="pan-y" auto-rotate shadow-intensity="1" exposure="1" environment-image="neutral" alt="${a.alt_text || a.filename}"></model-viewer>`;
    }
    if (ct.startsWith("image/")) {
      return `<img src="${a.url}" alt="">`;
    }
    if (ct.startsWith("video/")) {
      return `<video src="${a.url}" controls></video>`;
    }
    return `<div style="padding:40px;text-align:center;color:#888;">Preview not available</div>`;
  }

  function queryUrl() {
    const params = new URLSearchParams();
    params.set("sync", syncedOnce ? "0" : "1");
    if (activeFolder) params.set("folder", activeFolder);
    else params.set("view", "images");
    return `/api/admin/media?${params}`;
  }

  async function load() {
    els.grid.innerHTML = '<div class="admin-empty">Loading…</div>';
    try {
      const data = await adminFetch(queryUrl());
      syncedOnce = true;
      assets = data.assets || [];
      counts = data.counts || counts;
      renderFolders();
      renderCrumb();
      renderGrid();
    } catch (err) {
      els.grid.innerHTML = `<div class="admin-empty">${err.message}</div>`;
    }
  }

  function renderCrumb() {
    const parts = [];
    parts.push(`<button type="button" data-crumb="home"${activeFolder ? "" : ' class="is-current"'}>All images</button>`);
    if (activeFolder) {
      const label = FOLDERS.find((f) => f.id === activeFolder)?.label || activeFolder;
      parts.push('<span aria-hidden="true">/</span>');
      parts.push(`<button type="button" class="is-current">${label}</button>`);
    }
    els.crumb.innerHTML = parts.join(" ");
    els.crumb.querySelector('[data-crumb="home"]')?.addEventListener("click", () => {
      activeFolder = null;
      load();
    });
  }

  function renderFolders() {
    els.folders.innerHTML = FOLDERS.map(
      (f) => `
      <button type="button" class="media-folder-tile" data-folder="${f.id}" draggable="false">
        ${FOLDER_ICON}
        <div><strong>${f.label}</strong><span>Open folder</span></div>
        <span class="media-folder-badge">${counts[f.id] || 0}</span>
      </button>`
    ).join("");

    els.folders.querySelectorAll(".media-folder-tile").forEach((tile) => {
      tile.addEventListener("click", () => {
        activeFolder = tile.dataset.folder;
        load();
      });
      tile.addEventListener("dragover", (e) => {
        if (!dragId) return;
        e.preventDefault();
        tile.classList.add("is-drop-target");
      });
      tile.addEventListener("dragleave", () => tile.classList.remove("is-drop-target"));
      tile.addEventListener("drop", async (e) => {
        e.preventDefault();
        tile.classList.remove("is-drop-target");
        const id = e.dataTransfer.getData("text/plain") || dragId;
        if (!id) return;
        await moveToFolder(id, tile.dataset.folder);
      });
    });
  }

  function renderGrid() {
    if (!assets.length) {
      els.grid.innerHTML = `<div class="admin-empty">No assets in this view — upload or sync from R2.</div>`;
      return;
    }

    els.grid.innerHTML = assets
      .map(
        (a) => `
      <article class="media-item" draggable="true" data-id="${a.id}">
        <div class="media-item-thumb">${thumbHtml(a)}</div>
        <div class="media-item-meta">
          <div class="media-item-name" title="${a.filename}">${a.filename}</div>
          <div class="media-item-sub">${a.folder || "images"}</div>
        </div>
      </article>`
      )
      .join("");

    els.grid.querySelectorAll(".media-item").forEach((item) => {
      const id = item.dataset.id;
      item.addEventListener("click", (e) => {
        if (item.classList.contains("is-dragging")) return;
        openDrawer(assets.find((a) => String(a.id) === id));
      });
      item.addEventListener("dragstart", (e) => {
        dragId = id;
        item.classList.add("is-dragging");
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
      });
      item.addEventListener("dragend", () => {
        dragId = null;
        item.classList.remove("is-dragging");
      });
      item.addEventListener("dragover", (e) => {
        if (!dragId || dragId === id) return;
        e.preventDefault();
      });
      item.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fromId = e.dataTransfer.getData("text/plain") || dragId;
        if (!fromId || fromId === id) return;
        await reorderDrop(fromId, id);
      });
    });
  }

  async function reorderDrop(fromId, toId) {
    const list = [...assets];
    const fromIdx = list.findIndex((a) => String(a.id) === String(fromId));
    const toIdx = list.findIndex((a) => String(a.id) === String(toId));
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const folder = activeFolder || moved.folder || "images";
    const items = list.map((a, i) => ({
      id: a.id,
      folder,
      display_order: i + 1,
    }));

    try {
      await adminFetch("/api/admin/media/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function moveToFolder(id, folder) {
    const order = (counts[folder] || 0) + 1;
    try {
      await adminFetch("/api/admin/media/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: Number(id), folder, display_order: order }] }),
      });
      if (activeFolder && activeFolder !== folder) {
        await load();
      } else {
        await load();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  function openDrawer(asset) {
    if (!asset) return;
    selected = asset;
    els.drawerPreview.innerHTML = previewHtml(asset);
    els.fieldFilename.value = asset.filename || "";
    els.fieldAlt.value = asset.alt_text || "";
    els.fieldFolder.value = asset.folder || "images";
    els.metaSize.textContent = fmtBytes(asset.size_bytes);
    els.metaDate.textContent = fmtDate(asset.created_at);
    els.metaKey.textContent = asset.r2_key || "—";
    els.backdrop.classList.add("is-open");
    els.drawer.classList.add("is-open");
  }

  function closeDrawer() {
    selected = null;
    els.backdrop.classList.remove("is-open");
    els.drawer.classList.remove("is-open");
  }

  async function saveDrawer() {
    if (!selected) return;
    try {
      const data = await adminFetch(`/api/admin/media/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: els.fieldFilename.value.trim(),
          alt_text: els.fieldAlt.value.trim(),
          folder: els.fieldFolder.value,
        }),
      });
      selected = data.asset;
      closeDrawer();
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm("Delete this asset permanently? Removes the D1 row and R2 object.")) return;
    try {
      await adminFetch(`/api/admin/media/${selected.id}`, { method: "DELETE" });
      closeDrawer();
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function uploadFiles(fileList) {
    const form = new FormData();
    for (const f of fileList) form.append("files", f);
    form.append("prefix", "uploads/");
    if (activeFolder) form.append("folder", activeFolder);

    els.dropLabel.textContent = "Uploading " + fileList.length + " file(s)…";
    els.note.style.display = "none";
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      els.note.textContent = "Uploaded " + (data.assets?.length || 0) + " file(s).";
      els.note.className = "admin-note success";
      els.note.style.display = "block";
      await load();
    } catch (err) {
      els.note.textContent = err.message;
      els.note.className = "admin-note error";
      els.note.style.display = "block";
    } finally {
      els.dropLabel.textContent = "Drag and drop files here, or click to choose";
    }
  }

  function bindUpload() {
    els.dropZone.addEventListener("click", () => els.fileInput.click());
    ["dragenter", "dragover"].forEach((evt) =>
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        els.dropZone.classList.add("is-dragover");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        els.dropZone.classList.remove("is-dragover");
      })
    );
    els.dropZone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });
    els.fileInput.addEventListener("change", () => {
      if (els.fileInput.files.length) uploadFiles(els.fileInput.files);
      els.fileInput.value = "";
    });
    els.uploadBtn.addEventListener("click", () => els.fileInput.click());
  }

  window.initMediaLibrary = function initMediaLibrary() {
    els.crumb = document.getElementById("media-crumb");
    els.folders = document.getElementById("media-folders");
    els.grid = document.getElementById("media-grid");
    els.dropZone = document.getElementById("media-drop");
    els.dropLabel = document.getElementById("media-drop-label");
    els.fileInput = document.getElementById("media-file-input");
    els.uploadBtn = document.getElementById("media-upload-btn");
    els.note = document.getElementById("media-note");
    els.backdrop = document.getElementById("media-drawer-backdrop");
    els.drawer = document.getElementById("media-drawer");
    els.drawerPreview = document.getElementById("media-drawer-preview");
    els.fieldFilename = document.getElementById("media-field-filename");
    els.fieldAlt = document.getElementById("media-field-alt");
    els.fieldFolder = document.getElementById("media-field-folder");
    els.metaSize = document.getElementById("media-meta-size");
    els.metaDate = document.getElementById("media-meta-date");
    els.metaKey = document.getElementById("media-meta-key");

    document.getElementById("media-drawer-close")?.addEventListener("click", closeDrawer);
    document.getElementById("media-drawer-save")?.addEventListener("click", saveDrawer);
    document.getElementById("media-drawer-delete")?.addEventListener("click", deleteSelected);
    els.backdrop?.addEventListener("click", closeDrawer);

    bindUpload();
    load();
  };
})();
