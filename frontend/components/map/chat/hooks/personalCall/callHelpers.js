import { DESKTOP_FLAG as HARDWARE_DESKTOP_FLAG } from "@/lib/mediaHardware";

export const DESKTOP_FLAG = HARDWARE_DESKTOP_FLAG;

export function formatCallDuration(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function isAhmadDummyUser(user) {
  if (!user) return false;
  const id = String(user.id || "").toLowerCase();
  const name = String(user.name || user.displayName || "").toLowerCase();
  const nick = String(user.nickname || "").toLowerCase();
  return (
    id === "mock_1" ||
    id === "mock_ahmad" ||
    name.includes("ahmad bintaro") ||
    nick === "ahmad" ||
    nick === "ahmadbintaro"
  );
}

export const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};
