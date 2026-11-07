import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import '../api/env.js';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { register, verifyOtp, completeRegistration } from '../controllers/authController.js';
import {
  getPersonalChatMessages,
  sendPersonalChatMessage,
  deletePersonalChatMessages,
  sendCallSignal,
  getCallSignals,
} from '../controllers/personalChatController.js';
import {
  encryptChatPayload,
  decryptChatEnvelope,
  generateSafetyCode,
} from '../../frontend/lib/chatCrypto.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL CONFIGURATION: Two Devices (Laptop & HP Mobile) Real E2E Verification
// No hardcoded fake ciphertexts — uses real WebCrypto AES-256-GCM + PBKDF2 + SHA-256
// ═══════════════════════════════════════════════════════════════════════════════
export const DEVICE_LAPTOP_CONFIG = {
  deviceName: 'Laptop (Device 1)',
  email: `laptop_tester_${Date.now()}@kalceria.id`,
  password: 'Password123!Laptop',
  name: 'Laptop User',
  nickname: `laptop_${Date.now().toString(36).slice(-5)}`,
  hardware: {
    mic: true,
    camera: true,
  },
};

export const DEVICE_HP_CONFIG = {
  deviceName: 'HP Mobile (Device 2)',
  email: `hp_tester_${Date.now() + 1}@kalceria.id`,
  password: 'Password123!Mobile',
  name: 'HP Mobile User',
  nickname: `hp_${Date.now().toString(36).slice(-5)}`,
  hardware: {
    mic: true,
    camera: true,
  },
};

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    headers: {},
    cookie(name, val) {
      this.cookies[name] = val;
      return this;
    },
    clearCookie(name) {
      delete this.cookies[name];
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function setupTestUser(config) {
  const reqReg = {
    body: {
      name: config.name,
      dob: '1998-05-12',
      email: config.email,
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      domicile: 'Jakarta Selatan',
      password: config.password,
    },
  };
  const resReg = createMockRes();
  await register(reqReg, resReg, (e) => {
    if (e) throw e;
  });

  const otpKey = `otp:${config.email}`;
  const otpCode = await redis.get(otpKey);
  assert.ok(otpCode, `OTP must be generated in Redis for ${config.email}`);

  const reqVerify = { body: { email: config.email, otp: otpCode } };
  const resVerify = createMockRes();
  await verifyOtp(reqVerify, resVerify, (e) => {
    if (e) throw e;
  });

  const reqComplete = {
    body: { email: config.email, username: config.nickname },
  };
  const resComplete = createMockRes();
  await completeRegistration(reqComplete, resComplete, (e) => {
    if (e) throw e;
  });

  const user = await prisma.user.findUnique({
    where: { email: config.email },
  });
  assert.ok(user, `User ${config.email} must exist in Prisma database`);

  return {
    ...config,
    userId: user.id,
    userObj: user,
  };
}

test('E2E Verification: Real AES-256-GCM Chat, Media Persistence, Tiered Redis/Postgres Self-Healing & Trickle-ICE WebRTC Call Signaling', async () => {
  let userA = null;
  let userB = null;
  let sortedPair = null;

  try {
    userA = await setupTestUser(DEVICE_LAPTOP_CONFIG);
    userB = await setupTestUser(DEVICE_HP_CONFIG);
    sortedPair = [String(userA.userId), String(userB.userId)].sort();

    // Verify deterministic E2EE Safety Code matches on both devices
    const safetyCodeA = await generateSafetyCode(userA.userId, userB.userId);
    const safetyCodeB = await generateSafetyCode(userB.userId, userA.userId);
    assert.equal(safetyCodeA, safetyCodeB, 'E2EE Safety Code must be identical on both devices');
    assert.match(safetyCodeA, /^\d{5} \d{5} \d{5} \d{5}$/, 'Safety code must be 20 digits in 4 blocks');

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. REAL AES-256-GCM Voice Note + Honest Read Receipts + Replay & Tamper Defense
    // ─────────────────────────────────────────────────────────────────────────────
    const sampledWaveform = [8, 14, 32, 68, 94, 86, 52, 22, 10, 8, 25, 70, 88, 45, 8];
    const voiceMediaUrl = '/api/blob/raw?url=https%3A%2F%2Fe4fpd2ehtpty3ad6.private.blob.vercel-storage.com%2Fevents%2Fvoice_real_test.webm';
    const encryptedVn = await encryptChatPayload(
      {
        text: 'Voice message',
        msgType: 'voice',
        mediaUrl: voiceMediaUrl,
        voiceDuration: 7,
        voiceWaveform: sampledWaveform,
      },
      userA.userId,
      userB.userId
    );

    assert.equal(encryptedVn.alg, 'AES-256-GCM');
    assert.ok(encryptedVn.ciphertext && encryptedVn.ciphertext !== 'Voice message', 'Payload must be genuinely AES-256-GCM encrypted');
    assert.ok(encryptedVn.iv && encryptedVn.sig && encryptedVn.nonce);

    // Send Voice Note from User A (Laptop) to User B (HP)
    const sendVnRes = createMockRes();
    await sendPersonalChatMessage(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: encryptedVn,
      },
      sendVnRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(sendVnRes.statusCode, 201, 'Encrypted voice note must be persisted with 201 Created');
    assert.equal(sendVnRes.body?.envelope?.status, 'sent', 'Newly sent message must start with status="sent"');

    // Replay Attack Test: Sending the exact same nonce again MUST be rejected with 409 Conflict
    const replayRes = createMockRes();
    await sendPersonalChatMessage(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: encryptedVn,
      },
      replayRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(replayRes.statusCode, 409, 'Replay attack with duplicate nonce must be rejected with 409');

    // Honest Read Receipt Check 1: When Sender (User A) fetches conversation before User B reads it,
    // status MUST remain 'sent' (1 check mark), NOT spoofed as 'read'!
    const senderFetchRes = createMockRes();
    await getPersonalChatMessages(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        query: { limit: 10 },
      },
      senderFetchRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(senderFetchRes.statusCode, 200);
    const vnSeenBySender = senderFetchRes.body?.messages?.find((m) => m.id === encryptedVn.id);
    assert.ok(vnSeenBySender, 'Sender must see their sent voice note');
    assert.equal(vnSeenBySender.status, 'sent', 'Status must stay "sent" when only the sender has fetched the chat');

    // Honest Read Receipt Check 2: Now Recipient (User B on HP) fetches the conversation ->
    // status MUST transition to 'read' AND decrypt cleanly with WebCrypto AES-256-GCM!
    const recipientFetchRes = createMockRes();
    await getPersonalChatMessages(
      {
        user: { userId: userB.userId, id: userB.userId },
        params: { targetId: userA.userId },
        query: { limit: 10 },
      },
      recipientFetchRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(recipientFetchRes.statusCode, 200);
    const rawReceivedVn = recipientFetchRes.body?.messages?.find((m) => m.id === encryptedVn.id);
    assert.ok(rawReceivedVn, 'Recipient User B must receive the voice note envelope');
    assert.equal(rawReceivedVn.status, 'read', 'Status must transition to "read" once recipient User B fetches the chat');

    const decryptedVn = await decryptChatEnvelope(rawReceivedVn, userB.userId, userA.userId);
    assert.ok(decryptedVn, 'Recipient must decrypt AES-256-GCM envelope');
    assert.equal(decryptedVn.verifiedE2EE, true);
    assert.equal(decryptedVn.msgType, 'voice');
    assert.equal(decryptedVn.mediaUrl, voiceMediaUrl);
    assert.equal(decryptedVn.voiceDuration, 7);
    assert.deepEqual(decryptedVn.voiceWaveform, sampledWaveform);

    // Tamper Detection Check: Modifying ciphertext or signature MUST cause decryptChatEnvelope to return null
    const tamperedEnvelope = {
      ...rawReceivedVn,
      sig: rawReceivedVn.sig.replace(/^./, rawReceivedVn.sig[0] === 'a' ? 'b' : 'a'),
    };
    const tamperedResult = await decryptChatEnvelope(tamperedEnvelope, userB.userId, userA.userId);
    assert.equal(tamperedResult, null, 'Tampered E2EE signature must be rejected by decryptChatEnvelope');

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. REAL Media Photo (View-Once) & Trimmed Video (#t=start,end) + >60s Rejection
    // ─────────────────────────────────────────────────────────────────────────────
    const photoUrl = '/api/blob/raw?url=https%3A%2F%2Fe4fpd2ehtpty3ad6.private.blob.vercel-storage.com%2Fevents%2Fcropped_photo.jpg';
    const encryptedPhoto = await encryptChatPayload(
      {
        text: 'Cropped car meet shot',
        msgType: 'media',
        mediaUrl: photoUrl,
        isViewOnce: true,
      },
      userA.userId,
      userB.userId
    );
    const sendPhotoRes = createMockRes();
    await sendPersonalChatMessage(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: encryptedPhoto,
      },
      sendPhotoRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(sendPhotoRes.statusCode, 201);

    const videoTrimmedUrl = '/api/blob/raw?url=https%3A%2F%2Fe4fpd2ehtpty3ad6.private.blob.vercel-storage.com%2Fevents%2Fcapture.webm#t=1.25,8.75';
    const encryptedVideo = await encryptChatPayload(
      {
        text: 'Trimmed exhaust clip',
        msgType: 'video',
        mediaUrl: videoTrimmedUrl,
        videoDuration: 8,
        isViewOnce: false,
      },
      userA.userId,
      userB.userId
    );
    const sendVideoRes = createMockRes();
    await sendPersonalChatMessage(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: encryptedVideo,
      },
      sendVideoRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(sendVideoRes.statusCode, 201);

    // Reject video > 60s
    const overVideoEnv = await encryptChatPayload(
      {
        text: 'Too long video',
        msgType: 'video',
        mediaUrl: videoTrimmedUrl,
        videoDuration: 75,
      },
      userA.userId,
      userB.userId
    );
    const sendOverVideoRes = createMockRes();
    await sendPersonalChatMessage(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: overVideoEnv,
      },
      sendOverVideoRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(sendOverVideoRes.statusCode, 400, 'Video > 60s must be rejected with 400');

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Tiered Storage Stress Test: 55 Messages -> Hot Ring-Buffer (50) + Cold Overflow
    //    + Simulated Redis Eviction + PostgreSQL Read-Through & Self-Healing + Cursor Pagination
    // ─────────────────────────────────────────────────────────────────────────────
    // We already sent 3 valid messages (1 voice, 1 photo, 1 video). Let's send 52 text messages = 55 total.
    const convHash = crypto
      .createHash('sha256')
      .update(`kalceria_e2ee_conv:${sortedPair[0]}:${sortedPair[1]}`)
      .digest('hex')
      .slice(0, 40);
    const hotKey = `chat:conv:${convHash}`;
    const coldKey = `chat:cold:${convHash}`;

    const baseLoopTs = Date.now() + 50;
    for (let i = 1; i <= 52; i++) {
      const sender = i % 2 === 0 ? userB.userId : userA.userId;
      const recipient = i % 2 === 0 ? userA.userId : userB.userId;
      const env = await encryptChatPayload(
        {
          text: `E2EE Scalability Message #${i}`,
          msgType: 'text',
          ts: baseLoopTs + i * 10,
        },
        sender,
        recipient
      );
      const res = createMockRes();
      await sendPersonalChatMessage(
        {
          user: { userId: sender, id: sender },
          params: { targetId: recipient },
          body: env,
        },
        res,
        (e) => {
          if (e) throw e;
        }
      );
      assert.equal(res.statusCode, 201);
    }

    const hotCount = await redis.llen(hotKey);
    const coldCount = await redis.llen(coldKey);
    const pgCount = await prisma.personalChatMessage.count({
      where: {
        convHash,
      },
    });

    assert.equal(hotCount, 50, 'Redis Hot Ring-Buffer must cap at exactly 50 messages');
    assert.equal(coldCount, 5, 'Oldest 5 messages must overflow into Redis Cold Archive');
    assert.equal(pgCount, 55, 'PostgreSQL durable store must retain all 55 messages');

    // Now simulate catastrophic Redis eviction (both Hot and Cold keys deleted from Redis!)
    await redis.del(hotKey);
    await redis.del(coldKey);
    assert.equal(await redis.llen(hotKey), 0, 'Hot key must be empty after simulated eviction');

    // Fetch latest 30 messages -> MUST read through from PostgreSQL AND self-heal Redis Hot Tier!
    const page1Res = createMockRes();
    await getPersonalChatMessages(
      {
        user: { userId: userB.userId, id: userB.userId },
        params: { targetId: userA.userId },
        query: { limit: 30 },
      },
      page1Res,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(page1Res.statusCode, 200);
    assert.equal(page1Res.body?.messages?.length, 30, 'Page 1 must return latest 30 messages from Postgres read-through');
    assert.ok(page1Res.body?.nextCursor, 'Page 1 must provide nextCursor for older messages');

    // Verify Redis Hot Tier was automatically self-healed (up to 50 messages restored)
    const healedHotCount = await redis.llen(hotKey);
    assert.equal(healedHotCount, 50, 'Redis Hot Tier must self-heal to 50 messages from PostgreSQL');

    // Fetch Page 2 using nextCursor -> must return remaining 25 older messages (including our initial Voice Note, Photo & Video!)
    const page2Res = createMockRes();
    await getPersonalChatMessages(
      {
        user: { userId: userB.userId, id: userB.userId },
        params: { targetId: userA.userId },
        query: { limit: 30, cursor: page1Res.body.nextCursor },
      },
      page2Res,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(page2Res.statusCode, 200);
    assert.equal(page2Res.body?.messages?.length, 25, 'Page 2 must return the remaining 25 older messages');
    assert.equal(page2Res.body?.nextCursor, null, 'Page 2 must have nextCursor=null at start of history');

    // Decrypt all 55 combined messages across Page 2 + Page 1 and verify zero corruption
    const allFetchedEnvelopes = [...page2Res.body.messages, ...page1Res.body.messages];
    assert.equal(allFetchedEnvelopes.length, 55);
    const decryptedAll = await Promise.all(
      allFetchedEnvelopes.map((env) => decryptChatEnvelope(env, userB.userId, userA.userId))
    );
    assert.ok(decryptedAll.every(Boolean), 'Every single one of the 55 messages must decrypt without error');
    assert.equal(decryptedAll[0].msgType, 'voice');
    assert.equal(decryptedAll[0].mediaUrl, voiceMediaUrl);
    assert.equal(decryptedAll[1].msgType, 'media');
    assert.equal(decryptedAll[1].isViewOnce, true);
    assert.equal(decryptedAll[2].msgType, 'video');
    assert.equal(decryptedAll[2].mediaUrl, videoTrimmedUrl);
    assert.equal(decryptedAll[54].text, 'E2EE Scalability Message #52');

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Real 2-Device WebRTC Call Signaling Stress Test (Trickle ICE + Busy Lock)
    // ─────────────────────────────────────────────────────────────────────────────
    const callId = `call_${Date.now()}_webrtc_stress`;

    // 4A: User A (Laptop) sends Offer to User B (HP)
    const offerRes = createMockRes();
    await sendCallSignal(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: {
          callId,
          callMode: 'video',
          signalType: 'offer',
          nonce: `offer_nc_${Date.now()}`,
          encryptedPayload: JSON.stringify({ type: 'offer', sdp: 'v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n' }),
        },
      },
      offerRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(offerRes.statusCode, 200);

    // 4B: User B's KalceriansPanel peeks at signals WITHOUT clearing (clear omitted)
    const peekRes = createMockRes();
    await getCallSignals(
      {
        user: { userId: userB.userId, id: userB.userId },
        query: {},
      },
      peekRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(peekRes.body?.signals?.length, 1);
    assert.equal(peekRes.body.signals[0].signalType, 'offer');

    // 4C: User B sends 'ringing' back to User A
    const ringingRes = createMockRes();
    await sendCallSignal(
      {
        user: { userId: userB.userId, id: userB.userId },
        params: { targetId: userA.userId },
        body: {
          callId,
          callMode: 'video',
          signalType: 'ringing',
          nonce: `ring_nc_${Date.now()}`,
        },
      },
      ringingRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(ringingRes.statusCode, 200);

    // 4D: While User B's phone is ringing, User A's WebRTC stack Trickle-ICEs 20 rapid ICE candidates!
    for (let c = 1; c <= 20; c++) {
      const iceRes = createMockRes();
      await sendCallSignal(
        {
          user: { userId: userA.userId, id: userA.userId },
          params: { targetId: userB.userId },
          body: {
            callId,
            callMode: 'video',
            signalType: 'ice',
            nonce: `ice_a_${c}_${Date.now()}`,
            encryptedPayload: JSON.stringify({ candidate: `candidate:${c} 1 UDP 2122252543 192.168.1.${c} 54321 typ host`, sdpMid: '0', sdpMLineIndex: 0 }),
          },
        },
        iceRes,
        (e) => {
          if (e) throw e;
        }
      );
      assert.equal(iceRes.statusCode, 200);
    }

    // 4E: Concurrency Lock Test: A 3rd user tries to call User B while User B is in call with User A -> MUST get 409 Busy!
    const thirdUserId = `usr_third_${Date.now()}`;
    const busyRes = createMockRes();
    await sendCallSignal(
      {
        user: { userId: thirdUserId, id: thirdUserId },
        params: { targetId: userB.userId },
        body: {
          callId: `call_intruder_${Date.now()}`,
          callMode: 'voice',
          signalType: 'offer',
          nonce: `intruder_nc_${Date.now()}`,
          encryptedPayload: JSON.stringify({ type: 'offer', sdp: 'v=0' }),
        },
      },
      busyRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(busyRes.statusCode, 409, 'Concurrent call from 3rd user must be rejected with 409 Busy');

    // 4F: User B accepts the call and polls getCallSignals({ clear: 'true' }) ->
    // MUST receive the initial 'offer' PLUS all 20 'ice' candidates in chronological order (21 signals total)!
    const userBClearRes = createMockRes();
    await getCallSignals(
      {
        user: { userId: userB.userId, id: userB.userId },
        query: { clear: 'true' },
      },
      userBClearRes,
      (e) => {
        if (e) throw e;
      }
    );
    const bSignals = userBClearRes.body?.signals || [];
    assert.equal(bSignals.length, 21, 'All 21 signals (1 offer + 20 trickle ICE candidates) must be preserved without eviction');
    assert.equal(bSignals[0].signalType, 'offer', 'Chronological order: first signal must be offer');
    assert.equal(bSignals[1].signalType, 'ice');
    assert.ok(bSignals[1].encryptedPayload.includes('candidate:1 '), 'First ICE candidate must be #1');
    assert.ok(bSignals[20].encryptedPayload.includes('candidate:20 '), 'Last ICE candidate must be #20');

    // 4G: User B sends 'answer' + 10 ICE candidates to User A
    await sendCallSignal(
      {
        user: { userId: userB.userId, id: userB.userId },
        params: { targetId: userA.userId },
        body: {
          callId,
          callMode: 'video',
          signalType: 'answer',
          nonce: `ans_nc_${Date.now()}`,
          encryptedPayload: JSON.stringify({ type: 'answer', sdp: 'v=0\r\no=- 999999 2 IN IP4 127.0.0.1\r\n' }),
        },
      },
      createMockRes(),
      (e) => {
        if (e) throw e;
      }
    );
    for (let c = 1; c <= 10; c++) {
      await sendCallSignal(
        {
          user: { userId: userB.userId, id: userB.userId },
          params: { targetId: userA.userId },
          body: {
            callId,
            callMode: 'video',
            signalType: 'ice',
            nonce: `ice_b_${c}_${Date.now()}`,
            encryptedPayload: JSON.stringify({ candidate: `candidate:b${c} 1 UDP 2122252543 10.0.0.${c} 50000 typ host` }),
          },
        },
        createMockRes(),
        (e) => {
          if (e) throw e;
        }
      );
    }

    // User A polls getCallSignals({ clear: 'true' }) -> receives ringing + answer + 10 ICE candidates (12 signals) in chronological order
    const userAClearRes = createMockRes();
    await getCallSignals(
      {
        user: { userId: userA.userId, id: userA.userId },
        query: { clear: 'true' },
      },
      userAClearRes,
      (e) => {
        if (e) throw e;
      }
    );
    const aSignals = userAClearRes.body?.signals || [];
    assert.equal(aSignals.length, 12, 'User A must receive ringing + answer + 10 ICE candidates');
    assert.equal(aSignals[0].signalType, 'ringing');
    assert.equal(aSignals[1].signalType, 'answer');
    assert.equal(aSignals[2].signalType, 'ice');

    // 4H: User A hangs up -> Call locks are cleared AND User B receives the 'hangup' signal
    const hangupRes = createMockRes();
    await sendCallSignal(
      {
        user: { userId: userA.userId, id: userA.userId },
        params: { targetId: userB.userId },
        body: {
          callId,
          callMode: 'video',
          signalType: 'hangup',
          nonce: `hang_nc_${Date.now()}`,
        },
      },
      hangupRes,
      (e) => {
        if (e) throw e;
      }
    );
    assert.equal(hangupRes.statusCode, 200);
    assert.equal(await redis.get(`call:lock:${userA.userId}`), null, 'Caller lock must be released on hangup');
    assert.equal(await redis.get(`call:lock:${userB.userId}`), null, 'Callee lock must be released on hangup');

    const userBHangupPollRes = createMockRes();
    await getCallSignals(
      {
        user: { userId: userB.userId, id: userB.userId },
        query: { clear: 'true' },
      },
      userBHangupPollRes,
      (e) => {
        if (e) throw e;
      }
    );
    const hangupSignals = userBHangupPollRes.body?.signals || [];
    assert.equal(hangupSignals.length, 1, 'Peer device User B must receive the hangup signal');
    assert.equal(hangupSignals[0].signalType, 'hangup');
    assert.equal(hangupSignals[0].callId, callId);

    console.log('\n[Bi-Device E2E Verification] ALL REAL E2EE CHAT, TIERED STORAGE & WEBRTC SIGNALING TESTS PASSED!\n');
  } finally {
    if (sortedPair) {
      const convHash = crypto
        .createHash('sha256')
        .update(`kalceria_e2ee_conv:${sortedPair[0]}:${sortedPair[1]}`)
        .digest('hex')
        .slice(0, 40);
      await prisma.personalChatMessage
        .deleteMany({ where: { convHash } })
        .catch(() => {});
      await redis.del(`chat:conv:${convHash}`).catch(() => {});
      await redis.del(`chat:cold:${convHash}`).catch(() => {});
    }
    if (userA?.userId) {
      await prisma.user.delete({ where: { id: userA.userId } }).catch(() => {});
      await redis.del(`chat:call:${userA.userId}`).catch(() => {});
      await redis.del(`call:lock:${userA.userId}`).catch(() => {});
    }
    if (userB?.userId) {
      await prisma.user.delete({ where: { id: userB.userId } }).catch(() => {});
      await redis.del(`chat:call:${userB.userId}`).catch(() => {});
      await redis.del(`call:lock:${userB.userId}`).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
    await redis.quit().catch(() => {});
  }
});
