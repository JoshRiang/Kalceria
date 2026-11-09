"use client";

export function ChatStatusIndicator({
  isMe,
  item,
  isMapDark,
  onResendMessage,
}) {
  if (!isMe) return null;

  const isRead = item.status === "read" || Boolean(item.isRead);

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
          title="Kirim ulang pesan"
          className="cursor-pointer transition-transform hover:scale-110 active:scale-90 text-[#ff0033] hover:text-[#ff3355] drop-shadow-[0_0_8px_rgba(255,0,51,0.7)]"
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
      ) : (
        /* Sent / Read: Checkmark (white/black when sent, gracefully fades to dark camo green #3d5c3a when read, no exclamation mark) */
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 stroke-current filter transition-colors duration-500 ease-in-out ${
            isRead
              ? "text-[#3d5c3a] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]"
              : isMapDark
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
}
