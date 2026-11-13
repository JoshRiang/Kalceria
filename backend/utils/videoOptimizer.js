/**
 * backend/utils/videoOptimizer.js
 *
 * Visually-lossless & zero-loss container video optimization pipeline:
 * 1. Magic-byte validation for MP4/M4V/MOV (ISO BMFF `ftyp`) and WebM/MKV (EBML).
 * 2. Optional native `ffmpeg` / `ffprobe` pass using archival visually-lossless settings
 *    (`libx264 -crf 18 -preset slow -movflags +faststart` or `libvpx-vp9 -crf 22`)
 *    when ffmpeg is available on host, adopting output only when smaller than original.
 * 3. Pure Node.js lossless ISO BMFF box optimizer fallback (`free`/`skip`/`wide` strip
 *    + `moov`-before-`mdat` faststart relocation with `stco`/`co64` offset rewriting)
 *    so serverless environments still shrink bloat & guarantee instant stream startup.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CONTAINER_BOX_TYPES = new Set([
  'moov',
  'trak',
  'mdia',
  'minf',
  'stbl',
  'edts',
  'udta',
  'mvex',
  'meta',
]);

const DROPPABLE_PADDING_BOXES = new Set(['free', 'skip', 'wide']);

let cachedBinaryPaths = null;

/**
 * Resolves available `ffmpeg` and `ffprobe` binaries across env, PATH, and standard Windows WinGet installs.
 */
export async function resolveFfmpegBinaries() {
  if (cachedBinaryPaths) return cachedBinaryPaths;

  let ffmpegPath = process.env.FFMPEG_PATH || null;
  let ffprobePath = process.env.FFPROBE_PATH || null;

  const tryLocate = async (cmd) => {
    try {
      const locator = process.platform === 'win32' ? 'where.exe' : 'which';
      const { stdout } = await execFileAsync(locator, [cmd], { timeout: 3000 });
      const firstLine = String(stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      return firstLine && existsSync(firstLine) ? firstLine : null;
    } catch {
      return null;
    }
  };

  if (!ffmpegPath) {
    ffmpegPath = await tryLocate('ffmpeg');
  }
  if (!ffprobePath) {
    ffprobePath = await tryLocate('ffprobe');
  }

  // Fallback check for Windows WinGet Gyan.FFmpeg package if terminal PATH hasn't reloaded
  if (!ffmpegPath && process.platform === 'win32' && process.env.LOCALAPPDATA) {
    try {
      const pkgBase = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
      if (existsSync(pkgBase)) {
        const entries = await fs.readdir(pkgBase);
        const ffmpegDir = entries.find((e) => e.startsWith('Gyan.FFmpeg'));
        if (ffmpegDir) {
          const fullPkg = path.join(pkgBase, ffmpegDir);
          const sub = await fs.readdir(fullPkg);
          const buildDir = sub.find((e) => e.includes('ffmpeg'));
          if (buildDir) {
            const candidateFfmpeg = path.join(fullPkg, buildDir, 'bin', 'ffmpeg.exe');
            const candidateFfprobe = path.join(fullPkg, buildDir, 'bin', 'ffprobe.exe');
            if (existsSync(candidateFfmpeg)) ffmpegPath = candidateFfmpeg;
            if (!ffprobePath && existsSync(candidateFfprobe)) ffprobePath = candidateFfprobe;
          }
        }
      }
    } catch {
      // Ignore filesystem discovery errors
    }
  }

  cachedBinaryPaths = { ffmpegPath, ffprobePath };
  return cachedBinaryPaths;
}

/**
 * Validates raw video buffer container magic bytes & normalizes MIME/extension.
 */
export function detectVideoContainer(buffer, mimeType = '', filename = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return { valid: false, container: null, ext: null, contentType: null };
  }

  const normalizedMime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const extLower = String(filename || '').split('.').pop()?.toLowerCase() || '';

  // EBML signature: 0x1A 0x45 0xDF 0xA3 (WebM / Matroska)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    const isWebm = normalizedMime === 'video/webm' || extLower === 'webm' || !extLower;
    return {
      valid: true,
      container: isWebm ? 'webm' : 'mkv',
      ext: isWebm ? 'webm' : 'mkv',
      contentType: isWebm ? 'video/webm' : 'video/x-matroska',
    };
  }

  // ISO BMFF (`ftyp` or QuickTime `moov`/`mdat`/`wide`/`free` at offset 4)
  const boxTag = buffer.toString('ascii', 4, 8);
  if (boxTag === 'ftyp' || boxTag === 'wide' || boxTag === 'free' || boxTag === 'moov' || boxTag === 'mdat') {
    const brand = buffer.length >= 12 ? buffer.toString('ascii', 8, 12).trim() : '';
    const isMov = brand === 'qt' || normalizedMime === 'video/quicktime' || extLower === 'mov';
    const isM4v = normalizedMime === 'video/x-m4v' || extLower === 'm4v';
    return {
      valid: true,
      container: 'mp4',
      ext: isMov ? 'mov' : isM4v ? 'm4v' : 'mp4',
      contentType: isMov ? 'video/quicktime' : isM4v ? 'video/x-m4v' : 'video/mp4',
    };
  }

  return { valid: false, container: null, ext: null, contentType: null };
}

