import { useAuthStore } from "@/stores/useAuthStore";

const USER_SESSION_KEY = "kalceriaSessionActive";
const ADMIN_SESSION_KEY = "kalceriaAdminSessionActive";

export function hasUserSession() {
  if (typeof window === "undefined") return false;
  const storeState = useAuthStore.getState?.();
  if (storeState && typeof storeState.isLoggedIn === "boolean") {
    return storeState.isLoggedIn;
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

export function establishSession(user) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  localStorage.setItem(USER_SESSION_KEY, "true");
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
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("user");
  sessionStorage.removeItem("kalceriaCsrfToken");

  // Sync with reactive Zustand store
  try {
    useAuthStore.getState?.().clearSession?.();
  } catch {}
}
