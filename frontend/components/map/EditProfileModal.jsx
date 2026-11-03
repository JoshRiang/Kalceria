"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE_PROFILE_COLORS = [
  "#1b4332", // Forest Green
  "#1e3a5f", // Deep Navy
  "#2d3748", // Slate Charcoal
  "#134e4a", // Deep Emerald
  "#312e81", // Deep Indigo
  "#3f3f46", // Modern Zinc
  "#4c1d95", // Deep Violet
  "#78350f", // Warm Amber Umber
  "#14532d", // Rich Pine
  "#334155", // Midnight Slate
];

function getDeterministicBaseColor(nameOrId) {
  const str = String(nameOrId || "kalcerian");
  const num = Math.abs(str.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % BASE_PROFILE_COLORS.length;
  return BASE_PROFILE_COLORS[num];
}

export function EditProfileModal({
  show,
  onClose,
  isMapDark,
  currentUser,
  onSaveProfile,
  onRequestChangePassword,
  onRequestDeleteAccount,
}) {
  const [displayName, setDisplayName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileError, setFileError] = useState(null);

  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const igInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      const name = currentUser.displayName || currentUser.name || currentUser.nickname || "";
      setDisplayName(name);
      const desc = currentUser.bio || currentUser.alasanMasuk || currentUser.reason || "";
      setProfileDescription(desc.slice(0, 50));
      
      const rawPhone = currentUser.phone || currentUser.whatsapp || "";
      setPhone(rawPhone);

      const rawIg = currentUser.instagram || (currentUser.socialPlatform === "IG" ? currentUser.socialLink : "") || "";
      setInstagram(rawIg ? String(rawIg).replace(/^@/, "") : "");

      const existingCover = currentUser.coverImage || currentUser.coverUrl || currentUser.cover || "";
      setCoverImage(existingCover);
      setCoverPreview(existingCover);

      const existingAvatar = currentUser.profilePicture || "";
      setProfilePicture(existingAvatar);
      setAvatarPreview(existingAvatar);
    }
  }, [currentUser, show]);

  if (!show) return null;

  const isModalDark = Boolean(isMapDark);
  const defaultBaseColor = getDeterministicBaseColor(currentUser?.id || displayName || "kalcerian");

  // Icon theme tokens: Light = black with minor white border; Dark = white with minor black border
  const iconFg = isModalDark ? "#ffffff" : "#000000";
  const iconStroke = isModalDark ? "#000000" : "#ffffff";

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "mp4"].includes(ext)) {
      setFileError("Only .png, .jpeg, and .mp4 files are allowed");
      e.target.value = "";
      return;
    }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setAvatarPreview(dataUrl);
      setProfilePicture(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleBgFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "mp4"].includes(ext)) {
      setFileError("Only .png, .jpeg, and .mp4 files are allowed");
      e.target.value = "";
      return;
    }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setCoverPreview(dataUrl);
      setCoverImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanPhone = phone.trim();
      const cleanIg = instagram.trim().replace(/^@/, "");
      const updatedData = {
        name: displayName.trim(),
        displayName: displayName.trim(),
        alasanMasuk: profileDescription.trim(),
        bio: profileDescription.trim(),
        phone: cleanPhone,
        whatsapp: cleanPhone,
        instagram: cleanIg,
        socialPlatform: cleanIg ? "IG" : cleanPhone ? "WA" : "NULL",
        socialLink: cleanIg ? cleanIg : cleanPhone ? cleanPhone : null,
        coverImage: coverImage || defaultBaseColor,
        coverUrl: coverImage || defaultBaseColor,
        profilePicture: profilePicture || null,
      };
      await onSaveProfile?.(updatedData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const inputBgClass = isModalDark
    ? "bg-[#0c1528] border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-400"
    : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] placeholder:text-slate-400 focus:border-[#0969da]";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2100] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[22px] sm:rounded-[26px] shadow-2xl overflow-hidden transition-colors duration-300 ${
            isModalDark
              ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
              : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - No dividing line underneath (vanished) */}
          <div className="shrink-0 flex justify-between items-center px-5 sm:px-6 pt-4 pb-2 border-none">
            <h2 className="font-sans font-bold text-base sm:text-lg tracking-tight">
              Edit Profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`text-2xl leading-none relative z-10 transition-colors p-1 cursor-pointer ${
                isModalDark ? "text-[#8b949e] hover:text-[#f0f6fc]" : "text-[#57606a] hover:text-[#1f2328]"
              }`}
            >
              ×
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-5 pt-1 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 font-sans text-xs">
            {/* 1. Cover BG & Profile Picture (Random Base Color, Clean & Uncramped) */}
            <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
              {/* Cover Preview (Solid Base Color or Custom Image) */}
              <div
                className="relative w-full h-24 sm:h-28 overflow-hidden"
                style={{
                  backgroundColor: coverPreview && coverPreview.startsWith("#") ? coverPreview : defaultBaseColor,
                }}
              >
                {coverPreview && !coverPreview.startsWith("#") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                )}
                
                {/* Edit Button (Changed from 'Edit Profile BG' to 'Edit') */}
                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full text-[11px] font-bold bg-black/65 hover:bg-black/85 text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-95 cursor-pointer"
                >
                  Edit
                </button>
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgFileChange}
                  className="hidden"
                />
              </div>

              {/* Profile Avatar overlapping cover with Edit Pencil Icon beside it */}
              <div className="relative px-4 pb-3 flex items-end justify-between -mt-8 sm:-mt-9">
                <div className="relative">
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-white dark:border-[#161b22] overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md cursor-pointer group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        avatarPreview ||
                        currentUser?.profilePicture ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName || "user")}`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  </div>

                  {/* Picture 1 Pencil Edit Icon on Avatar rim */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change Avatar"
                    title="Change Profile Picture"
                    className={`absolute bottom-0 right-0 z-20 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-115 active:scale-90 border-[1.5px] ${
                      isModalDark ? "bg-white text-black border-black" : "bg-black text-white border-white"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                      <path d="M 3 21 L 3.8 15.5 L 8.5 20.2 Z" />
                      <path d="M 6.2 13.1 L 13.1 6.2 L 17.8 10.9 L 10.9 17.8 Z" />
                      <path d="M 15.5 3.8 L 17.8 1.5 C 18.6 0.7 19.9 0.7 20.7 1.5 L 22.5 3.3 C 23.3 4.1 23.3 5.4 22.5 6.2 L 20.2 8.5 Z" />
                    </svg>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>

                {/* Avatar Actions */}
                <div className="flex items-center gap-2">
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null);
                        setProfilePicture(null);
                      }}
                      className="px-2 py-1 text-xs font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                    >
                      Remove Profile Picture
                    </button>
                  )}
                </div>
              </div>
              {fileError && (
                <p className="text-[#ef4444] text-xs font-semibold px-4 pb-2 animate-in fade-in">
                  {fileError}
                </p>
              )}
            </div>

            {/* 2. Display Name (Not all-caps, Arial bold grey) */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
                Display Name
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your community name or callsign"
                className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
              />
            </div>

            {/* 3. Profile Description (Substituted for Alasan Masuk Kalceria, Arial bold grey, 0/50 limit) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
                  Profile Description
                </label>
                <span style={{ fontFamily: "Arial, sans-serif" }} className="text-[10.5px] text-neutral-400">
                  {profileDescription.length}/50
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={50}
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value.slice(0, 50))}
                placeholder="Share your passion, vehicle build, or reason..."
                className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-[13px] outline-none resize-none transition-all ${inputBgClass}`}
              />
            </div>

            {/* 4. WhatsApp (Always visible input, 2D WA logo, + or trash button) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 2D WhatsApp Logo (Black with minor white in light, vice versa in dark) */}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path
                      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z"
                      fill={iconFg}
                      stroke={iconStroke}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.6-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"
                      fill={iconStroke}
                    />
                  </svg>
                  <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
                    WhatsApp
                  </label>
                </div>

                {/* Right Action Button (+ or Trash) */}
                {phone.trim() ? (
                  <button
                    type="button"
                    onClick={() => setPhone("")}
                    title="Omit WhatsApp number"
                    className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => phoneInputRef.current?.focus()}
                    title="Add WhatsApp Number"
                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs border transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                      isModalDark ? "bg-white text-black border-black" : "bg-black text-white border-white"
                    }`}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Input field always visible */}
              <input
                ref={phoneInputRef}
                type="tel"
                maxLength={25}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Add WhatsApp Number"
                className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
              />
            </div>

            {/* 5. Instagram (Always visible input, 2D IG logo, + or trash button) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 2D Instagram Logo (Black with minor white in light, vice versa in dark) */}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <rect x="3" y="3" width="18" height="18" rx="5" fill={iconFg} stroke={iconStroke} strokeWidth="1.4" />
                    <circle cx="12" cy="12" r="4.2" stroke={iconStroke} strokeWidth="1.6" fill="none" />
                    <circle cx="17" cy="7" r="1.1" fill={iconStroke} />
                  </svg>
                  <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
                    Instagram
                  </label>
                </div>

                {/* Right Action Button (+ or Trash) */}
                {instagram.trim() ? (
                  <button
                    type="button"
                    onClick={() => setInstagram("")}
                    title="Omit Instagram handle"
                    className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => igInputRef.current?.focus()}
                    title="Add Instagram Link"
                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs border transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                      isModalDark ? "bg-white text-black border-black" : "bg-black text-white border-white"
                    }`}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Input field always visible */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-xs">
                  @
                </span>
                <input
                  ref={igInputRef}
                  type="text"
                  maxLength={40}
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                  placeholder="Add Instagram Link / Handle"
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
                />
              </div>
            </div>

            {/* 6. Danger Zone: Change Password & Delete Account (Red Arial Bold, No Underline, Left Picture 2 & 3 Icons) */}
            <div className="mt-1 pt-2.5 flex items-center justify-between border-t border-black/10 dark:border-white/10">
              {/* Change Password (Picture 3 Reset Password Icon) */}
              <button
                type="button"
                onClick={() => onRequestChangePassword?.()}
                style={{ fontFamily: "Arial, sans-serif" }}
                className="font-bold text-xs text-red-500 hover:text-red-400 no-underline transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M 21 12 A 9 9 0 0 0 6 5.5 L 3.5 3" stroke={iconFg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 3.5 8.5 L 6.5 5.5 L 3 3" fill="none" stroke={iconFg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 3 12 A 9 9 0 0 0 18 18.5 L 20.5 21" stroke={iconFg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 20.5 15.5 L 17.5 18.5 L 21 21" fill="none" stroke={iconFg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="7.5" y="11" width="9" height="7.5" rx="1.5" fill={iconFg} stroke={iconStroke} strokeWidth="1.6" />
                  <path d="M 9.5 11 V 8.5 C 9.5 7.1 10.6 6 12 6 C 13.4 6 14.5 7.1 14.5 8.5 V 11" fill="none" stroke={iconFg} strokeWidth="1.8" />
                  <circle cx="12" cy="14.5" r="1" fill={iconStroke} />
                </svg>
                Change Password
              </button>

              {/* Delete Account (Picture 2 Delete Account Icon) */}
              <button
                type="button"
                onClick={() => onRequestDeleteAccount?.()}
                style={{ fontFamily: "Arial, sans-serif" }}
                className="font-bold text-xs text-red-500 hover:text-red-400 no-underline transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M 21.5 10.5 A 10 10 0 1 0 11.5 21.9" stroke={iconFg} strokeWidth="1.8" />
                  <circle cx="10.5" cy="8.5" r="3.2" fill={iconFg} stroke={iconStroke} strokeWidth="1.2" />
                  <path d="M 4.5 18 C 4.5 14.5 7.5 13.5 10.5 13.5 C 12.2 13.5 13.6 13.9 14.6 14.6" fill={iconFg} stroke={iconStroke} strokeWidth="1.2" />
                  <circle cx="17" cy="17" r="5" fill={iconFg} stroke={iconStroke} strokeWidth="1.6" />
                  <line x1="15" y1="15" x2="19" y2="19" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="19" y1="15" x2="15" y2="19" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Delete Account
              </button>
            </div>

            {/* Submit Button (Changed from 'Save Changes' to 'Save') */}
            <button
              type="submit"
              disabled={isSaving}
              className={`mt-1 w-full font-extrabold text-[13px] py-3 rounded-lg transition-transform active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-50 ${
                isModalDark
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "bg-black text-white hover:bg-neutral-800"
              }`}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
