import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractEncodedTags, buildEncodedDescription } from '../controllers/miniEvent/eventFormatting.js';

test('Mini Event visibility defaults to private and encodes [VIS:public] only when public', () => {
  const privDesc = buildEncodedDescription({ category: 'cafe', plainDescription: 'Ngopi santai' });
  assert.doesNotMatch(privDesc, /\[VIS:/);
  assert.equal(extractEncodedTags(privDesc).visibility, 'private');

  const pubDesc = buildEncodedDescription({ category: 'cafe', visibility: 'public', plainDescription: 'Open meet' });
  assert.match(pubDesc, /\[VIS:public\]/);
  assert.equal(extractEncodedTags(pubDesc).visibility, 'public');
  assert.equal(extractEncodedTags(pubDesc).plainDescription, 'Open meet');
});

test('getActiveMiniEvents exposes public events globally while isolating private events', () => {
  const src = fs.readFileSync(path.resolve('backend/controllers/miniEvent/eventCrudHandlers.js'), 'utf8');
  assert.match(src, /if \(ev\.visibility === 'public'\) return true;/);
});

test('routes/index.js registers all Reels endpoints with requireAuth', () => {
  const routesSrc = fs.readFileSync(path.resolve('backend/routes/index.js'), 'utf8');
  assert.match(routesSrc, /router\.get\("\/map\/reels",\s*requireAuth,\s*getReelsFeedHandler\)/);
  assert.match(routesSrc, /router\.post\("\/map\/reels",\s*requireAuth,\s*createReelsPostHandler\)/);
  assert.match(routesSrc, /router\.post\("\/map\/reels\/:postId\/like",\s*requireAuth,\s*toggleReelsPostLikeHandler\)/);
  assert.match(routesSrc, /router\.post\("\/map\/reels\/:postId\/comments",\s*requireAuth,\s*addReelsPostCommentHandler\)/);
});
