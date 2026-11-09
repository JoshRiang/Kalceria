"use client";

export function EditProfileDangerZone({
  iconFg,
  iconStroke,
  onRequestChangePassword,
  onRequestDeleteAccount,
}) {
  return (
    <div className="shrink-0 mt-1 pt-2.5 flex items-center justify-between border-t border-black/10 dark:border-white/10 relative z-20">
      {/* Change Password (Pure Gembok / Padlock Icon) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRequestChangePassword?.();
        }}
        style={{ fontFamily: "Arial, sans-serif" }}
        className="font-bold text-xs text-red-500 hover:text-red-400 no-underline transition-colors flex items-center gap-1.5 cursor-pointer relative z-20 pointer-events-auto select-none"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 pointer-events-none">
          {/* Shackle */}
          <path
            d="M 7 10 V 7 C 7 4.2 9.2 2 12 2 C 14.8 2 17 4.2 17 7 V 10"
            stroke={iconFg}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Body */}
          <rect
            x="4.5"
            y="10"
            width="15"
            height="12"
            rx="3"
            fill={iconFg}
            stroke={iconStroke}
            strokeWidth="1.2"
          />
          {/* Keyhole */}
          <circle cx="12" cy="14.8" r="1.3" fill={iconStroke} />
          <line x1="12" y1="16.1" x2="12" y2="18.5" stroke={iconStroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Change Password
      </button>

      {/* Delete Account (Picture 2 Delete Account Icon) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRequestDeleteAccount?.();
        }}
        style={{ fontFamily: "Arial, sans-serif" }}
        className="font-bold text-xs text-red-500 hover:text-red-400 no-underline transition-colors flex items-center gap-1.5 cursor-pointer relative z-20 pointer-events-auto select-none"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 pointer-events-none">
          <path d="M 21.5 10.5 A 10 10 0 1 0 11.5 21.9" stroke={iconFg} strokeWidth="1.8" />
          <circle cx="10.5" cy="8.5" r="3.2" fill={iconFg} stroke={iconStroke} strokeWidth="1.2" />
          <path d="M 4.5 18 C 4.5 14.5 7.5 13.5 10.5 13.5 C 12.2 13.5 13.6 13.9 14.6 14.6" fill={iconFg} stroke={iconStroke} strokeWidth="1.2" />
          <circle cx="17" cy="17" r="5" fill={iconFg} stroke={iconStroke} strokeWidth="1.6" />
          <line x1="15" y1="15" x2="19" y2="19" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="19" y1="15" x2="15" y2="19" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Delete Account
      </button>
    </div>
  );
}
