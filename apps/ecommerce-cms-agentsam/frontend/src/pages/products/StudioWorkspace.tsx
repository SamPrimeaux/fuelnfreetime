import { useEffect, useRef, useState } from "react";
import { adminFetch } from "../../lib/api";
import StudioIcon from "./StudioIcon";
import {
  printPixelSize,
  printSizeLabel,
  productImage,
  type MediaAsset,
  type ProductDetail,
} from "./studio-model";

const tabs = [
  { id: "options", label: "Options", icon: "options" },
  { id: "upload", label: "Upload", icon: "upload" },
  { id: "designs", label: "Designs", icon: "image" },
  { id: "layers", label: "Layers", icon: "layers" },
  { id: "annotate", label: "Annotate", icon: "pen" },
  { id: "tools", label: "Tools", icon: "tools" },
];
export default function StudioWorkspace({
  detail,
  onBack,
}: {
  detail: ProductDetail;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("options");
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locationId, setLocationId] = useState(
    detail.print_locations.find((l) => l.enabled)?.print_location_id || "",
  );
  const [variantId, setVariantId] = useState(
    detail.variants[0]?.completeful_variant_id || "",
  );
  const [scale, setScale] = useState(80);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [showArtwork, setShowArtwork] = useState(true);
  const [guides, setGuides] = useState(true);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [notes, setNotes] = useState("");
  const [view, setView] = useState<"artwork" | "product" | "mockups">(
    "artwork",
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const layoutInput = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  function openTab(next: string) {
    setTab(next);
    if (window.matchMedia("(max-width: 760px)").matches)
      requestAnimationFrame(() =>
        panel.current?.scrollIntoView({ block: "start" }),
      );
  }
  const location = detail.print_locations.find(
    (l) => l.print_location_id === locationId,
  );
  const variant = detail.variants.find(
    (v) => v.completeful_variant_id === variantId,
  );
  const baseImage =
    variant?.realistic_image_url ||
    variant?.cover_image_url ||
    productImage(detail.product);
  const printPixels = printPixelSize(location);
  const ratio =
    location?.file_width && location.file_height
      ? location.file_width / location.file_height
      : 1;
  useEffect(() => {
    if (tab !== "designs") return;
    const controller = new AbortController();
    setBusy("library");
    setError("");
    adminFetch<{ assets: MediaAsset[] }>("/api/admin/media?view=all", {
      signal: controller.signal,
    })
      .then((d) => {
        if (!controller.signal.aborted)
          setMedia(
            d.assets.filter((a) => a.content_type?.startsWith("image/")),
          );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy("");
      });
    return () => controller.abort();
  }, [tab]);
  useEffect(() => {
    setDimensions(null);
    if (!asset) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active)
        setDimensions({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
    };
    image.src = asset.url;
    return () => {
      active = false;
    };
  }, [asset]);
  function choose(a: MediaAsset) {
    setAsset(a);
    setShowArtwork(true);
    setView("artwork");
    setNotice("Artwork added. Check the print area before exporting.");
    if (window.matchMedia("(max-width: 760px)").matches)
      requestAnimationFrame(() =>
        stage.current?.scrollIntoView({ block: "start" }),
      );
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!/\.(png|jpe?g|webp|svg|pdf)$/i.test(file.name)) {
      setError("Choose a PNG, JPG, WebP, SVG, or PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Choose a file under the studio’s 20 MB upload limit.");
      return;
    }
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("files", file);
      form.append("folder", "images");
      form.append("prefix", "studio/artwork");
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      if (file.type === "application/pdf")
        setNotice(
          "Original PDF saved to media storage. Upload a PNG preview to compose it on the canvas.",
        );
      else choose(result.assets[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function askAI(generate: boolean) {
    if (!prompt.trim() || busy) return;
    setBusy(generate ? "generate" : "ideas");
    setError("");
    try {
      const creative = generate
        ? {
            task_type: "image_generation",
            lane: "image",
            mode: "image",
            workflow_key: "fnf_creative_studio",
          }
        : {};
      const result = await adminFetch<{
        reply: string;
        conversation_id?: string;
        ai?: { image_base64?: string; mime_type?: string };
      }>("/api/admin/agentsam/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `${generate ? "Create standalone artwork" : "Brainstorm three concise visual directions"} for ${detail.product.name}. ${prompt}`,
          conversation_id: conversationId,
          ...creative,
          context: { page: "/admin/products/create", ...creative },
        }),
      });
      setReply(result.reply);
      setConversationId(result.conversation_id);
      if (result.ai?.image_base64) {
        const mime = result.ai.mime_type || "image/png";
        const bytes = Uint8Array.from(atob(result.ai.image_base64), (c) =>
          c.charCodeAt(0),
        );
        await upload(
          new File(
            [bytes],
            `studio-artwork-${Date.now()}.${mime === "image/jpeg" ? "jpg" : "png"}`,
            { type: mime },
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative request failed");
    } finally {
      setBusy("");
    }
  }
  function saveLayout() {
    const file = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            catalog_product_id: detail.product.completeful_product_id,
            variant_id: variantId,
            print_location_id: locationId,
            artwork: asset,
            placement: { x, y, scale, rotation },
            notes,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-design.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Design layout downloaded with artwork references and notes.");
  }
  async function restoreLayout(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error("Choose a studio layout smaller than 100 KB.");
      const saved = JSON.parse(await file.text());
      if (
        saved.version !== 1 ||
        saved.catalog_product_id !== detail.product.completeful_product_id
      )
        throw new Error(
          "This layout belongs to a different product. Open that product first.",
        );
      const library = await adminFetch<{ assets: MediaAsset[] }>(
        "/api/admin/media?view=all",
      );
      const restored = library.assets.find((a) => a.id === saved.artwork?.id);
      if (saved.artwork && !restored)
        throw new Error(
          "The artwork in this layout is no longer in your media library.",
        );
      const limit = (
        value: unknown,
        min: number,
        max: number,
        fallback: number,
      ) =>
        typeof value === "number" && Number.isFinite(value)
          ? Math.max(min, Math.min(max, value))
          : fallback;
      setAsset(restored || null);
      setX(limit(saved.placement?.x, 0, 100, 50));
      setY(limit(saved.placement?.y, 0, 100, 50));
      setScale(limit(saved.placement?.scale, 5, 150, 80));
      setRotation(limit(saved.placement?.rotation, -180, 180, 0));
      if (
        detail.variants.some(
          (v) => v.completeful_variant_id === saved.variant_id,
        )
      )
        setVariantId(saved.variant_id);
      if (
        detail.print_locations.some(
          (l) => l.enabled && l.print_location_id === saved.print_location_id,
        )
      )
        setLocationId(saved.print_location_id);
      setNotes(String(saved.notes || "").slice(0, 10000));
      setNotice("Your saved layout is restored.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this layout");
    } finally {
      if (layoutInput.current) layoutInput.current.value = "";
    }
  }
  async function exportArtwork() {
    if (!asset || !showArtwork || !printPixels) {
      setError(
        "Show your artwork and select a print area with known pixel dimensions first.",
      );
      return;
    }
    const { width, height } = printPixels;
    if (width * height > 32000000) {
      setError(
        "This print area is too large for a browser export. Use the original artwork in your design software.",
      );
      return;
    }
    setBusy("export");
    setError("");
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = asset.url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas export is unavailable");
      const w = (width * scale) / 100;
      const h = (image.naturalHeight / image.naturalWidth) * w;
      ctx.translate((width * x) / 100, (height * y) / 100);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "print-area-artwork.png";
      a.click();
      URL.revokeObjectURL(url);
      setNotice(
        "PNG exported at the print area’s pixel dimensions. Review resolution and placement before production.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy("");
    }
  }
  const quality =
    dimensions && printPixels
      ? dimensions.width / ((printPixels.width * scale) / 100)
      : null;
  return (
    <div className="ps-workspace">
      <header className="ps-workspace-header">
        <button
          className="ps-text-button"
          onClick={onBack}
          aria-label="Back to product details"
        >
          <StudioIcon name="back" />
          <span>Product details</span>
        </button>
        <div>
          <small>YOUR WORKSPACE</small>
          <h1>{detail.product.name}</h1>
        </div>
        <button className="ps-button" onClick={saveLayout}>
          Save layout
        </button>
      </header>
      <div className="ps-workspace-body">
        <nav className="ps-toolrail" aria-label="Design tools">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "is-active" : ""}
              onClick={() => openTab(t.id)}
              aria-pressed={tab === t.id}
            >
              <StudioIcon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <aside className="ps-toolpanel" ref={panel}>
          <div className="ps-panel-heading">
            <span className="ps-eyebrow">MAKE IT YOURS</span>
            <h2>{tabs.find((t) => t.id === tab)?.label}</h2>
          </div>
          {tab === "options" && (
            <>
              <label className="ps-field">
                Product option
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                >
                  {detail.variants.map((v) => (
                    <option
                      key={v.completeful_variant_id}
                      value={v.completeful_variant_id}
                    >
                      {v.variant_title || v.name || "Default"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ps-field">
                Print area
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  {detail.print_locations
                    .filter((l) => l.enabled)
                    .map((l) => (
                      <option
                        key={l.print_location_id}
                        value={l.print_location_id}
                      >
                        {l.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="ps-paper-note">
                <StudioIcon name="tools" />
                <strong>Designed for the details.</strong>
                <p>{printSizeLabel(location)}</p>
                <small>
                  {location?.dpi || 300} DPI{" "}
                  {location?.dpi
                    ? "provider target"
                    : "recommended for raster artwork"}
                  . Keep important elements inside the safe area.
                </small>
              </div>
              <button
                className="ps-button ps-wide"
                onClick={() => setTab("upload")}
              >
                <StudioIcon name="upload" /> Add your artwork
              </button>
            </>
          )}
          {tab === "upload" && (
            <>
              <button
                className="ps-upload-zone"
                disabled={Boolean(busy)}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) void upload(e.dataTransfer.files[0]);
                }}
              >
                <StudioIcon name="upload" size={32} />
                <strong>
                  {busy === "upload"
                    ? "Uploading your artwork…"
                    : "Drop an idea here."}
                </strong>
                <span>Or tap to choose a file</span>
                <small>PNG, JPG, WebP, SVG, PDF · up to 20 MB</small>
              </button>
              <input
                ref={fileInput}
                type="file"
                hidden
                accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
              <div className="ps-upload-tips">
                <h3>A better file. A better finish.</h3>
                <p>
                  <strong>PNG</strong> for transparent backgrounds. JPG images
                  include their background.
                </p>
                <p>
                  <strong>SVG / PDF</strong> preserve vector artwork. Outline
                  text or embed fonts. PDF originals are stored; use PNG for
                  canvas previews.
                </p>
                <p>
                  <strong>300 DPI</strong> at final print size is the raster
                  target. Use RGB / sRGB and keep the highest quality original.
                </p>
                <p>
                  Safe-area guides are an editing aid. Confirm the provider’s
                  bleed and placement requirements before printing.
                </p>
              </div>
            </>
          )}
          {tab === "designs" && (
            <>
              <p className="ps-panel-intro">
                Your media library, right where you need it.
              </p>
              {busy === "library" && <p role="status">Loading your designs…</p>}
              <div className="ps-media-grid">
                {media.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => choose(a)}
                    aria-label={`Use ${a.filename}`}
                    className={asset?.id === a.id ? "is-active" : ""}
                  >
                    <img src={a.url} alt="" loading="lazy" />
                    <span>{a.filename}</span>
                  </button>
                ))}
              </div>
              {!busy && !media.length && (
                <button className="ps-button" onClick={() => setTab("upload")}>
                  Upload your first design
                </button>
              )}
            </>
          )}
          {tab === "layers" && (
            <>
              {asset ? (
                <>
                  <div className="ps-layer">
                    <img src={asset.url} alt="" />
                    <strong>{asset.filename}</strong>
                    <input
                      type="checkbox"
                      checked={showArtwork}
                      onChange={(e) => setShowArtwork(e.target.checked)}
                      aria-label="Show artwork layer"
                    />
                  </div>
                  <label className="ps-field">
                    Size <span>{scale}%</span>
                    <input
                      type="range"
                      min="5"
                      max="150"
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                    />
                  </label>
                  <label className="ps-field">
                    Horizontal position
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={x}
                      onChange={(e) => setX(Number(e.target.value))}
                    />
                  </label>
                  <label className="ps-field">
                    Vertical position
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={y}
                      onChange={(e) => setY(Number(e.target.value))}
                    />
                  </label>
                  <label className="ps-field">
                    Rotation <span>{rotation}°</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                    />
                  </label>
                  <button
                    className="ps-button"
                    onClick={() => {
                      setX(50);
                      setY(50);
                      setScale(80);
                      setRotation(0);
                    }}
                  >
                    Reset placement
                  </button>
                </>
              ) : (
                <div className="ps-paper-note">
                  <p>Your artwork layer will appear here.</p>
                  <button
                    className="ps-button"
                    onClick={() => setTab("designs")}
                  >
                    Choose artwork
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "annotate" && (
            <>
              <label className="ps-field">
                Design notes
                <textarea
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Placement notes, color direction, changes for the next version…"
                />
              </label>
              <p className="ps-panel-intro">
                Notes stay with your downloaded layout. They are never printed
                on the artwork.
              </p>
            </>
          )}
          {tab === "tools" && (
            <>
              <label className="ps-check">
                <input
                  type="checkbox"
                  checked={guides}
                  onChange={(e) => setGuides(e.target.checked)}
                />{" "}
                Show safe-area guide
              </label>
              <button
                className="ps-button ps-wide"
                disabled={!asset || Boolean(busy)}
                onClick={exportArtwork}
              >
                Export artwork PNG <StudioIcon name="arrow" />
              </button>
              <button className="ps-button ps-wide" onClick={saveLayout}>
                Download design layout
              </button>
              <button
                className="ps-button ps-wide"
                onClick={() => layoutInput.current?.click()}
              >
                Restore a saved layout
              </button>
              <input
                type="file"
                ref={layoutInput}
                hidden
                accept=".json"
                onChange={(e) => void restoreLayout(e.target.files?.[0])}
              />
              <div className="ps-paper-note">
                <strong>Ready for merchandising?</strong>
                <p>
                  Use the product editor for pricing, inventory, images, and
                  publishing.
                </p>
                <a href="/admin/product-edit" className="ps-text-button">
                  Open product editor <StudioIcon name="arrow" size={16} />
                </a>
              </div>
            </>
          )}
        </aside>
        <div className="ps-stage-column" ref={stage}>
          <div className="ps-stage-toolbar">
            <div className="ps-view-tabs">
              {(["artwork", "product", "mockups"] as const).map((v) => (
                <button
                  key={v}
                  className={view === v ? "is-active" : ""}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                >
                  {v === "artwork"
                    ? "Artwork"
                    : v === "product"
                      ? "Base product"
                      : "Mockup references"}
                </button>
              ))}
            </div>
            <span>{location?.name || "Design space"}</span>
          </div>
          <div className="ps-stage">
            {view === "artwork" ? (
              <div
                className="ps-artboard"
                style={{
                  aspectRatio: ratio,
                  maxWidth: `${Math.min(560, 440 * ratio)}px`,
                }}
              >
                {guides && (
                  <div className="ps-safe-area">
                    <span>SAFE AREA · GUIDE ONLY</span>
                  </div>
                )}
                {asset && showArtwork ? (
                  <img
                    className="ps-artwork-layer"
                    src={asset.url}
                    alt="Your artwork placement"
                    draggable={false}
                    style={{
                      width: `${scale}%`,
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    }}
                  />
                ) : (
                  <div className="ps-canvas-empty">
                    <StudioIcon name="spark" size={40} />
                    <h3>It starts with your idea.</h3>
                    <p>Add artwork or explore a new direction below.</p>
                    <button
                      className="ps-button"
                      onClick={() => openTab("designs")}
                    >
                      Choose a design
                    </button>
                  </div>
                )}
              </div>
            ) : view === "product" ? (
              <div className="ps-base-preview">
                {baseImage ? (
                  <img src={baseImage} alt={detail.product.name} />
                ) : (
                  <p>No product image supplied.</p>
                )}
                <span>Original product · artwork is not applied</span>
              </div>
            ) : (
              <div className="ps-mockup-grid">
                {detail.mockups
                  .filter((m) => m.active && m.preview_url)
                  .map((m) => (
                    <figure key={m.mockup_id}>
                      <img src={m.preview_url} alt={m.name} loading="lazy" />
                      <figcaption>{m.name}</figcaption>
                    </figure>
                  ))}
                {!detail.mockups.some((m) => m.active && m.preview_url) && (
                  <p>No preview images are supplied for this product.</p>
                )}
                <p className="ps-reference-note">
                  Provider references show available views. They are not
                  rendered previews of your artwork.
                </p>
              </div>
            )}
          </div>
          <div className="ps-quality" aria-live="polite">
            <span>
              {dimensions
                ? `${dimensions.width} × ${dimensions.height} px`
                : "Original artwork preserved"}
            </span>
            <span
              className={quality != null && quality < 1 ? "needs-review" : ""}
            >
              {quality == null
                ? "Check print requirements before production"
                : quality < 1
                  ? "Resolution below print-area target at this size"
                  : "Pixel dimensions meet this print-area target"}
            </span>
          </div>
          <div className="ps-composer">
            <div className="ps-composer-label">
              <StudioIcon name="spark" size={17} />
              <strong>A creative partner, on your canvas.</strong>
            </div>
            <textarea
              aria-label="Creative brief"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A vintage racing emblem, warm cream and burnt orange…"
              rows={2}
            />
            <div className="ps-composer-actions">
              <span>Powered by AgentSam</span>
              <button
                className="ps-text-button"
                disabled={!prompt.trim() || Boolean(busy)}
                onClick={() => askAI(false)}
              >
                {busy === "ideas" ? "Exploring…" : "Brainstorm"}
              </button>
              <button
                className="ps-button ps-primary"
                disabled={!prompt.trim() || Boolean(busy)}
                onClick={() => askAI(true)}
              >
                {busy === "generate" ? "Creating…" : "Create artwork"}
                <StudioIcon name="spark" size={16} />
              </button>
            </div>
          </div>
          {reply && (
            <details open className="ps-ai-reply">
              <summary>Creative direction</summary>
              <p>{reply}</p>
            </details>
          )}
          {error && (
            <div className="ps-feedback" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <p className="ps-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
