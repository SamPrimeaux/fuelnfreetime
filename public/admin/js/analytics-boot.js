const VIEW_ROUTES = {
  overview: "/admin/dashboard/overview.html",
  finance: "/admin/dashboard/finance.html",
  health: "/admin/dashboard/analytics.html",
};

async function bootAnalytics(view) {
  window.__FNF_INITIAL_VIEW = view;

  const mount = document.getElementById("analytics-mount");
  if (!mount) return;

  mount.innerHTML = `
    <div class="analytics-loading" id="analytics-loading">
      <div class="analytics-loading-card">Loading analytics…</div>
    </div>`;

  if (!document.getElementById("analytics-css")) {
    const link = document.createElement("link");
    link.id = "analytics-css";
    link.rel = "stylesheet";
    link.href = "/admin/analytics/analytics.css";
    document.head.appendChild(link);
  }

  const iframe = document.createElement("iframe");
  iframe.className = "analytics-embed-frame";
  iframe.title = "Analytics dashboard";
  iframe.src = `/admin/analytics/embed.html?view=${encodeURIComponent(view)}`;
  iframe.setAttribute("loading", "eager");

  iframe.addEventListener("load", () => {
    document.getElementById("analytics-loading")?.remove();
  });

  iframe.addEventListener("error", () => {
    mount.innerHTML = `<div class="analytics-error">Analytics failed to load. <a href="/admin/analytics/embed.html?view=${view}">Open directly</a></div>`;
  });

  mount.appendChild(iframe);

  // Sync tab navigations from iframe when user clicks Overview/Finance/Health
  window.addEventListener("message", (event) => {
    if (event.data?.type !== "fnf-analytics-nav") return;
    const route = VIEW_ROUTES[event.data.view];
    if (route && !location.pathname.endsWith(route.split("/").pop())) {
      window.location.href = route;
    }
  });
}
