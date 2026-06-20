(function () {
  const CART_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>`;

  const FALLBACK_NAV = {
    logoUrl:
      "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail",
    logoHeight: 68,
    brandAccent: "#ff4500",
    brandAccentLight: "#E5A558",
    items: [
      { id: "home", label: "Home", href: "/", matchPrefixes: ["/", "/index.html"] },
      {
        id: "shop",
        label: "Shop",
        href: "/shop",
        matchPrefixes: ["/shop", "/products/", "/collections/"],
      },
      { id: "about", label: "About", href: "/about", matchPrefixes: ["/about"] },
      {
        id: "community",
        label: "Community",
        href: "/community",
        matchPrefixes: ["/community"],
      },
    ],
  };

  let navConfig = FALLBACK_NAV;

  function normalizePath(pathname) {
    const p = (pathname || "/").replace(/\/+$/, "") || "/";
    return p.toLowerCase();
  }

  function matchItem(pathname) {
    const path = normalizePath(pathname);
    let best = null;
    let bestLen = -1;

    for (const item of navConfig.items) {
      if (item.visible === false) continue;
      const prefixes = item.matchPrefixes?.length ? item.matchPrefixes : [item.href];
      for (const raw of prefixes) {
        const prefix = normalizePath(String(raw).replace(/\.html$/, "") || "/");
        const hrefNorm = normalizePath(String(item.href).replace(/\.html$/, "") || "/");

        if (prefix === "/" && path === "/") {
          if (1 > bestLen) {
            best = item;
            bestLen = 1;
          }
          continue;
        }
        if (prefix === "/" && path !== "/") continue;

        for (const cand of [prefix, hrefNorm]) {
          if (cand === "/") continue;
          if (path === cand || path.startsWith(cand + "/") || path.startsWith(cand)) {
            if (cand.length > bestLen) {
              best = item;
              bestLen = cand.length;
            }
          }
        }
      }
    }
    return best;
  }

  function applyTheme() {
    const root = document.documentElement;
    root.style.setProperty("--fnf-accent", navConfig.brandAccent);
    root.style.setProperty("--fnf-accent-light", navConfig.brandAccentLight);
    root.style.setProperty("--fnf-logo-height", `${navConfig.logoHeight}px`);
  }

  function cartIconHtml() {
    return `<a href="/cart.html" class="fnf-cart-btn" id="fnfCartBtn" aria-label="Cart">${CART_SVG}<span class="fnf-cart-count" data-cart-count hidden>0</span></a>`;
  }

  function headerBlock(includeSpacer) {
    const visibleItems = navConfig.items.filter((i) => i.visible !== false);
    const navItems = visibleItems
      .map((n) => `<li><a href="${n.href}" data-nav-id="${n.id}">${n.label}</a></li>`)
      .join("");
    const mobileItems = visibleItems
      .map((n) => `<li><a href="${n.href}" data-nav-id="${n.id}">${n.label}</a></li>`)
      .join("");

    return `
      <header class="fnf-header" id="fnfHeader">
        <div class="fnf-row">
          <a class="fnf-logo" href="/" aria-label="Fuel & Free Time">
            <img src="${navConfig.logoUrl}" alt="Fuel & Free Time" width="256" height="${navConfig.logoHeight}">
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
      <div class="fnf-mobile" id="fnfMobile" aria-hidden="true">
        <div class="fnf-mobile-backdrop" id="fnfMobileBackdrop"></div>
        <nav class="fnf-mobile-panel" aria-label="Mobile">
          <ul>${mobileItems}<li><a href="/cart.html" data-nav-id="cart">Cart</a></li></ul>
        </nav>
      </div>
      ${includeSpacer ? '<div class="fnf-spacer" aria-hidden="true"></div>' : ""}`;
  }

  function setActiveNav() {
    const path = location.pathname;
    const matched = matchItem(path);
    document.querySelectorAll(".fnf-nav a, .fnf-mobile-panel a").forEach((a) => {
      a.classList.toggle("is-active", matched && a.dataset.navId === matched.id);
    });
    if (path.includes("cart")) {
      document.getElementById("fnfCartBtn")?.classList.add("is-active");
      document.querySelector('.fnf-mobile-panel a[data-nav-id="cart"]')?.classList.add("is-active");
    }
  }

  function bindHeader() {
    const header = document.getElementById("fnfHeader");
    const burger = document.getElementById("fnfBurger");
    const mobile = document.getElementById("fnfMobile");
    const backdrop = document.getElementById("fnfMobileBackdrop");
    if (!header || !burger || !mobile) return;

    let lastY = window.scrollY;
    let hidden = false;
    let ticking = false;

    const emitGlass = (opacity) => {
      document.documentElement.style.setProperty("--fnf-glass-opacity", String(opacity));
      document.dispatchEvent(new CustomEvent("fnf:header-glass", { detail: { opacity } }));
    };

    const updateHeader = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      const velocity = Math.abs(delta);

      if (delta < 0 && y > 20) {
        const opacity = Math.min(0.18 + velocity * 0.014, 0.72);
        emitGlass(opacity);
        header.classList.add("is-glass");
      } else if (y <= 20) {
        emitGlass(0);
        header.classList.remove("is-glass");
      } else if (delta > 0) {
        emitGlass(Math.max(0, parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fnf-glass-opacity")) - 0.08));
      }

      if (y < 64) {
        if (hidden) {
          header.classList.remove("is-hidden");
          hidden = false;
        }
      } else if (delta > 6 && y > 96) {
        if (!hidden) {
          header.classList.add("is-hidden");
          hidden = true;
        }
      } else if (delta < -6) {
        if (hidden) {
          header.classList.remove("is-hidden");
          hidden = false;
        }
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateHeader();

    const closeMenu = () => {
      burger.classList.remove("is-open");
      mobile.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      mobile.setAttribute("aria-hidden", "true");
      document.body.classList.remove("fnf-nav-open");
      burger.setAttribute("aria-label", "Open menu");
    };

    const openMenu = () => {
      burger.classList.add("is-open");
      mobile.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      mobile.setAttribute("aria-hidden", "false");
      document.body.classList.add("fnf-nav-open");
      burger.setAttribute("aria-label", "Close menu");
      header.classList.remove("is-hidden");
      hidden = false;
    };

    burger.addEventListener("click", () => {
      if (burger.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    backdrop?.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    mobile.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  function updateCartBadge() {
    const n = window.FNF_STORE?.cartCount?.() ?? 0;
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function renderInto(mountEl, includeSpacer) {
    mountEl.innerHTML = includeSpacer
      ? `<div class="fnf-shell" id="fnfApp">${headerBlock(true)}</div>`
      : headerBlock(false);
    applyTheme();
    setActiveNav();
    bindHeader();
    updateCartBadge();
  }

  async function loadNavConfig() {
    try {
      const res = await fetch("/api/store/nav");
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.nav) navConfig = data.nav;
    } catch {
      /* fallback */
    }
  }

  async function mount() {
    const storeMount = document.getElementById("fnf-store-mount");
    const headerMount = document.getElementById("fnf-header-mount");

    if (!storeMount && !headerMount) return;

    await loadNavConfig();

    if (storeMount) renderInto(storeMount, true);
    if (headerMount) renderInto(headerMount, false);
  }

  window.FNF_SHELL = {
    updateCartBadge,
    cartIconHtml,
    CART_SVG,
    reload: mount,
    getNavConfig: () => navConfig,
  };

  document.addEventListener("fnf:cart-updated", updateCartBadge);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
