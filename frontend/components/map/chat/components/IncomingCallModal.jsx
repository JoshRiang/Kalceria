"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";

export function IncomingCallModal({
  incomingCall,
  isMapDark = true,
  onAccept,
  onDecline,
}) {
  if (!incomingCall) return null;

  const caller = incomingCall.callerUser || {
    id: incomingCall.fromUserId,
    name: "Kalcerian",
    displayName: "Kalcerian",
  };
  const displayName = caller.displayName || caller.name || "Kalcerian";
  const avatarUrl = resolvePersistentAvatarUrl(caller);
  const isVideo = incomingCall.callMode === "video";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className={`relative w-full max-w-[340px] rounded-3xl p-6 border text-center shadow-2xl flex flex-col items-center overflow-hidden ${
            isMapDark
              ? "bg-[#161b22] border-white/20 text-[#f0f6fc]"
              : "bg-white border-black text-[#1f2328]"
          }`}
        >
          {/* Incoming Call Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase mb-5 bg-[#ff006e]/15 text-[#ff006e] border border-[#ff006e]/30">
            <span className="w-2 h-2 rounded-full bg-[#ff006e] animate-ping" />
            {isVideo ? "Panggilan Video Masuk" : "Panggilan Suara Masuk"}
          </div>

          {/* Caller Avatar with Animated Glow Rings */}
          <div className="relative mb-4 flex items-center justify-center">
            <span className="absolute w-28 h-28 rounded-full bg-[#ff006e]/20 animate-ping" />
            <span className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-xl">
              <ContentImage
                src={avatarUrl}
                alt={displayName}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Caller Name */}
          <h3 className="text-lg font-black tracking-tight mb-1">{displayName}</h3>
          <p
            className={`text-xs mb-6 ${
              isMapDark ? "text-white/70" : "text-black/70"
            }`}
          >
            Menghubungi Anda via {isVideo ? "Video Call" : "Voice Call"}...
          </p>

          {/* Accept / Decline Buttons */}
          <div className="w-full flex items-center justify-around gap-4 px-2">
            {/* Decline Button (Red) */}
            <button
              type="button"
              onClick={onDecline}
              title="Tolak Panggilan"
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform group-hover:scale-110 group-active:scale-95">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1 0-1.37C3.44 8.78 7.49 7 12 7s8.56 1.78 11.71 4.71c.38.38.38 1 0 1.38l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-red-500">Tolak</span>
            </button>

            {/* Accept Button (Green) */}
            <button
              type="button"
              onClick={onAccept}
              title="Terima Panggilan"
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-110 group-active:scale-95">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.27.36-.66.25-1.01A11.36 11.36 0 0 1 8.56 4.4c0-.55-.45-1-1-1H4.07c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1z" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500">Terima</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

