"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persistProfileIdentityCache } from "@/lib/profileIdentity";

const USER_SESSION_KEY = "kalceriaSessionActive";
const ADMIN_SESSION_KEY = "kalceriaAdminSessionActive";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      isAdmin: false,
      isInitialized: false,

      // Initialize / reconcile store with localStorage & cookies on client mount
      initSession: () => {
        if (typeof window === "undefined") return;
        try {
          const hasUser =
            localStorage.getItem(USER_SESSION_KEY) === "true" ||
            localStorage.getItem(ADMIN_SESSION_KEY) === "true";
          const hasAdmin = localStorage.getItem(ADMIN_SESSION_KEY) === "true";

          set({
            isLoggedIn: hasUser,
            isAdmin: hasAdmin,
            isInitialized: true,
          });
        } catch {
          set({ isInitialized: true });
        }
      },

      // Establish authenticated session with reactive store + storage sync
      setSession: (userData) => {
        if (!userData) return;
        const isAdmin = userData?.role === "ADMIN";

        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("adminToken");
            localStorage.setItem(USER_SESSION_KEY, "true");
            if (isAdmin) {
              localStorage.setItem(ADMIN_SESSION_KEY, "true");
            } else {
              localStorage.removeItem(ADMIN_SESSION_KEY);
            }
            // Persist avatar and cover cache if provided
            persistProfileIdentityCache(userData, {
              profilePicture: userData.profilePicture,
              coverImage: userData.coverImage,
            });
          } catch {}
        }

        set({
          user: userData,
          isLoggedIn: true,
          isAdmin,
          isInitialized: true,
        });
      },

      // Update user details in-memory and update cache reactively
      updateUser: (partialData) => {
        const currentUser = get().user || {};
        const updatedUser = { ...currentUser, ...partialData };

        if (typeof window !== "undefined") {
          try {
            persistProfileIdentityCache(updatedUser, {
              profilePicture: updatedUser.profilePicture,
              coverImage: updatedUser.coverImage,
            });
          } catch {}
        }

        set({ user: updatedUser });
      },

      // Clear session completely across state and storage
      clearSession: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(USER_SESSION_KEY);
            localStorage.removeItem(ADMIN_SESSION_KEY);
            localStorage.removeItem("token");
            localStorage.removeItem("adminToken");
            sessionStorage.removeItem("kalceriaCsrfToken");
          } catch {}
        }

        set({
          user: null,
          isLoggedIn: false,
          isAdmin: false,
          isInitialized: true,
        });
      },
    }),
    {
      name: "kalceria_auth_store",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        isAdmin: state.isAdmin,
      }),
    }
  )
);