function patchMoovChunkOffsets(boxBuffer, shiftOffsetForChunk) {
  let offset = 0;
  while (offset + 8 <= boxBuffer.length) {
    const size = boxBuffer.readUInt32BE(offset);
    const type = boxBuffer.toString('ascii', offset + 4, offset + 8);
    if (size < 8 || offset + size > boxBuffer.length) break;

    if (type === 'stco' && size >= 16) {
      const entryCount = boxBuffer.readUInt32BE(offset + 12);
      const maxEntries = Math.floor((size - 16) / 4);
      const count = Math.min(entryCount, maxEntries);
      for (let i = 0; i < count; i++) {
        const pos = offset + 16 + i * 4;
        const oldOffset = boxBuffer.readUInt32BE(pos);
        const newOffset = shiftOffsetForChunk(oldOffset);
        if (newOffset >= 0 && newOffset <= 0xffffffff) {
          boxBuffer.writeUInt32BE(newOffset, pos);
        }
      }
    } else if (type === 'co64' && size >= 16) {
      const entryCount = boxBuffer.readUInt32BE(offset + 12);
      const maxEntries = Math.floor((size - 16) / 8);
      const count = Math.min(entryCount, maxEntries);
      for (let i = 0; i < count; i++) {
        const pos = offset + 16 + i * 8;
        const oldOffset = Number(boxBuffer.readBigUInt64BE(pos));
        const newOffset = shiftOffsetForChunk(oldOffset);
        if (Number.isSafeInteger(newOffset) && newOffset >= 0) {
          boxBuffer.writeBigUInt64BE(BigInt(newOffset), pos);
        }
      }
    } else if (CONTAINER_BOX_TYPES.has(type)) {
      // `meta` is a FullBox (4 extra bytes version+flags before children)
      const childStart = type === 'meta' ? offset + 12 : offset + 8;
      if (childStart < offset + size) {
        patchMoovChunkOffsets(
          boxBuffer.subarray(childStart, offset + size),
          shiftOffsetForChunk
        );
      }
    }

    offset += size;
  }
}

/**
 * Pure Node.js lossless ISO BMFF (`mp4`/`mov`/`m4v`) optimizer:
 * - Removes `free`/`skip`/`wide` padding boxes (0% quality impact)
 * - Moves `moov` before `mdat` (`faststart`) while rewriting `stco`/`co64` offsets.
 */
