"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadChatMedia } from "@/lib/mediaDownload";
import {
  RANDOM_FONTS,
  VIEW_ONCE_OPENED_STORAGE_KEY,
  readViewOnceOpened,
  persistViewOnceOpened,
  MediaCardZoomModal,
  CardFront,
  CardBack,
} from "./mediaCard";
import { useMediaCardTyping } from "./mediaCard/useMediaCardTyping";
import { useMediaCardVideoPlayback } from "./mediaCard/useMediaCardVideoPlayback";

export function ChatMediaCard({
  item,
  isMapDark,
  isMe,
  onOpenContextMenu,
}) {
  const isVideo = item.msgType === "video" || /^data:video/i.test(item.mediaUrl || "");
  const isViewOnce = Boolean(item.isViewOnce);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isOnceOpened, setIsOnceOpened] = useState(
    () => Boolean(item.isOnceOpened) || (Boolean(item.isViewOnce) && readViewOnceOpened(item.id))
  );

  // Zoom-In Center Modal ("Genie out of / into bottle") states
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [genieOrigin, setGenieOrigin] = useState({ dx: 0, dy: 0, sx: 0.36, sy: 0.34 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Video scrubber states (shared seamlessly between card & zoomed center box)
  const videoRef = useRef(null);
  const zoomVideoRef = useRef(null);
  const cardRef = useRef(null);
  const wasOpenedRef = useRef(false);

  // Sync persisted view-once state if item.id changes
  useEffect(() => {
    if (isViewOnce && (item.isOnceOpened || readViewOnceOpened(item.id))) {
      setIsOnceOpened(true);
    }
  }, [isViewOnce, item.id, item.isOnceOpened]);

  // Ensure view-once media opened in this session is permanently locked if chat closes/unmounts
  useEffect(() => {
    const msgId = item.id;
    const once = isViewOnce;
    return () => {
      if (once && wasOpenedRef.current && msgId) {
        persistViewOnceOpened(msgId);
      }
    };
  }, [isViewOnce, item.id]);

  // Deterministic random font selection based on item.id
  const captionFont = useMemo(() => {
    let hash = 0;
    const str = String(item.id || "font_seed");
    for (let i = 0; i < str.length; i++) {
      hash += str.charCodeAt(i);
    }
    return RANDOM_FONTS[Math.abs(hash) % RANDOM_FONTS.length];
  }, [item.id]);

  const captionGraphemes = useMemo(() => Array.from(String(item.text || "")), [item.text]);

  const {
    typedText,
    hasFinishedTyping,
    zoomTypedText,
    hasZoomFinishedTyping,
  } = useMediaCardTyping({
    cardRef,
    captionGraphemes,
    itemText: item.text,
    isZoomOpen,
  });

  // Compute exact Genie origin delta from card bounding rect to viewport center box
  const measureGenieGeometry = useCallback(() => {
    if (typeof window === "undefined" || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetMaxW = vw >= 640 ? 360 : vw >= 380 ? 340 : 320;
    const targetW = Math.min(vw - 32, targetMaxW);
    const targetH = Math.min(vh * 0.68, targetW * (4 / 3));

    // When caption exists below the box, the flex column slightly shifts the box upward by ~20px
    const captionOffsetY = captionGraphemes.length > 0 ? -18 : 0;
    const targetCenterX = vw / 2;
    const targetCenterY = vh / 2 + captionOffsetY;

    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    setGenieOrigin({
      dx: cardCenterX - targetCenterX,
      dy: cardCenterY - targetCenterY,
      sx: Math.max(0.18, Math.min(0.95, rect.width / targetW)),
      sy: Math.max(0.18, Math.min(0.95, rect.height / targetH)),
    });
  }, [captionGraphemes.length]);

  // Handle card tap to flip forward
  const handleCardTap = (e) => {
    e.stopPropagation();
    if (isOnceOpened) return;
    if (!isFlipped) {
      wasOpenedRef.current = true;
      setIsFlipped(true);
    }
  };

  const lockViewOnceIfNeeded = useCallback(() => {
    if (isViewOnce) {
      setIsOnceOpened(true);
      persistViewOnceOpened(item.id);
    }
  }, [isViewOnce, item.id]);

  // Explicit flip back button (NO auto-flip, user must tap to flip back)
  const handleFlipBack = (e) => {
    e?.stopPropagation?.();
    if (isZoomOpen) {
      measureGenieGeometry();
      setIsZoomOpen(false);
    }
    setIsFlipped(false);
    lockViewOnceIfNeeded();
  };

  // Open Zoom-In Center Modal with Genie Out-of-Bottle animation
  const handleOpenZoom = (e) => {
    e.stopPropagation();
    if (isOnceOpened || !item.mediaUrl || mediaLoadError) return;
    measureGenieGeometry();
    if (videoRef.current && !videoRef.current.paused) {
      try {
        videoRef.current.pause();
      } catch {}
    }
    setIsZoomOpen(true);
  };

  // Close Zoom-In Center Modal with Genie Into-Bottle animation (returns to flipped card)
  const handleCloseZoom = useCallback(
    (e) => {
      e?.stopPropagation?.();
      measureGenieGeometry();
      const resumeTime = zoomVideoRef.current?.currentTime;
      const wasZoomedPlaying = zoomVideoRef.current ? !zoomVideoRef.current.paused : true;
      setIsZoomOpen(false);

      if (isVideo && videoRef.current) {
        if (Number.isFinite(resumeTime)) {
          try {
            videoRef.current.currentTime = resumeTime;
          } catch {}
        }
        if (wasZoomedPlaying) {
          videoRef.current.play().catch(() => {});
          setIsPlayingVideo(true);
        }
      }
    },
    [isVideo, measureGenieGeometry]
  );

  // Close zoom on Escape key
  useEffect(() => {
    if (!isZoomOpen || typeof window === "undefined") return;
    const onKeyDown = (ev) => {
      if (ev.key === "Escape") handleCloseZoom();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZoomOpen, handleCloseZoom]);

  // Cross-platform hardware-safe download handler (strictly disabled for view-once)
  const handleDownload = async (e) => {
    e.stopPropagation();
    if (isViewOnce || isDownloading || !item.mediaUrl || mediaLoadError) return;
    setIsDownloading(true);
    try {
      await downloadChatMedia({
        mediaUrl: item.mediaUrl,
        isVideo,
        messageId: item.id,
        isViewOnce,
      });
    } finally {
      setTimeout(() => setIsDownloading(false), 350);
    }
  };

  const {
    trimRange,
    videoProgress,
    isScrubbing,
    scrubSeconds,
    isPlayingVideo,
    setIsPlayingVideo,
    realVideoDuration,
    setRealVideoDuration,
    mediaLoadError,
    setMediaLoadError,
    isVideoMuted,
    videoRafRef,
    getVideoDuration,
    startVideoLoop,
    togglePlayVideo,
    handleToggleMute,
    handleScrubberPointerDown,
    formatMinSec,
  } = useMediaCardVideoPlayback({
    item,
    isVideo,
    isFlipped,
    isZoomOpen,
    videoRef,
    zoomVideoRef,
  });

  const textLen = captionGraphemes.length;
  const textSizeClass = useMemo(() => {
    if (textLen > 38) return "text-[9px] sm:text-[9.5px] leading-tight";
    if (textLen > 22) return "text-[10.5px] sm:text-[11px] leading-snug";
    if (textLen > 12) return "text-[12px] leading-snug";
    return "text-[13px] leading-snug";
  }, [textLen]);

  // Scaled-up font size for zoomed center box so up to 50/50 chars + emojis fit cleanly left-aligned
  const zoomTextSizeClass = useMemo(() => {
    if (textLen > 38) return "text-[13px] sm:text-[14px] leading-snug";
    if (textLen > 22) return "text-[14px] sm:text-[15px] leading-snug";
    return "text-[15px] sm:text-[16px] leading-snug";
  }, [textLen]);

  // Reusable Download SVG matching Picture 4 (downward arrow into open bottom tray, rounded caps)
  const renderDownloadIconSvg = (sizeClass) =>
    isDownloading ? (
      <span
        className={`block rounded-full border-2 border-white/35 border-t-white animate-spin ${sizeClass}`}
      />
    ) : (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeClass} fill-none stroke-current`}
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4v11" />
        <path d="M7.5 10.5L12 15l4.5-4.5" />
        <path d="M4.5 14.5v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5" />
      </svg>
    );

  // Reusable Flip SVG (existing top-right icon)
  const renderFlipIconSvg = (sizeClass) => (
    <svg viewBox="0 0 24 24" className={`${sizeClass} fill-current`}>
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
    </svg>
  );

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleCardTap}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu?.(e, item);
        }}
        className={`relative rounded-xl select-none w-[125px] sm:w-[135px] aspect-[4/5] shadow-md ${
          isOnceOpened ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{ perspective: "1200px" }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: [0.45, 0.05, 0.55, 0.95] }}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
          className="relative w-full h-full"
        >
          {/* FRONT SIDE (DEFAULT): Card with centered typing animation */}
          <CardFront
            isMapDark={isMapDark}
            isFlipped={isFlipped}
            isViewOnce={isViewOnce}
            isOnceOpened={isOnceOpened}
            item={item}
            captionFont={captionFont}
            textSizeClass={textSizeClass}
            typedText={typedText}
            hasFinishedTyping={hasFinishedTyping}
            isVideo={isVideo}
          />

          {/* BACK SIDE (FLIPPED): Photo or Video View */}
          <CardBack
            isFlipped={isFlipped}
            item={item}
            mediaLoadError={mediaLoadError}
            setMediaLoadError={setMediaLoadError}
            isVideo={isVideo}
            videoRef={videoRef}
            isZoomOpen={isZoomOpen}
            trimRange={trimRange}
            setRealVideoDuration={setRealVideoDuration}
            setIsPlayingVideo={setIsPlayingVideo}
            isPlayingVideo={isPlayingVideo}
            startVideoLoop={startVideoLoop}
            videoRafRef={videoRafRef}
            togglePlayVideo={togglePlayVideo}
            isVideoMuted={isVideoMuted}
            handleToggleMute={handleToggleMute}
            handleScrubberPointerDown={handleScrubberPointerDown}
            isScrubbing={isScrubbing}
            videoProgress={videoProgress}
            scrubSeconds={scrubSeconds}
            formatMinSec={formatMinSec}
            isViewOnce={isViewOnce}
            handleOpenZoom={handleOpenZoom}
            handleDownload={handleDownload}
            isDownloading={isDownloading}
            renderDownloadIconSvg={renderDownloadIconSvg}
            handleFlipBack={handleFlipBack}
            renderFlipIconSvg={renderFlipIconSvg}
          />
        </motion.div>
      </div>

      {/* PORTALED ZOOM-IN CENTER MODAL: Modularized Package Component */}
      <MediaCardZoomModal
        isZoomOpen={isZoomOpen}
        handleCloseZoom={handleCloseZoom}
        isMapDark={isMapDark}
        item={item}
        genieOrigin={genieOrigin}
        isVideo={isVideo}
        zoomVideoRef={zoomVideoRef}
        videoRef={videoRef}
        trimRange={trimRange}
        setIsPlayingVideo={setIsPlayingVideo}
        startVideoLoop={startVideoLoop}
        videoRafRef={videoRafRef}
        togglePlayVideo={togglePlayVideo}
        isVideoMuted={isVideoMuted}
        handleToggleMute={handleToggleMute}
        isPlayingVideo={isPlayingVideo}
        isScrubbing={isScrubbing}
        videoProgress={videoProgress}
        scrubSeconds={scrubSeconds}
        formatMinSec={formatMinSec}
        handleScrubberPointerDown={handleScrubberPointerDown}
        isViewOnce={isViewOnce}
        handleDownload={handleDownload}
        isDownloading={isDownloading}
        renderDownloadIconSvg={renderDownloadIconSvg}
        handleFlipBack={handleFlipBack}
        renderFlipIconSvg={renderFlipIconSvg}
        captionGraphemes={captionGraphemes}
        captionFont={captionFont}
        zoomTextSizeClass={zoomTextSizeClass}
        zoomTypedText={zoomTypedText}
        hasZoomFinishedTyping={hasZoomFinishedTyping}
      />
    </>
  );
}
