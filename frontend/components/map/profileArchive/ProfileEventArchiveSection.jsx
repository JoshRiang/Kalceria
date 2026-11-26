"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchUserEventArchives,
  updateUserEventArchive,
  deleteUserEventArchive,
} from "@/lib/api";
import { EventArchiveStackCard } from "./EventArchiveStackCard";
import { EventArchiveMiniDiscovery } from "./EventArchiveMiniDiscovery";

export function ProfileEventArchiveSection({
  user,
  displayName,
  isMapDark,
  isOwnProfile = false,
  isAnyBlocked = false,
}) {
  const userId = user?.id ? String(user.id) : "";
  const [archives, setArchives] = useState([]);
  const [isArchivePrivate, setIsArchivePrivate] = useState(Boolean(user?.isArchivePrivate));
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArchiveId, setSelectedArchiveId] = useState(null);

  const loadArchives = useCallback(async () => {
    if (!userId || isAnyBlocked) {
      setArchives([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetchUserEventArchives(userId);
      setIsArchivePrivate(Boolean(res?.isArchivePrivate));
      setArchives(Array.isArray(res?.archives) ? res.archives : []);
    } catch {
      setArchives([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAnyBlocked]);

  useEffect(() => {
    setSelectedArchiveId(null);
    loadArchives();
  }, [loadArchives, user?.isArchivePrivate]);

  if (isAnyBlocked || !userId) return null;

  const selectedArchive = selectedArchiveId
    ? archives.find((a) => a.id === selectedArchiveId) || null
    : null;

  const handleSaveImpression = async (archiveId, impression) => {
    const res = await updateUserEventArchive(archiveId, { impression });
    if (res?.ok) {
      setArchives((prev) =>
        prev.map((a) => (a.id === archiveId ? { ...a, impression: res.impression } : a))
      );
    }
  };

  const handleToggleHidden = async (archiveId, isHidden) => {
    const res = await updateUserEventArchive(archiveId, { isHidden });
    if (res?.ok) {
      setArchives((prev) =>
        prev.map((a) => (a.id === archiveId ? { ...a, isHidden: res.isHidden } : a))
      );
    }
  };

  const handleDeleteArchive = async (archiveId) => {
    const res = await deleteUserEventArchive(archiveId);
    if (res?.deleted) {
      setArchives((prev) => prev.filter((a) => a.id !== archiveId));
      if (selectedArchiveId === archiveId) setSelectedArchiveId(null);
    }
  };

  return (
    <div className="px-3.5 pb-4 pt-2 border-t border-current/10">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-[12px] font-extrabold tracking-tight uppercase opacity-90">
            Event Archive
          </h4>
          {isOwnProfile && isArchivePrivate && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                isMapDark
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/35"
                  : "bg-amber-500/15 text-amber-700 border-amber-500/35"
              }`}
            >
              Private
            </span>
          )}
        </div>
        {archives.length > 0 && !selectedArchive && (
          <span className="text-[10.5px] opacity-60 font-semibold">
            {archives.length} {archives.length === 1 ? "event" : "events"}
          </span>
        )}
      </div>

      {!isOwnProfile && isArchivePrivate ? (
        <div
          className={`rounded-xl border px-3 py-4 text-center flex flex-col items-center gap-1.5 ${
            isMapDark
              ? "bg-black/35 border-white/10 text-white/75"
              : "bg-white/75 border-black/10 text-black/70"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-[11px] font-bold">This Event Archive is private</p>
        </div>
      ) : isLoading && archives.length === 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <div className={`h-32 rounded-xl animate-pulse ${isMapDark ? "bg-white/10" : "bg-black/10"}`} />
          <div className={`h-32 rounded-xl animate-pulse ${isMapDark ? "bg-white/10" : "bg-black/10"}`} />
        </div>
      ) : selectedArchive ? (
        <EventArchiveMiniDiscovery
          archive={selectedArchive}
          displayName={displayName}
          isMapDark={isMapDark}
          isOwnProfile={isOwnProfile}
          onCancel={() => setSelectedArchiveId(null)}
          onSaveImpression={handleSaveImpression}
        />
      ) : archives.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {archives.map((arch) => (
            <EventArchiveStackCard
              key={arch.id}
              archive={arch}
              isMapDark={isMapDark}
              isOwnProfile={isOwnProfile}
              onOpenArchive={(a) => setSelectedArchiveId(a.id)}
              onSaveImpression={handleSaveImpression}
              onToggleHidden={handleToggleHidden}
              onDeleteArchive={handleDeleteArchive}
            />
          ))}
        </div>
      ) : (
        <div
          className={`rounded-xl border px-3 py-3.5 text-center text-[11px] opacity-65 ${
            isMapDark ? "border-white/10 bg-black/20" : "border-black/10 bg-white/60"
          }`}
        >
          {isOwnProfile
            ? "Media you post to events will automatically stack here."
            : "No archived event collections yet."}
        </div>
      )}
    </div>
  );
}
