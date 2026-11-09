import { useEffect } from "react";
import { fetchMapUsers, fetchKalcerians, fetchMiniEventsWithMeta } from "@/lib/api";
import { mergeEvents } from "@/components/map/mockMiniEvents";
import { splitMediaUrlListClient } from "@/lib/urlSecurity";
import { prewarmVideoBatch, sortItemsByProximity } from "@/lib/videoPrewarmer";

/**
 * useMapDataPolling
 * Hook Ledger Position: M8 (Poll map users, kalcerians, mini events every 10s + proximity video prewarming)
 *
 * Input:
 * - notLoggedIn: boolean
 * - currentUser: object
 * - selfLiveCoords: object
 * - syncCollabStateFromServer: Function
 * - setMapUsersData: React.Dispatch<React.SetStateAction<Array>>
 * - setKalcerians: React.Dispatch<React.SetStateAction<Array>>
 * - setEvents: React.Dispatch<React.SetStateAction<Array>>
 * - setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>
 *
 * Output: void
 */
export function useMapDataPolling({
  notLoggedIn,
  currentUser,
  selfLiveCoords,
  syncCollabStateFromServer,
  setMapUsersData,
  setKalcerians,
  setEvents,
  setIsDataLoading,
}) {
  // fetch map users + kalcerians (poll every 10s)
  useEffect(() => {
    if (notLoggedIn || !currentUser) return;
    let alive = true;
    const load = async () => {
      try {
        const [users, kals, eventMeta] = await Promise.all([
          fetchMapUsers(),
          fetchKalcerians(),
          fetchMiniEventsWithMeta(),
        ]);
        if (!alive) return;
        const activeEvents = eventMeta?.events || [];
        const mergedEvents = mergeEvents(activeEvents);
        setMapUsersData(users || []);
        setKalcerians(kals || []);
        setEvents(mergedEvents);
        syncCollabStateFromServer(mergedEvents, eventMeta?.requestedEventId ?? null);
        setIsDataLoading(false);

        // Pre-warm event clips and profile video covers prioritized by geographic proximity
        const centerCoords =
          selfLiveCoords?.lat && selfLiveCoords?.lng
            ? selfLiveCoords
            : currentUser?.domicileLat && currentUser?.domicileLng
            ? { lat: Number(currentUser.domicileLat), lng: Number(currentUser.domicileLng) }
            : null;

        const videoUrls = [];
        if (currentUser?.coverImage && currentUser?.coverType === "video") {
          videoUrls.push(currentUser.coverImage);
        }

        const sortedEvents = sortItemsByProximity(mergedEvents, centerCoords);
        sortedEvents.forEach((ev) => {
          if (ev.mediaUrl) {
            splitMediaUrlListClient(ev.mediaUrl).forEach((u) => videoUrls.push(u));
          }
        });

        const sortedKals = sortItemsByProximity(kals || [], centerCoords);
        sortedKals.forEach((u) => {
          if (u.coverImage && (u.coverType === "video" || u.coverImage.includes(".mp4") || u.coverImage.includes("/api/blob/raw"))) {
            videoUrls.push(u.coverImage);
          }
        });

        prewarmVideoBatch(videoUrls);
      } catch (err) {
        console.error("[Map] fetch error", err);
        if (alive) setIsDataLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [notLoggedIn, currentUser, syncCollabStateFromServer]);
}
