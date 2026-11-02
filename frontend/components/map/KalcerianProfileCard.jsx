"use client";

import { useState } from "react";
import Image from "next/image";

function formatJoinedDate(createdAt) {
  if (!createdAt) return "Joined in October 2025";
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "Joined in October 2025";
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `Joined in ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "Joined in October 2025";
  }
}

const AESTHETIC_COVERS = [
  "/jpeg/foto_abt1.jpeg",
  "/jpeg/foto_abt2.jpeg",
  "/jpeg/foto_abt3.jpeg",
  "/jpeg/foto_abt4.jpeg",
  "/jpeg/foto_abt5.jpeg",
  "/jpeg/foto_abt10.jpeg",
  "/jpeg/foto_abt11.jpeg",
  "/jpeg/bg_event.jpeg",
  "/jpeg/bg_s1ev.jpeg",
  "/jpeg/bg_s2ev.jpeg",
  "/bg_tokyo.webp",
  "/aboutus_bg1.webp",
];

function getFallbackCover(user) {
  const name = String(user?.name || user?.nickname || "").toLowerCase();
  if (name.includes("ahmad")) {
    return "/media/gifs/event_cafe_1.mp4";
  }
  if (name.includes("adit")) {
    return "/media/gifs/event_cafe_1.gif";
  }
  const idStr = String(user?.id || user?.name || "kalcerian");
  const num = Math.abs(idStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % AESTHETIC_COVERS.length;
  return AESTHETIC_COVERS[num];
}

function getAvatarUrl(user) {
  return (
    user?.profilePicture ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      user?.nickname || user?.name || "anon"
    )}`
  );
}

// ─── 2D WhatsApp Icon (Smooth official handset, vibrant green when registered, gray when not) ────
function WhatsApp2DIcon({ isRegistered, size = 46 }) {
  const bg = isRegistered ? "#25D366" : "#8b949e";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0 transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
    >
      {/* Speech bubble with tail at bottom-left */}
      <path
        d="M24 4C12.95 4 4 12.95 4 24c0 3.55.93 6.9 2.56 9.8L4 44l10.45-2.51C17.27 43.1 20.52 44 24 44c11.05 0 20-8.95 20-20S35.05 4 24 4z"
        fill={bg}
      />
      {/* Official smooth telephone handset - crisp, unrigged vector curves */}
      <path
        d="M34.8 29.3c-.6-.3-3.5-1.7-4-1.9-.5-.2-.9-.3-1.3.3s-1.5 1.9-1.9 2.3c-.4.4-.7.5-1.3.2-3.8-1.9-6.3-4.3-8.2-8.1-.3-.6 0-.9.2-1.3.3-.4.8-1 1.2-1.5.4-.5.5-.8.8-1.3.3-.5.1-.9 0-1.3-.2-.4-1.3-3.2-1.8-4.4-.5-1.2-1-1-1.4-1h-1.2c-.4 0-1.1.2-1.7.8-.6.6-2.3 2.2-2.3 5.4s2.4 6.3 2.7 6.7c.3.4 4.6 7.1 11.2 10 3.9 1.7 5.4 1.8 7.4 1.5 1.2-.2 3.6-1.5 4.1-2.9.5-1.4.5-2.6.4-2.8-.2-.3-.6-.5-1.2-.8z"
        fill="#ffffff"
      />
    </svg>
  );
}

// ─── 2D Instagram Icon (Vibrant gradient when registered, gray when not) ───
function Instagram2DIcon({ isRegistered, size = 46 }) {
  const gradId = "igGradStandardCard";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0 transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
    >
      <defs>
        <radialGradient id={gradId} cx="30%" cy="105%" r="120%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="10%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="65%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      {/* Circle base */}
      <circle cx="24" cy="24" r="22" fill={isRegistered ? `url(#${gradId})` : "#8b949e"} />
      {/* Rounded square camera contour */}
      <rect x="14" y="14" width="20" height="20" rx="5.5" stroke="#ffffff" strokeWidth="2.4" fill="none" />
      {/* Camera lens circle */}
      <circle cx="24" cy="24" r="5" stroke="#ffffff" strokeWidth="2.4" fill="none" />
      {/* Camera flash dot */}
      <circle cx="29.5" cy="18.5" r="1.4" fill="#ffffff" />
    </svg>
  );
}

