"use client";

import { useState, useRef, useEffect } from "react";
import { uploadBlobMedia } from "@/lib/api";

const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm"];

export function useIdeaCommentMedia() {
  const fileInputRef = useRef(null);
  const fileNamesRef = useRef({});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mediaUrl, setMediaUrl] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Clean up in-memory blob URLs when modal unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      const urls = (mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
      urls.forEach((u) => {
        if (u && u.startsWith("blob:")) {
          try { URL.revokeObjectURL(u); } catch {}
        }
      });
    };
  }, []);

  const cleanFilename = (rawName) => {
    if (!rawName) return "media-file";
    let decoded = rawName;
    try {
      decoded = decodeURIComponent(rawName);
    } catch {}
    // Strip standard UUID prefix:
    decoded = decoded.replace(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[-_]/i,
      ""
    );
    // Strip timestamp or numeric prefix:
    decoded = decoded.replace(/^\d{9,}[-_]/, "");
    // Strip Vercel Blob or random hash suffix before file extension:
    decoded = decoded.replace(/-[a-zA-Z0-9_-]{16,40}(?=\.[a-zA-Z0-9]+$)/, "");
    return decoded || "media-file";
  };

  const getDisplayFilename = (url) => {
    if (!url) return "";
    if (fileNamesRef.current[url]) return fileNamesRef.current[url];
    if (url.startsWith("blob:")) return "uploaded-media";
    if (url.includes("/api/blob/raw")) {
      try {
        const inner = new URL(url, "https://kalceria.internal").searchParams.get("url") || "";
        const parts = inner.split("/");
        const last = parts[parts.length - 1];
        return cleanFilename(last);
      } catch {
        return "uploaded-media";
      }
    }
    try {
      const u = new URL(url, "https://kalceria.internal");
      const name = u.pathname.split("/").pop();
      if (name) return cleanFilename(name);
    } catch {}
    return cleanFilename(url);
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");

    // 1. File size check matching Event Card: <= 4.5 MB
    if (file.size > 4.5 * 1024 * 1024) {
      setMediaError("Ukuran file melebihi 4.5 MB. Maksimal ukuran file adalah 4.5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. MIME & Extension check matching Event Card
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setMediaError("Hanya file gambar (.png, .jpeg, .webp) dan video (.mp4, .m4v, .mov, .webm) yang diizinkan");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Instant 0ms latency local preview
    const instantObjUrl = URL.createObjectURL(file);
    fileNamesRef.current[instantObjUrl] = file.name;

    setMediaUrl((prev) => {
      const existing = (prev || "").split(",").map((s) => s.trim()).filter(Boolean);
      const nextUrls = [...existing, instantObjUrl].join(", ");
      setSelectedIdx(existing.length);
      return nextUrls;
    });

    setIsUploadingMedia(true);
    try {
      const res = await uploadBlobMedia(file);
      if (res?.url) {
        try { URL.revokeObjectURL(instantObjUrl); } catch {}
        fileNamesRef.current[res.url] = file.name;
        delete fileNamesRef.current[instantObjUrl];

        setMediaUrl((prev) => {
          const existing = (prev || "").split(",").map((s) => s.trim()).filter(Boolean);
          const nextUrls = existing.map((u) => (u === instantObjUrl ? res.url : u));
          const targetIdx = existing.findIndex((u) => u === instantObjUrl);
          if (targetIdx !== -1) {
            setSelectedIdx(targetIdx);
          }
          return nextUrls.join(", ");
        });
      }
    } catch (err) {
      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      delete fileNamesRef.current[instantObjUrl];

      setMediaUrl((prev) => {
        const existing = (prev || "").split(",").map((s) => s.trim()).filter(Boolean);
        return existing.filter((u) => u !== instantObjUrl).join(", ");
      });
      setMediaError(err.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (indexToRemove) => {
    setMediaUrl((prev) => {
      const urls = (prev || "").split(",").map((s) => s.trim()).filter(Boolean);
      const removedUrl = urls[indexToRemove];
      if (removedUrl && removedUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(removedUrl); } catch {}
      }
      delete fileNamesRef.current[removedUrl];
      const nextUrls = urls.filter((_, idx) => idx !== indexToRemove);
      setSelectedIdx((p) => Math.max(0, Math.min(p, nextUrls.length - 1)));
      return nextUrls.join(", ");
    });
  };

  const handleClearAll = () => {
    const urls = (mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
    urls.forEach((u) => {
      if (u && u.startsWith("blob:")) {
        try { URL.revokeObjectURL(u); } catch {}
      }
      delete fileNamesRef.current[u];
    });
    setSelectedIdx(0);
    setMediaUrl("");
  };

  return {
    fileInputRef,
    fileNamesRef,
    selectedIdx,
    setSelectedIdx,
    mediaUrl,
    setMediaUrl,
    isUploadingMedia,
    setIsUploadingMedia,
    mediaError,
    setMediaError,
    handleMediaUpload,
    handleRemoveMedia,
    handleClearAll,
    getDisplayFilename,
  };
}

