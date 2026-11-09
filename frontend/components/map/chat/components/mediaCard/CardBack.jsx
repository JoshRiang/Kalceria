"use client";

import { memo } from "react";
import { ChatVideoSoundIcon } from "./mediaCardIcons";

export const CardBack = memo(function CardBack({
  isFlipped,
  item,
  mediaLoadError,
  setMediaLoadError,
  isVideo,
  videoRef,
  isZoomOpen,
  trimRange,
  setRealVideoDuration,
  setIsPlayingVideo,
  isPlayingVideo,
  startVideoLoop,
  videoRafRef,
  togglePlayVideo,
  isVideoMuted,
  handleToggleMute,
  handleScrubberPointerDown,
  isScrubbing,
  videoProgress,
  scrubSeconds,
  formatMinSec,
  isViewOnce,
  handleOpenZoom,
  handleDownload,
  isDownloading,
  renderDownloadIconSvg,
  handleFlipBack,
  renderFlipIconSvg,
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg) translateZ(0)",
        pointerEvents: isFlipped ? "auto" : "none",
      }}
      className="z-10 w-full h-full rounded-xl overflow-hidden bg-black flex flex-col justify-between"
    >
      {/* Media View */}
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {item.status === "sending" && !item.mediaUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <span className="w-5 h-5 rounded-full border-[2.5px] border-white/25 border-t-white animate-spin block" />
          </div>
        ) : mediaLoadError || !item.mediaUrl ? (
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
              autoPlay={isFlipped && !isZoomOpen}
              muted={!isFlipped || isZoomOpen || isVideoMuted}
              loop
              onLoadedMetadata={(e) => {
                if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                  setRealVideoDuration(e.currentTarget.duration);
                }
                if (trimRange && e.currentTarget.currentTime < trimRange.start) {
                  try {
                    e.currentTarget.currentTime = trimRange.start;
                  } catch {}
                }
              }}
              onError={() => setMediaLoadError(true)}
              onPlay={() => {
                if (!isZoomOpen) {
                  setIsPlayingVideo(true);
                  startVideoLoop();
                }
              }}
              onPause={() => {
                if (!isZoomOpen) {
                  setIsPlayingVideo(false);
                  cancelAnimationFrame(videoRafRef.current);
                }
              }}
              className="w-full h-full object-cover"
            />

            {/* Center Play/Pause Overlay Button (Both Pause & Play dimmed consistently; never included in downloads) */}
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
        {isVideo && item.mediaUrl && !mediaLoadError && (
          <div
            onPointerDown={handleScrubberPointerDown}
            className="absolute inset-x-2 bottom-2 z-30 h-5 flex items-center cursor-pointer select-none"
          >
            {isScrubbing && !isZoomOpen && (
              <div
                style={{
                  left: `${Math.min(88, Math.max(12, videoProgress * 100))}%`,
                  transform: "translateX(-50%)",
                }}
                className="absolute -top-6 px-1.5 py-0.5 rounded-md bg-white border border-black text-black font-sans font-medium text-[9.5px] leading-none shadow-sm select-none pointer-events-none whitespace-nowrap z-30"
              >
                {formatMinSec(scrubSeconds)}
              </div>
            )}

            <div className="relative w-full h-[2.5px] rounded-full bg-white/30 backdrop-blur-sm">
              <div
                style={{ width: `${videoProgress * 100}%` }}
                className="h-full rounded-full bg-white shadow-xs"
              />
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

        {/* TOP-LEFT: Broken-Corner Zoom-In Box Icon ("zoom in box, yang patah patah") */}
        {item.mediaUrl && !mediaLoadError && (
          <div className="absolute top-2 left-2 z-35 pointer-events-auto">
            <button
              type="button"
              onClick={handleOpenZoom}
              className="p-1 rounded-full text-white/90 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]"
              title="Perbesar media"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-none stroke-current"
                strokeWidth="2.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
                <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
                <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
                <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
              </svg>
            </button>
          </div>
        )}

        {/* TOP-RIGHT: Sound/Mute Icon (left of download) + Download Icon (2nd from right, omitted if View-Once) + Flip Back Icon (far right) */}
        <div className="absolute top-2 right-2 z-35 flex items-center gap-0.5 pointer-events-auto">
          {isVideo && item.mediaUrl && !mediaLoadError && (
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 rounded-full text-white/90 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]"
              title={isVideoMuted ? "Bunyikan video" : "Bisukan video"}
            >
              <ChatVideoSoundIcon isMuted={isVideoMuted} className="w-3.5 h-3.5" />
            </button>
          )}

          {!isViewOnce && item.mediaUrl && !mediaLoadError && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1 rounded-full text-white/90 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)] disabled:opacity-60"
              title={isVideo ? "Unduh video" : "Unduh foto"}
            >
              {renderDownloadIconSvg("w-3.5 h-3.5")}
            </button>
          )}

          <button
            type="button"
            onClick={handleFlipBack}
            className="p-1 rounded-full text-white/90 hover:text-white transition-transform hover:scale-110 active:scale-90 cursor-pointer drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]"
            title="Balikkan kartu"
          >
            {renderFlipIconSvg("w-3.5 h-3.5")}
          </button>
        </div>
      </div>
    </div>
  );
});
