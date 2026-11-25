// Persistent in-memory Blob URL + pre-decoded bitmap cache for Map UI backgrounds.
// Served globally from Cloudflare R2 Edge CDN (`https://cdn.kalceria.id/media/ui-bg/v53/...`)
// with automatic local fallback (`/BG_IMPROVE_FOR_MAP/...`) and RAM blob caching so
// Leaflet popups, chat boxes, and modals open with zero network stalls.

export const MAP_BG_CDN_BASE = "https://cdn.kalceria.id/media/ui-bg/v53";

export const EVENT_CARD_BG_LIGHT = `${MAP_BG_CDN_BASE}/BG_EventCardLight.webp`;
export const EVENT_CARD_BG_DARK = `${MAP_BG_CDN_BASE}/BG_EventCardDark.webp`;
export const KALCERIANS_PANEL_BG_LIGHT = `${MAP_BG_CDN_BASE}/BGOtherKalcerian_Light.webp`;
export const KALCERIANS_PANEL_BG_DARK = `${MAP_BG_CDN_BASE}/BGOtherKalcerian_Dark.webp`;
export const CREATION_BOX_BG_LIGHT = `${MAP_BG_CDN_BASE}/BG_BroadcastBoxLight.webp`;
export const CREATION_BOX_BG_DARK = `${MAP_BG_CDN_BASE}/BG_BroadscastBoxDark.webp`;
export const MINI_EVENT_FORM_BG_LIGHT = `${MAP_BG_CDN_BASE}/BGCreateMini_Light.webp`;
export const MINI_EVENT_FORM_BG_DARK = `${MAP_BG_CDN_BASE}/BGCreateMini_Dark.webp`;
export const BROADCAST_FORM_BG_LIGHT = `${MAP_BG_CDN_BASE}/BG_Broadcast_Light.webp`;
export const BROADCAST_FORM_BG_DARK = `${MAP_BG_CDN_BASE}/BG_Broadcast_Dark.webp`;
export const VOICE_CALL_BG_LIGHT = `${MAP_BG_CDN_BASE}/BG_VoiceCall_Light.webp`;
export const VOICE_CALL_BG_DARK = `${MAP_BG_CDN_BASE}/BG_VoiceCall_Dark.webp`;
export const EDIT_PROFILE_BG_LIGHT = `${MAP_BG_CDN_BASE}/BG_EditProfile_Light.webp`;
export const EDIT_PROFILE_BG_DARK = `${MAP_BG_CDN_BASE}/BG_EditProfile_Dark.webp`;

