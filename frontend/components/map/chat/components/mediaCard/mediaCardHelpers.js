export const RANDOM_FONTS = [
  "font-mono tracking-tight",
  "font-serif italic",
  "font-sans font-bold",
  "font-mono font-semibold",
  "font-sans tracking-wide",
];

export const VIEW_ONCE_OPENED_STORAGE_KEY = "kalceria_view_once_opened_v1";

export function readViewOnceOpened(id) {
  if (!id || typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(VIEW_ONCE_OPENED_STORAGE_KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.includes(String(id));
  } catch {
    return false;
  }
}

export function persistViewOnceOpened(id) {
  if (!id || typeof window === "undefined") return;
  try {
    const strId = String(id);
    const raw = localStorage.getItem(VIEW_ONCE_OPENED_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(arr) ? arr : [];
    if (!list.includes(strId)) {
      const next = [...list.slice(-499), strId];
      localStorage.setItem(VIEW_ONCE_OPENED_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {}
}
