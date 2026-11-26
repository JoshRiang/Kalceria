import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  MINI_EVENT_CLIP_TTL_MS,
  buildEncodedDescription,
  extractEncodedTags,
} from '../controllers/miniEvent/eventFormatting.js';
import {
  IMAGE_CLIP_DURATION_SECONDS,
  MAX_ACTIVE_EVENT_CLIPS,
  buildClipRecord,
  classifyClipOrientation,
  deriveAuthoritativeClipsFromDescription,
  parseSubmittedMediaItems,
  planEventMediaSelection,
} from '../controllers/miniEvent/eventMediaStore.js';
import {
  purgeAllEventClips,
  readEventClips,
  removeEventClipIds,
  writeEventClips,
} from '../controllers/miniEvent/eventMediaPersistence.js';
import {
  extractBroadcastMediaAndText,
  getBroadcastViewCount,
  recordBroadcastView,
} from '../controllers/broadcastController.js';
import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';

const blob = (name) =>
  `/api/blob/raw?url=${encodeURIComponent(`https://example.blob.vercel-storage.com/event-clips/${name}`)}`;

after(async () => {
  try {
    await redis.quit();
  } catch {}
  try {
    await prisma.$disconnect();
  } catch {}
});

describe('event live media clips', () => {
  it('gives photos a default 3 second duration and keeps real video durations', () => {
    const photo = buildClipRecord({ url: blob('a.webp'), width: 1080, height: 1920 });
    const video = buildClipRecord({ url: blob('b.webm'), width: 1920, height: 1080, duration: 12.5 });
    assert.equal(photo.isVideo, false);
    assert.equal(photo.duration, IMAGE_CLIP_DURATION_SECONDS);
    assert.equal(IMAGE_CLIP_DURATION_SECONDS, 3);
    assert.equal(video.isVideo, true);
    assert.equal(video.duration, 12.5);
  });

  it('expires every clip individually 24h after its own upload time', () => {
    const uploadedAt = 1_800_000_000_000;
    const clip = buildClipRecord({ url: blob('c.mp4'), uploadedAt });
    assert.equal(clip.uploadedAt, uploadedAt);
    assert.equal(clip.expiresAt, uploadedAt + MINI_EVENT_CLIP_TTL_MS);
    assert.equal(MINI_EVENT_CLIP_TTL_MS, 24 * 60 * 60 * 1000);
  });

  it('classifies orientation and aspect ratio from real dimensions', () => {
    assert.equal(classifyClipOrientation(1920, 1080), 'landscape');
    assert.equal(classifyClipOrientation(1080, 1920), 'portrait');
    assert.equal(classifyClipOrientation(1000, 1000), 'square');
    assert.equal(classifyClipOrientation(null, 1080), null);
    const clip = buildClipRecord({ url: blob('d.mp4'), width: 1920, height: 1080, duration: 5 });
    assert.equal(clip.orientation, 'landscape');
    assert.equal(clip.aspectRatio, 1.7778);
  });

  it('keeps both clips when two videos are submitted together', () => {
    const result = parseSubmittedMediaItems({
      mediaItems: [
        { url: blob('one.webm'), width: 720, height: 1280, duration: 8 },
        { url: blob('two.webm'), width: 1280, height: 720, duration: 6 },
      ],
      authorId: 'u1',
      authorName: 'Creator',
    });
    assert.equal(result.valid, true);
    assert.equal(result.clips.length, 2);
    assert.notEqual(result.clips[0].id, result.clips[1].id);
    assert.deepEqual(result.clips.map((c) => c.orientation), ['portrait', 'landscape']);
  });

  it('accepts up to the per-event clip cap and no more per request', () => {
    const items = Array.from({ length: MAX_ACTIVE_EVENT_CLIPS + 5 }, (_, i) => ({
      url: blob(`bulk-${i}.webp`),
    }));
    const result = parseSubmittedMediaItems({ mediaItems: items, authorId: 'u1' });
    assert.equal(result.valid, true);
    assert.equal(result.clips.length, MAX_ACTIVE_EVENT_CLIPS);
  });
});

