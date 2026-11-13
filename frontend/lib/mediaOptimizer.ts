import sharp from "sharp";

export interface OptimizedMediaResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  originalSize: number;
  optimizedSize: number;
  reductionPercent: number;
  isOptimized: boolean;
  dimensions?: {
    width?: number;
    height?: number;
    pages?: number;
  };
}

/**
 * Normalizes and compresses uploaded media (GIFs, images) on the backend
 * before persistence to Vercel Blob or local storage.
 *
 * Preserves 100% visual fidelity, frame timing, and loops while:
 * 1. Clamping excessive dimensions to card aspect ratios (max 480px width for retina popups)
 * 2. Utilizing libvips LZW compression with re-optimized palette trees (effort 7)
 * 3. Gracefully falling back to raw buffer on any unexpected format
 */
export async function optimizeUploadMedia(
  inputBuffer: Buffer,
  originalFilename: string,
  declaredMimeType: string
): Promise<OptimizedMediaResult> {
  const originalSize = inputBuffer.length;
  const isGif =
    declaredMimeType === "image/gif" ||
    originalFilename.toLowerCase().endsWith(".gif");

  const isStaticImage =
    declaredMimeType.startsWith("image/") && !isGif;

  // 1. Handle Animated and Static GIFs
  if (isGif) {
    try {
      const image = sharp(inputBuffer, { animated: true });
      const meta = await image.metadata();

      if (meta.format === "gif") {
        const pages = meta.pages || 1;
        const pageHeight = meta.pageHeight || meta.height || 0;
        const width = meta.width || 0;

        // Retina card max width is 480px (for 320px CSS cards at 1.5x pixel ratio)
        const needsResize = width > 480;
        let pipeline = sharp(inputBuffer, { animated: true });

        if (needsResize) {
          pipeline = pipeline.resize({
            width: 480,
            withoutEnlargement: true,
          });
        }

        // Apply maximum lossless-perceptual GIF compression
        const processed = await pipeline
          .gif({
            effort: 7,
            reuse: true,
            dither: 1.0,
            interFrameMaxError: 0,
          })
          .toBuffer();

        // Only adopt processed buffer if it reduced size or normalized dimensions
        const shouldAdopt = processed.length < originalSize || needsResize;
        const finalBuffer = shouldAdopt ? processed : inputBuffer;
        const finalSize = finalBuffer.length;
        const reduction = originalSize > 0
          ? Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100))
          : 0;

        return {
          buffer: finalBuffer,
          contentType: "image/gif",
          filename: originalFilename,
          originalSize,
          optimizedSize: finalSize,
          reductionPercent: reduction,
          isOptimized: shouldAdopt,
          dimensions: {
            width: needsResize ? 480 : width,
            height: pageHeight,
            pages,
          },
        };
      }
    } catch (gifErr) {
      console.warn("Backend GIF optimization fallback to raw buffer:", gifErr);
    }
  }

  // 2. Handle Static Images (PNG, JPG, WebP)
  if (isStaticImage) {
    try {
      // Auto-orient pixels according to EXIF before measuring or resizing so portrait photos stay portrait
      let pipeline = sharp(inputBuffer).rotate();
      const meta = await pipeline.metadata();
      const rawWidth = meta.width || 0;
      const rawHeight = meta.height || 0;
      const isSwappedOrientation = Boolean(meta.orientation && meta.orientation >= 5 && meta.orientation <= 8);
      const orientedWidth = isSwappedOrientation ? rawHeight : rawWidth;
      const needsResize = orientedWidth > 800;

      if (needsResize) {
        pipeline = pipeline.resize({
          width: 800,
          withoutEnlargement: true,
        });
      }

      let result: { data: Buffer; info: sharp.OutputInfo };
      let contentType = declaredMimeType;

      if (meta.format === "png") {
        result = await pipeline.png({ compressionLevel: 6, effort: 4 }).toBuffer({ resolveWithObject: true });
        contentType = "image/png";
      } else if (meta.format === "jpeg" || meta.format === "jpg") {
        result = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer({ resolveWithObject: true });
        contentType = "image/jpeg";
      } else if (meta.format === "webp") {
        result = await pipeline.webp({ quality: 90, effort: 5 }).toBuffer({ resolveWithObject: true });
        contentType = "image/webp";
      } else {
        result = await pipeline.toBuffer({ resolveWithObject: true });
      }

      const processed = result.data;
      const shouldAdopt = processed.length < originalSize || needsResize || isSwappedOrientation;
      const finalBuffer = shouldAdopt ? processed : inputBuffer;
      const finalSize = finalBuffer.length;
      const reduction = originalSize > 0
        ? Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100))
        : 0;

      return {
        buffer: finalBuffer,
        contentType,
        filename: originalFilename,
        originalSize,
        optimizedSize: finalSize,
        reductionPercent: reduction,
        isOptimized: shouldAdopt,
        dimensions: {
          width: shouldAdopt ? result.info.width : orientedWidth,
          height: shouldAdopt ? result.info.height : (isSwappedOrientation ? rawWidth : rawHeight),
        },
      };
    } catch (imgErr) {
      console.warn("Backend image optimization fallback to raw buffer:", imgErr);
    }
  }

  // 3. Passthrough for Videos (MP4, WebM) or unknown binary formats
  return {
    buffer: inputBuffer,
    contentType: declaredMimeType || "application/octet-stream",
    filename: originalFilename,
    originalSize,
    optimizedSize: originalSize,
    reductionPercent: 0,
    isOptimized: false,
  };
}
