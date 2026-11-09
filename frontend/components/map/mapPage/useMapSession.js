import { useEffect } from "react";
import { hasUserSession, clearSession } from "@/lib/session";
import { fetchMe } from "@/lib/api";
import {
  resolvePersistentAvatarUrl,
  resolvePersistentCover,
} from "@/lib/profileIdentity";
import { prewarmOsmTiles, hasValidCoordinates } from "@/lib/osmTilePrewarmer";

/**
 * useMapSession
 * Hook Ledger Position: M4 (Login gate + user profile fetching)
 *
 * Input:
 * - setNotLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
 * - setCurrentUser: React.Dispatch<React.SetStateAction<any>>
 * - setPresence: React.Dispatch<React.SetStateAction<string>>
 * - setStatusText: React.Dispatch<React.SetStateAction<string>>
 *
 * Output: void
 */
export function useMapSession({
  setNotLoggedIn,
  setCurrentUser,
  setPresence,
  setStatusText,
}) {
  // Login gate + fetch user profile
  useEffect(() => {
    if (!hasUserSession()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- This reads the existing browser session gate after hydration.
      setNotLoggedIn(true);
      return;
    }
    setNotLoggedIn(false);
    fetchMe()
      .then((user) => {
        const enrichedUser = {
          ...user,
          profilePicture: resolvePersistentAvatarUrl(user),
          coverImage: resolvePersistentCover(user),
          coverUrl: resolvePersistentCover(user),
        };
        setCurrentUser(enrichedUser);
        if (user?.email) {
          try {
            localStorage.setItem("kalceria_user_email", user.email);
          } catch {}
        }
        setPresence(user.allowLiveLocation ? "online" : "invisible");
        if (user.broadcast?.message) setStatusText(user.broadcast.message);
        if (hasValidCoordinates(user.domicileLat, user.domicileLng)) {
          const userCoordKey = `kalceria_last_known_coords_${user.id}`;
          try {
            if (!localStorage.getItem(userCoordKey)) {
              localStorage.setItem(
                userCoordKey,
                JSON.stringify({
                  lat: Number(user.domicileLat),
                  lng: Number(user.domicileLng),
                })
              );
            }
          } catch (_) {}
          prewarmOsmTiles(Number(user.domicileLat), Number(user.domicileLng), 15);
        }
      })
      .catch(() => {
        clearSession();
        setNotLoggedIn(true);
      });
  }, []);
}
