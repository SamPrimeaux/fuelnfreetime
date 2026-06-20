(function () {
  const CART_KEY = "fnf_cart";

  function money(cents) {
    return "$" + (Number(cents) / 100).toFixed(2);
  }

  function getCart() {
    return window.FNF_STORE?.getCart() || JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  }

  function setCart(items) {
    if (window.FNF_STORE) window.FNF_STORE.setCart(items);
    else localStorage.setItem(CART_KEY, JSON.stringify(items));
    render();
    updateBadge();
  }

  function updateBadge() {
    const n = getCart().reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function render() {
    const root = document.getElementById("cart-root");
    const form = document.getElementById("checkout-form");
    if (!root) return;

    const cart = getCart();
    if (!cart.length) {
      root.innerHTML = `
        <p class="cart-empty">Your cart is empty.</p>
        <a class="store-btn primary" href="/shop.html">Continue shopping</a>`;
      if (form) form.hidden = true;
      return;
    }

    if (form) form.hidden = false;
    let total = 0;
    root.innerHTML = cart
      .map((item, idx) => {
        const line = (item.price_cents || 0) * item.qty;
        total += line;
        return `
        <article class="cart-line" data-idx="${idx}">
          <img src="${item.image || ""}" alt="">
          <div class="cart-line-body">
            <h2>${item.title}</h2>
            <p>${item.size ? "Size " + item.size : ""} · ${money(item.price_cents)}</p>
            <div class="cart-qty">
              <button type="button" data-dec aria-label="Decrease">−</button>
              <span>${item.qty}</span>
              <button type="button" data-inc aria-label="Increase">+</button>
            </div>
          </div>
          <div class="cart-line-total">${money(line)}</div>
          <button type="button" class="cart-remove" data-remove aria-label="Remove">×</button>
        </article>`;
      })
      .join("");

    const totalEl = document.getElementById("cart-total");
    if (totalEl) totalEl.textContent = money(total);

    root.querySelectorAll("[data-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest(".cart-line").dataset.idx);
        const next = [...getCart()];
        if (next[idx].qty > 1) next[idx].qty -= 1;
        else next.splice(idx, 1);
        setCart(next);
      });
    });
    root.querySelectorAll("[data-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest(".cart-line").dataset.idx);
        const next = [...getCart()];
        if (next[idx].qty < 10) next[idx].qty += 1;
        setCart(next);
      });
    });
    root.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest(".cart-line").dataset.idx);
        const next = [...getCart()];
        next.splice(idx, 1);
        setCart(next);
      });
    });
  }

  async function checkout(e) {
    e.preventDefault();
    const email = document.getElementById("checkout-email")?.value?.trim();
    const status = document.getElementById("checkout-status");
    const btn = document.getElementById("checkout-submit");
    const cart = getCart();
    if (!email || !cart.length) return;

    btn.disabled = true;
    status.textContent = "Placing order…";
    status.className = "checkout-status";

    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: cart.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      setCart([]);
      status.textContent = `Order #${data.order_id} received — ${data.message}`;
      status.className = "checkout-status ok";
    } catch (err) {
      status.textContent = err.message || "Checkout failed";
      status.className = "checkout-status err";
      btn.disabled = false;
    }
  }

  document.getElementById("checkout-form")?.addEventListener("submit", checkout);
  document.addEventListener("fnf:cart-updated", () => {
    render();
    updateBadge();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      render();
      updateBadge();
    });
  } else {
    render();
    updateBadge();
  }
})();
