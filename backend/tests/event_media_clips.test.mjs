import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { MINI_EVENT_CLIP_TTL_MS } from '../controllers/miniEvent/eventFormatting.js';
import {
  IMAGE_CLIP_DURATION_SECONDS,
  MAX_ACTIVE_EVENT_CLIPS,
  buildClipRecord,
  classifyClipOrientation,
  parseSubmittedMediaItems,
  planEventMediaSelection,
} from '../controllers/miniEvent/eventMediaStore.js';
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

