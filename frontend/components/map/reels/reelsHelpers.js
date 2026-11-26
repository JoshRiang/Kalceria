/**
 * Pure domain helpers for Reels Discovery Grid & Unified Feed Merger.
 * Zero @/ alias or React imports so `node --test` verifies directly.
 */

export const REELS_CATEGORY_TABS = [
  { id: "cafe", label: "Cafe" },
  { id: "eat", label: "Eat" },
  { id: "special", label: "Special" },
  { id: "discuss", label: "Discuss" },
  { id: "broadcast", label: "Broadcast" },
];

export function isVideoMediaUrl(url, mediaType = "") {
  if (String(mediaType || "").toLowerCase() === "video") return true;
  return /\.(mp4|webm|mov|m4v|3gp|mkv)(\?|$)/i.test(String(url || ""));
}

export function extractBroadcastMediaUrl(user) {
  const b = user?.broadcast;
  if (!b) return null;
  if (b.expiresAt && new Date(b.expiresAt).getTime() < Date.now()) return null;
  if (b.mediaUrl) return String(b.mediaUrl).trim();
  const raw = typeof b === "string" ? b : String(b.message || "");
  const match = raw.match(/\[MEDIA:([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

export function mergeUnifiedReelsFeed({
  serverPosts = [],
  events = [],
  sidebarKalcerians = [],
  currentUserId = null,
  scope = "friends",
  category = "cafe",
  isUserFriendFn = () => false,
  searchQuery = "",
}) {
  const vid = currentUserId ? String(currentUserId) : "";
  const q = String(searchQuery || "").trim().toLowerCase();
  const items = [];
  const seenKeys = new Set();

  // 1. Dedicated Reels Media Posts (from PostgreSQL SSOT)
  for (const post of serverPosts || []) {
    if (!post?.mediaUrl) continue;
    const key = `url:${post.mediaUrl}`;
    seenKeys.add(key);
    items.push({
      ...post,
      source: "reels_post",
      createdAtMs: new Date(post.createdAt || Date.now()).getTime(),
    });
  }

  // 2. Active Event Clips matching scope + category (for the 4 event categories)
  if (category !== "broadcast") {
    for (const ev of events || []) {
      const evCat = String(ev?.category || "cafe").toLowerCase();
      if (evCat !== category) continue;
      const isPublic = ev?.visibility === "public";
      const creatorId = String(ev?.creatorId || ev?.creator?.id || "");
      const isOwn = Boolean(vid && creatorId === vid);
      const isFriend = Boolean(!isOwn && isUserFriendFn(ev?.creator || { id: creatorId }));

      if (scope === "global" && !isPublic) continue;
      if (scope === "friends" && !isOwn && !isFriend) continue;

      const clips = Array.isArray(ev.mediaItems) ? ev.mediaItems : [];
      for (const clip of clips) {
        if (!clip?.url) continue;
        const key = `url:${clip.url}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const authorId = String(clip.authorId || creatorId);
        const authorIsOwn = Boolean(vid && authorId === vid);
        const authorIsFriend = Boolean(!authorIsOwn && isUserFriendFn({ id: authorId }));

        items.push({
          id: `evclip_${ev.id}_${clip.id || clip.uploadedAt || items.length}`,
          source: "event_clip",
          authorId,
          author: ev.creator || { id: authorId, name: clip.authorName || "Kalcerian", profilePicture: clip.authorAvatarUrl },
          isFriendWithAuthor: authorIsFriend,
          isOwnPost: authorIsOwn,
          eventId: ev.id,
          eventObj: ev,
          category: evCat,
          visibility: isPublic ? "public" : "private",
          mediaUrl: clip.url,
          thumbnailUrl: isVideoMediaUrl(clip.url) ? null : clip.url,
          mediaType: isVideoMediaUrl(clip.url) ? "video" : "photo",
          caption: ev.title ? `${ev.title}${ev.description ? ` — ${ev.description}` : ""}` : (ev.description || ""),
          location: ev.location || null,
          lat: ev.lat ?? null,
          lng: ev.lng ?? null,
          likeCount: 0,
          likedByMe: false,
          commentCount: 0,
          createdAt: new Date(Number(clip.uploadedAt) || new Date(ev.createdAt || Date.now()).getTime()).toISOString(),
          createdAtMs: Number(clip.uploadedAt) || new Date(ev.createdAt || Date.now()).getTime(),
        });
      }
    }
  }

  // 3. Active Broadcast Media (when category === 'broadcast' and scope === 'friends')
  if (category === "broadcast" && scope === "friends") {
    for (const u of sidebarKalcerians || []) {
      const mediaUrl = extractBroadcastMediaUrl(u);
      if (!mediaUrl) continue;
      const uid = String(u.id || "");
      const isOwn = Boolean(vid && uid === vid);
      const isFriend = Boolean(!isOwn && isUserFriendFn(u));
      if (!isOwn && !isFriend) continue;
      const key = `url:${mediaUrl}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const rawText = typeof u.broadcast === "string" ? u.broadcast : String(u.broadcast?.message || "");
      const caption = rawText.replace(/\[MEDIA:[^\]]+\]\s*/gi, "").trim();

      items.push({
        id: `bcast_${uid}_${u.broadcast?.id || "live"}`,
        source: "broadcast_media",
        authorId: uid,
        author: u,
        isFriendWithAuthor: isFriend,
        isOwnPost: isOwn,
        eventId: null,
        userObj: u,
        category: "broadcast",
        visibility: "private",
        mediaUrl,
        thumbnailUrl: isVideoMediaUrl(mediaUrl) ? null : mediaUrl,
        mediaType: isVideoMediaUrl(mediaUrl) ? "video" : "photo",
        caption,
        location: u.district || null,
        lat: u.lat ?? null,
        lng: u.lng ?? null,
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
        createdAt: u.broadcast?.createdAt || new Date().toISOString(),
        createdAtMs: new Date(u.broadcast?.createdAt || Date.now()).getTime(),
      });
    }
  }

  items.sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0));

  if (!q) return items;
  return items.filter((it) => {
    const cap = String(it.caption || "").toLowerCase();
    const loc = String(it.location || "").toLowerCase();
    const authorName = String(it.author?.displayName || it.author?.name || "").toLowerCase();
    return cap.includes(q) || loc.includes(q) || authorName.includes(q);
  });
}
