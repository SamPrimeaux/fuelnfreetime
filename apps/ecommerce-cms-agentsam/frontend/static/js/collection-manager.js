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
  let plannedCatalogIds = new Set();
  const supplierById = new Map();
  const starterKits = Object.freeze({
    diesel: ["Comfort Colors 1717", "crewneck sweatshirt", "hoodie"],
    weekend: ["unisex t-shirt", "hat", "long sleeve"],
    core: ["heavyweight t-shirt", "fleece", "zip hoodie"],
  });
  let supplierResults = [];


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
  const supplierId = (p) => scalar(p.catalog_product_id || p.provider_product_id ||
    p.completeful_product_id || p.id).trim();
  function supplierUrl(p) {
    const url = scalar(p.realistic_image_url || p.cover_image_url || p.main_icon_url);
    if (!url) return "";
    try {
      const parsed = new URL(url, location.origin);
      return parsed.protocol === "https:" || parsed.origin === location.origin ? parsed.href : "";
    } catch { return ""; }
  }
  function supplierImage(p, cls) {
    const url = supplierUrl(p);
    if (!url) return node("span", cls + " cm-supplier-placeholder");
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    image.loading = "lazy";
    image.onerror = () => image.replaceWith(node("span", cls + " cm-supplier-placeholder"));
    return image;
  }
  function studioHref(id) {
    const url = new URL("/admin/products/create/" + encodeURIComponent(id), location.origin);
    if (chosenId) url.searchParams.set("collection_id", String(chosenId));
    return url.pathname + url.search;
  }
  function renderLineup() {
    $("cm-lineup-count").textContent = plannedCatalogIds.size;
    const root = $("cm-planned-results");
    root.replaceChildren();
    if (!plannedCatalogIds.size) {
      root.append(node("p", "cm-muted", "Select supplier blanks to plan this collection."));
      return;
    }
    for (const id of plannedCatalogIds) {
      const item = supplierById.get(id) || { name: "Selected supplier blank", completeful_product_id: id };
      const card = node("div", "cm-planned-item");
      card.append(supplierImage(item, "cm-planned-image"));
      const copy = node("div");
      copy.append(node("strong", "", item.name || item.default_title || id));
      copy.append(node("small", "", "Ready for artwork"));
      card.append(copy);
      const actions = node("div", "cm-planned-item-actions");
      const design = node("a", "", "Design product");
      design.href = studioHref(id);
      design.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!(await saveMetadata({ preventDefault() {} }))) return;
        location.assign(studioHref(id));
      });
      const remove = node("button", "", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove planned " + (item.name || id));
      remove.addEventListener("click", () => {
        plannedCatalogIds.delete(id);
        renderLineup();
        renderSupplierCards();
      });
      actions.append(design, remove);
      card.append(actions);
      root.append(card);
    }
  }
  function renderSupplierCards() {
    const root = $("cm-supplier-results");
    root.replaceChildren();
    if (!supplierResults.length) return;
    for (const p of supplierResults) {
      const id = supplierId(p);
      if (!id) continue;
      supplierById.set(id, p);
      const card = node("article", "cm-supplier-item");
      card.append(supplierImage(p, ""));
      const body = node("div", "cm-supplier-item-copy");
      body.append(node("strong", "", p.name || p.default_title || "Supplier blank"));
      body.append(node("small", "", (p.print_type || p.product_type || "Customizable") + " · Supplier catalog"));
      const add = node("button", "", plannedCatalogIds.has(id) ? "Added to lineup" : "+ Add to lineup");
      add.type = "button";
      add.setAttribute("aria-pressed", plannedCatalogIds.has(id) ? "true" : "false");
      add.addEventListener("click", () => {
        if (plannedCatalogIds.has(id)) plannedCatalogIds.delete(id);
        else {
          if (plannedCatalogIds.size >= 24) { message("Choose up to 24 blanks per collection.", true); return; }
          plannedCatalogIds.add(id);
        }
        renderSupplierCards();
        renderLineup();
      });
      body.append(add);
      card.append(body);
      root.append(card);
    }
  }
  async function searchSupplierTerms(terms) {
    $("cm-supplier-status").textContent = "Searching connected Completeful catalog…";
    try {
      const results = await Promise.all(terms.map(async (term) => {
        const qs = new URLSearchParams({ search: term, limit: "12", offset: "0" });
        const result = await adminFetch("/api/admin/completeful/catalog?" + qs);
        if (!result.items) throw new Error(result.error || "Supplier catalog unavailable");
        return result.items.slice(0, terms.length > 1 ? 3 : 12);
      }));
      const unique = new Map();
      for (const p of results.flat()) {
        const id = supplierId(p);
        if (id && !unique.has(id)) unique.set(id, p);
      }
      supplierResults = Array.from(unique.values());
      $("cm-supplier-status").textContent = supplierResults.length
        ? supplierResults.length + " real supplier blanks available to review"
        : "No matches in the connected supplier catalog. Try another search.";
      renderSupplierCards();
    } catch (error) {
      $("cm-supplier-status").textContent = "Could not load supplier blanks.";
      message(error.message || "Supplier catalog unavailable", true);
    }
  }
  async function hydrateSupplierNames() {
    const missing = [...plannedCatalogIds].filter((id) => !supplierById.has(id)).slice(0, 24);
    if (!missing.length) return;
    // The same authenticated provider catalog detail used by Product Studio.
    await Promise.all(missing.map(async (id) => {
      try {
        const detail = await adminFetch("/api/admin/completeful/catalog/" + encodeURIComponent(id));
        const product = detail.product || detail.item;
        if (product && supplierId(product)) supplierById.set(id, product);
      } catch { /* Render a safe selected-blank placeholder if supplier is offline. */ }
    }));
    renderLineup();
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
  const heroFields = [
    "eyebrow", "headline", "subheadline", "artwork-url",
    "background-url", "background-mode", "background-color",
    "gradient-to", "focus", "overlay", "artwork-scale",
    "layout", "height", "text-color",
    "primary-label", "primary-href", "secondary-label", "secondary-href"
  ];
  const merchHero = () => window.AgentSamMerchHero;
  function heroFallback() {
    return {
      title: $("cm-title").value || "Collection",
      eyebrow: $("cm-eyebrow").value || "Fuel & Free Time",
      description: $("cm-description").value,
      image_url: $("cm-image").value,
      accent_color: $("cm-accent").value
    };
  }
  function setHeroFields(config, collection = {}) {
    const engine = merchHero();
    if (!engine) { message("Merch Hero renderer did not load. Refresh before editing.", true); return; }
    const h = engine.parseMerchHero(config, collection);
    const values = {
      "eyebrow": h.eyebrow, "headline": h.headline, "subheadline": h.subheadline,
      "artwork-url": h.artworkUrl, "background-url": h.backgroundImageUrl,
      "background-mode": h.backgroundMode, "background-color": h.backgroundColor,
      "gradient-to": h.gradientTo, "focus": h.focus, "overlay": h.overlay,
      "artwork-scale": h.artworkScale, "layout": h.layout, "height": h.height,
      "text-color": h.textColor, "primary-label": h.primaryCta.label,
      "primary-href": h.primaryCta.href, "secondary-label": h.secondaryCta.label,
      "secondary-href": h.secondaryCta.href
    };
    for (const [key, value] of Object.entries(values)) $("hero-" + key).value = value;
    updateHeroPreview();
  }
  function heroConfigFromForm() {
    const engine = merchHero();
    if (!engine) return null;
    return engine.normalizeMerchHero({
      eyebrow: $("hero-eyebrow").value,
      headline: $("hero-headline").value,
      subheadline: $("hero-subheadline").value,
      artworkUrl: $("hero-artwork-url").value,
      backgroundImageUrl: $("hero-background-url").value,
      backgroundMode: $("hero-background-mode").value,
      backgroundColor: $("hero-background-color").value,
      gradientTo: $("hero-gradient-to").value,
      focus: $("hero-focus").value,
      overlay: Number($("hero-overlay").value),
      artworkScale: Number($("hero-artwork-scale").value),
      layout: $("hero-layout").value,
      height: $("hero-height").value,
      textColor: $("hero-text-color").value,
      accentColor: $("cm-accent").value,
      primaryCta: { label: $("hero-primary-label").value, href: $("hero-primary-href").value },
      secondaryCta: { label: $("hero-secondary-label").value, href: $("hero-secondary-href").value },
    }, heroFallback());
  }
  function updateHeroPreview() {
    const target = $("cm-hero-preview");
    if (!merchHero()) {
      target.textContent = "Hero renderer unavailable. Refresh the page.";
      return;
    }
    const config = heroConfigFromForm();
    target.innerHTML = merchHero().renderMerchHero(config, heroFallback());
    $("hero-overlay-value").textContent = $("hero-overlay").value + "%";
    $("hero-artwork-scale-value").textContent = $("hero-artwork-scale").value + "%";
  }
  async function chooseHeroMedia(field) {
    if (typeof window.openMediaPicker !== "function") {
      message("Media Library is unavailable. Use a direct R2 asset URL.", true);
      return;
    }
    const picked = await window.openMediaPicker({ title: field === "hero-artwork-url"
      ? "Select transparent artwork" : "Select hero background", multi: false });
    if (picked?.[0]?.url) {
      $(field).value = picked[0].url;
      if (field === "hero-background-url") $("hero-background-mode").value = "image";
      updateHeroPreview();
    }
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
    try {
      const list = typeof c.product_plan_json === "string" ? JSON.parse(c.product_plan_json) : c.product_plan_json;
      plannedCatalogIds = new Set((Array.isArray(list) ? list : []).map((item) =>
        scalar(item?.catalog_product_id)).filter(Boolean));
    } catch { plannedCatalogIds = new Set(); }
    renderLineup();
    void hydrateSupplierNames();
    setHeroFields(c.hero_settings_json, c);
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
      hero_settings_json: JSON.stringify(heroConfigFromForm()),
      product_plan_json: JSON.stringify([...plannedCatalogIds].map((catalog_product_id) => ({ catalog_product_id }))),
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
      return true;
    } catch (error) { message(error.message || "Could not save collection", true); return false; }
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
  document.querySelectorAll(".cm-lineup-preset").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".cm-lineup-preset").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button)));
      void searchSupplierTerms(starterKits[button.dataset.kit] || []);
    });
  });
  $("cm-search-supplier").addEventListener("click", () => {
    const text = $("cm-supplier-search").value.trim();
    if (text) void searchSupplierTerms([text]);
  });
  $("cm-supplier-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); $("cm-search-supplier").click(); }
  });
  $("cm-open-studio").addEventListener("click", async (event) => {
    event.preventDefault();
    if (!(await saveMetadata({ preventDefault() {} }))) return;
    location.assign("/admin/products/create?collection_id=" + encodeURIComponent(String(chosenId)));
  });
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
  for (const key of heroFields) {
    $("hero-" + key).addEventListener("input", updateHeroPreview);
    $("hero-" + key).addEventListener("change", updateHeroPreview);
  }
  $("cm-accent").addEventListener("input", updateHeroPreview);
  $("cm-eyebrow").addEventListener("input", updateHeroPreview);
  $("cm-description").addEventListener("input", updateHeroPreview);
  $("cm-image").addEventListener("input", updateHeroPreview);
  $("hero-pick-artwork").addEventListener("click", () => void chooseHeroMedia("hero-artwork-url"));
  $("hero-pick-background").addEventListener("click", () => void chooseHeroMedia("hero-background-url"));
  $("cm-hero-export").addEventListener("click", async () => {
    const config = heroConfigFromForm();
    if (!config) { message("Hero renderer unavailable", true); return; }
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      message("Reusable hero section settings copied. Artwork remains linked to existing media.");
    } catch {
      message("Clipboard unavailable in this browser. Save the collection to keep these settings.", true);
    }
  });
  $("cm-hero-preset").addEventListener("click", () => {
    $("hero-layout").value = "split";
    $("hero-height").value = "immersive";
    $("hero-background-mode").value = "gradient";
    $("hero-background-color").value = "#090b0c";
    $("hero-gradient-to").value = "#24130d";
    $("hero-text-color").value = "#f5f1e8";
    $("hero-overlay").value = 35;
    $("hero-artwork-scale").value = 100;
    $("cm-accent").value = "#ff7619";
    if (slugify($("cm-slug").value) === "diesel-driven") {
      $("hero-headline").value = "Diesel Driven";
      $("hero-subheadline").value = "Built for the long haul.";
    }
    updateHeroPreview();
    message("Styling applied. Choose your original transparent artwork, then save the collection.");
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
    if (!chosenId && (!$("hero-headline").value || $("hero-headline").value === "Collection")) {
      $("hero-headline").value = $("cm-title").value;
    }
    updateHeroPreview();
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
