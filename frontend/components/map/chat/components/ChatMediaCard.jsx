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
  const [typedText, setTypedText] = useState("");
  const [hasFinishedTyping, setHasFinishedTyping] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Zoom-In Center Modal ("Genie out of / into bottle") states
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [genieOrigin, setGenieOrigin] = useState({ dx: 0, dy: 0, sx: 0.36, sy: 0.34 });
  const [zoomTypedText, setZoomTypedText] = useState("");
  const [hasZoomFinishedTyping, setHasZoomFinishedTyping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Video scrubber states (shared seamlessly between card & zoomed center box)
  const videoRef = useRef(null);
  const zoomVideoRef = useRef(null);
  const cardRef = useRef(null);
  const wasOpenedRef = useRef(false);
  const [videoProgress, setVideoProgress] = useState(0); // 0 to 1
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [realVideoDuration, setRealVideoDuration] = useState(item.videoDuration || 0);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRafRef = useRef(null);

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

  // Viewport intersection observer: start typing only when user actually sees it
  useEffect(() => {
    if (!cardRef.current || hasFinishedTyping || !captionGraphemes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [hasFinishedTyping, captionGraphemes.length]);

  // Typing animation character by character on card front (codepoint-safe for emojis)
  useEffect(() => {
    if (!isInView || hasFinishedTyping || !captionGraphemes.length) {
      if (hasFinishedTyping && item.text) setTypedText(item.text);
      return;
    }

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      setTypedText(captionGraphemes.slice(0, currentIdx).join(""));
      if (currentIdx >= captionGraphemes.length) {
        clearInterval(interval);
        setHasFinishedTyping(true);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isInView, hasFinishedTyping, captionGraphemes, item.text]);

  // Re-run character-by-character typing animation whenever Zoom-In center modal opens
  useEffect(() => {
    if (!isZoomOpen || !captionGraphemes.length) {
      setZoomTypedText("");
      setHasZoomFinishedTyping(false);
      return;
    }

    setZoomTypedText("");
    setHasZoomFinishedTyping(false);
    let currentIdx = 0;
    let intervalId = null;

    // Begin typing right as the Genie box settles toward center
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        currentIdx++;
        setZoomTypedText(captionGraphemes.slice(0, currentIdx).join(""));
        if (currentIdx >= captionGraphemes.length) {
          clearInterval(intervalId);
          setHasZoomFinishedTyping(true);
        }
      }, 38);
    }, 160);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isZoomOpen, captionGraphemes]);

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

  // Parse optional #t=start,end media fragment from trimmed video URL
  const trimRange = useMemo(() => {
    const raw = String(item.mediaUrl || "");
    const match = raw.match(/#t=([\d.]+),([\d.]+)$/);
    if (!match) return null;
    const start = parseFloat(match[1]);
    const end = parseFloat(match[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return { start, end, duration: end - start };
    }
    return null;
  }, [item.mediaUrl]);

  const getActiveVideoEl = useCallback(() => {
    return isZoomOpen ? zoomVideoRef.current : videoRef.current;
  }, [isZoomOpen]);

  // Get active video duration
  const getVideoDuration = useCallback(() => {
    if (trimRange) return trimRange.duration;
    const activeEl = getActiveVideoEl();
    if (activeEl && Number.isFinite(activeEl.duration) && activeEl.duration > 0) {
      return activeEl.duration;
    }
    if (realVideoDuration > 0) return realVideoDuration;
    if (item.videoDuration && Number.isFinite(item.videoDuration) && item.videoDuration > 0) {
      return item.videoDuration;
    }
    return 6;
  }, [trimRange, getActiveVideoEl, realVideoDuration, item.videoDuration]);

  // Preload video duration probe & reset error state when mediaUrl updates
  useEffect(() => {
    setMediaLoadError(false);
    if (!isVideo || !item.mediaUrl || String(item.mediaUrl).startsWith("blob:")) return;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      if (v.duration === Infinity) {
        v.currentTime = 1e101;
        v.ontimeupdate = () => {
          v.ontimeupdate = null;
          if (Number.isFinite(v.duration) && v.duration > 0) {
            setRealVideoDuration(v.duration);
          }
          try {
            v.currentTime = 0;
          } catch {}
        };
      } else if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
        setRealVideoDuration(v.duration);
      }
    };
    v.src = item.mediaUrl;
    return () => {
      v.ontimeupdate = null;
      v.src = "";
    };
  }, [isVideo, item.mediaUrl]);

  // High-precision 60fps video loop for butter-smooth progress line (tracks whichever video element is active)
  const startVideoLoop = useCallback(() => {
    const loop = () => {
      const activeEl = isZoomOpen ? zoomVideoRef.current : videoRef.current;
      if (activeEl && !activeEl.paused && !activeEl.ended && !isScrubbing) {
        const dur = getVideoDuration();
        let cur = activeEl.currentTime || 0;
        if (trimRange) {
          if (cur >= trimRange.end - 0.05 || cur < trimRange.start) {
            try {
              activeEl.currentTime = trimRange.start;
              cur = trimRange.start;
            } catch {}
          }
          setVideoProgress(Math.min(1, Math.max(0, (cur - trimRange.start) / trimRange.duration)));
        } else if (dur > 0) {
          setVideoProgress(Math.min(1, Math.max(0, cur / dur)));
        }
        videoRafRef.current = requestAnimationFrame(loop);
      }
    };
    cancelAnimationFrame(videoRafRef.current);
    videoRafRef.current = requestAnimationFrame(loop);
  }, [getVideoDuration, isScrubbing, isZoomOpen, trimRange]);

  const togglePlayVideo = (e) => {
    e.stopPropagation();
    const activeEl = getActiveVideoEl();
    if (!activeEl) return;
    if (activeEl.paused) {
      activeEl
        .play()
        .then(() => {
          setIsPlayingVideo(true);
          startVideoLoop();
        })
        .catch(() => {
          setIsPlayingVideo(false);
        });
    } else {
      activeEl.pause();
      setIsPlayingVideo(false);
      cancelAnimationFrame(videoRafRef.current);
    }
  };

  const handleToggleMute = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsVideoMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = !isFlipped || isZoomOpen || next;
      }
      if (zoomVideoRef.current) {
        zoomVideoRef.current.muted = next;
      }
      return next;
    });
  }, [isFlipped, isZoomOpen]);

  // Sync card video playback & dimmed Play/Pause indicator cleanly on flip/zoom state changes
  useEffect(() => {
    if (!isVideo) return;
    const vid = videoRef.current;
    if (!vid) return;
    if (!isFlipped) {
      if (!vid.paused) {
        try {
          vid.pause();
        } catch {}
      }
      setIsPlayingVideo(false);
      cancelAnimationFrame(videoRafRef.current);
      return;
    }
    if (!isZoomOpen) {
      vid
        .play()
        .then(() => {
          setIsPlayingVideo(true);
          startVideoLoop();
        })
        .catch(() => {
          setIsPlayingVideo(false);
        });
    }
  }, [isFlipped, isZoomOpen, isVideo, item.mediaUrl, startVideoLoop]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(videoRafRef.current);
    };
  }, []);

  // Video Scrubber seek (works identically on both card & zoomed center box)
  const handleScrubberPointerDown = (e) => {
    e.stopPropagation();
    const activeEl = getActiveVideoEl();
    if (!activeEl) return;
    setIsScrubbing(true);
    cancelAnimationFrame(videoRafRef.current);

    const scrubberRect = e.currentTarget.getBoundingClientRect();
    const updateScrub = (clientX) => {
      const ratio = Math.max(0, Math.min(1, (clientX - scrubberRect.left) / scrubberRect.width));
      setVideoProgress(ratio);
      const dur = getVideoDuration();
      const targetTime = trimRange ? trimRange.start + ratio * dur : ratio * dur;
      if (activeEl && Number.isFinite(targetTime)) {
        try {
          activeEl.currentTime = targetTime;
        } catch {}
      }
      setScrubSeconds(Math.round(ratio * dur));
    };

    updateScrub(e.clientX);

    const onPointerMove = (ev) => updateScrub(ev.clientX);
    const onPointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (activeEl && !activeEl.paused) {
        startVideoLoop();
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const formatMinSec = (totalSec) => {
    const validSec = Number.isFinite(totalSec) && totalSec >= 0 ? Math.floor(totalSec) : 0;
    const m = Math.floor(validSec / 60);
    const s = Math.floor(validSec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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
