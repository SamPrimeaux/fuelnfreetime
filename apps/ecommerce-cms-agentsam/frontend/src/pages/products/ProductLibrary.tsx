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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [onlySelected, setOnlySelected] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

  const selectedProducts = useMemo(() => products.filter((item) => selectedIds.has(item.id)), [products, selectedIds]);
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((p) =>
      (status === "all" || p.status === status) &&
      (!onlySelected || selectedIds.has(p.id)) &&
      (!query || [p.title, p.collection, p.slug].some((value) => String(value || "").toLocaleLowerCase().includes(query))),
    );
  }, [products, search, status, onlySelected, selectedIds]);

  function toggleProduct(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCopyNotice("");
  }

  useEffect(() => {
    const count = selectedProducts.length;
    const dock = count ? {
      owner: "products",
      label: count + (count === 1 ? " product selected" : " products selected"),
      actions: [
        count === 1
          ? { id: "edit", label: "Edit", icon: "edit", invoke: true }
          : { id: "page", label: "Select page", icon: "check", invoke: true },
        { id: "copy", label: "Copy", icon: "copy", invoke: true },
        { id: "isolate", label: onlySelected ? "Show all" : "Selected", icon: "filter", invoke: true },
        { id: "collections", label: "Collections", icon: "layers", href: "/admin/collections" },
        { id: "clear", label: "Clear", icon: "close", invoke: true },
      ],
    } : {
      owner: "products",
      label: "Products",
      actions: [
        { id: "find", label: "Find", icon: "search", invoke: true },
        { id: "filter", label: "Status", icon: "filter", invoke: true },
        { id: "collections", label: "Collections", icon: "layers", href: "/admin/collections" },
        { id: "create", label: "Create", icon: "plus", href: "/admin/products/create" },
        { id: "more", label: "More", icon: "menu" },
      ],
    };
    const w = window as Window & { __adminDockWorkspace?: typeof dock | null };
    w.__adminDockWorkspace = dock;
    document.dispatchEvent(new CustomEvent("admin-dock:workspace", { detail: dock }));

    const invoke = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id === "find") document.querySelector<HTMLInputElement>(".pl-search input")?.focus();
      else if (id === "filter") {
        const select = document.querySelector<HTMLSelectElement>(".pl-status select");
        select?.focus();
        try {
          const picker = select as HTMLSelectElement & { showPicker?: () => void };
          if (picker?.showPicker) picker.showPicker();
          else select?.click();
        } catch { select?.click(); }
      } else if (id === "edit" && count === 1) {
        window.location.assign(`/admin/product-edit?id=${encodeURIComponent(selectedProducts[0].id)}`);
      } else if (id === "page") {
        setSelectedIds((current) => new Set([...current, ...visible.map((item) => item.id)]));
      } else if (id === "isolate") {
        setOnlySelected((previous) => !previous);
      } else if (id === "clear") {
        setSelectedIds(new Set());
        setOnlySelected(false);
        setCopyNotice("");
      } else if (id === "copy" && count) {
        const text = selectedProducts.map((item) => [item.title, item.id, item.status].join("\t")).join("\n");
        void navigator.clipboard?.writeText(text)
          .then(() => setCopyNotice("Copied " + count + " product" + (count === 1 ? "" : "s") + "."))
          .catch(() => setCopyNotice("Clipboard not available. Select and copy product names instead."));
      }
    };
    document.addEventListener("admin-dock:invoke", invoke);
    return () => {
      document.removeEventListener("admin-dock:invoke", invoke);
      // Don't clear a newer route's workspace on SPA transitions.
      if (w.__adminDockWorkspace === dock) {
        w.__adminDockWorkspace = null;
        document.dispatchEvent(new CustomEvent("admin-dock:workspace", { detail: null }));
      }
    };
  }, [selectedProducts, onlySelected, visible]);

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



  return <main className="cs-workspace pl-workspace">
    <div className="cs-container">
      <header className="cs-page-header pl-header">
        <div className="pl-header-copy">
          <h1>Products <span className="pl-heading-count">{loading ? "…" : products.length}</span></h1>
          <p>Commerce / Catalog</p>
        </div>
        <div className="pl-header-actions">
          <Link className="cs-button pl-action-icon" to="/collections" aria-label="Open collections" title="Collections"><StudioIcon name="layers" size={20} /><span>Collections</span></Link>
          <Link className="cs-button primary pl-action-icon" to="/products/create" aria-label="Create product" title="Create product"><StudioIcon name="plus" size={20} /><span>New product</span></Link>
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
        {selectedProducts.length > 0 && <div className="pl-selection-summary" role="status" aria-live="polite">
          <strong>{selectedProducts.length} selected</strong>
          <span>{onlySelected ? "Showing your selection" : "Use the bottom dock for selection tools"}</span>
          <button type="button" onClick={() => { setSelectedIds(new Set()); setOnlySelected(false); setCopyNotice(""); }}>Clear</button>
        </div>}
        {copyNotice && <p className="pl-copy-notice" role="status">{copyNotice}</p>}
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
                    <button type="button"
                      className={`pl-select-product${selectedIds.has(p.id) ? " is-selected" : ""}`}
                      aria-label={`${selectedIds.has(p.id) ? "Deselect" : "Select"} ${p.title}`}
                      aria-pressed={selectedIds.has(p.id)}
                      onClick={() => toggleProduct(p.id)}
                    ><StudioIcon name="check" size={18} /></button>
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
