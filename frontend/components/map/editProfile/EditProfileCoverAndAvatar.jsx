"use client";

import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";

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
  return (
    <>
      {/* 1. Cover BG & Overlapping Half-Circle Profile Picture (Left Side, Z-Layered Above Cover BG) */}
      <div
        className="relative shrink-0"
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "42px",
          flexShrink: 0,
        }}
      >
        {/* Cover Preview (Solid Base Color or Custom Image) */}
        <div
          className="relative w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm"
          style={{
            position: "relative",
            width: "100%",
            height: "132px",
            borderRadius: "14px",
            overflow: "hidden",
            zIndex: 10,
            backgroundColor:
              coverPreview && coverPreview.startsWith("#")
                ? coverPreview
                : defaultBaseColor && defaultBaseColor.startsWith("#")
                ? defaultBaseColor
                : "#1b4332",
          }}
        >
          {coverPreview && !coverPreview.startsWith("#") && (
            coverPreview.endsWith(".mp4") || coverPreview.endsWith(".webm") || coverPreview.startsWith("data:video") ? (
              <video
                src={coverPreview}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt="Cover preview"
                className="w-full h-full object-cover"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )
          )}

          {/* Edit Button (No inner/outer box, clean bold text) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              bgInputRef.current?.click();
            }}
            className="absolute top-3 right-4 text-xs font-bold text-white hover:underline drop-shadow-md cursor-pointer z-20 bg-transparent border-none p-0 outline-none transition-opacity"
          >
            Edit
          </button>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4"
            onChange={handleBgFileChange}
            className="hidden"
          />
        </div>

        {/* Profile Avatar overlapping exact half-circle (50% = 42px above, 42px below) on left side above Edit BG */}
        <div
          style={{
            position: "absolute",
            left: "16px",
            bottom: "0px",
            zIndex: 35,
            display: "flex",
            alignItems: "flex-end",
            gap: "12px",
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
                src={avatarPreview || resolvePersistentAvatarUrl(currentUser)}
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

            {/* Small Camera Icon at bottom-right of Profile Picture */}
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
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>

          {/* Remove Profile Picture Action (Only shown when user uploaded a custom photo) */}
          {avatarPreview && !String(avatarPreview).includes("api.dicebear.com") && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const defaultDicebear = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                  currentUser?.nickname || currentUser?.username || currentUser?.id || cleanUsername || "anon"
                )}`;
                setAvatarPreview(defaultDicebear);
                setProfilePicture(defaultDicebear);
              }}
              className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer pb-1.5"
            >
              Remove Profile Picture
            </button>
          )}
        </div>
      </div>

      {fileError && (
        <p className="text-[#ef4444] text-xs font-semibold px-1 pt-0.5 animate-in fade-in">
          {fileError}
        </p>
      )}
    </>
  );
}
