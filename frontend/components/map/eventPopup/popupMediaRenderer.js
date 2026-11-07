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
  if (list.length === 1) {
    return renderSingleMedia(list[0]);
  }

  const N = list.length;
  const period = N * 4;
  const activePercent = Math.max(1, Math.floor(90 / N));
  const fullPercent = Math.max(2, Math.floor(100 / N));
  const animName = `eventCarouselFade_${safeId}_${N}`;
  const indAnimName = `eventIndicatorRoll_${safeId}_${N}`;

  const slidesHtml = list
    .map((url, i) => {
      const delay = i * 4;
      return `
        <div data-carousel-slide="${i}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: ${i === 0 ? 1 : 0}; animation: ${animName} ${period}s infinite; animation-delay: ${delay}s; transition: opacity 0.22s ease;">
          ${renderSingleMedia(url)}
        </div>
      `;
    })
    .join("");

  const indicatorsHtml = list
    .map((_, i) => {
      const delay = i * 4;
      return `
        <button
          type="button"
          data-carousel-indicator="${i}"
          title="Video ${i + 1}"
          onclick="event.stopPropagation(); window.__kalceriaSwitchEventMedia?.('${esc(safeId)}', ${i});"
          style="flex: 1; padding: 6px 0; background: transparent; border: none; cursor: pointer; pointer-events: auto; outline: none; display: flex; align-items: center;"
        >
          <span style="display: block; width: 100%; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.32); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.45);">
            <span data-carousel-fill="${i}" style="display: block; height: 100%; background: #ffffff; width: 0%; animation: ${indAnimName} ${period}s infinite; animation-delay: ${delay}s;"></span>
          </span>
        </button>
      `;
    })
    .join("");

  return `
    <style>
      @keyframes ${animName} {
        0% { opacity: 0; }
        1.5% { opacity: 1; }
        ${activePercent}% { opacity: 1; }
        ${fullPercent}% { opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes ${indAnimName} {
        0% { width: 0%; opacity: 0.4; }
        1.5% { opacity: 1; }
        ${activePercent}% { width: 100%; opacity: 1; }
        ${fullPercent}% { width: 100%; opacity: 0.3; }
        100% { width: 0%; opacity: 0.3; }
      }
    </style>
    <div id="event-carousel-${esc(safeId)}" class="popup-carousel-container" style="position: relative; width: 100%; height: 100%; overflow: hidden;">
      ${slidesHtml}
      <div style="position: absolute; top: 4px; left: 10px; right: 10px; z-index: 15; display: flex; gap: 5px; pointer-events: auto;">
        ${indicatorsHtml}
      </div>
    </div>
  `;
}
