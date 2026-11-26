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
import { computeEmptyCardGeometry } from "./eventPopup/popupGeometry";
import { renderMediaCarousel } from "./eventPopup/popupMediaRenderer";
import { getTrashIconSvg, getReplyIconSvg } from "./eventPopup/popupFeedDeletePrompt.js";
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

  // BG_EventCardLight.webp (#f4efe9) / BG_EventCardDark.webp (#080a11)
  // Pre-decoded RAM blob: URL + 3 horizontal concatenated panels; top 34% kept clean for unblurred header
  const rawBgImage = isMapDark ? EVENT_CARD_BG_DARK : EVENT_CARD_BG_LIGHT;
  const bgImage = getInstantMapBgUrl(rawBgImage);
  const bgCssVar = isMapDark ? "--kalceria-event-bg-dark" : "--kalceria-event-bg-light";
  const cardBaseBg = isMapDark ? "#080a11" : "#f4efe9";
  const bgOpacity = isMapDark ? 0.92 : 0.95;
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
  const footerFadeGradient = isMapDark
    ? "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.28) 32%, rgba(0, 0, 0, 0.76) 70%, #000000 100%)"
    : "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.30) 32%, rgba(255, 255, 255, 0.78) 70%, #ffffff 100%)";
  const footerTextColor = isMapDark ? "#ffffff" : "#000000";

  const iconFg = isMapDark ? "#ffffff" : "#000000";
  const iconStroke = isMapDark ? "#000000" : "#ffffff";

  const doubleMessageIconHtml = renderDoubleMessageIconButton({
    isOwner,
    isCollaborator,
    unreadGroupChatCount,
    item,
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
  const firstAuthorId = (firstMedia && typeof firstMedia === "object" && firstMedia.authorId) || eventCreatorId || null;
  const isFirstSlideSelfAuthor = Boolean(curId && firstAuthorId && String(curId) === String(firstAuthorId));
  const firstAvatarUrl = (firstMedia && typeof firstMedia === "object" && firstMedia.authorAvatarUrl) || creatorAvatarUrl || "";
  const firstAuthorName = (firstMedia && typeof firstMedia === "object" && firstMedia.authorName) || rawCreatorDisplayName || "Kalcerian";
  const initialGeometry =
    mediaItems.length === 0
      ? computeEmptyCardGeometry()
      : computeCardGeometryForMedia(firstMedia?.width, firstMedia?.height);

  // Device-aware Navigation Link & Indonesian Location
  const rawLoc = extractLocation(item) || "Bintaro Jaya, Tangerang Selatan";
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

  // Solid Google-Maps-style pin icon with transparent center hole (black in Light mode, white in Dark mode)
  const pinFill = isMapDark ? "#ffffff" : "#000000";
  const locationPinHtml = `
    <a
      href="${esc(mapNavUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Maps: ${esc(rawLoc)}"
      aria-label="Open in Maps: ${esc(rawLoc)}"
      data-event-location-pin="${esc(safeId)}"
      onpointerdown="event.stopPropagation();"
      onclick="event.stopPropagation();"
      style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 1px; cursor: pointer; text-decoration: none; transition: opacity 0.15s ease;"
      onmouseenter="this.style.opacity='0.72';"
      onmouseleave="this.style.opacity='1';"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="display: block; flex-shrink: 0;" aria-hidden="true">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
          fill="${pinFill}"
        />
      </svg>
    </a>
  `;

  const videoFrameBorder = isMapDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid rgba(0, 0, 0, 0.1)";
  const videoFrameBg = mediaItems.length === 0 ? (isMapDark ? "#000000" : "#ffffff") : "#0b0d14";

  return `
    <div class="tactical-card event-card ${isMapDark ? "event-card-dark" : "event-card-light"}" data-event-card-id="${esc(safeId)}" data-current-user-id="${esc(curId || "")}" data-feed-orientation="${esc(initialGeometry.orientation || "unknown")}" style="position: relative; overflow: hidden; width: ${initialGeometry.cardWidth}px; border: 1px solid ${cardBorder} !important; border-radius: 18px !important; background: ${cardBaseBg} !important; box-shadow: ${cardShadow} !important;">
      <!-- Seamless background strip: mirrored tiles share edges, so the portrait artwork extends to any card width without gaps -->
      <div aria-hidden="true" style="position: absolute; inset: 0; z-index: 0; pointer-events: none; display: flex; flex-direction: row; justify-content: center; align-items: stretch; overflow: hidden; opacity: ${bgOpacity}; transform: translateZ(0);">
        <div style="flex: 0 0 auto; height: 100%; aspect-ratio: var(--kalceria-event-bg-aspect, 0.5578); transform: scaleX(-1); background-image: var(${bgCssVar}, url('${bgImage}')); background-size: 100% 100%; background-repeat: no-repeat;"></div>
        <div style="flex: 0 0 auto; height: 100%; aspect-ratio: var(--kalceria-event-bg-aspect, 0.5578); background-image: var(${bgCssVar}, url('${bgImage}')); background-size: 100% 100%; background-repeat: no-repeat;"></div>
        <div style="flex: 0 0 auto; height: 100%; aspect-ratio: var(--kalceria-event-bg-aspect, 0.5578); transform: scaleX(-1); background-image: var(${bgCssVar}, url('${bgImage}')); background-size: 100% 100%; background-repeat: no-repeat;"></div>
      </div>

      <!-- Upper Space: Clean Unblurred Header over Spotless Top Composition Zone -->
      <div class="popup-profile" style="position: relative; z-index: 3; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 10px 14px; background: transparent !important; border: none !important;">
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
      <!-- Action Row Above Media Box (OUTSIDE): Author Avatar & Solid Trash/Reply Action -->
      <div
        style="
          position: relative;
          z-index: 3;
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

        <!-- Action button: Circled Solid Trashcan (owner) or Reply (peer), visually distinct from main header icons -->
        <button
          type="button"
          data-media-reply-btn="${esc(safeId)}"
          data-media-action-circle="true"
          title="${isFirstSlideSelfAuthor ? "Hapus feed media ini" : "Balas feed media ini"}"
          onpointerdown="event.stopPropagation();"
          onclick="event.stopPropagation(); window.__kalceriaHandleMediaAction?.('${esc(safeId)}', '${esc(firstClipId)}', 0);"
          style="
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            background: ${isMapDark ? "rgba(0, 0, 0, 0.72)" : "rgba(255, 255, 255, 0.92)"};
            border: 1.5px solid ${isMapDark ? "#ffffff" : "#000000"};
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
            padding: 0;
            flex-shrink: 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${isMapDark ? "#ffffff" : "#000000"};
            opacity: 0.92;
            transition: opacity 0.15s ease, transform 0.15s ease;
          "
          onmouseenter="this.style.opacity='1'; this.style.transform='scale(1.06)';"
          onmouseleave="this.style.opacity='0.92'; this.style.transform='scale(1)';"
        >
          ${isFirstSlideSelfAuthor ? getTrashIconSvg(isMapDark) : getReplyIconSvg(isMapDark)}
        </button>
      </div>
      `
          : ""
      }

      <!-- Framed Media Screen: locked stably to the first uploaded clip's aspect ratio -->
      <div class="popup-video" style="position: relative; z-index: 3; width: calc(100% - 24px); height: ${initialGeometry.frameHeight}px; margin: 2px 12px 8px 12px; border-radius: 12px; overflow: hidden; border: ${videoFrameBorder} !important; padding: 0; background: ${videoFrameBg}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);">
        ${renderMediaCarousel(mediaItems, isMapDark, creatorAvatarUrl, rawCreatorDisplayName, safeId, eventCreatorId || "")}
      </div>

      <!-- Footer: seamless faded melt from upper artwork into footer (zero sharp dividing seam) -->
      <div class="popup-footer" style="position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px 10px 14px; background: ${footerBg} !important; border-bottom-left-radius: 17px; border-bottom-right-radius: 17px; font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${footerTextColor}; border: none !important;">
        <div class="popup-footer-fade" aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: calc(100% - 1px); height: 48px; pointer-events: none; background: ${footerFadeGradient};"></div>
        ${displayDesc ? `
          <div class="popup-briefing" style="margin: 0 0 3px 0; line-height: 1.4; word-break: break-word;">
            <p style="margin: 0; font-size: 12px; line-height: 1.42; font-weight: 400; color: ${footerTextColor}; font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.01em;">${esc(displayDesc)}</p>
          </div>
        ` : ""}

        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 7px;">
            ${locationPinHtml}
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
