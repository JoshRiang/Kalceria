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
  validateWhatsAppInput,
  validateInstagramInput,
  uploadDataUrlViaBlob,
} from "./editProfile/editProfileHelpers";
import { EditProfileCoverAndAvatar } from "./editProfile/EditProfileCoverAndAvatar";
import { EditProfileDangerZone } from "./editProfile/EditProfileDangerZone";
import { EditProfileCokiBackground } from "./editProfile/EditProfileCokiBackground";
import { EditProfileSocialFields } from "./editProfile/EditProfileSocialFields";
import { ActionArcSpinner } from "./modals/ActionArcSpinner";
import { inferIsVideoMediaUrl } from "./eventPopup/popupMediaMetadata";
import {
  MODAL_GENIE_BACKDROP,
  MODAL_GENIE_SURFACE,
  useModalBackClose,
} from "./modals/modalMotion";
import { prewarmVideoUrl } from "@/lib/videoPrewarmer";

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
    const allowedCoverExts = ["png", "jpg", "jpeg", "webp", "mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm"];
    if (!allowedCoverExts.includes(ext)) {
      setFileError("Only .png, .jpeg, .webp, and video files (.mp4, .mov, .webm) are allowed");
      e.target.value = "";
      return;
    }
    setFileError(null);

    const isVideo = mime.startsWith("video/") || ["mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm"].includes(ext);
    if (isVideo) {
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
              <EditProfileCokiBackground isModalDark={isModalDark} />

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

                <EditProfileSocialFields
                  phone={phone}
                  setPhone={setPhone}
                  phoneInputRef={phoneInputRef}
                  waValidation={waValidation}
                  instagram={instagram}
                  setInstagram={setInstagram}
                  igInputRef={igInputRef}
                  igValidation={igValidation}
                  iconFg={iconFg}
                  iconStroke={iconStroke}
                  inputBgClass={inputBgClass}
                />

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
