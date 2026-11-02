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

function getFallbackCover(userId) {
  if (!userId) return "/aboutus_bg1.webp";
  const num = (Math.abs(String(userId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 10) + 1;
  return `/ToAddress_Mobile_ForHPFamily_Not_Tab/${num}.jpeg`;
}

function getAvatarUrl(user) {
  return (
    user?.profilePicture ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      user?.nickname || user?.name || "anon"
    )}`
  );
}

// ─── 2D Hollowed WhatsApp Icon (Vibrant green when registered, gray when not) ────
function WhatsApp2DIcon({ isRegistered, size = 36 }) {
  const bg = isRegistered ? "#25D366" : "#8b949e";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className="shrink-0 transition-transform group-hover:scale-110 drop-shadow-sm"
    >
      <circle cx="18" cy="18" r="17" fill={bg} />
      <path
        d="M18 7.5c-5.8 0-10.5 4.7-10.5 10.5 0 2 .5 3.9 1.6 5.6L8 28.5l5.6-1.1c1.6.9 3.4 1.4 5.4 1.4 5.8 0 10.5-4.7 10.5-10.5S23.8 7.5 18 7.5zm5.4 14.8c-.2.6-1.3 1.2-1.8 1.3-.5.1-1.1.2-3.3-.7-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.2.2-.2.5-.3.7-.3.1 0 .2 0 .3 0 .2 0 .5-.1.7.5.3.6 1 2.3 1.1 2.4.1.2.1.4 0 .6-.1.2-.2.3-.3.5-.1.2-.3.3-.4.5-.1.1-.3.3-.1.6.2.3.9 1.4 1.9 2.3 1.3 1.2 2.4 1.5 2.8 1.7.3.2.5.1.7-.1.2-.2.8-1 1-1.3.2-.3.4-.3.7-.2.3.1 1.9.9 2.2 1.1.3.2.5.3.6.4.1.2.1 1.2-.1 1.8z"
        fill="#ffffff"
      />
    </svg>
  );
}

// ─── 2D Hollowed Instagram Icon (Vibrant gradient when registered, gray when not) ───
function Instagram2DIcon({ isRegistered, size = 36 }) {
  const gradientId = "igGradProfileCard";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className="shrink-0 transition-transform group-hover:scale-110 drop-shadow-sm"
    >
      <defs>
        <radialGradient id={gradientId} cx="25%" cy="105%" r="125%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="15%" stopColor="#fdf497" />
          <stop offset="50%" stopColor="#fd5949" />
          <stop offset="75%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="17" fill={isRegistered ? `url(#${gradientId})` : "#8b949e"} />
      <rect x="11.5" y="11.5" width="13" height="13" rx="3.5" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="18" cy="18" r="3.2" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="21.5" cy="14.5" r="0.9" fill="#ffffff" />
    </svg>
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

  const joinedText = formatJoinedDate(user?.createdAt);
  const coverSrc = imgError || !user?.coverImage ? getFallbackCover(user?.id) : user.coverImage;
  const isVideo =
    user?.coverType === "video" ||
    (typeof coverSrc === "string" && (coverSrc.endsWith(".mp4") || coverSrc.endsWith(".webm")));

  // Bio / Alasan masuk Kalceria (Arial, non-bold, not all-caps)
  const bioText =
    user?.reason ||
    user?.bio ||
    user?.alasanMasuk ||
    "Automotive enthusiast seeking camaraderie, spirited night runs, and shared passion with the Kalceria community.";

  // Social Links resolution
  const igHandle =
    user?.socialPlatform === "IG" && user?.socialLink
      ? user.socialLink
      : user?.instagram ||
        (user?.socialLink && !user?.socialLink.startsWith("+") && !/^\d+$/.test(user?.socialLink)
          ? user.socialLink
          : null);
  const igUrl = igHandle ? `https://instagram.com/${String(igHandle).replace(/^@/, "")}` : null;

  const waRaw =
    user?.socialPlatform === "WA" && user?.socialLink
      ? user.socialLink
      : user?.phone ||
        user?.whatsapp ||
        (user?.socialLink && /^\+?\d+$/.test(user.socialLink) ? user.socialLink : null);
  const cleanPhone = waRaw ? String(waRaw).replace(/[^\d]/g, "") : null;
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

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
      {/* 1. Square 1:1 Cover Banner Background (Supporting Video, GIF, and Photo) */}
      <div className="relative w-full aspect-square overflow-hidden bg-neutral-900">
        {isVideo ? (
          <video
            src={coverSrc}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <Image
            src={coverSrc}
            alt={`${displayName} cover`}
            fill
            unoptimized
            onError={() => setImgError(true)}
            className="object-cover object-center transition-transform duration-500 hover:scale-105"
          />
        )}
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

      {/* 6. Bottom Social Section: Clean borderless depth, NO line and NO grid */}
      <div className="flex items-center justify-center gap-7 py-3 mt-1">
        {/* Left: Instagram */}
        {igUrl ? (
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="See the Instagram"
            className="group flex items-center justify-center p-1 rounded-full transition-transform active:scale-95 outline-none cursor-pointer"
          >
            <Instagram2DIcon isRegistered={true} size={36} />
          </a>
        ) : (
          <div
            title="Instagram not connected"
            className="flex items-center justify-center p-1 opacity-50 cursor-not-allowed"
          >
            <Instagram2DIcon isRegistered={false} size={36} />
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
            <WhatsApp2DIcon isRegistered={true} size={36} />
          </a>
        ) : (
          <div
            title="WhatsApp not connected"
            className="flex items-center justify-center p-1 opacity-50 cursor-not-allowed"
          >
            <WhatsApp2DIcon isRegistered={false} size={36} />
          </div>
        )}
      </div>
    </div>
  );
}