// Event Card backgrounds are listed first for highest network + decode priority.
export const MAP_BG_WEBP_ASSETS = [
  EVENT_CARD_BG_LIGHT,
  EVENT_CARD_BG_DARK,
  KALCERIANS_PANEL_BG_LIGHT,
  KALCERIANS_PANEL_BG_DARK,
  CREATION_BOX_BG_LIGHT,
  CREATION_BOX_BG_DARK,
  MINI_EVENT_FORM_BG_LIGHT,
  MINI_EVENT_FORM_BG_DARK,
  BROADCAST_FORM_BG_LIGHT,
  BROADCAST_FORM_BG_DARK,
  VOICE_CALL_BG_LIGHT,
  VOICE_CALL_BG_DARK,
  EDIT_PROFILE_BG_LIGHT,
  EDIT_PROFILE_BG_DARK,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_1_Light.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_1_Dark.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_2_Light.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_2_Dark.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_3_Light.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_3_Dark.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_4_Light.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_4_Dark.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_5_Light.webp`,
  `${MAP_BG_CDN_BASE}/BG_PersonalChat_5_Dark.webp`,
];

export function resolveLocalMapBgFallback(assetPath) {
  if (!assetPath || typeof assetPath !== "string") return "";
  if (assetPath.startsWith(`${MAP_BG_CDN_BASE}/`)) {
    const filename = assetPath.slice(MAP_BG_CDN_BASE.length + 1).split("?")[0];
    if (filename && !filename.includes("/")) {
      return `/BG_IMPROVE_FOR_MAP/${filename}`;
    }
  }
  return assetPath;
}

const BLOB_URL_MAP = new Map();
const IN_FLIGHT_MAP = new Map();
const DECODED_IMAGE_REFS = [];
let hasInitializedCssVars = false;
let hasScheduledStaggeredWarm = false;

function syncRootCssVar(assetPath, resolvedUrl) {
  if (typeof document === "undefined" || !document.documentElement) return;
  if (assetPath === EVENT_CARD_BG_LIGHT) {
    document.documentElement.style.setProperty(
      "--kalceria-event-bg-light",
      `url("${resolvedUrl}")`
    );
  } else if (assetPath === EVENT_CARD_BG_DARK) {
    document.documentElement.style.setProperty(
      "--kalceria-event-bg-dark",
      `url("${resolvedUrl}")`
    );
  }
}

function decodeIntoMemory(url, isHighPriority = false) {
  if (typeof window === "undefined") return Promise.resolve();
  const img = new window.Image();
  // Always decode off the main UI thread so Map Intro & UI animations stay 60fps
  img.decoding = "async";
  if ("fetchPriority" in img) {
    img.fetchPriority = isHighPriority ? "high" : "low";
  }
  img.src = url;
  DECODED_IMAGE_REFS.push(img);
  if (typeof img.decode === "function") {
    return img.decode().then(() => img).catch(() => img);
  }
  return Promise.resolve(img);
}

// The Event Card strips three mirrored copies of the artwork, so the tile aspect must be exact.
function syncEventBgAspectVar(assetPath, img) {
  if (typeof document === "undefined" || !document.documentElement || !img) return;
  if (assetPath !== EVENT_CARD_BG_LIGHT && assetPath !== EVENT_CARD_BG_DARK) return;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w > 0 && h > 0) {
    document.documentElement.style.setProperty("--kalceria-event-bg-aspect", String(w / h));
  }
}

function warmSingleMapBg(assetPath, isHighPriority = false) {
  if (typeof window === "undefined") return Promise.resolve(assetPath);
  if (BLOB_URL_MAP.has(assetPath)) {
    return Promise.resolve(BLOB_URL_MAP.get(assetPath));
  }
  if (IN_FLIGHT_MAP.has(assetPath)) {
    return IN_FLIGHT_MAP.get(assetPath);
  }

  const fetchAsBlob = (url) =>
    fetch(url, {
      mode: "cors",
      cache: "force-cache",
      priority: isHighPriority ? "high" : "low",
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    });

  const localFallback = resolveLocalMapBgFallback(assetPath);

  const task = fetchAsBlob(assetPath)
    .catch(() => (localFallback && localFallback !== assetPath ? fetchAsBlob(localFallback) : Promise.reject(new Error("CDN fetch failed"))))
    .then(async (blob) => {
      if (!blob || blob.size === 0) throw new Error("Empty blob");
      const blobUrl = URL.createObjectURL(blob);
      const decodedImg = await decodeIntoMemory(blobUrl, isHighPriority);
      BLOB_URL_MAP.set(assetPath, blobUrl);
      syncRootCssVar(assetPath, blobUrl);
      syncEventBgAspectVar(assetPath, decodedImg);
      return blobUrl;
    })
    .catch(async () => {
      const safeFallbackUrl = localFallback || assetPath;
      await decodeIntoMemory(safeFallbackUrl, isHighPriority);
      syncRootCssVar(assetPath, safeFallbackUrl);
      return safeFallbackUrl;
    })
    .finally(() => {
      IN_FLIGHT_MAP.delete(assetPath);
    });

  IN_FLIGHT_MAP.set(assetPath, task);
  return task;
}

export function preloadAllMapBackgrounds() {
  if (typeof window === "undefined") return;

  if (!hasInitializedCssVars) {
    hasInitializedCssVars = true;
    syncRootCssVar(EVENT_CARD_BG_LIGHT, BLOB_URL_MAP.get(EVENT_CARD_BG_LIGHT) || EVENT_CARD_BG_LIGHT);
    syncRootCssVar(EVENT_CARD_BG_DARK, BLOB_URL_MAP.get(EVENT_CARD_BG_DARK) || EVENT_CARD_BG_DARK);
  }

  if (hasScheduledStaggeredWarm) return;
  hasScheduledStaggeredWarm = true;

  const scheduleIdle =
    typeof window.requestIdleCallback === "function"
      ? (cb) => window.requestIdleCallback(cb, { timeout: 600 })
      : (cb) => setTimeout(cb, 250);

  // 1. Warm the 2 Event Card backgrounds during idle frames
  scheduleIdle(() => {
    warmSingleMapBg(EVENT_CARD_BG_LIGHT, true);
    warmSingleMapBg(EVENT_CARD_BG_DARK, true);
  });

  // 2. Stagger the remaining modal backgrounds sequentially after startup intro settles
  const secondaryAssets = MAP_BG_WEBP_ASSETS.slice(2);
  secondaryAssets.forEach((assetPath, idx) => {
    setTimeout(() => {
      scheduleIdle(() => {
        warmSingleMapBg(assetPath, false);
      });
    }, 1800 + idx * 260);
  });
}

export function getInstantMapBgUrl(assetPath) {
  if (!assetPath) return "";
  return BLOB_URL_MAP.get(assetPath) || assetPath;
}
