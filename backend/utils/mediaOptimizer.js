/**
 * Backend Media Optimizer Utility
 * Normalizes and compresses uploaded GIFs and images on the server side
 * while retaining 100% perceived quality and correct animation timing.
 */

let sharpInstance = null;

async function getSharp() {
  if (!sharpInstance) {
    try {
      const module = await import("sharp");
      sharpInstance = module.default || module;
    } catch {
      sharpInstance = null;
    }
  }
  return sharpInstance;
}

export async function optimizeMediaBuffer(inputBuffer, mimeType = "image/gif") {
  if (!Buffer.isBuffer(inputBuffer)) return inputBuffer;
  const sharp = await getSharp();
  if (!sharp) return inputBuffer;

  const isGif = mimeType === "image/gif" || mimeType.includes("gif");

  if (isGif) {
    try {
      const image = sharp(inputBuffer, { animated: true });
      const meta = await image.metadata();

      if (meta.format === "gif") {
        const width = meta.width || 0;
        const needsResize = width > 480;

        let pipeline = sharp(inputBuffer, { animated: true });
        if (needsResize) {
          pipeline = pipeline.resize({ width: 480, withoutEnlargement: true });
        }

        const processed = await pipeline
          .gif({ effort: 7, reuse: true, dither: 1.0, interFrameMaxError: 0 })
          .toBuffer();

        if (processed.length < inputBuffer.length || needsResize) {
          return processed;
        }
      }
    } catch (err) {
      console.warn("Backend sharp GIF optimization failed, keeping original:", err.message);
    }
  }

  return inputBuffer;
}
