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

export function eventPopup(item, isMapDark = false) {
  const displayDesc = cleanDesc(item.description);
  const creatorName = item.creator?.nickname || item.creator?.name || "Kalcerian";
  const mediaList = extractMediaList(item);

  const bgImage = isMapDark ? "/jpeg/BGCard_Dark.jpeg" : "/jpeg/BGCard_Light.jpeg";
  const cardBorder = isMapDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.16)";
  const cardShadow = isMapDark
    ? "0 18px 46px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
    : "0 16px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1)";

  const titleColor = isMapDark ? "#ffffff" : "#0f172a";
  const subtitleColor = isMapDark ? "rgba(255, 255, 255, 0.75)" : "rgba(30, 41, 59, 0.8)";
  const descColor = isMapDark ? "rgba(255, 255, 255, 0.95)" : "#0f172a";
  const expiresColor = isMapDark ? "rgba(255, 255, 255, 0.9)" : "#0f172a";
  const expiresBg = isMapDark ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.65)";
  const expiresBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.18)" : "1px solid rgba(0, 0, 0, 0.15)";
  const dividerBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)";
  const textShadow = isMapDark ? "0 1px 3px rgba(0, 0, 0, 0.85)" : "0 1px 2px rgba(255, 255, 255, 0.85)";

  const tailBg = isMapDark
    ? "linear-gradient(to bottom, rgba(40, 18, 15, 0.95), transparent)"
    : "linear-gradient(to bottom, rgba(200, 240, 230, 0.95), transparent)";

  return `
    <div class="tactical-card event-card ${isMapDark ? 'event-card-dark' : 'event-card-light'}" style="position: relative; overflow: hidden; width: 280px; border: 1px solid ${cardBorder} !important; border-radius: 18px !important; background-image: url('${bgImage}') !important; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; box-shadow: ${cardShadow} !important;">
      <!-- Upper Space: Title & Declarer -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; padding: 14px 18px; border-bottom: ${dividerBorder}; background-image: url('${bgImage}'); background-size: cover; background-position: top center; background-repeat: no-repeat;">
        <strong style="color: ${titleColor}; font-size: 15px; font-weight: 700; line-height: 1.25; word-break: break-word; text-shadow: ${textShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${esc(item.title)}</strong>
        <small style="color: ${subtitleColor}; font-size: 11px; margin-top: 3px; font-weight: 500; text-shadow: ${textShadow}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${esc(creatorName)}</small>
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
