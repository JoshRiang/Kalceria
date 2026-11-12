// EventPopup.jsx
// Stateless utility for generating event popup HTML for Leaflet
import { getSafeMapAvatarUrl } from "./UserIcon";
import { toSmartTitleCase } from "@/lib/titleCase";
import {
  EVENT_CARD_BG_DARK,
  EVENT_CARD_BG_LIGHT,
  getInstantMapBgUrl,
} from "@/lib/mapBgCache";

import {
  esc,
  cleanDesc,
  extractLocation,
  calculateUptime,
  formatReleaseTime,
  formatCreatorDisplayName,
} from "./eventPopup/popupHelpers";
import {
  extractMediaItemsNormalized,
  getUniqueCollaboratorCount,
  renderByAuthorLine,
} from "./eventPopup/popupMediaMetadata";
import { computeCardGeometryForMedia } from "./eventPopup/popupCarouselController";
import {
  GEOMETRY_TRANSITION_EASING,
  GEOMETRY_TRANSITION_MS,
  computeEmptyCardGeometry,
} from "./eventPopup/popupGeometry";
import { renderMediaCarousel } from "./eventPopup/popupMediaRenderer";
import {
  renderDoubleMessageIconButton,
  renderRequestOrEnvelopeButton,
  renderPencilEditButton,
  renderReplyEventButton,
} from "./eventPopup/popupActionButtons";
import { renderEventAvatarStack } from "./eventPopup/popupAvatarStack";

