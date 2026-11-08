import { esc } from "./popupHelpers";

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

export function renderSingleMedia(url) {
  const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);

  if (isVideo) {
    return `
      <video 
        src="${esc(url)}" 
        autoplay 
        loop 
        muted 
        playsinline 
        style="width: 100%; height: 100%; object-fit: cover; display: block;"
      ></video>
    `;
  }

  return `
    <img 
      src="${esc(url)}" 
      alt="Event Live Feed" 
      loading="lazy" 
      style="width: 100%; height: 100%; object-fit: cover; display: block;" 
    />
  `;
}

export function renderMediaCarousel(mediaList, isMapDark, creatorAvatarUrl, creatorName, safeId) {
  const list = Array.isArray(mediaList)
    ? mediaList.filter(Boolean)
    : (mediaList ? [mediaList] : []);

  if (list.length === 0) {
    return renderEmptyMediaPlaceholder(isMapDark, creatorAvatarUrl, creatorName);
  }

  const slidesHtml = list
    .map((url, i) => {
      const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);
      const mediaTag = isVideo
        ? `<video src="${esc(url)}" playsinline muted preload="auto" style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>`
        : `<img src="${esc(url)}" alt="Event Live Feed" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`;
      return `
        <div data-carousel-slide="${i}" data-is-video="${isVideo ? 'true' : 'false'}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: ${i === 0 ? 1 : 0}; z-index: ${i === 0 ? 5 : 1}; transition: opacity 0.28s ease-in-out; pointer-events: none;">
          ${mediaTag}
        </div>
      `;
    })
    .join("");

  const indicatorsHtml = list
    .map((_, i) => {
      return `
        <button
          type="button"
          data-carousel-indicator="${i}"
          title="Media ${i + 1}"
          onclick="event.stopPropagation(); window.__kalceriaSwitchEventMedia?.('${esc(safeId)}', ${i});"
          style="flex: 1; padding: 4px 0; background: transparent; border: none; cursor: pointer; pointer-events: auto; outline: none; display: flex; align-items: center;"
        >
          <span style="display: block; width: 100%; height: 2.5px; border-radius: 2px; background: rgba(255, 255, 255, 0.35); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.5);">
            <span data-carousel-fill="${i}" style="display: block; height: 100%; background: #ffffff; width: ${i === 0 ? '0%' : '0%'}; opacity: ${i === 0 ? '1' : '0.35'}; transform: translateZ(0);"></span>
          </span>
        </button>
      `;
    })
    .join("");

  return `
    <div id="event-carousel-${esc(safeId)}" class="popup-carousel-container" style="position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 12px; background: ${isMapDark ? '#000000' : '#ffffff'};">
      ${slidesHtml}

      <!-- Story Navigation Tap Zones: Left = Prev (32%), Middle = Next (36%), Right = Next (32%) -->
      <div style="position: absolute; inset: 0; z-index: 12; display: flex; pointer-events: auto;">
        <div 
          title="Previous" 
          onclick="event.stopPropagation(); window.__kalceriaPrevEventMedia?.('${esc(safeId)}');"
          style="width: 32%; height: 100%; cursor: pointer;"
        ></div>
        <div 
          title="Next" 
          onclick="event.stopPropagation(); window.__kalceriaNextEventMedia?.('${esc(safeId)}');"
          style="width: 36%; height: 100%; cursor: pointer;"
        ></div>
        <div 
          title="Next" 
          onclick="event.stopPropagation(); window.__kalceriaNextEventMedia?.('${esc(safeId)}');"
          style="width: 32%; height: 100%; cursor: pointer;"
        ></div>
      </div>

      <!-- Story Progress Lines Indicator Bar -->
      <div style="position: absolute; top: 6px; left: 8px; right: 8px; z-index: 20; display: flex; gap: 4px; pointer-events: auto;">
        ${indicatorsHtml}
      </div>

      <!-- Auto-init Image Trigger (Invokes JS Carousel controller immediately upon DOM injection) -->
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:none;" onload="window.__kalceriaInitEventCarousel?.('${esc(safeId)}');" />
    </div>
  `;
}
