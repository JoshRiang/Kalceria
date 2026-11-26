import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  TEMP_MAP_WHITELIST_EMAILS,
  extractUserEmail,
  isEmailWhitelistedForMap,
  canUserAccessMap,
} from '../temp_map_whitelist/mapWhitelistConfig.js';

test('Frontend temp_map_whitelist config allows ONLY the 2 whitelisted emails when logged in', () => {
  assert.deepEqual([...TEMP_MAP_WHITELIST_EMAILS], [
    'reinathanezhekiel1@gmail.com',
    'varsikurniawan@gmail.com',
  ]);

  // Logged-out visitors -> blocked (Coming Soon)
  assert.equal(canUserAccessMap({ isLoggedIn: false, user: null }, { enabled: true }), false);
  assert.equal(
    canUserAccessMap({ isLoggedIn: false, user: { email: 'reinathanezhekiel1@gmail.com' } }, { enabled: true }),
    false
  );

  // Logged-in non-whitelisted user -> blocked (Coming Soon)
  assert.equal(
    canUserAccessMap({ isLoggedIn: true, user: { email: 'someoneelse@gmail.com' } }, { enabled: true }),
    false
  );

  // Whitelisted accounts (including uppercase, whitespace, and nested login response shape) -> allowed
  assert.equal(
    canUserAccessMap({ isLoggedIn: true, user: { email: 'reinathanezhekiel1@gmail.com' } }, { enabled: true }),
    true
  );
  assert.equal(
    canUserAccessMap({ isLoggedIn: true, user: { email: '  VarsiKurniawan@Gmail.com ' } }, { enabled: true }),
    true
  );
  assert.equal(
    canUserAccessMap(
      { isLoggedIn: true, user: { user: { email: 'reinathanezhekiel1@gmail.com' } } },
      { enabled: true }
    ),
    true
  );
  assert.equal(extractUserEmail({ user: { email: 'VarsiKurniawan@gmail.com' } }), 'varsikurniawan@gmail.com');

  // Flag disabled -> everyone allowed
  assert.equal(isEmailWhitelistedForMap('anyone@example.com', { enabled: false }), true);
  assert.equal(canUserAccessMap({ isLoggedIn: false, user: null }, { enabled: false }), true);
});

test('Landing ClosingUsersMapSection shows COMING SOON for non-whitelisted/guests and FIND THE OTHERS for whitelisted users', () => {
  const sectionSrc = fs.readFileSync(
    path.resolve('frontend/components/landing/closing/ClosingUsersMapSection.jsx'),
    'utf8'
  );
  assert.match(sectionSrc, /@\/temp_map_whitelist\/useMapWhitelistAccess/);
  assert.match(sectionSrc, /COMING SOON/);
  assert.match(sectionSrc, /FIND THE OTHERS/);

  const mapPageSrc = fs.readFileSync(path.resolve('frontend/app/map/page.jsx'), 'utf8');
  assert.match(mapPageSrc, /@\/temp_map_whitelist\/TempMapAccessGate/);
  assert.match(mapPageSrc, /<TempMapAccessGate>/);
});

