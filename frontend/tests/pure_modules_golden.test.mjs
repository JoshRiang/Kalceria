/**
 * frontend/tests/pure_modules_golden.test.mjs
 *
 * Kalceria Golden-Master Test Suite for Wave 1 Pure Modules (Gate 3b)
 * Covers all 10 pure modules across 50+ deterministic in-memory fixtures.
 * Zero database, zero Redis, zero network side-effects.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Chat Pure Modules
import { groupMessages } from '../components/map/chat/hooks/personalChat/groupMessages.js';
import {
  buildMessageCopyText,
  buildSelectedMessagesCopyText,
  copyTextToClipboard,
} from '../components/map/chat/hooks/personalChat/clipboardText.js';
import {
  buildReplyPayload,
  buildReplyDraft,
} from '../components/map/chat/hooks/personalChat/replyPayload.js';
import {
  applyPeerReadReceipt,
  filterDeletedMessages,
  filterInFlightOrFailed,
  updateMessageStatusById,
} from '../components/map/chat/hooks/personalChat/messageStatusUpdaters.js';
import { buildMergedRemoteMessages } from '../components/map/chat/hooks/personalChat/mergeRemoteMessages.js';

// Map Pure Modules
import {
  buildVisibleMapUsers,
  buildVisibleEvents,
} from '../components/map/mapPage/mapEntitiesProjection.js';
import {
  isExcludedKalcerianUser,
  buildSidebarKalcerians,
} from '../components/map/mapPage/sidebarKalceriansProjection.js';
import {
  stripEventTags,
  parseEventDesc,
  encodeEventDesc,
} from '../components/map/mapPage/eventDescCodec.js';
import {
  buildMediaItemsPayload,
  buildMiniEventPayload,
} from '../components/map/mapPage/miniEventPayload.js';
import {
  patchUserCollection,
  patchEventCollectionForUser,
  buildSyncedProfilePatch,
} from '../components/map/mapPage/profilePatch.js';

// Deterministic test stubs
import {
  stubToSmartTitleCase,
  stubHasValidCoordinates,
  stubResolvePersistentAvatarUrl,
  stubFormatVoiceDuration,
  stubGetChatTimeLabel,
} from '../../scripts/audit/golden/stubs.mjs';

describe('Wave 1 Pure Modules Golden Master Verification (Gate 3b)', () => {
  // ==========================================
  // 1. groupMessages
  // ==========================================
  describe('Module 1: groupMessages.js', () => {
    it('1.1. groups messages by day divider when timestamp day changes', () => {
      const msgs = [
        { id: 'm1', ts: 1700000000000, text: 'Hello' },
        { id: 'm2', ts: 1700000005000, text: 'How are you' },
        { id: 'm3', ts: 1700100000000, text: 'Next day message' },
      ];
      const result = groupMessages(msgs, '', stubGetChatTimeLabel);
      const dividers = result.filter((r) => r.type === 'date_divider');
      assert.equal(dividers.length, 2);
      assert.equal(result.filter((r) => r.type === 'message').length, 3);
    });

    it('1.2. filters messages case-insensitively when search query is present', () => {
      const msgs = [
        { id: 'm1', ts: 1700000000000, text: 'Need coffee' },
        { id: 'm2', ts: 1700000005000, text: 'Looking for CAR meet' },
        { id: 'm3', ts: 1700000010000, text: 'Nice car bro' },
      ];
      const result = groupMessages(msgs, 'car', stubGetChatTimeLabel);
      const msgItems = result.filter((r) => r.type === 'message');
      assert.equal(msgItems.length, 2);
      assert.equal(msgItems[0].id, 'm2');
      assert.equal(msgItems[1].id, 'm3');
    });

    it('1.3. returns empty list if search query yields no matches', () => {
      const msgs = [{ id: 'm1', ts: 1700000000000, text: 'Kalceria map' }];
      const result = groupMessages(msgs, 'unmatched_token_xyz', stubGetChatTimeLabel);
      assert.equal(result.length, 0);
    });

    it('1.4. handles empty messages array without throwing', () => {
      const result = groupMessages([], '', stubGetChatTimeLabel);
      assert.deepEqual(result, []);
    });

    it('1.5. handles null or undefined messages safely', () => {
      assert.deepEqual(groupMessages(null), []);
      assert.deepEqual(groupMessages(undefined), []);
    });
  });

  // ==========================================
  // 2. clipboardText
  // ==========================================
  describe('Module 2: clipboardText.js', () => {
    it('2.1. extracts plain text message', () => {
      const msg = { text: 'Meet at Bintaro', msgType: 'text' };
      assert.equal(buildMessageCopyText(msg, stubFormatVoiceDuration), 'Meet at Bintaro');
    });

    it('2.2. extracts voice note message with formatted duration', () => {
      const msg = { msgType: 'voice', voiceDuration: 125 };
      assert.equal(buildMessageCopyText(msg, stubFormatVoiceDuration), 'Voice message 2:05');
    });

    it('2.3. extracts call log message', () => {
      const msg = { msgType: 'call', text: 'Missed video call' };
      assert.equal(buildMessageCopyText(msg, stubFormatVoiceDuration), 'Missed video call');
    });

    it('2.4. extracts mediaUrl when text is missing', () => {
      const msg = { msgType: 'media', mediaUrl: 'https://blob.kalceria.id/photo.jpg' };
      assert.equal(
        buildMessageCopyText(msg, stubFormatVoiceDuration),
        'https://blob.kalceria.id/photo.jpg'
      );
    });

    it('2.5. joins multiple selected messages with newline', () => {
      const msgs = [
        { id: '1', text: 'Line 1' },
        { id: '2', text: 'Line 2' },
        { id: '3', text: 'Line 3' },
      ];
      const joined = buildSelectedMessagesCopyText(msgs, ['1', '3'], stubFormatVoiceDuration);
      assert.equal(joined, 'Line 1\nLine 3');
    });

    it('2.6. copyTextToClipboard invokes clipboard writeText when available', () => {
      let written = null;
      const fakeNav = {
        clipboard: {
          writeText: async (t) => {
            written = t;
          },
        },
      };
      copyTextToClipboard('Test clipboard text', { navigator: fakeNav });
      assert.equal(written, 'Test clipboard text');
    });

    it('2.7. copyTextToClipboard falls back to DOM textarea when clipboard API fails', () => {
      let appendedTag = null;
      let execCmd = null;
      const fakeDoc = {
        createElement: (tag) => {
          appendedTag = tag;
          return { style: {}, select: () => {} };
        },
        body: {
          appendChild: () => {},
          removeChild: () => {},
        },
        execCommand: (cmd) => {
          execCmd = cmd;
        },
      };
      copyTextToClipboard('Fallback text', { navigator: null, document: fakeDoc });
      assert.equal(appendedTag, 'textarea');
      assert.equal(execCmd, 'copy');
    });
  });

  // ==========================================
  // 3. replyPayload
  // ==========================================
  describe('Module 3: replyPayload.js', () => {
    it('3.1. returns null for falsy input', () => {
      assert.equal(buildReplyPayload(null), null);
      assert.equal(buildReplyDraft(null), null);
    });

    it('3.2. builds standard reply payload preserving core attributes', () => {
      const reply = {
        id: 'msg_99',
        text: 'Checking radar',
        msgType: 'text',
        senderId: 'user_a',
        senderName: 'Josh',
      };
      const res = buildReplyPayload(reply);
      assert.equal(res.id, 'msg_99');
      assert.equal(res.text, 'Checking radar');
      assert.equal(res.senderId, 'user_a');
      assert.equal(res.senderName, 'Josh');
      assert.equal(res.isCall, false);
    });

    it('3.3. builds broadcast reply payload with coordinates', () => {
      const reply = {
        id: 'msg_bc',
        text: 'Going to BSD',
        msgType: 'text',
        isBroadcast: true,
        broadcastMessage: 'Standby BSD',
        lat: -6.28,
        lng: 106.72,
        senderId: 'user_b',
      };
      const res = buildReplyPayload(reply);
      assert.equal(res.isBroadcast, true);
      assert.equal(res.broadcastMessage, 'Standby BSD');
      assert.equal(res.lat, -6.28);
      assert.equal(res.lng, 106.72);
    });

    it('3.4. builds call reply payload with callMode and duration', () => {
      const reply = {
        id: 'msg_call',
        msgType: 'call',
        isCall: true,
        callMode: 'video',
        callDuration: 45,
        callTimestamp: 1700000000000,
      };
      const res = buildReplyPayload(reply);
      assert.equal(res.isCall, true);
      assert.equal(res.callMode, 'video');
      assert.equal(res.callDuration, 45);
    });

    it('3.5. builds inbound reply draft setting senderName to "You" if self message', () => {
      const msg = { id: 'm1', senderId: 'me', text: 'My own quote' };
      const draft = buildReplyDraft(msg, 'me', { name: 'Peer' });
      assert.equal(draft.senderName, 'You');
      assert.equal(draft.text, 'My own quote');
    });

    it('3.6. builds inbound reply draft setting senderName to peer name if other user', () => {
      const msg = { id: 'm2', senderId: 'peer_1', text: 'Peer quote' };
      const draft = buildReplyDraft(msg, 'me', { displayName: 'Ahmad' });
      assert.equal(draft.senderName, 'Ahmad');
    });
  });

  // ==========================================
  // 4. messageStatusUpdaters
  // ==========================================
  describe('Module 4: messageStatusUpdaters.js', () => {
    it('4.1. applyPeerReadReceipt updates "sent" to "read" for own messages up to ackTs', () => {
      const msgs = [
        { id: '1', senderId: 'me', status: 'sent', ts: 100 },
        { id: '2', senderId: 'me', status: 'sent', ts: 200 },
        { id: '3', senderId: 'me', status: 'sent', ts: 300 },
        { id: '4', senderId: 'peer', status: 'sent', ts: 150 },
      ];
      const { next, changed } = applyPeerReadReceipt(msgs, 'me', 200);
      assert.equal(changed, true);
      assert.equal(next[0].status, 'read');
      assert.equal(next[1].status, 'read');
      assert.equal(next[2].status, 'sent');
      assert.equal(next[3].status, 'sent'); // peer message not touched
    });

    it('4.2. applyPeerReadReceipt returns original array reference when unchanged (IL-7)', () => {
      const msgs = [{ id: '1', senderId: 'me', status: 'read', ts: 100 }];
      const { next, changed } = applyPeerReadReceipt(msgs, 'me', 200);
      assert.equal(changed, false);
      assert.equal(next, msgs); // identical reference
    });

    it('4.3. filterDeletedMessages filters out deleted IDs', () => {
      const msgs = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const { next, changed } = filterDeletedMessages(msgs, ['2']);
      assert.equal(changed, true);
      assert.equal(next.length, 2);
      assert.deepEqual(
        next.map((m) => m.id),
        ['1', '3']
      );
    });

    it('4.4. filterDeletedMessages returns original array when empty or non-matching IDs', () => {
      const msgs = [{ id: '1' }, { id: '2' }];
      const { next, changed } = filterDeletedMessages(msgs, ['99']);
      assert.equal(changed, false);
      assert.equal(next, msgs);
    });

    it('4.5. filterInFlightOrFailed preserves sending and failed messages', () => {
      const msgs = [
        { id: '1', status: 'read' },
        { id: '2', status: 'sending' },
        { id: '3', status: 'failed' },
        { id: '4', status: 'sent' },
      ];
      const kept = filterInFlightOrFailed(msgs);
      assert.deepEqual(
        kept.map((m) => m.id),
        ['2', '3']
      );
    });

    it('4.6. updateMessageStatusById updates target status and extra props', () => {
      const msgs = [{ id: '1', status: 'sending' }, { id: '2', status: 'sending' }];
      const { next, changed } = updateMessageStatusById(msgs, '1', 'failed', { error: 'Timeout' });
      assert.equal(changed, true);
      assert.equal(next[0].status, 'failed');
      assert.equal(next[0].error, 'Timeout');
      assert.equal(next[1].status, 'sending');
    });
  });

  // ==========================================
  // 5. mergeRemoteMessages
  // ==========================================
  describe('Module 5: mergeRemoteMessages.js', () => {
    it('5.1. preserves local in-flight messages and appends remote decrypted messages', () => {
      const prev = [{ id: 'in_flight', status: 'sending', ts: 200, text: 'Sending...' }];
      const remote = [{ id: 'remote_1', status: 'sent', ts: 100, text: 'From server' }];
      const merged = buildMergedRemoteMessages({
        prev,
        decryptedRemote: remote,
        myId: 'me',
      });
      assert.equal(merged.length, 2);
      assert.equal(merged[0].id, 'remote_1');
      assert.equal(merged[1].id, 'in_flight');
    });

    it('5.2. never downgrades a locally confirmed "read" status back to "sent"', () => {
      const prev = [{ id: 'm1', status: 'read', ts: 100, text: 'Already read locally' }];
      const remote = [{ id: 'm1', status: 'sent', ts: 100, text: 'Server says sent' }];
      const merged = buildMergedRemoteMessages({
        prev,
        decryptedRemote: remote,
        myId: 'me',
      });
      assert.equal(merged.length, 1);
      assert.equal(merged[0].status, 'read');
    });

    it('5.3. full reconcile after deleteRev advances discards absent read messages but retains in-flight', () => {
      const prev = [
        { id: 'deleted_on_other_client', status: 'sent', ts: 100 },
        { id: 'in_flight_draft', status: 'sending', ts: 300 },
      ];
      const remote = [{ id: 'server_truth_1', status: 'sent', ts: 200 }];
      const merged = buildMergedRemoteMessages({
        prev,
        decryptedRemote: remote,
        wasInitialized: true,
        serverDelRev: 5,
        prevDelRev: 4, // deletion occurred!
        isDelta: false,
        myId: 'me',
      });
      assert.equal(merged.length, 2);
      assert.deepEqual(
        merged.map((m) => m.id),
        ['server_truth_1', 'in_flight_draft']
      );
    });

    it('5.4. filters out seed_ messages for non-dummy peers', () => {
      const prev = [
        { id: 'seed_greeting', status: 'sent', ts: 100 },
        { id: 'real_msg', status: 'sent', ts: 150 },
      ];
      const merged = buildMergedRemoteMessages({
        prev,
        decryptedRemote: [],
        myId: 'me',
        isAhmad: false,
      });
      assert.equal(merged.length, 1);
      assert.equal(merged[0].id, 'real_msg');
    });

    it('5.5. retains seed_ messages for dummy user Ahmad Bintaro', () => {
      const prev = [{ id: 'seed_ahmad_1', status: 'sent', ts: 100 }];
      const merged = buildMergedRemoteMessages({
        prev,
        decryptedRemote: [],
        myId: 'me',
        isAhmad: true,
      });
      assert.equal(merged.length, 1);
      assert.equal(merged[0].id, 'seed_ahmad_1');
    });
  });

  // ==========================================
  // 6. mapEntitiesProjection
  // ==========================================
  describe('Module 6: mapEntitiesProjection.js', () => {
    it('6.1. excludes users who are offline or allowLiveLocation === false', () => {
      const users = [
        { id: 'u1', isOnline: true, allowLiveLocation: true, lat: -6.28, lng: 106.71 },
        { id: 'u2', isOnline: false, allowLiveLocation: true, lat: -6.28, lng: 106.71 },
        { id: 'u3', isOnline: true, allowLiveLocation: false, lat: -6.28, lng: 106.71 },
      ];
      const res = buildVisibleMapUsers(
        { mapUsersData: users },
        {
          hasValidCoordinates: stubHasValidCoordinates,
          resolvePersistentAvatarUrl: stubResolvePersistentAvatarUrl,
        }
      );
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 'u1');
    });

    it('6.2. excludes users with invalid or NaN coordinates', () => {
      const users = [
        { id: 'u1', isOnline: true, allowLiveLocation: true, lat: null, lng: null },
        { id: 'u2', isOnline: true, allowLiveLocation: true, lat: 0, lng: 0 },
        { id: 'u3', isOnline: true, allowLiveLocation: true, lat: -6.28, lng: 106.71 },
      ];
      const res = buildVisibleMapUsers(
        { mapUsersData: users },
        {
          hasValidCoordinates: stubHasValidCoordinates,
          resolvePersistentAvatarUrl: stubResolvePersistentAvatarUrl,
        }
      );
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 'u3');
    });

    it('6.3. excludes users in blockedUserIds list', () => {
      const users = [
        { id: 'u1', isOnline: true, allowLiveLocation: true, lat: -6.28, lng: 106.71 },
        { id: 'blocked_1', isOnline: true, allowLiveLocation: true, lat: -6.28, lng: 106.71 },
      ];
      const res = buildVisibleMapUsers(
        { mapUsersData: users, blockedUserIds: ['blocked_1'] },
        {
          hasValidCoordinates: stubHasValidCoordinates,
          resolvePersistentAvatarUrl: stubResolvePersistentAvatarUrl,
        }
      );
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 'u1');
    });

    it('6.4. adds currentUser to visibleMapUsers only when presence === "online"', () => {
      const me = { id: 'me_id', name: 'My Profile', domicileLat: -6.28, domicileLng: 106.71 };
      const resOnline = buildVisibleMapUsers(
        { currentUser: me, presence: 'online' },
        {
          hasValidCoordinates: stubHasValidCoordinates,
          resolvePersistentAvatarUrl: stubResolvePersistentAvatarUrl,
        }
      );
      assert.equal(resOnline.length, 1);
      assert.equal(resOnline[0].id, 'me_id');

      const resStealth = buildVisibleMapUsers(
        { currentUser: me, presence: 'invisible' },
        {
          hasValidCoordinates: stubHasValidCoordinates,
          resolvePersistentAvatarUrl: stubResolvePersistentAvatarUrl,
        }
      );
      assert.equal(resStealth.length, 0);
    });

    it('6.5. buildVisibleEvents filters expired events and events from blocked creators', () => {
      const now = 1700000000000;
      const events = [
        { id: 'ev1', title: 'Active event', creator: { id: 'u1' }, expiresAt: now + 100000 },
        { id: 'ev2', title: 'Expired event', creator: { id: 'u2' }, expiresAt: now - 5000 },
        { id: 'ev3', title: 'Blocked creator', creator: { id: 'blocked_u' }, expiresAt: now + 100000 },
      ];
      const visible = buildVisibleEvents(events, ['blocked_u'], now);
      assert.equal(visible.length, 1);
      assert.equal(visible[0].id, 'ev1');
    });
  });

  // ==========================================
  // 7. sidebarKalceriansProjection
  // ==========================================
  describe('Module 7: sidebarKalceriansProjection.js', () => {
    it('7.1. isExcludedKalcerianUser detects all forbidden accounts', () => {
      const currentUser = { id: 'me_123', email: 'me@example.com' };
      assert.equal(isExcludedKalcerianUser({ id: 'mock_coki' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'me_123' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'other', email: 'me@example.com' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'admin1', email: 'admin@kalceria.id' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'admin2', email: 'laptop_tester@gmail.com' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'admin3', role: 'ADMIN' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'user_o', name: 'Otniel' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'user_j', nickname: 'Josh' }, currentUser), true);
      assert.equal(isExcludedKalcerianUser({ id: 'user_r', name: 'Reinathan' }, currentUser), true);
      assert.equal(
        isExcludedKalcerianUser({ id: 'valid_user', name: 'Alif', email: 'alif@gmail.com' }, currentUser),
        false
      );
    });

    it('7.2. buildSidebarKalcerians filters out excluded users and current user', () => {
      const kals = [
        { id: 'u1', name: 'Budi' },
        { id: 'mock_test', name: 'Tester' },
        { id: 'me', name: 'Myself' },
      ];
      const list = buildSidebarKalcerians({ kalcerians: kals, currentUser: { id: 'me' } });
      assert.equal(list.length, 1);
      assert.equal(list[0].id, 'u1');
    });

    it('7.3. sort priority: unread notifications appear first', () => {
      const kals = [
        { id: 'u1', name: 'Ahmad' },
        { id: 'u2', name: 'Bima' },
      ];
      const personalChatMap = {
        u2: { unreadCount: 2, lastMessageAt: 500 },
        u1: { unreadCount: 0, lastMessageAt: 600 },
      };
      const list = buildSidebarKalcerians({ kalcerians: kals, personalChatMap });
      assert.equal(list[0].id, 'u2');
      assert.equal(list[1].id, 'u1');
    });

    it('7.4. sort priority: favourites appear after unread notifications', () => {
      const kals = [
        { id: 'u1', name: 'Zack' },
        { id: 'u2', name: 'Adam' },
      ];
      const favouriteUserIds = ['u1'];
      const list = buildSidebarKalcerians({ kalcerians: kals, favouriteUserIds });
      assert.equal(list[0].id, 'u1'); // Favourite at top despite alphabetical order
    });

    it('7.5. search query filters sidebar list by name, nickname, or event title', () => {
      const kals = [
        { id: 'u1', name: 'Dharma', nickname: 'Speedy' },
        { id: 'u2', name: 'Rian' },
        { id: 'u3', name: 'Surya' },
      ];
      const events = [
        { id: 'ev_2', title: 'Trackday Sentul', creator: { id: 'u2' } },
      ];
      const helpers = { doesEventBelongToUser: (ev, user) => ev?.creator?.id === user?.id };
      const res1 = buildSidebarKalcerians({ kalcerians: kals, searchQuery: 'Speedy' });
      assert.equal(res1.length, 1);
      assert.equal(res1[0].id, 'u1');

      const res2 = buildSidebarKalcerians(
        { kalcerians: kals, events, searchQuery: 'Trackday' },
        helpers
      );
      assert.equal(res2.length, 1);
      assert.equal(res2[0].id, 'u2');
    });
  });

  // ==========================================
  // 8. eventDescCodec
  // ==========================================
  describe('Module 8: eventDescCodec.js', () => {
    it('8.1. stripEventTags strips [CAT], [LOC], [MEDIA], [COLLABS] cleanly', () => {
      const raw =
        '[CAT:boba] [LOC:Bintaro Xchange] [MEDIA:https://blob.jpg] [COLLABS:u1,u2] Meeting up for coffee';
      const clean = stripEventTags(raw);
      assert.equal(clean, 'Meeting up for coffee');
    });

    it('8.2. parseEventDesc extracts all tag attributes and clean description', () => {
      const eventItem = {
        description: '[CAT:circuit] [LOC:Sentul Raceway] [MEDIA:track.mp4] Time attack race',
        category: 'cafe',
      };
      const parsed = parseEventDesc(eventItem);
      assert.equal(parsed.category, 'circuit');
      assert.equal(parsed.location, 'Sentul Raceway');
      assert.equal(parsed.mediaUrl, 'track.mp4');
      assert.equal(parsed.cleanDesc, 'Time attack race');
    });

    it('8.3. encodeEventDesc formats tags in standard order', () => {
      const encoded = encodeEventDesc({
        category: 'night_drive',
        cleanDesc: 'Toll road convoy',
        locationName: 'PIM 3',
        mediaUrl: 'drive.mp4',
      });
      assert.equal(
        encoded,
        '[MEDIA:drive.mp4] [LOC:PIM 3] [CAT:night_drive] Toll road convoy'
      );
    });

    it('8.4. handles raw description without tags without mangling text', () => {
      const raw = 'Just plain text meetup';
      assert.equal(stripEventTags(raw), 'Just plain text meetup');
    });

    it('8.5. tag matching is case-insensitive', () => {
      const raw = '[cat:cafe] [media:pic.png] [loc:Bandung] Morning ride';
      const parsed = parseEventDesc({ description: raw });
      assert.equal(parsed.category, 'cafe');
      assert.equal(parsed.mediaUrl, 'pic.png');
      assert.equal(parsed.location, 'Bandung');
      assert.equal(parsed.cleanDesc, 'Morning ride');
    });
  });

  // ==========================================
  // 9. miniEventPayload
  // ==========================================
  describe('Module 9: miniEventPayload.js', () => {
    it('9.1. buildMediaItemsPayload formats metadata for multi-clip events', () => {
      const mediaUrl = 'clip1.mp4, clip2.jpg';
      const meta = {
        'clip1.mp4': { width: 1920, height: 1080, duration: 15 },
        'clip2.jpg': { width: 800, height: 600 },
      };
      const items = buildMediaItemsPayload(mediaUrl, meta);
      assert.equal(items.length, 2);
      assert.deepEqual(items[0], { url: 'clip1.mp4', width: 1920, height: 1080, duration: 15 });
      assert.deepEqual(items[1], { url: 'clip2.jpg', width: 800, height: 600 });
    });

    it('9.2. buildMiniEventPayload formats title and encodes description tags', () => {
      const eventForm = {
        title: 'bintaro morning run',
        description: 'Morning drive along boulevard',
        category: 'morning_run',
        mediaUrl: 'video.mp4',
        mediaMetadataByUrl: {},
      };
      const payload = buildMiniEventPayload(
        {
          eventForm,
          currentLat: -6.28,
          currentLng: 106.71,
          locationName: 'Sektor 9',
        },
        { toSmartTitleCaseFn: stubToSmartTitleCase }
      );
      assert.equal(payload.title, 'Bintaro Morning Run');
      assert.equal(payload.category, 'morning_run');
      assert.equal(payload.location, 'Sektor 9');
      assert.equal(payload.lat, -6.28);
      assert.equal(payload.lng, 106.71);
      assert.equal(
        payload.description,
        '[MEDIA:video.mp4] [LOC:Sektor 9] [CAT:morning_run] Morning drive along boulevard'
      );
    });

    it('9.3. buildMiniEventPayload strips existing tags in form description to prevent nested duplicate tags', () => {
      const eventForm = {
        title: 'Meet',
        description: '[CAT:cafe] [LOC:Jakarta] Let us chill',
        category: 'lounge',
        mediaUrl: '',
      };
      const payload = buildMiniEventPayload({
        eventForm,
        currentLat: -6.2,
        currentLng: 106.8,
        locationName: 'SCBD',
      });
      assert.equal(payload.description, '[LOC:SCBD] [CAT:lounge] Let us chill');
    });

    it('9.4. handles empty title and empty location gracefully', () => {
      const payload = buildMiniEventPayload({ eventForm: { title: '', category: 'cafe' } });
      assert.equal(payload.title, '');
      assert.equal(payload.location, '');
    });

    it('9.5. preserves mediaSyncedAt timestamp if provided in eventForm', () => {
      const ts = 1700000000000;
      const payload = buildMiniEventPayload({ eventForm: { mediaSyncedAt: ts } });
      assert.equal(payload.mediaSyncedAt, ts);
    });
  });

  // ==========================================
  // 10. profilePatch
  // ==========================================
  describe('Module 10: profilePatch.js', () => {
    it('10.1. patchUserCollection updates target user immutably', () => {
      const users = [
        { id: 'u1', displayName: 'Old Name' },
        { id: 'u2', displayName: 'Unchanged' },
      ];
      const patched = patchUserCollection(users, 'u1', { displayName: 'New Name' });
      assert.equal(patched[0].displayName, 'New Name');
      assert.equal(patched[1].displayName, 'Unchanged');
      assert.notEqual(patched, users);
    });

    it('10.2. patchUserCollection returns original array if currentUserId not provided', () => {
      const users = [{ id: 'u1' }];
      assert.equal(patchUserCollection(users, null, { name: 'X' }), users);
    });

    it('10.3. patchEventCollectionForUser updates creator profile fields for user events', () => {
      const events = [
        { id: 'own', creator: { id: 'me', displayName: 'Old', profilePicture: 'old.jpg' } },
        { id: 'other', creator: { id: 'u2', displayName: 'Peer' } },
      ];
      const patch = { displayName: 'New Me', profilePicture: 'new.jpg' };
      const patched = patchEventCollectionForUser(events, 'me', patch);
      assert.equal(patched[0].creator.displayName, 'New Me');
      assert.equal(patched[0].creator.profilePicture, 'new.jpg');
      assert.equal(patched[1].creator.displayName, 'Peer');
    });

    it('10.4. patchEventCollectionForUser returns original array if patch does not touch identity fields', () => {
      const events = [{ id: 'own', creator: { id: 'me' } }];
      const res = patchEventCollectionForUser(events, 'me', { uninterestingField: 123 });
      assert.equal(res, events); // unchanged reference
    });

    it('10.5. buildSyncedProfilePatch merges local edits and server response with fallback priority', () => {
      const local = { displayName: 'Local Preferred' };
      const server = { name: 'Server Name', profilePicture: 'server.jpg' };
      const merged = buildSyncedProfilePatch(local, server);
      assert.equal(merged.displayName, 'Server Name'); // server.name takes precedence over updatedData.displayName per L1374
      assert.equal(merged.name, 'Server Name');
      assert.equal(merged.profilePicture, 'server.jpg');

      const local2 = { displayName: 'Local Preferred' };
      const server2 = { profilePicture: 'server2.jpg' };
      const merged2 = buildSyncedProfilePatch(local2, server2);
      assert.equal(merged2.displayName, 'Local Preferred'); // falls back to local when server has no name/displayName
    });
  });
});
