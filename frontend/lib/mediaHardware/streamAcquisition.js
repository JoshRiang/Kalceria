// Safe Hardware Pipeline for Microphone & Camera operations.
// Protects hardware from dangling locks, OS device contention, and memory leaks.

import { alignStreamOrientation, buildCameraConstraintTiers } from "./cameraConstraints";

export const DESKTOP_FLAG = false;

/**
 * Safely releases and stops all tracks of a MediaStream.
 * Ensures the OS camera/mic activity LED turns off and locks are freed immediately.
 */
export function stopMediaStream(stream) {
  if (!stream) return null;
  try {
    const tracks = stream.getTracks ? stream.getTracks() : [];
    tracks.forEach((track) => {
      try {
        track.enabled = false;
        track.stop();
        if (typeof track.onended === "function") track.onended = null;
        if (typeof track.onerror === "function") track.onerror = null;
      } catch {}
    });
  } catch {}
  return null;
}

/**
 * Acquires a secure microphone audio stream.
 * Enforces echo cancellation, noise suppression, and auto gain control.
 */
export async function acquireMicrophoneStream(customConstraints = {}) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("HARDWARE_NOT_SUPPORTED");
  }

  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...customConstraints,
    },
    video: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (fallbackErr) {
      throw translateMediaHardwareError(fallbackErr, "mic");
    }
  }
}

/**
 * Acquires a secure camera (and optional microphone) stream with full-frame orientation awareness
 * and multi-stage hardware driver fallbacks so wide sensors are never cropped to 4:3.
 */
export async function acquireCameraStream(customVideoConstraints = {}, includeAudio = true) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("HARDWARE_NOT_SUPPORTED");
  }

  const baseAudio = includeAudio
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    : false;

  let lastError = null;

  // Tiered acquisition: every tier keeps the viewport-aware portrait/landscape hints.
  for (const tier of buildCameraConstraintTiers(customVideoConstraints, baseAudio)) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(tier);
      return await alignStreamOrientation(stream);
    } catch (err) {
      lastError = err;
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        break;
      }
    }
  }

  // Sequential track fallback: some mobile drivers reject simultaneous audio+video acquisition.
  // The video track keeps the size hints; the microphone is attached separately when available.
  if (lastError?.name !== "NotAllowedError" && lastError?.name !== "PermissionDeniedError") {
    const videoOnlyTiers = buildCameraConstraintTiers(customVideoConstraints, false);
    for (const tier of videoOnlyTiers) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia(tier);
        let aStream = null;
        if (includeAudio) {
          try {
            aStream = await navigator.mediaDevices.getUserMedia({ audio: baseAudio });
          } catch {}
        }
        const tracks = [
          ...vStream.getVideoTracks(),
          ...(aStream ? aStream.getAudioTracks() : []),
        ];
        return await alignStreamOrientation(new MediaStream(tracks));
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw translateMediaHardwareError(lastError, "camera");
}

/**
 * Translates low-level browser DOMException to safe, actionable error messages.
 */
function translateMediaHardwareError(err, hardwareType = "mic") {
  const name = err?.name || "";
  const isCam = hardwareType === "camera";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    const custom = new Error(
      isCam
        ? "Izin akses kamera atau mikrofon ditolak oleh pengguna/browser."
        : "Izin akses mikrofon ditolak oleh pengguna/browser."
    );
    custom.code = "PERMISSION_DENIED";
    return custom;
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    const custom = new Error(
      isCam
        ? "Perangkat kamera atau mikrofon tidak terdeteksi pada sistem."
        : "Perangkat mikrofon tidak terdeteksi pada sistem."
    );
    custom.code = "DEVICE_NOT_FOUND";
    return custom;
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    const custom = new Error(
      isCam
        ? "Kamera atau mikrofon sedang digunakan oleh aplikasi lain di sistem operasi."
        : "Mikrofon sedang digunakan oleh aplikasi lain di sistem operasi."
    );
    custom.code = "HARDWARE_IN_USE";
    return custom;
  }

  if (name === "OverconstrainedError") {
    const custom = new Error("Spesifikasi resolusi perangkat keras tidak didukung.");
    custom.code = "OVERCONSTRAINED";
    return custom;
  }

  const custom = new Error(err?.message || "Gagal mengakses perangkat keras.");
  custom.code = "UNKNOWN_HARDWARE_ERROR";
  return custom;
}

/**
 * Checks current permission state via Permissions API if available.
 * Returns 'granted' | 'prompt' | 'denied' | 'unknown'
 */
export async function checkHardwarePermission(type = "microphone") {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({ name: type });
    return status.state || "unknown";
  } catch {
    return "unknown";
  }
}

