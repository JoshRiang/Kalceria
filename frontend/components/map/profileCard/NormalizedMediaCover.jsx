"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { inferIsVideoMediaUrl } from "../eventPopup/popupMediaMetadata";
import { BASE_PROFILE_COLORS } from "@/lib/profileIdentity";

function resolveSafeFallbackBg(colorOrUrl, seedText = "") {
  if (typeof colorOrUrl === "string" && (colorOrUrl.startsWith("#") || colorOrUrl.startsWith("rgb"))) {
    return colorOrUrl;
  }
  const idStr = String(seedText || "kalcerian");
  const num = Math.abs(idStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % BASE_PROFILE_COLORS.length;
  return BASE_PROFILE_COLORS[num];
}

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
  const safeBgColor = resolveSafeFallbackBg(fallbackColor, altText || media?.url);
  const [useFallback, setUseFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    setUseFallback(false);
    const vid = videoRef.current;
    if (vid) {
      if (vid.readyState >= 1) {
        setIsLoaded(true);
      } else {
        setIsLoaded(false);
      }
      const playPromise = vid.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else {
      setIsLoaded(false);
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
        style={{
          backgroundColor: safeBgColor,
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 80%)",
        }}
      />
    );
  }

  if (media.type === "video") {
    return (
      <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: safeBgColor }}>
        {/* Sleek cyber shimmer placeholder while first frame is decoding */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
            isLoaded ? "opacity-0" : "opacity-100"
          }`}
          style={{
            backgroundColor: safeBgColor,
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, rgba(10,14,39,0.35) 100%)",
          }}
        >
          <div className="w-full h-full animate-pulse bg-white/10" />
        </div>
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
          onLoadedMetadata={() => setIsLoaded(true)}
          onLoadedData={() => setIsLoaded(true)}
          onCanPlay={() => setIsLoaded(true)}
          onPlaying={() => setIsLoaded(true)}
          onError={() => {
            if (onError) onError();
            setUseFallback(true);
          }}
          className="w-full h-full object-cover object-center pointer-events-none"
          style={{
            transform: "translateZ(0)",
            willChange: "transform, opacity",
            opacity: isLoaded ? 1 : 0.01,
            transition: "opacity 180ms cubic-bezier(0.16, 1, 0.3, 1)",
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
