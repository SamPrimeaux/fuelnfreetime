/* Collection management uses the same account-scoped adminFetch and storefront
   D1 tables as Product Editor. No parallel collection cache or faux UI state. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fields = ["title", "slug", "status", "sort", "description", "eyebrow", "accent", "image", "seo-title", "seo-description"];
  let collections = [];
  let products = [];
  let chosenId = null;
  let originalMembers = new Set();
  let chosenMembers = new Set();
  let saving = false;

  const scalar = (value) => String(value ?? "");
  const slugify = (text) => scalar(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function message(value, error) {
    const target = $("cm-message");
    target.textContent = value;
    target.classList.toggle("is-error", Boolean(error));
    target.hidden = !value;
  }
  function node(tag, cls, content) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content != null) el.textContent = scalar(content);
    return el;
  }
  function optionStatus(status) {
    const el = node("span", "cm-status cm-status--" + status, status);
    return el;
  }
  function renderList() {
    const filter = $("cm-search").value.trim().toLowerCase();
    const visible = collections.filter((c) => (c.title + " " + c.slug).toLowerCase().includes(filter));
    const root = $("cm-list");
    root.replaceChildren();
    $("cm-count").textContent = visible.length + " of " + collections.length + " collections";
    if (!visible.length) {
      root.append(node("p", "cm-muted", "No matching collections."));
      return;
    }
    for (const collection of visible) {
      const btn = node("button", "cm-collection-item");
      btn.type = "button";
      btn.setAttribute("role", "listitem");
      btn.setAttribute("aria-current", chosenId === Number(collection.id) ? "true" : "false");
      btn.append(node("strong", "", collection.title || collection.slug));
      const details = node("span");
      details.append(optionStatus(collection.status));
      details.append(node("small", "", "  ·  " + Number(collection.product_count || 0) + " products"));
      btn.append(details);
      btn.append(node("small", "", "/" + collection.slug));
      btn.addEventListener("click", () => { void selectCollection(Number(collection.id)); });
      root.append(btn);
    }
  }
  function renderProducts() {
    const root = $("cm-product-list");
    const filter = $("cm-product-search").value.trim().toLowerCase();
    const selectedOnly = $("cm-selected-only").checked;
    root.replaceChildren();
    let displayed = 0;
    for (const p of products) {
      const pid = Number(p.id);
      if (selectedOnly && !chosenMembers.has(pid)) continue;
      if (filter && !(scalar(p.title) + " " + scalar(p.slug)).toLowerCase().includes(filter)) continue;
      displayed++;
      const row = node("div", "cm-product-item");
      const label = node("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = chosenMembers.has(pid);
      checkbox.setAttribute("aria-label", "Include " + p.title);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) chosenMembers.add(pid);
        else chosenMembers.delete(pid);
        $("cm-selected-count").textContent = chosenMembers.size;
        if (selectedOnly && !checkbox.checked) renderProducts();
      });
      label.append(checkbox);
      let url = scalar(p.primary_image || p.image_url);
      if (url) {
        try {
          const parsed = new URL(url, location.origin);
          if (parsed.protocol !== "https:" && parsed.origin !== location.origin) url = "";
          else url = parsed.href;
        } catch { url = ""; }
      }
      if (url) {
        const img = document.createElement("img");
        img.src = url; img.alt = ""; img.loading = "lazy";
        img.onerror = () => { img.replaceWith(node("span", "cm-product-thumb")); };
        label.append(img);
      } else label.append(node("span", "cm-product-thumb"));
      const labels = node("span");
      labels.append(node("strong", "", p.title));
      labels.append(node("small", "", p.status + " · " + Number(p.variant_count || 0) + " variants"));
      label.append(labels);
      row.append(label);
      const edit = node("a", "", "Edit");
      edit.href = "/admin/product-edit?id=" + encodeURIComponent(pid);
      edit.setAttribute("aria-label", "Edit " + p.title);
      row.append(edit);
      root.append(row);
    }
    if (!displayed) root.append(node("p", "cm-muted", "No products match this filter."));
    $("cm-selected-count").textContent = chosenMembers.size;
  }
  function updateCoverPreview() {
    const target = $("cm-cover-preview");
    const url = $("cm-image").value.trim();
    if (!url) { target.hidden = true; target.removeAttribute("src"); return; }
    try {
      const parsed = new URL(url, location.origin);
      if ((parsed.protocol !== "https:" && parsed.origin !== location.origin) || url.startsWith("//")) {
        target.hidden = true; return;
      }
      target.src = parsed.href;
      target.hidden = false;
    } catch { target.hidden = true; }
  }
  function membersChanged() {
    return originalMembers.size !== chosenMembers.size ||
      Array.from(chosenMembers).some((id) => !originalMembers.has(id));
  }
  function setForm(collection) {
    const c = collection || {};
    $("cm-title").value = scalar(c.title);
    $("cm-slug").value = scalar(c.slug);
    $("cm-status").value = c.status || "draft";
    $("cm-sort").value = scalar(c.sort_order ?? 0);
    $("cm-description").value = scalar(c.description);
    $("cm-eyebrow").value = scalar(c.eyebrow);
    $("cm-accent").value = /^#[a-fA-F0-9]{6}$/.test(c.accent_color || "") ? c.accent_color : "#ff4d00";
    $("cm-image").value = scalar(c.image_url);
    updateCoverPreview();
    $("cm-seo-title").value = scalar(c.seo_title);
    $("cm-seo-description").value = scalar(c.seo_description);
    $("cm-heading").textContent = c.title || "New collection";
    $("cm-mode").textContent = c.id ? "Edit collection" : "Create collection";
    $("cm-preview").href = c.slug ? "/shop/collections/" + encodeURIComponent(c.slug) : "/shop/collections";
    $("cm-preview").hidden = !c.id || c.status !== "active";
    $("cm-save-members").disabled = !c.id;
    $("cm-edited").textContent = c.id ? "Last updated " + scalar(c.updated_at || "recently") : "Your collection starts as a draft";
    $("cm-empty").hidden = true;
    $("cm-form").hidden = false;
    renderProducts();
  }
  async function loadCollections() {
    const [a, b] = await Promise.all([
      adminFetch("/api/admin/collections"),
      adminFetch("/api/admin/products"),
    ]);
    if (!a.ok || !b.ok) throw new Error(a.error || b.error || "Unable to load collections");
    collections = a.collections || [];
    products = b.products || [];
    renderList();
  }
  async function selectCollection(id) {
    try {
      message("");
      const result = await adminFetch("/api/admin/collections/" + encodeURIComponent(id));
      if (!result.ok) throw new Error(result.error || "Unable to load collection");
      chosenId = id;
      originalMembers = new Set((result.product_ids || []).map(Number));
      chosenMembers = new Set(originalMembers);
      setForm(result.collection);
      renderList();
    } catch (error) { message(error.message || "Collection not available", true); }
  }
  function newCollection() {
    chosenId = null;
    originalMembers = new Set();
    chosenMembers = new Set();
    $("cm-product-search").value = "";
    $("cm-selected-only").checked = false;
    setForm(null);
    $("cm-title").focus();
    message("");
    renderList();
  }
  function dataFromForm() {
    return {
      title: $("cm-title").value.trim(),
      slug: slugify($("cm-slug").value.trim() || $("cm-title").value),
      status: $("cm-status").value,
      sort_order: Number($("cm-sort").value || "0"),
      description: $("cm-description").value,
      eyebrow: $("cm-eyebrow").value,
      accent_color: $("cm-accent").value,
      image_url: $("cm-image").value.trim(),
      seo_title: $("cm-seo-title").value.trim(),
      seo_description: $("cm-seo-description").value.trim(),
    };
  }
  async function saveMetadata(event) {
    event.preventDefault();
    if (saving) return;
    const payload = dataFromForm();
    if (!payload.title || !payload.slug) { message("Enter a title and valid URL handle.", true); return; }
    saving = true;
    $("cm-save").disabled = true;
    try {
      const create = chosenId == null;
      const result = await adminFetch(create ? "/api/admin/collections" : "/api/admin/collections/" + chosenId, {
        method: create ? "POST" : "PUT",
        body: JSON.stringify(payload),
      });
      if (!result.ok || !result.collection) throw new Error(result.error || "Unable to save collection");
      chosenId = Number(result.collection.id);
      if (membersChanged()) {
        const assign = await adminFetch("/api/admin/collections/" + chosenId + "/products", {
          method: "PUT", body: JSON.stringify({ product_ids: Array.from(chosenMembers) }),
        });
        if (!assign.ok) throw new Error(assign.error || "Collection details saved, but product assignments failed");
        originalMembers = new Set(chosenMembers);
      }
      await loadCollections();
      await selectCollection(chosenId);
      message("Collection " + (create ? "created" : "updated") + " successfully.");
    } catch (error) { message(error.message || "Could not save collection", true); }
    finally { saving = false; $("cm-save").disabled = false; }
  }
  async function saveAssignments() {
    if (!chosenId || saving) return;
    saving = true;
    $("cm-save-members").disabled = true;
    try {
      const ids = Array.from(chosenMembers);
      const result = await adminFetch("/api/admin/collections/" + chosenId + "/products", {
        method: "PUT", body: JSON.stringify({ product_ids: ids }),
      });
      if (!result.ok) throw new Error(result.error || "Failed to save products");
      originalMembers = new Set(ids);
      await loadCollections();
      renderProducts();
      message(ids.length + " product assignments saved. Published products appear in the storefront collection.");
    } catch (error) { message(error.message || "Product assignment failed", true); }
    finally { saving = false; $("cm-save-members").disabled = false; }
  }
  $("cm-create").addEventListener("click", newCollection);
  $("cm-empty-create").addEventListener("click", newCollection);
  $("cm-search").addEventListener("input", renderList);
  $("cm-product-search").addEventListener("input", renderProducts);
  $("cm-selected-only").addEventListener("change", renderProducts);
  $("cm-form").addEventListener("submit", saveMetadata);
  $("cm-save-members").addEventListener("click", () => { void saveAssignments(); });
  $("cm-reload").addEventListener("click", () => {
    if (chosenId) void selectCollection(chosenId);
    else newCollection();
  });
  $("cm-image").addEventListener("change", updateCoverPreview);
  $("cm-cover-preview").addEventListener("error", () => { $("cm-cover-preview").hidden = true; });
  $("cm-browse-media").addEventListener("click", async () => {
    if (typeof window.openMediaPicker !== "function") {
      message("The media picker is unavailable. Open Media Library to find an image.", true);
      return;
    }
    const picked = await window.openMediaPicker({ title: "Choose collection cover image", multi: false });
    if (picked && picked[0] && picked[0].url) {
      $("cm-image").value = picked[0].url;
      updateCoverPreview();
    }
  });
  $("cm-title").addEventListener("input", () => {
    if (chosenId === null) $("cm-slug").value = slugify($("cm-title").value);
    $("cm-heading").textContent = $("cm-title").value || "New collection";
  });
  $("cm-slug").addEventListener("blur", () => { $("cm-slug").value = slugify($("cm-slug").value); });
  loadCollections().then(() => {
    const requested = Number(new URLSearchParams(location.search).get("id"));
    if (Number.isSafeInteger(requested) && requested > 0 && collections.some((c) => Number(c.id) === requested)) {
      return selectCollection(requested);
    }
    if (collections.length) return selectCollection(Number(collections[0].id));
    newCollection();
  }).catch((error) => message(error.message || "Unable to load collections", true));
})();
