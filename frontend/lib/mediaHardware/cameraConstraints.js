// Camera constraint tiers & orientation alignment.
// Every fallback tier keeps the viewport-aware size/aspect hints so a phone held in portrait
// is never silently downgraded to a default landscape sensor mode.

const PORTRAIT_SIZE = { width: 720, height: 1280 };
const LANDSCAPE_SIZE = { width: 1280, height: 720 };

export function isMobileViewport() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export function isViewportPortrait() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(orientation: portrait)").matches;
    } catch {}
  }
  return window.innerWidth < window.innerHeight;
}

export function resolveIdealCameraSize() {
  return isMobileViewport() && isViewportPortrait() ? PORTRAIT_SIZE : LANDSCAPE_SIZE;
}

export function buildCameraConstraintTiers(customVideoConstraints = {}, audio = false) {
  const size = resolveIdealCameraSize();
  const aspect = size.width / size.height;
  const sizeHints = {
    width: { ideal: size.width },
    height: { ideal: size.height },
    aspectRatio: { ideal: aspect },
  };
  const { facingMode, ...restCustom } = customVideoConstraints || {};
  const facing = facingMode || "user";

  return [
    {
      video: { facingMode: facing, ...sizeHints, frameRate: { ideal: 30 }, ...restCustom },
      audio,
    },
    {
      video: { facingMode: facing, ...sizeHints, ...restCustom },
      audio,
    },
    {
      video: { ...sizeHints, ...restCustom },
      audio,
    },
    {
      video: { facingMode: facing, aspectRatio: { ideal: aspect } },
      audio,
    },
    { video: true, audio },
  ];
}

function readTrackSize(stream) {
  const track = stream?.getVideoTracks?.()[0];
  const settings = track?.getSettings?.() || {};
  return { track, width: settings.width || 0, height: settings.height || 0 };
}

/**
 * When the viewport is portrait on a phone but the sensor delivered a landscape frame
 * (or the reverse), re-apply the size hints on the live track so the capture fills the screen.
 */
export async function alignStreamOrientation(stream) {
  if (!stream || !isMobileViewport()) return stream;
  const wantPortrait = isViewportPortrait();
  const { track, width, height } = readTrackSize(stream);
  if (!track || !width || !height) return stream;
  const isPortraitFrame = height > width;
  if (isPortraitFrame === wantPortrait) return stream;
  if (typeof track.applyConstraints !== "function") return stream;

  const size = wantPortrait ? PORTRAIT_SIZE : LANDSCAPE_SIZE;
  try {
    await track.applyConstraints({
      width: { ideal: size.width },
      height: { ideal: size.height },
      aspectRatio: { ideal: size.width / size.height },
    });
  } catch {}
  return stream;
}

