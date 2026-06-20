(function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const root = document.getElementById("pdp-root");
  if (!slug || !root) {
    if (root) root.innerHTML = "<p class='pdp-error'>Product not found.</p>";
    return;
  }

  let product = null;
  let variants = [];
  let selectedVariant = null;

  function money(cents) {
    return "$" + (Number(cents) / 100).toFixed(2);
  }

  function render() {
    const images = product.images?.length
      ? product.images
      : [{ url: product.primary_image || product.image_url, is_primary: 1 }];
    const mainImg = images[0]?.url || "";
    const thumbs = images
      .map(
        (img, i) =>
          `<button type="button" class="pdp-thumb ${i === 0 ? "active" : ""}" data-url="${img.url}"><img src="${img.url}" alt=""></button>`
      )
      .join("");

    const sizeButtons = variants
      .map((v) => {
        const disabled = v.inventory_qty <= 0;
        return `<button type="button" class="pdp-size ${disabled ? "disabled" : ""}" data-id="${v.id}" data-size="${v.size}" ${disabled ? "disabled" : ""}>${v.size}${disabled ? "" : ""}</button>`;
      })
      .join("");

    root.innerHTML = `
      <nav class="pdp-crumb"><a href="/shop.html">Shop</a> / <span>${product.title}</span></nav>
      <div class="pdp-layout">
        <div class="pdp-gallery">
          <div class="pdp-main"><img id="pdp-main-img" src="${mainImg}" alt="${product.title}"></div>
          <div class="pdp-thumbs">${thumbs}</div>
        </div>
        <div class="pdp-buy">
          <p class="pdp-kicker">${product.collection || "Essentials"}</p>
          <h1>${product.title}</h1>
          <p class="pdp-price">${money(product.price_cents)}</p>
          <p class="pdp-desc">${product.description || ""}</p>
          <div class="pdp-field">
            <label>Size</label>
            <div class="pdp-sizes" id="pdp-sizes">${sizeButtons}</div>
          </div>
          <div class="pdp-actions">
            <button type="button" class="pdp-btn primary" id="pdp-add" disabled>Add to Cart</button>
            <a class="pdp-btn ghost" href="/cart.html">View Cart (<span id="pdp-cart-n">0</span>)</a>
          </div>
          <p class="pdp-note" id="pdp-stock"></p>
          <p class="pdp-checkout-note">v1 checkout saves your order — Stripe payment wiring next.</p>
        </div>
      </div>`;

    bind();
    updateCartBadge();
  }

  function bind() {
    document.querySelectorAll(".pdp-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("pdp-main-img").src = btn.dataset.url;
        document.querySelectorAll(".pdp-thumb").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.querySelectorAll(".pdp-size:not(.disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pdp-size").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedVariant = variants.find((v) => String(v.id) === btn.dataset.id);
        document.getElementById("pdp-add").disabled = !selectedVariant;
        const stock = document.getElementById("pdp-stock");
        if (selectedVariant) {
          stock.textContent =
            selectedVariant.inventory_qty <= 5
              ? `Only ${selectedVariant.inventory_qty} left in ${selectedVariant.size}`
              : `${selectedVariant.inventory_qty} in stock`;
        }
      });
    });

    document.getElementById("pdp-add")?.addEventListener("click", () => {
      if (!selectedVariant || !window.FNF_STORE) return;
      window.FNF_STORE.addItem({
        variant_id: selectedVariant.id,
        product_id: product.id,
        slug: product.slug,
        title: product.title,
        size: selectedVariant.size,
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

  function updateCartBadge() {
    const n = window.FNF_STORE?.cartCount() || 0;
    const el = document.getElementById("pdp-cart-n");
    if (el) el.textContent = String(n);
  }

  document.addEventListener("fnf:cart-updated", updateCartBadge);

  fetch("/api/store/products/" + encodeURIComponent(slug))
    .then((r) => r.json())
    .then((data) => {
      if (!data.ok) throw new Error(data.error || "Not found");
      product = data.product;
      variants = data.variants || [];
      render();
    })
    .catch(() => {
      root.innerHTML = `<p class="pdp-error">Product not found. <a href="/shop.html">Back to shop</a></p>`;
    });
})();
