import { useState } from "react";
import StudioIcon from "./StudioIcon";
export default function ProductImage({
  sources,
  alt = "",
  lazy = true,
  className,
  onResolvedSource,
}: {
  sources: (string | undefined)[];
  alt?: string;
  lazy?: boolean;
  className?: string;
  onResolvedSource?: (source: string) => void;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [directAttempts, setDirectAttempts] = useState<string[]>([]);
  const src = sources.find((s) => s && !failed.includes(s));
  const proxy = src?.startsWith("https://jvkydnvdajcfnqysmuwt.supabase.co/storage/v1/object/public/product-images/")
    ? "/catalog-image?src=" + encodeURIComponent(src) : null;
  const useProxy = Boolean(proxy && src && !directAttempts.includes(src));
  return src ? (
    <img
      className={className}
      src={useProxy ? proxy + "&w=640" : src}
      srcSet={useProxy ? [320, 640, 1200].map(w => proxy + "&w=" + w + " " + w + "w").join(", ") : undefined}
      sizes="(max-width: 760px) 50vw, (max-width: 1200px) 25vw, 320px"
      alt={alt}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      onLoad={() => { if (src) onResolvedSource?.(src); }}
      onError={() => {
        // Catalog proxy unavailable? Try the original public supplier source
        // once before reporting a missing garment image.
        if (proxy && !directAttempts.includes(src)) {
          setDirectAttempts((prev) => [...prev, src]);
        } else {
          setFailed((prev) => [...prev, src]);
        }
      }}
    />
  ) : (
    <span
      className={["ps-image-fallback", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={alt || "Product image unavailable"}
    >
      <StudioIcon name="box" size={40} />
      <small>Image unavailable</small>
    </span>
  );
}
