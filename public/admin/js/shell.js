const LOGO_URL =
  "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail";

const ICONS = {
  home: '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  orders: '<path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.6"/>',
  products: '<path d="M4 13 11 6h7v7l-7 7-7-7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="15" cy="9" r="1.4" fill="currentColor"/>',
  customers: '<circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  growth: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="m9 13 2 2 4-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  discounts: '<path d="M4 9V6a2 2 0 0 1 2-2h3l11 11a2 2 0 0 1 0 3l-4 4a2 2 0 0 1-3 0L2 11" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>',
  content: '<path d="M7 4h7l4 4v12H7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 4v5h5M10 13h5M10 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  markets: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 4c2.5 2 2.5 14 0 16M12 4c-2.5 2-2.5 14 0 16" stroke="currentColor" stroke-width="1.4"/>',
  finance: '<path d="M4 9 12 4l8 5M5 9v9h14V9M9 18v-5M12 18v-5M15 18v-5M3 20h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  analytics: '<path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  store: '<path d="M4 9 5 5h14l1 4M4 9h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM5.5 13V20h13v-7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  pos: '<rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M10 18h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  agentic: '<rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v4M9 13h.01M15 13h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  email: '<path d="M4 6h16v12H4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  settings: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  chev: '<path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};

const NAV = {
  main: [
    { href: "/admin/home.html", label: "Home", icon: "home" },
    { href: "/admin/orders.html", label: "Orders", icon: "orders" },
    {
      id: "products",
      label: "Products",
      icon: "products",
      children: [
        { href: "/admin/products.html", label: "All products" },
        { href: "/admin/products.html", label: "Collections" },
        { href: "/admin/inventory.html", label: "Inventory" },
      ],
    },
    { href: "/admin/subscribers.html", label: "Customers", icon: "customers" },
    { href: "/admin/scaffold.html?view=growth", label: "Growth", icon: "growth" },
    { href: "/admin/scaffold.html?view=discounts", label: "Discounts", icon: "discounts" },
    { href: "/admin/content.html", label: "Content", icon: "content" },
    { href: "/admin/scaffold.html?view=markets", label: "Markets", icon: "markets" },
    { href: "/admin/dashboard/finance.html", label: "Finance", icon: "finance" },
    { href: "/admin/dashboard/overview.html", label: "Analytics", icon: "analytics" },
  ],
  channels: [
    {
      id: "online-store",
      label: "Online Store",
      icon: "store",
      children: [
        { href: "/admin/pages.html", label: "Pages" },
        { href: "/admin/pages.html", label: "Themes" },
      ],
    },
    { href: "/admin/scaffold.html?view=pos", label: "Point of Sale", icon: "pos" },
    { href: "/admin/scaffold.html?view=agentic", label: "Agentic", icon: "agentic" },
  ],
  apps: [{ href: "/admin/dashboard/email.html", label: "Email", icon: "email" }],
};

function ensureConsoleAssets() {
  document.body.classList.add("console-theme");
  if (!document.getElementById("console-css")) {
    const link = document.createElement("link");
    link.id = "console-css";
    link.rel = "stylesheet";
    link.href = "/admin/css/console.css";
    document.head.appendChild(link);
  }
  if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    document.head.appendChild(pre1);
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    document.head.appendChild(pre2);
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(font);
  }
}

