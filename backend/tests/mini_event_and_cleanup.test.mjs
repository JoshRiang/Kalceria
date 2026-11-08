import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  MINI_EVENT_PERMANENT_EXPIRES_AT,
  buildEncodedDescription,
  extractEncodedTags,
  stripEncodedTags,
  formatMiniEventResponse,
  extractUrlsFromLegacyMediaString,
} from '../controllers/miniEvent/eventFormatting.js';
import {
  splitMediaUrlList,
  sanitizeAndNormalizeMediaUrl,
} from '../utils/urlSecurity.js';

const BLOB_WEBM =
  '/api/blob/raw?url=https%3A%2F%2Fexample.blob.vercel-storage.com%2Fclip.webm';
const BLOB_WEBP =
  '/api/blob/raw?url=https%3A%2F%2Fexample.blob.vercel-storage.com%2Fcover.webp';

describe('mini event encoded description', () => {
  it('keeps permanent expiry in year 2099', () => {
    assert.equal(MINI_EVENT_PERMANENT_EXPIRES_AT.getUTCFullYear(), 2099);
  });

  it('round-trips category, location, media and plain text', () => {
    const encoded = buildEncodedDescription({
      category: 'cafe',
      location: 'Ranch Market',
      mediaUrls: ['/media/gifs/a.mp4', '/media/gifs/b.mp4'],
      plainDescription: 'Monyet lu',
    });
    const tags = extractEncodedTags(encoded);
    assert.equal(tags.category, 'cafe');
    assert.equal(tags.location, 'Ranch Market');
    assert.equal(tags.mediaStr, '/media/gifs/a.mp4, /media/gifs/b.mp4');
    assert.equal(tags.plainDescription, 'Monyet lu');
  });

  it('extracts [COLLABS:...] ids and strips every tag from plain text', () => {
    const raw = '[CAT:cafe] [COLLABS:u1, u2 ,u3] Hello world';
    const tags = extractEncodedTags(raw);
    assert.deepEqual(tags.collaborators, ['u1', 'u2', 'u3']);
    assert.equal(stripEncodedTags(raw), 'Hello world');
  });

  it('splits legacy media strings with upload timestamps', () => {
    const ts = 1_700_000_000_000;
    const items = extractUrlsFromLegacyMediaString(`/media/a.mp4|${ts}, /media/b.mp4`);
    assert.deepEqual(items, [
      { url: '/media/a.mp4', uploadedAt: ts },
      { url: '/media/b.mp4', uploadedAt: null },
    ]);
  });
});

describe('formatMiniEventResponse hydration', () => {
  it('uses hydrated mediaItems, collaborators and pendingRequestsCount', () => {
    const mediaItems = [
      { url: '/media/a.mp4', duration: 12.5 },
      { url: '/media/b.mp4', duration: 3 },
    ];
    const formatted = formatMiniEventResponse(
      { id: 'e1', title: 'teseting', description: '[CAT:cafe] [LOC:Jakarta] Halo' },
      {
        mediaItems,
        collaborators: ['u9'],
        collaboratorProfiles: [{ id: 'u9' }],
        pendingRequestsCount: 3,
      }
    );
    assert.deepEqual(formatted.mediaItems, mediaItems);
    assert.equal(formatted.mediaUrl, '/media/a.mp4, /media/b.mp4');
    assert.deepEqual(formatted.collaborators, ['u9']);
    assert.deepEqual(formatted.collaboratorProfiles, [{ id: 'u9' }]);
    assert.equal(formatted.pendingRequestsCount, 3);
    assert.equal(formatted.category, 'cafe');
    assert.equal(formatted.location, 'Jakarta');
    assert.equal(formatted.description, 'Halo');
  });

  it('falls back to encoded collaborators and zero pending requests', () => {
    const formatted = formatMiniEventResponse({
      id: 'e2',
      title: 'x',
      description: '[COLLABS:a,b] Plain',
    });
    assert.deepEqual(formatted.collaborators, ['a', 'b']);
    assert.equal(formatted.pendingRequestsCount, 0);
    assert.deepEqual(formatted.mediaItems, []);
  });
});

