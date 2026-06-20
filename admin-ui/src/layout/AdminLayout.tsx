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
];

function isGroup(item: NavLinkItem | NavGroup): item is NavGroup {
  return "children" in item && !!item.children;
}

function LegacyLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  const isSpa = to.startsWith("/analytics");
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
  const location = useLocation();
  const inAnalytics = location.pathname.startsWith("/analytics");

  useEffect(() => {
    document.body.classList.add("console-theme", "console-body-bleed", "admin-body-bleed");
    requireSession()
      .then((d) => setEmail(d.email))
      .catch(() => {});
    return () => {
      document.body.classList.remove("console-body-bleed", "admin-body-bleed");
    };
  }, []);

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
          <div className="console-store-wrap">
            <button type="button" className="console-store-btn">
              <img src={LOGO_URL} alt="" />
              <span>Fuel &amp; Free Time</span>
            </button>
          </div>
        </div>
      </header>
      <div className="console-body">
        <aside className="console-sidenav admin-sidebar">
          {NAV.map((section, si) => (
            <div key={si}>
              {section.title && <div className="console-nav-label">{section.title}</div>}
              {section.items.map((item) => {
                if (isGroup(item)) {
                  const open = inAnalytics && item.label === "Analytics";
                  return (
                    <div key={item.label}>
                      <div className={`console-nav-split${open ? " is-active" : ""}`}>
                        {item.to ? (
                          <LegacyLink
                            to={item.to}
                            className="console-nav-item console-nav-item--split"
                          >
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
                            className={({ isActive }) =>
                              `console-nav-child${isActive ? " is-active" : ""}`
                            }
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
          ))}
        </aside>
        <main className="console-main admin-main console-main--bleed">
          <Outlet />
        </main>
      </div>
      <div className="admin-drawer-footer" style={{ display: "none" }} data-admin-email={email} />
    </div>
  );
}
