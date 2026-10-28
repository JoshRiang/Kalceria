const USER_SESSION_KEY = "kalceriaSessionActive";
const ADMIN_SESSION_KEY = "kalceriaAdminSessionActive";

export function hasUserSession() {
  return typeof window !== "undefined" && localStorage.getItem(USER_SESSION_KEY) === "true";
}

export function hasAdminSession() {
  return typeof window !== "undefined" && localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function establishSession(user) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  localStorage.setItem(USER_SESSION_KEY, "true");
  if (user?.role === "ADMIN") localStorage.setItem(ADMIN_SESSION_KEY, "true");
  else localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  sessionStorage.removeItem("kalceriaCsrfToken");
}
