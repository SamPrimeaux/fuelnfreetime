const DEFAULT_MARGIN = 12;

function roots(scope) {
  return [...scope.querySelectorAll("[data-profile-popup-root]")];
}

function elements(root) {
  return {
    trigger: root.querySelector("[data-profile-menu-toggle]"),
    menu: root.querySelector("[data-profile-menu]"),
  };
}

function focusable(menu) {
  return [...menu.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
}

function position(trigger, menu, margin = DEFAULT_MARGIN) {
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const width = Math.min(menuRect.width || 260, window.innerWidth - margin * 2);
  let left = triggerRect.right + 10;
  if (left + width > window.innerWidth - margin) left = triggerRect.left;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  const height = menuRect.height || 180;
  let top = triggerRect.top - height - 8;
  if (top < margin) top = triggerRect.bottom + 8;
  top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
  menu.style.setProperty("--profile-popup-left", `${Math.round(left)}px`);
  menu.style.setProperty("--profile-popup-top", `${Math.round(top)}px`);
  menu.style.setProperty("--profile-popup-width", `${Math.round(width)}px`);
}

export function closeProfilePopups(scope = document, { restoreFocus = false } = {}) {
  roots(scope).forEach((root) => {
    const { trigger, menu } = elements(root);
    if (!menu?.classList.contains("open")) return;
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    trigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger?.focus();
  });
}

export function mountProfilePopups(scope = document) {
  if (scope.__profilePopupMounted) return () => {};
  scope.__profilePopupMounted = true;

  const onClick = (event) => {
    const trigger = event.target.closest?.("[data-profile-menu-toggle]");
    if (!trigger) {
      if (!event.target.closest?.("[data-profile-menu]")) closeProfilePopups(scope);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const root = trigger.closest("[data-profile-popup-root]");
    const menu = root?.querySelector("[data-profile-menu]");
    if (!menu) return;
    const opening = !menu.classList.contains("open");
    closeProfilePopups(scope);
    if (!opening) return;
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    position(trigger, menu);
    requestAnimationFrame(() => position(trigger, menu));
  };

  const onKeydown = (event) => {
    const openRoot = roots(scope).find((root) => elements(root).menu?.classList.contains("open"));
    if (!openRoot) return;
    const { menu } = elements(openRoot);
    const items = focusable(menu);
    if (event.key === "Escape") {
      event.preventDefault();
      closeProfilePopups(scope, { restoreFocus: true });
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(current + step + items.length) % items.length]?.focus();
    }
  };

  const reposition = () => roots(scope).forEach((root) => {
    const { trigger, menu } = elements(root);
    if (trigger && menu?.classList.contains("open")) position(trigger, menu);
  });

  scope.addEventListener("click", onClick);
  scope.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  return () => {
    scope.removeEventListener("click", onClick);
    scope.removeEventListener("keydown", onKeydown);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    delete scope.__profilePopupMounted;
  };
}
