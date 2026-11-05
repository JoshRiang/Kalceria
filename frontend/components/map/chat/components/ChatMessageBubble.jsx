"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatMessageTime } from "../hooks/usePersonalChatState";

function getFallbackWaveform(id, duration = 4) {
  const count = 24;
  const bars = [];
  let seed = 0;
  for (let i = 0; i < (id || "").length; i++) {
    seed += id.charCodeAt(i);
  }
  for (let i = 0; i < count; i++) {
    const val = 14 + Math.abs(Math.sin((i + seed) * 0.45) * 65) + ((i % 3) * 8);
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

  // Dedicated Call Log Bubble: Large icon without outerbox, with duration timestamp to the LEFT of the icon
  if (item.msgType === "call") {
    const isVideo = item.callMode === "video";
    const durationText = formatCallDurationTwoUnits(item.callDuration || 0);

    return (
      <div
        onClick={() => {
          if (selectMode) handleToggleSelectMsg(item.id);
        }}
        className={`flex items-center gap-2 ${
          isMe ? "justify-end mr-2.5" : "justify-start ml-0.5"
        } ${selectMode ? "cursor-pointer" : ""} my-2.5`}
      >
        {selectMode && (
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
        )}

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
            className={`text-[9.5px] sm:text-[10px] font-bold tracking-tight select-none leading-none ${
              isMapDark ? "text-white/70" : "text-black/70"
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
      </div>
    );
  }

  const isVideoMedia =
    item.mediaUrl &&
    (/\.(mp4|webm|ogg)($|\?)/i.test(item.mediaUrl) ||
      /^data:video/i.test(item.mediaUrl));

  const isVoice = item.msgType === "voice";
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

  // Fixed 24 bars for consistent waveform width across all voice note durations
  const displayWaveform = (() => {
    if (!rawWaveform.length) return [];
    if (rawWaveform.length === 24) return rawWaveform;
    const step = rawWaveform.length / 24;
    const sampled = [];
    for (let i = 0; i < 24; i++) {
      const idx = Math.floor(i * step);
      sampled.push(rawWaveform[idx] || 12);
    }
    return sampled;
  })();

  // Vocal spike detection for Coki Speak: when active energy at current progress exceeds threshold
  const currentSampleIdx = Math.floor(playbackProgress * (displayWaveform.length || 1));
  const currentEnergy = displayWaveform[currentSampleIdx] || 0;
  const isSpeakingNow = isPlaying && currentEnergy >= 22;

  // Audio Playback Controller
  useEffect(() => {
    if (!isVoice || !item.mediaUrl) return;

    if (isPlaying) {
      if (!audioRef.current) {
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

      audioRef.current.play().catch(() => {
        setPlayingVoiceId(null);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isVoice, item.mediaUrl, setPlayingVoiceId]);

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
  const handleSeekRatio = useCallback((ratio) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const targetTime = ratio * audioRef.current.duration;
    audioRef.current.currentTime = targetTime;
    setPlaybackProgress(ratio);
    setCurrentPlaybackSec(Math.floor(targetTime));
  }, []);

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

  const totalDuration = item.voiceDuration || 4;

  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex flex-col ${
        isMe ? "items-end mr-2.5" : "items-start ml-0.5"
      } ${selectMode ? "cursor-pointer" : ""}`}
    >
      {/* COKI IDLE & SPEAK FLOATING MASCOT ABOVE VOICE NOTE */}
      {isVoice && (
        <motion.div
          animate={{ y: [0, -2.5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-12 h-14 -mb-1 select-none pointer-events-none drop-shadow-sm flex items-center justify-center"
        >
          <Image
            src={isSpeakingNow ? "/ForChat/Coki_Speak_Trimmed.png" : "/ForChat/Coki_Idle_Trimmed.png"}
            alt="Coki Voice Mascot"
            width={48}
            height={56}
            className="w-full h-full object-contain"
            priority
          />
        </motion.div>
      )}

      <div className={`flex items-center gap-2 ${isMe ? "justify-end" : "justify-start"} w-full`}>
        {selectMode && (
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
        )}

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
          {/* Media Attachment Preview (Photo or Video <= 1 min) */}
          {item.mediaUrl && !isVoice && (
            <div className="mb-1.5 rounded-lg overflow-hidden border border-current/15 max-h-[190px]">
              {isVideoMedia ? (
                <video
                  src={item.mediaUrl}
                  controls
                  playsInline
                  className="w-full max-h-[190px] object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.mediaUrl}
                  alt="Chat attachment"
                  className="w-full max-h-[190px] object-cover"
                />
              )}
            </div>
          )}

          {/* Voice Note Player (Fixed Width, Hold & Drag Scrubbing, No Outer Box on Play) */}
          {isVoice ? (
            <div className="flex flex-col gap-1 min-w-[210px] sm:min-w-[225px] py-0.5 select-none">
              <div className="flex items-center gap-2 w-full">
                {/* Play Button: No outer box */}
                <div className="flex flex-col items-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayingVoiceId((prev) => (prev === item.id ? null : item.id));
                    }}
                    className={`w-7 h-7 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90 ${
                      isMapDark ? "text-white" : "text-black"
                    }`}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <rect x="6" y="5" width="4" height="14" />
                        <rect x="14" y="5" width="4" height="14" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5">
                        <polygon points="6,4 20,12 6,20" />
                      </svg>
                    )}
                  </button>

                  {/* Playback time under play button with white outer box badge */}
                  <span
                    style={{ fontFamily: "Arial, sans-serif" }}
                    className="mt-0.5 px-1 py-0.2 rounded bg-white text-black text-[8.5px] font-bold shadow-xs border border-black/10 tracking-tight leading-none"
                  >
                    {isPlaying
                      ? `0:${String(currentPlaybackSec).padStart(2, "0")}`
                      : `0:${String(totalDuration).padStart(2, "0")}`}
                  </span>
                </div>

                {/* Fixed-Width Waveform Bars with Hold & Drag Scrubbing */}
                <div
                  ref={waveformRef}
                  onPointerDown={handlePointerDownWaveform}
                  className="flex-1 flex items-center gap-[2.5px] h-6 cursor-pointer py-1 touch-none"
                >
                  {displayWaveform.map((val, i) => {
                    const barRatio = (i + 1) / displayWaveform.length;
                    const isPlayed = isPlaying && barRatio <= playbackProgress;
                    const heightPx = Math.max(3.5, Math.round((val / 100) * 20));

                    return (
                      <span
                        key={i}
                        style={{ height: `${heightPx}px` }}
                        className={`w-[2px] rounded-full transition-colors duration-75 ${
                          isPlayed
                            ? "bg-emerald-400"
                            : isPlaying
                            ? isMapDark
                              ? "bg-white/40"
                              : "bg-black/35"
                            : isMapDark
                            ? "bg-white/75"
                            : "bg-black/75"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Time Mark (no outer box) placed cleanly at bottom right */}
              <div className="flex items-center justify-end gap-1.5 mt-0.5 select-none">
                <span
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className={`text-[9.5px] font-normal leading-none ${
                    isMapDark ? "text-white/65" : "text-black/65"
                  }`}
                >
                  {formatMessageTime(item.ts)}
                </span>

                {/* Status indicator */}
                {isMe && (
                  <span className="inline-flex items-center justify-center shrink-0">
                    {item.status === "sending" ? (
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-[1.5px] border-current/25 border-t-current animate-spin block ${
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
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90 shadow-xs ${
                          isMapDark
                            ? "bg-white border border-black text-black"
                            : "bg-black border border-white text-white"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-2.5 h-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                    ) : item.status === "sent" ? (
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold font-sans ${
                          isMapDark
                            ? "bg-white text-black"
                            : "bg-black text-white"
                        }`}
                      >
                        !
                      </span>
                    ) : (
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs ${
                          isMapDark
                            ? "bg-white border border-black text-black"
                            : "bg-black border border-white text-white"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-2.5 h-2.5 stroke-current"
                          fill="none"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              {item.text && (
                <span className="break-words whitespace-pre-wrap pr-12">{item.text}</span>
              )}

              {/* Timestamp + Status Indicator (Sending spinner -> Sent exclamation -> Read checkmark -> Failed resend) */}
              <span
                style={{ fontFamily: "Arial, sans-serif" }}
                className={`inline-flex items-center gap-1 float-right ml-2 mt-1 text-[9.5px] leading-none select-none ${
                  isMapDark ? "text-white/70" : "text-black/70"
                }`}
              >
                <span>{formatMessageTime(item.ts)}</span>

                {isMe && (
                  <span className="inline-flex items-center justify-center shrink-0">
                    {item.status === "sending" ? (
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-[1.5px] border-current/25 border-t-current animate-spin block ${
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
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90 shadow-xs ${
                          isMapDark
                            ? "bg-white border border-black text-black"
                            : "bg-black border border-white text-white"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-2.5 h-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                    ) : item.status === "sent" ? (
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold font-sans ${
                          isMapDark
                            ? "bg-white text-black"
                            : "bg-black text-white"
                        }`}
                      >
                        !
                      </span>
                    ) : (
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs ${
                          isMapDark
                            ? "bg-white border border-black text-black"
                            : "bg-black border border-white text-white"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-2.5 h-2.5 stroke-current"
                          fill="none"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
