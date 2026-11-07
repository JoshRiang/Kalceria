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
  extractMediaList,
  calculateUptime,
  formatReleaseTime,
  formatCreatorDisplayName,
} from "./eventPopup/popupHelpers";
import { renderMediaCarousel } from "./eventPopup/popupMediaRenderer";
import {
  renderDoubleMessageIconButton,
  renderRequestOrEnvelopeButton,
  renderPencilEditButton,
} from "./eventPopup/popupActionButtons";

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
  const mediaList = extractMediaList(item);

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

  const hasRequestedThisEvent = Boolean(requestedEventId && String(requestedEventId) === String(item.id));
  const hasActiveRequestElsewhere = Boolean(requestedEventId && String(requestedEventId) !== String(item.id));

  // BG_EventCardLight.webp (#ffffff) / BG_EventCardDark.webp (#1b1c1e) with ChatBox-matched opacity
  // Uses pre-decoded RAM blob: URL + :root CSS custom property so Leaflet popup opens in 0.0ms without HTTP revalidation
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

  // Strict User Requirement: Light mode = Black bold, Dark mode = White bold
  const titleColor = isMapDark ? "#ffffff" : "#000000";
  const authorColor = isMapDark ? "#ffffff" : "#000000";
  const descColor = isMapDark ? "#ffffff" : "#0f172a";
  const footerBg = isMapDark ? "#000000" : "#ffffff";
  const footerTextColor = isMapDark ? "#ffffff" : "#000000";

  // Icon theme tokens: Light = black with white border; Dark = white with black border
  const iconFg = isMapDark ? "#ffffff" : "#000000";
  const iconStroke = isMapDark ? "#000000" : "#ffffff";

  // Action Buttons
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

  const requestOrEnvelopeIconHtml = renderRequestOrEnvelopeButton({
    isOwner,
    isCollaborator,
    hasRequestedThisEvent,
    hasActiveRequestElsewhere,
    isSelfOffline,
    pendingRequestsCount,
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

  const parsedCreatedMs = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
  const createdAtMs = Number.isFinite(parsedCreatedMs) ? parsedCreatedMs : Date.now();
  const uptimeString = calculateUptime(createdAtMs);
  const releaseTimeString = formatReleaseTime(createdAtMs);
  const safeId = String(item.id || "event").replace(/[^a-zA-Z0-9_-]/g, "_");
  const displayTitle = toSmartTitleCase(item.title || "");

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

  const videoFrameBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid rgba(0, 0, 0, 0.1)";

  return `
    <div class="tactical-card event-card ${isMapDark ? 'event-card-dark' : 'event-card-light'}" style="position: relative; overflow: hidden; width: 292px; border: 1px solid ${cardBorder} !important; border-radius: 18px !important; background: ${cardBaseBg} !important; box-shadow: ${cardShadow} !important;">
      <!-- Main Box Background Image Layer (Visible around header, left/right of video frame, and description) -->
      <div aria-hidden="true" style="position: absolute; inset: 0; z-index: 0; pointer-events: none; background-image: var(${bgCssVar}, url('${bgImage}')); background-size: cover; background-position: center; background-repeat: no-repeat; opacity: ${bgOpacity}; transform: translateZ(0);"></div>

      <!-- Upper Space: Header with blur (not dimmed!) -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 12px 14px 10px 14px; background: transparent !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border: none !important;">
        <div style="display: flex; flex-direction: column; align-items: flex-start; max-width: 165px; min-width: 0; flex: 1;">
          <strong style="color: ${titleColor}; font-size: 15px; font-weight: 700; line-height: 1.2; word-break: break-word; letter-spacing: -0.025em; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${esc(displayTitle)}</strong>
          <span style="color: ${authorColor}; font-size: 11.5px; margin-top: 3px; font-weight: 400; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">by <strong style="font-weight: 700;">${esc(creatorDisplayName)}</strong></span>
        </div>
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 7px; margin-left: 6px; flex-shrink: 0;">
          ${doubleMessageIconHtml}
          ${requestOrEnvelopeIconHtml}
          ${pencilIconHtml}
        </div>
      </div>

      <!-- Framed Media Screen: Left & Right Space so Main Box Background shows on both sides -->
      <div class="popup-video" style="position: relative; z-index: 2; width: calc(100% - 24px); height: 134px; margin: 2px 12px 0 12px; border-radius: 12px; overflow: hidden; border: ${videoFrameBorder} !important; padding: 0; background: ${isMapDark ? '#000000' : '#ffffff'}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);">
        ${renderMediaCarousel(mediaList, isMapDark, creatorAvatarUrl, rawCreatorDisplayName, safeId)}
      </div>

      <!-- Lower Space: Description (NOT italic, NO line above footer) -->
      <div class="popup-lower-space" style="position: relative; z-index: 2; border: none !important;">
        <div class="popup-status active" style="padding: 10px 14px 9px 14px; background: transparent !important; border: none !important;">
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
            <span id="event-uptime-${safeId}" data-event-uptime="${createdAtMs}" style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; letter-spacing: 0.02em; font-variant-numeric: tabular-nums;">${uptimeString}</span>
          </div>

          <!-- Right: Release time (e.g. 17.41) -->
          <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; letter-spacing: 0.02em;">
            ${releaseTimeString}
          </div>
        </div>
      </div>
    </div>
  `;
}
