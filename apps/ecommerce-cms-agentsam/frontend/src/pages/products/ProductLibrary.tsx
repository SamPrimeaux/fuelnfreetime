import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch } from "../../lib/api";
import type { Product } from "../collections/model";
import StudioIcon from "./StudioIcon";
import "./product-library.css";

type ProductStatus = "all" | "active" | "draft" | "archived";
const STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function safeImage(p: Product): string | null {
  const src = p.primary_image || p.image_url;
  if (!src || typeof src !== "string") return null;
  try {
    const url = new URL(src, location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function ProductLibrary() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus>("all");

  useEffect(() => {
    document.title = "Products — Fuel & Free Time Admin";
    let mounted = true;
    void adminFetch<{ ok: boolean; products?: Product[]; error?: string }>("/api/admin/products")
      .then((response) => {
        if (!response.ok || !Array.isArray(response.products)) throw new Error(response.error || "Product catalog unavailable");
        if (mounted) setProducts(response.products);
      })
      .catch((reason: unknown) => { if (mounted) setError(reason instanceof Error ? reason.message : "Unable to load products"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((p) =>
      (status === "all" || p.status === status) &&
      (!query || [p.title, p.collection, p.slug].some((value) => String(value || "").toLocaleLowerCase().includes(query))),
    );
  }, [products, search, status]);

  return <main className="cs-workspace pl-workspace">
    <div className="cs-container">
      <div className="cs-breadcrumb"><span>Commerce</span><span aria-hidden="true">/</span><strong>Products</strong></div>
      <header className="cs-page-header pl-header">
        <div>
          <span className="cs-overline">Product catalog</span>
          <h1>Products</h1>
          <p>Manage your published products, drafts and inventory from one library.</p>
        </div>
        <div className="pl-header-actions">
          <Link className="cs-button" to="/collections"><StudioIcon name="layers" size={16} /> Collections</Link>
          <Link className="cs-button primary" to="/products/create"><StudioIcon name="plus" size={16} /> New product</Link>
        </div>
      </header>

      <section className="pl-panel" aria-label="Products catalog">
        <div className="pl-controls">
          <label className="pl-search">
            <StudioIcon name="search" size={17} />
            <span className="pl-sr-only">Search products</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or collections…" type="search" />
          </label>
          <label className="pl-status">
            <span className="pl-sr-only">Filter products by status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <span className="pl-count" aria-live="polite">{loading ? "Loading…" : `${visible.length} of ${products.length} products`}</span>
        </div>
        {error && <div className="pl-alert" role="alert">{error} <button type="button" onClick={() => location.reload()}>Retry</button></div>}
        {loading && <p className="pl-empty" role="status">Loading your product catalog…</p>}
        {!loading && !error && !visible.length && <div className="pl-empty">
          <StudioIcon name="layers" size={30} />
          <strong>{products.length ? "No matching products" : "No products yet"}</strong>
          <p>{products.length ? "Try another search or status." : "Create your first product in Product Studio."}</p>
          {products.length ? <button type="button" className="cs-button" onClick={() => {setSearch("");setStatus("all");}}>Clear filters</button>
            : <Link to="/products/create" className="cs-button primary">Create product</Link>}
        </div>}
        {!loading && !error && visible.length > 0 && <div className="pl-table-scroll">
          <table className="pl-table">
            <thead><tr><th scope="col">Product</th><th scope="col">Collection</th><th scope="col">Price</th><th scope="col">Status</th><th scope="col">Variants</th><th scope="col">Inventory</th><th scope="col"><span className="pl-sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visible.map((p) => <tr key={p.id} onClick={(event) => {
                // Navigate via the existing accessible product link; don't duplicate route configuration.
                if ((event.target as HTMLElement).closest("a, button, input, select")) return;
                const link = event.currentTarget.querySelector<HTMLAnchorElement>(".pl-name");
                if (link?.href) window.location.assign(link.href);
              }}>
                <td className="pl-product-cell">
                  <div className="pl-product">
                    <div className="pl-thumb">{safeImage(p) ? <img src={safeImage(p)!} alt="" loading="lazy" /> : <StudioIcon name="image" size={22} />}</div>
                    <div className="pl-product-info">
                      <a href={`/admin/product-edit?id=${encodeURIComponent(p.id)}`} className="pl-name">{p.title}</a>
                      <span>{p.slug || "Store catalog"}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Collection">{p.collection || "Unassigned"}</td>
                <td data-label="Price" className="pl-price">{USD.format((Number(p.price_cents) || 0) / 100)}</td>
                <td data-label="Status"><span className={`pl-badge pl-badge--${p.status === "active" ? "active" : p.status === "draft" ? "draft" : "muted"}`}>{p.status || "draft"}</span></td>
                <td data-label="Variants">{p.variant_count ?? 0}</td>
                <td data-label="Inventory">{p.fulfillment_kind === "supplier"
                  ? <span title="Supplier-linked variants do not use local warehouse stock">Supplier fulfilled</span>
                  : <>{p.total_inventory ?? 0}{(p.variant_count ?? 0) > 0 && (p.total_inventory ?? 0) <= 3 ? <span className="pl-low"> Low</span> : null}</>}</td>
                <td className="pl-action"><a href={`/admin/product-edit?id=${encodeURIComponent(p.id)}`} className="cs-button small">Edit</a></td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </section>
    </div>
  </main>;
}
