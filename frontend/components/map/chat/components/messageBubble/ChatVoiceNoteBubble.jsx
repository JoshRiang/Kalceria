"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatMessageTime } from "../../hooks/usePersonalChatState";
import { getFallbackWaveform } from "./bubbleHelpers";
import { ChatStatusIndicator } from "./ChatStatusIndicator";
import { ChatMiniCheckbox } from "./ChatMiniCheckbox";

export function ChatVoiceNoteBubble({
  item,
  isMe,
  isMapDark,
  selectMode,
  isSelected,
  isReplyingTarget,
  playingVoiceId,
  setPlayingVoiceId,
  handleToggleSelectMsg,
  onOpenContextMenu,
  onResendMessage,
  isNudged = false,
}) {
  const isPlaying = playingVoiceId === item.id;

  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [realAudioDuration, setRealAudioDuration] = useState(
    Number.isFinite(Number(item.voiceDuration)) && Number(item.voiceDuration) > 0
      ? Number(item.voiceDuration)
      : 0
  );
  const audioRef = useRef(null);
  const audioSrcRef = useRef("");
  const waveformRef = useRef(null);
  const rafRef = useRef(null);

  const getFiniteSec = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const durationRef = useRef(getFiniteSec(realAudioDuration) || getFiniteSec(item.voiceDuration) || 4);
  durationRef.current = getFiniteSec(realAudioDuration) || getFiniteSec(item.voiceDuration) || 4;

  // Sync realAudioDuration if item.voiceDuration prop arrives or updates
  useEffect(() => {
    const d = getFiniteSec(item.voiceDuration);
    if (d > 0 && d !== realAudioDuration) {
      setRealAudioDuration(d);
    }
  }, [item.voiceDuration]);

  // Preload audio duration only when voiceDuration wasn't already supplied, without tearing down active audioRef
  useEffect(() => {
    setAudioError(false);
    if (!item.mediaUrl || String(item.mediaUrl).startsWith("blob:")) return;
    if (getFiniteSec(item.voiceDuration) > 0) return;

    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (probe.duration === Infinity) {
        probe.currentTime = 1e101;
        probe.ontimeupdate = () => {
          probe.ontimeupdate = null;
          if (Number.isFinite(probe.duration) && probe.duration > 0 && probe.duration < 7200) {
            setRealAudioDuration(Math.max(1, Math.round(probe.duration)));
          }
          try {
            probe.currentTime = 0;
          } catch {}
        };
      } else if (Number.isFinite(probe.duration) && probe.duration > 0 && probe.duration < 7200) {
        setRealAudioDuration(Math.max(1, Math.round(probe.duration)));
      }
    };
    probe.src = item.mediaUrl;
    return () => {
      probe.ontimeupdate = null;
      probe.src = "";
    };
  }, [item.mediaUrl, item.voiceDuration]);

  const rawWaveform = Array.isArray(item.voiceWaveform) && item.voiceWaveform.length > 0
    ? item.voiceWaveform
    : getFallbackWaveform(item.id, getFiniteSec(item.voiceDuration) || 4);

  // Compact 14 bars matching Coki width perfectly
  const displayWaveform = (() => {
    if (!rawWaveform.length) return [];
    if (rawWaveform.length === 14) return rawWaveform;
    const step = rawWaveform.length / 14;
    const sampled = [];
    for (let i = 0; i < 14; i++) {
      const idx = Math.floor(i * step);
      sampled.push(rawWaveform[idx] || 16);
    }
    return sampled;
  })();

  const totalDuration = getFiniteSec(realAudioDuration) || getFiniteSec(item.voiceDuration) || 4;
  const formatSec = (totalSec) => {
    const sec = Math.max(0, Math.floor(getFiniteSec(totalSec)));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Syllable flap calculation for natural speech cadence
  const isSpeakingNow = (() => {
    if (!isPlaying || !audioRef.current) return false;
    const dur = getFiniteSec(audioRef.current.duration) || totalDuration || 4;
    const cur = getFiniteSec(audioRef.current.currentTime) || (playbackProgress * dur);
    if (cur < 0.25 || cur > dur - 0.25) return false;
    const flapCycle = Math.floor(cur * 6.5) % 2 === 0;
    const currentSampleIdx = Math.floor(playbackProgress * (displayWaveform.length || 1));
    const currentEnergy = displayWaveform[currentSampleIdx] || 0;
    return flapCycle && currentEnergy >= 26;
  })();

  // Audio Playback Controller & Instance Management
  const getOrCreateAudio = useCallback(() => {
    if (!item.mediaUrl) return null;
    if (
      audioRef.current &&
      audioSrcRef.current &&
      (!audioRef.current.paused ||
        audioSrcRef.current === item.mediaUrl ||
        audioSrcRef.current.startsWith("blob:"))
    ) {
      return audioRef.current;
    }
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = item.mediaUrl;
      audioSrcRef.current = item.mediaUrl;
      audioRef.current = audio;

      const updateDuration = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration < 7200) {
          setRealAudioDuration(Math.max(1, Math.round(audio.duration)));
        }
      };

      audio.addEventListener("loadedmetadata", updateDuration);
      audio.addEventListener("durationchange", updateDuration);

      audio.onended = () => {
        cancelAnimationFrame(rafRef.current);
        setPlayingVoiceId(null);
        setPlaybackProgress(0);
        setCurrentPlaybackSec(0);
      };

      audio.onpause = () => {
        cancelAnimationFrame(rafRef.current);
      };

      audio.onerror = () => {
        // If optimistic blob URL was revoked after permanent URL arrived, switch seamlessly once
        if (
          audioSrcRef.current !== item.mediaUrl &&
          item.mediaUrl &&
          !String(item.mediaUrl).startsWith("blob:")
        ) {
          audioSrcRef.current = item.mediaUrl;
          audio.src = item.mediaUrl;
          audio.load();
          return;
        }
        cancelAnimationFrame(rafRef.current);
        setAudioError(true);
        setPlayingVoiceId(null);
        setPlaybackProgress(0);
        setCurrentPlaybackSec(0);
      };
    } else if (audioSrcRef.current !== item.mediaUrl && audioRef.current.paused) {
      audioSrcRef.current = item.mediaUrl;
      audioRef.current.src = item.mediaUrl;
    }
    return audioRef.current;
  }, [item.mediaUrl, setPlayingVoiceId]);

  useEffect(() => {
    if (!item.mediaUrl) {
      if (isPlaying) {
        setPlayingVoiceId(null);
        setPlaybackProgress(0);
        setCurrentPlaybackSec(0);
      }
      return;
    }

    if (isPlaying) {
      const audio = getOrCreateAudio();
      if (audio) {
        const startRafLoop = () => {
          const loop = () => {
            if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
              const dur =
                getFiniteSec(audioRef.current.duration) ||
                durationRef.current ||
                4;
              const cur = getFiniteSec(audioRef.current.currentTime);
              if (dur > 0) {
                setPlaybackProgress(Math.min(1, Math.max(0, cur / dur)));
                setCurrentPlaybackSec(Math.floor(cur));
              }
              rafRef.current = requestAnimationFrame(loop);
            }
          };
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(loop);
        };

        if (audio.paused) {
          audio
            .play()
            .then(startRafLoop)
            .catch(() => {
              setAudioError(true);
              setPlayingVoiceId(null);
              setPlaybackProgress(0);
              setCurrentPlaybackSec(0);
            });
        } else {
          startRafLoop();
        }
      }
    } else {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, Boolean(item.mediaUrl), setPlayingVoiceId, getOrCreateAudio]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Hold & Drag dynamic scrubbing across the waveform
  const handleSeekRatio = useCallback(
    (ratio) => {
      const audio = getOrCreateAudio();
      if (!audio) return;

      const applySeek = () => {
        const dur = getFiniteSec(audio.duration) || totalDuration || 4;
        const targetTime = Math.min(dur, Math.max(0, ratio * dur));
        try {
          if (Number.isFinite(targetTime)) {
            audio.currentTime = targetTime;
          }
        } catch {}
        setPlaybackProgress(ratio);
        setCurrentPlaybackSec(Math.floor(targetTime));
      };

      if (audio.readyState >= 1 || (Number.isFinite(audio.duration) && audio.duration > 0)) {
        applySeek();
      } else {
        audio.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    },
    [getOrCreateAudio, totalDuration]
  );

  const handlePointerDownWaveform = (e) => {
    e.stopPropagation();
    if (!waveformRef.current || !item.mediaUrl || item.status === "sending" || audioError) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const calculateRatio = (clientX) => {
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const initialRatio = calculateRatio(e.clientX);
    handleSeekRatio(initialRatio);

    if (!isPlaying) {
      setPlayingVoiceId(item.id);
    } else if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }

    const onPointerMove = (ev) => {
      const moveRatio = calculateRatio(ev.clientX);
      handleSeekRatio(moveRatio);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex items-center gap-1.5 ${
        isMe ? "justify-end mr-1" : "justify-start ml-0.5"
      } ${selectMode ? "cursor-pointer" : ""} my-1`}
    >
      <ChatMiniCheckbox
        selectMode={selectMode}
        isSelected={isSelected}
        isMapDark={isMapDark}
        onToggleSelect={() => handleToggleSelectMsg(item.id)}
      />

      {/* Compact Voice Note Column (NO outer message box) */}
      <motion.div
        animate={isNudged ? { x: [0, 16, 0] } : { x: 0 }}
        transition={
          isNudged
            ? { duration: 0.62, ease: [0.33, 1, 0.68, 1] }
            : { duration: 0.25, ease: "easeOut" }
        }
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu?.(e, item);
        }}
        className={`flex flex-col ${
          isMe ? "items-end" : "items-start"
        } transition-all duration-200 ${
          isSelected ? "scale-[1.04] z-10" : "scale-100"
        } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
      >
        {/* Main Voice Note Unit: Coki mascot centered above voice line */}
        <div className="flex flex-col items-center">
          {/* Coki Mascot (+35% larger width: ~65px) centered directly above waveform */}
          <motion.div
            animate={{ y: [0, -2.5, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-[65px] h-[76px] -mb-1 select-none pointer-events-none drop-shadow-sm flex items-center justify-center"
          >
            <Image
              src={isSpeakingNow ? "/ForChat/Coki_Speak_Trimmed.png" : "/ForChat/Coki_Idle_Trimmed.png"}
              alt="Coki Voice Mascot"
              width={65}
              height={76}
              className="w-full h-full object-contain"
              priority
            />
          </motion.div>

          {/* Voice Control Row: Play Button, Waveform centered under Coki, and Time Running */}
          <div className="flex items-center gap-2 py-0.5 select-none">
            {/* 1. Play Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (item.status === "sending" || !item.mediaUrl || audioError) return;
                setPlayingVoiceId((prev) => (prev === item.id ? null : item.id));
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 shrink-0 border border-black ${
                !item.mediaUrl && item.status !== "sending"
                  ? "opacity-45 cursor-not-allowed"
                  : "cursor-pointer hover:scale-105 active:scale-95"
              } ${
                isMapDark
                  ? "bg-[#21262d] text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.5),0_1.5px_4px_rgba(0,0,0,0.3)]"
                  : "bg-[#f0f2f5] text-black shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_1.5px_4px_rgba(0,0,0,0.08)]"
              }`}
              title={
                !item.mediaUrl && item.status !== "sending"
                  ? "Audio tidak tersedia"
                  : isPlaying
                  ? "Pause"
                  : "Play voice note"
              }
            >
              {item.status === "sending" ? (
                <span
                  className={`w-3 h-3 rounded-full border-[2px] border-current/25 border-t-current animate-spin block ${
                    isMapDark ? "text-white" : "text-black"
                  }`}
                />
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current ml-0.5">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              )}
            </button>

            {/* 2. Waveform Bars: Centered directly beneath Coki */}
            <div
              ref={waveformRef}
              onPointerDown={handlePointerDownWaveform}
              className="flex items-center justify-center gap-[2.5px] h-6 cursor-pointer py-1 touch-none min-w-[70px]"
            >
              {displayWaveform.map((val, i) => {
                const barRatio = (i + 1) / displayWaveform.length;
                const isPlayed = (isPlaying || playbackProgress > 0) && barRatio <= playbackProgress;
                const heightPx = Math.max(3, Math.round((val / 100) * 18));

                return (
                  <span
                    key={i}
                    style={{ height: `${heightPx}px` }}
                    className={`w-[2.2px] rounded-full transition-colors duration-75 ${
                      isPlaying || playbackProgress > 0
                        ? isPlayed
                          ? "bg-black"
                          : "bg-white shadow-[0_0.5px_1.5px_rgba(0,0,0,0.5)] border border-black/15"
                        : isMapDark
                        ? "bg-white/80"
                        : "bg-black/85"
                    }`}
                  />
                );
              })}
            </div>

            {/* 3. Time Running */}
            <span
              style={{ fontFamily: "Arial, sans-serif" }}
              className={`text-[8.5px] font-black tracking-tight leading-none select-none shrink-0 ${
                isMapDark
                  ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                  : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
              }`}
            >
              {isPlaying || playbackProgress > 0
                ? formatSec(currentPlaybackSec)
                : formatSec(totalDuration)}
            </span>
          </div>
        </div>

        {/* Time mark directly below VN line */}
        <div className="w-full flex justify-end mt-1 select-none pr-0.5">
          <span
            style={{ fontFamily: "Arial, sans-serif" }}
            className={`text-[8.5px] font-black leading-none ${
              isMapDark
                ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
            }`}
          >
            {formatMessageTime(item.ts)}
          </span>
        </div>
      </motion.div>

      <ChatStatusIndicator
        isMe={isMe}
        item={item}
        isMapDark={isMapDark}
        onResendMessage={onResendMessage}
      />
    </div>
  );
}
