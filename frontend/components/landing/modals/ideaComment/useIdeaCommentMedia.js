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
  const videoUrlsRef = useRef(new Set());
  const activeUploadsRef = useRef(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mediaUrl, setMediaUrl] = useState("");
  const latestMediaUrlRef = useRef("");
  latestMediaUrlRef.current = mediaUrl || "";

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

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

  const isVideoMediaUrl = (url) =>
    Boolean(
      url &&
        (videoUrlsRef.current.has(url) ||
          /\.(mp4|webm|mov|m4v|3gp)($|\?)/i.test(url) ||
          /^data:video/i.test(url))
    );

  const uploadSingleCommentFile = async (file, validation) => {
    const instantObjUrl = URL.createObjectURL(file);
    fileNamesRef.current[instantObjUrl] = file.name;
    if (validation.isVideo) videoUrlsRef.current.add(instantObjUrl);

    const insertedIdx = splitMediaUrlListClient(latestMediaUrlRef.current || "").length;
    setMediaUrl((prev) => {
      const existing = splitMediaUrlListClient(prev || "");
      return [...existing, instantObjUrl].join(", ");
    });
    setSelectedIdx(insertedIdx);

    activeUploadsRef.current += 1;
    setIsUploadingMedia(true);
    try {
      const res = await uploadBlobMedia(file, { purpose: "comment" });
      if (!res?.url) throw new Error("Upload gagal mengembalikan URL media.");

      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      fileNamesRef.current[res.url] = file.name;
      delete fileNamesRef.current[instantObjUrl];
      if (validation.isVideo) {
        videoUrlsRef.current.delete(instantObjUrl);
        videoUrlsRef.current.add(res.url);
      }

      const targetIdx = splitMediaUrlListClient(latestMediaUrlRef.current || "").findIndex(
        (u) => u === instantObjUrl
      );
      setMediaUrl((prev) => {
        const existing = splitMediaUrlListClient(prev || "");
        return existing.map((u) => (u === instantObjUrl ? res.url : u)).join(", ");
      });
      if (targetIdx !== -1) setSelectedIdx(targetIdx);
    } catch (err) {
      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      delete fileNamesRef.current[instantObjUrl];
      videoUrlsRef.current.delete(instantObjUrl);

      const remainingCount = splitMediaUrlListClient(latestMediaUrlRef.current || "").filter(
        (u) => u !== instantObjUrl
      ).length;
      setMediaUrl((prev) => {
        const existing = splitMediaUrlListClient(prev || "");
        return existing.filter((u) => u !== instantObjUrl).join(", ");
      });
      setSelectedIdx((p) => Math.max(0, Math.min(p, remainingCount - 1)));
      setMediaError(normalizeUploadErrorMessage(err));
    } finally {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      if (activeUploadsRef.current === 0) {
        setIsUploadingMedia(false);
      }
    }
  };

  const handleMediaFiles = async (rawFiles) => {
    const files = Array.from(rawFiles || []).filter(Boolean);
    if (files.length === 0) return;

    const validPairs = [];
    let firstError = "";
    for (const file of files) {
      const validation = validateMediaUploadFile(file);
      if (!validation.valid) {
        if (!firstError) firstError = validation.error;
      } else {
        validPairs.push({ file, validation });
      }
    }

    setMediaError(firstError);
    if (validPairs.length === 0) return;

    await Promise.allSettled(
      validPairs.map(({ file, validation }) => uploadSingleCommentFile(file, validation))
    );
  };

  const handleMediaUpload = async (e) => {
    await handleMediaFiles(e?.target?.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      videoUrlsRef.current.delete(removedUrl);
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
      videoUrlsRef.current.delete(u);
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
    handleMediaFiles,
    handleMediaUpload,
    handleRemoveMedia,
    handleClearAll,
    getDisplayFilename,
    isVideoMediaUrl,
  };
}
