import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { MediaAsset } from "./studio-model";

type Props = {
  items: MediaAsset[];
  initialAsset: MediaAsset;
  onClose: () => void;
  onPlace: (item: MediaAsset) => void;
  onEdit: (item: MediaAsset) => void;
};

/** Inspect first, then deliberately place or edit. Never mutate the garment on thumbnail tap. */
export default function ArtworkQuickView({ items, initialAsset, onClose, onPlace, onEdit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const gallery = items.some((item) => item.id === initialAsset.id)
    ? items : [initialAsset, ...items];
  const [selectedId, setSelectedId] = useState(initialAsset.id);
  const index = Math.max(0, gallery.findIndex((item) => item.id === selectedId));
  const selected = gallery[index] || initialAsset;

  function step(delta: number) {
    if (gallery.length < 2) return;
    const nextIndex = (index + delta + gallery.length) % gallery.length;
    setSelectedId(gallery[nextIndex].id);
  }

  function touchStart(event: TouchEvent<HTMLDivElement>) {
    swipeStartX.current = event.touches[0]?.clientX ?? null;
  }
  function touchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipeStartX.current;
    swipeStartX.current = null;
    if (start == null) return;
    const finish = event.changedTouches[0]?.clientX;
    if (finish == null || Math.abs(finish - start) < 55) return;
    step(finish < start ? 1 : -1);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="ps-artwork-quickview"
      aria-label="Artwork image viewer" onClose={onClose} onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      }}>
      <div className="ps-artwork-quickview__content">
        <header className="ps-artwork-quickview__header">
          <div>
            <strong>Artwork preview</strong>
            <span>{index + 1} of {gallery.length}</span>
          </div>
          <button type="button" className="ps-artwork-quickview__close"
            onClick={onClose} aria-label="Close artwork viewer">×</button>
        </header>
        <div className="ps-artwork-quickview__image" onTouchStart={touchStart} onTouchEnd={touchEnd}>
          <button type="button" className="ps-artwork-quickview__previous" onClick={() => step(-1)}
            aria-label="Previous artwork" disabled={gallery.length < 2}>‹</button>
          <img key={selected.id} src={selected.url} alt={selected.filename} draggable={false} />
          <button type="button" className="ps-artwork-quickview__next" onClick={() => step(1)}
            aria-label="Next artwork" disabled={gallery.length < 2}>›</button>
        </div>
        <div className="ps-artwork-quickview__details">
          <strong title={selected.filename}>{selected.filename}</strong>
          <span>{selected.content_type || "Artwork"}{selected.size_bytes
            ? " · " + (selected.size_bytes / 1048576).toFixed(1) + " MB" : ""}</span>
          <small>Inspect this image before replacing artwork on the current print side. Editing uses the existing source-preserving media tools.</small>
        </div>
        <footer className="ps-artwork-quickview__actions">
          <button type="button" onClick={() => onEdit(selected)}>Edit &amp; use</button>
          <button type="button" className="is-primary" onClick={() => onPlace(selected)}>Use on garment</button>
        </footer>
      </div>
    </dialog>
  );
}
