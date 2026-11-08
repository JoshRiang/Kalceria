"use client";

import { useRef, useState } from "react";
import { uploadBlobMedia } from "@/lib/api";
import {
  splitMediaUrlListClient,
  validateAndNormalizeMediaUrlClient,
} from "@/lib/urlSecurity";
import {
  inferIsVideoMediaUrl,
  probeMediaFileMetadata,
} from "../../eventPopup/popupMediaMetadata";
import { ActionArcSpinner } from "../ActionArcSpinner";

export function EventMediaSection({
  eventForm,
  setEventForm,
  isModalDark,
  busy,
  isOwner,
}) {
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp", "mp4", "webm"].includes(ext)) {
      setUploadError("Only .png, .jpeg, .webp, .mp4, and .webm files are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploadingMedia(true);
    setUploadError("");
    try {
      const meta = await probeMediaFileMetadata(file).catch(() => ({
        width: null,
        height: null,
        duration: null,
      }));
      const res = await uploadBlobMedia(file);
      if (res?.url) {
        setEventForm((f) => {
          const existingUrls = splitMediaUrlListClient(f.mediaUrl || "");
          const nextUrls = [...existingUrls, res.url].join(", ");
          const nextMeta = { ...(f.mediaMetadataByUrl || {}) };
          if (meta.width || meta.height || meta.duration) {
            nextMeta[res.url] = meta;
          }
          return { ...f, mediaUrl: nextUrls, mediaMetadataByUrl: nextMeta };
        });
      }
    } catch (err) {
      setUploadError(err.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCarouselMedia = (indexToRemove) => {
    setEventForm((f) => {
      const urls = splitMediaUrlListClient(f.mediaUrl || "");
      const removedUrl = urls[indexToRemove];
      const updated = urls.filter((_, idx) => idx !== indexToRemove).join(", ");
      const nextMeta = { ...(f.mediaMetadataByUrl || {}) };
      if (removedUrl && nextMeta[removedUrl]) {
        delete nextMeta[removedUrl];
      }
      return { ...f, mediaUrl: updated, mediaMetadataByUrl: nextMeta };
    });
  };

  const parsedUrls = splitMediaUrlListClient(eventForm.mediaUrl || "");

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
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Live Media Feed {parsedUrls.length > 1 ? `(${parsedUrls.length} clips)` : ""}
        </label>
        {parsedUrls.length > 0 && (
          <button
            type="button"
            onClick={() => setEventForm((f) => ({ ...f, mediaUrl: "", mediaMetadataByUrl: {} }))}
            className={`text-[10px] font-bold hover:underline cursor-pointer ${
              isModalDark ? "text-[#f85149]" : "text-[#cf222e]"
            }`}
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className={`flex-1 border rounded-lg p-2 sm:p-2.5 text-xs outline-none transition-all ${
            isModalDark
              ? "bg-[#0d1117] border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff]"
              : "bg-[#f6f8fa] border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da]"
          }`}
          value={eventForm.mediaUrl || ""}
          onChange={(e) => {
            setEventForm((f) => ({ ...f, mediaUrl: e.target.value }));
            setUploadError("");
          }}
          onBlur={() => {
            const raw = (eventForm.mediaUrl || "").trim();
            if (raw) {
              const check = validateAndNormalizeMediaUrlClient(raw);
              if (!check.valid) {
                setUploadError(check.error || "Format URL media tidak valid.");
              } else if (check.normalized && check.normalized !== eventForm.mediaUrl) {
                setEventForm((f) => ({ ...f, mediaUrl: check.normalized }));
              }
            }
          }}
          placeholder="Paste Video / GIF URL or choose file"
        />
        <input
          type="file"
          ref={fileInputRef}
          accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,image/png,image/jpeg,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={handleMediaUpload}
        />
        <button
          type="button"
          disabled={isUploadingMedia || busy}
          onClick={() => fileInputRef.current?.click()}
          aria-label={isUploadingMedia ? "Uploading media" : "Upload media"}
          className={`px-3 py-2 min-w-[82px] border rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer disabled:opacity-60 ${
            isModalDark
              ? "border-[#30363d] bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d]"
              : "border-[#d0d7de] bg-[#eaeef2] text-[#1f2328] hover:bg-[#d0d7de]"
          }`}
        >
          {isUploadingMedia ? (
            <ActionArcSpinner className="w-3.5 h-3.5" label="Uploading media" />
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      {uploadError && (
        <p
          style={{ fontFamily: "Consolas, monospace" }}
          className={`text-xs font-normal mt-1 animate-in fade-in leading-relaxed ${
            isModalDark ? "text-[#ff4d4f]" : "text-[#cf222e]"
          }`}
        >
          {uploadError}
        </p>
      )}

      {isOwner && parsedUrls.length > 0 && (
        <div
          className={`mt-2 p-2.5 rounded-2xl border-2 border-dashed flex flex-col gap-1.5 ${
            isModalDark ? "border-[#30363d] bg-[#0d1117]/60" : "border-[#d0d7de] bg-[#f6f8fa]/80"
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 custom-scrollbar">
            {parsedUrls.map((url, idx) => {
              const isVideo = inferIsVideoMediaUrl(url);
              return (
                <div
                  key={`${idx}-${url.slice(0, 32)}`}
                  className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-xl overflow-hidden shadow-sm border border-black/10 dark:border-white/10 group"
                >
                  {isVideo ? (
                    <video
                      src={url}
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveCarouselMedia(idx)}
                    title="Remove this media"
                    className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-white text-black shadow-md flex items-center justify-center text-xs font-bold hover:scale-110 active:scale-90 transition-transform cursor-pointer border border-black/15 leading-none"
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
