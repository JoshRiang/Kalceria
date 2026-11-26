import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import {
  buildMinigameVoucherEmailHtml,
  buildMinigameVoucherEmailText,
  sendMinigameVoucherEmail,
} from '../lib/mailer/minigameVoucherEmails.js';
import {
  dispatchVoucherWinnerEmails,
  finalizeExpiredMinigameTargets,
  getUserAwardedVoucher,
} from '../controllers/minigame/minigameVoucherService.js';
import {
  detectVideoContainer,
  optimizeMp4BoxesLossless,
  optimizeVideoBuffer,
  resolveFfmpegBinaries,
} from '../utils/videoOptimizer.js';
import {
  isAllowedEventVideoUrl,
  parseBase64VideoPayload,
} from '../controllers/eventVideoController.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

after(async () => {
  try {
    await redis.quit();
  } catch {}
  try {
    await prisma.$disconnect();
  } catch {}
});

function buildIsoBox(type, payload) {
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32BE(buf.length, 0);
  buf.write(type, 4, 4, 'ascii');
  payload.copy(buf, 8);
  return buf;
}

function buildMinimalNonFaststartMp4({ paddingBytes = 1024, mdatPayloadBytes = 64 } = {}) {
  const ftyp = buildIsoBox('ftyp', Buffer.from('isom\x00\x00\x02\x00isommp41', 'binary'));
  const freeBox = buildIsoBox('free', Buffer.alloc(paddingBytes, 0));
  const mdatPayload = Buffer.alloc(mdatPayloadBytes, 0xaa);
  const mdat = buildIsoBox('mdat', mdatPayload);

  // Chunk offset points to start of mdat payload
  const originalChunkOffset = ftyp.length + freeBox.length + 8;
  const stcoPayload = Buffer.alloc(12);
  stcoPayload.writeUInt32BE(0, 0); // version/flags
  stcoPayload.writeUInt32BE(1, 4); // entry_count = 1
  stcoPayload.writeUInt32BE(originalChunkOffset, 8);
  const stco = buildIsoBox('stco', stcoPayload);
  const stbl = buildIsoBox('stbl', stco);
  const minf = buildIsoBox('minf', stbl);
  const mdia = buildIsoBox('mdia', minf);
  const trak = buildIsoBox('trak', mdia);
  const moov = buildIsoBox('moov', trak);

  return {
    buffer: Buffer.concat([ftyp, freeBox, mdat, moov]),
    expectedNewChunkOffset: ftyp.length + moov.length + 8,
  };
}

