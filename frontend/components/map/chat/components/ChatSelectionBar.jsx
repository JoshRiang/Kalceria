"use client";

export function ChatSelectionBar({
  isMapDark,
  selectedMsgIds,
  handleCopySelectedMessages,
  handleDeleteSelectedMessages,
  setSelectMode,
  setSelectedMsgIds,
}) {
  return (
    <div
      className={`px-3 py-2.5 flex items-center justify-between border-t shrink-0 ${
        isMapDark ? "bg-[#202c33] border-white/15 text-white" : "bg-white border-black text-black"
      }`}
    >
      <span className="text-xs font-semibold">
        {selectedMsgIds.length} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!selectedMsgIds.length}
          onClick={handleCopySelectedMessages}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer disabled:opacity-40 ${
            isMapDark ? "border-white/25 hover:bg-white/10" : "border-black hover:bg-black/5"
          }`}
        >
          Copy
        </button>
        <button
          type="button"
          disabled={!selectedMsgIds.length}
          onClick={handleDeleteSelectedMessages}
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#ef4444] text-white hover:bg-[#dc2626] cursor-pointer disabled:opacity-40"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectMode(false);
            setSelectedMsgIds([]);
          }}
          className="px-2 py-1 text-xs opacity-75 hover:opacity-100 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

