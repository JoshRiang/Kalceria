"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { uploadBlobMedia } from "@/lib/api";
import { validateAndNormalizeMediaUrlClient } from "@/lib/urlSecurity";
import { toSmartTitleCase } from "@/lib/titleCase";
import { LocationAutocomplete } from "@/components/service-request/LocationAutocomplete";

export const EVENT_CATEGORIES_GRID = [
  {
    id: "cafe",
    label: "Cafe Meeting",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M10 2c-.8 1.5.8 2.6 0 4.2" stroke={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M13.5 1.5c-.9 1.6.9 2.8 0 4.5" stroke={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 9.5h13c0 5-3 7.8-6.5 7.8S4 14.5 4 9.5z" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="0.75" />
        <ellipse cx="10.5" cy="9.5" rx="6" ry="1.6" fill={isModalDark ? "#000000" : "#ffffff"} stroke={isModalDark ? "#ffffff" : "#000000"} strokeWidth="0.6" />
        <path d="M5.5 11c-.2 1.8 1.2 4 2.8 4.8" stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M17 10.5c2 0 3.5 1.2 3.5 2.8s-1.5 2.8-3.5 2.8" stroke={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="10.5" cy="19.2" rx="8.5" ry="1.7" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="0.6" />
        <ellipse cx="10.5" cy="18.8" rx="6" ry="1" fill={isModalDark ? "#000000" : "#ffffff"} />
      </svg>
    ),
  },
  {
    id: "eat",
    label: "Eat Together",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 overflow-visible" fill="none">
        <path
          d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-7v8h2.5V22H21V2c-2.76 0-5 2.24-5 5z"
          fill={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")}
          stroke={isModalDark ? "#000000" : "#ffffff"}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke fill" }}
        />
      </svg>
    ),
  },
  {
    id: "special",
    label: "Something Special",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 overflow-visible" fill="none">
        <path
          d="M9.8 2.5h4.4l-.9 12h-2.6L9.8 2.5zM12 16.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"
          fill={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")}
          stroke={isModalDark ? "#000000" : "#ffffff"}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke fill" }}
        />
      </svg>
    ),
  },
  {
    id: "discuss",
    label: "Discuss More",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M9 2.5h6c1.8 0 3.2 1.2 3.2 2.8s-1.4 2.8-3.2 2.8h-1.5l-2.5 2.5v-2.5H9c-1.8 0-3.2-1.2-3.2-2.8S7.2 2.5 9 2.5z" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="0.8" />
        <circle cx="10.5" cy="5.3" r="0.7" fill={isModalDark ? "#000000" : "#ffffff"} />
        <circle cx="12" cy="5.3" r="0.7" fill={isModalDark ? "#000000" : "#ffffff"} />
        <circle cx="13.5" cy="5.3" r="0.7" fill={isModalDark ? "#000000" : "#ffffff"} />
        <circle cx="7.5" cy="13" r="2.5" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="1" />
        <path d="M3 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={isModalDark ? "#ffffff" : "#000000"} stroke={isModalDark ? "#000000" : "#ffffff"} strokeWidth="1" />
        <circle cx="16.5" cy="13" r="2.5" fill={isModalDark ? "#000000" : "#ffffff"} stroke={isModalDark ? "#ffffff" : "#000000"} strokeWidth="1.2" />
        <path d="M12 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={isModalDark ? "#000000" : "#ffffff"} stroke={isModalDark ? "#ffffff" : "#000000"} strokeWidth="1.2" />
      </svg>
    ),
  },
];

