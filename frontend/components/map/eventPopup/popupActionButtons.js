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

// Pure Hand SVG: Exact Flaticon finger gesture (Picture 1), centered at (12, 12)
export const pureHandSvg = (iconFg, iconStroke) => `
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible;">
    <path
      d="M 10.0 4.0 L 9.3 4.4 L 9.0 4.7 L 8.9 5.1 L 8.9 10.9 L 8.0 11.0 L 7.4 11.2 L 6.7 11.8 L 6.2 12.6 L 6.1 13.2 L 6.1 14.1 L 6.4 15.5 L 6.9 16.8 L 7.6 18.0 L 8.5 19.0 L 9.5 19.7 L 10.6 20.0 L 14.6 20.0 L 15.7 19.9 L 16.6 19.4 L 17.4 18.6 L 17.8 17.7 L 17.9 16.6 L 17.9 10.5 L 17.5 10.0 L 17.0 9.6 L 16.4 9.6 L 15.8 9.8 L 15.4 9.3 L 15.0 8.9 L 14.3 8.9 L 13.7 9.1 L 13.3 8.5 L 12.7 8.2 L 12.2 8.2 L 11.7 8.3 L 11.6 5.0 L 11.4 4.6 L 10.0 4.0 Z"
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconFg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block; overflow: visible;">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  `;
}