describe('owner edit planning never drops a guest clip by accident', () => {
  const ownerClip = { id: 'a', url: blob('a.webm'), uploadedAt: 1000, authorId: 'owner' };
  const guestClip = { id: 'b', url: blob('b.webm'), uploadedAt: 2000, authorId: 'guest' };

  it('removes a clip the owner deliberately removed', () => {
    const plan = planEventMediaSelection([ownerClip, guestClip], [ownerClip]);
    assert.deepEqual(plan.finalClips.map((c) => c.id), ['a']);
    assert.deepEqual(plan.removedIds, ['b']);
  });

  it('preserves clips attached after the editor was opened', () => {
    const plan = planEventMediaSelection([ownerClip, guestClip], [ownerClip], 1500);
    assert.deepEqual(plan.finalClips.map((c) => c.id), ['a', 'b']);
    assert.deepEqual(plan.removedIds, []);
  });

  it('reuses stored clip records and appends new ones in upload order', () => {
    const fresh = { id: 'c', url: blob('c.webm'), uploadedAt: 3000, authorId: 'owner' };
    const plan = planEventMediaSelection(
      [ownerClip, guestClip],
      [{ ...ownerClip, id: 'new-id-ignored' }, guestClip, fresh]
    );
    assert.deepEqual(plan.finalClips.map((c) => c.id), ['a', 'b', 'c']);
    assert.deepEqual(plan.removedIds, []);
  });

  it('ignores duplicate submitted urls', () => {
    const plan = planEventMediaSelection([ownerClip], [ownerClip, ownerClip]);
    assert.equal(plan.finalClips.length, 1);
  });
});

describe('postgres SSOT clip manifest persistence across cold lambdas & redis fallback', () => {
  it('encodes and restores exact clip id, uploadedAt, dimensions, duration, and author from [CMETA] tag', () => {
    const now = Date.now();
    const oldEventCreatedMs = now - 16 * 24 * 60 * 60 * 1000; // 16-day-old event
    const freshClip = buildClipRecord({
      url: 'https://cdn.kalceria.id/event-clips/2026-11-26/clip-a.mp4',
      width: 1080,
      height: 1920,
      duration: 9.5,
      authorId: 'collab_42',
      authorName: 'Nongskuy Partner',
      authorAvatarUrl: 'https://cdn.kalceria.id/avatars/u42.webp',
      uploadedAt: now - 30_000,
    });

    const desc = buildEncodedDescription({
      category: 'cafe',
      location: 'Senopati, Jakarta Selatan',
      mediaClips: [freshClip],
      plainDescription: 'Ngopi santai',
    });

    const tags = extractEncodedTags(desc);
    assert.equal(tags.plainDescription, 'Ngopi santai');
    assert.equal(tags.category, 'cafe');
    assert.equal(tags.location, 'Senopati, Jakarta Selatan');
    assert.ok(tags.clipMetaStr.length > 10);

    // Cold lambda hydrates from Postgres description alone — clip survives even on 16-day-old event
    const derived = deriveAuthoritativeClipsFromDescription(
      { id: 'ev_1', creatorId: 'owner_1', description: desc },
      tags,
      oldEventCreatedMs,
      'Owner',
      null,
      now
    );
    assert.equal(derived.hasStructuredMeta, true);
    assert.equal(derived.clips.length, 1);
    assert.equal(derived.clips[0].id, freshClip.id);
    assert.equal(derived.clips[0].width, 1080);
    assert.equal(derived.clips[0].height, 1920);
    assert.equal(derived.clips[0].orientation, 'portrait');
    assert.equal(derived.clips[0].duration, 9.5);
    assert.equal(derived.clips[0].authorId, 'collab_42');
    assert.equal(derived.clips[0].authorName, 'Nongskuy Partner');
  });

  it('prunes genuinely expired clips in [CMETA] while keeping active clips intact', () => {
    const now = Date.now();
    const expired = buildClipRecord({
      url: 'https://cdn.kalceria.id/event-clips/2026-11-20/old.webp',
      uploadedAt: now - MINI_EVENT_CLIP_TTL_MS - 5000,
    });
    const active = buildClipRecord({
      url: 'https://cdn.kalceria.id/event-clips/2026-11-26/new.webp',
      width: 1200,
      height: 800,
      uploadedAt: now - 10_000,
    });
    const desc = buildEncodedDescription({
      category: 'cafe',
      location: 'Bintaro',
      mediaClips: [expired, active],
      plainDescription: 'Test',
    });
    const tags = extractEncodedTags(desc);
    const derived = deriveAuthoritativeClipsFromDescription(
      { id: 'ev_2', creatorId: 'owner_1', description: desc },
      tags,
      now - 1000,
      'Owner',
      null,
      now
    );
    assert.equal(derived.droppedExpired, true);
    assert.equal(derived.clips.length, 1);
    assert.equal(derived.clips[0].url, active.url);
    assert.equal(derived.clips[0].orientation, 'landscape');
  });

  it('writes, reads back in upload order, and removes event clips cleanly in persistence helper', async () => {
    const now = Date.now();
    const testClipId1 = 'test-clip-1-' + now;
    const testClipId2 = 'test-clip-2-' + now;
    const testEventId = 'test-event-' + now;
    try {
      await writeEventClips(
        testEventId,
        [
          {
            id: testClipId2,
            url: blob('second.mp4'),
            authorId: 'guest_2',
            uploadedAt: now + 1000,
            expiresAt: now + MINI_EVENT_CLIP_TTL_MS,
          },
          {
            id: testClipId1,
            url: blob('first.mp4'),
            authorId: 'creator_1',
            uploadedAt: now,
            expiresAt: now + MINI_EVENT_CLIP_TTL_MS,
          },
        ],
        now
      );

      const afterWrite = await readEventClips(testEventId);
      assert.equal(afterWrite.initialized, true);
      assert.deepEqual(
        afterWrite.clips.map((c) => c.id),
        [testClipId1, testClipId2]
      );
      assert.equal(afterWrite.clips[0].authorId, 'creator_1');
      assert.equal(afterWrite.clips[1].authorId, 'guest_2');

      await removeEventClipIds(testEventId, [testClipId1]);
      const afterPartialRemove = await readEventClips(testEventId);
      assert.deepEqual(
        afterPartialRemove.clips.map((c) => c.id),
        [testClipId2]
      );

      await removeEventClipIds(testEventId, [testClipId2]);
      const afterFullRemove = await readEventClips(testEventId);
      assert.equal(afterFullRemove.clips.length, 0);
    } finally {
      await purgeAllEventClips([testEventId]);
    }
  });
});

