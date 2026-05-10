// UserIcon.jsx
// Stateless utility for generating Leaflet user icon HTML
export function getUserIconHtml(user) {
  return `
    <div class="radar-node" style="--user-color: ${user.color}">
      <div class="radar-pulse"></div>
      <div class="radar-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.avatarSeed)}" alt="${user.nickname}"></div>
      <div class="radar-pointer"></div>
    </div>
  `;
}

export function createUserIcon(L, user) {
  return L.divIcon({
    className: "custom-div-icon",
    html: getUserIconHtml(user),
    iconSize: [48, 70],
    iconAnchor: [24, 70],
  });
}
