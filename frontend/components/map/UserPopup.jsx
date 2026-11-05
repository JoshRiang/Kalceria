// UserPopup.jsx
// Minimalist 2D broadcast message box for Leaflet markers (legacy map profile card removed)

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

export function getBroadcastMessageBoxHtml(user, isMapDark = false) {
  const displayName = user?.nickname || user?.name || "Kalcerian";
  const safeName = esc(displayName);
  const rawMessage = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  const safeMessage = esc(rawMessage || "");
  const timeInput = user?.broadcast?.createdAt || user?.updatedAt || user?.createdAt;
  const releaseTime = formatWIBTime(timeInput);

  const bgColor = isMapDark ? "#000000" : "#ffffff";
  const textColor = isMapDark ? "#ffffff" : "#000000";
  const borderColor = isMapDark ? "#ffffff" : "#000000";
  const timeColor = isMapDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.55)";
  const shadow = isMapDark
    ? "0 4px 20px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.4)"
    : "0 4px 16px rgba(0, 0, 0, 0.18)";

  return `
    <div class="broadcast-popup-box" style="
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
      <!-- Top Left: User Name (Picture 5 style: clean Arial, firm, medium weight, not all-caps) -->
      <div style="
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.25;
        color: ${textColor};
        letter-spacing: -0.01em;
      ">${safeName}</div>

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

      <!-- Bottom Right: Release Time (e.g. 11:28, tiny font, no bold, relevant style) -->
      <div style="
        font-family: Arial, sans-serif;
        align-self: flex-end;
        font-size: 11px;
        font-weight: 400;
        line-height: 1;
        color: ${timeColor};
        margin-top: 2px;
      ">${releaseTime}</div>

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

export function userPopup(user, isMapDark = false) {
  const broadcastMsg = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  if (broadcastMsg && broadcastMsg.trim()) {
    return getBroadcastMessageBoxHtml(user, isMapDark);
  }
  // No legacy card on the map: profiles expand cleanly in the sidebar scrollbar
  return null;
}
