import { buildProductOptions, resolveSelectedVariant, sizeHasVariant, variantIsLocallyAvailable, optionKey } from "./product-options.mjs";

(function () {
  const root = document.getElementById("pdp-root");
  if (!root) return;

  function getProductSlug() {
    const fromQuery = new URLSearchParams(location.search).get("slug");
    if (fromQuery) return fromQuery.trim();
    const match = location.pathname.match(/^\/products\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  const slug = getProductSlug();

  let product = null;
  let variants = [];
  let selectedVariant = null;
  let selectedColor = "";
  let selectedSize = "";
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

  function money(cents) {
    return "$" + (Number(cents) / 100).toFixed(2);
  }

  function formatPrice(cents) {
    if (!cents || cents <= 0) return { label: "Price coming soon", tbd: true };
    return { label: money(cents), tbd: false };
  }

  function setMeta(p) {
    if (!p) return;
    document.title = `${p.title} – Fuel & Free Time`;
    const desc = (p.description || `${p.title} — Fuel & Free Time apparel.`).slice(0, 160);
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "description";
      document.head.appendChild(tag);
    }
    tag.content = desc;
    const img = p.primary_image || p.image_url;
    if (img) {
      for (const prop of ["og:image", "twitter:image"]) {
        let og = document.querySelector(`meta[property="${prop}"]`);
        if (!og) {
          og = document.createElement("meta");
          og.setAttribute("property", prop);
          document.head.appendChild(og);
        }
        og.content = img.startsWith("http") ? img : location.origin + img;
      }
    }
  }

  function renderLoading() {
    root.innerHTML = `
      <div class="pdp-loading">
        <div class="pdp-skel line sm"></div>
        <div class="pdp-loading-grid">
          <div class="pdp-skel hero"></div>
          <div>
            <div class="pdp-skel line sm"></div>
            <div class="pdp-skel line lg"></div>
            <div class="pdp-skel line"></div>
            <div class="pdp-skel line"></div>
          </div>
        </div>
      </div>`;
  }

  function renderError(message) {
    root.innerHTML = `
      <div class="pdp-error-wrap">
        <h1>Product not found</h1>
        <p>${esc(message || "This item may have moved or is not available yet.")}</p>
        <a class="pdp-btn primary" href="/shop">Back to shop</a>
      </div>`;
  }

  function purchaseReady() {
    return variants.some(variantIsLocallyAvailable);
  }

  function displayPriceCents() {
    if (selectedVariant?.price_cents > 0) return selectedVariant.price_cents;
    const variantPrice = variants.find((v) => v.price_cents > 0)?.price_cents;
    if (variantPrice) return variantPrice;
    return product?.price_cents || 0;
  }

  function render() {
    const images = product.images?.length
      ? product.images
      : [{ url: product.primary_image || product.image_url, is_primary: 1 }];
    const mainImg = images[0]?.url || "";
    const thumbs = images
      .map(
        (img, i) =>
          `<button type="button" class="pdp-thumb ${i === 0 ? "active" : ""}" data-url="${esc(img.url)}" aria-label="View image ${i + 1}"><img src="${esc(img.url)}" alt=""></button>`
      )
      .join("");

    const canBuy = purchaseReady();
    const price = formatPrice(displayPriceCents());

    let sizeSection = "";
    if (variants.length) {
      const options = buildProductOptions(variants);
      if (!options.colors.some((color) => optionKey(color) === optionKey(selectedColor))) {
        selectedColor = options.colors[0] || "";
      }
      const colorButtons = options.colors.map((color) =>
        `<button type="button" class="pdp-color${optionKey(color) === optionKey(selectedColor) ? " active" : ""}" data-color="${esc(color)}" aria-pressed="${optionKey(color) === optionKey(selectedColor)}">${esc(color)}</button>`
      ).join("");
      const sizeButtons = options.sizes.map((size) => {
        const exists = sizeHasVariant(variants, selectedColor, size);
        return `<button type="button" class="pdp-size${optionKey(size) === optionKey(selectedSize) ? " active" : ""}" data-size="${esc(size)}" aria-pressed="${optionKey(size) === optionKey(selectedSize)}" ${exists ? "" : 'disabled title="Not offered in this color"'}>${esc(size)}</button>`;
      }).join("");
      sizeSection = `
        ${options.colors.length > 1 ? `<div class="pdp-field"><div class="pdp-field-heading"><span>Color</span><strong id="pdp-color-name">${esc(selectedColor)}</strong></div><div class="pdp-colors" id="pdp-colors">${colorButtons}</div></div>` : ""}
        <div class="pdp-field"><div class="pdp-field-heading"><span>Size</span><strong id="pdp-size-name">${esc(selectedSize || "Choose a size")}</strong></div>
          <div class="pdp-sizes" id="pdp-sizes">${sizeButtons}</div></div>`;
    } else {
      sizeSection = `
        <div class="pdp-unavailable">
          Sizes and inventory are being set up for this item. Check back soon or browse the rest of the shop.
        </div>`;
    }

    root.innerHTML = `
      <nav class="pdp-crumb" aria-label="Breadcrumb"><a href="/shop">Shop</a> <span aria-hidden="true">/</span> <span>${esc(product.title)}</span></nav>
      <div class="pdp-layout">
        <div class="pdp-gallery">
          <div class="pdp-main"><img id="pdp-main-img" src="${esc(mainImg)}" alt="${esc(product.title)}"></div>
          ${images.length > 1 ? `<div class="pdp-thumbs">${thumbs}</div>` : ""}
        </div>
        <div class="pdp-buy">
          <p class="pdp-drop-label">From the collection</p>
          <p class="pdp-kicker">${esc(product.collection || "Shop")}</p>
          <h1>${esc(product.title)}</h1>
          <p class="pdp-price ${price.tbd ? "is-tbd" : ""}">${price.label}</p>
          ${product.description ? `<p class="pdp-desc">${esc(product.description)}</p>` : ""}
          ${sizeSection}
          <div class="pdp-actions">
            <button type="button" class="pdp-btn primary" id="pdp-add" disabled>${canBuy ? "Choose a size" : "Checkout unavailable"}</button>
            ${cartIconButton()}
          </div>
          <p class="pdp-note" id="pdp-stock" aria-live="polite">${canBuy ? "Select options to check availability." : "Selected options are visible. Checkout is paused until inventory can be confirmed."}</p>
          ${canBuy ? `<p class="pdp-checkout-note">Secure checkout powered by Stripe.</p>` : ""}
          <div class="pdp-assurances" aria-label="Product information">
            <div><strong>Availability</strong><span>${canBuy ? "Stock is rechecked at checkout." : "Purchase options will open after stock is verified."}</span></div>
            <div><strong>Checkout</strong><span>${canBuy ? "Secure Stripe payment at checkout." : "No payment or order is collected while unavailable."}</span></div>
            <div><strong>Details</strong><span>Explore garment specifications and available options.</span></div>
          </div>
        </div>
      </div>
      <section class="pdp-story">
        <p class="pdp-kicker">The piece, in context</p>
        <h2>Made for the hours after the work is done.</h2>
        <p>Every Fuel & Free Time piece starts with the same idea: what you wear off the clock should feel as considered as the work that bought you that freedom.</p>
      </section>
      <section class="pdp-related" id="pdp-related" hidden></section>`;

    bind();
    updateCartBadge();
    loadRelated();
  }

  function bind() {
    document.querySelectorAll(".pdp-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("pdp-main-img").src = btn.dataset.url;
        document.querySelectorAll(".pdp-thumb").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    const syncOptions = () => {
      selectedVariant = resolveSelectedVariant(variants, { color: selectedColor, size: selectedSize });
      const available = variantIsLocallyAvailable(selectedVariant);
      for (const btn of document.querySelectorAll(".pdp-color")) {
        const active = optionKey(btn.dataset.color) === optionKey(selectedColor);
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", String(active));
      }
      for (const btn of document.querySelectorAll(".pdp-size")) {
        const exists = sizeHasVariant(variants, selectedColor, btn.dataset.size);
        const active = exists && optionKey(btn.dataset.size) === optionKey(selectedSize);
        btn.disabled = !exists;
        btn.classList.toggle("active", active);
        btn.classList.toggle("disabled", !exists);
        btn.setAttribute("aria-pressed", String(active));
      }
      const title = document.getElementById("pdp-color-name");
      if (title) title.textContent = selectedColor;
      const sizeName = document.getElementById("pdp-size-name");
      if (sizeName) sizeName.textContent = selectedSize || "Choose a size";
      const action = document.getElementById("pdp-add");
      action.disabled = !available;
      action.textContent = available ? "Add to bag" : !selectedVariant && purchaseReady()
        ? "Choose a size" : "Checkout unavailable";
      const priceEl = document.querySelector(".pdp-price");
      if (priceEl) {
        const price = formatPrice(selectedVariant?.price_cents || product.price_cents);
        priceEl.textContent = price.label;
        priceEl.classList.toggle("is-tbd", price.tbd);
      }
      const stock = document.getElementById("pdp-stock");
      if (stock) stock.textContent = available
        ? "In stock — availability rechecked at checkout."
        : selectedVariant
          ? "This combination is listed, but purchase availability is not yet confirmed."
          : "Choose a size to view this combination.";
    };

    document.querySelectorAll(".pdp-color").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color;
        if (!sizeHasVariant(variants, selectedColor, selectedSize)) selectedSize = "";
        syncOptions();
      });
    });
    document.querySelectorAll(".pdp-size").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSize = btn.dataset.size;
        syncOptions();
      });
    });
    if (variants.length === 1 && variantIsLocallyAvailable(variants[0])) {
      selectedColor = variants[0].color || "";
      selectedSize = variants[0].size || variants[0].sku || "One size";
    }
    syncOptions();

    document.getElementById("pdp-add")?.addEventListener("click", () => {
      if (!selectedVariant || !window.FNF_STORE) return;
      window.FNF_STORE.addItem({
        variant_id: selectedVariant.id,
        product_id: product.id,
        slug: product.slug,
        title: product.title,
        size: selectedVariant.size,
        color: selectedVariant.color || "",
        price_cents: selectedVariant.price_cents || product.price_cents,
        image: product.primary_image || product.image_url,
        qty: 1,
      });
      updateCartBadge();
      const btn = document.getElementById("pdp-add");
      btn.textContent = "Added ✓";
      setTimeout(() => {
        btn.textContent = "Add to Cart";
      }, 1200);
    });
  }

  async function loadRelated() {
    const section = document.getElementById("pdp-related");
    if (!section || !product) return;
    try {
      const res = await fetch("/api/store/products");
      const data = await res.json();
      const others = (data.products || []).filter((p) => p.slug !== product.slug).slice(0, 4);
      if (!others.length) return;
      section.hidden = false;
      section.innerHTML = `
        <h2>More from the shop</h2>
        <div class="pdp-related-grid">
          ${others
            .map(
              (p) => `
            <a class="pdp-related-card" href="/products/${encodeURIComponent(p.slug)}">
              <img src="${esc(p.primary_image || p.image_url)}" alt="${esc(p.title)}" loading="lazy">
              <div><strong>${esc(p.title)}</strong><span>${money(p.price_cents)}</span></div>
            </a>`
            )
            .join("")}
        </div>`;
    } catch {
      /* optional */
    }
  }

  function updateCartBadge() {
    const n = window.FNF_STORE?.cartCount() || 0;
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = String(n);
      badge.hidden = n === 0;
    });
    window.FNF_SHELL?.updateCartBadge?.();
  }

  function cartIconButton() {
    const svg = window.FNF_SHELL?.CART_SVG || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>`;
    const n = window.FNF_STORE?.cartCount() || 0;
    return `<a class="pdp-btn icon" href="/cart" aria-label="View cart">${svg}<span class="fnf-cart-count" data-cart-count ${n ? "" : "hidden"}>${n}</span></a>`;
  }

  document.addEventListener("fnf:cart-updated", updateCartBadge);

  if (!slug) {
    renderError("No product was specified.");
    return;
  }

  renderLoading();

  fetch("/api/store/products/" + encodeURIComponent(slug))
    .then(async (r) => {
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Not found");
      return data;
    })
    .then((data) => {
      product = data.product;
      variants = data.variants || [];
      root.dataset.hProduct = product.slug;
      setMeta(product);
      render();
    })
    .catch((err) => {
      renderError(err.message === "Product not found" ? "We couldn't find that product in our catalog." : err.message);
    });
})();
