"use client";

/**
 * Seamless borderless feathered blur backdrop for Edit Profile action controls
 * (Change Password, Delete Account, and WhatsApp/Instagram trashcan buttons).
 *
 * Uses soft intersected linear-gradient feathering (or elliptical feather for compact icons)
 * with zero border/outline so text and icons remain legible over background artwork without
 * showing any rectangular box edge or visual seam.
 */
export function EditProfileActionBackdrop({ isModalDark = false, compact = false }) {
  const featherMask = compact
    ? "radial-gradient(ellipse 74% 74% at 50% 50%, #000 42%, rgba(0, 0, 0, 0.72) 68%, transparent 100%)"
    : "linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 24%, #000 76%, transparent 100%)";

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none absolute z-0 ${
        compact ? "-inset-1.5 rounded-lg" : "-inset-x-3 -inset-y-1.5 rounded-xl"
      }`}
      style={{
        backgroundColor: isModalDark
          ? "rgba(11, 15, 22, 0.74)"
          : "rgba(252, 248, 244, 0.84)",
        backdropFilter: "blur(10px) saturate(110%)",
        WebkitBackdropFilter: "blur(10px) saturate(110%)",
        maskImage: featherMask,
        WebkitMaskImage: featherMask,
        ...(compact
          ? {}
          : {
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }),
      }}
    />
  );
}
