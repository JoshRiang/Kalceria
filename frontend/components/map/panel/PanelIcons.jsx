"use client";

// ─── 1. Category Event Icons (2D crisp black/white normalized by mode) ───────────
export function CategoryIcon({ category, isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";

  switch (category) {
    case "eat":
      return (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill={fg} stroke={border} strokeWidth="0.8">
          <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-7v8h2.5V22H21V2c-2.76 0-5 2.24-5 5z" />
        </svg>
      );
    case "special":
      return (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill={fg} stroke={border} strokeWidth="0.8">
          <path d="M9.8 2.5h4.4l-.9 12h-2.6L9.8 2.5zM12 16.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z" />
        </svg>
      );
    case "discuss":
      return (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none">
          <path d="M9 2.5h6c1.8 0 3.2 1.2 3.2 2.8s-1.4 2.8-3.2 2.8h-1.5l-2.5 2.5v-2.5H9c-1.8 0-3.2-1.2-3.2-2.8S7.2 2.5 9 2.5z" fill={fg} stroke={border} strokeWidth="0.8" />
          <circle cx="10.5" cy="5.3" r="0.7" fill={border} />
          <circle cx="12" cy="5.3" r="0.7" fill={border} />
          <circle cx="13.5" cy="5.3" r="0.7" fill={border} />
          <circle cx="7.5" cy="13" r="2.5" fill={fg} stroke={border} strokeWidth="0.8" />
          <path d="M3 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={fg} stroke={border} strokeWidth="0.8" />
          <circle cx="16.5" cy="13" r="2.5" fill={border} stroke={fg} strokeWidth="1" />
          <path d="M12 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={border} stroke={fg} strokeWidth="1" />
        </svg>
      );
    case "cafe":
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none">
          <path d="M10 2c-.8 1.5.8 2.6 0 4.2" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M13.5 1.5c-.9 1.6.9 2.8 0 4.5" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M4 9.5h13c0 5-3 7.8-6.5 7.8S4 14.5 4 9.5z" fill={fg} stroke={border} strokeWidth="0.8" />
          <ellipse cx="10.5" cy="9.5" rx="6" ry="1.6" fill={border} stroke={fg} strokeWidth="0.6" />
          <path d="M5.5 11c-.2 1.8 1.2 4 2.8 4.8" stroke={border} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M17 10.5c2 0 3.5 1.2 3.5 2.8s-1.5 2.8-3.5 2.8" stroke={fg} strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="10.5" cy="19.2" rx="8.5" ry="1.7" fill={fg} stroke={border} strokeWidth="0.8" />
          <ellipse cx="10.5" cy="18.8" rx="6" ry="1" fill={border} />
        </svg>
      );
  }
}

// ─── 2. Broadcast Megaphone / TOA Icon (Picture 4 Style) ──────────────────────────
export function BroadcastLineIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none">
      <path
        d="M4.5 13.5V10.5C4.5 9.7 5.1 9 6 9H8L14.5 5.2C15.3 4.7 16.5 5.3 16.5 6.2V17.8C16.5 18.7 15.3 19.3 14.5 18.8L8 15H6C5.1 15 4.5 14.3 4.5 13.5Z"
        fill={fg}
        stroke={border}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 15L8.5 18.5C8.6 19.3 9.3 19.8 10.1 19.6C10.8 19.4 11.3 18.8 11.2 18.1L10.7 15"
        fill={fg}
        stroke={border}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="18.5" y1="8" x2="21.5" y2="6" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19.5" y1="12" x2="22.5" y2="12" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="18.5" y1="16" x2="21.5" y2="18" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── 3. Chat / Message Button Icon ───────────────────────────────────────────────
export function ChatButtonIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        fill={fg}
        stroke={border}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── 4. Block Button Icon (Prohibited circle with diagonal line) ─────────────────
export function BlockButtonIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={border} strokeWidth="3" />
      <circle cx="12" cy="12" r="8.5" stroke={fg} strokeWidth="2" />
      <line x1="6" y1="6" x2="18" y2="18" stroke={border} strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke={fg} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── 5. Restore / Unblock Icon (Circle with broken diagonal slash) ───────────────
export function RestoreButtonIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={border} strokeWidth="3" />
      <circle cx="12" cy="12" r="8.5" stroke={fg} strokeWidth="2" />
      <line x1="6.2" y1="6.2" x2="9.8" y2="9.8" stroke={border} strokeWidth="3" strokeLinecap="round" />
      <line x1="6.2" y1="6.2" x2="9.8" y2="9.8" stroke={fg} strokeWidth="2" strokeLinecap="round" />
      <line x1="14.2" y1="14.2" x2="17.8" y2="17.8" stroke={border} strokeWidth="3" strokeLinecap="round" />
      <line x1="14.2" y1="14.2" x2="17.8" y2="17.8" stroke={fg} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
