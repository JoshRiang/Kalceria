import Image from "next/image";

/**
 * Keep the source image bytes and rendering untouched while using Next's
 * image component contract. Images below the fold remain lazy by default.
 */
export default function ContentImage({ alt = "", loading = "lazy", ...props }) {
  if (props.src == null || props.src === "") {
    // Preserve the native empty-source behavior for incomplete API records.
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} loading={loading} {...props} />;
  }

  return <Image alt={alt} unoptimized loading={loading} {...props} />;
}
