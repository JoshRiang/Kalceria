"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const AESTHETIC_PRESETS = [
  "/jpeg/foto_abt1.jpeg",
  "/jpeg/foto_abt2.jpeg",
  "/jpeg/foto_abt3.jpeg",
  "/jpeg/foto_abt4.jpeg",
  "/jpeg/bg_event.jpeg",
  "/bg_tokyo.webp",
];

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
  const [alasanMasuk, setAlasanMasuk] = useState("");
  const [phone, setPhone] = useState("");
  const [hasWa, setHasWa] = useState(false);
  const [instagram, setInstagram] = useState("");
  const [hasIg, setHasIg] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || currentUser.name || currentUser.nickname || "");
      setAlasanMasuk(currentUser.alasanMasuk || currentUser.reason || currentUser.bio || "");
      
      const rawPhone = currentUser.phone || currentUser.whatsapp || "";
      setPhone(rawPhone);
      setHasWa(Boolean(rawPhone.trim()));

      const rawIg = currentUser.instagram || (currentUser.socialPlatform === "IG" ? currentUser.socialLink : "") || "";
      setInstagram(rawIg ? String(rawIg).replace(/^@/, "") : "");
      setHasIg(Boolean(rawIg.trim()));

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

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const updatedData = {
        name: displayName.trim(),
        displayName: displayName.trim(),
        alasanMasuk: alasanMasuk.trim(),
        bio: alasanMasuk.trim(),
        phone: hasWa ? phone.trim() : "",
        whatsapp: hasWa ? phone.trim() : "",
        instagram: hasIg ? instagram.trim().replace(/^@/, "") : "",
        socialPlatform: hasIg ? "IG" : hasWa ? "WA" : "NULL",
        socialLink: hasIg ? instagram.trim().replace(/^@/, "") : hasWa ? phone.trim() : null,
        coverImage: coverImage,
        coverUrl: coverImage,
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
          className={`relative w-full max-w-[500px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[26px] shadow-2xl overflow-hidden transition-colors duration-300 ${
            isModalDark
              ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
              : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`shrink-0 flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-b ${
              isModalDark ? "border-[#30363d]" : "border-[#d0d7de]"
            }`}
          >
            <h2 className="font-sans font-bold text-base sm:text-lg tracking-tight">
              Edit Profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={`text-2xl leading-none p-1 cursor-pointer transition-colors ${
                isModalDark ? "text-[#8b949e] hover:text-[#f0f6fc]" : "text-[#57606a] hover:text-[#1f2328]"
              }`}
            >
              x
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 font-sans text-xs">
            {/* 1. Cover BG & Profile Picture Combined Preview */}
            <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
              {/* Cover Preview */}
              <div className="relative w-full h-24 sm:h-28 bg-gradient-to-r from-neutral-800 to-neutral-900 overflow-hidden">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs font-semibold">
                    Default Cover Banner
                  </div>
                )}
                {/* Edit BG Pill */}
                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-95 cursor-pointer"
                >
                  Edit Profile BG
                </button>
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgFileChange}
                  className="hidden"
                />
              </div>

              {/* Profile Avatar overlapping cover */}
              <div className="relative px-4 pb-3 flex items-end justify-between -mt-8 sm:-mt-9">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-white dark:border-[#161b22] overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        avatarPreview ||
                        currentUser?.profilePicture ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName || "user")}`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Avatar Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      isModalDark
                        ? "bg-white text-black border-white hover:bg-neutral-200"
                        : "bg-black text-white border-black hover:bg-neutral-800"
                    }`}
                  >
                    Change Profile Picture
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null);
                        setProfilePicture(null);
                      }}
                      className="px-2 py-1.5 text-xs font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                    >
                      Remove Profile Picture
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Aesthetic Cover Presets Picker */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Preset Cover Themes
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {AESTHETIC_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCoverImage(preset);
                      setCoverPreview(preset);
                    }}
                    className={`relative shrink-0 w-14 h-9 rounded-md overflow-hidden border-2 transition-transform hover:scale-105 cursor-pointer ${
                      coverPreview === preset ? "border-amber-400 ring-2 ring-amber-400/40" : "border-neutral-600"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold uppercase tracking-wider text-[11px] text-neutral-400">
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

            {/* 3. Alasan Masuk (Bio) */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold uppercase tracking-wider text-[11px] text-neutral-400">
                Alasan Masuk Kalceria
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={alasanMasuk}
                onChange={(e) => setAlasanMasuk(e.target.value)}
                placeholder="Share your passion, vehicle build, or reason for joining Kalceria..."
                className={`w-full border rounded-lg p-2.5 text-xs sm:text-[13px] outline-none transition-all resize-none ${inputBgClass}`}
              />
              <span className="text-[10px] text-neutral-400 self-end">
                {alasanMasuk.length}/300
              </span>
            </div>

            {/* 4. WhatsApp (WA) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold uppercase tracking-wider text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  WhatsApp
                </label>
                {hasWa ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasWa(false);
                      setPhone("");
                    }}
                    className="text-[11px] font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                  >
                    Delete WA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHasWa(true)}
                    className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Add WA
                  </button>
                )}
              </div>
              {hasWa && (
                <input
                  type="tel"
                  maxLength={25}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+6281234567890"
                  className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
                />
              )}
            </div>

            {/* 5. Instagram (IG) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold uppercase tracking-wider text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  Instagram
                </label>
                {hasIg ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasIg(false);
                      setInstagram("");
                    }}
                    className="text-[11px] font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                  >
                    Delete IG
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHasIg(true)}
                    className="text-[11px] font-bold text-pink-500 hover:text-pink-400 hover:underline cursor-pointer"
                  >
                    + Add IG
                  </button>
                )}
              </div>
              {hasIg && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    maxLength={40}
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                    placeholder="your_handle"
                    className={`w-full border rounded-lg pl-7 pr-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
                  />
                </div>
              )}
            </div>

            {/* 6. Danger Zone / Account Security Actions */}
            <div className="mt-2 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onRequestChangePassword?.()}
                  className="font-bold text-xs text-red-500 hover:text-red-400 transition-colors underline decoration-red-500/40 underline-offset-4 cursor-pointer"
                >
                  Change Password
                </button>

                <button
                  type="button"
                  onClick={() => onRequestDeleteAccount?.()}
                  className="font-bold text-xs text-red-500 hover:text-red-400 transition-colors underline decoration-red-500/40 underline-offset-4 cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSaving}
              className={`mt-2 w-full font-extrabold text-[13px] uppercase tracking-wider py-3 rounded-lg transition-transform active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-50 ${
                isModalDark
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "bg-black text-white hover:bg-neutral-800"
              }`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
