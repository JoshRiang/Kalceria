"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api, { uploadBlobMedia } from "@/lib/api";
import { establishSession, hasUserSession } from "@/lib/session";
import { validateAndNormalizeMediaUrlClient } from "@/lib/urlSecurity";

const CLIP = { clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" };

const COMMENT_TYPES = [
  { id: "ADVICE", label: "Advice" },
  { id: "IDEA", label: "Idea" },
];

const CATEGORIES = [
  { id: "Event", label: "Event" },
  { id: "Web Development", label: "Web Dev" },
  { id: "Other", label: "Other" },
];

function getClientFingerprint() {
  if (typeof window === "undefined") return "";
  try {
    let tag = localStorage.getItem("kalceria_device_tag");
    if (!tag) {
      tag = "dev_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem("kalceria_device_tag", tag);
    }
    return tag;
  } catch {
    return "";
  }
}

export function IdeaCommentModal({ onClose }) {
  const [feedbackType, setFeedbackType] = useState("ADVICE");
  const [category, setCategory] = useState("Event");
  const [identity, setIdentity] = useState("Anonymous");
  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Media Attachment States (Inherited from EventFormModal)
  const fileInputRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Pre-fill active signed-in user's name if authenticated
  useEffect(() => {
    let active = true;
    api.get("/users/me")
      .then((res) => {
        if (!active) return;
        const me = res.data?.user;
        if (me) {
          establishSession(me);
          const name = me.nickname || me.name;
          if (name) {
            setUsername(name);
            setIdentity("User");
          }
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleSelectAuthenticated = async () => {
    setError("");
    if (username) {
      setIdentity("User");
      return;
    }

    try {
      const res = await api.get("/users/me");
      const me = res.data?.user;
      if (me) {
        establishSession(me);
        const name = me.nickname || me.name;
        if (name) {
          setUsername(name);
          setIdentity("User");
          return;
        }
      }
    } catch {}

    setError("Please sign in to post as an Authenticated User.");
    setIdentity("Anonymous");
  };

  // Surface-level file verification (Max 10MB, strictly PNG / JPEG / MP4)
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");

    // 1. Size check: strictly <= 10MB rejected on surface
    if (file.size > 10 * 1024 * 1024) {
      setMediaError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. MIME & Extension check: strictly PNG, JPEG, MP4
    const filename = file.name || "";
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const validExts = ["png", "jpg", "jpeg", "mp4"];
    const declaredMime = (file.type || "").toLowerCase();
    const validMimes = ["image/png", "image/jpeg", "image/pjpeg", "video/mp4"];

    if (!validExts.includes(ext) || (declaredMime && !validMimes.includes(declaredMime))) {
      setMediaError("Security enforcement: Hanya file .png, .jpeg, dan .mp4 yang diizinkan.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingMedia(true);
    try {
      const res = await uploadBlobMedia(file);
      if (res.url) {
        setMediaUrl((prev) => {
          const current = (prev || "").trim();
          return current ? `${current}, ${res.url}` : res.url;
        });
      }
    } catch (err) {
      setMediaError(err.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (indexToRemove) => {
    setMediaUrl((prev) => {
      const urls = (prev || "").split(",").map((s) => s.trim()).filter(Boolean);
      return urls.filter((_, idx) => idx !== indexToRemove).join(", ");
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (identity === "User") {
      let activeName = username;
      if (!activeName) {
        try {
          const res = await api.get("/users/me");
          const me = res.data?.user;
          if (me) {
            establishSession(me);
            activeName = me.nickname || me.name;
            if (activeName) setUsername(activeName);
          }
        } catch {}
      }

      if (!activeName && !hasUserSession()) {
        setError("Please sign in to post as an Authenticated User.");
        return;
      }
    }

    const cleanContent = content.trim();
    if (cleanContent.length < 20) {
      setError("Message must be at least 20 characters.");
      return;
    }
    if (cleanContent.length > 200) {
      setError("Message cannot exceed 200 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const clientTag = getClientFingerprint();
      const payload = {
        content: cleanContent,
        category,
        type: feedbackType,
        identity: identity === "User" ? "User" : "Anonymous",
      };
      if (identity === "User") {
        if (username?.trim()) {
          payload.username = username.trim();
        }
      } else {
        payload.username = "Anonymous";
      }
      let cleanMedia = null;
      if (mediaUrl.trim()) {
        const check = validateAndNormalizeMediaUrlClient(mediaUrl.trim());
        if (!check.valid) {
          setMediaError(check.error || "Format URL media tidak valid.");
          setIsSubmitting(false);
          return;
        }
        cleanMedia = check.normalized;
      }
      if (cleanMedia) {
        payload.mediaUrl = cleanMedia;
      }

      const submitPromise = api.post(
        "/comments",
        payload,
        {
          headers: clientTag ? { "x-client-fingerprint": clientTag } : {},
        }
      );

      const minDelay = new Promise((resolve) => setTimeout(resolve, 1100));
      await Promise.all([submitPromise, minDelay]);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit comment. Please try again.");
      setIsSubmitting(false);
    }
  };

  const isFormValid = content.trim().length > 0 && !isSubmitting && !isUploadingMedia;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isSubmitting ? onClose : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Full-screen Processing Blur Buffer Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            key="blur-submitting-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[1002] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="relative z-10 flex flex-col items-center justify-center px-4">
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mb-6 sm:mb-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeDasharray="70 200"
                      strokeLinecap="round"
                      className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                SUBMITTING COMMENT
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single-Part Modal Form — Styled Like Mini Event Form on Map Page with Chamfered CLIP Edge */}
      <AnimatePresence>
        {!isSubmitting && (
          <motion.div
            key="comment-form-modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12, transition: { duration: 0.25, ease: "easeOut" } }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl bg-[#0a0f1a]/85 border border-white/[0.18] z-[1001]"
            style={CLIP}
            onClick={(e) => e.stopPropagation()}
          >
        <style jsx>{`
          .comment-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .comment-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .comment-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
          }
          .comment-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.4);
          }
          .comment-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
          }
        `}</style>

        {/* Dynamic Distributed Blobs: 75% Black, 25% Navy Blue */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={CLIP}>
          {/* 75% Dominant Dynamic Black Blob */}
          <motion.div
            animate={{
              scale: [1, 1.15, 0.9, 1],
              x: [0, 15, -15, 0],
              y: [0, -10, 10, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[15%] -left-[15%] w-[85%] h-[85%] bg-black/95 rounded-full blur-[65px]"
          />
          {/* 25% Dynamic Navy Blue Blob */}
          <motion.div
            animate={{
              scale: [1.1, 0.95, 1.15, 1.1],
              x: [0, -12, 12, 0],
              y: [0, 12, -12, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-[20%] -right-[15%] w-[65%] h-[65%] bg-[#0e2a52]/80 rounded-full blur-[55px]"
          />
        </div>

        {/* Header — Title matching Create Mini Event font, NO divider line below */}
        <div className="shrink-0 relative z-10 flex justify-between items-center px-4 xs:px-6 py-3.5 sm:py-4 border-none">
          <h2 className="font-sans font-bold text-base sm:text-lg tracking-tight text-white">
            Speak for us
          </h2>
          <button
            type="button"
            className="text-2xl leading-none text-white/40 hover:text-white transition-all p-1 cursor-pointer focus:outline-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Error Notification — Directly Under Title (Consolas, No outer box, No X, 20% bigger font) */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 xs:px-6 pt-2 relative z-10 shrink-0 overflow-hidden"
            >
              <div 
                style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
                className="text-red-500 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none"
              >
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single Part Form Content with Clean Scrollbar */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 p-4 xs:p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-3.5 sm:gap-4 comment-scrollbar"
        >
          {/* Description Paragraph */}
          <p className="text-white/70 text-xs sm:text-sm leading-relaxed tracking-wide font-sans">
            Share your thoughts, improvements, or wild ideas directly with the team.
          </p>

          {/* Feedback Type (Advice vs Idea) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {COMMENT_TYPES.map((t) => {
                const isSelected = feedbackType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setFeedbackType(t.id); setError(""); }}
                    className={`flex items-center justify-center p-2.5 xs:p-3 rounded-xl border transition-all duration-300 outline-none cursor-pointer ${
                      isSelected
                        ? "bg-white/20 backdrop-blur-md border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.25)] ring-1 ring-white/50 text-white font-bold"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] text-white/60 font-medium"
                    }`}
                  >
                    <span className="text-xs sm:text-sm tracking-wide font-sans">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector (Event, Web Dev, Other) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCategory(c.id); setError(""); }}
                    className={`py-2 px-2 rounded-lg border text-center transition-all duration-200 outline-none cursor-pointer text-[10px] sm:text-xs font-sans ${
                      isSelected
                        ? "bg-white/25 border-white text-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identity: Anonymous vs Authenticated User */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
                Identity
              </label>
              {username && identity === "User" && (
                <span className="text-[10px] text-emerald-400 font-sans">
                  Signed in as {username}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setIdentity("Anonymous"); setError(""); }}
                className={`py-2 px-3 rounded-lg border text-center transition-all duration-200 outline-none cursor-pointer text-xs font-sans font-bold ${
                  identity === "Anonymous"
                    ? "bg-white/20 border-white text-white"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
                }`}
              >
                Anonymous
              </button>
              <button
                type="button"
                onClick={handleSelectAuthenticated}
                className={`py-2 px-1 rounded-lg border text-center transition-all duration-200 outline-none cursor-pointer text-[10px] xs:text-[11px] leading-tight font-sans font-bold tracking-tight overflow-hidden text-ellipsis whitespace-nowrap ${
                  identity === "User"
                    ? "bg-white/20 border-white text-white"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {username ? username : "Authenticated User"}
              </button>
            </div>
          </div>

          {/* Message Textarea (0/200, minimum 20 chars, Arial not bold) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans">
                Message
              </label>
              <span 
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'normal' }}
                className="text-xs text-white/70"
              >
                {content.length}/200{content.length > 0 && content.length < 20 ? " (min 20)" : ""}
              </span>
            </div>
            <textarea
              className="w-full border rounded-lg p-2.5 sm:p-3.5 text-xs sm:text-sm focus:border-slate-400 outline-none min-h-[110px] resize-y transition-all bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 font-sans"
              value={content}
              maxLength={200}
              onChange={(e) => { setContent(e.target.value.slice(0, 200)); setError(""); }}
              placeholder={feedbackType === "IDEA" ? "Describe your idea in detail (minimum 20 characters)..." : "Write your advice or feedback here (minimum 20 characters)..."}
              required
            />
          </div>

          {/* Add photos or videos segment (Inherited from edit event form in map page) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 font-sans flex items-center gap-1.5">
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
                Add photos or videos {mediaUrl && mediaUrl.includes(",") ? `(${mediaUrl.split(",").filter((s) => s.trim()).length} files)` : ""}
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => setMediaUrl("")}
                  className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border rounded-lg p-2 sm:p-2.5 text-xs outline-none transition-all bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:border-slate-400 font-sans"
                value={mediaUrl}
                onChange={(e) => { setMediaUrl(e.target.value); setMediaError(""); }}
                onBlur={() => {
                  if (mediaUrl.trim()) {
                    const check = validateAndNormalizeMediaUrlClient(mediaUrl.trim());
                    if (!check.valid) {
                      setMediaError(check.error || "Format URL media tidak valid.");
                    } else if (check.normalized && check.normalized !== mediaUrl) {
                      setMediaUrl(check.normalized);
                    }
                  }
                }}
                placeholder="Paste media URL or upload file"
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
                disabled={isUploadingMedia || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 border rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 disabled:opacity-40"
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

            {/* Surface Error Box in Consolas Red, No Outer Box */}
            {mediaError && (
              <div 
                style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
                className="text-red-500 text-[13px] sm:text-[14px] font-normal tracking-tight py-0.5 select-none"
              >
                {mediaError}
              </div>
            )}

            {/* Media Thumbnails with remove (×) button */}
            {(() => {
              const urls = (mediaUrl || "").split(",").map((s) => s.trim()).filter(Boolean);
              if (urls.length === 0) return null;
              return (
                <div className="mt-1 p-2 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 overflow-x-auto py-1 comment-scrollbar">
                    {urls.map((url, idx) => {
                      const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);
                      return (
                        <div key={idx} className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-lg overflow-hidden shadow-sm border border-white/10 group">
                          {isVideo ? (
                            <video src={url} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(idx)}
                            title="Remove this media"
                            className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-white text-black shadow-md flex items-center justify-center text-[10px] font-bold hover:scale-110 active:scale-90 transition-transform cursor-pointer border border-black/15 leading-none"
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

          {/* Submit Action Button: Arial, Not bold, Not all capital */}
          <div className="flex flex-col gap-2 mt-auto pt-2 shrink-0">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'normal', textTransform: 'none' }}
              className="w-full py-3 sm:py-3.5 backdrop-blur-md border text-sm sm:text-base rounded-xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Send Message"}
            </button>
          </div>
        </form>
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
