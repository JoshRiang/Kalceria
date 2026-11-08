"use client";

import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";
import { inferIsVideoMediaUrl } from "../eventPopup/popupMediaMetadata";

export function EditProfileCoverAndAvatar({
  isModalDark,
  coverPreview,
  defaultBaseColor,
  bgInputRef,
  handleBgFileChange,
  avatarInputRef,
  handleAvatarFileChange,
  avatarPreview,
  currentUser,
  cleanUsername,
  setAvatarPreview,
  setProfilePicture,
  fileError,
}) {
  const activeAvatarSrc = avatarPreview || resolvePersistentAvatarUrl(currentUser);
  const hasCustomAvatar = Boolean(
    activeAvatarSrc && !String(activeAvatarSrc).includes("api.dicebear.com")
  );
  const isCoverColor = Boolean(coverPreview && String(coverPreview).startsWith("#"));
  const isCoverVideo = Boolean(coverPreview && !isCoverColor && inferIsVideoMediaUrl(coverPreview));

  const defaultDicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    currentUser?.nickname || currentUser?.username || currentUser?.id || cleanUsername || "anon"
  )}`;

  return (
    <>
      {/* 1. Square 1:1 Cover BG & Overlapping Half-Circle Profile Picture */}
      <div className="relative shrink-0 w-full flex justify-center pt-1">
        <div
          className="relative w-full max-w-[236px] xs:max-w-[252px] mx-auto"
          style={{ paddingBottom: "42px" }}
        >
          {/* Square 1:1 Cover Preview (Solid Base Color, Image, or Video) */}
          <div
            className="relative w-full aspect-square rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 shadow-sm z-10"
            style={{
              backgroundColor:
                isCoverColor
                  ? coverPreview
                  : defaultBaseColor && String(defaultBaseColor).startsWith("#")
                  ? defaultBaseColor
                  : "#1b4332",
            }}
          >
            {coverPreview && !isCoverColor && (
              isCoverVideo ? (
                <video
                  key={coverPreview}
                  src={coverPreview}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover block"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover block"
                />
              )
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                bgInputRef.current?.click();
              }}
              className="absolute top-2.5 right-3 text-xs font-bold text-white hover:underline drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] cursor-pointer z-20 bg-transparent border-none p-0 outline-none transition-opacity"
            >
              Edit
            </button>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm"
              onChange={handleBgFileChange}
              className="hidden"
            />
          </div>

          {/* Profile Avatar overlapping exact half-circle (42px above, 42px below) at left */}
          <div
            style={{
              position: "absolute",
              left: "14px",
              bottom: "0px",
              zIndex: 35,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "84px",
                height: "84px",
                flexShrink: 0,
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  avatarInputRef.current?.click();
                }}
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "9999px",
                  overflow: "hidden",
                  border: isModalDark ? "3px solid #161b22" : "3px solid #ffffff",
                  backgroundColor: isModalDark ? "#262626" : "#e5e7eb",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.28)",
                  cursor: "pointer",
                }}
                className="group"
                title="Change Profile Picture"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeAvatarSrc}
                  alt="Avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  className="group-hover:opacity-90 transition-opacity"
                />
              </div>

              {/* Bottom-right Badge: Pitch-Black Trashcan when custom avatar set, otherwise Camera */}
              {hasCustomAvatar ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatarPreview(defaultDicebearUrl);
                    setProfilePicture(defaultDicebearUrl);
                  }}
                  aria-label="Remove Profile Picture"
                  title="Remove Profile Picture"
                  style={{
                    position: "absolute",
                    bottom: "0px",
                    right: "0px",
                    width: "28px",
                    height: "28px",
                    borderRadius: "9999px",
                    zIndex: 45,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000000",
                    color: "#ffffff",
                    border: isModalDark ? "2px solid #161b22" : "2px solid #ffffff",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                  }}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                  aria-label="Change Profile Picture"
                  title="Change Profile Picture"
                  style={{
                    position: "absolute",
                    bottom: "0px",
                    right: "0px",
                    width: "28px",
                    height: "28px",
                    borderRadius: "9999px",
                    zIndex: 45,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isModalDark ? "#ffffff" : "#000000",
                    color: isModalDark ? "#000000" : "#ffffff",
                    border: isModalDark ? "2px solid #161b22" : "2px solid #ffffff",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
                    cursor: "pointer",
                  }}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {fileError && (
        <p className="text-[#ef4444] text-xs font-semibold px-1 pt-0.5 text-center animate-in fade-in">
          {fileError}
        </p>
      )}
    </>
  );
}
