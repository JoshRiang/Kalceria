"use client";

import { useState, useRef } from "react";
import { uploadBlobMedia } from "@/lib/api";

export function useIdeaCommentMedia() {
  const fileInputRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");

    // 1. Size check: strictly <= 10MB rejected on surface
    if (file.size > 10 * 1024 * 1024) {
      setMediaError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. MIME & Extension check: strictly PNG, JPEG, MP4
    const filename = file.name || "";
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const validExts = ["png", "jpg", "jpeg", "mp4"];
    const declaredMime = (file.type || "").toLowerCase();
    const validMimes = ["image/png", "image/jpeg", "image/pjpeg", "video/mp4"];

    if (!validExts.includes(ext) || (declaredMime && !validMimes.includes(declaredMime))) {
      setMediaError("Security enforcement: Hanya file .png, .jpeg, dan .mp4 yang diizinkan.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingMedia(true);
    try {
      const res = await uploadBlobMedia(file);
      if (res.url) {
        setMediaUrl((prev) => {
          const current = (prev || "").trim();
          return current ? `${current}, ${res.url}` : res.url;
        });
      }
    } catch (err) {
      setMediaError(err.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (indexToRemove) => {
    setMediaUrl((prev) => {
      const urls = (prev || "").split(",").map((s) => s.trim()).filter(Boolean);
      return urls.filter((_, idx) => idx !== indexToRemove).join(", ");
    });
  };

  return {
    fileInputRef,
    mediaUrl,
    setMediaUrl,
    isUploadingMedia,
    setIsUploadingMedia,
    mediaError,
    setMediaError,
    handleMediaUpload,
    handleRemoveMedia,
  };
}
