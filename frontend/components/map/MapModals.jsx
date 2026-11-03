"use client";

import { memo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userPopup } from "@/components/map/UserPopup";
import { uploadBlobMedia } from "@/lib/api";

const EVENT_CATEGORIES_GRID = [
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
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")}>
        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-7v8h2.5V22H21V2c-2.76 0-5 2.24-5 5z" />
      </svg>
    ),
  },
  {
    id: "special",
    label: "Something Special",
    renderIcon: (isSelected, isModalDark) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isSelected ? (isModalDark ? "#ffffff" : "#000000") : (isModalDark ? "#8b949e" : "#57606a")}>
        <path d="M10.8 3h2.4l-.65 11h-1.1L10.8 3zM12 17.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z" />
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

const RANDOM_INNER_COLORS = [
  { bg: "#3b82f6", lightBg: "rgba(59, 130, 246, 0.20)", darkBg: "rgba(37, 99, 235, 0.38)", border: "#2563eb" }, // Blue
  { bg: "#10b981", lightBg: "rgba(16, 185, 129, 0.20)", darkBg: "rgba(5, 150, 105, 0.38)", border: "#059669" }, // Emerald
  { bg: "#f59e0b", lightBg: "rgba(245, 158, 11, 0.22)", darkBg: "rgba(217, 119, 6, 0.38)", border: "#d97706" }, // Amber
  { bg: "#8b5cf6", lightBg: "rgba(139, 92, 246, 0.20)", darkBg: "rgba(124, 58, 237, 0.38)", border: "#7c3aed" }, // Violet
  { bg: "#ec4899", lightBg: "rgba(236, 72, 153, 0.20)", darkBg: "rgba(219, 39, 119, 0.38)", border: "#db2777" }, // Pink
  { bg: "#06b6d4", lightBg: "rgba(6, 182, 212, 0.20)", darkBg: "rgba(8, 145, 178, 0.38)", border: "#0891b2" }, // Cyan
  { bg: "#f97316", lightBg: "rgba(249, 115, 22, 0.22)", darkBg: "rgba(234, 88, 12, 0.38)", border: "#ea580c" }, // Orange
  { bg: "#14b8a6", lightBg: "rgba(20, 184, 166, 0.20)", darkBg: "rgba(13, 148, 136, 0.38)", border: "#0d9488" }, // Teal
];