export function eventPopup(
  item,
  isMapDark = false,
  currentUser = null,
  requestedEventId = null,
  pendingRequestsCount = 0,
  isCollaborator = false,
  unreadGroupChatCount = 0,
  isSelfOffline = false
) {
  const displayDesc = cleanDesc(item.description);
  const mediaItems = extractMediaItemsNormalized(item);

  const curId = currentUser?.id ? String(currentUser.id) : null;
  const eventCreatorId =
    item.creator?.id || item.creatorId || item.userId || null;

  const isOwner = Boolean(
    currentUser &&
      (item.id === "own" ||
        item.isOwn ||
        (curId && eventCreatorId
          ? String(eventCreatorId) === curId
          : currentUser.nickname &&
            item.creator?.nickname &&
            String(item.creator.nickname).trim().toLowerCase() ===
              String(currentUser.nickname).trim().toLowerCase()))
  );

  // Prioritize creator's Display Name (displayName / name) over username (nickname)
  const rawCreatorDisplayName =
    (isOwner && (currentUser?.displayName || currentUser?.name)) ||
    item.creator?.displayName ||
    item.creator?.name ||
    item.creator?.nickname ||
    "Kalcerian";
  const creatorDisplayName = formatCreatorDisplayName(rawCreatorDisplayName, 10);

  const othersCount = getUniqueCollaboratorCount(item, eventCreatorId);
  const hasRequestedThisEvent = Boolean(requestedEventId && String(requestedEventId) === String(item.id));
  const hasActiveRequestElsewhere = Boolean(requestedEventId && String(requestedEventId) !== String(item.id));

  // BG_EventCardLight.webp (#ffffff) / BG_EventCardDark.webp (#1b1c1e)
  // Pre-decoded RAM blob: URL + 3 horizontal concatenated panels so background stays crisp
  const rawBgImage = isMapDark ? EVENT_CARD_BG_DARK : EVENT_CARD_BG_LIGHT;
  const bgImage = getInstantMapBgUrl(rawBgImage);
  const bgCssVar = isMapDark ? "--kalceria-event-bg-dark" : "--kalceria-event-bg-light";
  const cardBaseBg = isMapDark ? "#1b1c1e" : "#ffffff";
  const bgOpacity = isMapDark ? 0.45 : 0.58;
  const cardBorder = isMapDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.14)";
  const cardShadow = isMapDark
    ? "0 18px 46px rgba(0, 0, 0, 0.78), inset 0 1px 1px rgba(255, 255, 255, 0.16)"
    : "0 16px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1)";

  const creatorUserObj = isOwner && currentUser ? currentUser : (item.creator || { name: rawCreatorDisplayName });
  const creatorAvatarUrl = getSafeMapAvatarUrl(creatorUserObj);

  const titleColor = isMapDark ? "#ffffff" : "#000000";
  const authorColor = isMapDark ? "#ffffff" : "#000000";
  const descColor = isMapDark ? "#ffffff" : "#0f172a";
  const footerBg = isMapDark ? "#000000" : "#ffffff";
  const footerTextColor = isMapDark ? "#ffffff" : "#000000";

  const iconFg = isMapDark ? "#ffffff" : "#000000";
  const iconStroke = isMapDark ? "#000000" : "#ffffff";

  const doubleMessageIconHtml = renderDoubleMessageIconButton({
    isOwner,
    isCollaborator,
    unreadGroupChatCount,
    iconFg,
    iconStroke,
  });

  const offlineBtnLockStyle = isSelfOffline
    ? "opacity: 0.32; filter: grayscale(100%); cursor: not-allowed; pointer-events: none;"
    : "";

  const effectivePendingCount = Math.max(
    Number(pendingRequestsCount) || 0,
    isOwner ? Number(item.pendingRequestsCount) || 0 : 0
  );

  const requestOrEnvelopeIconHtml = renderRequestOrEnvelopeButton({
    isOwner,
    isCollaborator,
    hasRequestedThisEvent,
    hasActiveRequestElsewhere,
    isSelfOffline,
    pendingRequestsCount: effectivePendingCount,
    item,
    requestedEventId,
    iconFg,
    iconStroke,
    offlineBtnLockStyle,
  });

  const pencilIconHtml = renderPencilEditButton({
    isOwner,
    isSelfOffline,
    item,
    iconFg,
    iconStroke,
    offlineBtnLockStyle,
  });

  const replyIconHtml = renderReplyEventButton({
    isOwner,
    isSelfOffline,
    item,
    iconFg,
    offlineBtnLockStyle,
  });

  const avatarStackHtml = renderEventAvatarStack({
    creatorUserObj,
    creatorDisplayName,
    collaboratorProfiles: item.collaboratorProfiles,
    collaboratorIds: item.collaborators,
    isMapDark,
  });

  const parsedCreatedMs = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
  const createdAtMs = Number.isFinite(parsedCreatedMs) ? parsedCreatedMs : Date.now();
  const uptimeString = calculateUptime(createdAtMs);
  const releaseTimeString = formatReleaseTime(createdAtMs);
  const safeId = String(item.id || "event").replace(/[^a-zA-Z0-9_-]/g, "_");
  const displayTitle = toSmartTitleCase(item.title || "");

  const byAuthorLineHtml = renderByAuthorLine({
    creatorDisplayName,
    othersCount,
    seedKey: item.id || safeId,
    isMapDark,
  });

  const hasMedia = mediaItems.length > 0;
  const firstMedia = hasMedia ? mediaItems[0] : null;
  const firstClipId = firstMedia && typeof firstMedia === "object" && firstMedia.id ? String(firstMedia.id) : "clip_0";
  const firstAvatarUrl = (firstMedia && typeof firstMedia === "object" && firstMedia.authorAvatarUrl) || creatorAvatarUrl || "";
  const firstAuthorName = (firstMedia && typeof firstMedia === "object" && firstMedia.authorName) || rawCreatorDisplayName || "Kalcerian";
  const firstViewCount = firstMedia && typeof firstMedia === "object" && Number.isFinite(Number(firstMedia.viewCount)) ? Number(firstMedia.viewCount) : 0;
  const initialGeometry =
    mediaItems.length === 0
      ? computeEmptyCardGeometry()
      : computeCardGeometryForMedia(firstMedia?.width, firstMedia?.height);
  const geometryTransition = `${GEOMETRY_TRANSITION_MS}ms ${GEOMETRY_TRANSITION_EASING}`;

  // Device-aware Navigation Link & Indonesian Location
  const rawLoc = extractLocation(item) || "Bintaro Jaya, Tangerang Selatan";
  const displayLoc = rawLoc.length > 36 ? rawLoc.slice(0, 33).trim() + "..." : rawLoc;
  const isIOS = typeof navigator !== "undefined" && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
  const mapNavUrl = item.lat != null && item.lng != null
    ? (isIOS
        ? `https://maps.apple.com/?q=${encodeURIComponent(rawLoc)}&ll=${item.lat},${item.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`)
    : (isIOS
        ? `https://maps.apple.com/?q=${encodeURIComponent(rawLoc)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawLoc)}`);

  const linkColor = isMapDark ? "#38bdf8" : "#0284c7";
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

  const videoFrameBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid rgba(0, 0, 0, 0.1)";
  const videoFrameBg = mediaItems.length === 0 ? (isMapDark ? "#000000" : "#ffffff") : "#0b0d14";

  return `
    <div class="tactical-card event-card ${isMapDark ? "event-card-dark" : "event-card-light"}" data-event-card-id="${esc(safeId)}" data-feed-orientation="${esc(initialGeometry.orientation || "unknown")}" style="position: relative; overflow: hidden; width: ${initialGeometry.cardWidth}px; transition: width ${geometryTransition}; border: 1px solid ${cardBorder} !important; border-radius: 18px !important; background: ${cardBaseBg} !important; box-shadow: ${cardShadow} !important;">
      <!-- Seamless background strip: mirrored tiles share edges, so the portrait artwork extends to any card width without gaps -->
      <div aria-hidden="true" style="position: absolute; inset: 0; z-index: 0; pointer-events: none; display: flex; flex-direction: row; justify-content: center; align-items: stretch; overflow: hidden; opacity: ${bgOpacity}; transform: translateZ(0);">
        <div style="flex: 0 0 auto; height: 100%; aspect-ratio: var(--kalceria-event-bg-aspect, 0.5578); transform: scaleX(-1); background-image: var(${bgCssVar}, url('${bgImage}')); background-size: 100% 100%; background-repeat: no-repeat;"></div>
        <div style="flex: 0 0 auto; height: 100%; aspect-ratio: var(--kalceria-event-bg-aspect, 0.5578); background-image: var(${bgCssVar}, url('${bgImage}')); background-size: 100% 100%; background-repeat: no-repeat;"></div>
        <div style="flex: 0 0 auto; height: 100%; aspect-ratio: var(--kalceria-event-bg-aspect, 0.5578); transform: scaleX(-1); background-image: var(${bgCssVar}, url('${bgImage}')); background-size: 100% 100%; background-repeat: no-repeat;"></div>
      </div>

      <!-- Upper Space: Elongated Header with blur & flexible elasticity -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 10px 14px; background: transparent !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border: none !important;">
        <!-- Top Row: Dynamic Avatar Stack on Left (Creator on top, Collaborators nested to right), Action Icons on Right -->
        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%;">
          ${avatarStackHtml}
          <div style="display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 7px; margin-left: 6px; flex-shrink: 0;">
            ${doubleMessageIconHtml}
            ${replyIconHtml}
            ${requestOrEnvelopeIconHtml}
            ${pencilIconHtml}
          </div>
        </div>

        <!-- Bottom Row: Event Title and By-Author Line -->
        <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0; width: 100%;">
          <strong style="color: ${titleColor}; font-size: 15px; font-weight: 700; line-height: 1.25; word-break: break-word; letter-spacing: -0.025em; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${esc(displayTitle)}</strong>
          <span style="color: ${authorColor}; font-size: 11.5px; margin-top: 3px; font-weight: 400; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${byAuthorLineHtml}</span>
        </div>
      </div>

      ${
        hasMedia
          ? `
      <!-- Action Row Above Media Box (OUTSIDE): Avatar Logo, Search Icon, View Count, Reply Arrow (NO outer oval pill, NO divider line) -->
      <div
        style="
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          margin: 4px 14px 4px 14px;
          pointer-events: auto;
        "
        onpointerdown="event.stopPropagation();"
      >
        <!-- Author Avatar / Logo for Event Media -->
        <div
          data-media-author-avatar-wrap="${esc(safeId)}"
          style="
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            overflow: hidden;
            border: 1.5px solid ${isMapDark ? "#ffffff" : "#000000"};
            flex-shrink: 0;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
            background: ${isMapDark ? "#000000" : "#ffffff"};
            display: flex;
            align-items: center;
            justify-content: center;
          "
          title="${esc(firstAuthorName)}"
        >
          <img
            data-media-author-avatar="${esc(safeId)}"
            src="${esc(firstAvatarUrl)}"
            alt="${esc(firstAuthorName)}"
            style="width: 100%; height: 100%; object-fit: cover; display: block;"
            draggable="false"
          />
        </div>

        <!-- Search icon (matches Broadcast Box & toggles dark/light) -->
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; display: block;">
          <circle cx="10" cy="10" r="6.5" fill="${isMapDark ? "#000000" : "#ffffff"}" stroke="${isMapDark ? "#ffffff" : "#000000"}" stroke-width="2.5" />
          <path d="M15 15L20.5 20.5" stroke="${isMapDark ? "#ffffff" : "#000000"}" stroke-width="2.8" stroke-linecap="round" />
        </svg>

        <!-- View count (toggles dark/light) -->
        <span
          data-media-view-count="${esc(firstClipId)}"
          style="
            font-family: Arial, -apple-system, sans-serif;
            font-size: 11.5px;
            font-weight: 700;
            color: ${isMapDark ? "#ffffff" : "#000000"};
            line-height: 1;
            letter-spacing: -0.01em;
            font-variant-numeric: tabular-nums;
          "
        >
          ${firstViewCount}
        </span>

        <!-- Reply button (toggles dark/light) -->
        <button
          type="button"
          data-media-reply-btn="${esc(safeId)}"
          title="Balas feed media ini"
          onpointerdown="event.stopPropagation();"
          onclick="event.stopPropagation(); window.__kalceriaReplyEventMedia?.('${esc(safeId)}', '${esc(firstClipId)}', 0);"
          style="
            background: transparent;
            border: none;
            padding: 2px 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${isMapDark ? "#ffffff" : "#000000"};
            opacity: 0.9;
            transition: opacity 0.15s ease;
          "
          onmouseenter="this.style.opacity='1';"
          onmouseleave="this.style.opacity='0.9';"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${isMapDark ? "#ffffff" : "#000000"}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
            <polyline points="9 17 4 12 9 7"></polyline>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
          </svg>
        </button>
      </div>
      `
          : ""
      }

      <!-- Framed Media Screen: width/height follow the real clip aspect ratio (portrait ↔ 16:9 landscape), dark backdrop so no white flash -->
      <div class="popup-video" style="position: relative; z-index: 2; width: calc(100% - 24px); height: ${initialGeometry.frameHeight}px; transition: height ${geometryTransition}; margin: 2px 12px 8px 12px; border-radius: 12px; overflow: hidden; border: ${videoFrameBorder} !important; padding: 0; background: ${videoFrameBg}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);">
        ${renderMediaCarousel(mediaItems, isMapDark, creatorAvatarUrl, rawCreatorDisplayName, safeId)}
      </div>

      <!-- Footer: dynamic expanding/contracting white/dark box with user briefing positioned cleanly above the location link -->
      <div class="popup-footer" style="position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px 10px 14px; background: ${footerBg} !important; border-bottom-left-radius: 17px; border-bottom-right-radius: 17px; font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; border: none !important;">
        ${displayDesc ? `
          <div class="popup-briefing" style="margin: 0 0 3px 0; line-height: 1.4; word-break: break-word;">
            <p style="margin: 0; font-size: 12px; line-height: 1.42; font-weight: 400; color: ${footerTextColor}; font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.01em;">${esc(displayDesc)}</p>
          </div>
        ` : ""}
        ${locationHtml}

        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" style="overflow: visible; flex-shrink: 0; display: block;">
              <circle
                cx="12"
                cy="12"
                r="9.5"
                fill="${isMapDark ? "#ffffff" : "#000000"}"
                stroke="${isMapDark ? "#000000" : "#ffffff"}"
                stroke-width="1.8"
              />
              <path
                d="M 12 6.5 L 12 12 L 15.5 15.5"
                fill="none"
                stroke="${isMapDark ? "#000000" : "#ffffff"}"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span id="event-uptime-${safeId}" data-event-uptime="${createdAtMs}" style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; letter-spacing: 0.02em; font-variant-numeric: tabular-nums;">${uptimeString}</span>
          </div>

          <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; letter-spacing: 0.02em;">
            ${releaseTimeString}
          </div>
        </div>
      </div>
    </div>
  `;
}
