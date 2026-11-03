// EventPopup.jsx
// Stateless utility for generating event popup HTML for Leaflet
import { getEventCategory } from "./EventIcon";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanDesc(value) {
  return String(value || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .trim();
}

function extractMediaList(item) {
  if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
    return item.mediaUrls.filter(Boolean);
  }
  if (item.mediaUrl) {
    if (item.mediaUrl.includes(",")) {
      return item.mediaUrl.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [item.mediaUrl];
  }
  if (item.videoUrl) return [item.videoUrl];
  if (item.gifUrl) return [item.gifUrl];
  const match = String(item.description || "").match(/\[MEDIA:([^\]]+)\]/i);
  if (match) {
    const raw = match[1];
    if (raw.includes(",")) {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [raw];
  }

  // Fallback videos (transcoded from GIFs for 94% network reduction) based on category
  const categoryId = getEventCategory(item);
  switch (categoryId) {
    case "cafe":
      return ["/media/gifs/event_cafe_1.mp4", "/media/gifs/event_cafe_2.mp4"];
    case "special":
      return ["/media/gifs/event_spec_1.mp4", "/media/gifs/event_spec_2.mp4", "/media/gifs/event_spec_3.mp4"];
    case "eat":
      return ["/media/gifs/event_eat_1.mp4", "/media/gifs/event_eat_2.mp4"];
    case "discuss":
      return ["/media/gifs/event_disc_1.mp4", "/media/gifs/event_disc_2.mp4"];
    default:
      return ["/media/gifs/the-office.mp4"];
  }
}

function renderSingleMedia(url) {
  const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);

  if (isVideo) {
    return `
      <video 
        src="${esc(url)}" 
        autoplay 
        loop 
        muted 
        playsinline 
        style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; display: block;"
      ></video>
    `;
  }

  return `
    <img 
      src="${esc(url)}" 
      alt="Event Live Feed" 
      loading="lazy" 
      style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; display: block;" 
    />
  `;
}

