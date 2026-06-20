const NAV_ITEMS = [
  { href: "/admin/dashboard.html", label: "Dashboard" },
  { href: "/admin/products.html", label: "Products" },
  { href: "/admin/media.html", label: "Media" },
  { href: "/admin/inventory.html", label: "Inventory" },
  { href: "/admin/orders.html", label: "Orders" },
  { href: "/admin/subscribers.html", label: "Subscribers" },
  { href: "/admin/account.html", label: "Account" },
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

function renderShell(activeHref, mainHtml) {
  const navHtml = NAV_ITEMS.map(
    (item) =>
      `<a href="${item.href}" class="${item.href === activeHref ? "is-active" : ""}">${item.label}</a>`
  ).join("");

  document.body.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-logo">FUEL<span>&</span>FREE<span> TIME</span></div>
        <nav class="admin-nav">${navHtml}</nav>
        <div class="admin-sidebar-footer">
          <div class="admin-user-email" id="admin-user-email">…</div>
          <button class="admin-logout-btn" id="admin-logout-btn">Log out</button>
        </div>
      </aside>
      <main class="admin-main">${mainHtml}</main>
    </div>
  `;

  document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login.html";
  });

  adminFetch("/api/admin/me")
    .then((d) => {
      document.getElementById("admin-user-email").textContent = d.email;
    })
    .catch(() => {});
}
