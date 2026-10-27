(function () {
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const money = (cents) => Number(cents) > 0 ? "$" + (Number(cents) / 100).toFixed(2) : "Coming soon";

  function collectionSlug() {
    const query = new URLSearchParams(location.search).get("slug");
    if (query) return query;
    return location.pathname.match(/^\/shop\/collections\/([^/]+)/)?.[1] || "";
  }

  async function loadIndex(grid) {
    try {
      const response = await fetch("/api/store/collections");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Collections unavailable");
      grid.innerHTML = (data.collections || []).map((collection) => `
        <a class="collections-tile" data-h-collection="${esc(collection.slug)}" href="/shop/collections/${encodeURIComponent(collection.slug)}">
          <img src="${esc(collection.image_url || "")}" alt="${esc(collection.title)}" loading="lazy">
          <div class="collections-tile__copy"><p class="h-eyebrow">${esc(collection.eyebrow || "Collection")}</p><h2>${esc(collection.title)}</h2><p>${esc(collection.description)} · ${Number(collection.product_count || 0)} pieces</p></div>
        </a>`).join("");
    } catch (error) { grid.innerHTML = `<div class="collection-error"><div><h2>Collections are tuning up.</h2><p>${esc(error.message)}</p></div></div>`; }
  }

  async function loadDetail(root) {
    const slug = collectionSlug();
    if (!slug) return;
    try {
      const response = await fetch(`/api/store/collections/${encodeURIComponent(slug)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Collection not found");
      const collection = data.collection;
      document.title = `${collection.title} — Fuel & Free Time`;
      document.querySelector('meta[name="description"]').content = collection.seo_description || collection.description;
      const heroHtml = window.AgentSamMerchHero
        ? window.AgentSamMerchHero.renderMerchHero(
            window.AgentSamMerchHero.parseMerchHero(collection.hero_settings_json, collection),
            collection)
        : '<section class="collection-hero"><div class="h-container"><h1>' + esc(collection.title) +
          '</h1><a href="#collection-products">Shop this collection</a></div></section>';
      const hero = window.AgentSamMerchHero
        ? window.AgentSamMerchHero.parseMerchHero(collection.hero_settings_json, collection) : {};
      const showcaseHtml = window.AgentSamMerchShowcase
        ? window.AgentSamMerchShowcase.renderMerchCollectionShowcase({
            ...collection, hero, products: data.products || [],
            links: {productBase: "/products", shop: "/shop"},
          })
        : '<section class="collection-products h-container" id="collection-products"><h2>' + esc(collection.title) + '</h2><p>Product gallery is temporarily unavailable.</p></section>';
      root.innerHTML = heroHtml + showcaseHtml;
      document.dispatchEvent(new CustomEvent("heuristic:refresh"));
    } catch (error) { root.innerHTML = `<div class="collection-error"><div><p class="h-eyebrow">Collection unavailable</p><h1>${esc(error.message)}</h1><a class="h-button" href="/shop/collections">Browse collections</a></div></div>`; }
  }

  const grid = document.getElementById("collections-grid");
  const root = document.getElementById("collection-root");
  if (grid) loadIndex(grid);
  if (root) loadDetail(root);
})();