function renderMediaCarousel(mediaList) {
  const list = Array.isArray(mediaList)
    ? mediaList.filter(Boolean)
    : (mediaList ? [mediaList] : []);

  if (list.length === 0) {
    return renderSingleMedia("/media/gifs/event_cafe_1.mp4");
  }
  if (list.length === 1) {
    return renderSingleMedia(list[0]);
  }

  const N = list.length;
  const period = N * 4;
  const activePercent = Math.max(1, Math.floor(90 / N));
  const fullPercent = Math.max(2, Math.floor(100 / N));
  const animName = `eventCarouselFade${N}`;

  const slidesHtml = list
    .map((url, i) => {
      const delay = i * 4;
      return `
        <div style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; animation: ${animName} ${period}s infinite; animation-delay: ${delay}s;">
          ${renderSingleMedia(url)}
        </div>
      `;
    })
    .join("");

  const indicatorsHtml = list
    .map((_, i) => {
      const delay = i * 4;
      return `
        <div style="flex: 1; height: 2px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden;">
          <div style="height: 100%; background: #ffffff; width: 0%; animation: eventIndicatorRoll${N} ${period}s infinite; animation-delay: ${delay}s;"></div>
        </div>
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
      @keyframes eventIndicatorRoll${N} {
        0% { width: 0%; opacity: 0.4; }
        1.5% { opacity: 1; }
        ${activePercent}% { width: 100%; opacity: 1; }
        ${fullPercent}% { width: 100%; opacity: 0.3; }
        100% { width: 0%; opacity: 0.3; }
      }
    </style>
    <div class="popup-carousel-container" style="position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;">
      ${slidesHtml}
      <div style="position: absolute; top: 8px; left: 10px; right: 10px; z-index: 10; display: flex; gap: 4px; pointer-events: none;">
        ${indicatorsHtml}
      </div>
    </div>
  `;
}

const EVENT_COLOR_PALETTES = [
  { blob1: "rgba(37, 99, 235, 0.40)", blob2: "rgba(236, 72, 153, 0.32)" },
  { blob1: "rgba(37, 99, 235, 0.38)", blob2: "rgba(255, 214, 10, 0.30)" },
  { blob1: "rgba(16, 185, 129, 0.38)", blob2: "rgba(6, 182, 212, 0.32)" },
  { blob1: "rgba(147, 51, 234, 0.40)", blob2: "rgba(244, 63, 94, 0.32)" },
  { blob1: "rgba(245, 158, 11, 0.40)", blob2: "rgba(239, 68, 68, 0.30)" },
  { blob1: "rgba(20, 184, 166, 0.40)", blob2: "rgba(59, 130, 246, 0.32)" },
  { blob1: "rgba(249, 115, 22, 0.38)", blob2: "rgba(99, 102, 241, 0.32)" },
  { blob1: "rgba(217, 70, 239, 0.40)", blob2: "rgba(124, 58, 237, 0.32)" },
];

function getEventPalette(item) {
  const seed = String(item?.id || item?.title || item?.createdAt || "event");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % EVENT_COLOR_PALETTES.length;
  return EVENT_COLOR_PALETTES[index];
}

export function eventPopup(item, isMapDark = false, currentUser = null) {
  const displayDesc = cleanDesc(item.description);
  const creatorName = item.creator?.nickname || item.creator?.name || "Kalcerian";
  const mediaList = extractMediaList(item);

  const isOwner = Boolean(
    currentUser && (
      (item.creator?.id && String(item.creator.id) === String(currentUser.id)) ||
      (item.creatorId && String(item.creatorId) === String(currentUser.id)) ||
      (item.userId && String(item.userId) === String(currentUser.id)) ||
      (currentUser.nickname && (item.creator?.nickname === currentUser.nickname || item.creator?.name === currentUser.nickname)) ||
      (currentUser.name && (item.creator?.name === currentUser.name || item.creator?.nickname === currentUser.name)) ||
      item.id === "own" ||
      item.isOwn
    )
  );

  const bgImage = isMapDark ? "/jpeg/BGCard_Dark.jpeg" : "/jpeg/BGCard_Light.jpeg";
  const cardBorder = isMapDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.16)";
  const cardShadow = isMapDark
    ? "0 18px 46px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
    : "0 16px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1)";

  // Strict User Requirement: In light mode, Black bold. In dark mode, White bold.
  const titleColor = isMapDark ? "#ffffff" : "#000000";
  const authorColor = isMapDark ? "#ffffff" : "#000000";
  const descColor = isMapDark ? "rgba(255, 255, 255, 0.95)" : "#0f172a";
  const expiresColor = isMapDark ? "rgba(255, 255, 255, 0.9)" : "#0f172a";
  const expiresBg = isMapDark ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.65)";
  const expiresBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.18)" : "1px solid rgba(0, 0, 0, 0.15)";
  const dividerBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)";
  const textShadow = isMapDark ? "0 1px 3px rgba(0, 0, 0, 0.85)" : "0 1px 2px rgba(255, 255, 255, 0.85)";

  // Icon theme tokens: Light mode = black fill with white border; Dark mode = white fill with black border
  const iconFg = isMapDark ? "#ffffff" : "#000000";
  const iconStroke = isMapDark ? "#000000" : "#ffffff";
  const handIconSrc = isMapDark ? "/icons/hand_request_dark.png" : "/icons/hand_request_light.png";

  const doubleMessageIconHtml = `
    <button
      type="button"
      onclick="window.__kalceriaPlaySound?.('chat')"
      title="Group Chat"
      style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease;"
      onmouseover="this.style.transform='scale(1.12)'"
      onmouseout="this.style.transform='scale(1)'"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="overflow: visible;">
        <path
          d="M18.5 8.5a6.5 6.5 0 0 1-.7 3 6.6 6.6 0 0 1-5.9 3.7 6.5 6.5 0 0 1-3-.7L5 16l1.5-4.5a6.5 6.5 0 0 1-.7-3 6.6 6.6 0 0 1 3.7-5.9 6.5 6.5 0 0 1 3-.7h.4a6.6 6.6 0 0 1 6.2 6.2v.4z"
          transform="translate(4, -3) scale(0.82)"
          fill="${iconFg}"
          stroke="${iconStroke}"
          stroke-width="1.3"
          stroke-linejoin="round"
        />
        <path
          d="M18.5 8.5a6.5 6.5 0 0 1-.7 3 6.6 6.6 0 0 1-5.9 3.7 6.5 6.5 0 0 1-3-.7L5 16l1.5-4.5a6.5 6.5 0 0 1-.7-3 6.6 6.6 0 0 1 3.7-5.9 6.5 6.5 0 0 1 3-.7h.4a6.6 6.6 0 0 1 6.2 6.2v.4z"
          transform="translate(-1, 3) scale(0.82)"
          fill="${iconFg}"
          stroke="${iconStroke}"
          stroke-width="1.3"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  `;

  const requestOrEnvelopeIconHtml = isOwner
    ? `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event')"
        title="Collab Requests"
        style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M 3 6.5 C 3 5.4 3.9 4.5 5 4.5 L 19 4.5 C 20.1 4.5 21 5.4 21 6.5 L 21 17.5 C 21 18.6 20.1 19.5 19 19.5 L 5 19.5 C 3.9 19.5 3 18.6 3 17.5 Z"
            fill="${iconFg}"
            stroke="${iconStroke}"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
          <path
            d="M 3.5 6.5 L 12 13 L 20.5 6.5"
            fill="none"
            stroke="${iconStroke}"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    `
    : `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event')"
        title="Request Collab"
        style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <img
          src="${handIconSrc}"
          alt="Request"
          width="22"
          height="22"
          style="width: 22px; height: 22px; object-fit: contain; display: block;"
        />
      </button>
    `;

  const pencilIconHtml = isOwner
    ? `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event'); window.__kalceriaEditEvent?.('${esc(item.id)}')"
        title="Edit Event"
        style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M 16.5 3.5 L 20.5 7.5 L 7.5 20.5 L 3.5 20.5 L 3.5 16.5 Z"
            fill="${iconFg}"
            stroke="${iconStroke}"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
          <path d="M 14.5 5.5 L 18.5 9.5" stroke="${iconStroke}" stroke-width="1.3" stroke-linecap="round" />
          <path d="M 6.5 17.5 L 3.5 20.5" stroke="${iconStroke}" stroke-width="1.3" stroke-linecap="round" />
        </svg>
      </button>
    `
    : "";

  const tailBg = isMapDark
    ? "linear-gradient(to bottom, rgba(40, 18, 15, 0.95), transparent)"
    : "linear-gradient(to bottom, rgba(200, 240, 230, 0.95), transparent)";

  return `
    <div class="tactical-card event-card ${isMapDark ? 'event-card-dark' : 'event-card-light'}" style="position: relative; overflow: hidden; width: 280px; border: 1px solid ${cardBorder} !important; border-radius: 18px !important; background-image: url('${bgImage}') !important; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; box-shadow: ${cardShadow} !important;">
      <!-- Upper Space: Title, Declarer & Action Icons -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: ${dividerBorder}; background-image: url('${bgImage}'); background-size: cover; background-position: top center; background-repeat: no-repeat;">
        <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 170px; min-width: 0;">
          <strong style="color: ${titleColor}; font-size: 14.5px; font-weight: 800; line-height: 1.25; word-break: break-word; text-shadow: ${textShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${esc(item.title)}</strong>
          <span style="color: ${authorColor}; font-size: 11px; margin-top: 3px; font-weight: 700; text-shadow: ${textShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">By ${esc(creatorName)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 7px; margin-left: 8px; flex-shrink: 0;">
          ${doubleMessageIconHtml}
          ${requestOrEnvelopeIconHtml}
          ${pencilIconHtml}
        </div>
      </div>

      <!-- Dynamic Rolling Media Carousel -->
      <div class="popup-video" style="position: relative; z-index: 2; width: 100%; height: 120px; overflow: hidden; border-top: ${dividerBorder}; border-bottom: ${dividerBorder}; background: #000;">
        ${renderMediaCarousel(mediaList)}
      </div>

      <!-- Lower Space: Description & Action Wrap -->
      <div class="popup-lower-space" style="position: relative; z-index: 2; background-image: url('${bgImage}'); background-size: cover; background-position: bottom center; background-repeat: no-repeat;">
        <div class="popup-status active" style="padding: 12px 18px; background: ${isMapDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.22)'};">
          <p style="font-style: italic; color: ${descColor}; margin: 0; font-size: 13px; line-height: 1.4; font-weight: 500; text-shadow: ${textShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${esc(displayDesc)}</p>
        </div>
        <div class="popup-action-wrap" style="border-top: ${dividerBorder}; padding: 10px 14px; background: ${isMapDark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(255, 255, 255, 0.32)'};">
          <div class="popup-action disabled" style="color: ${expiresColor}; background: ${expiresBg}; border: ${expiresBorder}; border-radius: 10px; padding: 9px; font-weight: 700; font-size: 11px; letter-spacing: 0.05em; text-align: center; text-shadow: ${textShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}
          </div>
        </div>
      </div>
    </div>
    <div class="popup-tail" style="background: ${tailBg};"></div>
  `;
}
