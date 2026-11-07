"use client";

// ─── 2D WhatsApp Icon (Official 100% authentic vector branding) ────
export function WhatsApp2DIcon({ isRegistered, size = 46 }) {
  const bg = isRegistered ? "#25D366" : "#8b949e";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
    >
      {/* 1. Official WhatsApp Speech Bubble with Lower-Left Tail */}
      <path
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z"
        fill={bg}
      />
      {/* 2. Official Smooth Telephone Handset */}
      <path
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.6-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"
        fill="#ffffff"
      />
    </svg>
  );
}

// ─── 2D Instagram Icon (Vibrant gradient when registered, gray when not) ───
export function Instagram2DIcon({ isRegistered, size = 46 }) {
  const gradId = "igGradStandardCard";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0 transition-transform duration-200 group-hover:scale-110 drop-shadow-md"
    >
      <defs>
        <radialGradient id={gradId} cx="30%" cy="105%" r="120%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="10%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="65%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      {/* Circle base */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={isRegistered ? `url(#${gradId})` : "#8b949e"}
      />
      {/* Rounded square camera contour */}
      <rect
        x="14"
        y="14"
        width="20"
        height="20"
        rx="5.5"
        stroke="#ffffff"
        strokeWidth="2.4"
        fill="none"
      />
      {/* Camera lens circle */}
      <circle
        cx="24"
        cy="24"
        r="5"
        stroke="#ffffff"
        strokeWidth="2.4"
        fill="none"
      />
      {/* Camera flash dot */}
      <circle cx="29.5" cy="18.5" r="1.4" fill="#ffffff" />
    </svg>
  );
}