describe('media URL sanitizer', () => {
  it('does not split private blob proxy URLs on their inner characters', () => {
    assert.deepEqual(splitMediaUrlList(`${BLOB_WEBM}, ${BLOB_WEBP}`), [BLOB_WEBM, BLOB_WEBP]);
  });

  it('accepts private blob proxy URLs for .webm and .webp', () => {
    assert.deepEqual(sanitizeAndNormalizeMediaUrl(BLOB_WEBM), {
      valid: true,
      normalized: BLOB_WEBM,
    });
    assert.deepEqual(sanitizeAndNormalizeMediaUrl(BLOB_WEBP), {
      valid: true,
      normalized: BLOB_WEBP,
    });
  });

  it('accepts a list mixing local media and blob proxy URLs', () => {
    const result = sanitizeAndNormalizeMediaUrl(`/media/gifs/a.mp4, ${BLOB_WEBM}`);
    assert.equal(result.valid, true);
    assert.equal(result.normalized, `/media/gifs/a.mp4, ${BLOB_WEBM}`);
  });

  it('rejects blob proxy pointing to a non-Vercel or private host', () => {
    const evil = '/api/blob/raw?url=https%3A%2F%2Fevil.example.com%2Fclip.webm';
    const internal = '/api/blob/raw?url=https%3A%2F%2F127.0.0.1%2Fclip.webm';
    assert.equal(sanitizeAndNormalizeMediaUrl(evil).valid, false);
    assert.equal(sanitizeAndNormalizeMediaUrl(internal).valid, false);
  });

  it('rejects traversal, SSRF, bad schemes, XSS and bad extensions', () => {
    const bad = [
      '/media/../secret.mp4',
      'https://example.com/%2e%2e/clip.mp4',
      'https://localhost/clip.mp4',
      'https://169.254.169.254/clip.mp4',
      'javascript:alert(1)',
      'https://example.com/clip.mp4?x=<script>',
      'https://example.com/clip.exe',
      '/api/blob/raw?url=https%3A%2F%2Fexample.blob.vercel-storage.com%2Fclip.exe',
    ];
    for (const value of bad) {
      assert.equal(sanitizeAndNormalizeMediaUrl(value).valid, false, value);
    }
  });
});

describe('profile media sanitizers and account cleanup exports', () => {
  let redisClient = null;

  after(async () => {
    try {
      await redisClient?.quit();
    } catch {}
  });

  it('allows blob proxy, webm and hex values for profile picture and cover', async () => {
    const redisModule = await import('../lib/redis.js');
    redisClient = redisModule.redis;
    const { sanitizeProfilePictureUrl, sanitizeCoverMediaUrl } = await import(
      '../utils/profileDefaults.js'
    );

    assert.equal(sanitizeProfilePictureUrl(BLOB_WEBP), BLOB_WEBP);
    assert.equal(sanitizeCoverMediaUrl(BLOB_WEBM), BLOB_WEBM);
    assert.equal(
      sanitizeCoverMediaUrl('https://example.blob.vercel-storage.com/clip.webm'),
      'https://example.blob.vercel-storage.com/clip.webm'
    );
    assert.equal(sanitizeCoverMediaUrl('#1b4332'), '#1b4332');
    assert.equal(sanitizeProfilePictureUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeCoverMediaUrl('javascript:alert(1)'), null);
  });

  it('exposes the account cleanup helpers', async () => {
    const cleanup = await import('../controllers/auth/cleanupUserFootprint.js');
    assert.equal(typeof cleanup.cleanupUserDatabaseRecords, 'function');
    assert.equal(typeof cleanup.purgeUserRedisFootprint, 'function');
  });
});

