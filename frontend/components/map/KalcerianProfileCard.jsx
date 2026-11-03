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
    return "/media/gifs/event_spec_1.mp4";
  }
  if (name.includes("adit")) {
    return "/media/gifs/event_spec_1.gif";
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

// ─── 2D WhatsApp Icon (Official 100% authentic vector branding) ────
function WhatsApp2DIcon({ isRegistered, size = 46 }) {
  const bg = isRegistered ? "#25D366" : "#8b949e";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
    >
      {/* 1. Official WhatsApp Speech Bubble with Lower-Left Tail */}
      <path
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z"
        fill={bg}
      />
      {/* 2. Official Smooth Telephone Handset */}
      <path
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.6-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"
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
  const lowerUrl = String(url || "").toLowerCase();
  if (!type) {
    if (lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.startsWith("data:video") || lowerUrl.includes("video")) {
      type = "video";
    } else if (lowerUrl.endsWith(".gif") || lowerUrl.startsWith("data:image/gif") || lowerUrl.includes("gif")) {
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
  isOwnProfile = false,
  onEditProfile,
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

  const userCustomCover =
    user?.coverImage ||
    user?.coverUrl ||
    user?.cover ||
    user?.profileCover ||
    user?.bannerUrl ||
    null;

  const fallbackCover = getFallbackCover(user);
  const normalizedMedia = normalizeMediaConfig(
    imgError ? null : userCustomCover,
    user?.coverType || user?.mediaType,
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
      <div className="relative w-full aspect-square max-h-[250px] sm:max-h-[270px] mx-auto overflow-hidden bg-neutral-900 rounded-t-xl">
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

          {/* Close 'X' button for Mobile Family: snug and tight directly on profile picture rim */}
          {showMobileClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              aria-label="Close profile card"
              className={`absolute top-1 right-1 z-30 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-90 hover:scale-110 ${
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

          {/* Edit Profile 'Pencil' button: on the right side of the profile picture */}
          {isOwnProfile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditProfile) onEditProfile();
              }}
              aria-label="Edit Profile"
              title="Edit Profile"
              className={`absolute bottom-0.5 right-0.5 z-30 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-115 active:scale-90 border-[1.5px] ${
                isMapDark
                  ? "bg-white text-black border-black"
                  : "bg-black text-white border-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
