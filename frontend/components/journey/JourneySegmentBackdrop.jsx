"use client";

import { getJourneySegmentBgUrls } from "@/lib/pageBgAssets";

/**
 * Dual-scheme HD background backdrop for SeeJourney top 3 segments.
 * Default state renders the Light (white base) editorial artwork; tapping the card
 * (`isFlipped === true`) smoothly crossfades into the Dark (black base) twin while
 * preserving the exact original blur(18px) / brightness / scale focus logic intact.
 */
export function JourneySegmentBackdrop({
  segmentIndex,
  isMobileOrTablet,
  isFlipped,
}) {
  const { light, dark, localLight, localDark } = getJourneySegmentBgUrls(
    segmentIndex,
    isMobileOrTablet
  );

  return (
    <>
      {/* Background Layer with Graceful Blur / Unblur (existing blur logic 100% preserved) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-all duration-700 ease-in-out pointer-events-none"
        style={{
          filter: isFlipped ? "blur(18px) brightness(0.82)" : "blur(0px) brightness(1)",
          transform: isFlipped ? "scale(1.05)" : "scale(1)",
          willChange: "filter, transform",
        }}
      >
        {/* Dark Layer (Revealed seamlessly when card is tapped / flipped) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundColor: "#06080d",
            backgroundImage: `url("${dark}"), url("${localDark}")`,
          }}
        />
        {/* Light Layer (Default crisp white-base editorial artwork; crossfades out on flip) */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out"
          style={{
            backgroundColor: "#f8f7f4",
            backgroundImage: `url("${light}"), url("${localLight}")`,
            opacity: isFlipped ? 0 : 1,
          }}
        />
      </div>

      {/* Original subtle dark focus veil on card flip */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/35 transition-opacity duration-700 pointer-events-none"
        style={{ opacity: isFlipped ? 1 : 0 }}
      />
    </>
  );
}
