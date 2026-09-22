import { useState } from "react";
import StudioIcon from "./StudioIcon";
export default function ProductImage({
  sources,
  alt = "",
  lazy = true,
}: {
  sources: (string | undefined)[];
  alt?: string;
  lazy?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const src = sources.find((s) => s && !failed.includes(s));
  return src ? (
    <img
      src={src}
      alt={alt}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      onError={() => setFailed((prev) => [...prev, src])}
    />
  ) : (
    <span
      className="ps-image-fallback"
      role="img"
      aria-label={alt || "Product image unavailable"}
    >
      <StudioIcon name="box" size={40} />
      <small>Image unavailable</small>
    </span>
  );
}