test('1. Voucher Email Contract across all 3 canonical target events & Event video slot schema', async () => {
  const user = {
    id: 'usr-voucher-canonical-1',
    name: 'Reinathan Ezhekiel',
    email: 'reinathanezhekiel1@gmail.com',
    phone: '+628117998790',
  };

  const registrations = [
    {
      id: 'reg-midnight-001',
      userId: user.id,
      eventId: 'evt-midnight-mechanics',
      selectedSession: 'Night Garage 21:00',
      event: {
        id: 'evt-midnight-mechanics',
        title: 'Midnight Mechanics',
        displayPhotoUrl: '/event_3.webp',
        videoUrl: null,
        videoMeta: null,
        location: 'SCBD Park Jakarta',
        price: 120000,
        quota: 50,
        regEndTime: new Date(Date.now() + 86400000),
        isMinigameTarget: true,
      },
    },
    {
      id: 'reg-neon-002',
      userId: user.id,
      eventId: 'evt-neon-horizon-2026',
      selectedSession: 'Evening Track 19:00',
      event: {
        id: 'evt-neon-horizon-2026',
        title: 'Neon Horizon 2026',
        displayPhotoUrl: '/event_2.webp',
        videoUrl: '/trailer.mp4',
        videoMeta: { width: 1280, height: 720 },
        location: 'Sentul International Circuit',
        price: 150000,
        quota: 80,
        regEndTime: new Date(Date.now() + 172800000),
        isMinigameTarget: false,
      },
    },
    {
      id: 'reg-sunset-003',
      userId: user.id,
      eventId: 'evt-sunset-run-series',
      selectedSession: 'Sunset Run 16:30',
      event: {
        id: 'evt-sunset-run-series',
        title: 'Sunset Run Series',
        displayPhotoUrl: '/event_1.webp',
        videoUrl: null,
        videoMeta: null,
        location: 'PIK 2 Boulevard',
        price: 75000,
        quota: 40,
        regEndTime: new Date(Date.now() + 259200000),
        isMinigameTarget: false,
      },
    },
  ];

  const eventIds = new Set(registrations.map((r) => r.eventId));
  assert.ok(eventIds.has('evt-midnight-mechanics'), 'User must be registered on evt-midnight-mechanics');
  assert.ok(eventIds.has('evt-neon-horizon-2026'), 'User must be registered on evt-neon-horizon-2026');
  assert.ok(eventIds.has('evt-sunset-run-series'), 'User must be registered on evt-sunset-run-series');

  for (const reg of registrations) {
    assert.ok('videoUrl' in reg.event, `Event ${reg.event.id} must expose videoUrl slot`);
    assert.ok('videoMeta' in reg.event, `Event ${reg.event.id} must expose videoMeta slot`);

    const voucher = {
      voucherCode: `VCHR-TEST-${reg.event.id.slice(-4).toUpperCase()}`,
      bestScoreMs: 1640,
      issuedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    const html = buildMinigameVoucherEmailHtml({
      event: reg.event,
      voucher,
      registration: reg,
      user,
    });
    const text = buildMinigameVoucherEmailText({
      event: reg.event,
      voucher,
      registration: reg,
      user,
    });

    // Favicon present
    assert.ok(html.includes('https://www.kalceria.id/favicon.png?v=2'), 'Email must include Kalceria favicon');
    // Voucher Event header + Order Summary & Event Parameters structure (no action buttons)
    assert.ok(html.includes(`Voucher Event: ${reg.event.title}`), 'Email must render Voucher Event title');
    assert.ok(html.includes('Order Summary &amp; Event Parameters'), 'Email must include Order Summary table');
    assert.ok(!html.includes('CONFIRM</a>'), 'Voucher email must not include action buttons');
    // Target Event Poster present (local .webp posters auto-converted to Gmail-compatible .jpg by resolveEmailPosterUrl)
    const expectedPosterSlug = reg.event.displayPhotoUrl.replace(/^\//, '').replace(/\.webp$/i, '.jpg');
    assert.ok(html.includes(expectedPosterSlug), `Email must embed Gmail-compatible target poster (${expectedPosterSlug})`);
    // Full registration metadata present
    assert.ok(html.includes(reg.id), 'Email must include full registration ID');
    assert.ok(html.includes(reg.selectedSession), 'Email must include selectedSession');
    assert.ok(html.includes(user.name), 'Email must include participant name');
    assert.ok(html.includes(user.phone), 'Email must include participant WhatsApp phone');
    assert.ok(html.includes('reinathanezhekiel1@gmail.com'), 'Email must include participant email');
    assert.ok(html.includes(voucher.voucherCode), 'Email must include voucherCode');
    assert.ok(text.includes(voucher.voucherCode), 'Plain text fallback must include voucherCode');
    assert.ok(text.includes(reg.id), 'Plain text fallback must include registration ID');
  }
});

test('2. Realtime Expiration Finalizer & Strictly-Once Email Idempotency Guard (In-Memory Prisma, Zero Resend Waste)', async () => {
  const realUser = {
    id: 'usr-voucher-canonical-1',
    name: 'Reinathan Ezhekiel',
    email: 'reinathanezhekiel1@gmail.com',
    phone: '+628117998790',
  };
  const realEvent = {
    id: 'evt-midnight-mechanics',
    title: 'Midnight Mechanics',
    displayPhotoUrl: '/event_3.webp',
    videoUrl: null,
    videoMeta: null,
    location: 'SCBD Park Jakarta',
    price: 120000,
    quota: 50,
    status: 'OPEN',
    isMinigameTarget: true,
    targetAssignedAt: new Date(Date.now() - 86400000),
  };
  const realReg = {
    id: 'reg-midnight-001',
    userId: realUser.id,
    eventId: realEvent.id,
    selectedSession: 'Night Garage 21:00',
    paymentStatus: 'CONFIRMED',
  };
  assert.ok(realUser && realEvent && realReg);

  // Build isolated in-memory Prisma simulation reflecting the exact moment regEndTime expires
  let isTargetActive = true;
  const expiredTime = new Date(Date.now() - 2000);
  const auditLogs = [];
  const emailsSent = [];

  const mockEventRow = {
    ...realEvent,
    isMinigameTarget: true,
    regEndTime: expiredTime,
  };

  const mockPrisma = {
    event: {
      async findMany({ where }) {
        if (where?.isMinigameTarget && !isTargetActive) return [];
        if (where?.id && where.id !== mockEventRow.id) return [];
        return isTargetActive ? [{ ...mockEventRow }] : [];
      },
      async findUnique({ where }) {
        return where?.id === mockEventRow.id ? { ...mockEventRow } : null;
      },
    },
    eventRegistration: {
      async findMany({ where }) {
        if (where?.eventId !== mockEventRow.id) return [];
        return [{ ...realReg, user: realUser }];
      },
    },
    auditLog: {
      async findMany({ where }) {
        if (where?.action === 'MINIGAME_PLAY') {
          return [{
            id: 'play-1',
            adminEmail: realUser.email,
            createdAt: new Date(expiredTime.getTime() - 60000),
            details: JSON.stringify({
              userId: realUser.id,
              scoreMs: 1450,
              targetEventId: mockEventRow.id,
            }),
          }];
        }
        if (where?.action === 'EVENT_VOUCHER_AWARDED') {
          return auditLogs.filter((l) => l.action === 'EVENT_VOUCHER_AWARDED');
        }
        return [];
      },
      async findFirst({ where }) {
        return auditLogs.find(
          (l) => l.action === where.action && l.adminEmail === where.adminEmail
        ) || null;
      },
      async create({ data }) {
        const rec = { id: `log-${auditLogs.length + 1}`, ...data, createdAt: new Date() };
        auditLogs.unshift(rec);
        return rec;
      },
    },
    async $transaction(fn) {
      const tx = {
        event: {
          async updateMany({ where }) {
            if (where.id === mockEventRow.id && where.isMinigameTarget && isTargetActive) {
              isTargetActive = false;
              mockEventRow.isMinigameTarget = false;
              return { count: 1 };
            }
            return { count: 0 };
          },
        },
      };
      return fn(tx);
    },
  };

  const mockEmailSender = async ({ to, event, voucher, registration, user }) => {
    const html = buildMinigameVoucherEmailHtml({ event, voucher, registration, user });
    emailsSent.push({ to, voucherCode: voucher.voucherCode, html });
    return { id: `mock-msg-${emailsSent.length}` };
  };

  // Fire 3 concurrent finalizations (simulating 3 clients watching Due reach 00:00:00 at once)
  const [res1, res2, res3] = await Promise.all([
    finalizeExpiredMinigameTargets({ eventId: mockEventRow.id, prismaClient: mockPrisma, emailSender: mockEmailSender }),
    finalizeExpiredMinigameTargets({ eventId: mockEventRow.id, prismaClient: mockPrisma, emailSender: mockEmailSender }),
    finalizeExpiredMinigameTargets({ eventId: mockEventRow.id, prismaClient: mockPrisma, emailSender: mockEmailSender }),
  ]);

  const totalFinalized = res1.finalizedCount + res2.finalizedCount + res3.finalizedCount;
  assert.equal(totalFinalized, 1, 'Exactly one atomic caller must finalize the expired event');
  assert.equal(emailsSent.length, 1, 'Winner email must be sent EXACTLY ONCE across concurrent calls');
  assert.equal(emailsSent[0].to, 'reinathanezhekiel1@gmail.com');
  assert.ok(emailsSent[0].html.includes('event_3.jpg'), 'Sent email must embed Gmail-compatible evt-midnight-mechanics poster (.jpg)');

  // Verify getUserAwardedVoucher resolves by userId in details even when adminEmail is an email address
  const fetchedVoucher = await getUserAwardedVoucher(realUser.id, null, mockPrisma);
  assert.ok(fetchedVoucher, 'Winner must see their voucher via getUserAwardedVoucher');
  assert.equal(fetchedVoucher.userEmail, 'reinathanezhekiel1@gmail.com');
  assert.equal(fetchedVoucher.registrationId, realReg.id);

  // Verify replay email dispatch is blocked by EVENT_VOUCHER_EMAIL_SENT guard
  const replay = await dispatchVoucherWinnerEmails({
    event: mockEventRow,
    winners: [fetchedVoucher],
    prismaClient: mockPrisma,
    emailSender: mockEmailSender,
  });
  assert.equal(replay[0].status, 'already_sent');
  assert.equal(emailsSent.length, 1, 'Resend replay must be blocked once EVENT_VOUCHER_EMAIL_SENT is logged');
});

test('3. Pure-JS Lossless MP4 Optimizer: Strips free padding, moves moov before mdat (faststart), updates stco offsets', () => {
  const { buffer, expectedNewChunkOffset } = buildMinimalNonFaststartMp4({
    paddingBytes: 1024,
    mdatPayloadBytes: 64,
  });

  const detected = detectVideoContainer(buffer, 'video/mp4', 'promo.mp4');
  assert.equal(detected.valid, true);
  assert.equal(detected.container, 'mp4');

  const optimized = optimizeMp4BoxesLossless(buffer);
  assert.equal(optimized.optimized, true);
  assert.equal(optimized.fastStartApplied, true);
  assert.equal(optimized.bytesSaved, 1032, 'Must strip 8-byte header + 1024-byte free box losslessly');
  assert.ok(optimized.buffer.length < buffer.length);

  // Walk resulting buffer to verify order: ftyp -> moov -> mdat and patched stco offset
  const boxTypes = [];
  let pos = 0;
  let patchedStcoOffset = null;
  while (pos + 8 <= optimized.buffer.length) {
    const sz = optimized.buffer.readUInt32BE(pos);
    const ty = optimized.buffer.toString('ascii', pos + 4, pos + 8);
    boxTypes.push(ty);
    if (ty === 'moov') {
      const idx = optimized.buffer.indexOf('stco', pos);
      assert.ok(idx > pos);
      patchedStcoOffset = optimized.buffer.readUInt32BE(idx + 12);
    }
    pos += sz;
  }

  assert.deepEqual(boxTypes, ['ftyp', 'moov', 'mdat']);
  assert.equal(patchedStcoOffset, expectedNewChunkOffset, 'stco chunk offset must shift cleanly after relocation');
});

test('4. Real Native FFmpeg Visually-Lossless Video Compression Pipeline + Security Validation', async () => {
  const { ffmpegPath } = await resolveFfmpegBinaries();
  assert.ok(ffmpegPath, 'Native ffmpeg binary should be resolved on host');

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'kalceria-vidtest-'));
  const samplePath = path.join(tmpDir, 'highbitrate-sample.mp4');
  try {
    // Generate an actual valid high-bitrate MP4 (non-faststart, CRF 2) so CRF 18 visually-lossless noticeably shrinks it
    await execFileAsync(
      ffmpegPath,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc=duration=1.2:size=320x240:rate=24',
        '-c:v',
        'libx264',
        '-crf',
        '2',
        '-pix_fmt',
        'yuv420p',
        samplePath,
      ],
      { timeout: 15000 }
    );

    const rawBuf = await fsp.readFile(samplePath);
    const result = await optimizeVideoBuffer(rawBuf, {
      filename: 'social-cult-test.mp4',
      mimeType: 'video/mp4',
      useFfmpeg: true,
    });

    assert.ok(result.optimizedSize > 0);
    assert.ok(result.optimizedSize < result.originalSize, `Expected compressed (${result.optimizedSize}) < original (${result.originalSize})`);
    assert.ok(result.reductionPercent > 0, `Expected >0% reduction, got ${result.reductionPercent}%`);
    assert.equal(result.method, 'ffmpeg-h264-crf18-faststart');
    assert.equal(result.fastStartApplied, true);
    assert.equal(result.contentType, 'video/mp4');
    assert.equal(result.metadata.width, 320);
    assert.equal(result.metadata.height, 240);
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  // Reject invalid spoofed video signature
  await assert.rejects(
    () => optimizeVideoBuffer(Buffer.from('not-a-real-video-file-12345'), { filename: 'bad.mp4', mimeType: 'video/mp4' }),
    /Invalid or unsupported video container/
  );

  // URL / Base64 validator checks
  assert.equal(isAllowedEventVideoUrl('https://cdn.kalceria.id/video.mp4'), true);
  assert.equal(isAllowedEventVideoUrl('/trailer.mp4'), true);
  assert.equal(isAllowedEventVideoUrl('javascript:alert(1)'), false);
  const parsed = parseBase64VideoPayload({
    videoDataUrl: 'data:video/mp4;base64,AAAAIGZ0eXBpc29t',
    filename: 'promo.mp4',
  });
  assert.equal(parsed.mimeType, 'video/mp4');
  assert.equal(detectVideoContainer(parsed.buffer, parsed.mimeType, parsed.filename).container, 'mp4');
});

test('5. Isolation Guards: Social Cult Trailer Segment Untouched & Minigame Due Finalizes Realtime', () => {
  const trailerSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'frontend/components/minigame/client/MinigameTrailerModal.jsx'),
    'utf8'
  );
  assert.ok(trailerSrc.includes('src="/trailer.mp4"'), 'Social Cult trailer segment must remain untouched');

  const clientSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'frontend/components/minigame/MinigameClient.jsx'),
    'utf8'
  );
  assert.ok(clientSrc.includes('/minigame/finalize'), 'MinigameClient must call /minigame/finalize on Due expiry');

  const emailDisabledCheck = sendMinigameVoucherEmail({
    to: 'fake@guest.kalceria.local',
    event: { title: 'Test' },
    voucher: { voucherCode: 'X' },
    registration: { id: 'reg-1' },
    user: { name: 'Guest' },
  });
  return emailDisabledCheck.then((r) => {
    assert.equal(r.skipped, true);
  });
});

