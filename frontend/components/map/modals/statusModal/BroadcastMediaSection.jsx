"use client";

import { useRef, useState, useEffect } from "react";
import { uploadBlobMedia } from "@/lib/api";
import { inferIsVideoMediaUrl } from "../../eventPopup/popupMediaMetadata";
import { ActionArcSpinner } from "../ActionArcSpinner";

export function BroadcastMediaSection({
  mediaUrl = "",
  setMediaUrl,
  isModalDark,
  busy,
  isUploadingMedia,
  setIsUploadingMedia,
}) {
  const fileInputRef = useRef(null);
  const fileNameRef = useRef("");
  const [uploadError, setUploadError] = useState("");

  // Clean up in-memory blob URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mediaUrl && mediaUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(mediaUrl);
        } catch {}
      }
    };
  }, [mediaUrl]);

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      setUploadError("Ukuran file melebihi 4.5 MB. Maksimal ukuran file adalah 4.5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const allowed = ["png", "jpg", "jpeg", "webp", "mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm"];
    if (!allowed.includes(ext)) {
      setUploadError("Hanya file gambar (.png, .jpeg, .webp) dan video (.mp4, .mov, .webm) yang diizinkan");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Instant 0ms latency local preview
    const instantObjUrl = URL.createObjectURL(file);
    fileNameRef.current = file.name;
    setMediaUrl(instantObjUrl);

    setIsUploadingMedia(true);
    setUploadError("");

    try {
      const res = await uploadBlobMedia(file, { purpose: "event-clip" });
      if (res?.url) {
        try {
          URL.revokeObjectURL(instantObjUrl);
        } catch {}
        fileNameRef.current = file.name;
        setMediaUrl(res.url);
      }
    } catch (err) {
      try {
        URL.revokeObjectURL(instantObjUrl);
      } catch {}
      fileNameRef.current = "";
      setMediaUrl("");
      setUploadError(err.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    if (mediaUrl && mediaUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(mediaUrl);
      } catch {}
    }
    fileNameRef.current = "";
    setMediaUrl("");
    setUploadError("");
  };

  const displayFilename = fileNameRef.current || (mediaUrl ? mediaUrl.split("/").pop()?.split("?")[0] : "");
  const hasMedia = Boolean(mediaUrl && mediaUrl.trim());
  const isVideo = hasMedia && inferIsVideoMediaUrl(mediaUrl);

  return (
    <div className="flex flex-col gap-2">
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

      <div className="flex gap-2">
        <input
          type="text"
          readOnly={hasMedia}
          className={`flex-1 border rounded-lg p-2 sm:p-2.5 text-xs outline-none transition-all ${
            isModalDark
              ? "bg-[#0d1117] border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff]"
              : "bg-[#f6f8fa] border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da]"
          } ${hasMedia ? "cursor-default select-all font-mono text-[11px]" : ""}`}
          value={displayFilename}
          onChange={(e) => {
            if (!hasMedia) {
              setMediaUrl(e.target.value);
              setUploadError("");
            }
          }}
          placeholder="Upload media atau tempel link..."
        />
        <input
          type="file"
          ref={fileInputRef}
          accept=".png,.jpg,.jpeg,.webp,.mp4,.m4v,.mov,.webm,image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
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

      {hasMedia && (
        <div
          className={`mt-1.5 p-2.5 rounded-2xl border-2 border-dashed flex items-center justify-start ${
            isModalDark ? "border-[#30363d] bg-[#0d1117]/60" : "border-[#d0d7de] bg-[#f6f8fa]/80"
          }`}
        >
          <div
            title={`Media klip: ${displayFilename}`}
            className={`relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-xl overflow-hidden shadow-sm border ${
              isModalDark ? "border-white/20 bg-black" : "border-black/20 bg-black"
            }`}
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                muted
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt="Broadcast Media"
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              title="Remove this media"
              className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-white text-black shadow-md flex items-center justify-center text-xs font-bold hover:scale-110 active:scale-90 transition-transform cursor-pointer border border-black/15 leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
