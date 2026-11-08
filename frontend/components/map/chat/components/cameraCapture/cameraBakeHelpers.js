export async function bakePhotoCropAndRotation(
  previewMedia,
  photoRotation,
  cropRect,
  previewViewportRef
) {
  const hasCustomCrop =
    cropRect.left > 0.005 ||
    cropRect.top > 0.005 ||
    cropRect.right < 0.995 ||
    cropRect.bottom < 0.995;

  if (previewMedia.type !== "photo" || (photoRotation === 0 && !hasCustomCrop) || !previewMedia.url) {
    return null;
  }

  try {
    return await new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const srcW = img.naturalWidth || 640;
        const srcH = img.naturalHeight || 480;

        // 1. Rotate source onto an intermediate canvas matching the 3:4 preview viewport
        const vpRect = previewViewportRef.current?.getBoundingClientRect();
        const vpW = Math.round(vpRect?.width || 360) * 2;
        const vpH = Math.round(vpRect?.height || 480) * 2;
        const stageCanvas = document.createElement("canvas");
        stageCanvas.width = vpW;
        stageCanvas.height = vpH;
        const stageCtx = stageCanvas.getContext("2d");

        const rad = ((photoRotation % 360) * Math.PI) / 180;
        stageCtx.save();
        stageCtx.translate(vpW / 2, vpH / 2);
        stageCtx.rotate(rad);

        // Replicate CSS object-cover inside the viewport
        const scale = Math.max(vpW / srcW, vpH / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        stageCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        stageCtx.restore();

        // 2. Extract exact user-dragged cropRect from the stage canvas
        const cropX = Math.round(vpW * cropRect.left);
        const cropY = Math.round(vpH * cropRect.top);
        const cropW = Math.max(32, Math.round(vpW * (cropRect.right - cropRect.left)));
        const cropH = Math.max(32, Math.round(vpH * (cropRect.bottom - cropRect.top)));

        const outCanvas = document.createElement("canvas");
        outCanvas.width = cropW;
        outCanvas.height = cropH;
        const outCtx = outCanvas.getContext("2d");
        outCtx.drawImage(stageCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        outCanvas.toBlob(
          (b) => {
            if (b) {
              resolve({ blob: b, url: URL.createObjectURL(b) });
            } else {
              resolve(null);
            }
          },
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => resolve(null);
      img.src = previewMedia.url;
    });
  } catch {
    return null;
  }
}

export function computeVideoTrimFragment(trimStart, trimEnd, dur) {
  if (trimStart > 0.005 || trimEnd < 0.995) {
    const startSec = Number((trimStart * dur).toFixed(2));
    const endSec = Number((trimEnd * dur).toFixed(2));
    if (endSec > startSec) {
      return `#t=${startSec},${endSec}`;
    }
  }
  return "";
}
