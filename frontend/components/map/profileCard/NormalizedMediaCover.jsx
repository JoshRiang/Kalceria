"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { inferIsVideoMediaUrl } from "../eventPopup/popupMediaMetadata";

// ─── Media Normalization Engine (Video, Photo, GIF) ───────────────────────────
export function normalizeMediaConfig(
  rawUrl,
  rawType,
  { isAdit, isAhmad, fallbackCover }
) {
  // 1. Honor user-uploaded / custom cover image FIRST
  let url = rawUrl;
  let type = rawType;

  // 2. Only if no custom cover was uploaded, assign default/fallback based on user
  if (!url) {
    if (isAhmad) {
      url = "/media/gifs/event_spec_1.mp4";
      type = "video";
    } else if (isAdit) {
      url = "/media/gifs/event_spec_1.gif";
      type = "gif";
    } else {
      url = fallbackCover;
    }
  }

  // 3. Auto-detect media type if not explicitly set
  const lowerUrl = String(url || "").trim().toLowerCase();
  if (lowerUrl.startsWith("#") || lowerUrl.startsWith("rgb")) {
    return {
      url,
      type: "color",
      aspectRatio: "1 / 1",
    };
  }
  if (!type) {
    if (
      inferIsVideoMediaUrl(url) ||
      lowerUrl.includes("video") ||
      lowerUrl.endsWith(".mp4") ||
      lowerUrl.endsWith(".webm") ||
      lowerUrl.includes(".mp4?") ||
      lowerUrl.includes(".webm?")
    ) {
      type = "video";
    } else if (
      lowerUrl.endsWith(".gif") ||
      lowerUrl.startsWith("data:image/gif") ||
      lowerUrl.includes("gif")
    ) {
      type = "gif";
    } else {
      type = "image";
    }
  }

  return {
    url,
    type,
    aspectRatio: "1 / 1",
  };
}

export function NormalizedMediaCover({
  media,
  altText,
  onError,
  fallbackColor,
}) {
  const [useFallback, setUseFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      setIsLoaded(true);
    }
  }, [media?.url]);

  if (media?.type === "color" || media?.url?.startsWith?.("#")) {
    return (
      <div
        className="w-full h-full"
        style={{ backgroundColor: media.url }}
      />
    );
  }

  if (useFallback) {
    return (
      <div
        className="w-full h-full"
        style={{ backgroundColor: fallbackColor || "#121624" }}
      />
    );
  }

  if (media.type === "video") {
    return (
      <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: fallbackColor || "#121624" }}>
        {/* Placeholder / Shimmer while video frame is decoding */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
            isLoaded ? "opacity-0" : "opacity-100"
          }`}
          style={{
            backgroundColor: fallbackColor || "#121624",
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)",
          }}
        />
        <video
          ref={videoRef}
          key={media.url}
          src={media.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onPlaying={() => setIsLoaded(true)}
          onError={() => setUseFallback(true)}
          className={`w-full h-full object-cover object-center pointer-events-none transition-all duration-300 ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          }`}
          style={{
            transform: "translateZ(0)",
            willChange: "transform, opacity",
          }}
        />
      </div>
    );
  }

  if (media.type === "gif") {
    return (
      // Optimized GIF: GPU-accelerated layer, content-visibility auto & async decoding prevents phone lag
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.url}
        alt={altText}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (onError) onError();
          setUseFallback(true);
        }}
        className="w-full h-full object-cover object-center pointer-events-none transition-transform duration-500 hover:scale-105"
        style={{
          transform: "translateZ(0)",
          willChange: "transform",
          contain: "paint layout",
          contentVisibility: "auto",
        }}
      />
    );
  }

  return (
    <Image
      src={media.url}
      alt={altText}
      fill
      sizes="(max-width: 640px) 320px, 420px"
      unoptimized
      onError={() => {
        if (onError) onError();
        setUseFallback(true);
      }}
      className="object-cover object-center transition-transform duration-500 hover:scale-105"
    />
  );
}
