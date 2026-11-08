"use client";

/**
 * Inspects real hardware camera capabilities (multi-camera flip and LED torch/flash).
 * Never stubs or fakes support when underlying device drivers lack capabilities.
 */
export async function probeVideoDeviceCapabilities(stream) {
  let canFlipCamera = false;
  let hasFlash = false;

  if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      canFlipCamera = videoInputs.length >= 2;
    } catch {
      canFlipCamera = false;
    }
  }

  if (stream && typeof stream.getVideoTracks === "function") {
    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack && typeof videoTrack.getCapabilities === "function") {
      try {
        const caps = videoTrack.getCapabilities();
        const supportsTorchBoolean = Boolean(caps?.torch);
        const supportsFillLight =
          Array.isArray(caps?.fillLightMode) &&
          caps.fillLightMode.some((mode) => mode === "flash" || mode === "torch");
        hasFlash = supportsTorchBoolean || supportsFillLight;
      } catch {
        hasFlash = false;
      }
    }
  }

  return { canFlipCamera, hasFlash };
}

/**
 * Applies real OS/hardware LED torch constraints to an active MediaStream video track.
 */
export async function applyCameraTorch(stream, enabled) {
  if (!stream || typeof stream.getVideoTracks !== "function") {
    return { supported: false, active: false };
  }

  const [videoTrack] = stream.getVideoTracks();
  if (!videoTrack || typeof videoTrack.applyConstraints !== "function") {
    return { supported: false, active: false };
  }

  const caps = typeof videoTrack.getCapabilities === "function" ? videoTrack.getCapabilities() : {};
  const targetState = Boolean(enabled);

  if (caps?.torch) {
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: targetState }],
      });
      return { supported: true, active: targetState };
    } catch {
      // Fallback to direct constraint form on some Chromium mobile builds
      try {
        await videoTrack.applyConstraints({ torch: targetState });
        return { supported: true, active: targetState };
      } catch {
        return { supported: true, active: !targetState };
      }
    }
  }

  if (
    Array.isArray(caps?.fillLightMode) &&
    caps.fillLightMode.some((mode) => mode === "flash" || mode === "torch")
  ) {
    try {
      const preferredMode = caps.fillLightMode.includes("torch") ? "torch" : "flash";
      await videoTrack.applyConstraints({
        advanced: [{ fillLightMode: targetState ? preferredMode : "off" }],
      });
      return { supported: true, active: targetState };
    } catch {
      return { supported: true, active: !targetState };
    }
  }

  return { supported: false, active: false };
}