function ConfirmationPromptModal({ show, onClose, title, highlightText, isMapDark, choice, onConfirm }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-6 select-none pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`absolute inset-0 backdrop-blur-md transition-colors duration-300 ${
          isMapDark ? "bg-black/30" : "bg-black/[0.04]"
        }`}
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -5, 0] }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ opacity: { duration: 0.25 }, scale: { duration: 0.25 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <h3
          className={`relative z-10 text-2xl sm:text-3xl md:text-4xl font-sans font-bold mb-8 sm:mb-10 tracking-tighter ${
            isMapDark ? "text-white" : "text-black"
          }`}
          style={{ textShadow: isMapDark ? "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)" : "0 2px 14px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.9)" }}
        >
          {title}
          {highlightText && <span className="text-[#ef4444] font-bold">{highlightText}</span>}
          ?
        </h3>
        <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16">
          <button type="button" onClick={onConfirm} className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-2">
            <motion.span animate={choice === "yes" ? { scale: 1.25 } : {}} transition={{ duration: 0.2 }} className={`block font-sans text-xl sm:text-2xl font-normal transition-all duration-200 group-hover:scale-110 active:scale-95 ${isMapDark ? "text-white/80 group-hover:text-white" : "text-black/80 group-hover:text-black"}`} style={{ textShadow: isMapDark ? "0 2px 10px rgba(0,0,0,0.8)" : "0 1px 6px rgba(255,255,255,0.9)" }}>
              Yes
            </motion.span>
          </button>
          <button type="button" onClick={onClose} className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-2">
            <motion.span animate={choice === "no" ? { scale: 1.25 } : {}} transition={{ duration: 0.2 }} className={`block font-sans text-xl sm:text-2xl font-normal transition-all duration-200 group-hover:scale-110 active:scale-95 ${isMapDark ? "text-white/80 group-hover:text-white" : "text-black/80 group-hover:text-black"}`} style={{ textShadow: isMapDark ? "0 2px 10px rgba(0,0,0,0.8)" : "0 1px 6px rgba(255,255,255,0.9)" }}>
              No
            </motion.span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export const MapModals = memo(function MapModals({
  offlineUserObj,
  setSelectedOfflineUser,
  showStatusModal,
  setShowStatusModal,
  isMapDark,
  saveBroadcast,
  statusText,
  setStatusText,
  busy,
  showEventModal,
  setShowEventModal,
  saveMiniEvent,
  eventForm,
  setEventForm,
  activeOwnEvent,
  deleteMiniEvent,
  editingEventId,
  showCancelRequestModal,
  setShowCancelRequestModal,
  cancelRequestTarget,
  handleConfirmCancelRequest,
  showRequestsModal,
  setShowRequestsModal,
  viewingRequestsEvent,
  currentRequestsList = [],
  onAcceptCollabRequest,
  onDeclineCollabRequest,
  isExiting,
  showQuitModal,
  setShowQuitModal,
  handleQuitConfirm,
  showDeleteAccountModal,
  setShowDeleteAccountModal,
  handleConfirmDeleteAccount,
}) {
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [quitChoice, setQuitChoice] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteChoice, setDeleteChoice] = useState(null);
  const [cancelChoice, setCancelChoice] = useState(null);
  const [deleteAccountChoice, setDeleteAccountChoice] = useState(null);

  // Modal colors match map mode:
  // Light mode (isMapDark === false): modal is white with black borders/elements.
  // Dark mode (isMapDark === true): modal is dark (#161b22) with white borders/elements.
  const isModalDark = Boolean(isMapDark);

  const handleQuitYesClick = () => {
    setQuitChoice("yes");
    setTimeout(() => {
      handleQuitConfirm?.();
    }, 220);
  };

  const handleQuitNoClick = () => {
    setQuitChoice("no");
    setTimeout(() => {
      setShowQuitModal(false);
      setQuitChoice(null);
    }, 160);
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    <>
      {/* Offline User Global Popup */}
      {offlineUserObj && !offlineUserObj.isOnline && (
        <div
          className="fixed inset-0 md:inset-auto md:left-[380px] md:top-1/2 md:-translate-y-1/2 z-[3000] flex items-center justify-center md:block pointer-events-auto bg-black/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none"
          onClick={() => setSelectedOfflineUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative [&>.popup-tail]:hidden shadow-2xl rounded-[16px] overflow-hidden bg-[#0a0e27]/40 backdrop-blur-3xl"
            dangerouslySetInnerHTML={{ __html: userPopup(offlineUserObj, isMapDark, true) }}
          />
        </div>
      )}

      {/* 1. Update Status Modal */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 select-none"
          onClick={() => setShowStatusModal(false)}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={`relative w-full max-w-[420px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[24px] shadow-2xl overflow-hidden transition-colors duration-300 ${
              isModalDark
                ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
                : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 relative z-10 flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-none">
              <h2
                className={`font-sans font-bold text-base sm:text-lg tracking-tight ${
                  isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                }`}
              >
                Update Status
              </h2>
              <button
                type="button"
                className={`text-2xl leading-none relative z-10 transition-colors p-1 cursor-pointer ${
                  isModalDark
                    ? "text-[#8b949e] hover:text-[#f0f6fc]"
                    : "text-[#57606a] hover:text-[#1f2328]"
                }`}
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={saveBroadcast}
              className="relative z-10 p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-4 sm:gap-5 custom-scrollbar"
            >
              <p
                className={`text-xs sm:text-sm leading-relaxed tracking-normal ${
                  isModalDark ? "text-[#8b949e]" : "text-[#57606a]"
                }`}
              >
                Share your current activity with other Kalcerians for 24h.
              </p>

              <div className="flex flex-col gap-2">
                <label
                  className={`text-xs font-semibold tracking-wider ${
                    isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                  }`}
                >
                  Broadcast
                </label>
                <textarea
                  className={`w-full border rounded-lg p-3 sm:p-4 text-xs sm:text-sm outline-none min-h-[90px] sm:min-h-[120px] transition-all resize-none ${
                    isModalDark
                      ? "bg-[#0d1117] border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                      : "bg-[#f6f8fa] border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                  }`}
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="OTW FM..."
                  autoFocus
                />
              </div>

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
                  {busy ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Create Your Own Event Modal */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-2.5 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 select-none"
          onClick={() => setShowEventModal(false)}
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
                onClick={() => setShowEventModal(false)}
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
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Nongs FM Sini"
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
                      className={`text-[10px] hover:underline cursor-pointer ${
                        isModalDark ? "text-[#f85149]" : "text-[#cf222e]"
                      }`}
                    >
                      Clear
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
                    onChange={(e) => setEventForm((f) => ({ ...f, mediaUrl: e.target.value }))}
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
                  <p className={`text-xs font-semibold mt-1 animate-in fade-in ${
                    isModalDark ? "text-[#f85149]" : "text-[#cf222e]"
                  }`}>
                    {uploadError}
                  </p>
                )}

                {/* IN OWNER SIDE ONLY: Event Media Carousel (Picture 4) with Picture 5 delete (X) badge */}
                {(editingEventId || activeOwnEvent) && (
                  <div className={`mt-2.5 p-3 rounded-2xl border-2 border-dashed flex flex-col gap-2 ${
                    isModalDark ? "border-[#30363d] bg-[#0d1117]/60" : "border-[#d0d7de] bg-[#f6f8fa]/80"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-xs tracking-tight">
                        Add more images carousel
                      </span>
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

                    {(() => {
                      const urls = (eventForm.mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
                      if (urls.length === 0) return <p className="text-[11px] text-neutral-400 py-1">No media uploaded yet.</p>;
                      return (
                        <div className="flex items-center gap-2.5 overflow-x-auto py-1 custom-scrollbar">
                          {urls.map((url, idx) => {
                            const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);
                            return (
                              <div key={idx} className="relative w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden shadow-sm border border-black/10 dark:border-white/10 group">
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
                      );
                    })()}

                    <div className="flex justify-center pt-0.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingMedia || busy}
                        className={`px-4 py-1.5 rounded-full border text-xs font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
                          isModalDark
                            ? "border-white/40 bg-white/10 hover:bg-white/20 text-white"
                            : "border-black/30 bg-black/5 hover:bg-black/10 text-black"
                        }`}
                      >
                        + Add more images
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {(editingEventId || activeOwnEvent) ? (
                <div className="flex items-center justify-between mt-auto pt-3 shrink-0 px-1">
                  {/* Left: Red Trashcan Icon Button (Full of red, with white interior lines vice-versa) */}
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={busy}
                    title="Delete Event"
                    aria-label="Delete Event"
                    className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer group flex items-center justify-center"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="w-7 h-7 sm:w-8 sm:h-8">
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
      )}

      {/* Cinematic Solid White Light Flash Layer */}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="fixed inset-0 bg-white z-[9999] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 3 Backdrop-Blurred Confirmation Modals: Quit Map, Delete Event, Remove Request */}
      <ConfirmationPromptModal
        show={showQuitModal}
        title="Quit the map?"
        isMapDark={isModalDark}
        choice={quitChoice}
        onConfirm={handleQuitYesClick}
        onClose={handleQuitNoClick}
      />

      <ConfirmationPromptModal
        show={showDeleteConfirm}
        title="Delete the Event?"
        isMapDark={isModalDark}
        choice={deleteChoice}
        onConfirm={() => {
          setDeleteChoice("yes");
          setTimeout(async () => {
            await deleteMiniEvent?.(editingEventId);
            setShowDeleteConfirm(false);
            setDeleteChoice(null);
          }, 200);
        }}
        onClose={() => {
          setDeleteChoice("no");
          setTimeout(() => {
            setShowDeleteConfirm(false);
            setDeleteChoice(null);
          }, 150);
        }}
      />

      <ConfirmationPromptModal
        show={showCancelRequestModal}
        title="Remove the request from "
        highlightText={cancelRequestTarget?.title || "this event"}
        isMapDark={isModalDark}
        choice={cancelChoice}
        onConfirm={() => {
          setCancelChoice("yes");
          setTimeout(() => {
            handleConfirmCancelRequest?.();
            setCancelChoice(null);
          }, 200);
        }}
        onClose={() => {
          setCancelChoice("no");
          setTimeout(() => {
            setShowCancelRequestModal(false);
            setCancelChoice(null);
          }, 150);
        }}
      />

      {/* Delete Account Confirmation (Quit-the-map style) */}
      <ConfirmationPromptModal
        show={showDeleteAccountModal}
        onClose={() => {
          setDeleteAccountChoice("no");
          setTimeout(() => {
            setShowDeleteAccountModal?.(false);
            setDeleteAccountChoice(null);
          }, 150);
        }}
        title="Are you sure want to "
        highlightText="Delete Account"
        isMapDark={isMapDark}
        choice={deleteAccountChoice}
        onConfirm={() => {
          setDeleteAccountChoice("yes");
          window.__kalceriaPlaySound?.("event");
          setTimeout(() => {
            handleConfirmDeleteAccount?.();
            setDeleteAccountChoice(null);
          }, 200);
        }}
      />

      {/* Collaboration Requests Modal (from the Envelope icon) */}
      <AnimatePresence>
        {showRequestsModal && (
          <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm select-none"
            onClick={() => setShowRequestsModal(false)}
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
              <div className="shrink-0 relative z-10 flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-none">
                <div className="flex flex-col">
                  <h2
                    className={`font-sans font-bold text-base sm:text-lg tracking-tight ${
                      isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                    }`}
                  >
                    Event Collab Requests
                  </h2>
                  {viewingRequestsEvent?.title && (
                    <span
                      className={`text-[11px] font-semibold mt-0.5 truncate max-w-[300px] ${
                        isModalDark ? "text-white/60" : "text-black/60"
                      }`}
                    >
                      {viewingRequestsEvent.title}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={`text-2xl leading-none relative z-10 transition-colors p-1 cursor-pointer ${
                    isModalDark
                      ? "text-[#8b949e] hover:text-[#f0f6fc]"
                      : "text-[#57606a] hover:text-[#1f2328]"
                  }`}
                  onClick={() => setShowRequestsModal(false)}
                >
                  ×
                </button>
              </div>

              {/* Inner Box with Scrollbar & Random Colors (except black/white) */}
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar flex flex-col gap-3">
                {currentRequestsList.length > 0 ? (
                  currentRequestsList.map((req, idx) => {
                    const colorScheme = RANDOM_INNER_COLORS[idx % RANDOM_INNER_COLORS.length];
                    const cardBg = isModalDark ? colorScheme.darkBg : colorScheme.lightBg;
                    return (
                      <div
                        key={req.id || idx}
                        style={{
                          background: cardBg,
                          borderColor: colorScheme.border,
                        }}
                        className="relative rounded-2xl p-3.5 sm:p-4 border-[1.5px] transition-all flex flex-col gap-2 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          {/* Top-left Tiny Profile Icon */}
                          <div className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                req.user?.profilePicture ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                  req.user?.nickname || req.user?.name || "anon"
                                )}`
                              }
                              alt={req.user?.nickname || "User"}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-[1.5px] ${
                                isModalDark ? "border-white/40" : "border-black/30"
                              }`}
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white dark:border-black rounded-full" />
                          </div>

                          {/* Requestor Info & Message */}
                          <div className="flex-1 min-w-0">
                            <p
                              style={{
                                color: isModalDark ? "#ffffff" : "#000000",
                                fontWeight: 800,
                              }}
                              className="text-xs sm:text-[13px] font-sans leading-snug break-words"
                            >
                              <strong>{req.user?.name || req.user?.nickname || "Kalcerian"}</strong> Request for Collab in <strong>{viewingRequestsEvent?.title || req.eventTitle || "Event"}</strong>
                            </p>

                            {req.message && req.message !== "Wants to collaborate on this event" && (
                              <p
                                style={{
                                  color: isModalDark ? "#ffffff" : "#000000",
                                  fontWeight: 700,
                                  opacity: 0.88,
                                }}
                                className="text-[11px] sm:text-xs font-sans italic mt-1 break-words"
                              >
                                &quot;{req.message}&quot;
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/15 dark:border-white/15">
                              <span
                                style={{
                                  color: isModalDark ? "#ffffff" : "#000000",
                                  fontWeight: 700,
                                }}
                                className="text-[10px] opacity-80 font-sans"
                              >
                                {new Date(req.createdAt || Date.now()).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              {/* Yes (Thumbs Up) and No (Thumbs Down) Buttons */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onAcceptCollabRequest?.(req.id, viewingRequestsEvent?.id)}
                                  title="Yes (Accept Collab)"
                                  style={{
                                    backgroundColor: isModalDark ? "#ffffff" : "#000000",
                                    color: isModalDark ? "#000000" : "#ffffff",
                                    borderColor: isModalDark ? "#000000" : "#ffffff",
                                  }}
                                  className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] transition-transform hover:scale-108 active:scale-95 cursor-pointer shadow-sm select-none"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                  </svg>
                                  <span className="text-[11px] font-bold font-sans">Yes</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDeclineCollabRequest?.(req.id, viewingRequestsEvent?.id)}
                                  title="No (Decline Collab)"
                                  style={{
                                    backgroundColor: isModalDark ? "#ffffff" : "#000000",
                                    color: isModalDark ? "#000000" : "#ffffff",
                                    borderColor: isModalDark ? "#000000" : "#ffffff",
                                  }}
                                  className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] transition-transform hover:scale-108 active:scale-95 cursor-pointer shadow-sm select-none"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                                  </svg>
                                  <span className="text-[11px] font-bold font-sans">No</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      background: isModalDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.12)",
                      borderColor: "#3b82f6",
                    }}
                    className="rounded-2xl p-6 text-center border-[1.5px] flex flex-col items-center justify-center gap-2"
                  >
                    <strong
                      style={{ color: isModalDark ? "#ffffff" : "#000000", fontWeight: 800 }}
                      className="text-sm font-sans"
                    >
                      No Collab Requests Yet
                    </strong>
                    <p
                      style={{ color: isModalDark ? "#ffffff" : "#000000", fontWeight: 700 }}
                      className="text-xs font-sans max-w-[260px]"
                    >
                      When fellow Kalcerians tap the Request icon on your event card, they will appear here.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});