describe('broadcast media extraction and view counter with author exclusion', () => {
  it('extractBroadcastMediaAndText parses [MEDIA:...] tag and separates clean text', () => {
    const raw = '[MEDIA:https://example.com/clip.mp4] OTW FM bro';
    const result = extractBroadcastMediaAndText(raw);
    assert.equal(result.mediaUrl, 'https://example.com/clip.mp4');
    assert.equal(result.text, 'OTW FM bro');

    const explicit = extractBroadcastMediaAndText('Pure text', 'https://example.com/pic.png');
    assert.equal(explicit.mediaUrl, 'https://example.com/pic.png');
    assert.equal(explicit.text, 'Pure text');
  });

  it('broadcast creator views cannot increment view counter, non-creators increment continuously', async () => {
    const fakeBroadcastId = 'bcast-view-test-' + Date.now();
    const creatorUserId = 'user-creator-123';

    // Mock prisma findUnique in memory for testing
    const originalFindUnique = prisma.userBroadcast.findUnique;
    prisma.userBroadcast.findUnique = async ({ where }) => {
      if (where.id === fakeBroadcastId) {
        return { id: fakeBroadcastId, userId: creatorUserId };
      }
      return null;
    };

    try {
      // 1. Creator viewing their own broadcast
      let resData = null;
      const creatorReq = {
        params: { id: fakeBroadcastId },
        user: { userId: creatorUserId },
        ip: '127.0.0.1',
      };
      const mockRes = {
        status: () => mockRes,
        json: (d) => { resData = d; },
      };

      await recordBroadcastView(creatorReq, mockRes);
      assert.equal(resData?.viewCount, 0, 'Creator view must NOT increment counter');

      // Creator repeats view 3 times
      await recordBroadcastView(creatorReq, mockRes);
      await recordBroadcastView(creatorReq, mockRes);
      assert.equal(resData?.viewCount, 0, 'Repeated creator views must still remain 0');

      // 2. Non-creator viewer A views
      const viewerAReq = {
        params: { id: fakeBroadcastId },
        user: { userId: 'viewer-user-A' },
        ip: '10.0.0.1',
      };
      await recordBroadcastView(viewerAReq, mockRes);
      assert.equal(resData?.viewCount, 1, 'First unique non-creator view must increment to 1');

      // Viewer A repeats view 2 times (reopen / loop)
      await recordBroadcastView(viewerAReq, mockRes);
      await recordBroadcastView(viewerAReq, mockRes);
      assert.equal(resData?.viewCount, 3, 'Repeated views by same user must increment count continuously');

      // 3. Non-creator viewer B views
      const viewerBReq = {
        params: { id: fakeBroadcastId },
        user: { userId: 'viewer-user-B' },
        ip: '10.0.0.2',
      };
      await recordBroadcastView(viewerBReq, mockRes);
      assert.equal(resData?.viewCount, 4, 'Second non-creator view must increment to 4');

      // 4. Creator views again: must remain 4 without inflating
      await recordBroadcastView(creatorReq, mockRes);
      assert.equal(resData?.viewCount, 4, 'Creator view must not increment existing count');

      // 5. Clean up Redis key
      await redis.del(`broadcast:views:${fakeBroadcastId}`);
      const cleared = await getBroadcastViewCount(fakeBroadcastId);
      assert.equal(cleared, 0, 'Redis view counter should be 0 after delete');
    } finally {
      prisma.userBroadcast.findUnique = originalFindUnique;
      await redis.del(`broadcast:views:${fakeBroadcastId}`);
    }
  });
});

