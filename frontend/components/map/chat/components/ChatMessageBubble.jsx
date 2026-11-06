"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatMessageTime } from "../hooks/usePersonalChatState";
import { ChatMediaCard } from "./ChatMediaCard";

function getFallbackWaveform(id, duration = 4) {
  const count = 14;
  const bars = [];
  let seed = 0;
  for (let i = 0; i < (id || "").length; i++) {
    seed += id.charCodeAt(i);
  }
  for (let i = 0; i < count; i++) {
    const val = 14 + Math.abs(Math.sin((i + seed) * 0.55) * 65) + ((i % 3) * 8);
    bars.push(Math.min(100, Math.round(val)));
  }
  return bars;
}

export function formatCallDurationTwoUnits(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `0m ${String(seconds).padStart(2, "0")}s`;
}

export function ChatMessageBubble({
  item,
  myId,
  isMapDark,
  selectMode,
  selectedMsgIds,
  handleToggleSelectMsg,
  playingVoiceId,
  setPlayingVoiceId,
  onResendMessage,
  replyingTo,
  onOpenContextMenu,
}) {
  const isMe = String(item.senderId) === myId;
  const isSelected = selectedMsgIds.includes(item.id);
  const isReplyingTarget = replyingTo?.id === item.id;

  const isVoice = item.msgType === "voice";
  const isMedia = item.mediaUrl && !isVoice;
  const isPlaying = playingVoiceId === item.id;

  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState(0);
  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  const rawWaveform = Array.isArray(item.voiceWaveform) && item.voiceWaveform.length > 0
    ? item.voiceWaveform
    : isVoice
    ? getFallbackWaveform(item.id, item.voiceDuration || 4)
    : [];

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

  const totalDuration = item.voiceDuration || 4;

  // Syllable flap calculation for natural speech cadence:
  // Starts idle (first 0.25s) and ends idle (last 0.25s), oscillates between syllables
  const isSpeakingNow = (() => {
    if (!isPlaying || !audioRef.current) return false;
    const dur = audioRef.current.duration || totalDuration || 4;
    const cur = audioRef.current.currentTime || (playbackProgress * dur);
    if (cur < 0.25 || cur > dur - 0.25) return false;

    // Flap mouth with human speech syllable cadence (~3.2 Hz) when energy is present:
    const flapCycle = Math.floor(cur * 6.5) % 2 === 0;
    const currentSampleIdx = Math.floor(playbackProgress * (displayWaveform.length || 1));
    const currentEnergy = displayWaveform[currentSampleIdx] || 0;
    return flapCycle && currentEnergy >= 26;
  })();

  // Audio Playback Controller & Instance Management
  const getOrCreateAudio = useCallback(() => {
    if (!audioRef.current && item.mediaUrl) {
      const audio = new Audio(item.mediaUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration && Number.isFinite(audio.duration)) {
          const ratio = audio.currentTime / audio.duration;
          setPlaybackProgress(Math.min(1, Math.max(0, ratio)));
          setCurrentPlaybackSec(Math.floor(audio.currentTime));
        }
      };

      audio.onended = () => {
        setPlayingVoiceId(null);
        setPlaybackProgress(0);
        setCurrentPlaybackSec(0);
      };

      audio.onerror = () => {
        setPlayingVoiceId(null);
        setPlaybackProgress(0);
      };
    }
    return audioRef.current;
  }, [item.mediaUrl, setPlayingVoiceId]);

  useEffect(() => {
    if (!isVoice || !item.mediaUrl) return;

    if (isPlaying) {
      const audio = getOrCreateAudio();
      if (audio) {
        audio.play().catch(() => {
          setPlayingVoiceId(null);
        });
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isVoice, item.mediaUrl, setPlayingVoiceId, getOrCreateAudio]);

  useEffect(() => {
    return () => {
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
        const dur = audio.duration || totalDuration || 4;
        const targetTime = Math.min(dur, Math.max(0, ratio * dur));
        audio.currentTime = targetTime;
        setPlaybackProgress(ratio);
        setCurrentPlaybackSec(Math.floor(targetTime));
      };

      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        applySeek();
      } else {
        audio.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    },
    [getOrCreateAudio, totalDuration]
  );

  const handlePointerDownWaveform = (e) => {
    e.stopPropagation();
    if (!waveformRef.current) return;
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

  // Status Indicator Component (OUTSIDE box, aligned to middle point, NO outer circle, bold & thick)
  const renderStatusIndicator = () => {
    if (!isMe) return null;

    return (
      <div className="w-4 shrink-0 flex items-center justify-center select-none">
        {item.status === "sending" ? (
          <span
            className={`w-3.5 h-3.5 rounded-full border-[2.5px] border-current/25 border-t-current animate-spin block ${
              isMapDark ? "text-white" : "text-black"
            }`}
          />
        ) : item.status === "failed" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResendMessage?.(item);
            }}
            title="Kirim ulang"
            className={`cursor-pointer transition-transform active:scale-90 ${
              isMapDark ? "text-white" : "text-black"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        ) : item.status === "sent" ? (
          <span
            style={{ fontFamily: "Arial, sans-serif" }}
            className={`font-black text-xs ${
              isMapDark
                ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
            }`}
          >
            !
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 stroke-current filter ${
              isMapDark
                ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
            }`}
            fill="none"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    );
  };

  // Mini Checklist Checkbox
  const renderMiniCheckbox = () => {
    if (!selectMode) return null;
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleToggleSelectMsg(item.id);
        }}
        className={`w-3 h-3 rounded-[3px] border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
          isSelected
            ? isMapDark
              ? "bg-white border-white text-black"
              : "bg-black border-black text-white"
            : isMapDark
            ? "border-white/40 bg-transparent"
            : "border-black/40 bg-transparent"
        }`}
      >
        {isSelected && (
          <svg viewBox="0 0 24 24" className="w-2 h-2 stroke-current" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    );
  };

  // Dedicated Call Log Bubble
  if (item.msgType === "call") {
    const isVideo = item.callMode === "video";
    const durationText = formatCallDurationTwoUnits(item.callDuration || 0);

    return (
      <div
        onClick={() => {
          if (selectMode) handleToggleSelectMsg(item.id);
        }}
        className={`flex items-center gap-1.5 ${
          isMe ? "justify-end mr-1" : "justify-start ml-0.5"
        } ${selectMode ? "cursor-pointer" : ""} my-2.5`}
      >
        {renderMiniCheckbox()}

        {/* Timestamp aligned to the LEFT of the Phone / Video Icon */}
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenContextMenu?.(e, item);
          }}
          className={`flex items-center gap-2 select-none pr-1 transition-all duration-200 ${
            isSelected ? "scale-[1.04]" : "scale-100"
          } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
        >
          <span
            style={{ fontFamily: "Arial, sans-serif" }}
            className={`text-[8.5px] sm:text-[9px] font-black tracking-tight select-none leading-none ${
              isMapDark
                ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
            }`}
          >
            {durationText}
          </span>

          {isVideo ? (
            <svg
              viewBox="0 0 24 24"
              className={`w-9 h-9 sm:w-10 sm:h-10 drop-shadow-sm shrink-0 ${
                isMapDark ? "text-white" : "text-black"
              }`}
              fill="currentColor"
            >
              <path d="M17 10.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className={`w-9 h-9 sm:w-10 sm:h-10 drop-shadow-sm shrink-0 ${
                isMapDark ? "text-white" : "text-black"
              }`}
              fill="currentColor"
            >
              <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
            </svg>
          )}
        </div>

        {renderStatusIndicator()}
      </div>
    );
  }

  // Voice Note Message (NO outer message box, compact under Coki, right-aligned bold time mark)
  if (isVoice) {
    return (
      <div
        onClick={() => {
          if (selectMode) handleToggleSelectMsg(item.id);
        }}
        className={`flex items-center gap-1.5 ${
          isMe ? "justify-end mr-1" : "justify-start ml-0.5"
        } ${selectMode ? "cursor-pointer" : ""} my-1`}
      >
        {renderMiniCheckbox()}

        {/* Compact Voice Note Column (NO outer message box) */}
        <div
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

            {/* Voice Control Row: Play Button, Waveform centered under Coki, and Time Running (all mid-center aligned) */}
            <div className="flex items-center gap-2 py-0.5 select-none">
              {/* 1. Play Button: Aligned to mid-center of voice line */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayingVoiceId((prev) => (prev === item.id ? null : item.id));
                }}
                className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90 shrink-0 ${
                  isMapDark ? "text-white" : "text-black"
                }`}
                title={isPlaying ? "Pause" : "Play voice note"}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <rect x="6" y="5" width="4" height="14" />
                    <rect x="14" y="5" width="4" height="14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current ml-0.5">
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

              {/* 3. Time Running (0:06): NO outer box, mid-center aligned with voice line, bold/tebal mini */}
              <span
                style={{ fontFamily: "Arial, sans-serif" }}
                className={`text-[8.5px] font-black tracking-tight leading-none select-none shrink-0 ${
                  isMapDark
                    ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                    : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
                }`}
              >
                {isPlaying || playbackProgress > 0
                  ? `0:${String(currentPlaybackSec).padStart(2, "0")}`
                  : `0:${String(totalDuration).padStart(2, "0")}`}
              </span>
            </div>
          </div>

          {/* Time mark directly below VN line, flush right, Arial bold/tebal mini */}
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
        </div>

        {renderStatusIndicator()}
      </div>
    );
  }

  // Media Attachment Card (Photo / Video with 3D Flip & Typing Animation)
  if (isMedia) {
    return (
      <div
        onClick={() => {
          if (selectMode) handleToggleSelectMsg(item.id);
        }}
        className={`flex items-center gap-1.5 ${
          isMe ? "justify-end mr-1" : "justify-start ml-0.5"
        } ${selectMode ? "cursor-pointer" : ""} my-1.5`}
      >
        {renderMiniCheckbox()}

        <div
          className={`transition-all duration-200 ${
            isSelected ? "scale-[1.035] shadow-lg z-10" : "scale-100"
          } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
        >
          <ChatMediaCard
            item={item}
            isMapDark={isMapDark}
            isMe={isMe}
            onOpenContextMenu={onOpenContextMenu}
          />

          {/* Sent time mark: bold Arial mini, consistent with voice note and call log */}
          <div className="flex justify-end mt-1 pr-1 select-none">
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
        </div>

        {renderStatusIndicator()}
      </div>
    );
  }

  // Standard Text Message Bubble
  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex items-center gap-1.5 ${
        isMe ? "justify-end mr-1" : "justify-start ml-0.5"
      } ${selectMode ? "cursor-pointer" : ""} my-1`}
    >
      {renderMiniCheckbox()}

      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu?.(e, item);
        }}
        className={`relative max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-snug shadow-sm border transition-all duration-200 ${
          isSelected ? "scale-[1.035] shadow-lg z-10" : "scale-100"
        } ${
          isMe
            ? item.status === "failed"
              ? isMapDark
                ? "bg-red-700/85 border-red-500 text-white rounded-tr-xs"
                : "bg-red-600/85 border-red-700 text-black rounded-tr-xs"
              : isMapDark
              ? "bg-black border-white/20 text-white rounded-tr-xs"
              : "bg-white border-black text-black rounded-tr-xs"
            : isMapDark
            ? "bg-[#161b22] border-white/15 text-white rounded-tl-xs"
            : "bg-[#f4f4f5] border-black text-black rounded-tl-xs"
        } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
      >
        {/* Reply Reference Card (standard Line/WA/IG quote) */}
        {item.replyTo && (
          <div
            className={`mb-1.5 px-2 py-1 rounded-md text-[10.5px] leading-tight select-none border-l-2 ${
              isMapDark
                ? "bg-white/10 border-white text-white/90"
                : "bg-black/5 border-black text-black/90"
            }`}
          >
            <p
              style={{ fontFamily: "Arial, sans-serif" }}
              className="font-bold text-[9.5px] opacity-80"
            >
              {item.replyTo.senderName || "Kalcerian"}
            </p>
            <p
              style={{ fontFamily: "Arial, sans-serif" }}
              className="truncate opacity-75 mt-0.5 text-[10px]"
            >
              {item.replyTo.text || "Pesan"}
            </p>
          </div>
        )}

        {/* Message Text */}
        <span className="break-words whitespace-pre-wrap pr-12">{item.text}</span>

        {/* Sent Time Mark (Bottom Right inside bubble) */}
        <span
          style={{ fontFamily: "Arial, sans-serif" }}
          className={`float-right ml-2 mt-1 text-[9.5px] font-bold leading-none select-none ${
            isMapDark ? "text-white/80" : "text-black/80"
          }`}
        >
          {formatMessageTime(item.ts)}
        </span>
      </div>

      {/* Status indicator outside the box, middle point aligned */}
      {renderStatusIndicator()}
    </div>
  );
}
