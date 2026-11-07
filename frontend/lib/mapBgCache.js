// Persistent in-memory Blob URL + pre-decoded bitmap cache for Map UI backgrounds.
// Eliminates HTTP revalidation round-trips and bitmap decode stalls when Leaflet
// injects Event Card popups via innerHTML.

export const EVENT_CARD_BG_LIGHT = "/BG_IMPROVE_FOR_MAP/BG_EventCardLight.webp";
export const EVENT_CARD_BG_DARK = "/BG_IMPROVE_FOR_MAP/BG_EventCardDark.webp";

// Event Card backgrounds are listed first for highest network + decode priority.
export const MAP_BG_WEBP_ASSETS = [
  EVENT_CARD_BG_LIGHT,
  EVENT_CARD_BG_DARK,
  "/BG_IMPROVE_FOR_MAP/BGOtherKalcerian_Light.webp",
  "/BG_IMPROVE_FOR_MAP/BGOtherKalcerian_Dark.webp",
  "/BG_IMPROVE_FOR_MAP/BG_BroadcastBoxLight.webp",
  "/BG_IMPROVE_FOR_MAP/BG_BroadscastBoxDark.webp",
  "/BG_IMPROVE_FOR_MAP/BGCreateMini_Light.webp",
  "/BG_IMPROVE_FOR_MAP/BGCreateMini_Dark.webp",
  "/BG_IMPROVE_FOR_MAP/CokiEditProfile.webp",
];

const BLOB_URL_MAP = new Map();
const IN_FLIGHT_MAP = new Map();
const DECODED_IMAGE_REFS = [];
let hasInitializedCssVars = false;

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

function decodeIntoMemory(url) {
  if (typeof window === "undefined") return Promise.resolve();
  const img = new window.Image();
  img.decoding = "sync";
  if ("fetchPriority" in img) {
    img.fetchPriority = "high";
  }
  img.src = url;
  DECODED_IMAGE_REFS.push(img);
  if (typeof img.decode === "function") {
    return img.decode().catch(() => {});
  }
  return Promise.resolve();
}

function warmSingleMapBg(assetPath, isHighPriority = false) {
  if (typeof window === "undefined") return Promise.resolve(assetPath);
  if (BLOB_URL_MAP.has(assetPath)) {
    return Promise.resolve(BLOB_URL_MAP.get(assetPath));
  }
  if (IN_FLIGHT_MAP.has(assetPath)) {
    return IN_FLIGHT_MAP.get(assetPath);
  }

  const task = fetch(assetPath, {
    cache: "force-cache",
    priority: isHighPriority ? "high" : "auto",
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(async (blob) => {
      if (!blob || blob.size === 0) throw new Error("Empty blob");
      const blobUrl = URL.createObjectURL(blob);
      await decodeIntoMemory(blobUrl);
      BLOB_URL_MAP.set(assetPath, blobUrl);
      syncRootCssVar(assetPath, blobUrl);
      return blobUrl;
    })
    .catch(async () => {
      await decodeIntoMemory(assetPath);
      syncRootCssVar(assetPath, assetPath);
      return assetPath;
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

  MAP_BG_WEBP_ASSETS.forEach((assetPath, idx) => {
    warmSingleMapBg(assetPath, idx < 2);
  });
}

export function getInstantMapBgUrl(assetPath) {
  if (!assetPath) return "";
  return BLOB_URL_MAP.get(assetPath) || assetPath;
}

// Start warming Event Card backgrounds immediately when evaluated on client
if (typeof window !== "undefined") {
  preloadAllMapBackgrounds();
}