export function optimizeMp4BoxesLossless(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    return { buffer, optimized: false, fastStartApplied: false, bytesSaved: 0 };
  }

  const boxes = [];
  let cursor = 0;
  let hasMoof = false;

  while (cursor + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(cursor);
    const type = buffer.toString('ascii', cursor + 4, cursor + 8);
    // Do not rewrite extended 64-bit boxes (>4GB) or open-ended boxes
    if (size === 0 || size === 1 || size < 8 || cursor + size > buffer.length) {
      return { buffer, optimized: false, fastStartApplied: false, bytesSaved: 0 };
    }
    if (type === 'moof') {
      hasMoof = true;
    }
    boxes.push({
      type,
      oldStart: cursor,
      oldEnd: cursor + size,
      data: buffer.subarray(cursor, cursor + size),
    });
    cursor += size;
  }

  if (cursor !== buffer.length || hasMoof) {
    return { buffer, optimized: false, fastStartApplied: false, bytesSaved: 0 };
  }

  const moovIdx = boxes.findIndex((b) => b.type === 'moov');
  const firstMdatIdx = boxes.findIndex((b) => b.type === 'mdat');
  const hasDroppablePadding = boxes.some((b) => DROPPABLE_PADDING_BOXES.has(b.type));
  const needsFastStart = moovIdx >= 0 && firstMdatIdx >= 0 && moovIdx > firstMdatIdx;

  if (!hasDroppablePadding && !needsFastStart) {
    return { buffer, optimized: false, fastStartApplied: false, bytesSaved: 0 };
  }

  const keptBoxes = boxes.filter((b) => !DROPPABLE_PADDING_BOXES.has(b.type));

  // Reorder so `ftyp` stays first, `moov` sits immediately before the first `mdat`, rest keep order
  let reordered;
  if (needsFastStart) {
    const ftypBoxes = [];
    const moovBoxes = [];
    const preMdatOthers = [];
    const mdatAndPost = [];
    let seenMdat = false;

    for (const box of keptBoxes) {
      if (box.type === 'ftyp') {
        ftypBoxes.push(box);
      } else if (box.type === 'moov') {
        moovBoxes.push(box);
      } else if (box.type === 'mdat' || seenMdat) {
        seenMdat = true;
        mdatAndPost.push(box);
      } else {
        preMdatOthers.push(box);
      }
    }
    reordered = [...ftypBoxes, ...preMdatOthers, ...moovBoxes, ...mdatAndPost];
  } else {
    reordered = keptBoxes;
  }

  // Compute new byte positions to derive exact per-box deltas
  let newCursor = 0;
  const layout = reordered.map((box) => {
    const clonedData = box.type === 'moov' ? Buffer.from(box.data) : box.data;
    const entry = {
      type: box.type,
      oldStart: box.oldStart,
      oldEnd: box.oldEnd,
      newStart: newCursor,
      delta: newCursor - box.oldStart,
      data: clonedData,
    };
    newCursor += box.data.length;
    return entry;
  });

  const shiftOffsetForChunk = (oldOffset) => {
    for (const entry of layout) {
      if (oldOffset >= entry.oldStart && oldOffset < entry.oldEnd) {
        return oldOffset + entry.delta;
      }
    }
    return oldOffset;
  };

  for (const entry of layout) {
    if (entry.type === 'moov') {
      // Walk children inside `moov` container (bytes 8..end)
      patchMoovChunkOffsets(entry.data.subarray(8), shiftOffsetForChunk);
    }
  }

  const finalBuffer = Buffer.concat(layout.map((l) => l.data));
  const bytesSaved = Math.max(0, buffer.length - finalBuffer.length);

  return {
    buffer: finalBuffer,
    optimized: bytesSaved > 0 || needsFastStart,
    fastStartApplied: needsFastStart || (moovIdx >= 0 && (firstMdatIdx < 0 || moovIdx < firstMdatIdx)),
    bytesSaved,
  };
}

async function probeVideoWithFfprobe(inputPath, ffprobePath) {
  if (!ffprobePath) return {};
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ],
      { timeout: 10000 }
    );
    const parsed = JSON.parse(stdout || '{}');
    const videoStream = Array.isArray(parsed.streams)
      ? parsed.streams.find((s) => s.codec_type === 'video')
      : null;
    const durationNum = Number(parsed.format?.duration || videoStream?.duration);
    return {
      width: Number.isFinite(Number(videoStream?.width)) ? Number(videoStream.width) : null,
      height: Number.isFinite(Number(videoStream?.height)) ? Number(videoStream.height) : null,
      duration: Number.isFinite(durationNum) && durationNum > 0 ? Number(durationNum.toFixed(2)) : null,
      codec: videoStream?.codec_name || null,
    };
  } catch {
    return {};
  }
}

/**
 * Optimizes a video buffer using native `ffmpeg` (visually-lossless CRF 18 H.264 / CRF 22 VP9 + faststart)
 * when available, and always guarantees at least lossless MP4 box optimization without quality loss.
 */
