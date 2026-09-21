import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/api";

type Mode = "build" | "design" | "product" | "review";

const MODES: { id: Mode; label: string }[] = [
  { id: "build", label: "Build" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "review", label: "Review" },
];

type CatalogProduct = {
  id: string;
  title: string;
  brand?: string;
  price_from_cents?: number;
  variant_count?: number;
  print_location_count?: number;
  image_url?: string;
};

type CatalogResponse = { ok: boolean; products?: CatalogProduct[]; error?: string };

export default function ProductStudioPage() {
  const [mode, setMode] = useState<Mode>("build");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);

  // BUILD: real catalog call. F&FT's Completeful mirror is currently empty
  // (0 rows synced) — an empty result here is accurate, not a bug.
  useEffect(() => {
    if (mode !== "build") return;
    setCatalogLoading(true);
    setCatalogError(null);
    adminFetch<CatalogResponse>(
      `/api/admin/completeful/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`
    )
      .then((d) => setCatalog(d.products ?? []))
      .catch((err) => setCatalogError(err instanceof Error ? err.message : "Catalog request failed."))
      .finally(() => setCatalogLoading(false));
  }, [mode, query]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">New product</h1>
          <p className="page-sub">
            {selected ? `${selected.title} — Fuel & Free Time` : "Pick a base product to get started"}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" type="button" disabled title="Wire to product draft save next">
            Save draft
          </button>
          <button className="btn primary" type="button" disabled title="Wire to Completeful mockup render next">
            Render
          </button>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 14 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? "active" : ""}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid cols-12" style={{ minHeight: 480 }}>
        <div className="card span-3">
          <div className="card-head">
            <div className="card-title">
              {mode === "build" ? "Completeful catalog" : mode === "design" ? "Artwork" : "Setup"}
            </div>
          </div>
          <div className="card-body">
            {mode === "build" && (
              <>
                <input
                  type="search"
                  placeholder="heavyweight washed black tee…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="console-search"
                  style={{ width: "100%", marginBottom: 10 }}
                />
                {catalogLoading && <p className="muted text-sm">Searching catalog…</p>}
                {catalogError && <p className="text-sm" style={{ color: "var(--bad)" }}>{catalogError}</p>}
                {!catalogLoading && !catalogError && catalog.length === 0 && (
                  <p className="muted text-sm">
                    No catalog products synced yet. Run a Completeful catalog sync before base products
                    show up here.
                  </p>
                )}
                {catalog.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="card"
                    style={{ width: "100%", textAlign: "left", marginBottom: 8, cursor: "pointer" }}
                    onClick={() => setSelected(p)}
                  >
                    <div className="card-body" style={{ padding: 10 }}>
                      <div className="text-sm" style={{ fontWeight: 600 }}>{p.title}</div>
                      {p.brand && <div className="muted text-xs">{p.brand}</div>}
                      {p.variant_count != null && (
                        <div className="muted text-xs">{p.variant_count} variants</div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
            {mode !== "build" && (
              <p className="muted text-sm">Not wired yet — select a base product in Build first.</p>
            )}
          </div>
        </div>

        <div className="card span-6" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-head">
            <div className="card-title">Canvas</div>
          </div>
          <div
            className="card-body"
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              background: "var(--bg-2)",
              borderRadius: 8,
            }}
          >
            {selected ? (
              <div style={{ textAlign: "center" }}>
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={selected.title}
                    style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 6 }}
                  />
                ) : (
                  <p className="muted text-sm">{selected.title}</p>
                )}
                <p className="muted text-xs" style={{ marginTop: 10 }}>
                  Mockup render not wired — this is the catalog product image only.
                </p>
              </div>
            ) : (
              <p className="muted text-sm">Choose a base product to preview it here.</p>
            )}
          </div>
        </div>

        <div className="card span-3">
          <div className="card-head">
            <div className="card-title">Product details</div>
          </div>
          <div className="card-body">
            <p className="muted text-sm">
              Title, price, variants, and channel publishing fields go here — reusing the same fields as{" "}
              <code>product-edit.html</code> rather than a second implementation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
