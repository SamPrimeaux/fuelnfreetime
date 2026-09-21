import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { requireSession } from "../lib/api";

const LOGO_URL =
  "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ad23b2d9-e2e4-4ad6-eb81-9e4c983df000/thumbnail";

type NavLinkItem = { to: string; label: string; end?: boolean };
type NavGroup = { label: string; to?: string; children?: NavLinkItem[] };
type NavSection = { title?: string; items: (NavLinkItem | NavGroup)[] };

const NAV: NavSection[] = [
  {
    items: [
      { to: "/admin/home.html", label: "Home" },
      { to: "/admin/orders.html", label: "Orders" },
      {
        label: "Products",
        children: [
          { to: "/products/create", label: "Create product" },
          { to: "/admin/products.html", label: "All products" },
          { to: "/admin/inventory.html", label: "Inventory" },
        ],
      },
      { to: "/admin/subscribers.html", label: "Customers" },
      { to: "/admin/content.html", label: "Content" },
      {
        label: "Analytics",
        to: "/analytics/overview",
        children: [
          { to: "/analytics/overview", label: "Overview", end: true },
          { to: "/analytics/finance", label: "Finance", end: true },
          { to: "/analytics/health", label: "Health", end: true },
        ],
      },
    ],
  },
  {
    title: "Sales channels",
    items: [
      { to: "/admin/store", label: "Online Store" },
      { to: "/admin/pages.html", label: "Pages" },
    ],
  },
  {
    title: "Apps",
    items: [{ to: "/admin/dashboard/email.html", label: "Email" }],
  },
  {
    items: [{ to: "/account", label: "Account" }],
  },
];

function isGroup(item: NavLinkItem | NavGroup): item is NavGroup {
  return "children" in item && !!item.children;
}

function LegacyLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  const SPA_PREFIXES = ["/analytics", "/account", "/products"];
  const isSpa = SPA_PREFIXES.some((prefix) => to.startsWith(prefix));
  if (isSpa) {
    return (
      <NavLink to={to} className={className} end>
        {children}
      </NavLink>
    );
  }
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}

export default function AdminLayout() {
  const [email, setEmail] = useState("…");
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const stored = localStorage.getItem("fnf-admin-nav-collapsed");
    if (stored != null) return stored === "1";
    return typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const location = useLocation();
  const inAnalytics = location.pathname.startsWith("/analytics");
  const inProducts = location.pathname.startsWith("/products");

  function toggleNav() {
    setNavCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("fnf-admin-nav-collapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    document.body.classList.add("console-theme", "console-body-bleed", "admin-body-bleed");
    requireSession()
      .then((d) => setEmail(d.email))
      .catch(() => {});
    return () => {
      document.body.classList.remove("console-body-bleed", "admin-body-bleed");
    };
  }, []);

  // Same as shell.js's mobile drawer: body class drives the slide-in
  // transform + backdrop opacity defined in admin.css.
  useEffect(() => {
    document.body.classList.toggle("admin-nav-open", drawerOpen);
  }, [drawerOpen]);

  // Skip the entrance transition on first paint (mirrors shell.js's
  // stabilizeShellDrawers — avoid an unwanted slide-in on page load).
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawerMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close the drawer whenever the route changes — same behavior as
  // shell.js closing on nav-link click.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  function renderNav() {
    return NAV.map((section, si) => (
      <div key={si}>
        {section.title && <div className="console-nav-label">{section.title}</div>}
        {section.items.map((item) => {
          if (isGroup(item)) {
            const open =
              (inAnalytics && item.label === "Analytics") || (inProducts && item.label === "Products");
            return (
              <div key={item.label}>
                <div className={`console-nav-split${open ? " is-active" : ""}`}>
                  {item.to ? (
                    <LegacyLink to={item.to} className="console-nav-item console-nav-item--split">
                      <span>{item.label}</span>
                    </LegacyLink>
                  ) : (
                    <span className="console-nav-item console-nav-item--split">{item.label}</span>
                  )}
                </div>
                <div className={`console-nav-children${open ? " is-open" : ""}`}>
                  {item.children!.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      className={({ isActive }) => `console-nav-child${isActive ? " is-active" : ""}`}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? <span className="branch">↳</span> : null}
                          {child.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <LegacyLink key={item.to} to={item.to} className="console-nav-item">
              <span>{item.label}</span>
            </LegacyLink>
          );
        })}
      </div>
    ));
  }

  return (
    <div className="console-shell admin-shell">
      <header className="console-topbar">
        <a href="/admin/home.html" className="console-topbar-mark">
          <div className="console-topbar-mark-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2 21 7v10l-9 5-9-5V7z" stroke="#141414" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span>Admin</span>
        </a>
        <div className="console-search-wrap">
          <div className="console-search" role="search">
            <span>Search</span>
            <kbd>⌘K</kbd>
          </div>
        </div>
        <div className="console-topbar-actions">
          <button
            type="button"
            className="console-nav-toggle-btn"
            onClick={toggleNav}
            aria-label={navCollapsed ? "Open navigation" : "Close navigation"}
            aria-expanded={!navCollapsed}
          >
            <span className="console-nav-toggle-icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <div className="console-store-wrap">
            <button type="button" className="console-store-btn">
              <img src={LOGO_URL} alt="" />
              <span>Fuel &amp; Free Time</span>
            </button>
          </div>
        </div>
      </header>
      <div className="console-body">
        <aside className={`console-sidenav admin-sidebar${navCollapsed ? " is-collapsed" : ""}`}>
          {renderNav()}
        </aside>

        <button
          type="button"
          className="admin-menu-toggle"
          aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={drawerOpen}
          aria-controls="admin-drawer"
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span className="admin-menu-toggle-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <div
          className="admin-drawer-backdrop"
          aria-hidden={!drawerOpen}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`admin-drawer${drawerMounted ? " drawer-mounted" : ""}`}
          id="admin-drawer"
          aria-hidden={!drawerOpen}
        >
          <div className="admin-drawer-head">
            <a href="/admin/home" className="admin-drawer-logo">
              <img src={LOGO_URL} alt="" width={48} height={48} />
              <span>Fuel &amp; Free Time</span>
            </a>
            <button
              type="button"
              className="admin-drawer-close"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>
          <nav
            className="console-sidenav admin-nav admin-nav--drawer"
            style={{ display: "block", width: "100%", border: 0, background: "transparent", padding: 0 }}
          >
            {renderNav()}
          </nav>
          <div className="admin-drawer-footer">
            <div className="admin-user-email">{email}</div>
            <button className="admin-logout-btn" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </aside>

        <main className="console-main admin-main console-main--bleed">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
