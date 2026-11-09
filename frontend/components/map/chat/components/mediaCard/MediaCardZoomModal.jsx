"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChatVideoSoundIcon } from "./mediaCardIcons";

export function MediaCardZoomModal({
  isZoomOpen,
  handleCloseZoom,
  isMapDark,
  item,
  genieOrigin,
  isVideo,
  zoomVideoRef,
  videoRef,
  trimRange,
  setIsPlayingVideo,
  startVideoLoop,
  videoRafRef,
  togglePlayVideo,
  isVideoMuted,
  handleToggleMute,
  isPlayingVideo,
  isScrubbing,
  videoProgress,
  scrubSeconds,
  formatMinSec,
  handleScrubberPointerDown,
  isViewOnce,
  handleDownload,
  isDownloading,
  renderDownloadIconSvg,
  handleFlipBack,
  renderFlipIconSvg,
  captionGraphemes,
  captionFont,
  zoomTextSizeClass,
  zoomTypedText,
  hasZoomFinishedTyping,
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isZoomOpen && (
        <motion.div
          key={`zoom-portal-${item.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleCloseZoom}
          className={`fixed inset-0 z-[2400] flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md select-none ${
            isMapDark ? "bg-black/68" : "bg-white/68"
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] xs:max-w-[340px] sm:max-w-[360px] flex flex-col items-start"
          >
            {/* GENIE ANIMATED BORDERLESS MEDIA BOX (Standard CameraCaptureModal Viewport Size) */}
            <motion.div
              initial={{
                x: genieOrigin.dx,
                y: genieOrigin.dy,
                scaleX: genieOrigin.sx * 0.88,
                scaleY: genieOrigin.sy * 1.04,
                borderRadius: 22,
                opacity: 0.72,
              }}
              animate={{
                x: 0,
                y: 0,
                scaleX: 1,
                scaleY: 1,
                borderRadius: 16,
                opacity: 1,
                transition: {
                  duration: 0.46,
                  ease: [0.19, 1, 0.22, 1],
                },
              }}
              exit={{
                x: genieOrigin.dx,
                y: genieOrigin.dy,
                scaleX: genieOrigin.sx * 0.86,
                scaleY: genieOrigin.sy * 0.96,
                borderRadius: 22,
                opacity: 0,
                transition: {
                  duration: 0.38,
                  ease: [0.32, 0, 0.15, 1],
                },
              }}
              style={{ willChange: "transform, opacity" }}
              className="relative w-full aspect-[3/4] max-h-[68dvh] rounded-2xl overflow-hidden bg-black shadow-2xl border-0 flex items-center justify-center"
            >
              {isVideo ? (
                <>
                  <video
                    ref={zoomVideoRef}
                    src={item.mediaUrl}
                    playsInline
                    autoPlay
                    muted={isVideoMuted}
                    loop
                    onLoadedMetadata={(e) => {
                      if (videoRef.current && Number.isFinite(videoRef.current.currentTime) && videoRef.current.currentTime > 0) {
                        try {
                          e.currentTarget.currentTime = videoRef.current.currentTime;
                        } catch {}
                      } else if (trimRange && e.currentTarget.currentTime < trimRange.start) {
                        try {
                          e.currentTarget.currentTime = trimRange.start;
                        } catch {}
                      }
                    }}
                    onPlay={() => {
                      setIsPlayingVideo(true);
                      startVideoLoop();
                    }}
                    onPause={() => {
                      setIsPlayingVideo(false);
                      cancelAnimationFrame(videoRafRef.current);
                    }}
                    className="w-full h-full object-contain bg-black"
                  />

                  {/* Enlarged Center Play/Pause Overlay (Dimmed Pause & Play) */}
                  <div
                    onClick={togglePlayVideo}
                    className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer select-none"
                  >
                    <div
                      className={`transition-opacity duration-300 ${
                        isPlayingVideo ? "opacity-35 hover:opacity-75" : "opacity-40 hover:opacity-80"
                      }`}
                    >
                      {isPlayingVideo ? (
                        <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] ml-0.5">
                          <polygon points="6,4 20,12 6,20" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Enlarged Video Scrubber inside Zoomed Box */}
                  <div
                    onPointerDown={handleScrubberPointerDown}
                    className="absolute inset-x-3.5 bottom-3 z-30 h-6 flex items-center cursor-pointer select-none"
                  >
                    {isScrubbing && (
                      <div
                        style={{
                          left: `${Math.min(90, Math.max(10, videoProgress * 100))}%`,
                          transform: "translateX(-50%)",
                        }}
                        className="absolute -top-7 px-2 py-0.5 rounded-md bg-white border border-black text-black font-sans font-medium text-[11px] leading-none shadow-sm select-none pointer-events-none whitespace-nowrap z-30"
                      >
                        {formatMinSec(scrubSeconds)}
                      </div>
                    )}

                    <div className="relative w-full h-[3px] rounded-full bg-white/30 backdrop-blur-sm">
                      <div
                        style={{ width: `${videoProgress * 100}%` }}
                        className="h-full rounded-full bg-white shadow-xs"
                      />
                      <div
                        style={{
                          left: `${videoProgress * 100}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      />
                    </div>
                  </div>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.mediaUrl}
                  alt="Captured"
                  className="w-full h-full object-contain bg-black pointer-events-none"
                />
              )}

              {/* ENLARGED TOP-LEFT: Left-Pointing Back Arrow (Replaces Zoom-In Icon at Same Top-Left Position) */}
              <div className="absolute top-3 left-3 z-35 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleCloseZoom}
                  className="p-1.5 rounded-full text-white/95 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]"
                  title="Kembali ke chat"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px] fill-none stroke-current"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* ENLARGED TOP-RIGHT: Sound/Mute Icon (left of download) + Download Icon (2nd from right, strictly hidden if View-Once) + Flip Icon (far right) */}
              <div className="absolute top-3 right-3 z-35 flex items-center gap-1.5 pointer-events-auto">
                {isVideo && item.mediaUrl && (
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="p-1.5 rounded-full text-white/95 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]"
                    title={isVideoMuted ? "Bunyikan video" : "Bisukan video"}
                  >
                    <ChatVideoSoundIcon isMuted={isVideoMuted} className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                  </button>
                )}

                {!isViewOnce && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="p-1.5 rounded-full text-white/95 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] disabled:opacity-60"
                    title={isVideo ? "Unduh video" : "Unduh foto"}
                  >
                    {renderDownloadIconSvg("w-5 h-5 sm:w-[22px] sm:h-[22px]")}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleFlipBack}
                  className="p-1.5 rounded-full text-white/95 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]"
                  title="Balikkan kartu"
                >
                  {renderFlipIconSvg("w-5 h-5 sm:w-[22px] sm:h-[22px]")}
                </button>
              </div>
            </motion.div>

            {/* LEFT-ALIGNED MESSAGE CAPTION BELOW CENTER BOX */}
            {captionGraphemes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.14, duration: 0.28 } }}
                exit={{ opacity: 0, y: 4, transition: { duration: 0.16 } }}
                className="w-full mt-3 px-0.5 text-left pointer-events-none"
              >
                <p
                  className={`${captionFont} ${zoomTextSizeClass} text-left break-words whitespace-pre-wrap font-normal ${
                    isMapDark
                      ? "text-white drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.9)]"
                      : "text-black drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]"
                  }`}
                >
                  {zoomTypedText}
                  {!hasZoomFinishedTyping && (
                    <span
                      className={`inline-block w-[2px] h-4 ml-0.5 align-middle animate-pulse ${
                        isMapDark ? "bg-white" : "bg-black"
                      }`}
                    />
                  )}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
