export const CLIP = {
  clipPath:
    "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)",
};

export const COMMENT_TYPES = [
  { id: "ADVICE", label: "Advice" },
  { id: "IDEA", label: "Idea" },
];

export const CATEGORIES = [
  { id: "Event", label: "Event" },
  { id: "Web Development", label: "Web Dev" },
  { id: "Other", label: "Other" },
];

export function getClientFingerprint() {
  if (typeof window === "undefined") return "";
  try {
    let tag = localStorage.getItem("kalceria_device_tag");
    if (!tag) {
      tag = "dev_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem("kalceria_device_tag", tag);
    }
    return tag;
  } catch {
    return "";
  }
}
