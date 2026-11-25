"use client";

import { EDIT_PROFILE_BG_DARK, EDIT_PROFILE_BG_LIGHT, getInstantMapBgUrl } from "@/lib/mapBgCache";

export function EditProfileCokiBackground({ isModalDark }) {
  const bgUrl = getInstantMapBgUrl(isModalDark ? EDIT_PROFILE_BG_DARK : EDIT_PROFILE_BG_LIGHT);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
    >
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundImage: `url("${bgUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: isModalDark ? 0.9 : 0.94,
        }}
      />
      <div
        className={`absolute inset-0 pointer-events-none ${
          isModalDark ? "bg-[#080a11]/18" : "bg-[#f4efe9]/12"
        }`}
      />
    </div>
  );
}