export function EventFormModal({
  show,
  onClose,
  isModalDark,
  saveMiniEvent,
  eventForm,
  setEventForm,
  activeOwnEvent,
  editingEventId,
  busy,
  onPromptDeleteConfirm,
}) {
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isLocationVerified, setIsLocationVerified] = useState(false);

  if (!show) return null;

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "mp4"].includes(ext)) {
      setUploadError("Only .png, .jpeg, and .mp4 files are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploadingMedia(true);
    setUploadError("");
    try {
      const res = await uploadBlobMedia(file);
      if (res.url) {
        setEventForm((f) => {
          const current = (f.mediaUrl || "").trim();
          const next = current ? `${current}, ${res.url}` : res.url;
          return { ...f, mediaUrl: next };
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
      const urls = (f.mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
      const updated = urls.filter((_, idx) => idx !== indexToRemove).join(", ");
      return { ...f, mediaUrl: updated };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2.5 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 select-none"
      onClick={onClose}
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className={`relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[26px] shadow-2xl overflow-hidden transition-colors duration-300 ${
          isModalDark
            ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
            : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 relative z-10 flex justify-between items-center px-4 xs:px-6 py-3.5 sm:py-4 border-none">
          <h2
            className={`font-sans font-bold text-base sm:text-lg tracking-tight ${
              isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
            }`}
          >
            {editingEventId || activeOwnEvent ? "Edit Event" : "Create Your Own Event"}
          </h2>
          <button
            type="button"
            className={`text-2xl leading-none relative z-10 p-1 transition-colors cursor-pointer ${
              isModalDark
                ? "text-[#8b949e] hover:text-[#f0f6fc]"
                : "text-[#57606a] hover:text-[#1f2328]"
            }`}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={saveMiniEvent}
          className="relative z-10 p-4 xs:p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-3 sm:gap-4 custom-scrollbar"
        >
          <p
            className={`text-xs sm:text-sm leading-relaxed tracking-normal ${
              isModalDark ? "text-[#8b949e]" : "text-[#57606a]"
            }`}
          >
            Share your current activity with other Kalcerians for 24h.
          </p>

          {/* 2x2 Category Selector */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label
              className={`text-[11px] sm:text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Category
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {EVENT_CATEGORIES_GRID.map((cat) => {
                const isSelected = (eventForm.category || "cafe") === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEventForm((f) => ({ ...f, category: cat.id }))}
                    className={`flex flex-col items-center justify-center p-2.5 xs:p-3 rounded-xl border transition-all duration-200 outline-none cursor-pointer ${
                      isSelected
                        ? isModalDark
                          ? "bg-[#21262d] border-2 border-[#ffffff] shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                          : "bg-[#f6f8fa] border-2 border-[#000000] shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                        : isModalDark
                        ? "bg-[#0d1117] border-[#30363d] hover:border-[#8b949e]"
                        : "bg-[#ffffff] border-[#d0d7de] hover:border-[#8c959f]"
                    }`}
                  >
                    <div className="transition-transform duration-200">
                      {cat.renderIcon(isSelected, isModalDark)}
                    </div>
                    <span
                      className={`text-[10px] xs:text-[11px] leading-tight text-center mt-1.5 transition-colors duration-200 ${
                        isSelected
                          ? isModalDark
                            ? "text-[#ffffff] font-bold"
                            : "text-[#000000] font-bold"
                          : isModalDark
                          ? "text-[#8b949e] font-medium"
                          : "text-[#57606a] font-medium"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Title */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label
              className={`text-[11px] sm:text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Event Title
            </label>
            <input
              className={`w-full border rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm outline-none transition-all ${
                isModalDark
                  ? "bg-[#0d1117] border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  : "bg-[#f6f8fa] border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
              }`}
              value={eventForm.title}
              onChange={(e) =>
                setEventForm((f) => ({
                  ...f,
                  title: toSmartTitleCase(e.target.value, { preserveSpaces: true }),
                }))
              }
              onBlur={() =>
                setEventForm((f) => ({
                  ...f,
                  title: toSmartTitleCase(f.title || "", { preserveSpaces: false }),
                }))
              }
              placeholder="Nongs FM Sini"
            />
          </div>

          {/* Location & Venue Segment (Modularized from LocationAutocomplete) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <LocationAutocomplete
              value={eventForm.location || ""}
              onChange={(loc, item) => {
                setEventForm((f) => ({
                  ...f,
                  location: loc,
                  lat: item?.lat || item?.latitude || f.lat,
                  lng: item?.lon || item?.lng || item?.longitude || f.lng,
                }));
              }}
              isVerified={isLocationVerified}
              setIsVerified={setIsLocationVerified}
              required={false}
              isModalDark={isModalDark}
              label="Deployment Area"
            />
          </div>

          {/* Briefing */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label
              className={`text-[11px] sm:text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Briefing
            </label>
            <textarea
              className={`w-full border rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm outline-none min-h-[75px] sm:min-h-[100px] resize-y transition-all ${
                isModalDark
                  ? "bg-[#0d1117] border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  : "bg-[#f6f8fa] border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
              }`}
              value={eventForm.description}
              onChange={(e) =>
                setEventForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Agenda details"
            />
          </div>

          {/* Video / GIF Live Feed Attachment */}
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
                Live Media Feed {eventForm.mediaUrl && eventForm.mediaUrl.includes(",") ? `(${eventForm.mediaUrl.split(",").filter((s) => s.trim()).length} clips)` : ""}
              </label>
              {eventForm.mediaUrl && (
                <button
                  type="button"
                  onClick={() => setEventForm((f) => ({ ...f, mediaUrl: "" }))}
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
                onChange={(e) => { setEventForm((f) => ({ ...f, mediaUrl: e.target.value })); setUploadError(""); }}
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
                accept=".png,.jpg,.jpeg,.mp4,image/png,image/jpeg,video/mp4"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <button
                type="button"
                disabled={isUploadingMedia || busy}
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-2 border rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isModalDark
                    ? "border-[#30363d] bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d]"
                    : "border-[#d0d7de] bg-[#eaeef2] text-[#1f2328] hover:bg-[#d0d7de]"
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {isUploadingMedia ? "Uploading..." : "Upload"}
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

            {/* IN OWNER SIDE ONLY: Event Media Thumbnails (Picture 4) with Picture 5 delete (X) badge */}
            {(editingEventId || activeOwnEvent) && (() => {
              const urls = (eventForm.mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
              if (urls.length === 0) return null;
              return (
                <div className={`mt-2 p-2.5 rounded-2xl border-2 border-dashed flex flex-col gap-1.5 ${
                  isModalDark ? "border-[#30363d] bg-[#0d1117]/60" : "border-[#d0d7de] bg-[#f6f8fa]/80"
                }`}>
                  <div className="flex items-center gap-2.5 overflow-x-auto py-1 custom-scrollbar">
                    {urls.map((url, idx) => {
                      const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);
                      return (
                        <div key={idx} className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-xl overflow-hidden shadow-sm border border-black/10 dark:border-white/10 group">
                          {isVideo ? (
                            <video src={url} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                          )}
                          {/* Picture 5: white circular button with X to remove media */}
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
              );
            })()}
          </div>

          {/* Action Buttons */}
          {(editingEventId || activeOwnEvent) ? (
            <div className="flex items-center justify-between mt-auto pt-3 shrink-0 px-1">
              {/* Left: Red Trashcan Icon Button (Full of red, with white interior lines vice-versa) */}
              <button
                type="button"
                onClick={onPromptDeleteConfirm}
                disabled={busy}
                title="Delete Event"
                aria-label="Delete Event"
                className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer group flex items-center justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M 19 6 L 18.1 19.3 C 18 20.3 17.2 21 16.2 21 H 7.8 C 6.8 21 6 20.3 5.9 19.3 L 5 6 Z"
                    fill="#ef4444"
                  />
                  <path
                    d="M 8 6 V 4 C 8 3.4 8.4 3 9 3 H 15 C 15.6 3 16 3.4 16 4 V 6 Z"
                    fill="#ef4444"
                  />
                  <path d="M 3 6 H 21" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="9.5" y1="9.5" x2="9.5" y2="17" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="14.5" y1="9.5" x2="14.5" y2="17" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="6" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </button>

              {/* Right: Box button with Update font, styled like Create button */}
              <button
                type="submit"
                disabled={busy}
                className={`px-6 py-2.5 sm:py-3 border text-xs font-bold tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                  isModalDark
                    ? "bg-[#ffffff] text-[#000000] border-[#ffffff] hover:bg-[#f0f6fc] shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
                    : "bg-[#000000] text-[#ffffff] border-[#000000] hover:bg-[#1f2328] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                }`}
              >
                {busy ? "Updating..." : "Update"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-auto pt-2 shrink-0">
              <button
                type="submit"
                className={`w-full py-3 sm:py-3.5 border text-xs font-bold tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                  isModalDark
                    ? "bg-[#ffffff] text-[#000000] border-[#ffffff] hover:bg-[#f0f6fc] shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
                    : "bg-[#000000] text-[#ffffff] border-[#000000] hover:bg-[#1f2328] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                }`}
                disabled={busy}
              >
                {busy ? "Creating..." : "Create"}
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
