"use client";

import { useState } from "react";
import {
  MAX_ARCHIVE_IMPRESSION_CHARS,
  getArchiveStackPreviewCards,
  isArchiveVideoUrl,
} from "./eventArchiveHelpers";

function StackThumb({ item }) {
  const url = item?.thumbnailUrl || item?.mediaUrl || item?.url || "";
  const isVid = isArchiveVideoUrl(item?.mediaUrl || item?.url, item?.mediaType);
  if (item?.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt="Archive cover"
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    );
  }
  if (isVid) {
    return (
      <video
        src={`${item?.mediaUrl || item?.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <img
      src={url}
      alt="Archive cover"
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
    />
  );
}

export function EventArchiveStackCard({
  archive,
  isMapDark,
  isOwnProfile = false,
  onOpenArchive,
  onSaveImpression,
  onToggleHidden,
  onDeleteArchive,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingImpression, setIsEditingImpression] = useState(false);
  const [draftImpression, setDraftImpression] = useState(archive?.impression || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const stackCards = getArchiveStackPreviewCards(archive);
  const frontItem = stackCards[0] || null;
  const backItem1 = stackCards[1] || frontItem;
  const backItem2 = stackCards[2] || backItem1;
  const frontIsVid = frontItem
    ? isArchiveVideoUrl(frontItem.mediaUrl || frontItem.url, frontItem.mediaType)
    : false;
  const count = Number(archive?.mediaCount || archive?.mediaItems?.length || stackCards.length || 0);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (isBusy) return;
    setIsBusy(true);
    try {
      await onSaveImpression?.(archive.id, draftImpression.trim().slice(0, MAX_ARCHIVE_IMPRESSION_CHARS));
      setIsEditingImpression(false);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setMenuOpen(false);
    try {
      await onToggleHidden?.(archive.id, !archive.isHidden);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await onDeleteArchive?.(archive.id);
    } finally {
      setIsBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-2.5 flex flex-col gap-2 transition-all ${
        archive.isHidden ? "opacity-65" : ""
      } ${
        isMapDark
          ? "bg-[#0f1014]/82 border-white/12 text-[#f0f6fc]"
          : "bg-white/86 border-black/12 text-[#1f2328]"
      }`}
    >
      {/* Destructive Delete Inline Confirmation */}
      {confirmDelete && (
        <div
          className={`absolute inset-0 z-30 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2.5 backdrop-blur-md ${
            isMapDark ? "bg-[#0d1117]/95 text-white" : "bg-white/95 text-black"
          }`}
        >
          <p className="text-[11px] font-bold leading-snug">
            Delete &quot;{archive.eventTitle}&quot; archive permanently?
          </p>
          <p className="text-[10px] opacity-70 leading-tight">
            Destructive action — cannot be undone.
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmDelete(false)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer ${
                isMapDark ? "border-white/25 text-white" : "border-black/25 text-black"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleConfirmDelete}
              className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-[#ef4444] text-white cursor-pointer disabled:opacity-50"
            >
              {isBusy ? "..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* 1. Tactile Fanned Card Stack (Tap to Open Mini Discovery!) */}
      <div className="relative pt-2 px-1">
        <button
          type="button"
          onClick={() => onOpenArchive?.(archive)}
          className="relative w-full aspect-[4/3] block group cursor-pointer outline-none"
          title={`Open ${archive.eventTitle} archive`}
        >
          {count > 2 && backItem2 && (
            <div
              aria-hidden="true"
              className={`absolute inset-0 rounded-xl overflow-hidden border shadow-sm transition-transform duration-300 -rotate-[6deg] -translate-x-1 -translate-y-0.5 group-hover:-rotate-[9deg] ${
                isMapDark ? "border-white/20 bg-black" : "border-black/15 bg-neutral-200"
              }`}
            >
              <StackThumb item={backItem2} />
            </div>
          )}
          {count > 1 && backItem1 && (
            <div
              aria-hidden="true"
              className={`absolute inset-0 rounded-xl overflow-hidden border shadow-md transition-transform duration-300 rotate-[5deg] translate-x-1 -translate-y-0.5 group-hover:rotate-[8deg] ${
                isMapDark ? "border-white/25 bg-black" : "border-black/20 bg-neutral-100"
              }`}
            >
              <StackThumb item={backItem1} />
            </div>
          )}

          {/* Front Active Cover Card */}
          <div
            className={`relative z-10 w-full h-full rounded-xl overflow-hidden border shadow-lg transition-transform duration-300 group-hover:scale-[1.02] ${
              isMapDark ? "border-white/30 bg-black" : "border-black/20 bg-black"
            }`}
          >
            {frontItem && <StackThumb item={frontItem} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 pointer-events-none" />

            {/* Media Stack Count Badge */}
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs">
              {count} {count === 1 ? "item" : "items"}
            </span>

            {frontIsVid && (
              <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor">
                  <polygon points="8,5 19,12 8,19" />
                </svg>
              </span>
            )}

            {isOwnProfile && archive.isHidden && (
              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black text-[9.5px] font-extrabold uppercase tracking-wide">
                Hidden
              </span>
            )}
          </div>
        </button>

        {/* Owner Per-Event Stack Settings Button (Hide / Visible / Delete Destructive) */}
        {isOwnProfile && (
          <div className="absolute top-0 right-0 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((p) => !p);
              }}
              title="Archive stack settings"
              className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-md cursor-pointer transition-transform hover:scale-110 ${
                isMapDark
                  ? "bg-[#161b22] border-white/25 text-white"
                  : "bg-white border-black/20 text-black"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 mt-1 w-36 rounded-xl border py-1 shadow-2xl z-30 text-[11px] font-semibold ${
                  isMapDark
                    ? "bg-[#161b22] border-white/20 text-white"
                    : "bg-white border-black/20 text-black"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDraftImpression(archive.impression || "");
                    setIsEditingImpression(true);
                  }}
                  className={`w-full px-3 py-1.5 text-left cursor-pointer ${
                    isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                  }`}
                >
                  Edit Kesan
                </button>
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  className={`w-full px-3 py-1.5 text-left cursor-pointer ${
                    isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                  }`}
                >
                  {archive.isHidden ? "Show Stack" : "Hide Stack"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[#ef4444] cursor-pointer ${
                    isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                  }`}
                >
                  Delete Archive
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Event Title + Personal Impression ("Kesan", distinct from post caption!) */}
      <div className="px-0.5 flex flex-col gap-1 min-w-0">
        <button
          type="button"
          onClick={() => onOpenArchive?.(archive)}
          className="text-left text-[12px] font-bold leading-snug line-clamp-1 hover:underline cursor-pointer"
        >
          {archive.eventTitle}
        </button>

        {isEditingImpression ? (
          <form onSubmit={handleSave} className="space-y-1.5">
            <textarea
              rows={2}
              maxLength={MAX_ARCHIVE_IMPRESSION_CHARS}
              value={draftImpression}
              onChange={(e) => setDraftImpression(e.target.value.slice(0, MAX_ARCHIVE_IMPRESSION_CHARS))}
              placeholder="Tulis kesanmu selama di event ini..."
              className={`w-full rounded-lg border px-2 py-1.5 text-[11px] outline-none resize-none ${
                isMapDark
                  ? "bg-black/60 border-white/20 text-white placeholder:text-white/40"
                  : "bg-white border-black/20 text-black placeholder:text-black/40"
              }`}
            />
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9.5px] opacity-60">
                {draftImpression.length}/{MAX_ARCHIVE_IMPRESSION_CHARS}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsEditingImpression(false)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold opacity-75 hover:opacity-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    isMapDark ? "bg-white text-black" : "bg-black text-white"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-1.5">
            <p
              className={`text-[10.5px] leading-snug line-clamp-2 flex-1 break-words ${
                archive.impression
                  ? isMapDark
                    ? "text-[#c9d1d9]"
                    : "text-[#4b5563]"
                  : "opacity-45 italic"
              }`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {archive.impression || (isOwnProfile ? "Add your event impression..." : "No impression written yet.")}
            </p>
            {isOwnProfile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraftImpression(archive.impression || "");
                  setIsEditingImpression(true);
                }}
                title="Edit event impression"
                className="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

