import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import '../api/env.js';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/telemetryController.js';
import { sendPersonalChatMessage } from '../controllers/personalChat/chatMessageSender.js';
import { getPersonalChatMessages } from '../controllers/personalChat/chatMessageQuery.js';
import { getPersonalChatInboxSummary } from '../controllers/personalChat/chatInboxController.js';
import { sendCallSignal, getCallSignals } from '../controllers/personalChat/callSignalController.js';
import {
  requestMiniEventCollab,
  getMiniEventCollabRequests,
} from '../controllers/miniEvent/eventCollabHandlers.js';
import {
  hydrateEventCollabSummary,
  listEnrichedCollabRequests,
} from '../controllers/miniEvent/eventCollabStore.js';
import {
  getConversationHash,
  packEnvelope,
  getChatRtcSignalKey,
} from '../controllers/personalChat/chatConstants.js';
import {
  buildVisibleMapUsers,
  buildVisibleEvents,
} from '../../frontend/components/map/mapPage/mapEntitiesProjection.js';
import { installInMemorySocialHarness } from './helpers/inMemorySocialHarness.mjs';

describe('Block Invariant, Auto-Kick, and Envelope Request Suppression Suite', () => {
  const userA_Id = `test_user_a_${Date.now()}`;
  const userB_Id = `test_user_b_${Date.now()}`;
  const mockEventId = `ev_test_${Date.now()}`;
  let harness = null;

  before(() => {
    harness = installInMemorySocialHarness();
  });

  // Helper to create mock req/res
  function createMockReqRes({ user, params = {}, query = {}, body = {} }) {
    const req = { user, params, query, body, _payloadInspected: true };
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return { req, res };
  }

  after(() => {
    harness?.restore();
    harness = null;
  });

  describe('1. Block & Unblock Telemetry Operations', () => {
    it('blocks target user, populates dual redis sets, and purges RTC signaling keys', async () => {
      // Seed an ephemeral RTC signal between the users
      await redis.lpush(getChatRtcSignalKey(userA_Id, userB_Id), JSON.stringify({ type: 'candidate', sdp: 'test' }));

      const { req, res } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
      });

      let nextErr = null;
      await blockUser(req, res, (err) => { nextErr = err; });
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body?.ok, true);
      assert.equal(res.body?.blockedUserId, userB_Id);

      // Verify Redis sets
      const isBlocked = await redis.sismember(`blocked:${userA_Id}`, userB_Id);
      const isBlockedBy = await redis.sismember(`blocked_by:${userB_Id}`, userA_Id);
      assert.equal(Number(isBlocked), 1, 'userB must be in userA blocked set');
      assert.equal(Number(isBlockedBy), 1, 'userA must be in userB blocked_by set');

      // Verify RTC key was purged
      const remainingRtc = await redis.lrange(getChatRtcSignalKey(userA_Id, userB_Id), 0, -1);
      assert.equal(remainingRtc.length, 0, 'RTC signals between users must be purged on block');
    });

    it('getBlockedUsers returns correct dual lists for blocker and blocked user', async () => {
      // For User A (the blocker)
      const { req: reqA, res: resA } = createMockReqRes({ user: { userId: userA_Id } });
      await getBlockedUsers(reqA, resA, () => {});
      assert.ok(resA.body.blockedUsers.includes(userB_Id), 'User A must see User B in blockedUsers');
      assert.equal(resA.body.blockedByUsers.includes(userB_Id), false);

      // For User B (the blocked user)
      const { req: reqB, res: resB } = createMockReqRes({ user: { userId: userB_Id } });
      await getBlockedUsers(reqB, resB, () => {});
      assert.ok(resB.body.blockedByUsers.includes(userA_Id), 'User B must see User A in blockedByUsers');
      assert.equal(resB.body.blockedUsers.includes(userA_Id), false);
    });
  });

  describe('2. Chat Message Block Invariant (Picture 2 Defect Defense)', () => {
    it('rejects blocker sending message to blocked target while keeping target blocked', async () => {
      const { req, res } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
        body: {
          ciphertext: 'mock_encrypted_payload',
          iv: '0123456789abcdef01234567',
          sig: 'mock_signature',
          nonce: `nonce_${Date.now()}_1`,
          ts: Date.now(),
        },
      });

      await sendPersonalChatMessage(req, res, () => {});
      assert.equal(res.statusCode, 403, 'Blocker must be rejected with 403 when trying to send to blocked target');
    });

    it('when blocked user sends a message, marks status as blocked_drop and NEVER writes to hotKey ring buffer', async () => {
      const convHash = getConversationHash(userB_Id, userA_Id);
      const hotKey = `chat:conv:${convHash}`;

      const { req, res } = createMockReqRes({
        user: { userId: userB_Id },
        params: { targetId: userA_Id },
        body: {
          id: `msg_blocked_${Date.now()}`,
          ciphertext: 'mock_encrypted_woi_lagi_apa',
          iv: '0123456789abcdef01234567',
          sig: 'mock_signature',
          nonce: `nonce_${Date.now()}_2`,
          ts: Date.now(),
        },
      });

      await sendPersonalChatMessage(req, res, () => {});
      assert.equal(res.statusCode, 201);

      // Hot ring buffer MUST remain empty for the recipient!
      const hotList = await redis.lrange(hotKey, 0, -1);
      assert.equal(hotList.length, 0, 'Blocked message must NEVER be pushed into shared hotKey ring buffer');

      // Unread counter must NOT be incremented for blocker
      const unreadCount = await redis.hget(`chat:unread:${userA_Id}`, userB_Id);
      assert.equal(unreadCount, null, 'Blocker unread counter must NOT be incremented');
    });

    it('when blocker queries messages, blocked_drop messages are NEVER returned and never marked as read', async () => {
      const convHash = getConversationHash(userA_Id, userB_Id);
      const hotKey = `chat:conv:${convHash}`;

      // Simulate a synthetic blocked message that was saved
      const blockedEnvelope = {
        id: `msg_test_drop_${Date.now()}`,
        senderId: userB_Id,
        recipientId: userA_Id,
        ciphertext: 'cipher_test',
        iv: '0123456789abcdef01234567',
        sig: 'sig_test',
        nonce: `nonce_test_${Date.now()}`,
        status: 'blocked_drop',
        ts: Date.now(),
      };
      // Even if it was somehow in hotKey:
      await redis.lpush(hotKey, packEnvelope(blockedEnvelope));

      const { req, res } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
        query: { sinceTs: 0 },
      });

      await getPersonalChatMessages(req, res, () => {});
      assert.equal(res.statusCode, 200);

      // The message must NOT be in the returned list
      const returnedMessages = res.body?.messages || [];
      const foundBlocked = returnedMessages.find((m) => m.id === blockedEnvelope.id);
      assert.equal(foundBlocked, undefined, 'Blocker query must NEVER return messages with status="blocked_drop"');

      // Clean up hotKey
      await redis.del(hotKey);
    });
  });

  describe('3. Auto-Kick from Blocker Events & Media Preservation', () => {
    it('automatically kicks blocked user from accepted collaborators and pending requests on active events', async () => {
      // Simulate User A has an active event where User B was an accepted collaborator
      const acceptedKey = `mini_event:collab:accepted:${mockEventId}`;
      const requestsKey = `mini_event:collab:requests:${mockEventId}`;
      const userReqKey = `mini_event:collab:user_request:${userB_Id}`;

      // Stub event in Redis & mock Prisma if needed
      await redis.sadd(acceptedKey, userB_Id);
      await redis.set(requestsKey, JSON.stringify([{ id: 'req_b', userId: userB_Id, eventId: mockEventId }]));
      await redis.set(userReqKey, JSON.stringify({ eventId: mockEventId, requestId: 'req_b' }));

      // Mock prisma.miniEvent.findMany and update in-memory
      const origFindMany = prisma?.miniEvent?.findMany;
      const origUpdate = prisma?.miniEvent?.update;
      if (prisma?.miniEvent) {
        prisma.miniEvent.findMany = async () => [
          {
            id: mockEventId,
            creatorId: userA_Id,
            description: `[CAT:cafe] [COLLABS:${userB_Id}] Fun event`,
            isActive: true,
          },
        ];
        prisma.miniEvent.update = async ({ data }) => {
          assert.ok(!data.description.includes(userB_Id), 'User B must be removed from [COLLABS:...] tag in DB');
          return { id: mockEventId, ...data };
        };
      }

      try {
        // Trigger blockUser
        const { req, res } = createMockReqRes({
          user: { userId: userA_Id },
          params: { targetId: userB_Id },
        });
        await blockUser(req, res, () => {});

        // Assert User B was removed from accepted set
        const isAccepted = await redis.sismember(acceptedKey, userB_Id);
        assert.equal(Number(isAccepted), 0, 'User B must be removed from accepted collaborators in Redis');

        // Assert User B was removed from pending requests
        const remainingReqs = await redis.get(requestsKey);
        const parsedRemaining = remainingReqs ? JSON.parse(remainingReqs) : [];
        assert.equal(parsedRemaining.length, 0, 'User B must be removed from pending requests');

        // Assert user_request key was cleared
        const remainingUserReq = await redis.get(userReqKey);
        assert.equal(remainingUserReq, null, 'User request pointer for User B must be cleared');
      } finally {
        if (prisma?.miniEvent) {
          prisma.miniEvent.findMany = origFindMany;
          prisma.miniEvent.update = origUpdate;
        }
      }
    });
  });

  describe('4. Envelope Request Suppression', () => {
    it('suppresses requests from blocked user so they NEVER appear in creator Envelope Request', async () => {
      // Mock event in Prisma
      const origFindFirst = prisma?.miniEvent?.findFirst;
      if (prisma?.miniEvent) {
        prisma.miniEvent.findFirst = async () => ({
          id: mockEventId,
          creatorId: userA_Id,
          title: 'Morning Coffee Ride',
          description: '[CAT:cafe] Plain description',
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000),
        });
      }

      try {
        const { req, res } = createMockReqRes({
          user: { userId: userB_Id },
          params: { id: mockEventId },
        });

        await requestMiniEventCollab(req, res, () => {});
        assert.equal(res.statusCode, 201);
        assert.equal(res.body?.requestedEventId, mockEventId);

        // Verify creator's event requests list in Redis has ZERO requests!
        const eventRequests = await redis.get(`mini_event:collab:requests:${mockEventId}`);
        assert.equal(eventRequests, null, 'Creator event requests list must NOT contain request from blocked user');

        // Verify creator's notification inbox has ZERO notifications!
        const creatorNotifs = await redis.lrange(`notif:events:${userA_Id}`, 0, -1);
        assert.equal(creatorNotifs.length, 0, 'Creator event notifications list must NOT receive request from blocked user');

        // Verify hydrateEventCollabSummary reports pendingRequestsCount: 0
        const summary = await hydrateEventCollabSummary({ id: mockEventId, creatorId: userA_Id });
        assert.equal(summary.pendingRequestsCount, 0, 'Envelope icon count must remain 0 for creator');

        // Verify listEnrichedCollabRequests returns empty array for creator
        const enriched = await listEnrichedCollabRequests(mockEventId);
        assert.equal(enriched.length, 0, 'listEnrichedCollabRequests must return empty array for creator');
      } finally {
        if (prisma?.miniEvent) {
          prisma.miniEvent.findFirst = origFindFirst;
        }
      }
    });

    it('chatInboxController filters out any residual notifications from blocked users', async () => {
      // Seed a synthetic event notification from User B in User A's inbox
      const notifFromB = {
        type: 'collab_request',
        eventId: mockEventId,
        user: { id: userB_Id, name: 'User B' },
      };
      await redis.lpush(`notif:events:${userA_Id}`, JSON.stringify(notifFromB));

      const { req, res } = createMockReqRes({ user: { userId: userA_Id } });
      await getPersonalChatInboxSummary(req, res, () => {});

      const returnedNotifs = res.body?.eventNotifications || [];
      const hasNotifFromB = returnedNotifs.some((n) => n.user?.id === userB_Id);
      assert.equal(hasNotifFromB, false, 'Inbox must filter out notifications from blocked users');
    });
  });

  describe('5. Blocked User Perspective Projection Invariants (Picture 3)', () => {
    it('buildVisibleMapUsers excludes blocker from map for the blocked user', () => {
      const mapUsers = [
        { id: 'regular_user', name: 'Regular', isOnline: true, allowLiveLocation: true, lat: -6.2, lng: 106.8 },
        { id: userA_Id, name: 'Blocker User A', isOnline: true, allowLiveLocation: true, lat: -6.2, lng: 106.8 },
      ];
      const visible = buildVisibleMapUsers(
        {
          mapUsersData: mapUsers,
          blockedUserIds: [],
          blockedByUserIds: [userA_Id], // User A blocked me
        },
        {
          hasValidCoordinates: (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng),
          resolvePersistentAvatarUrl: () => '/avatar.png',
        }
      );

      assert.equal(visible.length, 1);
      assert.equal(visible[0].id, 'regular_user');
      assert.ok(!visible.some((u) => u.id === userA_Id), 'Blocker must NEVER appear on blocked user map projection');
    });

    it('buildVisibleEvents excludes events created by blocker from blocked user map', () => {
      const now = Date.now();
      const events = [
        { id: 'ev1', title: 'Open Event', creator: { id: 'regular_user' }, expiresAt: now + 50000 },
        { id: 'ev2', title: 'Blocker Event', creator: { id: userA_Id }, expiresAt: now + 50000 },
      ];

      const visible = buildVisibleEvents(events, [], [userA_Id], now);
      assert.equal(visible.length, 1);
      assert.equal(visible[0].id, 'ev1');
      assert.ok(!visible.some((e) => e.creator.id === userA_Id), 'Blocker events must NEVER appear on blocked user map');
    });
  });

  describe('6. Unblock Restoration', () => {
    it('unblocks target user and removes from dual redis sets', async () => {
      const { req, res } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
      });

      await unblockUser(req, res, () => {});
      assert.equal(res.statusCode, 200);
      assert.equal(res.body?.unblockedUserId, userB_Id);

      const isBlocked = await redis.sismember(`blocked:${userA_Id}`, userB_Id);
      const isBlockedBy = await redis.sismember(`blocked_by:${userB_Id}`, userA_Id);
      assert.equal(Number(isBlocked), 0);
      assert.equal(Number(isBlockedBy), 0);
    });
  });

  describe('7. Post-Unblock Message Invariant (Messages Sent During Block NEVER Delivered)', () => {
    const blockedMsgId = `msg_drop_while_blocked_${Date.now()}`;
    const afterUnblockMsgId = `msg_after_unblock_${Date.now()}`;

    it('messages sent while blocked are permanently dropped for the blocker, even after unblocking', async () => {
      // 1. Re-block User B so we have an active block state
      const { req: blockReq, res: blockRes } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
      });
      await blockUser(blockReq, blockRes, () => {});
      assert.equal(blockRes.statusCode, 200);

      // 2. User B sends message while blocked
      const { req: sendReq, res: sendRes } = createMockReqRes({
        user: { userId: userB_Id },
        params: { targetId: userA_Id },
        body: {
          id: blockedMsgId,
          ciphertext: 'secret_message_sent_while_blocked',
          iv: '0123456789abcdef01234567',
          sig: 'mock_sig',
          nonce: `nonce_blocked_${Date.now()}`,
          ts: Date.now(),
        },
      });
      await sendPersonalChatMessage(sendReq, sendRes, () => {});
      assert.equal(sendRes.statusCode, 201);
      assert.equal(sendRes.body?.envelope?.isBlockedDrop, true);
      assert.equal(sendRes.body?.envelope?.blockedWhileSent, true);

      // 3. User A UNBLOCKS User B
      const { req: unblockReq, res: unblockRes } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
      });
      await unblockUser(unblockReq, unblockRes, () => {});
      assert.equal(unblockRes.statusCode, 200);

      // Verify Redis sets confirm User B is now 100% UNBLOCKED
      const isBlocked = await redis.sismember(`blocked:${userA_Id}`, userB_Id);
      assert.equal(Number(isBlocked), 0, 'User B is no longer blocked');

      // 4. User A queries messages: the message sent during the block must NEVER be delivered!
      const { req: queryReq, res: queryRes } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
        query: { sinceTs: 0 },
      });
      await getPersonalChatMessages(queryReq, queryRes, () => {});
      assert.equal(queryRes.statusCode, 200);

      const returnedMsgs = queryRes.body?.messages || [];
      const foundBlockedMsg = returnedMsgs.find((m) => m.id === blockedMsgId);
      assert.equal(
        foundBlockedMsg,
        undefined,
        'CRITICAL: Message sent during block must NEVER be delivered to recipient, even after unblocking!'
      );

      // 5. User B sends a NEW message AFTER being unblocked
      const { req: newReq, res: newRes } = createMockReqRes({
        user: { userId: userB_Id },
        params: { targetId: userA_Id },
        body: {
          id: afterUnblockMsgId,
          ciphertext: 'legitimate_message_after_unblock',
          iv: '0123456789abcdef01234567',
          sig: 'mock_sig_2',
          nonce: `nonce_after_${Date.now()}`,
          ts: Date.now(),
        },
      });
      await sendPersonalChatMessage(newReq, newRes, () => {});
      assert.equal(newRes.statusCode, 201);
      assert.equal(newRes.body?.envelope?.isBlockedDrop, false);

      // 6. User A queries messages again: only the post-unblock message is delivered!
      const { req: queryReq2, res: queryRes2 } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
        query: { sinceTs: 0 },
      });
      await getPersonalChatMessages(queryReq2, queryRes2, () => {});
      assert.equal(queryRes2.statusCode, 200);

      const msgsAfter = queryRes2.body?.messages || [];
      assert.ok(msgsAfter.some((m) => m.id === afterUnblockMsgId), 'New message sent after unblock MUST be delivered');
      assert.equal(
        msgsAfter.some((m) => m.id === blockedMsgId),
        false,
        'Old message sent during block must STILL be dropped'
      );
    });
  });

  describe('8. Call Invariant While Blocked ("call udh pasti selalu calling....")', () => {
    it('enforces Friends-only (403) for strangers AND silent isBlockedDrop (200) for blocked friends without delivering signals', async () => {
      // 0. Non-friend attempting to call MUST be rejected with 403 Friends-only
      const { req: strangerCallReq, res: strangerCallRes } = createMockReqRes({
        user: { userId: userB_Id },
        params: { targetId: userA_Id },
        body: {
          callId: `call_stranger_${Date.now()}`,
          callMode: 'video',
          signalType: 'offer',
          encryptedPayload: 'mock_sdp_offer',
          nonce: `nonce_stranger_${Date.now()}`,
        },
      });
      await sendCallSignal(strangerCallReq, strangerCallRes, () => {});
      assert.equal(strangerCallRes.statusCode, 403, 'Non-friend call offer must be rejected with 403');

      // Establish mutual friendship before testing the blocked-friend silent-drop invariant
      harness.db.user_friends.add(`${userA_Id}|${userB_Id}`);
      harness.db.user_friends.add(`${userB_Id}|${userA_Id}`);

      // Re-block User B
      const { req: blockReq, res: blockRes } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
      });
      await blockUser(blockReq, blockRes, () => {});

      // User B (blocked friend) attempts to call User A -> 200 isBlockedDrop (stealth drop)
      const { req: callReq, res: callRes } = createMockReqRes({
        user: { userId: userB_Id },
        params: { targetId: userA_Id },
        body: {
          callId: `call_test_${Date.now()}`,
          callMode: 'video',
          signalType: 'offer',
          encryptedPayload: 'mock_sdp_offer',
          nonce: `nonce_call_${Date.now()}`,
        },
      });
      await sendCallSignal(callReq, callRes, () => {});
      assert.equal(callRes.statusCode, 200);
      assert.equal(callRes.body?.ok, true);
      assert.equal(callRes.body?.isBlockedDrop, true, 'Call must be marked isBlockedDrop');

      // User A polls for incoming call signals: must be 0 signals!
      const { req: sigReq, res: sigRes } = createMockReqRes({ user: { userId: userA_Id } });
      await getCallSignals(sigReq, sigRes, () => {});
      assert.equal(sigRes.statusCode, 200);
      assert.equal(sigRes.body?.signals?.length || 0, 0, 'Target must NEVER receive call signal from blocked user');

      // User A (the blocker) cannot initiate a call to blocked target
      const { req: blockerCallReq, res: blockerCallRes } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
        body: {
          callId: `call_test_blocker_${Date.now()}`,
          callMode: 'voice',
          signalType: 'offer',
          encryptedPayload: 'mock_sdp_offer',
          nonce: `nonce_call_blocker_${Date.now()}`,
        },
      });
      await sendCallSignal(blockerCallReq, blockerCallRes, () => {});
      assert.equal(blockerCallRes.statusCode, 403, 'Blocker must be rejected with 403 when trying to call blocked target');

      // Unblock after test
      const { req: unblockReq, res: unblockRes } = createMockReqRes({
        user: { userId: userA_Id },
        params: { targetId: userB_Id },
      });
      await unblockUser(unblockReq, unblockRes, () => {});
    });
  });
});

