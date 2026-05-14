// UserIcon.jsx
// generates leaflet user icon with floating animation, hover tooltip, droplet
function avatarUrl(user) {
  return user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.nickname || user.name || 'anon')}`;
}

export function getUserIconHtml(user) {
  const displayName = user.nickname || user.name || '';
  const randomDelay = (Math.random() * -2).toFixed(2);
  return `
    <div class="radar-node" style="--user-color: ${user.color || '#ffd60a'}">
      <div class="radar-pulse" style="animation-delay: ${randomDelay}s"></div>
      <div class="radar-nametag">${displayName}</div>
      <div class="radar-float-wrapper" style="animation-delay: ${randomDelay}s">
        <div class="radar-avatar"><img src="${avatarUrl(user)}" alt="${displayName}"></div>
      </div>
      <div class="radar-droplet" style="animation-delay: ${randomDelay}s"></div>
    </div>
  `;
}

export function createUserIcon(L, user) {
  return L.divIcon({
    className: "custom-div-icon",
    html: getUserIconHtml(user),
    iconSize: [48, 80],
    iconAnchor: [24, 70],
  });
}
