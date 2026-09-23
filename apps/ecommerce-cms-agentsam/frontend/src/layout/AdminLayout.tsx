import { useLayoutEffect, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Outlet, useLocation } from "react-router-dom";

declare global {
  interface Window {
    renderShell: (path: string, content: string, options?: { fullBleed?: boolean }) => void;
    hydrateShellNav: (user: unknown, path: string) => void;
    __shellUser?: unknown;
  }
}
// Both server-rendered pages and the SPA use the app-owned shell.js.
// React owns only the content portal; navigation has one renderer and owner.
export default function AdminLayout() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const location = useLocation();
  useLayoutEffect(() => {
    window.renderShell(window.location.pathname, '<div id="ecommerce-react-content"></div>', { fullBleed: true });
    setHost(document.getElementById("ecommerce-react-content"));
    return () => { document.getElementById("console-app")?.remove(); };
  }, []);
  useEffect(() => {
    document.body.classList.remove("admin-nav-open");
    if (window.__shellUser) window.hydrateShellNav(window.__shellUser, "/admin" + location.pathname);
  }, [location.pathname]);
  return host ? createPortal(<Outlet />, host) : null;
}
