"use client";

import { useState, useRef, useEffect } from "react";
import { uploadBlobMedia } from "@/lib/api";
import { splitMediaUrlListClient } from "@/lib/urlSecurity";
import {
  formatMediaDisplayName,
  normalizeUploadErrorMessage,
  validateMediaUploadFile,
} from "@/lib/mediaUploadHelpers";

export function useIdeaCommentMedia() {
  const fileInputRef = useRef(null);
  const fileNamesRef = useRef({});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mediaUrl, setMediaUrl] = useState("");
  const latestMediaUrlRef = useRef("");
  latestMediaUrlRef.current = mediaUrl || "";

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Clean up any remaining in-memory blob URLs when modal unmounts
  useEffect(() => {
    return () => {
      const urls = splitMediaUrlListClient(latestMediaUrlRef.current || "");
      urls.forEach((u) => {
        if (u && u.startsWith("blob:")) {
          try { URL.revokeObjectURL(u); } catch {}
        }
      });
    };
  }, []);

  const getDisplayFilename = (url) => formatMediaDisplayName(url, fileNamesRef.current);

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");

    const validation = validateMediaUploadFile(file);
    if (!validation.valid) {
      setMediaError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Instant 0ms latency local preview
    const instantObjUrl = URL.createObjectURL(file);
    fileNamesRef.current[instantObjUrl] = file.name;
    const insertedIdx = splitMediaUrlListClient(latestMediaUrlRef.current || "").length;

    setMediaUrl((prev) => {
      const existing = splitMediaUrlListClient(prev || "");
      return [...existing, instantObjUrl].join(", ");
    });
    setSelectedIdx(insertedIdx);

    setIsUploadingMedia(true);
    try {
      const res = await uploadBlobMedia(file);
      if (res?.url) {
        try { URL.revokeObjectURL(instantObjUrl); } catch {}
        fileNamesRef.current[res.url] = file.name;
        delete fileNamesRef.current[instantObjUrl];

        const latestExisting = splitMediaUrlListClient(latestMediaUrlRef.current || "");
        const targetIdx = latestExisting.findIndex((u) => u === instantObjUrl);

        setMediaUrl((prev) => {
          const existing = splitMediaUrlListClient(prev || "");
          return existing.map((u) => (u === instantObjUrl ? res.url : u)).join(", ");
        });
        if (targetIdx !== -1) {
          setSelectedIdx(targetIdx);
        }
      }
    } catch (err) {
      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      delete fileNamesRef.current[instantObjUrl];

      const latestExisting = splitMediaUrlListClient(latestMediaUrlRef.current || "");
      const remainingCount = latestExisting.filter((u) => u !== instantObjUrl).length;

      setMediaUrl((prev) => {
        const existing = splitMediaUrlListClient(prev || "");
        return existing.filter((u) => u !== instantObjUrl).join(", ");
      });
      setSelectedIdx((p) => Math.max(0, Math.min(p, remainingCount - 1)));
      setMediaError(normalizeUploadErrorMessage(err));
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (indexToRemove) => {
    const currentUrls = splitMediaUrlListClient(mediaUrl || "");
    const nextCount = Math.max(0, currentUrls.length - 1);

    setMediaUrl((prev) => {
      const urls = splitMediaUrlListClient(prev || "");
      const removedUrl = urls[indexToRemove];
      if (removedUrl && removedUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(removedUrl); } catch {}
      }
      delete fileNamesRef.current[removedUrl];
      return urls.filter((_, idx) => idx !== indexToRemove).join(", ");
    });
    setSelectedIdx((p) => Math.max(0, Math.min(p, nextCount - 1)));
  };

  const handleClearAll = () => {
    const urls = splitMediaUrlListClient(mediaUrl || "");
    urls.forEach((u) => {
      if (u && u.startsWith("blob:")) {
        try { URL.revokeObjectURL(u); } catch {}
      }
      delete fileNamesRef.current[u];
    });
    setSelectedIdx(0);
    setMediaError("");
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

