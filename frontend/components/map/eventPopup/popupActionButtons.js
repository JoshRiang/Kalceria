import { esc } from "./popupHelpers";

// Picture 2 Icons8 Upload Icon (for accepted collaborators)
export const pureUploadSvg = (iconFg) => `
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

// Pure Hand SVG: Picture 2 Hand Gesture (Solid fill, high-contrast outer edge and finger creases)
export const pureHandSvg = (iconFg, iconStroke) => `
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible;">
    <!-- Hand Silhouette (Picture 2): Solid fill, high-contrast stroke -->
    <path
      d="M 8.8 12.0 L 8.3 4.6 C 8.3 3.6 8.7 3.0 9.3 3.0 C 9.9 3.0 10.3 3.6 10.3 4.6 L 10.5 4.6 L 11.1 3.4 C 11.2 2.5 11.6 1.8 12.2 1.8 C 12.8 1.8 13.2 2.5 13.3 3.4 L 13.5 3.8 L 13.9 3.5 C 14.1 2.7 14.5 2.2 15.0 2.2 C 15.5 2.2 15.9 2.7 16.0 3.5 L 16.2 5.4 L 16.6 5.4 C 16.8 4.7 17.2 4.2 17.7 4.2 C 18.2 4.2 18.6 4.7 18.6 5.4 L 18.6 13.5 C 18.6 17.5 16.2 21.5 12.3 21.5 C 8.8 21.5 6.6 18.2 6.2 14.8 C 5.9 13.2 4.8 12.2 4.9 10.8 C 5.0 9.6 5.8 8.8 6.8 9.0 C 7.6 9.2 8.3 10.3 8.8 12.0 Z"
      fill="${iconFg}"
      stroke="${iconStroke}"
      stroke-width="1.3"
      stroke-linejoin="round"
    />
    <!-- 3 Finger dividing lines (cleft to knuckles) -->
    <path d="M 10.4 4.8 L 10.4 11.9" stroke="${iconStroke}" stroke-width="1.2" stroke-linecap="round" />
    <path d="M 13.4 4.0 L 13.4 11.9" stroke="${iconStroke}" stroke-width="1.2" stroke-linecap="round" />
    <path d="M 16.1 5.6 L 16.1 11.9" stroke="${iconStroke}" stroke-width="1.2" stroke-linecap="round" />
    <!-- Thumb crease line (curving down into palm) -->
    <path d="M 8.8 12.0 C 9.0 14.5, 10.4 16.5, 11.8 17.3" stroke="${iconStroke}" stroke-width="1.2" stroke-linecap="round" fill="none" />
  </svg>
