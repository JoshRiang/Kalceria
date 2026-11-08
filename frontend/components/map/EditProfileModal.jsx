"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoCropEditorModal } from "./modals/PhotoCropEditorModal";
import { uploadBlobMedia } from "@/lib/api";
import {
  resolvePersistentAvatarUrl,
  resolvePersistentCover,
  persistProfileIdentityCache,
} from "@/lib/profileIdentity";
import {
  getDeterministicBaseColor,
  EDIT_PROFILE_COKI_PATTERN,
  validateWhatsAppInput,
  validateInstagramInput,
} from "./editProfile/editProfileHelpers";
import { EditProfileCoverAndAvatar } from "./editProfile/EditProfileCoverAndAvatar";
import { EditProfileDangerZone } from "./editProfile/EditProfileDangerZone";
import { ActionArcSpinner } from "./modals/ActionArcSpinner";
import { inferIsVideoMediaUrl } from "./eventPopup/popupMediaMetadata";
import {
  MODAL_GENIE_BACKDROP,
  MODAL_GENIE_SURFACE,
  useModalBackClose,
} from "./modals/modalMotion";
import { prewarmVideoUrl } from "@/lib/videoPrewarmer";

async function uploadDataUrlViaBlob(dataUrl, fallbackName) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mime = blob.type || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const file = new File([blob], `${fallbackName}.${ext}`, { type: mime });
  const uploaded = await uploadBlobMedia(file);
  return uploaded?.url || dataUrl;
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
  const [isCoverVideo, setIsCoverVideo] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [cropContext, setCropContext] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileError, setFileError] = useState(null);

  const rawUsername =
    currentUser?.username ||
    currentUser?.nickname ||
    currentUser?.displayName ||
    currentUser?.name ||
    "user";
  const cleanUsername = String(rawUsername).replace(/^@/, "");

  const avatarInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const igInputRef = useRef(null);
  const pendingCoverFileRef = useRef(null);
  const coverObjectUrlRef = useRef(null);

  const clearPendingCover = useCallback(() => {
    pendingCoverFileRef.current = null;
    if (coverObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(coverObjectUrlRef.current);
      } catch {}
      coverObjectUrlRef.current = null;
    }
  }, []);

  const prevShowRef = useRef(false);

  useEffect(() => {
    return () => {
      clearPendingCover();
    };
  }, [clearPendingCover]);

  useEffect(() => {
    // Only initialize form fields when the modal opens (show transitions from false to true)
    if (show && !prevShowRef.current && currentUser) {
      const name = currentUser.displayName || currentUser.name || currentUser.nickname || "";
      setDisplayName(name);
      const desc = currentUser.bio || currentUser.alasanMasuk || currentUser.reason || "";
      setProfileDescription(desc.slice(0, 50));

      const rawPhone = currentUser.phone || currentUser.whatsapp || "";
      setPhone(rawPhone);

      const rawIg =
        currentUser.instagram ||
        (currentUser.socialPlatform === "IG" ? currentUser.socialLink : "") ||
        "";
      setInstagram(rawIg ? String(rawIg).replace(/^@/, "") : "");

      clearPendingCover();
      const existingCover = resolvePersistentCover(currentUser);
      setCoverImage(existingCover);
      setCoverPreview(existingCover);
      const isVideoCover = Boolean(
        currentUser?.coverType === "video" ||
        (existingCover && inferIsVideoMediaUrl(existingCover))
      );
      setIsCoverVideo(isVideoCover);

      const existingAvatar = resolvePersistentAvatarUrl(currentUser);
      setProfilePicture(existingAvatar);
      setAvatarPreview(existingAvatar);
      setFileError(null);
    }
    prevShowRef.current = Boolean(show);
  }, [currentUser, show, clearPendingCover]);

  useModalBackClose(Boolean(show), onClose);

  const isModalDark = Boolean(isMapDark);
  const defaultBaseColor = getDeterministicBaseColor(currentUser);

  const iconFg = isModalDark ? "#ffffff" : "#000000";
  const iconStroke = isModalDark ? "#000000" : "#ffffff";

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      e.target.value = "";
      return;
    }
    const mime = String(file.type || "").toLowerCase();
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isDisallowed =
      mime.startsWith("video/") ||
      mime === "image/gif" ||
      mime === "image/svg+xml" ||
      ["mp4", "webm", "mov", "gif", "svg"].includes(ext);
    const isAllowed =
      !isDisallowed &&
      (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext));
    if (!isAllowed) {
      setFileError("Only .png, .jpeg, and .webp image files are allowed for profile picture");
      e.target.value = "";
      return;
    }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setCropContext({ target: "avatar", src: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBgFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      e.target.value = "";
      return;
    }
    const mime = String(file.type || "").toLowerCase();
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "mp4", "webp", "webm"].includes(ext)) {
      setFileError("Only .png, .jpeg, .webp, .mp4, and .webm files are allowed");
      e.target.value = "";
      return;
    }
    setFileError(null);

    if (mime.startsWith("video/") || ["mp4", "webm"].includes(ext)) {
      clearPendingCover();
      const objUrl = URL.createObjectURL(file);
      coverObjectUrlRef.current = objUrl;
      pendingCoverFileRef.current = file;
      setIsCoverVideo(true);
      setCoverPreview(objUrl);
      setCoverImage(objUrl);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setCropContext({ target: "cover", src: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const waValidation = validateWhatsAppInput(phone);
  const igValidation = validateInstagramInput(instagram);
  const isFormValid = Boolean(displayName.trim()) && waValidation.valid && igValidation.valid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    setFileError(null);
    try {
      const cleanPhone = waValidation.normalized;
      const cleanIg = igValidation.normalized;

      let finalAvatar = profilePicture || resolvePersistentAvatarUrl(currentUser);
      if (finalAvatar && String(finalAvatar).startsWith("data:")) {
        finalAvatar = await uploadDataUrlViaBlob(finalAvatar, `avatar-${cleanUsername}`);
      }

      let finalCover = coverImage || defaultBaseColor;
      if (pendingCoverFileRef.current) {
        const uploadedCover = await uploadBlobMedia(pendingCoverFileRef.current);
        if (!uploadedCover?.url) {
          throw new Error("Failed to upload cover video.");
        }
        finalCover = uploadedCover.url;
        setCoverImage(finalCover);
        // CRITICAL: Keep coverPreview holding the local preview during Genie exit animation
        // so the card never flashes green before unmounting.
      } else if (finalCover && String(finalCover).startsWith("data:")) {
        finalCover = await uploadDataUrlViaBlob(finalCover, `cover-${cleanUsername}`);
        setCoverImage(finalCover);
      }

      const coverType = isCoverVideo ? "video" : "image";
      if (coverType === "video" && finalCover && !finalCover.startsWith("#") && !finalCover.startsWith("data:")) {
        prewarmVideoUrl(finalCover);
      }

      persistProfileIdentityCache(currentUser, {
        profilePicture: finalAvatar,
        coverImage: finalCover,
        coverType,
      });

      const updatedData = {
        name: displayName.trim(),
        displayName: displayName.trim(),
        alasanMasuk: profileDescription.trim(),
        bio: profileDescription.trim(),
        reason: profileDescription.trim(),
        phone: cleanPhone,
        whatsapp: cleanPhone,
        instagram: cleanIg,
        socialPlatform: cleanIg ? "IG" : cleanPhone ? "WA" : "NULL",
        socialLink: cleanIg ? cleanIg : cleanPhone ? cleanPhone : null,
        coverImage: finalCover,
        coverUrl: finalCover,
        coverType,
        profilePicture: finalAvatar,
      };
      await onSaveProfile?.(updatedData);
      onClose();
    } catch (err) {
      setFileError(err?.message || "Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  const inputBgClass = isModalDark
    ? "bg-[#0c1528] border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-400"
    : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] placeholder:text-slate-400 focus:border-[#0969da]";

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            key="edit-profile-backdrop"
            {...MODAL_GENIE_BACKDROP}
            onClick={onClose}
            className="fixed inset-0 z-[2100] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm select-none"
          >
            <motion.div
              key="edit-profile-surface"
              {...MODAL_GENIE_SURFACE}
              className={`relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[22px] sm:rounded-[26px] shadow-2xl overflow-hidden transition-colors duration-300 ${
                isModalDark
                  ? "bg-[#0d1117] border border-[#30363d] text-[#f0f6fc]"
                  : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Smooth-trimmed Sparse CokiEditProfile Wallpaper */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-[54px] bottom-0 z-0 pointer-events-none select-none overflow-hidden"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 14px, black 30px)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 14px, black 30px)",
                }}
              >
                {EDIT_PROFILE_COKI_PATTERN.map((item, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src="/BG_IMPROVE_FOR_MAP/CokiEditProfile.webp"
                    alt=""
                    decoding="sync"
                    draggable={false}
                    style={{
                      position: "absolute",
                      top: item.top,
                      left: item.left,
                      width: `${item.size}px`,
                      height: `${item.size}px`,
                      transform: `rotate(${item.rotate})`,
                      filter: isModalDark
                        ? "brightness(1.08) drop-shadow(0 0 1.2px rgba(255,255,255,0.62)) drop-shadow(0 0 9px rgba(255,255,255,0.15))"
                        : "contrast(1.18)",
                    }}
                    className={`object-contain transition-opacity duration-300 ${
                      isModalDark ? "opacity-[0.34]" : "opacity-[0.38]"
                    }`}
                  />
                ))}
              </div>

              {/* Header */}
              <div
                className={`relative z-10 shrink-0 flex justify-between items-center px-5 sm:px-6 pt-4 pb-2 border-none ${
                  isModalDark ? "bg-[#0d1117]" : "bg-[#ffffff]"
                }`}
              >
                <h2 className="font-sans font-bold text-base sm:text-lg tracking-tight">
                  Edit @{cleanUsername} Profile
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

              {/* Form Body */}
              <form
                onSubmit={handleSubmit}
                className="relative z-10 px-5 sm:px-6 pb-6 pt-1 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 font-sans text-xs"
              >
                <EditProfileCoverAndAvatar
                  isModalDark={isModalDark}
                  coverPreview={coverPreview}
                  isCoverVideo={isCoverVideo}
                  defaultBaseColor={defaultBaseColor}
                  bgInputRef={bgInputRef}
                  handleBgFileChange={handleBgFileChange}
                  avatarInputRef={avatarInputRef}
                  handleAvatarFileChange={handleAvatarFileChange}
                  avatarPreview={avatarPreview}
                  currentUser={currentUser}
                  cleanUsername={cleanUsername}
                  setAvatarPreview={setAvatarPreview}
                  setProfilePicture={setProfilePicture}
                  fileError={fileError}
                />

                {/* Display Name */}
                <div className="shrink-0 flex flex-col gap-1.5">
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

                {/* Profile Description */}
                <div className="shrink-0 flex flex-col gap-1.5">
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

                {/* WhatsApp */}
                <div className="shrink-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                        className="w-5 h-5 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <line x1="12" y1="4" x2="12" y2="20" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
                          <line x1="4" y1="12" x2="20" y2="12" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <input
                    ref={phoneInputRef}
                    type="tel"
                    maxLength={25}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Add WhatsApp Number"
                    className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
                  />
                  {!waValidation.valid && (
                    <p className="text-[10px] text-red-500 mt-1 font-sans">
                      Nomor tidak valid
                    </p>
                  )}
                </div>

                {/* Instagram */}
                <div className="shrink-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <rect x="3" y="3" width="18" height="18" rx="5" fill={iconFg} stroke={iconStroke} strokeWidth="1.4" />
                        <circle cx="12" cy="12" r="4.2" stroke={iconStroke} strokeWidth="1.6" fill="none" />
                        <circle cx="17" cy="7" r="1.1" fill={iconStroke} />
                      </svg>
                      <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
                        Instagram
                      </label>
                    </div>

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
                        className="w-5 h-5 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <line x1="12" y1="4" x2="12" y2="20" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
                          <line x1="4" y1="12" x2="20" y2="12" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>

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
                  {!igValidation.valid && (
                    <p className="text-[10px] text-red-500 mt-1 font-sans">
                      Username tidak valid
                    </p>
                  )}
                </div>

                {/* Danger Zone */}
                <EditProfileDangerZone
                  iconFg={iconFg}
                  iconStroke={iconStroke}
                  onRequestChangePassword={onRequestChangePassword}
                  onRequestDeleteAccount={onRequestDeleteAccount}
                />

                {/* Save Button with circular arc spinner */}
                <button
                  type="submit"
                  disabled={isSaving || !isFormValid}
                  aria-label={isSaving ? "Saving profile" : "Save"}
                  className={`shrink-0 mt-1 w-full h-[42px] flex items-center justify-center font-extrabold text-[13px] rounded-lg transition-transform active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                    isModalDark
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-black text-white hover:bg-neutral-800"
                  }`}
                >
                  {isSaving ? (
                    <ActionArcSpinner className="w-4 h-4" label="Saving profile" />
                  ) : (
                    "Save"
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Square Crop & Rotate Modal (used for both Profile Picture and Cover Photo) */}
      <PhotoCropEditorModal
        show={Boolean(cropContext?.src)}
        rawImage={cropContext?.src || null}
        isMapDark={isModalDark}
        onDone={(processedDataUrl) => {
          if (cropContext?.target === "cover") {
            clearPendingCover();
            setIsCoverVideo(false);
            setCoverPreview(processedDataUrl);
            setCoverImage(processedDataUrl);
          } else {
            setAvatarPreview(processedDataUrl);
            setProfilePicture(processedDataUrl);
          }
          setCropContext(null);
        }}
        onCancel={() => {
          setCropContext(null);
        }}
      />
    </>
  );
}
