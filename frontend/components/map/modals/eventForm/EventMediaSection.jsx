"use client";

import { useRef, useState, useEffect } from "react";
import { uploadBlobMedia } from "@/lib/api";
import { splitMediaUrlListClient } from "@/lib/urlSecurity";
import {
  formatMediaDisplayName,
  normalizeUploadErrorMessage,
  validateMediaUploadFile,
} from "@/lib/mediaUploadHelpers";
import {
  inferIsVideoMediaUrl,
  probeMediaFileMetadata,
} from "../../eventPopup/popupMediaMetadata";
import { MediaDropzoneBox } from "@/components/ui/MediaDropzoneBox";

export function EventMediaSection({
  eventForm,
  setEventForm,
  isModalDark,
  busy,
  isUploadingMedia: externalIsUploading,
  setIsUploadingMedia: externalSetIsUploading,
}) {
  const fileInputRef = useRef(null);
  const fileNamesRef = useRef({});
  const activeUploadsRef = useRef(0);
  const latestMediaUrlRef = useRef(eventForm.mediaUrl || "");
  latestMediaUrlRef.current = eventForm.mediaUrl || "";

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [localIsUploadingMedia, setLocalIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const isUploadingMedia =
    externalIsUploading !== undefined ? externalIsUploading : localIsUploadingMedia;
  const setIsUploadingMedia = externalSetIsUploading || setLocalIsUploadingMedia;

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

  const uploadSingleMediaFile = async (file, validation) => {
    const isVideoFile = validation.isVideo;
    const instantObjUrl = URL.createObjectURL(file);
    fileNamesRef.current[instantObjUrl] = file.name;

    const insertedIdx = splitMediaUrlListClient(latestMediaUrlRef.current || "").length;
    setEventForm((f) => {
      const existingUrls = splitMediaUrlListClient(f.mediaUrl || "");
      const nextMeta = { ...(f.mediaMetadataByUrl || {}), [instantObjUrl]: { isVideo: isVideoFile } };
      return {
        ...f,
        mediaUrl: [...existingUrls, instantObjUrl].join(", "),
        mediaMetadataByUrl: nextMeta,
      };
    });
    setSelectedIdx(insertedIdx);

    activeUploadsRef.current += 1;
    setIsUploadingMedia(true);
    try {
      // Probe intrinsic dimensions in parallel with upload to cut waiting time
      const [meta, res] = await Promise.all([
        probeMediaFileMetadata(file).catch(() => ({ width: null, height: null, duration: null })),
        uploadBlobMedia(file, { purpose: "event-clip" }),
      ]);
      if (!res?.url) throw new Error("Upload gagal mengembalikan URL media.");

      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      fileNamesRef.current[res.url] = file.name;
      delete fileNamesRef.current[instantObjUrl];

      const optDims = res.optimization?.dimensions || null;
      const mergedMeta = {
        width: meta?.width || optDims?.width || null,
        height: meta?.height || optDims?.height || null,
        duration: meta?.duration || null,
        isVideo: isVideoFile,
      };

      const latestList = splitMediaUrlListClient(latestMediaUrlRef.current || "");
      const replacedIdx = latestList.findIndex((u) => u === instantObjUrl);

      setEventForm((f) => {
        const existingUrls = splitMediaUrlListClient(f.mediaUrl || "");
        const nextUrls = existingUrls.map((u) => (u === instantObjUrl ? res.url : u)).join(", ");
        const nextMeta = { ...(f.mediaMetadataByUrl || {}) };
        delete nextMeta[instantObjUrl];
        nextMeta[res.url] = mergedMeta;
        return { ...f, mediaUrl: nextUrls, mediaMetadataByUrl: nextMeta };
      });
      if (replacedIdx !== -1) setSelectedIdx(replacedIdx);
    } catch (err) {
      try { URL.revokeObjectURL(instantObjUrl); } catch {}
      delete fileNamesRef.current[instantObjUrl];

      const remainingCount = splitMediaUrlListClient(latestMediaUrlRef.current || "").filter(
        (u) => u !== instantObjUrl
      ).length;
      setEventForm((f) => {
        const existingUrls = splitMediaUrlListClient(f.mediaUrl || "");
        const nextMeta = { ...(f.mediaMetadataByUrl || {}) };
        delete nextMeta[instantObjUrl];
        return {
          ...f,
          mediaUrl: existingUrls.filter((u) => u !== instantObjUrl).join(", "),
          mediaMetadataByUrl: nextMeta,
        };
      });
      setSelectedIdx((prev) => Math.max(0, Math.min(prev, remainingCount - 1)));
      setUploadError(normalizeUploadErrorMessage(err));
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

    setUploadError(firstError);
    if (validPairs.length === 0) return;

    await Promise.allSettled(
      validPairs.map(({ file, validation }) => uploadSingleMediaFile(file, validation))
    );
  };

  const handleRemoveCarouselMedia = (indexToRemove) => {
    const currentUrls = splitMediaUrlListClient(eventForm.mediaUrl || "");
    const nextLength = Math.max(0, currentUrls.length - 1);

    setEventForm((f) => {
      const urls = splitMediaUrlListClient(f.mediaUrl || "");
      const removedUrl = urls[indexToRemove];
      if (removedUrl && removedUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(removedUrl); } catch {}
      }
      delete fileNamesRef.current[removedUrl];

      const updated = urls.filter((_, idx) => idx !== indexToRemove).join(", ");
      const nextMeta = { ...(f.mediaMetadataByUrl || {}) };
      if (removedUrl && nextMeta[removedUrl]) {
        delete nextMeta[removedUrl];
      }
      return { ...f, mediaUrl: updated, mediaMetadataByUrl: nextMeta };
    });
    setSelectedIdx((prev) => Math.max(0, Math.min(prev, nextLength - 1)));
  };

  const handleClearAll = () => {
    parsedUrls.forEach((u) => {
      if (u && u.startsWith("blob:")) {
        try { URL.revokeObjectURL(u); } catch {}
      }
      delete fileNamesRef.current[u];
    });
    setSelectedIdx(0);
    setUploadError("");
    setEventForm((f) => ({ ...f, mediaUrl: "", mediaMetadataByUrl: {} }));
  };

  const parsedUrls = splitMediaUrlListClient(eventForm.mediaUrl || "");
  const getDisplayFilename = (url) => formatMediaDisplayName(url, fileNamesRef.current);
  const activeIdx = Math.min(selectedIdx, Math.max(0, parsedUrls.length - 1));

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-center justify-between">
        <label
          className={`text-[11px] sm:text-xs font-semibold tracking-wider flex items-center gap-1.5 ${
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
          Live Media Feed {parsedUrls.length > 1 ? `(${parsedUrls.length} clips)` : ""}
        </label>
        {parsedUrls.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
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
        disabled={busy}
        isUploading={isUploadingMedia}
        error={uploadError}
        onFilesSelected={handleMediaFiles}
        promptText="Drag & drop or choose photo / video (max 4.5 MB)"
      />

      {parsedUrls.length > 0 && (
        <div
          className={`mt-1.5 p-2.5 rounded-2xl border-2 border-dashed flex flex-col gap-1.5 ${
            isModalDark ? "border-[#30363d] bg-[#0d1117]/60" : "border-[#d0d7de] bg-[#f6f8fa]/80"
          }`}
        >
          <div className="flex items-center gap-3 overflow-x-auto py-1.5 px-1 custom-scrollbar">
            {parsedUrls.map((url, idx) => {
              const isVideo = inferIsVideoMediaUrl(url, eventForm.mediaMetadataByUrl?.[url]);
              const isSelected = idx === activeIdx;
              const label = getDisplayFilename(url);
              return (
                <div
                  key={`${idx}-${url.slice(0, 32)}`}
                  onClick={() => setSelectedIdx(idx)}
                  title={`Pilih klip: ${label}`}
                  className={`relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-xl overflow-hidden shadow-sm transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? isModalDark
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black/80 shadow-white/10 shadow-lg z-10 opacity-100"
                        : "ring-2 ring-black ring-offset-2 ring-offset-white shadow-black/10 shadow-lg z-10 opacity-100"
                      : isModalDark
                        ? "opacity-75 hover:opacity-100 border border-white/20"
                        : "opacity-75 hover:opacity-100 border border-black/20"
                  }`}
                >
                  {isVideo ? (
                    <video
                      src={url}
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={label || `Media ${idx + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCarouselMedia(idx);
                    }}
                    aria-label={`Remove ${label || `media ${idx + 1}`}`}
                    title="Remove this media"
                    className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-white text-black shadow-md flex items-center justify-center text-xs font-bold hover:bg-neutral-200 transition-colors cursor-pointer border border-black/15 leading-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
