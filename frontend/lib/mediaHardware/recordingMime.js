const VIDEO_RECORDING_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
];

/**
 * Returns the first MediaRecorder container/codec combination (with an audio codec)
 * supported by the current browser, or an empty string to let the browser decide.
 */
export function pickSupportedVideoRecordingMime() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return VIDEO_RECORDING_MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

