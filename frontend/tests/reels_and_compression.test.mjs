import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_VIDEO_DURATION_SECONDS,
  computeCompressionStats,
  validateVideoDuration,
  computeFitDimensions,
} from "../lib/mediaCompressor.js";
import {
  REELS_CATEGORY_TABS,
  mergeUnifiedReelsFeed,
} from "../components/map/reels/reelsHelpers.js";

test("Perceptually-lossless media compressor validates 90s duration cap and computes fit dimensions", () => {
  assert.equal(MAX_VIDEO_DURATION_SECONDS, 90);
  assert.equal(validateVideoDuration(45).valid, true);
  assert.equal(validateVideoDuration(95).valid, false);
  assert.deepEqual(computeFitDimensions(3840, 2160, 1920), { width: 1920, height: 1080, resized: true });
  assert.deepEqual(computeFitDimensions(1280, 720, 1920), { width: 1280, height: 720, resized: false });
  assert.deepEqual(computeCompressionStats(10_000_000, 1_500_000), {
    originalBytes: 10_000_000,
    compressedBytes: 1_500_000,
    savedBytes: 8_500_000,
    reductionPercent: 85,
  });
});

test("Reels Discovery has 5 category tabs and enforces Friend-only Reply flag across Global Public & Friends feeds", () => {
  assert.deepEqual(
    REELS_CATEGORY_TABS.map((t) => t.id),
    ["cafe", "eat", "special", "discuss", "broadcast"]
  );

  const events = [
    {
      id: "ev_pub_friend",
      title: "Public Cafe Meet",
      category: "cafe",
      visibility: "public",
      creatorId: "friend1",
      creator: { id: "friend1", name: "Varsi" },
      mediaItems: [{ id: "c1", url: "https://cdn.kalceria.id/a.webp", uploadedAt: 2000 }],
    },
    {
      id: "ev_priv_stranger",
      title: "Private Secret",
      category: "cafe",
      visibility: "private",
      creatorId: "stranger1",
      creator: { id: "stranger1", name: "Stranger" },
      mediaItems: [{ id: "c2", url: "https://cdn.kalceria.id/b.webp", uploadedAt: 3000 }],
    },
  ];

  const isFriend = (u) => String(u?.id) === "friend1";
  const globalCafe = mergeUnifiedReelsFeed({
    serverPosts: [],
    events,
    currentUserId: "me",
    scope: "global",
    category: "cafe",
    isUserFriendFn: isFriend,
  });

  assert.equal(globalCafe.length, 1);
  assert.equal(globalCafe[0].eventId, "ev_pub_friend");
  assert.equal(globalCafe[0].isFriendWithAuthor, true, "Friend on public global event MUST still have Reply enabled");
});
