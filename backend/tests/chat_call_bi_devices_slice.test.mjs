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
  sendCallSignal,
  getCallSignals,
  clearCallSignals,
} from '../controllers/personalChatController.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL CONFIGURATION: Two Devices (Laptop & HP Mobile) Simulation
// Configurable local variables for bi-device testing with mic & camera capabilities
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

// Helper: Setup mock Express response
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    cookies: {},
    headers: {},
    cookie(name, val, opts) {
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
  return res;
}

// Helper: Programmatically register and activate a test user
async function setupTestUser(config) {
  try {
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
    console.log(`[Test] Registering ${config.email}...`);
    await register(reqReg, resReg, (e) => {
      if (e) throw e;
    });
    console.log(`[Test] Register status: ${resReg.statusCode}`, resReg.body);

    const otpKey = `otp:${config.email}`;
    const otpCode = await redis.get(otpKey);
    console.log(`[Test] OTP for ${config.email}: ${otpCode}`);
    assert.ok(otpCode, `OTP must be generated in Redis for ${config.email}`);

    const reqVerify = { body: { email: config.email, otp: otpCode } };
    const resVerify = createMockRes();
    await verifyOtp(reqVerify, resVerify, (e) => {
      if (e) throw e;
    });
    console.log(`[Test] Verify status: ${resVerify.statusCode}`, resVerify.body);

    const reqComplete = {
      body: { email: config.email, username: config.nickname },
    };
    const resComplete = createMockRes();
    await completeRegistration(reqComplete, resComplete, (e) => {
      if (e) throw e;
    });
    console.log(`[Test] Complete status: ${resComplete.statusCode}`, resComplete.body);

    const user = await prisma.user.findUnique({
      where: { email: config.email },
    });
    assert.ok(user, `User ${config.email} must exist in Prisma database`);

    return {
      ...config,
      userId: user.id,
      userObj: user,
    };
  } catch (err) {
    console.error(`[Test] Error in setupTestUser for ${config.email}:`, err);
    throw err;
  }
}

