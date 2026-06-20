const LOGO_URL =
  "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail";

const NAV_SECTIONS = [
  {
    label: "Insights",
    items: [
      { href: "/admin/dashboard/overview.html", label: "Overview" },
      { href: "/admin/dashboard/finance.html", label: "Finance" },
      { href: "/admin/dashboard/analytics.html", label: "Analytics" },
      { href: "/admin/dashboard/email.html", label: "Email" },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/admin/store.html", label: "Store Summary" },
      { href: "/admin/products.html", label: "Products" },
      { href: "/admin/media.html", label: "Media" },
      { href: "/admin/inventory.html", label: "Inventory" },
      { href: "/admin/orders.html", label: "Orders" },
      { href: "/admin/subscribers.html", label: "Subscribers" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/account.html", label: "Account" }],
  },
];

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

function isNavActive(href, activeHref) {
  if (href === activeHref) return true;
  if (activeHref === "/admin/dashboard.html" && href === "/admin/dashboard/overview.html") {
    return true;
  }
  return false;
}

function renderNav(activeHref) {
  return NAV_SECTIONS.map((section) => {
    const links = section.items
      .map(
        (item) =>
          `<a href="${item.href}" class="${isNavActive(item.href, activeHref) ? "is-active" : ""}">${item.label}</a>`
      )
      .join("");
    return `
      <div class="admin-nav-section">
        <div class="admin-nav-label">${section.label}</div>
        ${links}
      </div>`;
  }).join("");
}

function renderShell(activeHref, mainHtml, options = {}) {
  const { fullBleed = false, onReady } = options;
  const mainClass = fullBleed ? "admin-main admin-main--bleed" : "admin-main";

  document.body.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a href="/admin/dashboard/overview.html" class="admin-logo-link">
          <img class="admin-logo-img" src="${LOGO_URL}" alt="Fuel &amp; Free Time" width="160" height="160">
          <span class="admin-logo-text">Admin</span>
        </a>
        <nav class="admin-nav">${renderNav(activeHref)}</nav>
        <div class="admin-sidebar-footer">
          <div class="admin-user-email" data-admin-email>…</div>
          <button class="admin-logout-btn" type="button">Log out</button>
        </div>
      </aside>

      <button
        type="button"
        class="admin-menu-toggle"
        id="admin-menu-toggle"
        aria-label="Open navigation"
        aria-expanded="false"
        aria-controls="admin-drawer"
      >
        <span class="admin-menu-toggle-icon" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
      </button>

      <div class="admin-drawer-backdrop" id="admin-drawer-backdrop" aria-hidden="true"></div>
      <aside class="admin-drawer" id="admin-drawer" aria-hidden="true">
        <div class="admin-drawer-head">
          <a href="/admin/dashboard/overview.html" class="admin-drawer-logo">
            <img src="${LOGO_URL}" alt="" width="48" height="48">
            <span>Fuel &amp; Free Time</span>
          </a>
          <button type="button" class="admin-drawer-close" id="admin-drawer-close" aria-label="Close navigation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        <nav class="admin-nav admin-nav--drawer">${renderNav(activeHref)}</nav>
        <div class="admin-drawer-footer">
          <div class="admin-user-email" data-admin-email>…</div>
          <button class="admin-logout-btn" type="button">Log out</button>
        </div>
      </aside>

      <main class="${mainClass}">${mainHtml}</main>
    </div>
  `;

  if (fullBleed) document.body.classList.add("admin-body-bleed");

  document.querySelectorAll(".admin-logout-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
      window.location.href = "/admin/login.html";
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
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("admin-nav-open"));
  });
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  drawer.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  mq.addEventListener("change", () => close());
}
