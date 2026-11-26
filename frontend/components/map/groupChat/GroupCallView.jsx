"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import { startEventGroupCall, leaveEventGroupCall } from "@/lib/api";

function formatSecs(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function GroupCallView({
  event,
  initialMode = "voice",
  currentUser,
  members = [],
  isMapDark,
  avatarUrl,
  onLeaveCall,
}) {
  const [mode, setMode] = useState(initialMode === "video" ? "video" : "voice");
  const [status, setStatus] = useState("connecting"); // "connecting" | "connected" | "in_another_call" | "ended"
  const [participantIds, setParticipantIds] = useState([]);
  const [busyMemberIds, setBusyMemberIds] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(initialMode !== "video");
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      try {
        const res = await startEventGroupCall(event.id, initialMode);
        if (!alive) return;
        joinedRef.current = true;
        setParticipantIds(res?.call?.participantIds || [String(currentUser?.id)]);
        setBusyMemberIds(res?.busyMemberIds || []);
        setStatus("connected");

        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: initialMode === "video",
            });
            if (!alive) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            if (localVideoRef.current && initialMode === "video") {
              localVideoRef.current.srcObject = stream;
            }
          } catch {
            // Audio/camera fallback without breaking call session
          }
        }
      } catch (err) {
        if (!alive) return;
        if (err?.response?.status === 409 || err?.response?.data?.busy) {
          setStatus("in_another_call");
          setTimeout(() => {
            if (alive) onLeaveCall?.();
          }, 2600);
        } else {
          setStatus("ended");
          setTimeout(() => {
            if (alive) onLeaveCall?.();
          }, 1200);
        }
      }
    };
    init();

    return () => {
      alive = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (joinedRef.current && event?.id) {
        joinedRef.current = false;
        leaveEventGroupCall(event.id).catch(() => {});
      }
    };
  }, [event?.id, initialMode, currentUser?.id, onLeaveCall]);

  useEffect(() => {
    if (status !== "connected") return undefined;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    streamRef.current?.getAudioTracks?.().forEach((t) => {
      t.enabled = !next;
    });
  };

  const toggleCamera = async () => {
    const nextCamOff = !isCamOff;
    if (!nextCamOff && mode === "voice") {
      setMode("video");
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const vTrack = videoStream.getVideoTracks()[0];
        if (vTrack) {
          if (!streamRef.current) streamRef.current = new MediaStream();
          streamRef.current.addTrack(vTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = streamRef.current;
        }
      } catch {}
    } else {
      streamRef.current?.getVideoTracks?.().forEach((t) => {
        t.enabled = !nextCamOff;
      });
    }
    setIsCamOff(nextCamOff);
  };

  const handleLeave = async () => {
    setStatus("ended");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (joinedRef.current && event?.id) {
      joinedRef.current = false;
      await leaveEventGroupCall(event.id).catch(() => {});
    }
    onLeaveCall?.();
  };

  const participantSet = new Set(participantIds.map(String));
  const busySet = new Set(busyMemberIds.map(String));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.24 }}
      className={`absolute inset-0 z-45 flex flex-col justify-between p-4 select-none ${
        isMapDark ? "bg-[#0d1418] text-white" : "bg-[#f8f9fa] text-black"
      }`}
    >
      {/* Top Meeting Call Header */}
      <div className="text-center pt-1">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 mb-1">
          Assign a Meeting · {mode === "video" ? "Group Video" : "Group Voice"}
        </span>
        <h3 className="font-bold text-base truncate">{event?.title || "Event Meeting"}</h3>
        <p className={`text-xs font-bold mt-0.5 ${status === "in_another_call" ? "text-[#ef4444]" : "opacity-75"}`}>
          {status === "in_another_call"
            ? "In Another Call"
            : status === "connecting"
            ? "Connecting meeting..."
            : status === "ended"
            ? "Call Ended"
            : `${formatSecs(seconds)} · ${participantIds.length} active`}
        </p>
      </div>

      {/* Center: Local Video Preview + N-Member Roster Grid */}
      <div className="flex-1 my-3 flex flex-col gap-2.5 min-h-0 overflow-y-auto modern-kalcerian-scrollbar">
        {mode === "video" && !isCamOff && (
          <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black border border-white/15 shrink-0">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-semibold">
              You (Live)
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {members.map((m) => {
            const isActive = participantSet.has(String(m.id));
            const isBusyElsewhere = busySet.has(String(m.id));
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-2.5 flex flex-col items-center text-center gap-1.5 ${
                  isActive
                    ? isMapDark
                      ? "bg-[#161b22] border-emerald-400/50"
                      : "bg-white border-emerald-500/50"
                    : isMapDark
                    ? "bg-[#161b22]/60 border-white/10 opacity-70"
                    : "bg-white/75 border-black/10 opacity-75"
                }`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden border border-current/20">
                  <ContentImage
                    src={avatarUrl(m)}
                    alt={m.displayName || m.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[11px] font-bold truncate w-full">{m.displayName || m.name}</p>
                <span
                  className={`text-[9.5px] font-semibold ${
                    isBusyElsewhere
                      ? "text-[#ef4444]"
                      : isActive
                      ? "text-emerald-500"
                      : "opacity-60"
                  }`}
                >
                  {isBusyElsewhere ? "In Another Call" : isActive ? "In Call" : "Invited"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-center gap-4 pb-1">
        <button
          type="button"
          onClick={toggleMic}
          title={isMicMuted ? "Unmute mic" : "Mute mic"}
          className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
            isMicMuted
              ? "bg-[#ef4444] text-white"
              : isMapDark
              ? "bg-white/15 text-white"
              : "bg-black/10 text-black"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          title={isCamOff ? "Turn on video" : "Turn off video"}
          className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
            !isCamOff
              ? "bg-emerald-500 text-white"
              : isMapDark
              ? "bg-white/15 text-white"
              : "bg-black/10 text-black"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleLeave}
          title="Leave meeting call"
          className="w-12 h-12 rounded-full bg-[#ef4444] text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-lg"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.77 7.46 7 12 7s8.66 1.77 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

