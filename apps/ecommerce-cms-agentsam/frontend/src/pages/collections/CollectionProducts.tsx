import { useMemo, useState } from "react";
import type { Product, SupplierBlank } from "./model";
import { STARTER_KITS, safeMediaUrl, supplierId, supplierImage } from "./model";
import { collectionsApi } from "./api";
import StudioIcon from "../products/StudioIcon";
import CollectionProductPicker from "./CollectionProductPicker";

export default function CollectionProducts({ products, selected, onSelect, plan, onPlan, onOpenStudio }: {
  products: Product[]; selected: number[]; onSelect: (ids: number[]) => void;
  plan: string[]; onPlan: (ids: string[]) => void; onOpenStudio: (supplierId?: string) => Promise<void>;
}) {
  const [picker, setPicker] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [blanks, setBlanks] = useState<SupplierBlank[]>([]);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const order = useMemo(() => new Map(selected.map((id, index) => [id, index])), [selected]);
  const selectedProducts = useMemo(() => products.filter(p => order.has(p.id)).sort((a,b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)), [products, order]);
  const missingIds = selected.filter(id => !products.some(p => p.id === id));
  async function search(terms: string[]) {
    setSupplierBusy(true); setSupplierError("");
    try {
      const data = await Promise.all(terms.map(t => collectionsApi.supplier(t)));
      const found = new Map<string, SupplierBlank>();
      for (const item of data.flat()) { const id = supplierId(item); if (id && !found.has(id)) found.set(id, item); }
      setBlanks([...found.values()].slice(0, 36));
      if (!found.size) setSupplierError("No supplier blanks matched. Try a different term.");
    } catch (e) { setSupplierError(e instanceof Error ? e.message : "Supplier catalog unavailable"); }
    finally { setSupplierBusy(false); }
  }
  function reorder(id: number, delta: number) {
    const index = selected.indexOf(id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= selected.length) return;
    const reordered = [...selected];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    onSelect(reordered);
  }
  function dropAt(id: number) {
    if (dragging === null || dragging === id) return;
    const next = [...selected];
    const old = next.indexOf(dragging);
    const into = next.indexOf(id);
    if (old < 0 || into < 0) return;
    next.splice(old, 1);
    next.splice(into, 0, dragging);
    onSelect(next);
    setDragging(null);
  }
  return <div className="cs-tab-stack">
    <section className="cs-panel cs-products-panel">
      <header className="cs-section-head">
        <div><span className="cs-overline">01 / CURATE</span><h2>Products in this collection <span className="cs-count">{selected.length}</span></h2><p>Choose and order your actual catalog products. Only published products appear in the storefront.</p></div>
        <button className="cs-button primary" type="button" onClick={() => setPicker(true)}><StudioIcon name="layers" size={16}/> Add products</button>
      </header>
      <div className="cs-mini-toolbar">
        <span>{selectedProducts.filter(p => p.status === "active").length} storefront-ready · {selectedProducts.filter(p => p.status !== "active").length} not published</span>
        <label><input type="checkbox" checked={selectedOnly} onChange={e=>setSelectedOnly(e.target.checked)}/> Published only</label>
      </div>
      <div className="cs-selected-list">
        {selectedProducts.filter(p => !selectedOnly || p.status === "active").map((p, index) => {
          const src = safeMediaUrl(p.primary_image || p.image_url);
          return <article key={p.id} className="cs-selected-item" draggable
            onDragStart={() => setDragging(p.id)} onDragEnd={() => setDragging(null)}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); dropAt(p.id); }}>
            <span className="cs-drag-handle" aria-hidden="true">⠿</span>
            <div className="cs-selected-img">{src ? <img src={src} alt="" loading="lazy"/> : <StudioIcon name="image" size={22}/>}</div>
            <div className="cs-selected-description"><strong>{p.title}</strong><small>{p.variant_count || 0} variants · {p.total_inventory ?? 0} stock units</small></div>
            <span className={`cs-status-chip ${p.status === "active" ? "active" : ""}`}>{p.status === "active" ? "Published" : p.status}</span>
            <div className="cs-item-actions">
              <button type="button" className="cs-icon-button" aria-label={`Move ${p.title} up`} disabled={index === 0} onClick={()=>reorder(p.id,-1)}>↑</button>
              <button type="button" className="cs-icon-button" aria-label={`Move ${p.title} down`} disabled={index === selectedProducts.length-1} onClick={()=>reorder(p.id,1)}>↓</button>
              <a className="cs-icon-button" aria-label={`Edit ${p.title}`} href={`/admin/product-edit?id=${p.id}`}><StudioIcon name="pen" size={15}/></a>
              <button type="button" className="cs-icon-button" aria-label={`Remove ${p.title}`} onClick={()=>onSelect(selected.filter(id=>id!==p.id))}><StudioIcon name="close" size={15}/></button>
            </div>
          </article>;
        })}
        {missingIds.length > 0 && <div className="cs-alert error">{missingIds.length} assigned products are no longer in the catalog. Remove them before publishing.</div>}
        {!selected.length && <div className="cs-empty-mini"><StudioIcon name="box" size={29}/><h3>No products selected yet</h3><p>Add from your existing catalog or plan a new lineup below.</p><button className="cs-button" type="button" onClick={()=>setPicker(true)}>Browse products</button></div>}
      </div>
    </section>
    <section className="cs-panel">
      <header className="cs-section-head">
        <div><span className="cs-overline">02 / PLAN</span><h2>Build a coordinated lineup</h2><p>Start with reusable assortment recipes or find real supplier blanks. Planning does not publish products.</p></div>
        <button className="cs-button" type="button" onClick={()=>void onOpenStudio()}><StudioIcon name="spark" size={15}/> Open Product Studio</button>
      </header>
      <div className="cs-starter-grid">
        {STARTER_KITS.map(kit=><button type="button" key={kit.id} className="cs-starter-card" onClick={()=>{ setSupplierQuery(kit.searches[0]); void search(kit.searches); }}><span className="cs-starter-icon"><StudioIcon name={kit.id==="accessories"?"box":"layers"} size={19}/></span><strong>{kit.label}</strong><small>{kit.caption}</small><span className="cs-starter-arrow">Explore →</span></button>)}
      </div>
      <form className="cs-supplier-search" onSubmit={e=>{e.preventDefault(); if(supplierQuery.trim()) void search([supplierQuery.trim()]);}}>
        <div className="cs-input-search"><StudioIcon name="search" size={16}/><input value={supplierQuery} onChange={e=>setSupplierQuery(e.target.value)} placeholder="Search Completeful blanks by name" aria-label="Find supplier blanks"/></div>
        <button type="submit" className="cs-button" disabled={supplierBusy || !supplierQuery.trim()}>{supplierBusy?"Searching…":"Search catalog"}</button>
      </form>
      {supplierError && <div className="cs-alert" role="status">{supplierError}</div>}
      {!!blanks.length && <div className="cs-supplier-results">{blanks.map(item => {
        const id = supplierId(item); const image = supplierImage(item); const added = plan.includes(id);
        return <article className="cs-blank-card" key={id}>
          <div className="cs-blank-image">{image ? <img alt="" src={image} loading="lazy"/> : <span className="cs-no-media">Supplier image unavailable</span>}</div>
          <strong title={item.name || item.title}>{item.name || item.title || id}</strong>
          <small>{item.variant_count ?? 0} variants · {item.product_type || "Supplier blank"}</small>
          <button className="cs-button small" type="button" disabled={!added && plan.length>=24} onClick={()=>onPlan(added ? plan.filter(p=>p!==id) : [...plan,id])}>{added?"Remove from plan":"+ Plan blank"}</button>
        </article>;
      })}</div>}
      <div className="cs-plan-bar">
        <div><strong>Planned blanks ({plan.length}/24)</strong><small>These are not manufactured or storefront products.</small></div>
        <button type="button" className="cs-button primary" disabled={!plan.length} onClick={()=>void onOpenStudio(plan[0])}>Design first planned product <StudioIcon name="arrow" size={15}/></button>
      </div>
      {!!plan.length && <div className="cs-plan-ids">{plan.map(id=><span key={id}>{blanks.find(p=>supplierId(p)===id)?.name || id}<button aria-label={`Remove ${id}`} onClick={()=>onPlan(plan.filter(p=>p!==id))} type="button">×</button></span>)}</div>}
    </section>
    {picker && <CollectionProductPicker products={products} chosen={selected} onApply={onSelect} onClose={()=>setPicker(false)}/>}
  </div>;
}
