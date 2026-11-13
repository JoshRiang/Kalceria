// UserPopup.jsx
// Minimalist 2D broadcast message box for Leaflet markers (with real-time live duration, 24h purge, attached media feed, and Edit/Reply actions)

function getTrashIconSvg(isMapDark) {
  const stroke = isMapDark ? "#ffffff" : "#000000";
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
}

function getReplyIconSvg(isMapDark) {
  const stroke = isMapDark ? "#ffffff" : "#000000";
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>`;
}

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
  const displayName = user?.name || user?.displayName || user?.nickname || "Kalcerian";
  const safeName = esc(displayName);
  const avatarUrl = user?.profilePicture || user?.avatarUrl || user?.image || "/logo-avatar.png";

  const rawBroadcast = user?.broadcast;
  const broadcastObj = typeof rawBroadcast === "object" ? rawBroadcast : null;
  const broadcastId = broadcastObj?.id || user?.id || "";
  const rawMessage = typeof rawBroadcast === "string" ? rawBroadcast : broadcastObj?.message;

  const mediaMatch = String(rawMessage || "").match(/\[MEDIA:([^\]]+)\]/i);
  const mediaUrl = broadcastObj?.mediaUrl || (mediaMatch ? mediaMatch[1].trim() : null);
  const cleanMessage = String(rawMessage || "").replace(/\[MEDIA:[^\]]+\]\s*/gi, "").trim();
  const safeMessage = esc(cleanMessage);

  const viewCount = Number.isFinite(Number(broadcastObj?.viewCount)) ? Number(broadcastObj.viewCount) : 0;

  const isVideo =
    typeof mediaUrl === "string" &&
    (/\.(mp4|m4v|mov|webm)(\?.*)?$/i.test(mediaUrl) ||
      /^data:video\//i.test(mediaUrl) ||
      mediaUrl.includes("video"));

  const rawCreated = broadcastObj?.createdAt || user?.broadcastCreatedAt || user?.updatedAt || user?.createdAt;
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

  const boxWidth = mediaUrl ? "280px" : "250px";
  const maxBoxWidth = mediaUrl ? "min(440px, 92vw)" : "min(280px, 82vw)";

  return `
    <div class="broadcast-popup-box broadcast-box" style="
      position: relative;
      width: ${boxWidth};
      max-width: ${maxBoxWidth};
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
      transition: width 440ms cubic-bezier(0.32, 0.72, 0, 1), max-width 0.2s ease;
    ">
      <!-- Header Row: User Avatar + Display Name on Left, Edit / Reply Button on Right -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          min-width: 0;
        ">
          <!-- Circular User Profile Picture: Border Adapting to Mode -->
          <img
            src="${esc(avatarUrl)}"
            alt="${safeName}"
            style="
              width: 26px;
              height: 26px;
              border-radius: 50%;
              object-fit: cover;
              flex-shrink: 0;
              border: 1.5px solid ${borderColor};
              background: ${isMapDark ? "#111111" : "#eeeeee"};
              display: block;
            "
            onerror="this.onerror=null;this.src='/logo-avatar.png';"
          />
          <div style="
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.25;
            color: ${textColor};
            letter-spacing: -0.01em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
            min-width: 0;
          " title="${safeName}">${safeName}</div>
        </div>

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

      ${
        mediaUrl
          ? `
      <!-- Media Section: Action Row Above Media Box (OUTSIDE) + Dynamic Portrait/Landscape Media Box -->
      <div
        style="
          position: relative;
          width: 100%;
          margin-top: 6px;
          margin-bottom: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        "
      >
        <!-- 1. Action Bar Row Above Media Box (OUTSIDE): Search Icon, View Count, and Reply Arrow (hidden for Creator) -->
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 7px;
            padding: 0 2px;
            pointer-events: auto;
          "
          onpointerdown="event.stopPropagation();"
        >
          <!-- Search icon (matches Event Card & toggles dark/light) -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; display: block;">
            <circle cx="10" cy="10" r="6.5" fill="${isMapDark ? "#000000" : "#ffffff"}" stroke="${isMapDark ? "#ffffff" : "#000000"}" stroke-width="2.5" />
            <path d="M15 15L20.5 20.5" stroke="${isMapDark ? "#ffffff" : "#000000"}" stroke-width="2.8" stroke-linecap="round" />
          </svg>
          <span
            data-broadcast-view-count="${esc(broadcastId)}"
            style="font-family: Arial, -apple-system, sans-serif; font-size: 11.5px; font-weight: 700; color: ${isMapDark ? "#ffffff" : "#000000"}; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; justify-content: center; height: 14px; overflow: hidden; position: relative; vertical-align: middle; min-width: 8px;"
          >
            ${viewCount}
          </span>
          <button
            type="button"
            data-broadcast-action-btn="${esc(broadcastId)}"
            title="${isOwner ? "Hapus broadcast ini" : "Balas broadcast ini"}"
            onpointerdown="event.stopPropagation();"
            onclick="event.stopPropagation(); window.__kalceriaHandleBroadcastAction?.('${esc(user.id)}', '${esc(broadcastId)}');"
            style="background: transparent; border: none; padding: 2px 3px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${isMapDark ? "#ffffff" : "#000000"}; opacity: 0.9; transition: opacity 0.15s ease;"
            onmouseenter="this.style.opacity='1';"
            onmouseleave="this.style.opacity='0.9';"
          >
            ${isOwner ? getTrashIconSvg(isMapDark) : getReplyIconSvg(isMapDark)}
          </button>
        </div>

        <!-- 2. Picture / Video Box: dynamically adapts height & card width to portrait/landscape aspect ratio, zero black lanes -->
        <div
          class="popup-video"
          style="
            position: relative;
            width: 100%;
            height: 189px;
            transition: height 440ms cubic-bezier(0.32, 0.72, 0, 1);
            border-radius: 8px;
            overflow: hidden;
            background: transparent;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          "
        >
          <div
            id="broadcast-carousel-${esc(user.id)}"
            data-carousel-container="bcast_${esc(user.id)}"
            data-slide-count="1"
            data-feed-state="idle"
            class="popup-carousel-container"
            style="position: relative; width: 100%; height: 100%; overflow: hidden;"
          >
            <!-- Whiteline Indicator inside the inner box, strictly WHITE -->
            <div style="position: absolute; top: 6px; left: 8px; right: 8px; z-index: 20; display: flex; pointer-events: auto;">
              <button
                type="button"
                data-carousel-indicator="0"
                title="Clip 1"
                onpointerdown="event.stopPropagation();"
                onclick="event.stopPropagation(); window.__kalceriaSwitchEventMedia?.('bcast_${esc(user.id)}', 0);"
                style="flex: 1 1 0; min-width: 0; padding: 2px 0; background: transparent; border: none; cursor: pointer; pointer-events: auto; outline: none; display: flex; align-items: center;"
              >
                <span style="display: block; width: 100%; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, 0.32); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.45);">
                  <span data-carousel-fill="0" style="display: block; width: 100%; height: 100%; background: #ffffff; transform: scaleX(0); transform-origin: left center; will-change: transform;"></span>
                </span>
              </button>
            </div>

            <div
              data-carousel-slide="0"
              data-clip-id="bcast_${esc(broadcastId || user.id)}"
              data-media-url="${esc(mediaUrl)}"
              style="position: relative; width: 100%; height: 100%;"
            >
              ${
                isVideo
                  ? `
                <video
                  src="${esc(mediaUrl)}"
                  autoplay
                  muted
                  playsinline
                  webkit-playsinline
                  style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; background: transparent;"
                ></video>
              `
                  : `
                <img
                  src="${esc(mediaUrl)}"
                  alt="Broadcast Media"
                  loading="eager"
                  draggable="false"
                  style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; background: transparent; user-select: none;"
                />
              `
              }
            </div>
            <div
              data-carousel-tap-layer
              aria-label="Feed navigation: tap to replay, hold to pause"
              style="position: absolute; inset: 0; z-index: 12; background: transparent; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; user-select: none;"
            ></div>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <!-- Message Text (Arial no bold and firm, not all capital) -->
      ${
        safeMessage
          ? `
      <div style="
        font-family: Arial, sans-serif;
        margin-top: ${mediaUrl ? "4px" : "6px"};
        margin-bottom: 8px;
        font-size: 13.5px;
        font-weight: 400;
        line-height: 1.42;
        color: ${textColor};
        word-break: break-word;
        white-space: pre-wrap;
      ">${safeMessage}</div>
      `
          : ""
      }

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