async function adminFetch(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = "/admin/login.html";
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function centsToDollars(cents) {
  return "$" + (Number(cents || 0) / 100).toFixed(2);
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function navActive(href, activeHref) {
  if (href === activeHref) return true;
  const aliases = {
    "/admin/home.html": ["/admin/store.html", "/admin/dashboard.html"],
    "/admin/products.html": ["/admin/product-edit.html"],
    "/admin/content.html": ["/admin/media.html"],
    "/admin/dashboard/overview.html": ["/admin/dashboard/analytics.html"],
  };
  for (const [key, list] of Object.entries(aliases)) {
    if (href === key && (activeHref === key || list.some((p) => activeHref.startsWith(p)))) {
      return true;
    }
  }
  if (activeHref.startsWith("/admin/scaffold.html") && href.startsWith("/admin/scaffold.html")) {
    return href === activeHref;
  }
  return false;
}

function groupOpen(id, activeHref, children) {
  if (!children) return false;
  return children.some((c) => navActive(c.href, activeHref));
}

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function renderNavItem(item, activeHref) {
  if (item.children) {
    const open = groupOpen(item.id, activeHref, item.children);
    const parentActive = item.children.some((c) => navActive(c.href, activeHref));
    return `
      <button type="button" class="console-nav-item${parentActive ? " is-active" : ""}" data-toggle="${item.id}">
        ${icon(item.icon || "store")}
        <span style="flex:1;text-align:left">${item.label}</span>
        <svg class="chev" viewBox="0 0 24 24" fill="none">${ICONS.chev}</svg>
      </button>
      <div class="console-nav-children${open ? " is-open" : ""}" data-group="${item.id}">
        ${item.children
          .map((child) => {
            const active = navActive(child.href, activeHref);
            return `<a href="${child.href}" class="console-nav-child${active ? " is-active" : ""}">${active ? '<span class="branch">↳</span>' : ""}${child.label}</a>`;
          })
          .join("")}
      </div>`;
  }
  const active = navActive(item.href, activeHref);
  return `<a href="${item.href}" class="console-nav-item${active ? " is-active" : ""}">${icon(item.icon)}${item.label}</a>`;
}

function renderSideNav(activeHref) {
  const main = NAV.main.map((item) => renderNavItem(item, activeHref)).join("");
  const channels = NAV.channels.map((item) => renderNavItem(item, activeHref)).join("");
  const apps = NAV.apps.map((item) => renderNavItem(item, activeHref)).join("");
  return `
    <div class="console-nav-group">${main}</div>
    <div class="console-nav-label">Sales channels ${icon("chev")}</div>
    <div class="console-nav-group">${channels}</div>
    <div class="console-nav-label">Apps ${icon("chev")}</div>
    <div class="console-nav-group">${apps}</div>
    <div class="console-sidenav-foot">
      <div class="console-recent-label">Recent activity</div>
      <div class="console-recent-item">CMS pages published</div>
      <div class="console-recent-item">Store orders &amp; inventory</div>
      <div class="console-sidenav-divider"></div>
      <a href="/admin/account.html" class="console-nav-item${navActive("/admin/account.html", activeHref) ? " is-active" : ""}">${icon("settings")}Settings</a>
    </div>`;
}

function renderShell(activeHref, mainHtml, options = {}) {
  const { fullBleed = false, onReady } = options;
  ensureConsoleAssets();

  const mainClass = fullBleed
    ? "console-main admin-main console-main--bleed admin-main--bleed"
    : "console-main admin-main";

  document.body.innerHTML = `
    <div class="console-shell admin-shell">
      <header class="console-topbar">
        <a href="/admin/home.html" class="console-topbar-mark">
          <div class="console-topbar-mark-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2 21 7v10l-9 5-9-5V7z" stroke="#141414" stroke-width="2" stroke-linejoin="round"/><path d="M12 7v10M7.5 9.5l9 5M16.5 9.5l-9 5" stroke="#141414" stroke-width="1.6"/></svg>
          </div>
          <span>Admin</span>
        </a>
        <div class="console-search-wrap">
          <div class="console-search" role="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9b9b9b" stroke-width="1.8"/><path d="m20 20-3.2-3.2" stroke="#9b9b9b" stroke-width="1.8" stroke-linecap="round"/></svg>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </div>
        </div>
        <div class="console-topbar-actions">
          <button type="button" class="console-icon-btn" aria-label="Assistant" title="Agent Sam (coming soon)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="console-icon-btn" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.5"/></svg>
            <span class="console-badge-dot">3</span>
          </button>
          <div style="width:1px;height:24px;background:#3a3a3a;margin:0 6px;"></div>
          <div class="console-store-wrap">
            <button type="button" class="console-store-btn" id="console-store-btn" aria-expanded="false">
              <img src="${LOGO_URL}" alt="">
              <span>Fuel &amp; Free Time</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="#9b9b9b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="console-store-menu" id="console-store-menu">
              <div class="console-store-menu-head">
                <img src="${LOGO_URL}" alt="">
                <div><strong>Fuel &amp; Free Time</strong><br><small>fuelnfreetime.com</small></div>
              </div>
              <a href="/admin/account.html" class="console-menu-item">Store settings</a>
              <a href="/" class="console-menu-item" target="_blank" rel="noopener">View storefront</a>
              <div class="console-menu-divider"></div>
              <button type="button" class="console-menu-item admin-logout-btn">Log out</button>
            </div>
          </div>
        </div>
      </header>
      <div class="console-body">
        <aside class="console-sidenav admin-sidebar">${renderSideNav(activeHref)}</aside>
        <button type="button" class="admin-menu-toggle" id="admin-menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="admin-drawer">
          <span class="admin-menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>
        </button>
        <div class="admin-drawer-backdrop" id="admin-drawer-backdrop" aria-hidden="true"></div>
        <aside class="admin-drawer" id="admin-drawer" aria-hidden="true">
          <div class="admin-drawer-head">
            <a href="/admin/home.html" class="admin-drawer-logo">
              <img src="${LOGO_URL}" alt="" width="48" height="48">
              <span>Fuel &amp; Free Time</span>
            </a>
            <button type="button" class="admin-drawer-close" id="admin-drawer-close" aria-label="Close navigation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <nav class="console-sidenav admin-nav admin-nav--drawer" style="display:block;width:100%;border:0;background:transparent;padding:0">${renderSideNav(activeHref)}</nav>
          <div class="admin-drawer-footer">
            <div class="admin-user-email" data-admin-email>…</div>
            <button class="admin-logout-btn" type="button">Log out</button>
          </div>
        </aside>
        <main class="${mainClass}">${mainHtml}</main>
      </div>
    </div>
  `;

  if (fullBleed) document.body.classList.add("console-body-bleed", "admin-body-bleed");

  document.querySelectorAll(".admin-logout-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
      window.location.href = "/admin/login.html";
    });
  });

  const storeBtn = document.getElementById("console-store-btn");
  const storeMenu = document.getElementById("console-store-menu");
  storeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = storeMenu?.classList.toggle("open");
    storeBtn.setAttribute("aria-expanded", String(!!open));
  });
  document.addEventListener("click", () => {
    storeMenu?.classList.remove("open");
    storeBtn?.setAttribute("aria-expanded", "false");
  });

  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle");
      const group = document.querySelector(`[data-group="${id}"]`);
      group?.classList.toggle("is-open");
    });
  });

  adminFetch("/api/admin/me")
    .then((d) => {
      document.querySelectorAll("[data-admin-email]").forEach((el) => {
        el.textContent = d.email;
      });
    })
    .catch(() => {});

  initMobileNav();
  if (typeof onReady === "function") onReady();
}

function initMobileNav() {
  const toggle = document.getElementById("admin-menu-toggle");
  const drawer = document.getElementById("admin-drawer");
  const backdrop = document.getElementById("admin-drawer-backdrop");
  const closeBtn = document.getElementById("admin-drawer-close");
  if (!toggle || !drawer) return;

  const mq = window.matchMedia("(max-width: 900px)");

  function setOpen(open) {
    if (!mq.matches) {
      document.body.classList.remove("admin-nav-open");
      toggle.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
      backdrop?.setAttribute("aria-hidden", "true");
      return;
    }
    document.body.classList.toggle("admin-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    backdrop?.setAttribute("aria-hidden", String(!open));
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("admin-nav-open"));
  });
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  drawer.querySelectorAll("a.console-nav-item, a.console-nav-child").forEach((link) => {
    link.addEventListener("click", close);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  mq.addEventListener("change", () => close());
}
