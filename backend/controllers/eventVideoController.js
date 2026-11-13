/**
 * backend/controllers/eventVideoController.js
 *
 * Modular backend pipeline for attaching and compressing Event videos
 * without quality loss (`videoUrl` & `videoMeta` slot per Event in Postgres).
 */

import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';
import { optimizeVideoBuffer } from '../utils/videoOptimizer.js';

const MAX_RAW_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB input limit (matches Express JSON limit)
const MAX_INLINE_DATA_URL_BYTES = 6 * 1024 * 1024; // 6 MB compressed inline DB fallback ceiling

export function isAllowedEventVideoUrl(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string') return false;
  const clean = value.trim();
  if (!clean) return true;
  if (clean.startsWith('/') && !clean.startsWith('//') && !clean.includes('\\')) return true;
  if (/^data:video\/(?:mp4|webm|quicktime|x-m4v);base64,[A-Za-z0-9+/=\s]+$/i.test(clean)) {
    return clean.length <= 26 * 1024 * 1024;
  }
  try {
    return new URL(clean).protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseBase64VideoPayload({ videoDataUrl, base64, mimeType, filename }) {
  const dataUrlRaw = typeof videoDataUrl === 'string' ? videoDataUrl.trim() : '';
  if (dataUrlRaw) {
    const match = dataUrlRaw.match(/^data:(video\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) {
      throw new Error('Invalid base64 video data URL format.');
    }
    const decodedMime = match[1].toLowerCase();
    const cleanedB64 = match[2].replace(/\s+/g, '');
    const buffer = Buffer.from(cleanedB64, 'base64');
    return {
      buffer,
      mimeType: mimeType || decodedMime,
      filename: filename || `event-video.${decodedMime.includes('webm') ? 'webm' : 'mp4'}`,
    };
  }

  if (typeof base64 === 'string' && base64.trim()) {
    const cleanedB64 = base64.trim().replace(/\s+/g, '');
    const buffer = Buffer.from(cleanedB64, 'base64');
    return {
      buffer,
      mimeType: mimeType || 'video/mp4',
      filename: filename || 'event-video.mp4',
    };
  }

  return null;
}

async function storeOptimizedVideoAsset(eventId, optimized) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    const safeName = optimized.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `event-videos/${encodeURIComponent(eventId)}/${Date.now()}-${safeName}`;
    try {
      const uploadRes = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${blobToken}`,
          'Content-Type': optimized.contentType,
          'x-add-random-suffix': '0',
          'x-api-version': '7',
        },
        body: optimized.buffer,
      });
      if (uploadRes.ok) {
        const blobData = await uploadRes.json();
        if (blobData?.url) {
          return { url: blobData.url, provider: 'vercel-blob' };
        }
      }
    } catch (err) {
      console.warn('[EventVideo] Vercel Blob upload warning, falling back cleanly:', err.message);
    }
  }

  if (optimized.buffer.length > MAX_INLINE_DATA_URL_BYTES) {
    const err = new Error('Compressed video exceeds inline storage limit when blob storage is unconfigured.');
    err.status = 413;
    err.publicMessage = err.message;
    throw err;
  }

  return {
    url: `data:${optimized.contentType};base64,${optimized.buffer.toString('base64')}`,
    provider: 'inline-compressed',
  };
}

/**
 * Optimizes an uploaded data-URL or raw buffer and returns `{ videoUrl, videoMeta, optimization }`.
 */
export async function processAndStoreEventVideo(eventId, payload = {}) {
  const parsedBinary = parseBase64VideoPayload(payload);

  if (parsedBinary) {
    if (parsedBinary.buffer.length === 0) {
      const err = new Error('Video payload is empty.');
      err.status = 400;
      err.publicMessage = err.message;
      throw err;
    }
    if (parsedBinary.buffer.length > MAX_RAW_VIDEO_BYTES) {
      const err = new Error('Video payload exceeds 25 MB upload ceiling.');
      err.status = 413;
      err.publicMessage = err.message;
      throw err;
    }

    const optimized = await optimizeVideoBuffer(parsedBinary.buffer, {
      filename: parsedBinary.filename,
      mimeType: parsedBinary.mimeType,
      useFfmpeg: true,
    });

    const stored = await storeOptimizedVideoAsset(eventId, optimized);
    const videoMeta = {
      originalSize: optimized.originalSize,
      optimizedSize: optimized.optimizedSize,
      reductionPercent: optimized.reductionPercent,
      method: optimized.method,
      fastStartApplied: optimized.fastStartApplied,
      contentType: optimized.contentType,
      provider: stored.provider,
      ...(optimized.metadata || {}),
      uploadedAt: new Date().toISOString(),
    };

    return {
      videoUrl: stored.url,
      videoMeta,
      optimization: videoMeta,
    };
  }

  const rawUrl = typeof payload.videoUrl === 'string' ? payload.videoUrl.trim() : '';
  if (!rawUrl) {
    return { videoUrl: null, videoMeta: null, optimization: null };
  }
  if (!isAllowedEventVideoUrl(rawUrl)) {
    const err = new Error('Video URL must be HTTPS, site-relative, or valid video data URL.');
    err.status = 400;
    err.publicMessage = err.message;
    throw err;
  }

  return {
    videoUrl: rawUrl,
    videoMeta: {
      provider: 'external-or-preuploaded',
      uploadedAt: new Date().toISOString(),
    },
    optimization: null,
  };
}

// ─── POST /admin/events/:id/video ─────────────────────────────────────────────
export async function uploadEventVideo(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const { videoUrl, videoMeta, optimization } = await processAndStoreEventVideo(id, req.body || {});
    const updated = await prisma.event.update({
      where: { id },
      data: {
        videoUrl,
        videoMeta,
      },
    });

    await createLog(
      req.user?.email || 'admin',
      'EVENT_VIDEO_UPDATED',
      JSON.stringify({ eventId: id, videoMeta }),
      prisma
    ).catch(() => {});

    res.json({
      success: true,
      event: { ...updated, isTarget: updated.isMinigameTarget },
      optimization,
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/events/:id/video ───────────────────────────────────────────
export async function deleteEventVideo(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        videoUrl: null,
        videoMeta: null,
      },
    });

    await createLog(
      req.user?.email || 'admin',
      'EVENT_VIDEO_REMOVED',
      `Cleared video slot for event ${id}`,
      prisma
    ).catch(() => {});

    res.json({
      success: true,
      event: { ...updated, isTarget: updated.isMinigameTarget },
    });
  } catch (err) {
    next(err);
  }
}

