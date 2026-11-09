import { useAuthStore } from "@/stores/useAuthStore";

const USER_SESSION_KEY = "kalceriaSessionActive";
const ADMIN_SESSION_KEY = "kalceriaAdminSessionActive";
const SESSION_TIMESTAMP_KEY = "kalceriaSessionTimestamp";
export const SESSION_MAX_AGE_MS = 20 * 60 * 1000; // 20 minutes (matches backend AUTH_TTL_SECONDS)

export function checkSessionExpiry() {
  if (typeof window === "undefined") return false;
  const lastActiveStr = localStorage.getItem(SESSION_TIMESTAMP_KEY);
  if (lastActiveStr) {
    const lastActive = Number(lastActiveStr);
    if (Number.isFinite(lastActive) && Date.now() - lastActive > SESSION_MAX_AGE_MS) {
      clearSession();
      return true;
    }
  }
  return false;
}

// Auto-wire focus and visibility listeners to clear stale session when device wakes or tab is revisited
if (typeof window !== "undefined") {
  const handleCheck = () => {
    checkSessionExpiry();
  };
  window.addEventListener("focus", handleCheck);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleCheck();
    }
  });
}

export function hasUserSession() {
  if (typeof window === "undefined") return false;

  // Proactive client TTL check: if last active timestamp > 20 minutes ago, invalidate immediately
  if (checkSessionExpiry()) {
    return false;
  }

  const storeState = useAuthStore.getState?.();
  if (storeState && typeof storeState.isLoggedIn === "boolean") {
    if (!storeState.isLoggedIn) return false;
  }
  return (
    localStorage.getItem(USER_SESSION_KEY) === "true" ||
    localStorage.getItem(ADMIN_SESSION_KEY) === "true"
  );
}

export function hasAdminSession() {
  if (typeof window === "undefined") return false;
  const storeState = useAuthStore.getState?.();
  if (storeState && typeof storeState.isAdmin === "boolean") {
    return storeState.isAdmin;
  }
  return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function touchSession() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(USER_SESSION_KEY) === "true") {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
  }
}

export function establishSession(user) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  localStorage.setItem(USER_SESSION_KEY, "true");
  localStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
  if (user?.role === "ADMIN") localStorage.setItem(ADMIN_SESSION_KEY, "true");
  else localStorage.removeItem(ADMIN_SESSION_KEY);

  // Sync with reactive Zustand store
  try {
    useAuthStore.getState?.().setSession?.(user);
  } catch {}
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("user");
  localStorage.removeItem("kalceria_auth_store");
  localStorage.removeItem("kalceria_auth_return");
  localStorage.removeItem("kalceria_password_reset_from_map");
  sessionStorage.removeItem("kalceriaCsrfToken");
  sessionStorage.removeItem("kalceria_auth_return");
  sessionStorage.removeItem("kalceria_password_reset_from_map");
  sessionStorage.removeItem("kalceria_is_password_reset_login");

  // Hard purge any residual location coordinates from previous logins
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k === "kalceria_last_known_coords" || k.startsWith("kalceria_last_known_coords_"))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}

  // Sync with reactive Zustand store
  try {
    useAuthStore.getState?.().clearSession?.();
  } catch {}
}
