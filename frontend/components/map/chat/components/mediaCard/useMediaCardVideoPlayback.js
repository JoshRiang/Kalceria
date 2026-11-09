"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";

export function useMediaCardVideoPlayback({
  item,
  isVideo,
  isFlipped,
  isZoomOpen,
  videoRef,
  zoomVideoRef,
}) {
  const [videoProgress, setVideoProgress] = useState(0); // 0 to 1
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [realVideoDuration, setRealVideoDuration] = useState(item.videoDuration || 0);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRafRef = useRef(null);

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
  }, [isZoomOpen, videoRef, zoomVideoRef]);

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
  }, [getVideoDuration, isScrubbing, isZoomOpen, trimRange, videoRef, zoomVideoRef]);

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
  }, [isFlipped, isZoomOpen, videoRef, zoomVideoRef]);

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
  }, [isFlipped, isZoomOpen, isVideo, item.mediaUrl, startVideoLoop, videoRef]);

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

  return {
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
  };
}
