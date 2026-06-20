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

  const DEFAULT_PLACEMENT = {
    orbitTheta: 42,
    orbitPhi: 62,
    orbitRadius: 112,
    fieldOfView: 30,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    scale: 1,
  };

  let placement = { ...DEFAULT_PLACEMENT };

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
      const inner =
        ext === "usdz"
          ? `<model-viewer id="media-glb-viewer" src="${src}" ios-src="${src}" camera-controls touch-action="pan-y" interaction-prompt="none" shadow-intensity="0" exposure="1.05" alt="${a.alt_text || a.filename}"></model-viewer>`
          : `<model-viewer id="media-glb-viewer" src="${src}" camera-controls touch-action="pan-y" interaction-prompt="none" shadow-intensity="0" exposure="1.05" environment-image="neutral" alt="${a.alt_text || a.filename}"></model-viewer>`;
      return `<div class="media-glb-stage" id="media-glb-stage"><div class="media-glb-transform" id="media-glb-transform">${inner}</div><p class="media-glb-drag-hint">Drag to orbit · scroll to zoom · Shift+drag to pan frame</p></div>`;
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

  function mergePlacement(raw) {
    return { ...DEFAULT_PLACEMENT, ...(raw && typeof raw === "object" ? raw : {}) };
  }

  function placementFromInputs() {
    return {
      orbitTheta: Number(els.glbTheta.value),
      orbitPhi: Number(els.glbPhi.value),
      orbitRadius: Number(els.glbRadius.value),
      fieldOfView: Number(els.glbFov.value),
      positionX: Number(els.glbX.value),
      positionY: Number(els.glbY.value),
      positionZ: Number(els.glbZ.value),
      scale: Number(els.glbScale.value),
    };
  }

  function syncPlacementInputs(p) {
    placement = mergePlacement(p);
    els.glbTheta.value = placement.orbitTheta;
    els.glbPhi.value = placement.orbitPhi;
    els.glbRadius.value = placement.orbitRadius;
    els.glbFov.value = placement.fieldOfView;
    els.glbX.value = placement.positionX;
    els.glbY.value = placement.positionY;
    els.glbZ.value = placement.positionZ;
    els.glbScale.value = placement.scale;
    els.glbThetaRange.value = placement.orbitTheta;
    els.glbPhiRange.value = placement.orbitPhi;
    els.glbRadiusRange.value = placement.orbitRadius;
    els.glbYRange.value = placement.positionY;
    els.glbScaleRange.value = placement.scale;
  }

  function parseOrbitString(raw) {
    const str = typeof raw === "string" ? raw : raw?.toString?.() || "";
    if (!str) return null;

    const m = str
      .trim()
      .match(/^([\d.+-]+)\s*deg\s+([\d.+-]+)\s*deg\s+([\d.+-]+)\s*(%|m|cm|mm)?$/i);
    if (m) {
      const unit = (m[4] || "%").toLowerCase();
      let radius = parseFloat(m[3]);
      if (unit === "m") radius = Math.round(radius * 100);
      else if (unit === "cm") radius = Math.round(radius);
      else if (unit === "mm") radius = Math.round(radius / 10);
      else radius = Math.round(radius);
      return {
        orbitTheta: Math.round(parseFloat(m[1])),
        orbitPhi: Math.round(parseFloat(m[2])),
        orbitRadius: radius,
        orbitRaw: str.trim(),
      };
    }

    const parts = str.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const theta = parseFloat(parts[0]);
    const phi = parseFloat(parts[1]);
    const radius = parseFloat(parts[2]);
    if (!Number.isFinite(theta) || !Number.isFinite(phi)) return null;
    return {
      orbitTheta: Math.round(theta),
      orbitPhi: Math.round(phi),
      orbitRadius: Number.isFinite(radius) ? Math.round(radius) : null,
      orbitRaw: str.trim(),
    };
  }

  function readViewerOrbit(mv) {
    if (typeof mv.getCameraOrbit === "function") {
      const orbit = mv.getCameraOrbit();
      const parsed = parseOrbitString(orbit.toString?.() || "");
      if (parsed) {
        if (parsed.orbitRadius != null && String(orbit.toString?.() || "").includes("m")) {
          if (mv._radiusRefM && mv._radiusRefPct) {
            parsed.orbitRadius = Math.max(
              50,
              Math.min(200, Math.round((orbit.radius / mv._radiusRefM) * mv._radiusRefPct))
            );
          }
        }
        return parsed;
      }
      return {
        orbitTheta: Math.round((orbit.theta * 180) / Math.PI),
        orbitPhi: Math.round((orbit.phi * 180) / Math.PI),
        orbitRadius:
          mv._radiusRefM && mv._radiusRefPct
            ? Math.max(
                50,
                Math.min(200, Math.round((orbit.radius / mv._radiusRefM) * mv._radiusRefPct))
              )
            : Math.round(orbit.radius * 100),
        orbitRaw: orbit.toString?.() || "",
      };
    }
    return parseOrbitString(mv.getAttribute("camera-orbit") || mv.cameraOrbit);
  }

  function captureRadiusReference(mv) {
    if (typeof mv.getCameraOrbit !== "function") return;
    const p = placementFromInputs();
    mv._radiusRefM = mv.getCameraOrbit().radius;
    mv._radiusRefPct = p.orbitRadius || DEFAULT_PLACEMENT.orbitRadius;
  }

  function updatePlacementExport(p) {
    placement = p;
    if (els.glbExport && selected) {
      els.glbExport.value = buildPlacementNotes(selected, p);
    }
  }

  function applyPlacementPreview() {
    const p = placementFromInputs();
    placement = p;

    const mv = document.getElementById("media-glb-viewer");
    const wrap = document.getElementById("media-glb-transform");
    if (mv) {
      mv._applyingFromPanel = true;
      mv.cameraOrbit = `${p.orbitTheta}deg ${p.orbitPhi}deg ${p.orbitRadius}%`;
      if ("fieldOfView" in mv) mv.fieldOfView = `${p.fieldOfView}deg`;
      requestAnimationFrame(() => {
        captureRadiusReference(mv);
        mv._applyingFromPanel = false;
      });
    }
    if (wrap) {
      wrap.style.transform = `translate3d(${p.positionX}px, ${p.positionY}px, ${p.positionZ}px) scale(${p.scale})`;
    }
    updatePlacementExport(p);
  }

  function syncFromViewerCamera(mv) {
    if (!mv || mv._applyingFromPanel) return;

    const orbit = readViewerOrbit(mv);
    if (!orbit) return;

    const p = placementFromInputs();
    p.orbitTheta = orbit.orbitTheta;
    p.orbitPhi = orbit.orbitPhi;
    if (orbit.orbitRadius != null) p.orbitRadius = orbit.orbitRadius;
    if (orbit.orbitRaw) p.liveOrbitRaw = orbit.orbitRaw;

    const fov = parseFloat(String(mv.fieldOfView || mv.getAttribute("field-of-view") || ""));
    if (Number.isFinite(fov)) p.fieldOfView = Math.round(fov);

    syncPlacementInputs(p);
    updatePlacementExport(p);
  }

  function bindGlbViewerInteraction(mv) {
    if (!mv || mv._glbPlacementBound) return;
    mv._glbPlacementBound = true;

    let cameraRaf = 0;
    let interacting = false;
    let interactRaf = 0;

    const scheduleSync = () => {
      cancelAnimationFrame(cameraRaf);
      cameraRaf = requestAnimationFrame(() => syncFromViewerCamera(mv));
    };

    mv.addEventListener("camera-change", scheduleSync);

    const startInteract = () => {
      interacting = true;
      const tick = () => {
        if (!interacting) return;
        syncFromViewerCamera(mv);
        interactRaf = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(interactRaf);
      interactRaf = requestAnimationFrame(tick);
    };

    const stopInteract = () => {
      interacting = false;
      cancelAnimationFrame(interactRaf);
      scheduleSync();
    };

    mv.addEventListener("pointerdown", startInteract);
    window.addEventListener("pointerup", stopInteract);
    mv.addEventListener("wheel", scheduleSync, { passive: true });

    const stage = document.getElementById("media-glb-stage");
    const wrap = document.getElementById("media-glb-transform");
    if (!stage || !wrap) return;

    let panning = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    stage.addEventListener(
      "pointerdown",
      (e) => {
        if (!e.shiftKey || e.target.closest("model-viewer")) return;
        panning = true;
        startX = e.clientX;
        startY = e.clientY;
        const p = placementFromInputs();
        baseX = p.positionX;
        baseY = p.positionY;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add("is-panning");
      },
      true
    );

    stage.addEventListener(
      "pointermove",
      (e) => {
        if (!panning) return;
        const p = placementFromInputs();
        p.positionX = Math.round(baseX + (e.clientX - startX));
        p.positionY = Math.round(baseY + (e.clientY - startY));
        syncPlacementInputs(p);
        wrap.style.transform = `translate3d(${p.positionX}px, ${p.positionY}px, ${p.positionZ}px) scale(${p.scale})`;
        updatePlacementExport(p);
      },
      true
    );

    const endPan = (e) => {
      if (!panning) return;
      panning = false;
      stage.classList.remove("is-panning");
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    stage.addEventListener("pointerup", endPan, true);
    stage.addEventListener("pointercancel", endPan, true);

    // Shift+drag pans the frame (X/Y) instead of orbiting
    mv.addEventListener(
      "pointerdown",
      (e) => {
        if (!e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        mv.removeAttribute("camera-controls");
        mv._shiftPan = true;
        panning = true;
        startX = e.clientX;
        startY = e.clientY;
        const p = placementFromInputs();
        baseX = p.positionX;
        baseY = p.positionY;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add("is-panning");
      },
      true
    );

    const endShiftPan = () => {
      if (!mv._shiftPan) return;
      mv._shiftPan = false;
      panning = false;
      stage.classList.remove("is-panning");
      mv.setAttribute("camera-controls", "");
    };

    mv.addEventListener(
      "pointermove",
      (e) => {
        if (!panning || !mv._shiftPan) return;
        e.preventDefault();
        const p = placementFromInputs();
        p.positionX = Math.round(baseX + (e.clientX - startX));
        p.positionY = Math.round(baseY + (e.clientY - startY));
        syncPlacementInputs(p);
        wrap.style.transform = `translate3d(${p.positionX}px, ${p.positionY}px, ${p.positionZ}px) scale(${p.scale})`;
        updatePlacementExport(p);
      },
      true
    );

    mv.addEventListener("pointerup", endShiftPan, true);
    mv.addEventListener("pointercancel", endShiftPan, true);
  }

  function buildPlacementNotes(asset, p) {
    const orbit = `${p.orbitTheta}deg ${p.orbitPhi}deg ${p.orbitRadius}%`;
    const transform = `translate3d(${p.positionX}px, ${p.positionY}px, ${p.positionZ}px) scale(${p.scale})`;
    return [
      `GLB placement — ${asset.filename}`,
      `URL: ${asset.url}`,
      "",
      "Camera orbit (theta / phi / radius):",
      `  theta: ${p.orbitTheta}°`,
      `  phi: ${p.orbitPhi}°`,
      `  radius: ${p.orbitRadius}%`,
      `  fieldOfView: ${p.fieldOfView}°`,
      "",
      "Position (px):",
      `  X: ${p.positionX}`,
      `  Y: ${p.positionY}`,
      `  Z: ${p.positionZ}`,
      "",
      `Scale: ${p.scale}`,
      "",
      "model-viewer:",
      `  camera-orbit="${orbit}"`,
      p.liveOrbitRaw ? `  camera-orbit-live="${p.liveOrbitRaw}"` : "",
      `  field-of-view="${p.fieldOfView}deg"`,
      "",
      "CSS wrapper:",
      `  transform: ${transform};`,
      "",
      "JSON:",
      JSON.stringify(p, null, 2),
    ].join("\n");
  }

  function bindPlacementControls() {
    const pairs = [
      [els.glbTheta, els.glbThetaRange],
      [els.glbPhi, els.glbPhiRange],
      [els.glbRadius, els.glbRadiusRange],
      [els.glbY, els.glbYRange],
      [els.glbScale, els.glbScaleRange],
    ];

    const onChange = () => applyPlacementPreview();

    [els.glbTheta, els.glbPhi, els.glbRadius, els.glbFov, els.glbX, els.glbY, els.glbZ, els.glbScale].forEach((el) => {
      el?.addEventListener("input", onChange);
    });

    pairs.forEach(([num, range]) => {
      num?.addEventListener("input", () => {
        if (range) range.value = num.value;
        onChange();
      });
      range?.addEventListener("input", () => {
        if (num) num.value = range.value;
        onChange();
      });
    });

    els.glbReset?.addEventListener("click", () => {
      syncPlacementInputs(DEFAULT_PLACEMENT);
      applyPlacementPreview();
    });

    els.glbCopy?.addEventListener("click", async () => {
      const text = els.glbExport?.value || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        els.glbCopy.textContent = "Copied!";
        setTimeout(() => {
          els.glbCopy.textContent = "Copy placement notes";
        }, 1600);
      } catch {
        els.glbExport.select();
        document.execCommand("copy");
      }
    });
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

    const is3d = isModel3d(asset);
    els.glbPlacement.hidden = !is3d;
    if (is3d) {
      syncPlacementInputs(asset.placement);
      const mv = document.getElementById("media-glb-viewer");
      const apply = () => {
        applyPlacementPreview();
        bindGlbViewerInteraction(mv);
        if (mv) {
          requestAnimationFrame(() => captureRadiusReference(mv));
        }
      };
      if (mv) {
        if (mv.loaded) apply();
        else mv.addEventListener("load", apply, { once: true });
      }
    }

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
      const payload = {
        filename: els.fieldFilename.value.trim(),
        alt_text: els.fieldAlt.value.trim(),
        folder: els.fieldFolder.value,
      };
      if (isModel3d(selected)) {
        payload.placement = placementFromInputs();
      }
      const data = await adminFetch(`/api/admin/media/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    els.glbPlacement = document.getElementById("media-glb-placement");
    els.glbTheta = document.getElementById("glb-theta");
    els.glbPhi = document.getElementById("glb-phi");
    els.glbRadius = document.getElementById("glb-radius");
    els.glbFov = document.getElementById("glb-fov");
    els.glbX = document.getElementById("glb-x");
    els.glbY = document.getElementById("glb-y");
    els.glbZ = document.getElementById("glb-z");
    els.glbScale = document.getElementById("glb-scale");
    els.glbThetaRange = document.getElementById("glb-theta-range");
    els.glbPhiRange = document.getElementById("glb-phi-range");
    els.glbRadiusRange = document.getElementById("glb-radius-range");
    els.glbYRange = document.getElementById("glb-y-range");
    els.glbScaleRange = document.getElementById("glb-scale-range");
    els.glbExport = document.getElementById("media-glb-export");
    els.glbCopy = document.getElementById("media-glb-copy");
    els.glbReset = document.getElementById("media-glb-reset");

    bindPlacementControls();

    document.getElementById("media-drawer-close")?.addEventListener("click", closeDrawer);
    document.getElementById("media-drawer-save")?.addEventListener("click", saveDrawer);
    document.getElementById("media-drawer-delete")?.addEventListener("click", deleteSelected);
    els.backdrop?.addEventListener("click", closeDrawer);

    bindUpload();
    load();
  };
})();
