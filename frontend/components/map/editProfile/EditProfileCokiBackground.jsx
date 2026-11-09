"use client";

import { EDIT_PROFILE_COKI_PATTERN } from "./editProfileHelpers";

export function EditProfileCokiBackground({ isModalDark }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-[54px] bottom-0 z-0 pointer-events-none select-none overflow-hidden"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 14px, black 30px)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 14px, black 30px)",
      }}
    >
      {EDIT_PROFILE_COKI_PATTERN.map((item, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={idx}
          src="/BG_IMPROVE_FOR_MAP/CokiEditProfile.webp"
          alt=""
          decoding="sync"
          draggable={false}
          style={{
            position: "absolute",
            top: item.top,
            left: item.left,
            width: `${item.size}px`,
            height: `${item.size}px`,
            transform: `rotate(${item.rotate})`,
            filter: isModalDark
              ? "brightness(1.08) drop-shadow(0 0 1.2px rgba(255,255,255,0.62)) drop-shadow(0 0 9px rgba(255,255,255,0.15))"
              : "contrast(1.18)",
          }}
          className={`object-contain transition-opacity duration-300 ${
            isModalDark ? "opacity-[0.34]" : "opacity-[0.38]"
          }`}
        />
      ))}
    </div>
  );
}
