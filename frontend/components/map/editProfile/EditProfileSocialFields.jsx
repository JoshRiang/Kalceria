"use client";

export function EditProfileSocialFields({
  phone,
  setPhone,
  phoneInputRef,
  waValidation,
  instagram,
  setInstagram,
  igInputRef,
  igValidation,
  iconFg,
  iconStroke,
  inputBgClass,
}) {
  return (
    <>
      {/* WhatsApp */}
      <div className="shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z"
                fill={iconFg}
                stroke={iconStroke}
                strokeWidth="1.2"
              />
              <path
                d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.6-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"
                fill={iconStroke}
              />
            </svg>
            <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
              WhatsApp
            </label>
          </div>

          {phone.trim() ? (
            <button
              type="button"
              onClick={() => setPhone("")}
              title="Omit WhatsApp number"
              className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => phoneInputRef.current?.focus()}
              title="Add WhatsApp Number"
              className="w-5 h-5 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="4" x2="12" y2="20" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
                <line x1="4" y1="12" x2="20" y2="12" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <input
          ref={phoneInputRef}
          type="tel"
          maxLength={25}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Add WhatsApp Number"
          className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
        />
        {!waValidation.valid && (
          <p className="text-[10px] text-red-500 mt-1 font-sans">
            Nomor tidak valid
          </p>
        )}
      </div>

      {/* Instagram */}
      <div className="shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="5" fill={iconFg} stroke={iconStroke} strokeWidth="1.4" />
              <circle cx="12" cy="12" r="4.2" stroke={iconStroke} strokeWidth="1.6" fill="none" />
              <circle cx="17" cy="7" r="1.1" fill={iconStroke} />
            </svg>
            <label style={{ fontFamily: "Arial, sans-serif" }} className="font-bold text-[11.5px] text-gray-500 dark:text-neutral-400">
              Instagram
            </label>
          </div>

          {instagram.trim() ? (
            <button
              type="button"
              onClick={() => setInstagram("")}
              title="Omit Instagram handle"
              className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => igInputRef.current?.focus()}
              title="Add Instagram Link"
              className="w-5 h-5 flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="4" x2="12" y2="20" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
                <line x1="4" y1="12" x2="20" y2="12" stroke={iconFg} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-xs">
            @
          </span>
          <input
            ref={igInputRef}
            type="text"
            maxLength={40}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
            placeholder="Add Instagram Link / Handle"
            className={`w-full border rounded-lg pl-7 pr-3 py-2 text-xs sm:text-[13px] outline-none transition-all ${inputBgClass}`}
          />
        </div>
        {!igValidation.valid && (
          <p className="text-[10px] text-red-500 mt-1 font-sans">
            Username tidak valid
          </p>
        )}
      </div>
    </>
  );
}
