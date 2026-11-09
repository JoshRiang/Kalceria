// UserPopup.jsx
// Minimalist 2D broadcast message box for Leaflet markers (with real-time live duration, 24h purge, and Edit/Reply actions)

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatWIBTime(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
    }
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "11:28";
  }
}

/**
 * Format broadcast live duration in hours and minutes:
 * e.g. 0m, 15m, 1h 32m
 */
export function formatBroadcastDuration(diffMs) {
  const totalMin = Math.max(0, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export function getBroadcastMessageBoxHtml(user, isMapDark = false, currentUser = null) {
  const displayName = user?.nickname || user?.name || "Kalcerian";
  const safeName = esc(displayName);
  const rawMessage = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  const safeMessage = esc(rawMessage || "");

  const rawCreated = user?.broadcast?.createdAt || user?.broadcastCreatedAt || user?.updatedAt || user?.createdAt;
  const createdAtMs = rawCreated ? new Date(rawCreated).getTime() : Date.now();
  const elapsedMs = Math.max(0, Date.now() - createdAtMs);

  // When touching 24h (1440m), broadcast is automatically purged and does not render
  if (elapsedMs >= 24 * 60 * 60 * 1000) {
    return null;
  }

  const broadcastDurationString = formatBroadcastDuration(elapsedMs);
  const releaseTime = formatWIBTime(rawCreated);

  const curId = currentUser?.id ? String(currentUser.id) : null;
  const isOwner = Boolean(
    currentUser &&
      (curId && user?.id
        ? String(user.id) === curId
        : currentUser.nickname &&
          user?.nickname &&
          currentUser.nickname.trim().toLowerCase() === user.nickname.trim().toLowerCase())
  );

  const bgColor = isMapDark ? "#000000" : "#ffffff";
  const textColor = isMapDark ? "#ffffff" : "#000000";
  const borderColor = isMapDark ? "#ffffff" : "#000000";
  const timeColor = isMapDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.55)";
  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const iconFg = isMapDark ? "#ffffff" : "#000000";
  const iconStroke = isMapDark ? "#000000" : "#ffffff";
  const shadow = isMapDark
    ? "0 4px 20px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.4)"
    : "0 4px 16px rgba(0, 0, 0, 0.18)";

  return `
    <div class="broadcast-popup-box broadcast-box" style="
      position: relative;
      width: 250px;
      max-width: min(280px, 82vw);
      padding: 12px 14px 10px 14px;
      background: ${bgColor};
      border: 1.5px solid ${borderColor};
      border-radius: 12px;
      box-shadow: ${shadow};
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: left;
    ">
      <!-- Header Row: User Name on Left, Edit / Reply Button on Right -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      ">
        <div style="
          font-family: Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.25;
          color: ${textColor};
          letter-spacing: -0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${safeName}</div>

        ${
          isOwner
            ? `
          <!-- Creator: Edit Icon (User Profile notepad + pencil style) -->
          <button
            type="button"
            onclick="window.__kalceriaEditBroadcast?.('${esc(user.id)}')"
            title="Edit Broadcast"
            style="width: 22px; height: 22px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
            onmouseover="this.style.transform='scale(1.15)'"
            onmouseout="this.style.transform='scale(1)'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: block; overflow: visible; filter: drop-shadow(0 0 1px ${isMapDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.45)"});">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="${iconStroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="${iconFg}" stroke="${iconStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        `
            : `
          <!-- Non-Creator: Reply Icon -->
          <button
            type="button"
            onclick="window.__kalceriaReplyBroadcast?.('${esc(user.id)}')"
            title="Reply Broadcast"
            style="width: 22px; height: 22px; background: transparent; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; outline: none; transition: transform 0.15s ease; flex-shrink: 0;"
            onmouseover="this.style.transform='scale(1.15)'"
            onmouseout="this.style.transform='scale(1)'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
              <path d="M9 15L3 9m0 0l6-6M3 9h11a6 6 0 0 1 6 6v3" />
            </svg>
          </button>
        `
        }
      </div>

      <!-- Message Text (Arial no bold and firm, not all capital) -->
      <div style="
        font-family: Arial, sans-serif;
        margin-top: 6px;
        margin-bottom: 8px;
        font-size: 13.5px;
        font-weight: 400;
        line-height: 1.42;
        color: ${textColor};
        word-break: break-word;
        white-space: pre-wrap;
      ">${safeMessage}</div>

      <!-- Bottom Row: Real-time Live Duration Uptime on Left, Release Time on Right -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-top: 2px;
      ">
        <!-- Left: Live Duration (e.g. 1h 32m, 0m) with Clock Icon -->
        <div style="display: flex; align-items: center; gap: 5px;">
          <svg width="13" height="13" viewBox="0 0 24 24" style="overflow: visible; flex-shrink: 0; display: block;">
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
          <span
            data-broadcast-uptime="${createdAtMs}"
            data-user-id="${esc(user.id)}"
            style="font-family: Arial, sans-serif; font-size: 11px; font-weight: normal; font-style: normal; color: ${timeColor}; letter-spacing: 0.02em; font-variant-numeric: tabular-nums;"
          >${broadcastDurationString}</span>
        </div>

        <!-- Right: Release Time (e.g. 06:57 in WIB) -->
        <div style="
          font-family: Arial, sans-serif;
          font-size: 11px;
          font-weight: 400;
          line-height: 1;
          color: ${timeColor};
          letter-spacing: 0.02em;
        ">${releaseTime}</div>
      </div>

      <!-- Bottom-Left Speech Bubble Tail (Picture 4 style) -->
      <div style="
        position: absolute;
        bottom: -7.5px;
        left: 20px;
        width: 12px;
        height: 7.5px;
        overflow: hidden;
        pointer-events: none;
      ">
        <div style="
          width: 11px;
          height: 11px;
          background: ${bgColor};
          border-right: 1.5px solid ${borderColor};
          border-bottom: 1.5px solid ${borderColor};
          transform: rotate(45deg);
          margin-top: -6px;
          margin-left: 0.5px;
        "></div>
      </div>
    </div>
  `;
}

export function userPopup(user, isMapDark = false, currentUser = null) {
  const broadcastMsg = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  if (broadcastMsg && broadcastMsg.trim()) {
    return getBroadcastMessageBoxHtml(user, isMapDark, currentUser);
  }
  // No legacy card on the map: profiles expand cleanly in the sidebar scrollbar
  return null;
}
