import crypto from 'node:crypto';
import { redis } from '../../lib/redis.js';
import prisma from '../../lib/prisma.js';
import {
  MAX_CIPHERTEXT_LENGTH,
  HOT_RING_BUFFER_SIZE,
  COLD_ARCHIVE_MAX_SIZE,
  HOT_TTL_SECONDS,
  COLD_TTL_SECONDS,
  NONCE_TTL_SECONDS,
  unwrapPipeResult,
  sanitizeTargetId,
  getConversationHash,
  getMetaConversationKey,
  packEnvelope,
} from './index.js';

export async function sendPersonalChatMessage(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId || String(userId) === String(targetId)) {
      return res.status(400).json({ error: 'Invalid conversation target.' });
    }

    const body = req.body || {};
    const ciphertext = typeof body.ciphertext === 'string' ? body.ciphertext.trim() : '';
    const iv = typeof body.iv === 'string' ? body.iv.trim() : '';
    const sig = typeof body.sig === 'string' ? body.sig.trim() : '';
    const nonce = typeof body.nonce === 'string' ? body.nonce.trim() : '';
    const alg = body.alg === 'AES-256-GCM' ? 'AES-256-GCM' : 'AES-256-GCM';
    const msgType = ['text', 'media', 'voice', 'video', 'call'].includes(body.msgType) ? body.msgType : 'text';
    const ts = Number(body.ts) || Date.now();

    if (!ciphertext || ciphertext.length > MAX_CIPHERTEXT_LENGTH || !iv || !sig || !nonce) {
      return res.status(400).json({ error: 'Invalid E2EE message envelope.' });
    }

    // Anti-replay timestamp & nonce verification
    if (Math.abs(Date.now() - ts) > 10 * 60 * 1000) {
      return res.status(400).json({ error: 'Stale message timestamp rejected.' });
    }
    if (!/^[a-zA-Z0-9_-]{12,128}$/.test(nonce)) {
      return res.status(400).json({ error: 'Invalid cryptographic nonce.' });
    }

    // Video media duration validation: maximum 60 seconds (1 minute)
    if (body.videoDuration && typeof body.videoDuration === 'number' && body.videoDuration > 60) {
      return res.status(400).json({ error: 'Durasi video melebihi batas 1 menit (maksimal 60 detik).' });
    }

    const nonceKey = `chat:nonce:${nonce}`;
    const convHash = getConversationHash(userId, targetId);
    const hotKey = `chat:conv:${convHash}`;
    const coldKey = `chat:cold:${convHash}`;
    const metaKey = getMetaConversationKey(convHash);

    // 1. Single-RTT Pre-Flight Pipeline: block checks + atomic nonce lock + ring-buffer tail peek + empty flag
    const prePipe = redis.pipeline();
    prePipe.sismember(`blocked:${userId}`, targetId);
    prePipe.sismember(`blocked:${targetId}`, userId);
    prePipe.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS, 'NX');
    prePipe.lindex(hotKey, HOT_RING_BUFFER_SIZE - 1);
    prePipe.hget(metaKey, 'emptyConfirmed');
    const preResults = await prePipe.exec().catch(() => null);

    const blockedByMe = Number(unwrapPipeResult(preResults?.[0], 0));
    const blockedByTarget = Number(unwrapPipeResult(preResults?.[1], 0));
    const nonceSetReply = preResults ? unwrapPipeResult(preResults[2], 'OK') : 'OK';
    const oldestRaw = unwrapPipeResult(preResults?.[3], null);
    const emptyConfirmed = unwrapPipeResult(preResults?.[4], null);

    if (blockedByMe || blockedByTarget) {
      return res.status(403).json({ error: 'Cannot send message to this user.' });
    }
    if (nonceSetReply !== 'OK') {
      return res.status(409).json({ error: 'Replay detected: duplicate nonce.' });
    }

    // Never persist ephemeral browser RAM blob: URLs
    const safeMediaUrl =
      typeof body.mediaUrl === 'string' && !body.mediaUrl.trim().startsWith('blob:')
        ? body.mediaUrl.trim().slice(0, 2 * 1024 * 1024)
        : null;

    const envelope = {
      id: typeof body.id === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(body.id)
        ? body.id
        : `msg_${crypto.randomBytes(8).toString('hex')}`,
      senderId: String(userId),
      recipientId: String(targetId),
      alg,
      iv: iv.slice(0, 128),
      ciphertext,
      sig: sig.slice(0, 256),
      nonce,
      msgType,
      mediaUrl: safeMediaUrl,
      voiceDuration: typeof body.voiceDuration === 'number' && Number.isFinite(body.voiceDuration) ? Math.min(300, Math.max(1, Math.round(body.voiceDuration))) : null,
      voiceWaveform: Array.isArray(body.voiceWaveform)
        ? body.voiceWaveform.slice(0, 60).map((v) => Math.min(100, Math.max(0, Math.round(Number(v) || 0))))
        : null,
      videoDuration: typeof body.videoDuration === 'number' && Number.isFinite(body.videoDuration) ? Math.min(300, Math.max(1, Math.round(body.videoDuration))) : null,
      isViewOnce: Boolean(body.isViewOnce),
      isOnceOpened: Boolean(body.isOnceOpened),
      callMode: typeof body.callMode === 'string' ? body.callMode : null,
      callDuration: typeof body.callDuration === 'number' && Number.isFinite(body.callDuration) ? body.callDuration : null,
      replyTo: body.replyTo && typeof body.replyTo === 'object' ? body.replyTo : null,
      ts, // Preserve client signed timestamp so E2EE signature verification matches 100%
      status: 'sent', // Always starts as 'sent' until the recipient opens & reads the chat
    };

    const packed = packEnvelope(envelope);
    const writePipe = redis.pipeline();

    // Archive 50th entry into cold overflow tier in the same pipeline (zero extra LINDEX RTT!)
    if (oldestRaw) {
      writePipe.lpush(coldKey, oldestRaw);
      writePipe.ltrim(coldKey, 0, COLD_ARCHIVE_MAX_SIZE - 1);
      writePipe.expire(coldKey, COLD_TTL_SECONDS);
    }

    writePipe.lpush(hotKey, packed);
    writePipe.ltrim(hotKey, 0, HOT_RING_BUFFER_SIZE - 1);
    writePipe.expire(hotKey, HOT_TTL_SECONDS);

    // Update O(1) conversation metadata & O(1) recipient global inbox watermark in the exact same pipeline
    const metaFields = [
      'lastTs',
      String(envelope.ts),
      'lastId',
      envelope.id,
      'lastSender',
      String(userId),
      'emptyConfirmed',
      '0',
    ];
    if (emptyConfirmed === '1' || oldestRaw) {
      metaFields.push('backfilled', '1');
    }
    writePipe.hset(metaKey, ...metaFields);
    writePipe.expire(metaKey, HOT_TTL_SECONDS);

    const inboxVer = `${Date.now()}_${envelope.id.slice(-6)}`;
    writePipe.hincrby(`chat:unread:${targetId}`, String(userId), 1);
    writePipe.expire(`chat:unread:${targetId}`, HOT_TTL_SECONDS);
    writePipe.hset(
      `chat:inbox_meta:${targetId}`,
      String(userId),
      JSON.stringify({ ts: envelope.ts, id: envelope.id, msgType: envelope.msgType })
    );
    writePipe.expire(`chat:inbox_meta:${targetId}`, HOT_TTL_SECONDS);
    writePipe.set(`chat:inbox_ver:${targetId}`, inboxVer, 'EX', HOT_TTL_SECONDS);

    // Fast single-statement INSERT on PostgreSQL concurrently with Redis writePipe
    const dbWritePromise = prisma?.personalChatMessage
      ? prisma.personalChatMessage
          .create({
            data: {
              id: envelope.id,
              convHash,
              senderId: envelope.senderId,
              recipientId: envelope.recipientId,
              packedJson: packed,
              ts: BigInt(Math.floor(envelope.ts)),
              status: envelope.status,
            },
          })
          .catch(async (err) => {
            if (err?.code === 'P2002') {
              return prisma.personalChatMessage
                .update({
                  where: { id: envelope.id },
                  data: {
                    packedJson: packed,
                    status: envelope.status,
                  },
                })
                .catch(() => {});
            }
          })
      : Promise.resolve();

    await Promise.all([writePipe.exec().catch(() => {}), dbWritePromise]);

    res.status(201).json({ ok: true, envelope });
  } catch (err) {
    next(err);
  }
}

