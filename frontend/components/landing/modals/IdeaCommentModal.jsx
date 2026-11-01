"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api";
import { hasUserSession } from "@/lib/session";

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

  // Pre-fill active signed-in user's name if authenticated
  useEffect(() => {
    if (!hasUserSession()) return;
    let active = true;
    api.get("/users/me")
      .then((res) => {
        if (!active) return;
        const me = res.data?.user;
        if (me?.nickname || me?.name) {
          setUsername(me.nickname || me.name);
          setIdentity("User");
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (identity === "User" && !hasUserSession()) {
      setError("Please sign in to post as an Authenticated User.");
      return;
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
      const submitPromise = api.post(
        "/comments",
        {
          content: cleanContent,
          category,
          type: feedbackType,
          username: identity === "User" ? (username.trim() || "User") : "Anonymous",
          identity: identity === "User" ? "User" : "Anonymous",
        },
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

  const isFormValid = content.trim().length >= 20 && content.trim().length <= 200 && !isSubmitting;

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
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
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

      {/* Single-Part Modal Form — Styled Like Mini Event Form on Map Page */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[22px] sm:rounded-[26px] shadow-2xl overflow-hidden backdrop-blur-2xl bg-[#0a0f1a]/85 border border-white/[0.18] z-[1001]"
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
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
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

        {/* Header — Title matching Create Mini Event font */}
        <div className="shrink-0 relative z-10 flex justify-between items-center px-4 xs:px-6 py-3.5 sm:py-4 border-b border-white/[0.08]">
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
                onClick={() => {
                  if (!hasUserSession()) {
                    setError("Please sign in to post as an Authenticated User.");
                    setIdentity("Anonymous");
                    return;
                  }
                  setIdentity("User");
                  setError("");
                }}
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
                className={`text-xs ${content.trim().length < 20 ? "text-white/40" : "text-white/70"}`}
              >
                {content.length}/200
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
    </div>
  );
}
