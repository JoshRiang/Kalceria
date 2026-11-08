"use client";

import { memo } from "react";

export const CardFront = memo(function CardFront({
  isMapDark,
  isFlipped,
  isViewOnce,
  isOnceOpened,
  item,
  captionFont,
  textSizeClass,
  typedText,
  hasFinishedTyping,
  isVideo,
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        pointerEvents: isFlipped ? "none" : "auto",
        transform: "rotateY(0deg) translateZ(0)",
      }}
      className={`w-full h-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 ${
        isMapDark
          ? "bg-[#0d1117] border border-white/20 text-white shadow-md"
          : "bg-white border border-black/15 text-black shadow-xs"
      }`}
    >
      {/* Once Seen Badge (Top Right): Persists even after viewing */}
      {isViewOnce && (
        <div
          className={`absolute top-2 right-2 z-20 flex items-center justify-center ${
            isMapDark ? "text-white" : "text-black"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M 12 3 A 9 9 0 0 0 12 21" strokeLinecap="round" />
            <path d="M 12 3 A 9 9 0 0 1 12 21" strokeDasharray="2 3.5" strokeLinecap="round" />
            <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold">1</text>
          </svg>
        </div>
      )}

      {/* Centered Caption Text with Typing Animation or Loading Buffer */}
      <div className="flex-1 w-full h-full flex items-center justify-center text-center px-1">
        {item.status === "sending" ? (
          <span
            className={`w-4 h-4 rounded-full border-[2.2px] border-current/25 border-t-current animate-spin block ${
              isMapDark ? "text-white" : "text-black"
            }`}
          />
        ) : (
          <p
            className={`${captionFont} ${textSizeClass} select-none break-words max-w-full font-normal ${
              isMapDark ? "text-white" : "text-black"
            }`}
          >
            {typedText || item.text || (isVideo ? "📹 Video" : "📷 Photo")}
            {!hasFinishedTyping && item.text && (
              <span
                className={`inline-block w-[1.5px] h-3 ml-0.5 align-middle animate-pulse ${
                  isMapDark ? "bg-white" : "bg-black"
                }`}
              />
            )}
          </p>
        )}
      </div>

      {/* Flip Hint Icon in bottom right: Dimmed & disabled if view-once card was already opened */}
      <div
        className={`w-full flex justify-end items-center ${
          isOnceOpened ? "opacity-20 cursor-not-allowed pointer-events-none" : "opacity-40"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
        </svg>
      </div>
    </div>
  );
});
