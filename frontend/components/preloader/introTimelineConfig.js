/**
 * Pure Landing Intro Preloader Timing & Motion Configuration.
 * Zero React/DOM/alias dependencies so it executes natively in both Next.js and Node --test.
 *
 * - Non-desktop (HP intro family): pre-warms K-silhouette video collage + logo decode before
 *   revealing (eliminating in-place K rendering) and adds >= 3s extra visible hold slack
 *   compared to the old 2.5s window (5.8s visible hold vs 2.5s = +3.3s).
 * - Desktop: slows ONLY the KALCERIA title Marvel zoom (120% -> 100%) by 50% speed
 *   (1.4s -> 2.8s), leaving all other desktop intro timings and elements unchanged.
 */

export const INTRO_TIMELINE = {
  mobile: {
    // Silent pre-warm gate before reveal so K-silhouette car frames & logo are 100% ready
    minPrewarmMs: 550,
    maxReadyWaitMs: 1800,
    minReadyVideos: 2,
    // Visible showcase hold after ready (+3.3s padding vs old 2500ms window; >= 3s slack)
    visibleHoldMs: 5800,
    // Graceful fade-out before LaserGrid fires
    exitFadeMs: 1000,
    // LaserGrid PWM exit duration (unchanged)
    laserDurationMs: 3900,
    // Non-desktop Marvel zoom behavior preserved verbatim (1.15s reveal, 0.9s exit)
    logoZoomDurationSec: 1.15,
    logoExitDurationSec: 0.9,
    collageFadeDurationSec: 1.4,
  },
  desktop: {
    // Original FinalJosh desktop orchestration timings preserved 100%
    logoStartMs: 1000,
    subtitleStartMs: 2500,
    laserStartMs: 9500,
    laserDurationMs: 3900,
    auroraDurationMs: 9500,
    // ONLY desktop title Marvel zoom slowed by 50% (half speed: 1.4s -> 2.8s)
    logoZoomDurationSec: 2.8,
    logoFadeDurationSec: 2.1,
    // All other desktop element transitions unchanged
    collageFadeDurationSec: 2.6,
    subtitleFadeDurationSec: 0.8,
  },
};
