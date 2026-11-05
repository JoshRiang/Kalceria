"use client";

export function ChatSelectionBar({
  isMapDark,
  selectedMsgIds,
  handleCopySelectedMessages,
  handleDeleteSelectedMessages,
  setSelectMode,
  setSelectedMsgIds,
}) {
  const textColor = isMapDark ? "text-white" : "text-black";

  return (
    <div
      className={`px-3 py-2 flex items-center justify-between border-t shrink-0 select-none ${
        isMapDark ? "bg-[#202c33] border-white/10 text-white" : "bg-white border-black/10 text-black"
      }`}
    >
      <span
        style={{ fontFamily: "Arial, sans-serif" }}
        className="text-[11.5px] font-semibold tracking-tight"
      >
        {selectedMsgIds.length} selected
      </span>

      <div className="flex items-center gap-4">
        {/* Copy Button: No outer box, copy icon on left, mini text, black in light mode, white in dark mode */}
        <button
          type="button"
          disabled={!selectedMsgIds.length}
          onClick={handleCopySelectedMessages}
          className={`flex items-center gap-1.5 text-[11.5px] font-semibold cursor-pointer transition-transform active:scale-95 disabled:opacity-35 ${textColor}`}
          title="Copy selected messages"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy</span>
        </button>

        {/* Delete Button: No outer box, trashcan icon on left, same font/behavior, black in light mode, white in dark mode */}
        <button
          type="button"
          disabled={!selectedMsgIds.length}
          onClick={handleDeleteSelectedMessages}
          className={`flex items-center gap-1.5 text-[11.5px] font-semibold cursor-pointer transition-transform active:scale-95 disabled:opacity-35 ${textColor}`}
          title="Delete selected messages"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 shrink-0"
            fill="currentColor"
          >
            <path d="M6 7H18V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V7ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" />
          </svg>
          <span>Delete</span>
        </button>

        {/* Done Button: Same size, font, and behaviour as Copy, no outer box */}
        <button
          type="button"
          onClick={() => {
            setSelectMode(false);
            setSelectedMsgIds([]);
          }}
          className={`flex items-center text-[11.5px] font-semibold cursor-pointer transition-transform active:scale-95 ${textColor}`}
          title="Done selecting"
        >
          <span>Done</span>
        </button>
      </div>
    </div>
  );
}