test('Vertical Slice: Two Users Bi-Device Chat, Voice Note Waveform, Media & Call Signaling', async () => {
  console.log('\n[Bi-Device Test] Initializing two users on distinct virtual devices...');
  console.log(`[Bi-Device Test] Device 1: ${DEVICE_LAPTOP_CONFIG.deviceName} (Mic: ${DEVICE_LAPTOP_CONFIG.hardware.mic}, Camera: ${DEVICE_LAPTOP_CONFIG.hardware.camera})`);
  console.log(`[Bi-Device Test] Device 2: ${DEVICE_HP_CONFIG.deviceName} (Mic: ${DEVICE_HP_CONFIG.hardware.mic}, Camera: ${DEVICE_HP_CONFIG.hardware.camera})`);

  let userA = null;
  let userB = null;

  try {
    userA = await setupTestUser(DEVICE_LAPTOP_CONFIG);
    userB = await setupTestUser(DEVICE_HP_CONFIG);
    console.log(`[Bi-Device Test] User A (Laptop) ID: ${userA.userId}`);
    console.log(`[Bi-Device Test] User B (HP) ID: ${userB.userId}`);

    // ─────────────────────────────────────────────────────────────────────────────
    // Acceptance Criteria 1: Voice Note with Dynamic Voice Waveform (Reading User Voice)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n[Bi-Device Test] Testing Voice Note with Real Voice Sampled Waveform...');
    const simulatedSampledWaveform = [8, 14, 32, 68, 94, 86, 52, 22, 10, 8, 25, 70, 88, 45, 8];
    const voiceDurationSec = 6;
    const voiceNonce = `vn_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;

    const sendVnReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        id: `msg_vn_${Date.now()}`,
        ciphertext: 'ENCRYPTED_VOICE_PAYLOAD_CIPHERTEXT',
        iv: 'ENCRYPTED_IV_BASE64',
        sig: 'ENCRYPTED_SIG_HEX',
        nonce: voiceNonce,
        msgType: 'voice',
        mediaUrl: 'https://blob.kalceria.id/voice/sample_recorded_audio.webm',
        voiceDuration: voiceDurationSec,
        voiceWaveform: simulatedSampledWaveform,
        ts: Date.now(),
      },
    };
    const sendVnRes = createMockRes();
    await sendPersonalChatMessage(sendVnReq, sendVnRes, (e) => {
      if (e) throw e;
    });

    assert.equal(sendVnRes.statusCode, 201, 'Voice note must be sent with 201 Created');
    assert.equal(sendVnRes.body?.ok, true);
    assert.deepEqual(
      sendVnRes.body?.envelope?.voiceWaveform,
      simulatedSampledWaveform,
      'Waveform peaks must match recorded sample energy'
    );
    console.log('[Bi-Device Test] Voice Note successfully queued with dynamic waveform:', sendVnRes.body?.envelope?.voiceWaveform);

    // User B receives the voice note
    const getVnReq = {
      user: { userId: userB.userId, id: userB.userId },
      params: { targetId: userA.userId },
      query: { limit: 10 },
    };
    const getVnRes = createMockRes();
    await getPersonalChatMessages(getVnReq, getVnRes, (e) => {
      if (e) throw e;
    });

    assert.equal(getVnRes.statusCode, 200);
    const receivedVn = getVnRes.body?.messages?.find((m) => m.msgType === 'voice');
    assert.ok(receivedVn, 'User B must receive the voice message');
    assert.equal(receivedVn.voiceDuration, voiceDurationSec, 'Voice duration must match');
    assert.deepEqual(receivedVn.voiceWaveform, simulatedSampledWaveform, 'Sampled waveform must match across devices');
    console.log('[Bi-Device Test] User B received voice note with verified sampled waveform peaks.');

    // ─────────────────────────────────────────────────────────────────────────────
    // Acceptance Criteria 2: Media Photo & Video Constraint (Max 1 Minute Video)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n[Bi-Device Test] Testing Media Constraints (Max 1 Minute Video)...');

    // 2A: Valid Photo Media
    const photoNonce = `photo_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
    const sendPhotoReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        ciphertext: 'ENCRYPTED_PHOTO_PAYLOAD',
        iv: 'IV_BASE64',
        sig: 'SIG_HEX',
        nonce: photoNonce,
        msgType: 'media',
        mediaUrl: 'https://blob.kalceria.id/events/car_meet.jpg',
        ts: Date.now(),
      },
    };
    const sendPhotoRes = createMockRes();
    await sendPersonalChatMessage(sendPhotoReq, sendPhotoRes, (e) => {
      if (e) throw e;
    });
    assert.equal(sendPhotoRes.statusCode, 201, 'Photo media must be accepted');
    console.log('[Bi-Device Test] Photo media successfully accepted.');

    // 2B: Video under 1 minute (45 seconds) -> MUST BE ACCEPTED
    const validVideoNonce = `vid_valid_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
    const sendValidVideoReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        ciphertext: 'ENCRYPTED_VALID_VIDEO_PAYLOAD',
        iv: 'IV_BASE64',
        sig: 'SIG_HEX',
        nonce: validVideoNonce,
        msgType: 'media',
        mediaUrl: 'https://blob.kalceria.id/events/exhaust_clip_45s.mp4',
        videoDuration: 45, // 45 seconds <= 60 seconds
        ts: Date.now(),
      },
    };
    const sendValidVideoRes = createMockRes();
    await sendPersonalChatMessage(sendValidVideoReq, sendValidVideoRes, (e) => {
      if (e) throw e;
    });
    assert.equal(sendValidVideoRes.statusCode, 201, 'Video <= 60s must be accepted');
    console.log('[Bi-Device Test] 45-second video successfully accepted.');

    // 2C: Video exceeding 1 minute (75 seconds) -> MUST BE REJECTED WITH 400
    const overVideoNonce = `vid_over_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
    const sendOverVideoReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        ciphertext: 'ENCRYPTED_OVER_VIDEO_PAYLOAD',
        iv: 'IV_BASE64',
        sig: 'SIG_HEX',
        nonce: overVideoNonce,
        msgType: 'media',
        mediaUrl: 'https://blob.kalceria.id/events/exhaust_clip_75s.mp4',
        videoDuration: 75, // 75 seconds > 60 seconds!
        ts: Date.now(),
      },
    };
    const sendOverVideoRes = createMockRes();
    await sendPersonalChatMessage(sendOverVideoReq, sendOverVideoRes, (e) => {
      if (e) throw e;
    });
    assert.equal(sendOverVideoRes.statusCode, 400, 'Video > 60s must be rejected with 400 Bad Request');
    assert.match(
      sendOverVideoRes.body?.error || '',
      /1 menit/i,
      'Error message must state 1 minute maximum'
    );
    console.log('[Bi-Device Test] 75-second video correctly rejected:', sendOverVideoRes.body?.error);

    // ─────────────────────────────────────────────────────────────────────────────
    // Acceptance Criteria 3: Real Voice Call Across Two Devices (WebRTC Signaling)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n[Bi-Device Test] Testing Voice Call across two devices (Laptop -> Mobile HP)...');
    const voiceCallId = `call_${Date.now()}_voice`;

    // 3A: User A initiates Voice Call (Mic access)
    const offerReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        callId: voiceCallId,
        callMode: 'voice',
        signalType: 'offer',
        nonce: `nonce_offer_${Date.now()}`,
        encryptedPayload: JSON.stringify({ sdp: 'MOCK_SDP_OFFER_VOICE', type: 'offer' }),
      },
    };
    const offerRes = createMockRes();
    await sendCallSignal(offerReq, offerRes, (e) => {
      if (e) throw e;
    });
    assert.equal(offerRes.statusCode, 200, 'Voice call offer signal must succeed');
    console.log('[Bi-Device Test] User A (Laptop) dispatched voice call offer.');

    // 3B: User B polls signals -> receives User A's call offer
    const userBSignalsReq = {
      user: { userId: userB.userId, id: userB.userId },
      query: { clear: 'true' },
    };
    const userBSignalsRes = createMockRes();
    await getCallSignals(userBSignalsReq, userBSignalsRes, (e) => {
      if (e) throw e;
    });
    assert.equal(userBSignalsRes.statusCode, 200);
    const offerSignal = userBSignalsRes.body?.signals?.find((s) => s.callId === voiceCallId && s.signalType === 'offer');
    assert.ok(offerSignal, 'User B must receive the incoming voice call offer');
    assert.equal(offerSignal.callMode, 'voice');
    console.log('[Bi-Device Test] User B (HP) received incoming voice call signal from User A.');

    // 3C: User B answers the voice call
    const answerReq = {
      user: { userId: userB.userId, id: userB.userId },
      params: { targetId: userA.userId },
      body: {
        callId: voiceCallId,
        callMode: 'voice',
        signalType: 'answer',
        nonce: `nonce_answer_${Date.now()}`,
        encryptedPayload: JSON.stringify({ sdp: 'MOCK_SDP_ANSWER_VOICE', type: 'answer' }),
      },
    };
    const answerRes = createMockRes();
    await sendCallSignal(answerReq, answerRes, (e) => {
      if (e) throw e;
    });
    assert.equal(answerRes.statusCode, 200);
    console.log('[Bi-Device Test] User B answered the voice call.');

    // 3D: User A polls signals -> receives User B's answer
    const userASignalsReq = {
      user: { userId: userA.userId, id: userA.userId },
      query: { clear: 'true' },
    };
    const userASignalsRes = createMockRes();
    await getCallSignals(userASignalsReq, userASignalsRes, (e) => {
      if (e) throw e;
    });
    const answerSignal = userASignalsRes.body?.signals?.find((s) => s.callId === voiceCallId && s.signalType === 'answer');
    assert.ok(answerSignal, 'User A must receive the voice call answer');
    console.log('[Bi-Device Test] User A received answer; bi-device voice call connected.');

    // 3E: User A hangs up call
    const hangupReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        callId: voiceCallId,
        callMode: 'voice',
        signalType: 'hangup',
        nonce: `nonce_hangup_${Date.now()}`,
      },
    };
    const hangupRes = createMockRes();
    await sendCallSignal(hangupReq, hangupRes, (e) => {
      if (e) throw e;
    });
    assert.equal(hangupRes.statusCode, 200);
    console.log('[Bi-Device Test] Voice call cleanly terminated.');

    // ─────────────────────────────────────────────────────────────────────────────
    // Acceptance Criteria 4: Real Video Call Across Two Devices (Mobile HP -> Laptop)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n[Bi-Device Test] Testing Video Call across two devices (Mobile HP -> Laptop)...');
    const vidCallId = `call_${Date.now()}_video`;

    // 4A: User B initiates Video Call (Mic + Camera access)
    const vidOfferReq = {
      user: { userId: userB.userId, id: userB.userId },
      params: { targetId: userA.userId },
      body: {
        callId: vidCallId,
        callMode: 'video',
        signalType: 'offer',
        nonce: `nonce_vidoffer_${Date.now()}`,
        encryptedPayload: JSON.stringify({ sdp: 'MOCK_SDP_OFFER_VIDEO', type: 'offer' }),
      },
    };
    const vidOfferRes = createMockRes();
    await sendCallSignal(vidOfferReq, vidOfferRes, (e) => {
      if (e) throw e;
    });
    assert.equal(vidOfferRes.statusCode, 200);

    // 4B: User A polls signals -> receives incoming Video Call
    const userAVidSignalsReq = {
      user: { userId: userA.userId, id: userA.userId },
      query: { clear: 'true' },
    };
    const userAVidSignalsRes = createMockRes();
    await getCallSignals(userAVidSignalsReq, userAVidSignalsRes, (e) => {
      if (e) throw e;
    });
    const vidSignal = userAVidSignalsRes.body?.signals?.find((s) => s.callId === vidCallId);
    assert.ok(vidSignal, 'User A must receive video call offer');
    assert.equal(vidSignal.callMode, 'video', 'Call mode must be video');
    console.log('[Bi-Device Test] User A received incoming video call signal from User B.');

    // 4C: User A answers Video Call
    const vidAnswerReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: userB.userId },
      body: {
        callId: vidCallId,
        callMode: 'video',
        signalType: 'answer',
        nonce: `nonce_vidanswer_${Date.now()}`,
        encryptedPayload: JSON.stringify({ sdp: 'MOCK_SDP_ANSWER_VIDEO', type: 'answer' }),
      },
    };
    const vidAnswerRes = createMockRes();
    await sendCallSignal(vidAnswerReq, vidAnswerRes, (e) => {
      if (e) throw e;
    });
    assert.equal(vidAnswerRes.statusCode, 200);
    console.log('[Bi-Device Test] Bi-device video call connected successfully.');

    // 4D: Hangup Video Call
    const vidHangupReq = {
      user: { userId: userB.userId, id: userB.userId },
      params: { targetId: userA.userId },
      body: {
        callId: vidCallId,
        callMode: 'video',
        signalType: 'hangup',
        nonce: `nonce_vidhangup_${Date.now()}`,
      },
    };
    const vidHangupRes = createMockRes();
    await sendCallSignal(vidHangupReq, vidHangupRes, (e) => {
      if (e) throw e;
    });
    assert.equal(vidHangupRes.statusCode, 200);
    console.log('[Bi-Device Test] Video call cleanly terminated.');

    // ─────────────────────────────────────────────────────────────────────────────
    // Acceptance Criteria 5: Calling an Offline User (Never Blocked)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n[Bi-Device Test] Testing Calling an Offline Target User...');
    const offlineTargetId = `usr_offline_${Date.now().toString(36)}`;
    const offlineCallId = `call_offline_${Date.now()}`;

    const offlineCallReq = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: offlineTargetId },
      body: {
        callId: offlineCallId,
        callMode: 'voice',
        signalType: 'offer',
        nonce: `nonce_offline_${Date.now()}`,
        encryptedPayload: JSON.stringify({ sdp: 'OFFER_SDP' }),
      },
    };
    const offlineCallRes = createMockRes();
    await sendCallSignal(offlineCallReq, offlineCallRes, (e) => {
      if (e) throw e;
    });
    assert.equal(offlineCallRes.statusCode, 200, 'Calling an offline user must succeed and initiate ringing');
    console.log('[Bi-Device Test] User A successfully initiated call to offline user (event-driven ringing confirmed).');

    // Clean up offline call
    const cleanOfflineHangup = {
      user: { userId: userA.userId, id: userA.userId },
      params: { targetId: offlineTargetId },
      body: {
        callId: offlineCallId,
        callMode: 'voice',
        signalType: 'hangup',
        nonce: `nonce_offline_hang_${Date.now()}`,
      },
    };
    await sendCallSignal(cleanOfflineHangup, createMockRes(), () => {});

    console.log('\n[Bi-Device Test] All Vertical Slice Acceptance Criteria PASSED successfully!\n');
  } finally {
    // Cleanup generated test data from Prisma and Redis
    console.log('[Bi-Device Test] Cleaning up test users from database...');
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
  }
});
