"use client";

export function ChatMiniCheckbox({
  selectMode,
  isSelected,
  isMapDark,
  onToggleSelect,
}) {
  if (!selectMode) return null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect?.();
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
}
