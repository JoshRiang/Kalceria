"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  const idleTimerRef = useRef(null);

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

  // 2-second idle timer to flip back automatically
  useEffect(() => {
    if (isFlipped && !isOnceOpened) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsFlipped(false);
      }, 2000);
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isFlipped, isOnceOpened]);

  // Handle card tap flip
  const handleCardTap = (e) => {
    e.stopPropagation();
    if (isOnceOpened) return;

    if (item.isViewOnce && !isOnceOpened) {
      // Mark once seen opened
      setIsOnceOpened(true);
      return;
    }

    setIsFlipped((prev) => !prev);
  };

  // Video time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      const dur = videoRef.current.duration || item.videoDuration || 1;
      const cur = videoRef.current.currentTime || 0;
      setVideoProgress(Math.min(1, Math.max(0, cur / dur)));
    }
  };

  // Video Scrubber seek
  const handleScrubberPointerDown = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    setIsScrubbing(true);

    const scrubberRect = e.currentTarget.getBoundingClientRect();
    const updateScrub = (clientX) => {
      const ratio = Math.max(0, Math.min(1, (clientX - scrubberRect.left) / scrubberRect.width));
      setVideoProgress(ratio);
      const dur = videoRef.current.duration || item.videoDuration || 60;
      const targetTime = ratio * dur;
      videoRef.current.currentTime = targetTime;
      setScrubSeconds(Math.floor(targetTime));
    };

    updateScrub(e.clientX);

    const onPointerMove = (ev) => updateScrub(ev.clientX);
    const onPointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const formatMinSec = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      ref={cardRef}
      onClick={handleCardTap}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenContextMenu?.(e, item);
      }}
      className="relative rounded-2xl overflow-hidden select-none cursor-pointer max-w-[270px] sm:max-w-[310px] shadow-lg transition-transform active:scale-[0.99]"
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full rounded-2xl overflow-hidden bg-[#161b22] text-white"
      >
        {/* FRONT SIDE */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className={`relative w-full rounded-2xl overflow-hidden ${
            isOnceOpened ? "filter blur-lg opacity-40 pointer-events-none" : ""
          }`}
        >
          {/* Once Seen Badge (Top Right) */}
          {item.isViewOnce && (
            <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white text-[11px] font-bold shadow-md">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M 12 3 A 9 9 0 0 0 12 21" strokeLinecap="round" />
                <path d="M 12 3 A 9 9 0 0 1 12 21" strokeDasharray="2 3.5" strokeLinecap="round" />
                <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold">1</text>
              </svg>
            </div>
          )}

          {/* Media Content */}
          <div className="relative w-full aspect-[4/5] bg-black flex items-center justify-center overflow-hidden">
            {isVideo ? (
              <video
                src={item.mediaUrl}
                playsInline
                autoPlay
                muted
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.mediaUrl}
                alt="Photo"
                className="w-full h-full object-cover"
              />
            )}

            {/* Bottom Gradient Veil for Caption readability */}
            {item.text && (
              <div className="absolute inset-x-0 bottom-0 pt-8 pb-3 px-3.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <p className={`${captionFont} text-xs text-white leading-snug drop-shadow`}>
                  {typedText}
                  {!hasFinishedTyping && (
                    <span className="inline-block w-1.5 h-3 bg-white ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BACK SIDE (Flipped) */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 z-10 w-full h-full rounded-2xl overflow-hidden bg-[#161b22] flex flex-col justify-between"
        >
          {/* Back Media View */}
          <div className="relative w-full flex-1 bg-black flex items-center justify-center overflow-hidden">
            {isVideo ? (
              <video
                ref={videoRef}
                src={item.mediaUrl}
                playsInline
                autoPlay
                muted={false}
                loop
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.mediaUrl}
                alt="Flipped"
                className="w-full h-full object-cover"
              />
            )}

            {/* Video Scrubber Line (Journey style) */}
            {isVideo && (
              <div
                onPointerDown={handleScrubberPointerDown}
                className="absolute inset-x-3 bottom-3 z-30 h-7 flex items-center cursor-pointer select-none"
              >
                {/* Tooltip Timestamp Badge during scrub */}
                {isScrubbing && (
                  <div
                    style={{
                      left: `${videoProgress * 100}%`,
                      transform: "translateX(-50%)",
                      fontFamily: "Arial, sans-serif",
                    }}
                    className="absolute -top-7 px-1.5 py-0.5 rounded bg-white text-black text-[9.5px] font-bold shadow-md leading-none select-none pointer-events-none"
                  >
                    {formatMinSec(scrubSeconds)}
                  </div>
                )}

                {/* Background Line */}
                <div className="relative w-full h-[3px] rounded-full bg-white/30 backdrop-blur-sm">
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
                    className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Once-Seen Opened Lock Overlay */}
        {isOnceOpened && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-4 text-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/70 mb-2" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p style={{ fontFamily: "Arial, sans-serif" }} className="text-xs font-bold text-white/90">
              Opened (Lihat Sekali)
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