// ─── Media Normalization Engine (Video, Photo, GIF) ───────────────────────────
function normalizeMediaConfig(rawUrl, rawType, { isAdit, isAhmad, fallbackCover }) {
  let url = rawUrl;
  let type = rawType;

  if (isAhmad) {
    url = "/media/gifs/event_cafe_1.mp4";
    type = "video";
  } else if (isAdit) {
    url = "/media/gifs/event_cafe_1.gif";
    type = "gif";
  } else if (!url) {
    url = fallbackCover;
  }

  const lowerUrl = String(url || "").toLowerCase();
  if (!type) {
    if (lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.includes("video")) {
      type = "video";
    } else if (lowerUrl.endsWith(".gif") || lowerUrl.includes("gif")) {
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

function NormalizedMediaCover({ media, altText, onError }) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-white/50 text-xs">
          Kalceria
        </div>
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <video
        src={media.url}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        onError={() => setUseFallback(true)}
        className="w-full h-full object-cover object-center pointer-events-none transition-transform duration-500 hover:scale-105"
        style={{
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
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

export default function KalcerianProfileCard({
  user,
  isMapDark,
  showMobileClose = false,
  onClose,
  isMobileCompact = false,
}) {
  const [imgError, setImgError] = useState(false);
  const displayName = user?.displayName || user?.name || user?.nickname || "Kalcerian";
  const rawUsername = user?.nickname || user?.username || (user?.name ? user.name.toLowerCase().replace(/\s+/g, '_') : "kalcerian");
  const cleanUsername = String(rawUsername).replace(/^@/, '');
  const joinedText = formatJoinedDate(user?.createdAt);

  // 24-hour broadcast freshness check
  const b = user?.broadcast;
  const rawBroadcast = typeof b === "string" ? b.trim() : (b?.message || "").trim();
  let activeBroadcastMsg = null;
  if (rawBroadcast) {
    if (b?.createdAt) {
      const age = Date.now() - new Date(b.createdAt).getTime();
      if (age <= 24 * 60 * 60 * 1000 && age >= 0) {
        activeBroadcastMsg = rawBroadcast;
      }
    } else {
      activeBroadcastMsg = rawBroadcast;
    }
  }

  const isAhmad = String(displayName).toLowerCase().includes("ahmad");
  const isAdit = String(displayName).toLowerCase().includes("adit");

  const fallbackCover = getFallbackCover(user);
  const normalizedMedia = normalizeMediaConfig(
    imgError ? fallbackCover : user?.coverImage,
    user?.coverType,
    { isAdit, isAhmad, fallbackCover }
  );

  // Bio / Alasan masuk Kalceria (Arial, non-bold, not all-caps)
  const bioText =
    user?.reason ||
    user?.bio ||
    user?.alasanMasuk ||
    "Automotive enthusiast seeking camaraderie, spirited night runs, and shared passion with the Kalceria community.";

  // Social Links resolution (Adit has registered WA and IG; Ahmad has unregistered WA and IG)
  let igUrl = null;
  let waUrl = null;
  if (isAdit) {
    igUrl = "https://instagram.com/aditbintaro";
    waUrl = "https://wa.me/6281234567890";
  } else if (!isAhmad) {
    const igHandle =
      user?.socialPlatform === "IG" && user?.socialLink
        ? user.socialLink
        : user?.instagram ||
          (user?.socialLink && !user?.socialLink.startsWith("+") && !/^\d+$/.test(user?.socialLink)
            ? user.socialLink
            : null);
    igUrl = igHandle ? `https://instagram.com/${String(igHandle).replace(/^@/, "")}` : null;

    const waRaw =
      user?.socialPlatform === "WA" && user?.socialLink
        ? user.socialLink
        : user?.phone ||
          user?.whatsapp ||
          (user?.socialLink && /^\+?\d+$/.test(user.socialLink) ? user.socialLink : null);
    const cleanPhone = waRaw ? String(waRaw).replace(/[^\d]/g, "") : null;
    waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
  }

  return (
    <div
      className={`relative w-full overflow-hidden transition-colors select-none ${
        isMobileCompact ? "max-w-[310px] mx-auto rounded-2xl shadow-2xl" : "rounded-b-xl"
      } ${
        isMapDark
          ? "bg-[#161b22] text-[#f0f6fc] border border-[#30363d]/80"
          : "bg-white text-[#1f2328] border border-[#d0d7de]/80"
      }`}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* 1. Square 1:1 Cover Banner Background (Normalized Video, GIF, and Photo pipeline) */}
      <div className="relative w-full aspect-square overflow-hidden bg-neutral-900">
        <NormalizedMediaCover
          media={normalizedMedia}
          altText={`${displayName} cover`}
          onError={() => setImgError(true)}
        />
        {/* Subtle top/bottom vignette to enhance depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* 2. Profile Picture Centered at the Middle Overlapping the Square Cover */}
      <div className="relative flex justify-center -mt-10 sm:-mt-12 z-10 px-4">
        <div className="relative">
          <div
            className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-[3.5px] overflow-hidden shadow-xl ${
              isMapDark ? "border-[#161b22] bg-[#161b22]" : "border-white bg-white"
            }`}
          >
            <Image
              src={getAvatarUrl(user)}
              alt={displayName}
              width={88}
              height={88}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>

          {/* Close 'X' button for Mobile Family: tiny circle, placed at top-right of profile picture */}
          {showMobileClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              aria-label="Close profile card"
              className={`absolute -top-1 -right-1 z-30 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-90 hover:scale-110 ${
                isMapDark
                  ? "bg-white border border-[#161b22] text-[#161b22] hover:bg-neutral-200"
                  : "bg-[#1f2328] border border-white text-white hover:bg-[#30363d]"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 3. Joined Date: Consistent font, neat typography */}
      <div className="text-center mt-2.5 px-3">
        <span
          className={`text-[11.5px] sm:text-[12px] font-sans font-medium tracking-tight ${
            isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
          }`}
        >
          {joinedText}
        </span>
      </div>

      {/* 4. Display Name & Real Username */}
      <div className="text-center mt-0.5 px-4">
        <h3
          className={`text-[16px] sm:text-[17px] font-bold tracking-tight truncate leading-tight ${
            isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
          }`}
        >
          {displayName}
        </h3>
        {/* Real Username in grey tiny font starting with @ */}
        <span
          className={`text-[11.5px] sm:text-[12px] font-normal block mt-0.5 ${
            isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
          }`}
        >
          @{cleanUsername}
        </span>
      </div>

      {/* Broadcast Status (if user released active 24h broadcast) */}
      {activeBroadcastMsg && (
        <div className="text-center mt-1.5 px-4">
          <p
            className={`text-[11.5px] sm:text-[12px] font-normal normal-case leading-snug line-clamp-2 ${
              isMapDark ? "text-white" : "text-black"
            }`}
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            &quot;{activeBroadcastMsg}&quot;
          </p>
        </div>
      )}

      {/* 5. Alasan Masuk Kalceria: Paragraph description, Arial, non-bold, not all capital */}
      <div className="px-4 py-2 mt-1">
        <p
          className={`text-[12.5px] sm:text-[13px] leading-relaxed text-center font-normal normal-case ${
            isMapDark ? "text-[#c9d1d9]" : "text-[#4b5563]"
          }`}
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {bioText}
        </p>
      </div>

      {/* 6. Bottom Social Section: Clean borderless depth, NO line and NO grid, size 46 standard */}
      <div className="flex items-center justify-center gap-8 py-3.5 mt-1">
        {/* Left: Instagram */}
        {igUrl ? (
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="See the Instagram"
            className="group flex items-center justify-center p-1 rounded-full transition-transform active:scale-95 outline-none cursor-pointer"
          >
            <Instagram2DIcon isRegistered={true} size={46} />
          </a>
        ) : (
          <div
            title="Instagram not connected"
            className="flex items-center justify-center p-1 opacity-50 cursor-not-allowed"
          >
            <Instagram2DIcon isRegistered={false} size={46} />
          </div>
        )}

        {/* Right: WhatsApp */}
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="See the WhatsApp"
            className="group flex items-center justify-center p-1 rounded-full transition-transform active:scale-95 outline-none cursor-pointer"
          >
            <WhatsApp2DIcon isRegistered={true} size={46} />
          </a>
        ) : (
          <div
            title="WhatsApp not connected"
            className="flex items-center justify-center p-1 opacity-50 cursor-not-allowed"
          >
            <WhatsApp2DIcon isRegistered={false} size={46} />
          </div>
        )}
      </div>
    </div>
  );
}
