import { esc } from "./popupHelpers";
import { inferIsVideoMediaUrl } from "./popupMediaMetadata";

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

export function renderSingleMedia(mediaEntry, { isSingle = true, index = 0 } = {}) {
  const url = typeof mediaEntry === "string" ? mediaEntry : mediaEntry?.url || "";
  const isVideo =
    typeof mediaEntry === "object" && typeof mediaEntry?.isVideo === "boolean"
      ? mediaEntry.isVideo
      : inferIsVideoMediaUrl(url);

  if (isVideo) {
    return `
      <video
        src="${esc(url)}"
        ${index === 0 ? "autoplay" : ""}
        ${isSingle ? "loop" : ""}
        preload="auto"
        muted
        playsinline
        style="width: 100%; height: 100%; object-fit: contain; display: block; background: transparent;"
      ></video>
    `;
  }

  return `
    <img
      src="${esc(url)}"
      alt="Event Live Feed"
      loading="${index === 0 ? "eager" : "lazy"}"
      style="width: 100%; height: 100%; object-fit: contain; display: block; background: transparent;"
    />
  `;
}

export function renderMediaCarousel(mediaList, isMapDark, creatorAvatarUrl, creatorName, safeId) {
  const rawList = Array.isArray(mediaList)
    ? mediaList.filter(Boolean)
    : (mediaList ? [mediaList] : []);

  if (rawList.length === 0) {
    return renderEmptyMediaPlaceholder(isMapDark, creatorAvatarUrl, creatorName);
  }

  const N = rawList.length;
  const isSingle = N === 1;

  const slidesHtml = rawList
    .map((entry, i) => {
      const wAttr = typeof entry === "object" && entry?.width ? String(entry.width) : "";
      const hAttr = typeof entry === "object" && entry?.height ? String(entry.height) : "";
      const dAttr = typeof entry === "object" && entry?.duration ? String(entry.duration) : "";
      const initialTransform = i === 0 ? "translateX(0%)" : "translateX(100%)";
      const initialVisibility = i === 0 ? "visible" : "hidden";
      const initialZ = i === 0 ? "4" : "1";
      const initialPointer = i === 0 ? "auto" : "none";

      return `
        <div
          data-carousel-slide="${i}"
          data-media-w="${esc(wAttr)}"
          data-media-h="${esc(hAttr)}"
          data-media-duration="${esc(dAttr)}"
          style="position: absolute; inset: 0; width: 100%; height: 100%; background: #0b0d14; transform: ${initialTransform}; visibility: ${initialVisibility}; z-index: ${initialZ}; pointer-events: ${initialPointer}; will-change: transform;"
        >
          ${renderSingleMedia(entry, { isSingle, index: i })}
        </div>
      `;
    })
    .join("");

  const tapZonesHtml = !isSingle
    ? `
      <button
        type="button"
        aria-label="Previous media"
        onpointerdown="event.stopPropagation();"
        onclick="event.stopPropagation(); window.__kalceriaStepEventMedia?.('${esc(safeId)}', -1);"
        style="position: absolute; top: 0; bottom: 0; left: 0; width: 32%; z-index: 12; background: transparent; border: none; padding: 0; margin: 0; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;"
      ></button>
      <button
        type="button"
        aria-label="Next media"
        onpointerdown="event.stopPropagation();"
        onclick="event.stopPropagation(); window.__kalceriaStepEventMedia?.('${esc(safeId)}', 1);"
        style="position: absolute; top: 0; bottom: 0; right: 0; width: 68%; z-index: 12; background: transparent; border: none; padding: 0; margin: 0; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;"
      ></button>
    `
    : "";

  const indicatorsHtml = !isSingle
    ? `
      <div style="position: absolute; top: 4px; left: 10px; right: 10px; z-index: 15; display: flex; gap: 5px; pointer-events: auto;">
        ${rawList
          .map((_, i) => `
            <button
              type="button"
              data-carousel-indicator="${i}"
              title="Clip ${i + 1}"
              onpointerdown="event.stopPropagation();"
              onclick="event.stopPropagation(); window.__kalceriaSwitchEventMedia?.('${esc(safeId)}', ${i});"
              style="flex: 1; padding: 6px 0; background: transparent; border: none; cursor: pointer; pointer-events: auto; outline: none; display: flex; align-items: center;"
            >
              <span style="display: block; width: 100%; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.32); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.45);">
                <span data-carousel-fill="${i}" style="display: block; height: 100%; background: #ffffff; width: ${i === 0 ? "0%" : "0%"}; opacity: ${i === 0 ? "1" : "0.35"};"></span>
              </span>
            </button>
          `)
          .join("")}
      </div>
    `
    : "";

  return `
    <div
      id="event-carousel-${esc(safeId)}"
      data-carousel-container="${esc(safeId)}"
      data-slide-count="${N}"
      class="popup-carousel-container"
      style="position: relative; width: 100%; height: 100%; overflow: hidden; background: #0b0d14;"
    >
      ${slidesHtml}
      ${tapZonesHtml}
      ${indicatorsHtml}
    </div>
  `;
}
