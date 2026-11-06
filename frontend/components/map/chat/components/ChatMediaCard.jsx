"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";

const RANDOM_FONTS = [
  "font-mono tracking-tight",
  "font-serif italic",
  "font-sans font-bold",
  "font-mono font-semibold",
  "font-sans tracking-wide",
];

export function ChatMediaCard({
  item,
  isMapDark,
  isMe,
  onOpenContextMenu,
}) {
  const isVideo = item.msgType === "video" || /^data:video/i.test(item.mediaUrl || "");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isOnceOpened, setIsOnceOpened] = useState(Boolean(item.isOnceOpened));
  const [typedText, setTypedText] = useState("");
  const [hasFinishedTyping, setHasFinishedTyping] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Video scrubber states
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [videoProgress, setVideoProgress] = useState(0); // 0 to 1
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [realVideoDuration, setRealVideoDuration] = useState(item.videoDuration || 0);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const videoRafRef = useRef(null);

  // Deterministic random font selection based on item.id
  const captionFont = useMemo(() => {
    let hash = 0;
    const str = String(item.id || "font_seed");
    for (let i = 0; i < str.length; i++) {
      hash += str.charCodeAt(i);
    }
    return RANDOM_FONTS[Math.abs(hash) % RANDOM_FONTS.length];
  }, [item.id]);

  // Viewport intersection observer: start typing only when user actually sees it
  useEffect(() => {
    if (!cardRef.current || hasFinishedTyping || !item.text) return;

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
  }, [hasFinishedTyping, item.text]);

  // Typing animation character by character
  useEffect(() => {
    if (!isInView || hasFinishedTyping || !item.text) {
      if (hasFinishedTyping && item.text) setTypedText(item.text);
      return;
    }

    let currentIdx = 0;
    const fullText = item.text;
    const interval = setInterval(() => {
      currentIdx++;
      setTypedText(fullText.slice(0, currentIdx));
      if (currentIdx >= fullText.length) {
        clearInterval(interval);
        setHasFinishedTyping(true);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isInView, hasFinishedTyping, item.text]);

  // Handle card tap to flip forward
  const handleCardTap = (e) => {
    e.stopPropagation();
    if (isOnceOpened) return;
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  // Explicit flip back button (NO auto-flip, user must tap to flip back)
  const handleFlipBack = (e) => {
    e.stopPropagation();
    setIsFlipped(false);
    if (item.isViewOnce) {
      setIsOnceOpened(true);
    }
  };

  // Get active video duration
  const getVideoDuration = useCallback(() => {
    if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
      return videoRef.current.duration;
    }
    if (realVideoDuration > 0) return realVideoDuration;
    if (item.videoDuration && Number.isFinite(item.videoDuration) && item.videoDuration > 0) {
      return item.videoDuration;
    }
    return 6;
  }, [realVideoDuration, item.videoDuration]);

  // Preload video duration probe
  useEffect(() => {
    if (!isVideo || !item.mediaUrl) return;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
        setRealVideoDuration(v.duration);
      }
    };
    v.src = item.mediaUrl;
  }, [isVideo, item.mediaUrl]);

  // High-precision 60fps video loop for butter-smooth progress line
  const startVideoLoop = useCallback(() => {
    const loop = () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended && !isScrubbing) {
        const dur = getVideoDuration();
        const cur = videoRef.current.currentTime || 0;
        if (dur > 0) {
          setVideoProgress(Math.min(1, Math.max(0, cur / dur)));
        }
        videoRafRef.current = requestAnimationFrame(loop);
      }
    };
    cancelAnimationFrame(videoRafRef.current);
    videoRafRef.current = requestAnimationFrame(loop);
  }, [getVideoDuration, isScrubbing]);

  const togglePlayVideo = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlayingVideo(true);
      startVideoLoop();
    } else {
      videoRef.current.pause();
      setIsPlayingVideo(false);
      cancelAnimationFrame(videoRafRef.current);
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(videoRafRef.current);
    };
  }, []);

  // Video Scrubber seek
  const handleScrubberPointerDown = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    setIsScrubbing(true);
    cancelAnimationFrame(videoRafRef.current);

    const scrubberRect = e.currentTarget.getBoundingClientRect();
    const updateScrub = (clientX) => {
      const ratio = Math.max(0, Math.min(1, (clientX - scrubberRect.left) / scrubberRect.width));
      setVideoProgress(ratio);
      const dur = getVideoDuration();
      const targetTime = ratio * dur;
      if (videoRef.current && Number.isFinite(targetTime)) {
        try {
          videoRef.current.currentTime = targetTime;
        } catch {}
      }
      setScrubSeconds(Math.round(targetTime));
    };

    updateScrub(e.clientX);

    const onPointerMove = (ev) => updateScrub(ev.clientX);
    const onPointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (videoRef.current && !videoRef.current.paused) {
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

  const textLen = (item.text || "").length;
  const textSizeClass = useMemo(() => {
    if (textLen > 38) return "text-[9px] sm:text-[9.5px] leading-tight";
    if (textLen > 22) return "text-[10.5px] sm:text-[11px] leading-snug";
    if (textLen > 12) return "text-[12px] leading-snug";
    return "text-[13px] leading-snug";
  }, [textLen]);

  return (
    <div
      ref={cardRef}
      onClick={handleCardTap}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenContextMenu?.(e, item);
      }}
      className={`relative rounded-xl select-none w-[125px] sm:w-[135px] aspect-[4/5] shadow-md transition-transform ${
        isOnceOpened ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"
      }`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full h-full"
      >
        {/* FRONT SIDE (DEFAULT): Blurred card with centered typing animation */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            visibility: isFlipped ? "hidden" : "visible",
          }}
          className={`relative w-full h-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 transition-colors duration-200 ${
            isMapDark
              ? "bg-black/95 backdrop-blur-md border border-white/20 text-white shadow-md"
              : "bg-white/85 backdrop-blur-md border border-black/15 text-black shadow-xs"
          }`}
        >
          {/* Once Seen Badge (Top Right): Persists even after viewing */}
          {item.isViewOnce && (
            <div
              className={`absolute top-2 right-2 z-20 flex items-center justify-center ${
                isMapDark ? "text-white" : "text-black"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M 12 3 A 9 9 0 0 0 12 21" strokeLinecap="round" />
                <path d="M 12 3 A 9 9 0 0 1 12 21" strokeDasharray="2 3.5" strokeLinecap="round" />
                <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold">1</text>
              </svg>
            </div>
          )}

          {/* Centered Caption Text with Typing Animation or Loading Buffer */}
          <div className="flex-1 w-full h-full flex items-center justify-center text-center px-1">
            {item.status === "sending" ? (
              <span
                className={`w-4 h-4 rounded-full border-[2.2px] border-current/25 border-t-current animate-spin block ${
                  isMapDark ? "text-white" : "text-black"
                }`}
              />
            ) : (
              <p
                className={`${captionFont} ${textSizeClass} select-none break-words max-w-full font-normal ${
                  isMapDark ? "text-white" : "text-black"
                }`}
              >
                {typedText || item.text || (isVideo ? "📹 Video" : "📷 Photo")}
                {!hasFinishedTyping && item.text && (
                  <span
                    className={`inline-block w-[1.5px] h-3 ml-0.5 align-middle animate-pulse ${
                      isMapDark ? "bg-white" : "bg-black"
                    }`}
                  />
                )}
              </p>
            )}
          </div>

          {/* Flip Hint Icon in bottom right: Dimmed & disabled if view-once card was already opened */}
          <div
            className={`w-full flex justify-end items-center ${
              isOnceOpened ? "opacity-20 cursor-not-allowed pointer-events-none" : "opacity-40"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
            </svg>
          </div>
        </div>

        {/* BACK SIDE (FLIPPED): Photo or Video View */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            visibility: isFlipped ? "visible" : "hidden",
          }}
          className="absolute inset-0 z-10 w-full h-full rounded-xl overflow-hidden bg-black flex flex-col justify-between"
        >
          {/* Media View */}
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {mediaLoadError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-neutral-900 text-white/50 select-none">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-current mb-1.5" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-[9px] font-sans text-white/60">Media tidak tersedia</span>
              </div>
            ) : isVideo ? (
              <>
                <video
                  ref={videoRef}
                  src={item.mediaUrl}
                  playsInline
                  autoPlay
                  muted={false}
                  loop
                  onLoadedMetadata={(e) => {
                    if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                      setRealVideoDuration(e.currentTarget.duration);
                    }
                  }}
                  onError={() => setMediaLoadError(true)}
                  onPlay={() => {
                    setIsPlayingVideo(true);
                    startVideoLoop();
                  }}
                  onPause={() => {
                    setIsPlayingVideo(false);
                    cancelAnimationFrame(videoRafRef.current);
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Center Play/Pause Overlay Button: Semi-transparent when playing, pure white when paused, graceful fade, no outer box, no glow */}
                <div
                  onClick={togglePlayVideo}
                  className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer select-none"
                >
                  <div
                    className={`transition-opacity duration-300 ${
                      isPlayingVideo ? "opacity-35 hover:opacity-75" : "opacity-95"
                    }`}
                  >
                    {isPlayingVideo ? (
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] ml-0.5">
                        <polygon points="6,4 20,12 6,20" />
                      </svg>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.mediaUrl}
                alt="Captured"
                onError={() => setMediaLoadError(true)}
                className="w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Video Scrubber Line (60fps propagation) */}
            {isVideo && (
              <div
                onPointerDown={handleScrubberPointerDown}
                className="absolute inset-x-2 bottom-2 z-30 h-5 flex items-center cursor-pointer select-none"
              >
                {/* Tooltip Timestamp Badge during scrub: NO outer box, bold white text for both light and dark modes */}
                {isScrubbing && (
                  <div
                    style={{
                      left: `${videoProgress * 100}%`,
                      transform: "translateX(-50%)",
                      fontFamily: "Arial, sans-serif",
                    }}
                    className="absolute -top-5 text-white text-[9px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none select-none pointer-events-none"
                  >
                    {formatMinSec(scrubSeconds)}
                  </div>
                )}

                {/* Background Line */}
                <div className="relative w-full h-[2.5px] rounded-full bg-white/30 backdrop-blur-sm">
                  {/* Active White Progress Line */}
                  <div
                    style={{ width: `${videoProgress * 100}%` }}
                    className="h-full rounded-full bg-white shadow-xs"
                  />
                  {/* Draggable Dot */}
                  <div
                    style={{
                      left: `${videoProgress * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                  />
                </div>
              </div>
            )}

            {/* Flip Back Button: Moved to top-right of the video/photo box, clean white, no outer box/circle */}
            <div className="absolute top-2 right-2 z-35 pointer-events-auto">
              <button
                type="button"
                onClick={handleFlipBack}
                className="p-1 rounded-full text-white/90 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]"
                title="Balikkan kartu"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
