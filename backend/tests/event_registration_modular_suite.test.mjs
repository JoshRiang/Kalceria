import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import {
  WA_ADMIN,
  THREE_MINUTES_MS,
  EMAIL_REGEX,
} from '../controllers/eventRegistration/eventRegistrationConstants.js';
import {
  getGuestPlaceholderHash,
  resolveEventRegistrant,
} from '../controllers/eventRegistration/eventRegistrantResolver.js';
import { verifyEventRegistrationAuthorization } from '../controllers/eventRegistration/eventRegistrationAuth.js';
import * as eventRegistrationFacade from '../controllers/eventRegistrationController.js';

test('EventRegistrationConstants: exports expected constants and regex', () => {
  assert.equal(WA_ADMIN, '628117998790');
  assert.equal(THREE_MINUTES_MS, 180000);
  assert.equal(EMAIL_REGEX.test('racer@kalceria.id'), true);
  assert.equal(EMAIL_REGEX.test('invalid-email'), false);
});

test('EventRegistrantResolver: validates guest input and missing identity in-memory', async () => {
  const hash = await getGuestPlaceholderHash();
  assert.ok(hash && typeof hash === 'string');

  // Missing identity returns error
  const emptyRes = await resolveEventRegistrant({ body: {}, user: null });
  assert.equal(emptyRes.error, 'MISSING_IDENTITY');

  // Invalid guest parameters returns error
  const invalidGuestRes = await resolveEventRegistrant({
    body: { name: '', email: 'not-an-email', contact: '123' },
    user: null,
  });
  assert.equal(invalidGuestRes.error, 'GUEST_INVALID');

  // Authenticated user fallback
  const authRes = await resolveEventRegistrant({
    body: {},
    user: { userId: 'auth_user_123' },
  });
  assert.equal(authRes.userId, 'auth_user_123');
});

test('EventRegistrationAuth: verifyEventRegistrationAuthorization checks session, token, and guest rules', () => {
  const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
  const validToken = jwt.sign(
    { registrationId: 'reg_abc123' },
    cancelSecret,
    { algorithm: 'HS256', issuer: 'kalceria-api', expiresIn: '3m' }
  );

  const mockReg = {
    id: 'reg_abc123',
    userId: 'user_racer_1',
    createdAt: new Date(),
    user: { email: 'racer@kalceria.id' },
  };

  // 1. Authorized by matching user session
  assert.equal(
    verifyEventRegistrationAuthorization(mockReg, {
      user: { userId: 'user_racer_1' },
      get: () => null,
      query: {},
    }),
    true
  );

  // 2. Rejected when user session does not match
  assert.equal(
    verifyEventRegistrationAuthorization(mockReg, {
      user: { userId: 'unauthorized_intruder' },
      get: () => null,
      query: {},
    }),
    false
  );

  // 3. Authorized by valid token in header (x-manage-token or x-cancel-token)
  assert.equal(
    verifyEventRegistrationAuthorization(mockReg, {
      user: null,
      get: (header) => (header === 'x-cancel-token' ? validToken : null),
      query: {},
    }),
    true
  );

  // 4. Authorized by valid token in query param
  assert.equal(
    verifyEventRegistrationAuthorization(mockReg, {
      user: null,
      get: () => null,
      query: { token: validToken },
    }),
    true
  );

  // 5. Authorized for recent PENDING registration within 3 minutes
  const recentGuestReg = {
    id: 'reg_guest_1',
    userId: 'guest_user_1',
    paymentStatus: 'PENDING',
    createdAt: new Date(),
    user: { email: 'guest-123@guest.kalceria.local' },
  };
  assert.equal(
    verifyEventRegistrationAuthorization(recentGuestReg, {
      user: null,
      get: () => null,
      query: {},
    }),
    true
  );

  // 5b. Rejected once registration is CONFIRMED (even within 3 minutes) without session or token
  assert.equal(
    verifyEventRegistrationAuthorization(
      { ...recentGuestReg, paymentStatus: 'CONFIRMED' },
      { user: null, get: () => null, query: {} }
    ),
    false
  );

  // 6. Rejected for expired PENDING registration (> 3 minutes)
  const expiredGuestReg = {
    id: 'reg_guest_2',
    userId: 'guest_user_2',
    paymentStatus: 'PENDING',
    createdAt: new Date(Date.now() - 4 * 60 * 1000),
    user: { email: 'guest-456@guest.kalceria.local' },
  };
  assert.equal(
    verifyEventRegistrationAuthorization(expiredGuestReg, {
      user: null,
      get: () => null,
      query: {},
    }),
    false
  );
});

test('EventRegistrationFacade: re-exports all required functions identically (IL-9)', () => {
  assert.equal(typeof eventRegistrationFacade.buildEventRegistrationWaMessage, 'function');
  assert.equal(typeof eventRegistrationFacade.registerEvent, 'function');
  assert.equal(typeof eventRegistrationFacade.listPublicEvents, 'function');
  assert.equal(typeof eventRegistrationFacade.getPublicEvent, 'function');
  assert.equal(typeof eventRegistrationFacade.listRegistrations, 'function');
  assert.equal(typeof eventRegistrationFacade.confirmRegistrationPayment, 'function');
  assert.equal(typeof eventRegistrationFacade.deleteRegistration, 'function');
  assert.equal(typeof eventRegistrationFacade.markPdfExported, 'function');
  assert.equal(typeof eventRegistrationFacade.getEventRegistrationForManage, 'function');
  assert.equal(typeof eventRegistrationFacade.confirmEventRegistration, 'function');
  assert.equal(typeof eventRegistrationFacade.deleteOwnEventRegistration, 'function');
  assert.equal(typeof eventRegistrationFacade.purgeExpiredUnconfirmedEventRegistrations, 'function');
});

test.after(() => {
  setTimeout(() => process.exit(0), 50);
});

