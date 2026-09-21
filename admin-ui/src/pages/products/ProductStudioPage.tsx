import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminFetch } from "../../lib/api";
import "../../styles/product-studio.css";

type CatalogProduct = {
  completeful_product_id: string;
  catalog_product_id?: string | null;
  sku?: string | null;
  name: string;
  product_type?: string | null;
  print_type?: string | null;
  material?: string | null;
  variant_title?: string | null;
  available?: number;
  marketplace_eligible?: number;
  pricing_currency?: string | null;
  fulfillment_cost_free_cents?: number | null;
  fulfillment_cost_growth_cents?: number | null;
  fulfillment_cost_business_cents?: number | null;
  cover_image_url?: string | null;
  main_icon_url?: string | null;
  realistic_image_url?: string | null;
  variant_count?: number;
  print_location_count?: number;
  mockup_count?: number;
};

type CatalogResponse = {
  ok: boolean;
  items?: CatalogProduct[];
  pagination?: {
    limit: number;
    offset: number;
    count: number;
    total: number;
    has_more: boolean;
  };
  error?: string;
};

export default function ProductStudioPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    setCatalogLoading(true);
    setCatalogError(null);
    const params = new URLSearchParams({ limit: "48" });
    if (query.trim()) params.set("search", query.trim());

    adminFetch<CatalogResponse>(`/api/admin/completeful/catalog?${params.toString()}`)
      .then((data) => setCatalog(data.items ?? []))
      .catch((error) =>
        setCatalogError(error instanceof Error ? error.message : "Catalog request failed.")
      )
      .finally(() => setCatalogLoading(false));
  }, [query]);

  const selected =
    catalog.find((product) => product.completeful_product_id === productId) ?? null;

  return (
    <section className="product-studio-shell" aria-label="Product Studio">
      <header className="product-studio-heading">
        <div>
          <span className="product-studio-eyebrow">Fuel &amp; Free Time</span>
          <h1>Create &amp; Explore Designs</h1>
          <p>Explore products, build artwork, review mockups, and shape a product without leaving the working surface.</p>
        </div>
      </header>

      {!productId ? (
        <div className="product-studio-launchpad">
          <div className="product-studio-search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              aria-label="Search Completeful products"
            />
          </div>

          {catalogLoading && <div className="product-studio-empty">Loading products…</div>}
          {catalogError && <div className="product-studio-empty is-error">{catalogError}</div>}
          {!catalogLoading && !catalogError && catalog.length === 0 && (
            <div className="product-studio-empty">
              The Completeful catalog mirror is empty. Sync it before product cards can appear here.
            </div>
          )}

          <div className="product-studio-catalog-grid">
            {catalog.map((product) => (
              <button
                key={product.completeful_product_id}
                type="button"
                className="product-studio-product-card"
                onClick={() => navigate(`/products/create/${encodeURIComponent(product.completeful_product_id)}`)}
              >
                <div className="product-studio-product-media">
                  {product.realistic_image_url || product.cover_image_url || product.main_icon_url ? (
                    <img
                      src={
                        product.realistic_image_url ||
                        product.cover_image_url ||
                        product.main_icon_url ||
                        ""
                      }
                      alt=""
                    />
                  ) : (
                    <span>{product.product_type || "Product"}</span>
                  )}
                </div>
                <div className="product-studio-product-copy">
                  <strong>{product.name}</strong>
                  <span>
                    {[product.material, product.print_type].filter(Boolean).join(" · ") ||
                      product.product_type ||
                      "Completeful"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="product-studio-wip-detail">
          <button className="product-studio-back" type="button" onClick={() => navigate("/products/create")}>
            Back to products
          </button>
          <div>
            <span>Selected product</span>
            <strong>{selected?.name || productId}</strong>
          </div>
          <p>The immersive studio surface is being wired on this route next.</p>
        </div>
      )}
    </section>
  );
}
