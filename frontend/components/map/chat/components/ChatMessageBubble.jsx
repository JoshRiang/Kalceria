"use client";

import { useState, useRef, useEffect } from "react";
import { formatMessageTime } from "../hooks/usePersonalChatState";

function getFallbackWaveform(id, duration = 4) {
  // Deterministic natural voice pattern for messages without recorded waveform
  const count = Math.min(30, Math.max(16, duration * 4));
  const bars = [];
  let seed = 0;
  for (let i = 0; i < (id || "").length; i++) {
    seed += id.charCodeAt(i);
  }
  for (let i = 0; i < count; i++) {
    const val = 12 + Math.abs(Math.sin((i + seed) * 0.45) * 65) + ((i % 3) * 8);
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
}) {
  const isMe = String(item.senderId) === myId;
  const isSelected = selectedMsgIds.includes(item.id);

  // Dedicated Call Log Bubble: Large icon without outerbox, with white duration badge at bottom right
  if (item.msgType === "call") {
    const isVideo = item.callMode === "video";
    const durationText = formatCallDurationTwoUnits(item.callDuration || 0);

    return (
      <div
        onClick={() => {
          if (selectMode) handleToggleSelectMsg(item.id);
        }}
        className={`flex items-center gap-2 ${
          isMe ? "justify-end" : "justify-start"
        } ${selectMode ? "cursor-pointer" : ""} my-2`}
      >
        {selectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelectMsg(item.id)}
            className="w-3.5 h-3.5 accent-black cursor-pointer shrink-0"
          />
        )}

        <div className="relative inline-flex items-center justify-center p-1 select-none">
          {isVideo ? (
            <svg
              viewBox="0 0 24 24"
              className={`w-11 h-11 drop-shadow-sm ${
                isMapDark ? "text-white" : "text-black"
              }`}
              fill="currentColor"
            >
              <path d="M17 10.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className={`w-10 h-10 drop-shadow-sm ${
                isMapDark ? "text-white" : "text-black"
              }`}
              fill="currentColor"
            >
              <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" />
            </svg>
          )}

          {/* White badge at bottom-right showing formatted duration */}
          <span
            style={{ fontFamily: "Arial, sans-serif" }}
            className="absolute -bottom-1 -right-2 px-1.5 py-0.5 rounded bg-white text-black text-[9.5px] font-bold shadow-md border border-black/15 tracking-tight leading-none whitespace-nowrap"
          >
            {durationText}
          </span>
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

  const rawWaveform = Array.isArray(item.voiceWaveform) && item.voiceWaveform.length > 0
    ? item.voiceWaveform
    : isVoice
    ? getFallbackWaveform(item.id, item.voiceDuration || 4)
    : [];

  // Downsample or slice waveform to fit comfortably in bubble (24 bars)
  const displayWaveform = (() => {
    if (!rawWaveform.length) return [];
    if (rawWaveform.length <= 26) return rawWaveform;
    const step = rawWaveform.length / 24;
    const sampled = [];
    for (let i = 0; i < 24; i++) {
      const idx = Math.floor(i * step);
      sampled.push(rawWaveform[idx] || 10);
    }
    return sampled;
  })();

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

  const handleSeek = (e, barIndex, totalBars) => {
    e.stopPropagation();
    if (!audioRef.current || !audioRef.current.duration) return;
    const ratio = (barIndex + 1) / totalBars;
    audioRef.current.currentTime = ratio * audioRef.current.duration;
    setPlaybackProgress(ratio);
    if (!isPlaying) {
      setPlayingVoiceId(item.id);
    }
  };

  const totalDuration = item.voiceDuration || 4;

  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex items-center gap-2 ${
        isMe ? "justify-end" : "justify-start"
      } ${selectMode ? "cursor-pointer" : ""}`}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleToggleSelectMsg(item.id)}
          className="w-3.5 h-3.5 accent-black cursor-pointer shrink-0"
        />
      )}

      <div
        className={`relative max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-snug shadow-sm border transition-all ${
          isSelected ? "ring-2 ring-[#ff006e]" : ""
        } ${
          isMe
            ? isMapDark
              ? "bg-[#005c4b] border-emerald-400/25 text-white rounded-tr-xs"
              : "bg-white border-black text-black rounded-tr-xs"
            : isMapDark
            ? "bg-[#202c33] border-white/15 text-white rounded-tl-xs"
            : "bg-[#f4f4f5] border-black text-black rounded-tl-xs"
        }`}
      >
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

        {/* Real-time Sampled Voice Note Bubble (Instagram / WhatsApp style) */}
        {isVoice ? (
          <div className="flex items-center gap-2 min-w-[195px] py-1 select-none">
            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPlayingVoiceId((prev) => (prev === item.id ? null : item.id));
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-90 ${
                isMapDark ? "bg-white text-black" : "bg-black text-white"
              }`}
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

            {/* Dynamic Waveform Bars (sample points raising from baseline) */}
            <div className="flex-1 flex items-center gap-0.5 h-6 cursor-pointer py-1">
              {displayWaveform.map((val, i) => {
                const barRatio = (i + 1) / displayWaveform.length;
                const isPlayed = isPlaying && barRatio <= playbackProgress;
                // Height between 4px (baseline) and 20px (loud)
                const heightPx = Math.max(4, Math.round((val / 100) * 20));

                return (
                  <span
                    key={i}
                    onClick={(e) => handleSeek(e, i, displayWaveform.length)}
                    style={{ height: `${heightPx}px` }}
                    className={`w-1 rounded-full transition-colors duration-100 ${
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

            {/* Duration Display */}
            <span className="text-[10px] font-mono opacity-85 shrink-0 pl-1">
              {isPlaying
                ? `0:${String(currentPlaybackSec).padStart(2, "0")}`
                : `0:${String(totalDuration).padStart(2, "0")}`}
            </span>
          </div>
        ) : (
          item.text && (
            <span className="break-words whitespace-pre-wrap pr-12">{item.text}</span>
          )
        )}

        {/* Timestamp + WhatsApp Double Check Ticks */}
        <span
          className={`inline-flex items-center gap-1 float-right ml-2 mt-1 text-[9.5px] leading-none select-none ${
            isMapDark ? "text-white/70" : "text-black/70"
          }`}
        >
          <span>{formatMessageTime(item.ts)}</span>
          {isMe && (
            <svg
              viewBox="0 0 16 11"
              className={`w-3.5 h-2.5 ${
                isMapDark ? "text-[#53bdeb]" : "text-black"
              }`}
              fill="currentColor"
            >
              <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .501.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.337-.273zm3.61 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.134-.66.813 1.723 1.723a.724.724 0 0 0 .502.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.4-.261z" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}
