"use client";

import { useCallback } from "react";
import api from "@/lib/api";
import { clearSession } from "@/lib/session";
import { persistProfileIdentityCache } from "@/lib/profileIdentity";
import {
  patchUserCollection,
  patchEventCollectionForUser,
  buildSyncedProfilePatch,
} from "./profilePatch";

/**
 * frontend/components/map/mapPage/useMapProfileActions.js
 *
 * User profile management: saving local profile edits & sync with server,
 * password change request routing, and account deletion.
 * Ledger: 3 useCallback hooks (L1066-1152 in MapPageClient.jsx).
 *
 * Output: { handleSaveProfile, handleRequestChangePassword, handleConfirmDeleteAccount }
 */
export function useMapProfileActions({
  currentUser = null,
  setCurrentUser = () => {},
  setKalcerians = () => {},
  setMapUsersData = () => {},
  setEvents = () => {},
  setNotice = () => {},
  setShowEditProfileModal = () => {},
  setShowOwnProfile = () => {},
  setShowDeleteAccountModal = () => {},
} = {}) {
  const handleSaveProfile = useCallback(
    async (updatedData) => {
      const applyProfilePatch = (patch) => {
        persistProfileIdentityCache(currentUser, {
          profilePicture: patch.profilePicture,
          coverImage: patch.coverImage,
          coverType: patch.coverType,
        });
        setCurrentUser((prev) => {
          const merged = { ...(prev || {}), ...patch };
          try {
            localStorage.setItem("kalceria_user", JSON.stringify(merged));
            const sess = localStorage.getItem("kalceria_user_session");
            if (sess) {
              const parsed = JSON.parse(sess);
              parsed.user = { ...(parsed.user || {}), ...patch };
              localStorage.setItem("kalceria_user_session", JSON.stringify(parsed));
            }
          } catch {}
          return merged;
        });
        setKalcerians((prev) => patchUserCollection(prev, currentUser?.id, patch));
        setMapUsersData((prev) => patchUserCollection(prev, currentUser?.id, patch));
        setEvents((prev) => patchEventCollectionForUser(prev, currentUser?.id, patch));
      };

      applyProfilePatch(updatedData);
      try {
        const res = await api.put("/users/me", updatedData);
        if (res?.data?.user) {
          const serverUser = res.data.user;
          const syncedPatch = buildSyncedProfilePatch(updatedData, serverUser);
          applyProfilePatch(syncedPatch);
        }
      } catch (e) {
        console.warn("Profile update remote sync deferred:", e?.message);
      }
      setNotice("Profile updated successfully!");
    },
    [currentUser]
  );

  const handleRequestChangePassword = useCallback(() => {
    let email = currentUser?.email;
    if (!email && typeof window !== "undefined") {
      try {
        const u = JSON.parse(localStorage.getItem("kalceria_user") || "null");
        const s = JSON.parse(localStorage.getItem("kalceria_user_session") || "null");
        email = u?.email || s?.user?.email || localStorage.getItem("kalceria_user_email") || "";
      } catch {}
    }

    try {
      sessionStorage.setItem("kalceria_auth_return", "/map");
      sessionStorage.setItem("kalceria_password_reset_from_map", "true");
      localStorage.removeItem("kalceria_auth_return");
      localStorage.removeItem("kalceria_password_reset_from_map");
    } catch {}

    setShowEditProfileModal(false);
    setShowOwnProfile(false);

    const targetUrl = email
      ? `/?auth=true&mode=forgot-password&from=map&email=${encodeURIComponent(email)}`
      : "/?auth=true&mode=forgot-password&from=map";

    window.location.href = targetUrl;
  }, [currentUser?.email]);

  const handleConfirmDeleteAccount = useCallback(async () => {
    setShowDeleteAccountModal(false);
    setShowEditProfileModal(false);
    setShowOwnProfile(false);
    setNotice("Account deleted. Redirecting...");

    try {
      clearSession();
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    api.delete("/users/me").catch((e) => {
      console.warn("Delete account remote sync deferred:", e?.message);
    });

    setTimeout(() => {
      window.location.replace("/");
    }, 300);
  }, []);

  return {
    handleSaveProfile,
    handleRequestChangePassword,
    handleConfirmDeleteAccount,
  };
}

