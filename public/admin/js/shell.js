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
          <div class="admin-user-email" id="admin-user-email">…</div>
          <button class="admin-logout-btn" id="admin-logout-btn" type="button">Log out</button>
        </div>
      </aside>
      <main class="${mainClass}">${mainHtml}</main>
    </div>
  `;

  if (fullBleed) document.body.classList.add("admin-body-bleed");

  document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login.html";
  });

  adminFetch("/api/admin/me")
    .then((d) => {
      document.getElementById("admin-user-email").textContent = d.email;
    })
    .catch(() => {});

  if (typeof onReady === "function") onReady();
}
