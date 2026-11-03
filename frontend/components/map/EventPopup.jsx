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
    .replace(/\[LOC:[^\]]+\]\s*/gi, "")
    .trim();
}

function extractLocation(item) {
  if (item?.location && typeof item.location === "string" && item.location.trim()) {
    return item.location.trim();
  }
  if (item?.locationName && typeof item.locationName === "string" && item.locationName.trim()) {
    return item.locationName.trim();
  }
  const match = String(item?.description || "").match(/\[LOC:([^\]]+)\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
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
    <div class="popup-carousel-container" style="position: relative; width: 100%; height: 100%; overflow: hidden;">
      ${slidesHtml}
      <div style="position: absolute; top: 8px; left: 10px; right: 10px; z-index: 10; display: flex; gap: 4px; pointer-events: none;">
        ${indicatorsHtml}
      </div>
    </div>
  `;
}

function calculateUptime(createdAt) {
  if (!createdAt) return "00:00:00";
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatReleaseTime(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${hours}.${mins}`;
}

export function eventPopup(item, isMapDark = false, currentUser = null, requestedEventId = null, pendingRequestsCount = 0, isCollaborator = false) {
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

  const hasRequestedThisEvent = Boolean(requestedEventId && String(requestedEventId) === String(item.id));
  const hasActiveRequestElsewhere = Boolean(requestedEventId && String(requestedEventId) !== String(item.id));

  // BGCard subtle transparency wash for extreme text firmness
  const bgImage = isMapDark ? "/jpeg/BGCard_Dark.jpeg" : "/jpeg/BGCard_Light.jpeg";
  const bgOverlay = isMapDark ? "rgba(14, 18, 28, 0.85)" : "rgba(255, 255, 255, 0.86)";
  const cardBorder = isMapDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.12)";
  const cardShadow = isMapDark
    ? "0 18px 46px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
    : "0 16px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1)";

  // Strict User Requirement: Light mode = Black bold, Dark mode = White bold
  const titleColor = isMapDark ? "#ffffff" : "#000000";
  const authorColor = isMapDark ? "#ffffff" : "#000000";
  const descColor = isMapDark ? "#ffffff" : "#0f172a";
  const footerBg = isMapDark ? "#000000" : "#ffffff";
  const footerTextColor = isMapDark ? "#ffffff" : "#000000";

  // Icon theme tokens: Light = black with white border; Dark = white with black border
  const iconFg = isMapDark ? "#ffffff" : "#000000";
  const iconStroke = isMapDark ? "#000000" : "#ffffff";

  // 1. Group Chat Icon: double speech bubbles, perfectly centered at (12, 12), grey by default
  const doubleMessageIconHtml = `
    <button
      type="button"
      disabled
      title="Group Chat"
      style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; outline: none; opacity: 0.45; filter: grayscale(100%); pointer-events: none; flex-shrink: 0;"
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <path
          d="M18.5 8.5a6.5 6.5 0 0 1-.7 3 6.6 6.6 0 0 1-5.9 3.7 6.5 6.5 0 0 1-3-.7L5 16l1.5-4.5a6.5 6.5 0 0 1-.7-3 6.6 6.6 0 0 1 3.7-5.9 6.5 6.5 0 0 1 3-.7h.4a6.6 6.6 0 0 1 6.2 6.2v.4z"
          transform="translate(4.7, 2.0) scale(0.8)"
          fill="${iconFg}"
          stroke="${iconStroke}"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <path
          d="M18.5 8.5a6.5 6.5 0 0 1-.7 3 6.6 6.6 0 0 1-5.9 3.7 6.5 6.5 0 0 1-3-.7L5 16l1.5-4.5a6.5 6.5 0 0 1-.7-3 6.6 6.6 0 0 1 3.7-5.9 6.5 6.5 0 0 1 3-.7h.4a6.6 6.6 0 0 1 6.2 6.2v.4z"
          transform="translate(0.2, 7.5) scale(0.8)"
          fill="${iconFg}"
          stroke="${iconStroke}"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  `;

  // Picture 2 Icons8 Upload Icon (for accepted collaborators)
  const pureUploadSvg = `
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible;">
      <path
        d="M 5 13 V 17 C 5 18.1 5.9 19 7 19 H 17 C 18.1 19 19 18.1 19 17 V 13"
        stroke="${iconFg}"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <line
        x1="12"
        y1="16"
        x2="12"
        y2="5"
        stroke="${iconFg}"
        stroke-width="2.2"
        stroke-linecap="round"
      />
      <path
        d="M 8 9 L 12 5 L 16 9"
        fill="none"
        stroke="${iconFg}"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

  // Pure Hand SVG: Exact Flaticon finger gesture (Picture 1), centered at (12, 12), all black with white border (light mode) and vice versa
  const pureHandSvg = `
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible;">
      <path
        d="M 10.0 4.0 L 9.3 4.4 L 9.0 4.7 L 8.9 5.1 L 8.9 10.9 L 8.0 11.0 L 7.4 11.2 L 6.7 11.8 L 6.2 12.6 L 6.1 13.2 L 6.1 14.1 L 6.4 15.5 L 6.9 16.8 L 7.6 18.0 L 8.5 19.0 L 9.5 19.7 L 10.6 20.0 L 14.6 20.0 L 15.7 19.9 L 16.6 19.4 L 17.4 18.6 L 17.8 17.7 L 17.9 16.6 L 17.9 10.5 L 17.5 10.0 L 17.0 9.6 L 16.4 9.6 L 15.8 9.8 L 15.4 9.3 L 15.0 8.9 L 14.3 8.9 L 13.7 9.1 L 13.3 8.5 L 12.7 8.2 L 12.2 8.2 L 11.7 8.3 L 11.6 5.0 L 11.4 4.6 L 11.0 4.2 L 10.5 4.0 L 10.0 4.0 Z"
        fill="${iconFg}"
        stroke="${iconStroke}"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path d="M 11.6 8.5 L 11.6 13.5" stroke="${iconStroke}" stroke-width="1.1" stroke-linecap="round" />
      <path d="M 13.7 9.1 L 13.7 13.5" stroke="${iconStroke}" stroke-width="1.1" stroke-linecap="round" />
      <path d="M 15.8 9.8 L 15.8 13.5" stroke="${iconStroke}" stroke-width="1.1" stroke-linecap="round" />
    </svg>
  `;

  let requestOrEnvelopeIconHtml = "";
  if (isOwner) {
    const hasRedDot = pendingRequestsCount > 0;
    const redDotHtml = hasRedDot
      ? `<span style="position: absolute; top: -1px; right: -1px; width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%; border: none !important; box-shadow: none !important; pointer-events: none;"></span>`
      : "";

    requestOrEnvelopeIconHtml = `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event'); window.__kalceriaOpenRequests?.('${esc(item.id)}')"
        title="Collab Requests"
        style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block;">
          <rect x="2.5" y="4.5" width="19" height="15" rx="3" fill="${iconFg}" stroke="${iconStroke}" stroke-width="1.3" />
          <path d="M 3.5 6.5 L 12 13 L 20.5 6.5" fill="none" stroke="${iconStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        ${redDotHtml}
      </button>
    `;
  } else if (isCollaborator) {
    // Picture 2 Upload Icon: Accepted collaborator can upload media to event card
    requestOrEnvelopeIconHtml = `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event'); window.__kalceriaCollaboratorUpload?.('${esc(item.id)}')"
        title="Upload Media (Collaborator)"
        style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
        onmouseover="this.style.transform='scale(1.15)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        ${pureUploadSvg}
      </button>
    `;
  } else if (hasRequestedThisEvent) {
    // Already requested: gray hand with red prohibited icon overlay (centered, proportioned with single diagonal red line)
    requestOrEnvelopeIconHtml = `
      <button
        type="button"
        onclick="window.__kalceriaPromptCancelRequest?.('${esc(item.id)}', '${esc(item.title)}')"
        title="Remove Request from ${esc(item.title)}"
        style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <div style="filter: grayscale(100%) opacity(0.45); display: flex; align-items: center; justify-content: center;">
          ${pureHandSvg}
        </div>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; overflow: visible;">
          <circle cx="12" cy="12" r="8.5" stroke="#ef4444" stroke-width="2" />
          <line x1="6" y1="6" x2="18" y2="18" stroke="#ef4444" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    `;
  } else if (hasActiveRequestElsewhere) {
    requestOrEnvelopeIconHtml = `
      <button
        type="button"
        onclick="window.__kalceriaPromptCancelRequest?.('${esc(requestedEventId)}', 'active event')"
        title="Active request exists on another event (Click to cancel)"
        style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; opacity: 0.45; filter: grayscale(100%); flex-shrink: 0;"
        onmouseover="this.style.transform='scale(1.08)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        ${pureHandSvg}
      </button>
    `;
  } else {
    requestOrEnvelopeIconHtml = `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event'); window.__kalceriaRequestCollab?.('${esc(item.id)}')"
        title="Request Collab"
        style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        ${pureHandSvg}
      </button>
    `;
  }

  // 3. Pencil Icon (Edit Event - for owner only, matching Picture 1 SVG Repo, crisp enlarged 21x21)
  const pencilIconHtml = isOwner
    ? `
      <button
        type="button"
        onclick="window.__kalceriaPlaySound?.('event'); window.__kalceriaEditEvent?.('${esc(item.id)}')"
        title="Edit Event"
        style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
        onmouseover="this.style.transform='scale(1.12)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible;">
          <path
            d="M 3.5 20.5 L 4.8 15.8 L 8.2 19.2 Z"
            fill="${iconFg}"
            stroke="${iconStroke}"
            stroke-width="1.1"
            stroke-linejoin="round"
          />
          <path
            d="M 6.4 14.2 L 14.2 6.4 L 17.6 9.8 L 9.8 17.6 Z"
            fill="${iconFg}"
            stroke="${iconStroke}"
            stroke-width="1.1"
            stroke-linejoin="round"
          />
          <path
            d="M 15.6 5.0 L 17.2 3.4 C 17.8 2.8 18.8 2.8 19.4 3.4 L 20.6 4.6 C 21.2 5.2 21.2 6.2 20.6 6.8 L 19.0 8.4 Z"
            fill="${iconFg}"
            stroke="${iconStroke}"
            stroke-width="1.1"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    `
    : "";

  const uptimeString = calculateUptime(item.createdAt);
  const releaseTimeString = formatReleaseTime(item.createdAt);
  const safeId = String(item.id || "event").replace(/[^a-zA-Z0-9_-]/g, "_");

  // Device-aware Navigation Link & Indonesian Location
  const rawLoc = extractLocation(item) || "Bintaro Jaya, Tangerang Selatan";
  const displayLoc = rawLoc.length > 36 ? rawLoc.slice(0, 33).trim() + "..." : rawLoc;
  const isIOS = typeof navigator !== "undefined" && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  const mapNavUrl = item.lat != null && item.lng != null
    ? (isIOS
        ? `https://maps.apple.com/?q=${encodeURIComponent(rawLoc)}&ll=${item.lat},${item.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`)
    : (isIOS
        ? `https://maps.apple.com/?q=${encodeURIComponent(rawLoc)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawLoc)}`);

  const linkColor = isMapDark ? "#38bdf8" : "#0284c7"; // Blue sky
  const locationHtml = `
    <div style="width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.25;">
      <a
        href="${esc(mapNavUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        title="Open in Maps: ${esc(rawLoc)}"
        onclick="event.stopPropagation();"
        style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; color: ${linkColor}; text-decoration: underline; text-underline-offset: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; max-width: 100%; cursor: pointer;"
      >${esc(displayLoc)}</a>
    </div>
  `;

  return `
    <div class="tactical-card event-card ${isMapDark ? 'event-card-dark' : 'event-card-light'}" style="position: relative; overflow: hidden; width: 280px; border: 1px solid ${cardBorder} !important; border-radius: 18px !important; background: linear-gradient(${bgOverlay}, ${bgOverlay}), url('${bgImage}') center/cover no-repeat !important; box-shadow: ${cardShadow} !important;">
      <!-- Upper Space: Title, Declarer & Action Icons (All 3 on one line!) -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 12px 14px 10px 14px; border: none !important;">
        <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 155px; min-width: 0; flex: 1;">
          <strong style="color: ${titleColor}; font-size: 15px; font-weight: 700; line-height: 1.2; word-break: break-word; letter-spacing: -0.025em; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${esc(item.title)}</strong>
          <span style="color: ${authorColor}; font-size: 11.5px; margin-top: 3px; font-weight: 700; letter-spacing: -0.025em; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">By ${esc(creatorName)}</span>
        </div>
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 7px; margin-left: 6px; flex-shrink: 0;">
          ${doubleMessageIconHtml}
          ${requestOrEnvelopeIconHtml}
          ${pencilIconHtml}
        </div>
      </div>

      <!-- Dynamic Rolling Media Carousel (No excess border/line on top/bottom) -->
      <div class="popup-video" style="position: relative; z-index: 2; width: 100%; height: 120px; overflow: hidden; border: none !important; margin: 0; padding: 0;">
        ${renderMediaCarousel(mediaList)}
      </div>

      <!-- Lower Space: Description (NOT italic, NO line above footer) -->
      <div class="popup-lower-space" style="position: relative; z-index: 2; border: none !important;">
        <div class="popup-status active" style="padding: 10px 14px 9px 14px; border: none !important;">
          <p style="font-style: normal; color: ${descColor}; margin: 0; font-size: 12.5px; line-height: 1.45; font-weight: 500; font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${esc(displayDesc)}</p>
        </div>
      </div>

      <!-- Footer: solid white (light) or solid black (dark) BG, slightly elongated with location link -->
      <div class="popup-footer" style="position: relative; z-index: 2; display: flex; flex-direction: column; gap: 5px; padding: 8px 14px 9px 14px; background: ${footerBg} !important; border-bottom-left-radius: 17px; border-bottom-right-radius: 17px; font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; border: none !important;">
        <!-- Location Link: Arial non-bold, Blue sky color, redirect to Apple Maps (iOS) or Google Maps (Android/Desktop) -->
        ${locationHtml}

        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <!-- Left: Clock Icon + Live Uptime (00:00:00) -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" style="overflow: visible; flex-shrink: 0; display: block;">
              <circle
                cx="12"
                cy="12"
                r="9.5"
                fill="${isMapDark ? '#ffffff' : '#000000'}"
                stroke="${isMapDark ? '#000000' : '#ffffff'}"
                stroke-width="1.8"
              />
              <path
                d="M 12 6.5 L 12 12 L 15.5 15.5"
                fill="none"
                stroke="${isMapDark ? '#000000' : '#ffffff'}"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span id="event-uptime-${safeId}" style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; letter-spacing: 0.02em;">
              ${uptimeString}
            </span>
          </div>

          <!-- Right: Release time (e.g. 17.41) -->
          <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; letter-spacing: 0.02em;">
            ${releaseTimeString}
          </div>
        </div>
      </div>
    </div>
    <script>
      (function() {
        var el = document.getElementById("event-uptime-${safeId}");
        if (!el || el._timerActive) return;
        el._timerActive = true;
        var start = new Date("${item.createdAt || new Date().toISOString()}").getTime();
        var timer = setInterval(function() {
          if (!document.body.contains(el)) {
            clearInterval(timer);
            return;
          }
          var diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
          var h = String(Math.floor(diff / 3600)).padStart(2, "0");
          var m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
          var s = String(diff % 60).padStart(2, "0");
          el.textContent = h + ":" + m + ":" + s;
        }, 1000);
      })();
    </script>
  `;
}
