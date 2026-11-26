"use client";

import { useState } from "react";
import {
  MAX_ARCHIVE_IMPRESSION_CHARS,
  buildArchiveDiscoveryHeading,
  isArchiveVideoUrl,
} from "./eventArchiveHelpers";

export function EventArchiveMiniDiscovery({
  archive,
  displayName,
  isMapDark,
  isOwnProfile = false,
  onCancel,
  onSaveImpression,
}) {
  const [activeItem, setActiveItem] = useState(null);
  const [isEditingImpression, setIsEditingImpression] = useState(false);
  const [draftImpression, setDraftImpression] = useState(archive?.impression || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!archive) return null;

  const heading = buildArchiveDiscoveryHeading(displayName, archive.eventTitle);
  const mediaItems = Array.isArray(archive.mediaItems) ? archive.mediaItems : [];

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSaveImpression?.(archive.id, draftImpression.trim().slice(0, MAX_ARCHIVE_IMPRESSION_CHARS));
      setIsEditingImpression(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden flex flex-col ${
        isMapDark
          ? "bg-[#0f1014]/95 border-white/15 text-[#f0f6fc]"
          : "bg-white/95 border-black/15 text-[#1f2328]"
      }`}
    >
      {/* Mini Discovery Header: "{DisplayName} pada Event "{EventTitle}"" + Cancel button */}
      <div
        className={`px-3 py-2.5 flex items-center justify-between gap-2 border-b shrink-0 ${
          isMapDark ? "border-white/10 bg-[#161b22]/90" : "border-black/10 bg-[#f6f8fa]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <h4 className="text-[12px] font-bold leading-snug break-words">{heading}</h4>
          {archive.eventLocation && (
            <p className="text-[10px] opacity-65 truncate mt-0.5">{archive.eventLocation}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border shrink-0 cursor-pointer transition-transform active:scale-95 ${
            isMapDark
              ? "border-white/25 text-white hover:bg-white/10"
              : "border-black/25 text-black hover:bg-black/5"
          }`}
        >
          Cancel
        </button>
      </div>

      {/* Personal Impression Banner (distinct from post media captions) */}
      <div className={`px-3 py-2 border-b ${isMapDark ? "border-white/10" : "border-black/10"}`}>
        {isEditingImpression ? (
          <form onSubmit={handleSave} className="space-y-1.5">
            <textarea
              rows={2}
              maxLength={MAX_ARCHIVE_IMPRESSION_CHARS}
              value={draftImpression}
              onChange={(e) => setDraftImpression(e.target.value.slice(0, MAX_ARCHIVE_IMPRESSION_CHARS))}
              placeholder="Ceritakan kesanmu selama di event ini..."
              className={`w-full rounded-lg border px-2.5 py-1.5 text-[11px] outline-none resize-none ${
                isMapDark
                  ? "bg-black/50 border-white/20 text-white"
                  : "bg-white border-black/20 text-black"
              }`}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] opacity-60">
                {draftImpression.length}/{MAX_ARCHIVE_IMPRESSION_CHARS}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingImpression(false)}
                  className="text-[10.5px] font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer ${
                    isMapDark ? "bg-white text-black" : "bg-black text-white"
                  }`}
                >
                  {isSaving ? "..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-[11px] leading-relaxed flex-1 break-words ${
                archive.impression ? "" : "opacity-50 italic"
              }`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {archive.impression || (isOwnProfile ? "Belum ada kesan untuk event ini." : "No event impression yet.")}
            </p>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  setDraftImpression(archive.impression || "");
                  setIsEditingImpression(true);
                }}
                className="text-[10.5px] font-bold underline shrink-0 opacity-80 hover:opacity-100 cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline Full Media Preview when a tile is tapped */}
      {activeItem ? (
        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="text-[11px] font-bold flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer"
            >
              <span>← Back to Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="text-base leading-none px-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              ×
            </button>
          </div>
          <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[280px]">
            {isArchiveVideoUrl(activeItem.mediaUrl, activeItem.mediaType) ? (
              <video
                src={activeItem.mediaUrl}
                poster={activeItem.thumbnailUrl || undefined}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[280px] object-contain"
              />
            ) : (
              <img
                src={activeItem.mediaUrl}
                alt={activeItem.caption || archive.eventTitle}
                className="w-full max-h-[280px] object-contain"
              />
            )}
          </div>
          {activeItem.caption && (
            <p className="text-[11px] leading-snug opacity-85 break-words">{activeItem.caption}</p>
          )}
        </div>
      ) : (
        /* 3-Column Mini Discovery Media Grid */
        <div className="p-2">
          <div className="grid grid-cols-3 gap-1">
            {mediaItems.map((item) => {
              const isVid = isArchiveVideoUrl(item.mediaUrl, item.mediaType);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveItem(item)}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-black group cursor-pointer border ${
                    isMapDark ? "border-white/10" : "border-black/10"
                  }`}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.caption || archive.eventTitle}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : isVid ? (
                    <video
                      src={`${item.mediaUrl}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt={item.caption || archive.eventTitle}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  {isVid && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center pointer-events-none">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor">
                        <polygon points="8,5 19,12 8,19" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

