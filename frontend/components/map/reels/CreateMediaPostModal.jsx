"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uploadBlobMedia, createReelsPost } from "@/lib/api";
import {
  POST_FORM_BG_DARK,
  POST_FORM_BG_LIGHT,
  getInstantMapBgUrl,
} from "@/lib/mapBgCache";
import { LocationAutocomplete } from "@/components/service-request/LocationAutocomplete";
import { ActionArcSpinner } from "../modals/ActionArcSpinner";
import { MODAL_GENIE_BACKDROP, MODAL_GENIE_SURFACE } from "../modals/modalMotion";
import { REELS_CATEGORY_TABS } from "./reelsHelpers";

const MAX_CAPTION_CHARS = 240;

function formatMB(bytes) {
  return `${(Number(bytes || 0) / (1024 * 1024)).toFixed(2)} MB`;
}

export function CreateMediaPostModal({
  isOpen,
  isMapDark,
  defaultCategory = "cafe",
  activeOwnEvent = null,
  onClose,
  onPosted,
}) {
  const [category, setCategory] = useState(defaultCategory || "cafe");
  const [visibility, setVisibility] = useState("private"); // default private
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState(activeOwnEvent?.location || "");
  const [coords, setCoords] = useState({
    lat: activeOwnEvent?.lat ?? null,
    lng: activeOwnEvent?.lng ?? null,
  });
  const [isLocVerified, setIsLocVerified] = useState(Boolean(activeOwnEvent?.location));
  const [mediaState, setMediaState] = useState(null); // { url, thumbnailUrl, mediaType, width, height, duration, compressionStats }
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen && defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const isVid = String(file.type || "").startsWith("video/");
      const res = await uploadBlobMedia(file, {
        purpose: "media",
        includeThumbnail: true,
      });
      if (!res?.url) throw new Error("Upload failed.");
      setMediaState({
        url: res.url,
        thumbnailUrl: res.thumbnailUrl || (isVid ? null : res.url),
        mediaType: isVid ? "video" : "photo",
        width: res.width || null,
        height: res.height || null,
        duration: res.duration || null,
        compressionStats: res.compressionStats || null,
      });
    } catch (err) {
      setError(err?.message || "Gagal memproses & mengunggah media.");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaState?.url || isUploading || isPosting) return;
    setIsPosting(true);
    setError("");
    try {
      await createReelsPost({
        eventId: activeOwnEvent?.id || null,
        category,
        visibility,
        mediaUrl: mediaState.url,
        thumbnailUrl: mediaState.thumbnailUrl,
        mediaType: mediaState.mediaType,
        width: mediaState.width,
        height: mediaState.height,
        durationSec: mediaState.duration,
        caption: caption.trim().slice(0, MAX_CAPTION_CHARS),
        location: location.trim() || null,
        lat: coords.lat,
        lng: coords.lng,
      });
      setCaption("");
      setMediaState(null);
      onPosted?.({ category, visibility });
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Gagal mempublikasikan postingan.");
    } finally {
      setIsPosting(false);
    }
  };

  const bgUrl = getInstantMapBgUrl(isMapDark ? POST_FORM_BG_DARK : POST_FORM_BG_LIGHT);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="create-post-backdrop"
          {...MODAL_GENIE_BACKDROP}
          className="fixed inset-0 z-[2100] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm select-none"
          onClick={onClose}
        >
          <motion.div
            key="create-post-surface"
            {...MODAL_GENIE_SURFACE}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-[440px] max-h-[92dvh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden border ${
              isMapDark
                ? "bg-[#0d1018] border-[#30363d] text-white"
                : "bg-white border-[#d0d7de] text-[#1f2328]"
            }`}
          >
            {/* Blue-Magenta Single-Element Texture Background */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: `url("${bgUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: isMapDark ? 0.85 : 0.92,
              }}
            />

            {/* Header */}
            <div
              className={`relative z-10 px-5 py-3.5 flex items-center justify-between border-b shrink-0 ${
                isMapDark ? "bg-[#0d1018]/90 border-white/10" : "bg-white/90 border-black/10"
              }`}
            >
              <h2 className="font-bold text-base tracking-tight">New Reel / Post</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-2xl leading-none px-1 cursor-pointer opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative z-10 p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col gap-3.5 modern-kalcerian-scrollbar"
            >
              {/* 1. Smart Compressed Media Picker (NO 10 MB cap; Max 90s Video Duration) */}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {mediaState?.url ? (
                  <div className={`relative rounded-2xl overflow-hidden border bg-black ${isMapDark ? "border-white/20" : "border-black/20"}`}>
                    {mediaState.mediaType === "video" ? (
                      <video src={mediaState.url} controls playsInline className="w-full max-h-56 object-contain" />
                    ) : (
                      <img src={mediaState.url} alt="Post preview" className="w-full max-h-56 object-contain" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaState(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 text-white text-sm font-bold cursor-pointer"
                      title="Remove media"
                    >
                      ×
                    </button>
                    {mediaState.compressionStats?.reductionPercent > 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/75 text-emerald-300 text-[10px] font-semibold">
                        Compressed {formatMB(mediaState.compressionStats.originalBytes)} → {formatMB(mediaState.compressionStats.compressedBytes)} (-{mediaState.compressionStats.reductionPercent}%)
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileRef.current?.click()}
                    className={`w-full py-7 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      isMapDark
                        ? "border-white/25 bg-black/35 hover:border-white/55 text-white"
                        : "border-black/25 bg-white/75 hover:border-black/55 text-black"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <ActionArcSpinner className="w-5 h-5" label="Compressing & uploading" />
                        <span className="text-xs font-semibold mt-1">Compressing & uploading HD media...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-light">+</span>
                        <span className="text-xs font-bold">Select Photo or Video</span>
                        <span className="text-[10.5px] opacity-65">Auto lossless-perceptual compression · Video max 90s</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 2. 5-Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {REELS_CATEGORY_TABS.map((tab) => {
                    const active = category === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCategory(tab.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          active
                            ? isMapDark
                              ? "bg-white text-black border-white"
                              : "bg-black text-white border-black"
                            : isMapDark
                            ? "bg-black/40 text-white/80 border-white/20"
                            : "bg-white/80 text-black/80 border-black/20"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Visibility Toggle (Default Private / Friends vs Public / Global) */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  isMapDark
                    ? "border-white/15 bg-black/35"
                    : "border-black/15 bg-white/75"
                }`}
              >
                <div>
                  <p className="text-xs font-bold">
                    {visibility === "public" ? "Public Post (Global)" : "Private Post (Friends Only)"}
                  </p>
                  <p className="text-[10px] opacity-65">
                    {visibility === "public" ? "Visible in Global & Friends Reels" : "Visible only to mutual Friends"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={visibility === "public"}
                  onClick={() => setVisibility((v) => (v === "public" ? "private" : "public"))}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 flex items-center ${
                    visibility === "public"
                      ? "bg-gradient-to-r from-[#2563eb] to-[#ec4899]"
                      : isMapDark
                      ? "bg-white/20"
                      : "bg-black/20"
                  }`}
                >
                  <span
                    className={`block w-[18px] h-[18px] rounded-full bg-white shadow transform transition-transform ${
                      visibility === "public" ? "translate-x-[22px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>

              {/* 4. Location Autocomplete */}
              <div>
                <LocationAutocomplete
                  value={location}
                  onChange={(loc, item) => {
                    setLocation(loc);
                    if (item) {
                      setCoords({
                        lat: item?.lat || item?.latitude || coords.lat,
                        lng: item?.lon || item?.lng || item?.longitude || coords.lng,
                      });
                    }
                  }}
                  isVerified={isLocVerified}
                  setIsVerified={setIsLocVerified}
                  initialVerified={Boolean(location)}
                  required={false}
                  isModalDark={isMapDark}
                  label="Location (optional)"
                  hideCheckmark={true}
                />
              </div>

              {/* 5. Caption with Live 0/240 Counter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold">Caption</label>
                  <span className={`text-[10.5px] ${caption.length >= MAX_CAPTION_CHARS ? "text-red-500 font-bold" : "opacity-60"}`}>
                    {caption.length}/{MAX_CAPTION_CHARS}
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={MAX_CAPTION_CHARS}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_CHARS))}
                  placeholder="Write a caption for your moment..."
                  className={`w-full rounded-xl border px-3 py-2 text-xs outline-none resize-none ${
                    isMapDark
                      ? "bg-black/50 border-white/20 text-white placeholder:text-white/40"
                      : "bg-white/90 border-black/20 text-black placeholder:text-black/40"
                  }`}
                />
              </div>

              {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

              <button
                type="submit"
                disabled={!mediaState?.url || isUploading || isPosting}
                className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-transform active:scale-95 disabled:opacity-40 ${
                  isMapDark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                {isPosting ? "Publishing..." : "Share Post"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
