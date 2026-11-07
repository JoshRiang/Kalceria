"use client";

import { useState } from "react";
import Image from "next/image";

import {
  formatJoinedDate,
  getFallbackCover,
  getAvatarUrl,
} from "./profileCard/profileCardHelpers";
import {
  WhatsApp2DIcon,
  Instagram2DIcon,
} from "./profileCard/ProfileCardSocialIcons";
import {
  normalizeMediaConfig,
  NormalizedMediaCover,
} from "./profileCard/NormalizedMediaCover";

export default function KalcerianProfileCard({
  user,
  isMapDark,
  showMobileClose = false,
  onClose,
  isMobileCompact = false,
  isOwnProfile = false,
  onEditProfile,
  inline = false,
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
        inline
          ? "rounded-none rounded-b-xl border-0 shadow-none"
          : isMobileCompact
          ? "max-w-[310px] mx-auto rounded-2xl shadow-2xl border"
          : "rounded-2xl border shadow-sm"
      } ${
        inline
          ? isMapDark
            ? "bg-[#161b22] text-[#f0f6fc]"
            : "bg-white text-[#1f2328]"
          : isMapDark
          ? "bg-[#161b22] text-[#f0f6fc] border-[#30363d]/80"
          : "bg-white text-[#1f2328] border-[#d0d7de]/80"
      }`}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* 1. Square 1:1 Cover Banner Background (Normalized Video, GIF, and Photo pipeline) */}
      <div className="relative w-full aspect-square max-h-[250px] sm:max-h-[270px] mx-auto overflow-hidden bg-neutral-900">
        <NormalizedMediaCover
          media={normalizedMedia}
          altText={`${displayName} cover`}
          onError={() => setImgError(true)}
          fallbackColor={fallbackCover}
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
