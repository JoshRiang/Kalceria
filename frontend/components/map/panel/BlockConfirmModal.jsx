"use client";

export function BlockConfirmModal({
  show,
  actionType, // "block" | "unblock"
  userName,
  isMapDark,
  onCancel,
  onConfirm,
}) {
  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-between px-3.5 sm:px-4 py-2 backdrop-blur-md rounded-xl transition-all ${
        isMapDark
          ? "bg-[#161b22]/75 border border-[#38404a]/80 text-[#f0f6fc] shadow-md"
          : "bg-white/75 border border-[#d1d5db]/90 text-[#1f2328] shadow-md"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="font-sans font-semibold text-[13px] sm:text-[13.5px] tracking-tight truncate mr-2"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {actionType === "block" ? `Block ${userName}?` : `Unblock ${userName}?`}
      </span>
      <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
        {/* Cancel ✕ */}
        <button
          type="button"
          onClick={onCancel}
          className="p-1 transition-transform hover:scale-125 active:scale-95 outline-none cursor-pointer"
          title="Cancel"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke={isMapDark ? "#ff6b6b" : "#cf222e"}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {/* Confirm ✓ */}
        <button
          type="button"
          onClick={onConfirm}
          className="p-1 transition-transform hover:scale-125 active:scale-95 outline-none cursor-pointer"
          title="Confirm"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke={isMapDark ? "#3fb950" : "#1a7f37"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
