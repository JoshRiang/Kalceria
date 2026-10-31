import Image from "next/image";

// Elegant dark placeholder for Kalceria dark-mode palette
const DEFAULT_BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23050a14'/%3E%3C/svg%3E";

/**
 * Smart responsive content image component.
 * Allows Next.js optimizer to downsample local static raster images to WebP/AVIF,
 * while safely preserving external URLs, animated GIFs, and SVGs as unoptimized.
 * Supports smooth blur-up LQIP placeholders for raster assets.
 */
export default function ContentImage({
  alt = "",
  loading = "lazy",
  unoptimized,
  placeholder,
  blurDataURL,
  ...props
}) {
  if (props.src == null || props.src === "") {
    // Preserve the native empty-source behavior for incomplete API records.
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} loading={loading} {...props} />;
  }

  const srcStr = typeof props.src === "string" ? props.src : "";
  const isExternal = srcStr.startsWith("http://") || srcStr.startsWith("https://") || srcStr.startsWith("//");
  const isSvgOrGif = /\.svg($|\?)/i.test(srcStr) || /\.gif($|\?)/i.test(srcStr);
  const shouldUnoptimize = unoptimized ?? (isExternal || isSvgOrGif);

  const shouldBlur = !isSvgOrGif && placeholder !== "empty";
  const effectiveBlurDataURL = shouldBlur ? (blurDataURL || DEFAULT_BLUR_DATA_URL) : undefined;
  const effectivePlaceholder = shouldBlur ? "blur" : (placeholder || "empty");

  return (
    <Image
      alt={alt}
      unoptimized={shouldUnoptimize}
      loading={loading}
      placeholder={effectivePlaceholder}
      blurDataURL={effectiveBlurDataURL}
      {...props}
    />
  );
}
