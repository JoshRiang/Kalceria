"use client";

import { useRef, useState, useEffect } from "react";
import { uploadBlobMedia } from "@/lib/api";
import {
  formatMediaDisplayName,
  normalizeUploadErrorMessage,
  validateMediaUploadFile,
} from "@/lib/mediaUploadHelpers";
import { inferIsVideoMediaUrl } from "../../eventPopup/popupMediaMetadata";
import { MediaDropzoneBox } from "@/components/ui/MediaDropzoneBox";

export function BroadcastMediaSection({
  mediaUrl = "",
  setMediaUrl,
  isModalDark,
  busy,
  isUploadingMedia,
  setIsUploadingMedia,
}) {
  const fileInputRef = useRef(null);
  const fileNamesRef = useRef({});
  const videoUrlsRef = useRef(new Set());
  const uploadGenRef = useRef(0);
  const latestMediaUrlRef = useRef(mediaUrl || "");
  latestMediaUrlRef.current = mediaUrl || "";

  const [uploadError, setUploadError] = useState("");

  // Clean up any active local blob preview URL on unmount
  useEffect(() => {
    return () => {
      uploadGenRef.current += 1;
      const cur = latestMediaUrlRef.current;
      if (cur && cur.startsWith("blob:")) {
        try { URL.revokeObjectURL(cur); } catch {}
      }
    };
  }, []);

  const handleMediaFiles = async (rawFiles) => {
    const file = Array.from(rawFiles || []).find(Boolean);
    if (!file) return;

    const validation = validateMediaUploadFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const gen = ++uploadGenRef.current;
    const prevUrl = latestMediaUrlRef.current;
    if (prevUrl && prevUrl.startsWith("blob:")) {
      try { URL.revokeObjectURL(prevUrl); } catch {}
    }

    // Instant 0ms latency local preview
    const instantObjUrl = URL.createObjectURL(file);
    fileNamesRef.current[instantObjUrl] = file.name;
    if (validation.isVideo) videoUrlsRef.current.add(instantObjUrl);
    setMediaUrl(instantObjUrl);

    setIsUploadingMedia(true);
    setUploadError("");

    try {
      const res = await uploadBlobMedia(file, { purpose: "event-clip" });
      if (gen !== uploadGenRef.current) {
        try { URL.revokeObjectURL(instantObjUrl); } catch {}
        videoUrlsRef.current.delete(instantObjUrl);
        return;
      }
      if (!res?.url) throw new Error("Upload gagal mengembalikan URL media.");
      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      delete fileNamesRef.current[instantObjUrl];
      fileNamesRef.current[res.url] = file.name;
      if (validation.isVideo) {
        videoUrlsRef.current.delete(instantObjUrl);
        videoUrlsRef.current.add(res.url);
      }
      setMediaUrl(res.url);
    } catch (err) {
      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      delete fileNamesRef.current[instantObjUrl];
      videoUrlsRef.current.delete(instantObjUrl);
      if (gen !== uploadGenRef.current) return;

      setMediaUrl("");
      setUploadError(normalizeUploadErrorMessage(err));
    } finally {
      if (gen === uploadGenRef.current) {
        setIsUploadingMedia(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    uploadGenRef.current += 1;
    if (mediaUrl && mediaUrl.startsWith("blob:")) {
      try { URL.revokeObjectURL(mediaUrl); } catch {}
    }
    delete fileNamesRef.current[mediaUrl];
    videoUrlsRef.current.delete(mediaUrl);
    setMediaUrl("");
    setIsUploadingMedia(false);
    setUploadError("");
  };

  const hasMedia = Boolean(mediaUrl && mediaUrl.trim());
  const displayFilename = hasMedia ? formatMediaDisplayName(mediaUrl, fileNamesRef.current) : "";
  const isVideo = hasMedia && (videoUrlsRef.current.has(mediaUrl) || inferIsVideoMediaUrl(mediaUrl));

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-center justify-between">
        <label
          className={`text-xs font-semibold tracking-wider flex items-center gap-1.5 ${
            isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
            aria-hidden="true"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Live Media Feed
        </label>
        {hasMedia && (
          <button
            type="button"
            onClick={handleClear}
            className={`text-[11px] sm:text-xs font-semibold tracking-wider hover:underline cursor-pointer select-none transition-colors ${
              isModalDark ? "text-[#f85149]" : "text-[#cf222e]"
            }`}
          >
            Clear All
          </button>
        )}
      </div>

      <MediaDropzoneBox
        fileInputRef={fileInputRef}
        theme={isModalDark ? "dark" : "light"}
        multiple={false}
        disabled={busy}
        isUploading={isUploadingMedia}
        error={uploadError}
        onFilesSelected={handleMediaFiles}
        items={
          hasMedia
            ? [
                {
                  key: mediaUrl,
                  url: mediaUrl,
                  isVideo,
                  label: displayFilename || "Broadcast Media",
                },
              ]
            : []
        }
        selectedIdx={0}
        onRemoveItem={handleClear}
        mediaTypeLabel="Photo/Video"
        maxSizeLabel="Max 10 MB"
      />
    </div>
  );
}
