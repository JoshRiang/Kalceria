"use client";

import { ActionArcSpinner } from "../ActionArcSpinner";

export function EventFormActions({
  isEditing,
  onPromptDeleteConfirm,
  busy,
  isEventFormValid,
  isModalDark,
}) {
  if (isEditing) {
    return (
      <div className="flex items-center justify-between mt-auto pt-3 shrink-0 px-1">
        {/* Left: Red Trashcan Icon Button with truly hollow/transparent interior cutouts (bolong & tidak berwarna) */}
        <button
          type="button"
          onClick={onPromptDeleteConfirm}
          disabled={busy}
          title="Delete Event"
          aria-label="Delete Event"
          className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer group flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <defs>
              <mask id="hollow-trashcan-mask">
                <rect x="0" y="0" width="24" height="24" fill="#ffffff" />
                {/* Hollow handle opening */}
                <rect x="9.6" y="4.2" width="4.8" height="1.8" rx="0.6" fill="#000000" />
                {/* Hollow lid separation line */}
                <line x1="5" y1="6.4" x2="19" y2="6.4" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" />
                {/* Hollow interior vertical slits */}
                <line x1="9.5" y1="9.5" x2="9.5" y2="17" stroke="#000000" strokeWidth="1.7" strokeLinecap="round" />
                <line x1="14.5" y1="9.5" x2="14.5" y2="17" stroke="#000000" strokeWidth="1.7" strokeLinecap="round" />
              </mask>
            </defs>
            <g mask="url(#hollow-trashcan-mask)">
              <path
                d="M 19 6 L 18.1 19.3 C 18 20.3 17.2 21 16.2 21 H 7.8 C 6.8 21 6 20.3 5.9 19.3 L 5 6 Z"
                fill="#ef4444"
              />
              <path
                d="M 8 6 V 3.8 C 8 3.1 8.5 2.6 9.2 2.6 H 14.8 C 15.5 2.6 16 3.1 16 3.8 V 6 Z"
                fill="#ef4444"
              />
              <path d="M 3.5 5.4 H 21" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          </svg>
        </button>

        {/* Right: Box button with Update font, dimmed until required * fields are filled */}
        <button
          type="submit"
          disabled={busy || !isEventFormValid}
          className={`min-w-[96px] min-h-[40px] flex items-center justify-center px-6 py-2.5 sm:py-3 border text-xs font-bold tracking-wider rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
            isModalDark
              ? "bg-[#ffffff] text-[#000000] border-[#ffffff] hover:bg-[#f0f6fc] shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
              : "bg-[#000000] text-[#ffffff] border-[#000000] hover:bg-[#1f2328] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          }`}
        >
          {busy ? <ActionArcSpinner className="w-4 h-4" label="Saving event" /> : "Update"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-auto pt-2 shrink-0">
      <button
        type="submit"
        disabled={busy || !isEventFormValid}
        className={`w-full min-h-[40px] flex items-center justify-center py-3 sm:py-3.5 border text-xs font-bold tracking-wider rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
          isModalDark
            ? "bg-[#ffffff] text-[#000000] border-[#ffffff] hover:bg-[#f0f6fc] shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
            : "bg-[#000000] text-[#ffffff] border-[#000000] hover:bg-[#1f2328] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        }`}
      >
        {busy ? <ActionArcSpinner className="w-4 h-4" label="Saving event" /> : "Create"}
      </button>
    </div>
  );
}