export async function optimizeVideoBuffer(
  inputBuffer,
  { filename = 'event-video.mp4', mimeType = 'video/mp4', useFfmpeg = true } = {}
) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    throw new Error('Video buffer is empty or invalid.');
  }

  const detected = detectVideoContainer(inputBuffer, mimeType, filename);
  if (!detected.valid) {
    throw new Error('Invalid or unsupported video container signature. Allowed: MP4, M4V, MOV, WebM.');
  }

  const originalSize = inputBuffer.length;
  const safeBaseName = path.basename(filename || `event-video.${detected.ext}`, path.extname(filename || '')) || 'event-video';
  const normalizedFilename = `${safeBaseName}.${detected.ext === 'mov' || detected.ext === 'm4v' ? 'mp4' : detected.ext}`;

  let bestBuffer = inputBuffer;
  let method = 'passthrough';
  let fastStartApplied = false;
  let metadata = { width: null, height: null, duration: null, codec: null };

  // 1. Always run fast, pure lossless ISO BMFF pass on MP4/MOV/M4V as baseline
  if (detected.container === 'mp4') {
    const lossless = optimizeMp4BoxesLossless(inputBuffer);
    if (lossless.optimized && lossless.buffer.length <= bestBuffer.length) {
      bestBuffer = lossless.buffer;
      method = 'mp4-faststart-lossless-strip';
      fastStartApplied = lossless.fastStartApplied;
    } else if (lossless.fastStartApplied) {
      fastStartApplied = true;
    }
  }

  // 2. If native ffmpeg exists on host, perform visually-lossless CRF 18 compression
  if (useFfmpeg) {
    const { ffmpegPath, ffprobePath } = await resolveFfmpegBinaries();
    if (ffmpegPath) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kalceria-video-'));
      const inPath = path.join(tmpDir, `input.${detected.ext}`);
      const isWebm = detected.container === 'webm';
      const outExt = isWebm ? 'webm' : 'mp4';
      const outPath = path.join(tmpDir, `output.${outExt}`);

      try {
        await fs.writeFile(inPath, inputBuffer);
        metadata = await probeVideoWithFfprobe(inPath, ffprobePath);

        const ffmpegArgs = isWebm
          ? [
              '-y',
              '-i',
              inPath,
              '-c:v',
              'libvpx-vp9',
              '-crf',
              '22',
              '-b:v',
              '0',
              '-row-mt',
              '1',
              '-c:a',
              'libopus',
              '-b:a',
              '96k',
              outPath,
            ]
          : [
              '-y',
              '-i',
              inPath,
              '-c:v',
              'libx264',
              '-preset',
              'slow',
              '-crf',
              '18',
              '-pix_fmt',
              'yuv420p',
              '-movflags',
              '+faststart',
              '-c:a',
              'aac',
              '-b:a',
              '128k',
              outPath,
            ];

        await execFileAsync(ffmpegPath, ffmpegArgs, { timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
        const encodedBuffer = await fs.readFile(outPath);

        // Adopt only if compression strictly reduces byte footprint (never inflate storage)
        if (encodedBuffer.length > 0 && encodedBuffer.length < bestBuffer.length) {
          bestBuffer = encodedBuffer;
          method = isWebm ? 'ffmpeg-vp9-visually-lossless' : 'ffmpeg-h264-crf18-faststart';
          fastStartApplied = !isWebm;
          const outMeta = await probeVideoWithFfprobe(outPath, ffprobePath);
          metadata = { ...metadata, ...outMeta };
        }
      } catch (err) {
        console.warn('[VideoOptimizer] ffmpeg compression skipped/fallback:', err.message);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  const optimizedSize = bestBuffer.length;
  const reductionPercent = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100))
    : 0;

  const finalContentType = detected.container === 'webm'
    ? 'video/webm'
    : bestBuffer !== inputBuffer && method.startsWith('ffmpeg-h264')
      ? 'video/mp4'
      : detected.contentType;

  return {
    buffer: bestBuffer,
    contentType: finalContentType,
    filename: normalizedFilename,
    originalSize,
    optimizedSize,
    reductionPercent,
    isOptimized: optimizedSize < originalSize || fastStartApplied,
    fastStartApplied,
    method,
    metadata,
  };
}

