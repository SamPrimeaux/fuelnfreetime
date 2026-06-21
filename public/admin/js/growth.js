function bindGrowthApp(app) {
  if (!app) return;

  app.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      app.dataset.view = button.dataset.go;
      app.scrollIntoView({ block: "start" });
    });
  });

  app.querySelectorAll("[data-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".fnf-notice")?.remove();
    });
  });

  app.querySelectorAll("[data-generate]").forEach((button) => {
    button.addEventListener("click", () => {
      const previous = button.textContent;
      button.textContent = "Generating draft";
      button.disabled = true;

      window.setTimeout(() => {
        button.textContent = "Draft generated";
      }, 650);

      window.setTimeout(() => {
        button.textContent = previous;
        button.disabled = false;
        app.dataset.view = "details";
        app.scrollIntoView({ block: "start" });
      }, 1300);
    });
  });
}

async function initGrowthPage() {
  const mount = document.getElementById("growthMount");
  if (!mount) return;

  try {
    const res = await fetch("/admin/partials/growth-app.html", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Growth partial HTTP ${res.status}`);
    mount.innerHTML = await res.text();
    bindGrowthApp(document.getElementById("fnfGrowthApp"));
  } catch (err) {
    console.error("[growth]", err);
    mount.innerHTML =
      '<div class="console-scaffold"><h1>Growth failed to load</h1><p>Refresh the page or check the network tab.</p></div>';
  }
}

window.initGrowthPage = initGrowthPage;
