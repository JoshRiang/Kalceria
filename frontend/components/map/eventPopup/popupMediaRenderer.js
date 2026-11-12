import { esc } from "./popupHelpers";
import { inferIsVideoMediaUrl } from "./popupMediaMetadata";

const FEED_FRAME_BG = "#0a0e27";
const FEED_GRADIENT_BG = "background: #0a0e27; background-image: radial-gradient(circle at 50% 50%, rgba(255, 214, 10, 0.05) 0%, rgba(10, 14, 39, 0.95) 75%, #060812 100%);";

export function renderEmptyMediaPlaceholder(isMapDark, creatorAvatarUrl, creatorName) {
  const screenBg = isMapDark ? "#000000" : "#ffffff";
  const ringColor = isMapDark ? "#ffffff" : "#000000";
  return `
    <div style="width: 100%; height: 100%; background: ${screenBg}; display: flex; align-items: center; justify-content: center; position: relative;">
      <div style="width: 58px; height: 58px; border-radius: 9999px; overflow: hidden; border: 2px solid ${ringColor}; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28); background: ${screenBg}; flex-shrink: 0;">
        <img
          src="${esc(creatorAvatarUrl)}"
          alt="${esc(creatorName)}"
          style="width: 100%; height: 100%; object-fit: cover; display: block;"
        />
      </div>
    </div>
  `;
}

export function renderSingleMedia(mediaEntry, { index = 0 } = {}) {
  const url = typeof mediaEntry === "string" ? mediaEntry : mediaEntry?.url || "";
  const isVideo =
    typeof mediaEntry === "object" && typeof mediaEntry?.isVideo === "boolean"
      ? mediaEntry.isVideo
      : inferIsVideoMediaUrl(url);

  if (isVideo) {
    return `
      <div style="width: 100%; height: 100%; box-sizing: border-box;">
        <video
          src="${esc(url)}"
          ${index === 0 ? "autoplay" : ""}
          preload="auto"
          muted
          playsinline
          webkit-playsinline
          x5-playsinline
          disablepictureinpicture
          disableremoteplayback
          style="width: 100%; height: 100%; object-fit: contain; display: block; background: transparent; pointer-events: none;"
        ></video>
      </div>
    `;
  }

  return `
    <div style="width: 100%; height: 100%; box-sizing: border-box;">
      <img
        src="${esc(url)}"
        alt="Event Live Feed"
        loading="${index <= 1 ? "eager" : "lazy"}"
        draggable="false"
        style="width: 100%; height: 100%; object-fit: contain; display: block; background: transparent; pointer-events: none; user-select: none;"
      />
    </div>
  `;
}

function resolveIndicatorGapPx(count) {
  if (count <= 8) return 5;
  if (count <= 20) return 3;
  if (count <= 50) return 2;
  return 1;
}

export function renderMediaCarousel(mediaList, isMapDark, creatorAvatarUrl, creatorName, safeId) {
  const rawList = Array.isArray(mediaList)
    ? mediaList.filter(Boolean)
    : (mediaList ? [mediaList] : []);

  if (rawList.length === 0) {
    return renderEmptyMediaPlaceholder(isMapDark, creatorAvatarUrl, creatorName);
  }

  const N = rawList.length;

  const slidesHtml = rawList
    .map((entry, i) => {
      const isObject = typeof entry === "object";
      const clipId = isObject && entry?.id ? String(entry.id) : `clip_${i}`;
      const urlAttr = isObject ? entry?.url || "" : String(entry || "");
      const wAttr = isObject && entry?.width ? String(entry.width) : "";
      const hAttr = isObject && entry?.height ? String(entry.height) : "";
      const dAttr = isObject && entry?.duration ? String(entry.duration) : "";
      const avatarUrl = (isObject && entry?.authorAvatarUrl) || creatorAvatarUrl || "";
      const authorName = (isObject && entry?.authorName) || creatorName || "Kalcerian";
      const viewCount = isObject && Number.isFinite(Number(entry?.viewCount)) ? Number(entry.viewCount) : 0;
      const initialTransform = i === 0 ? "translateX(0%)" : "translateX(100%)";
      const initialVisibility = i === 0 ? "visible" : "hidden";
      const initialZ = i === 0 ? "4" : "1";

      return `
        <div
          data-carousel-slide="${i}"
          data-clip-id="${esc(clipId)}"
          data-media-url="${esc(urlAttr)}"
          data-media-w="${esc(wAttr)}"
          data-media-h="${esc(hAttr)}"
          data-media-duration="${esc(dAttr)}"
          data-author-avatar="${esc(avatarUrl)}"
          data-author-name="${esc(authorName)}"
          data-view-count="${viewCount}"
          style="position: absolute; inset: 0; width: 100%; height: 100%; ${FEED_GRADIENT_BG} transform: ${initialTransform}; visibility: ${initialVisibility}; z-index: ${initialZ}; pointer-events: none; will-change: transform;"
        >
          ${renderSingleMedia(entry, { index: i })}
        </div>
      `;
    })
    .join("");

  const tapLayerHtml = `
    <div
      data-carousel-tap-layer
      aria-label="Feed navigation: tap left for previous, tap right for next, hold to pause"
      style="position: absolute; inset: 0; z-index: 12; background: transparent; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; user-select: none;"
    ></div>
  `;

  const gap = resolveIndicatorGapPx(N);
  const indicatorsHtml = `
    <div style="position: absolute; top: 4px; left: 10px; right: 10px; z-index: 15; display: flex; gap: ${gap}px; pointer-events: auto;">
      ${rawList
        .map((_, i) => `
          <button
            type="button"
            data-carousel-indicator="${i}"
            title="Clip ${i + 1}"
            onpointerdown="event.stopPropagation();"
            onclick="event.stopPropagation(); window.__kalceriaSwitchEventMedia?.('${esc(safeId)}', ${i});"
            style="flex: 1 1 0; min-width: 0; padding: 6px 0; background: transparent; border: none; cursor: pointer; pointer-events: auto; outline: none; display: flex; align-items: center;"
          >
            <span style="display: block; width: 100%; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.32); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.45);">
              <span data-carousel-fill="${i}" style="display: block; width: 100%; height: 100%; background: #ffffff; transform: scaleX(0); transform-origin: left center; will-change: transform;"></span>
            </span>
          </button>
        `)
        .join("")}
    </div>
  `;

  return `
    <div
      id="event-carousel-${esc(safeId)}"
      data-carousel-container="${esc(safeId)}"
      data-slide-count="${N}"
      data-feed-state="idle"
      class="popup-carousel-container"
      style="position: relative; width: 100%; height: 100%; overflow: hidden; ${FEED_GRADIENT_BG}"
    >
      ${slidesHtml}
      ${tapLayerHtml}
      ${indicatorsHtml}
    </div>
  `;
}
