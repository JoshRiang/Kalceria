import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  TEMP_MAP_WHITELIST_EMAILS,
  isEmailWhitelistedForMap,
  normalizeWhitelistEmail,
} from '../temp_map_whitelist/config.js';
import {
  TEMP_MAP_GUARDED_PATHS,
  createTempMapWhitelistGuard,
} from '../temp_map_whitelist/requireMapWhitelist.js';

function makeRes() {
  const out = { statusCode: 200, body: null };
  return {
    out,
    status(code) {
      out.statusCode = code;
      return this;
    },
    json(payload) {
      out.body = payload;
      return this;
    },
  };
}

test('temp map whitelist permits ONLY reinathanezhekiel1@gmail.com and varsikurniawan@gmail.com', () => {
  assert.deepEqual([...TEMP_MAP_WHITELIST_EMAILS], [
    'reinathanezhekiel1@gmail.com',
    'varsikurniawan@gmail.com',
  ]);
  assert.equal(normalizeWhitelistEmail('  ReinathanEzhekiel1@GMAIL.com '), 'reinathanezhekiel1@gmail.com');
  assert.equal(isEmailWhitelistedForMap('reinathanezhekiel1@gmail.com', { enabled: true }), true);
  assert.equal(isEmailWhitelistedForMap('VARSIKURNIAWAN@GMAIL.COM', { enabled: true }), true);
  assert.equal(isEmailWhitelistedForMap('public.user@gmail.com', { enabled: true }), false);
  assert.equal(isEmailWhitelistedForMap('', { enabled: true }), false);
  assert.equal(isEmailWhitelistedForMap(null, { enabled: true }), false);
  // Flag off -> opens to everyone
  assert.equal(isEmailWhitelistedForMap('public.user@gmail.com', { enabled: false }), true);
});

test('tempMapWhitelistGuard blocks authenticated non-whitelisted users with HTTP 403 and allows whitelisted users', async () => {
  const guardNonWhitelisted = createTempMapWhitelistGuard({
    enabled: true,
    getToken: () => 'tok-1',
    verifySession: async () => ({ userId: 'u-other', email: 'other@gmail.com' }),
  });
  let nextCalled = false;
  const res1 = makeRes();
  await guardNonWhitelisted({ originalUrl: '/api/map/users' }, res1, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res1.out.statusCode, 403);
  assert.equal(res1.out.body?.code, 'MAP_WHITELIST_REQUIRED');

  const guardWhitelisted = createTempMapWhitelistGuard({
    enabled: true,
    getToken: () => 'tok-2',
    verifySession: async () => ({ userId: 'u-varsi', email: 'varsikurniawan@gmail.com' }),
  });
  let allowedNext = false;
  const res2 = makeRes();
  await guardWhitelisted({ originalUrl: '/api/map/users' }, res2, () => {
    allowedNext = true;
  });
  assert.equal(allowedNext, true);
  assert.equal(res2.out.statusCode, 200);
});

test('tempMapWhitelistGuard preserves downstream 401 for unauthenticated /map/* and blocks optionalAuth broadcast view', async () => {
  const guardAnon = createTempMapWhitelistGuard({
    enabled: true,
    getToken: () => null,
    verifySession: async () => null,
  });

  let passedToRequireAuth = false;
  const resMap = makeRes();
  await guardAnon({ originalUrl: '/api/map/reels' }, resMap, () => {
    passedToRequireAuth = true;
  });
  assert.equal(passedToRequireAuth, true);

  let passedBroadcastView = false;
  const resBcast = makeRes();
  await guardAnon({ originalUrl: '/api/broadcast/abc/view' }, resBcast, () => {
    passedBroadcastView = true;
  });
  assert.equal(passedBroadcastView, false);
  assert.equal(resBcast.out.statusCode, 403);
});

test('routes/index.js mounts tempMapWhitelistGuard only on Map-scoped paths (leaving auth/events/geocoding untouched)', () => {
  const routesSrc = fs.readFileSync(path.resolve('backend/routes/index.js'), 'utf8');
  assert.match(routesSrc, /temp_map_whitelist\/requireMapWhitelist\.js/);
  assert.match(routesSrc, /router\.use\(TEMP_MAP_GUARDED_PATHS,\s*tempMapWhitelistGuard\)/);
  assert.ok(TEMP_MAP_GUARDED_PATHS.includes('/map'));
  assert.ok(TEMP_MAP_GUARDED_PATHS.includes('/mini-events'));
  assert.ok(TEMP_MAP_GUARDED_PATHS.includes('/broadcast'));
  assert.ok(!TEMP_MAP_GUARDED_PATHS.includes('/location/reverse'));
  assert.ok(!TEMP_MAP_GUARDED_PATHS.includes('/location/cities'));
  assert.ok(!TEMP_MAP_GUARDED_PATHS.includes('/users/me'));
});

