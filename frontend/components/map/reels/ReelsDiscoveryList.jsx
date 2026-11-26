"use client";

import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { fetchReelsFeed } from "@/lib/api";
import { REELS_CATEGORY_TABS, mergeUnifiedReelsFeed, isVideoMediaUrl } from "./reelsHelpers";
import { CreateMediaPostModal } from "./CreateMediaPostModal";
import { ReelsPostDetailModal } from "./ReelsPostDetailModal";

export const ReelsDiscoveryList = memo(function ReelsDiscoveryList({
  listContainerRef,
  isMapDark,
  activeScope = "friends",
  events = [],
  sidebarKalcerians = [],
  currentUser = null,
  isUserFriend,
  searchQuery = "",
  isSelfOffline = false,
  onOpenItemOnMap,
  focusUser,
  setDrawerOpen,
  onOpenPersonalChat,
}) {
  const [selectedCategory, setSelectedCategory] = useState("cafe");
  const [serverPosts, setServerPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePost, setActivePost] = useState(null);

  const loadFeed = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      if (!currentUser?.id) return;
      setIsLoadingFeed(true);
      try {
        const res = await fetchReelsFeed({
          scope: activeScope,
          category: selectedCategory,
          ...(cursor ? { cursor } : {}),
          limit: 18,
        });
        const list = Array.isArray(res?.posts) ? res.posts : [];
        setServerPosts((prev) => (append ? [...prev, ...list] : list));
        setNextCursor(res?.nextCursor || null);
        setHasMore(Boolean(res?.hasMore));
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [currentUser?.id, activeScope, selectedCategory]
  );

  useEffect(() => {
    loadFeed({ cursor: null, append: false });
  }, [loadFeed]);

  const activeOwnEvent = useMemo(
    () => (events || []).find((ev) => String(ev.creatorId || ev.creator?.id || "") === String(currentUser?.id || "")) || null,
    [events, currentUser?.id]
  );

  const gridItems = useMemo(
    () =>
      mergeUnifiedReelsFeed({
        serverPosts,
        events,
        sidebarKalcerians,
        currentUserId: currentUser?.id,
        scope: activeScope,
        category: selectedCategory,
        isUserFriendFn: isUserFriend,
        searchQuery,
      }),
    [serverPosts, events, sidebarKalcerians, currentUser?.id, activeScope, selectedCategory, isUserFriend, searchQuery]
  );

  const handleSeeInMap = (post) => {
    if (post.eventObj) {
      if (onOpenItemOnMap) onOpenItemOnMap(post.eventObj, "event");
      else focusUser?.(post.eventObj);
    } else if (post.eventId) {
      const matched = (events || []).find((e) => String(e.id) === String(post.eventId));
      if (matched) {
        if (onOpenItemOnMap) onOpenItemOnMap(matched, "event");
        else focusUser?.(matched);
      }
    } else if (Number.isFinite(Number(post.lat)) && Number.isFinite(Number(post.lng))) {
      focusUser?.({ lat: Number(post.lat), lng: Number(post.lng), id: post.id });
    }
    if (typeof window !== "undefined" && window.innerWidth < 860) {
      setDrawerOpen?.(false);
    }
  };

  return (
    <>
      <div className="relative z-10 px-2.5 pb-1.5 flex items-center justify-between gap-1.5 shrink-0">
        {/* 5 Child Category Tabs (4 Event Categories + Broadcast) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {REELS_CATEGORY_TABS.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-2 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? isMapDark
                      ? "bg-white text-black border-white"
                      : "bg-black text-white border-black"
                    : isMapDark
                    ? "bg-[#0f1014]/75 text-white/75 border-white/15 hover:border-white/40"
                    : "bg-white/85 text-black/75 border-black/15 hover:border-black/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* + Post Media Button */}
        <button
          type="button"
          disabled={isSelfOffline}
          onClick={() => !isSelfOffline && setShowCreateModal(true)}
          title={isSelfOffline ? "Offline mode" : "Create Reel / Media Post"}
          className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 ${
            isMapDark
              ? "bg-gradient-to-r from-[#2563eb] to-[#ec4899] text-white"
              : "bg-gradient-to-r from-[#1d4ed8] to-[#db2777] text-white"
          }`}
        >
          + Post
        </button>
      </div>

      {/* Instagram-Style 3-Column Square Media Grid */}
      <div
        ref={listContainerRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto px-2 pb-3.5 modern-kalcerian-scrollbar overscroll-contain"
      >
        {isLoadingFeed && gridItems.length === 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className={`aspect-square rounded-lg animate-pulse ${
                  isMapDark ? "bg-white/10" : "bg-black/10"
                }`}
              />
            ))}
          </div>
        ) : gridItems.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-1">
              {gridItems.map((item) => {
                const isVid = isVideoMediaUrl(item.mediaUrl, item.mediaType);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePost(item)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-black/80 group cursor-pointer outline-none border ${
                      isMapDark ? "border-white/10" : "border-black/10"
                    }`}
                    style={{ contentVisibility: "auto" }}
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.caption || "Reel"}
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
                        alt={item.caption || "Reel"}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}

                    {/* Video Play Badge */}
                    {isVid && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/65 text-white flex items-center justify-center pointer-events-none">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                          <polygon points="8,5 19,12 8,19" />
                        </svg>
                      </span>
                    )}

                    {/* Hover Like Count */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white drop-shadow truncate">
                        ♥ {item.likeCount || 0}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {hasMore && nextCursor && (
              <div className="pt-2.5 flex justify-center">
                <button
                  type="button"
                  disabled={isLoadingFeed}
                  onClick={() => loadFeed({ cursor: nextCursor, append: true })}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                    isMapDark ? "border-white/25 text-white" : "border-black/25 text-black"
                  }`}
                >
                  {isLoadingFeed ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={`p-6 text-center text-xs ${isMapDark ? "text-[#8b949e]" : "text-[#656d76]"}`}>
            No media in {activeScope === "global" ? "Global" : "Friends"} · {selectedCategory} yet.
          </div>
        )}
      </div>

      {/* Standalone Create Media Post Form (Blue-Magenta Single-Element Texture) */}
      <CreateMediaPostModal
        isOpen={showCreateModal}
        isMapDark={isMapDark}
        defaultCategory={selectedCategory}
        activeOwnEvent={activeOwnEvent}
        onClose={() => setShowCreateModal(false)}
        onPosted={({ category: postedCat }) => {
          if (postedCat) setSelectedCategory(postedCat);
          loadFeed({ cursor: null, append: false });
        }}
      />

      {/* IG-Style Post Detail Viewer */}
      <ReelsPostDetailModal
        post={activePost}
        isMapDark={isMapDark}
        onClose={() => setActivePost(null)}
        onSeeInMap={handleSeeInMap}
        onReplyFriend={(author) => onOpenPersonalChat?.(author)}
        onPostMutated={() => loadFeed({ cursor: null, append: false })}
      />
    </>
  );
});
