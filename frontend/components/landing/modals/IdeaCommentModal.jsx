"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api";
import { establishSession, hasUserSession } from "@/lib/session";
import { validateAndNormalizeMediaUrlClient } from "@/lib/urlSecurity";
import { CLIP, getClientFingerprint } from "./ideaComment/constants";
import { useIdeaCommentMedia } from "./ideaComment/useIdeaCommentMedia";
import { IdeaCommentSubmittingOverlay } from "./ideaComment/IdeaCommentSubmittingOverlay";
import { IdeaCommentFormBody } from "./ideaComment/IdeaCommentFormBody";

export function IdeaCommentModal({ onClose }) {
  const [feedbackType, setFeedbackType] = useState("ADVICE");
  const [category, setCategory] = useState("Event");
  const [identity, setIdentity] = useState("Anonymous");
  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Media Attachment Hook
  const {
    fileInputRef,
    selectedIdx,
    setSelectedIdx,
    mediaUrl,
    setMediaUrl,
    isUploadingMedia,
    mediaError,
    setMediaError,
    handleMediaUpload,
    handleRemoveMedia,
    handleClearAll,
    getDisplayFilename,
  } = useIdeaCommentMedia();

  // Pre-fill active signed-in user's name if authenticated
  useEffect(() => {
    let active = true;
    api
      .get("/users/me")
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
    return () => {
      active = false;
    };
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

      const submitPromise = api.post("/comments", payload, {
        headers: clientTag ? { "x-client-fingerprint": clientTag } : {},
      });

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
        {isSubmitting && <IdeaCommentSubmittingOverlay />}
      </AnimatePresence>

      {/* Single-Part Modal Form with Chamfered CLIP Edge */}
      <AnimatePresence>
        {!isSubmitting && (
          <motion.div
            key="comment-form-modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.92,
              y: 12,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl bg-[#0a0f1a]/85 border border-white/[0.18] z-[1001]"
            style={{ ...CLIP, colorScheme: "dark" }}
            onClick={(e) => e.stopPropagation()}
          >
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

            {/* Header */}
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

            {/* Error Notification */}
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

            {/* Form Content */}
            <IdeaCommentFormBody
              handleSubmit={handleSubmit}
              feedbackType={feedbackType}
              setFeedbackType={setFeedbackType}
              category={category}
              setCategory={setCategory}
              identity={identity}
              setIdentity={setIdentity}
              username={username}
              handleSelectAuthenticated={handleSelectAuthenticated}
              content={content}
              setContent={setContent}
              mediaUrl={mediaUrl}
              setMediaUrl={setMediaUrl}
              selectedIdx={selectedIdx}
              setSelectedIdx={setSelectedIdx}
              fileInputRef={fileInputRef}
              handleMediaUpload={handleMediaUpload}
              isUploadingMedia={isUploadingMedia}
              isSubmitting={isSubmitting}
              mediaError={mediaError}
              setMediaError={setMediaError}
              handleRemoveMedia={handleRemoveMedia}
              handleClearAll={handleClearAll}
              getDisplayFilename={getDisplayFilename}
              isFormValid={isFormValid}
              setError={setError}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
