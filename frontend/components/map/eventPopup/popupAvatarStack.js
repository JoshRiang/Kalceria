import { esc } from "./popupHelpers";
import { getSafeMapAvatarUrl } from "../UserIcon";

/**
 * Render dynamic coin-sized avatar stack for Event Card header:
 * - Creator is on far-left, always on top of stack (z-index: 20)
 * - Size: ~26px (approx 60% of 44px panel avatar)
 * - Collaborators stack to the right, overlapping smoothly
 * - Overlap shrinks dynamically as count grows up to 15 circles
 * - Beyond 15, the displayed stack is capped at 15 circles (stack width stays constant)
 */
export function renderEventAvatarStack({
  creatorUserObj,
  creatorDisplayName = "Kalcerian",
  collaboratorProfiles = [],
  collaboratorIds = [],
  isMapDark = false,
}) {
  const borderColor = isMapDark ? "#1b1c1e" : "#ffffff";
  const circleSize = 26; // 60% of 44px panel avatar

  // 1. Resolve Creator Avatar
  const creatorAvatarUrl = esc(getSafeMapAvatarUrl(creatorUserObj));
  const creatorSafeName = esc(creatorDisplayName);

  // 2. Resolve Collaborator Avatars (up to 14 to make 15 total max displayed)
  const creatorIdStr = String(creatorUserObj?.id || "").toLowerCase();
  const rawList = Array.isArray(collaboratorProfiles) && collaboratorProfiles.length > 0
    ? collaboratorProfiles
    : Array.isArray(collaboratorIds)
    ? collaboratorIds.map((id) => ({ id }))
    : [];

  const validCollabs = rawList
    .filter((u) => {
      const uId = String(u?.id || u?.userId || "").toLowerCase();
      return uId && uId !== creatorIdStr;
    })
    .slice(0, 14); // Max 14 collaborators displayed (15 total with creator)

  const totalDisplayed = 1 + validCollabs.length;

  // 3. Dynamic Shrinking Step Calculation
  // Available extra width for stack: ~110px.
  // When count = 2: step = 19.5px, margin = -6.5px (approx 3/4 circle visible)
  // When count = 15: step = 7.85px, margin = -18.15px (tight coin nest, perfectly fitting 15 circles)
  const availableSpan = 110;
  const step = totalDisplayed > 1
    ? Math.max(7.5, Math.min(19.5, availableSpan / (totalDisplayed - 1)))
    : 0;
  const overlapMargin = totalDisplayed > 1 ? -(circleSize - step) : 0;

  // 4. Build Circles HTML
  // Creator is z-index: 20
  const creatorCircleHtml = `
    <div
      title="${creatorSafeName} (Creator)"
      style="
        position: relative;
        z-index: 20;
        width: ${circleSize}px;
        height: ${circleSize}px;
        border-radius: 50%;
        overflow: hidden;
        border: 1.5px solid ${borderColor};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
        flex-shrink: 0;
        background: ${isMapDark ? "#0f1014" : "#f4f4f5"};
      "
    >
      <img
        src="${creatorAvatarUrl}"
        alt="${creatorSafeName}"
        style="width: 100%; height: 100%; object-fit: cover; display: block;"
        loading="lazy"
      />
    </div>
  `;

  const collabsHtml = validCollabs.map((collab, idx) => {
    const cUrl = esc(getSafeMapAvatarUrl(collab));
    const cName = esc(collab?.displayName || collab?.name || collab?.nickname || `Collaborator ${idx + 1}`);
    const zIndex = 19 - idx;

    return `
      <div
        title="${cName} (Collaborator)"
        style="
          position: relative;
          z-index: ${zIndex};
          width: ${circleSize}px;
          height: ${circleSize}px;
          margin-left: ${overlapMargin.toFixed(1)}px;
          border-radius: 50%;
          overflow: hidden;
          border: 1.5px solid ${borderColor};
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
          flex-shrink: 0;
          background: ${isMapDark ? "#0f1014" : "#f4f4f5"};
        "
      >
        <img
          src="${cUrl}"
          alt="${cName}"
          style="width: 100%; height: 100%; object-fit: cover; display: block;"
          loading="lazy"
        />
      </div>
    `;
  }).join("");

  return `
    <div
      class="event-avatar-stack"
      style="
        display: flex;
        flex-direction: row;
        align-items: center;
        min-width: 0;
        flex-shrink: 0;
      "
    >
      ${creatorCircleHtml}
      ${collabsHtml}
    </div>
  `;
}
