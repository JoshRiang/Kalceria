// mockMiniEvents.js
// Sanitized: Only real registered events from the database are displayed on the map

export const INITIAL_MOCK_MINI_EVENTS = [];

export const INITIAL_ACCEPTED_COLLABS = {};

export const INITIAL_EVENT_REQUESTS = {};

import { toSmartTitleCase } from "@/lib/titleCase";

export const cleanEventDesc = (item) => {
  if (!item) return item;
  const raw = item.description || "";
  const catMatch = raw.match(/\[CAT:([a-z_]+)\]/i);
  const mediaMatch = raw.match(/\[MEDIA:([^\]]+)\]/i);
  const locMatch = raw.match(/\[LOC:([^\]]+)\]/i);
  const cleanDescription = raw
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .replace(/\[LOC:[^\]]+\]\s*/gi, "")
    .trim();
  return {
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
    title: item.title ? toSmartTitleCase(item.title) : item.title,
    category: catMatch ? catMatch[1].toLowerCase() : (item.category || "cafe"),
    mediaUrl: mediaMatch ? mediaMatch[1] : (item.mediaUrl || null),
    location: locMatch ? locMatch[1].trim() : (item.location || null),
    description: cleanDescription,
  };
};

export const mergeEvents = (activeList) => {
  if (!activeList || activeList.length === 0) return [];
  return activeList.map(cleanEventDesc);
};