`;

export function renderDoubleMessageIconButton({
  isOwner,
  isCollaborator,
  unreadGroupChatCount,
  iconFg,
  iconStroke,
}) {
  const hasGroupChatRedDot = (isOwner || isCollaborator) && unreadGroupChatCount > 0;
  const groupChatRedDotHtml = hasGroupChatRedDot
    ? `<span style="position: absolute; top: -1px; right: -1px; width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%; border: none !important; box-shadow: none !important; pointer-events: none;"></span>`
    : "";

  return `
    <button
      type="button"
      disabled
      title="Group Chat"
      style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; outline: none; opacity: 0.45; filter: grayscale(100%); pointer-events: none; flex-shrink: 0;"
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
      ${groupChatRedDotHtml}
    </button>
  `;
}

export function renderRequestOrEnvelopeButton({
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
}) {
  const uploadSvg = pureUploadSvg(iconFg);
  const handSvg = pureHandSvg(iconFg, iconStroke);

  if (isOwner) {
    const hasRedDot = !isSelfOffline && pendingRequestsCount > 0;
    const redDotHtml = hasRedDot
      ? `<span style="position: absolute; top: -1px; right: -1px; width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%; border: none !important; box-shadow: none !important; pointer-events: none;"></span>`
      : "";

    return `
      <button
        type="button"
        ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaOpenRequests?.('${esc(item.id)}')"`}
        title="${isSelfOffline ? "Offline (Stealth Mode)" : "Collab Requests"}"
        style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0; ${offlineBtnLockStyle}"
        ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'"`}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block;">
          <rect x="2.5" y="4.5" width="19" height="15" rx="3" fill="${iconFg}" stroke="${iconStroke}" stroke-width="1.3" />
          <path d="M 3.5 6.5 L 12 13 L 20.5 6.5" fill="none" stroke="${iconStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        ${redDotHtml}
      </button>
    `;
  }

  if (isCollaborator) {
    // Accepted collaborator can upload media to event card
    return `
      <button
        type="button"
        ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaCollaboratorUpload?.('${esc(item.id)}')"`}
        title="${isSelfOffline ? "Offline (Stealth Mode)" : "Upload Media (Collaborator)"}"
        style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0; ${offlineBtnLockStyle}"
        ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'"`}
      >
        ${uploadSvg}
      </button>
    `;
  }

  if (hasRequestedThisEvent) {
    // Already requested: gray hand with red prohibited icon overlay
    return `
      <button
        type="button"
        ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaPromptCancelRequest?.('${esc(item.id)}', '${esc(item.title)}')"`}
        title="${isSelfOffline ? "Offline (Stealth Mode)" : `Remove Request from ${esc(item.title)}`}"
        style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0; ${offlineBtnLockStyle}"
        ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'"`}
      >
        <div style="filter: grayscale(100%) opacity(0.45); display: flex; align-items: center; justify-content: center;">
          ${handSvg}
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; overflow: visible;">
          <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </button>
    `;
  }

  if (hasActiveRequestElsewhere) {
    return `
      <button
        type="button"
        ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaPromptCancelRequest?.('${esc(requestedEventId)}', 'active event')"`}
        title="${isSelfOffline ? "Offline (Stealth Mode)" : "Active request exists on another event (Click to cancel)"}"
        style="position: relative; width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; opacity: 0.45; filter: grayscale(100%); flex-shrink: 0; ${offlineBtnLockStyle}"
        ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'"`}
      >
        ${handSvg}
      </button>
    `;
  }

  return `
    <button
      type="button"
      ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaRequestCollab?.('${esc(item.id)}')"`}
      title="${isSelfOffline ? "Offline (Stealth Mode)" : "Request Collab"}"
      style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0; ${offlineBtnLockStyle}"
      ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'"`}
    >
      ${handSvg}
    </button>
  `;
}

export function renderPencilEditButton({
  isOwner,
  isSelfOffline,
  item,
  iconFg,
  iconStroke,
  offlineBtnLockStyle,
}) {
  if (!isOwner) return "";

  return `
    <button
      type="button"
      ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaEditEvent?.('${esc(item.id)}')"`}
      title="${isSelfOffline ? "Offline (Stealth Mode)" : "Edit Event"}"
      style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0; ${offlineBtnLockStyle}"
      ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'"`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible; filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.45));">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="${iconStroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="${iconFg}" stroke="${iconStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  `;
}

export function renderReplyEventButton({
  isOwner,
  isSelfOffline,
  item,
  iconFg,
  offlineBtnLockStyle,
}) {
  // Non-creator only: reply goes directly to the Event's creator
  if (isOwner) return "";

  return `
    <button
      type="button"
      ${isSelfOffline ? "disabled" : `onclick="window.__kalceriaReplyEvent?.('${esc(item.id)}')"`}
      title="${isSelfOffline ? "Offline (Stealth Mode)" : "Reply Event"}"
      style="width: 24px; height: 24px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0; ${offlineBtnLockStyle}"
      ${isSelfOffline ? "" : `onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'"`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconFg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <path d="M9 15L3 9m0 0l6-6M3 9h11a6 6 0 0 1 6 6v3" />
      </svg>
    </button>
  `;
}
