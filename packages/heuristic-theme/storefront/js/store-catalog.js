/**
 * Injects live products from D1 into the shop grid — no placeholder cards.
 */
(function () {
  const CART_KEY = "fnf_cart";

  function money(cents) {
    return "$" + (Number(cents) / 100).toFixed(2);
  }

  function sizesLabel(sizes) {
    if (!sizes) return "—";
    const arr = sizes.split(",").filter(Boolean);
    if (arr.length <= 1) return arr[0] || "—";
    return arr[0] + "–" + arr[arr.length - 1];
  }

  function buildCard(p) {
    const inv = Number(p.total_inventory || 0);
    const invNote =
      inv > 0 && inv <= 5
        ? `<p class="fft-fuelnote inv-note" style="color:var(--accent);font-weight:800">Only ${inv} left!</p>`
        : `<p class="fft-fuelnote inv-note"></p>`;
    const badge = p.collection
      ? `<span class="fft-badge alt">${p.collection.replace(/^\w/, (c) => c.toUpperCase())}</span>`
      : "";
    const newBadge = inv > 0 ? `<span class="fft-badge">LIVE</span>` : "";

    const article = document.createElement("article");
    article.className = "fft-card reveal on";
    article.dataset.live = "true";
    article.dataset.coll = (p.collection || "essentials").toLowerCase();
    article.dataset.tags = "new live";
    article.dataset.price = String(p.price_cents / 100);
    article.dataset.sizes = p.sizes || "";
    article.dataset.color = "Black";
    article.dataset.id = "live-" + p.id;
    article.dataset.inventory = String(inv);
    article.dataset.title = p.title;
    article.dataset.img = p.primary_image || p.image_url;
    article.dataset.url = "/products/" + p.slug;

    article.innerHTML = `
      <div class="fft-media">
        <button class="fft-wish" type="button" aria-label="Add to wishlist">♥</button>
        <img class="fft-img" src="${p.primary_image || p.image_url}" alt="${p.title}" loading="lazy">
        <div class="fft-badges">${newBadge}${badge}</div>
      </div>
      <div class="fft-info">
        <div class="fft-title">${p.title}</div>
        <div class="fft-meta"><span>${money(p.price_cents)}</span><span>${sizesLabel(p.sizes)}</span></div>
        ${invNote}
      </div>
      <div class="fft-actions-row">
        <a class="fft-btn view" href="/products/${p.slug}">View</a>
        <button class="fft-btn buy" type="button" data-quickview>Quick View</button>
      </div>`;

    return article;
  }

  function renderEmpty(grid) {
    grid.innerHTML = `
      <div class="fft-empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem">
        <h3 style="margin:0 0 .5rem;font-size:1.25rem">Products coming online</h3>
        <p style="margin:0;color:var(--muted,#666);max-width:36ch;margin-inline:auto">
          The catalog is managed from your admin dashboard. Add products in Admin → Products.
        </p>
      </div>`;
  }

  function bindLiveCardActions(grid) {
    if (grid.dataset.liveBound) return;
    grid.dataset.liveBound = "1";
    grid.addEventListener("click", (e) => {
      const qvBtn = e.target.closest("[data-quickview]");
      if (!qvBtn) return;
      const card = qvBtn.closest(".fft-card");
      const qv = document.getElementById("fft-qv");
      if (!card || !qv) return;
      const qvImg = document.getElementById("fft-qv-img");
      const qvTitle = document.getElementById("fft-qv-title");
      const qvMeta = document.getElementById("fft-qv-meta");
      const qvLink = document.getElementById("fft-qv-link");
      if (qvImg) qvImg.src = card.dataset.img || "";
      if (qvTitle) qvTitle.textContent = card.dataset.title || "";
      if (qvMeta)
        qvMeta.textContent = `$${parseFloat(card.dataset.price || "0").toFixed(2)} • ${card.dataset.sizes || ""}`;
      if (qvLink) qvLink.href = card.dataset.url || "#";
      qv.classList.remove("u-hide");
    });
  }

  async function loadLiveProducts() {
    const grid = document.getElementById("fft-grid");
    if (!grid) return;

    try {
      const res = await fetch("/api/store/products");
      const data = await res.json();
      grid.innerHTML = "";

      if (!res.ok || !data.products?.length) {
        renderEmpty(grid);
        return;
      }

      const frag = document.createDocumentFragment();
      data.products.forEach((p) => frag.appendChild(buildCard(p)));
      grid.appendChild(frag);

      bindLiveCardActions(grid);
      document.dispatchEvent(new CustomEvent("fnf:catalog-ready"));
    } catch (err) {
      console.warn("Live catalog:", err);
      renderEmpty(grid);
    }
  }

  window.FNF_STORE = {
    CART_KEY,
    getCart() {
      try {
        return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      } catch {
        return [];
      }
    },
    setCart(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      document.dispatchEvent(new CustomEvent("fnf:cart-updated"));
    },
    addItem(item) {
      const cart = this.getCart();
      const existing = cart.find((i) => i.variant_id === item.variant_id);
      if (existing) existing.qty += item.qty;
      else cart.push(item);
      this.setCart(cart);
    },
    cartCount() {
      return this.getCart().reduce((n, i) => n + i.qty, 0);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadLiveProducts);
  } else {
    loadLiveProducts();
  }
})();
