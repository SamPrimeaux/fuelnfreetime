(function () {
  const LOGO =
    "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail";

  const CART_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>`;

  const NAV = [
    { href: "/", label: "Home", match: (p) => p === "/" || p === "/index.html" },
    { href: "/shop.html", label: "Shop", match: (p) => p.includes("shop") || p.startsWith("/products/") || p.startsWith("/collections/") },
    { href: "/about.html", label: "About", match: (p) => p.includes("about") },
    { href: "/community.html", label: "Community", match: (p) => p.includes("community") },
  ];

  function cartIconHtml() {
    return `<a href="/cart.html" class="fnf-cart-btn" id="fnfCartBtn" aria-label="Cart">
      ${CART_SVG}
      <span class="fnf-cart-count" data-cart-count hidden>0</span>
    </a>`;
  }

  function shellHtml() {
    const navItems = NAV.map(
      (n) => `<li><a href="${n.href}" data-nav="${n.label.toLowerCase()}">${n.label}</a></li>`
    ).join("");
    const mobileItems = NAV.map(
      (n) => `<li><a href="${n.href}" data-nav="${n.label.toLowerCase()}">${n.label}</a></li>`
    ).join("");

    return `
      <div class="fnf-shell" id="fnfApp">
        <header class="fnf-header" id="fnfHeader">
          <div class="fnf-row">
            <a class="fnf-logo" href="/" aria-label="Fuel & Free Time">
              <img src="${LOGO}" alt="Fuel & Free Time" width="256" height="68">
            </a>
            <nav class="fnf-primary" aria-label="Primary">
              <ul class="fnf-nav">${navItems}</ul>
            </nav>
            <div class="fnf-actions">
              ${cartIconHtml()}
              <button class="fnf-burger" id="fnfBurger" type="button" aria-label="Open menu" aria-controls="fnfMobile" aria-expanded="false">
                <span></span><span></span><span></span>
              </button>
            </div>
          </div>
        </header>
        <nav class="fnf-mobile" id="fnfMobile" aria-label="Mobile">
          <ul>${mobileItems}<li><a href="/cart.html">Cart</a></li></ul>
        </nav>
        <div class="fnf-spacer" aria-hidden="true"></div>
      </div>`;
  }

  function setActiveNav() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    const anchors = document.querySelectorAll(".fnf-nav a, .fnf-mobile a");
    anchors.forEach((a) => a.classList.remove("is-active"));

    for (const item of NAV) {
      if (item.match(path)) {
        document.querySelectorAll(`.fnf-nav a[data-nav="${item.label.toLowerCase()}"], .fnf-mobile a[data-nav="${item.label.toLowerCase()}"]`).forEach((a) => a.classList.add("is-active"));
        break;
      }
    }

    if (path.includes("cart")) {
      document.getElementById("fnfCartBtn")?.classList.add("is-active");
    }
  }

  function bindHeader() {
    const header = document.getElementById("fnfHeader");
    const burger = document.getElementById("fnfBurger");
    const mobile = document.getElementById("fnfMobile");
    if (!header || !burger || !mobile) return;

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > lastY;
      header.classList.toggle("is-scrolling", y > 10);
      header.classList.toggle("is-hidden", y > 120 && down);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const closeMenu = () => {
      burger.classList.remove("is-open");
      mobile.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    };

    burger.addEventListener("click", () => {
      const open = !burger.classList.contains("is-open");
      burger.classList.toggle("is-open", open);
      mobile.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (!mobile.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    mobile.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeMenu);
    });
  }

  function updateCartBadge() {
    const n = window.FNF_STORE?.cartCount?.() ?? 0;
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function mount() {
    const mountEl = document.getElementById("fnf-store-mount");
    if (!mountEl) return;
    mountEl.innerHTML = shellHtml();
    setActiveNav();
    bindHeader();
    updateCartBadge();
  }

  window.FNF_SHELL = { updateCartBadge, cartIconHtml, CART_SVG };

  document.addEventListener("fnf:cart-updated", updateCartBadge);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
