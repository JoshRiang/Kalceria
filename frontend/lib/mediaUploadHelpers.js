/**
 * Pure media upload validation, filename formatting, and error normalization helpers.
 * Zero framework/alias dependencies so it runs natively in both Next.js and Node --test.
 */

export const MAX_MEDIA_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export const ALLOWED_MEDIA_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "mp4",
  "m4v",
  "mp4v",
  "mpg4",
  "mov",
  "3gp",
  "webm",
];

export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm"];

export const MIME_TO_EXT_MAP = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/x-m4v": "m4v",
  "video/mp4v-es": "mp4",
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "video/webm": "webm",
};

/**
 * Validates size, extension, and MIME type (falling back to MIME when filename lacks an extension).
 */
export function validateMediaUploadFile(file) {
  if (!file) {
    return { valid: false, error: "File tidak ditemukan." };
  }

  if (typeof file.size === "number" && file.size > MAX_MEDIA_UPLOAD_BYTES) {
    return {
      valid: false,
      error: "Ukuran file melebihi batas 4.5 MB. Maksimal ukuran file adalah 4.5 MB.",
    };
  }

  const rawName = String(file.name || "");
  const parts = rawName.split(".");
  let ext = parts.length > 1 ? String(parts.pop() || "").trim().toLowerCase() : "";
  const rawMime = String(file.type || "").split(";")[0].trim().toLowerCase();

  if (!ext || ext === "blob" || !ALLOWED_MEDIA_EXTENSIONS.includes(ext)) {
    const mappedExt = MIME_TO_EXT_MAP[rawMime];
    if (mappedExt) {
      ext = mappedExt;
    } else if (rawMime.startsWith("video/")) {
      ext = "mp4";
    } else if (rawMime === "image/gif") {
      return {
        valid: false,
        error: "Hanya file gambar (.png, .jpeg, .webp) dan video (.mp4, .m4v, .mov, .webm) yang diizinkan",
      };
    }
  }

  if (!ALLOWED_MEDIA_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: "Hanya file gambar (.png, .jpeg, .webp) dan video (.mp4, .m4v, .mov, .webm) yang diizinkan",
    };
  }

  const isVideo = rawMime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext);
  return { valid: true, ext, isVideo };
}

/**
 * Strips storage UUIDs, timestamps, and random hashes from raw filenames.
 */
export function cleanMediaFilename(rawName) {
  if (!rawName) return "media-file";
  if (rawName.startsWith("data:") || rawName.includes(";base64")) return "uploaded-media";
  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {}
  decoded = decoded.replace(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[-_]/i,
    ""
  );
  decoded = decoded.replace(/^\d{9,}[-_]/, "");
  decoded = decoded.replace(/-[a-zA-Z0-9_-]{16,40}(?=\.[a-zA-Z0-9]+$)/, "");
  return decoded || "media-file";
}

/**
 * Formats a persisted or preview media URL into a clean display filename.
 */
export function formatMediaDisplayName(url, fileNamesMap = null) {
  if (!url) return "";
  if (fileNamesMap && fileNamesMap[url]) return fileNamesMap[url];
  if (url.startsWith("blob:") || url.startsWith("data:") || url.includes(";base64")) {
    return "uploaded-media";
  }
  if (url.includes("/api/blob/raw")) {
    try {
      const inner = new URL(url, "https://kalceria.internal").searchParams.get("url") || "";
      const parts = inner.split("/");
      const last = parts[parts.length - 1];
      return cleanMediaFilename(last);
    } catch {
      return "uploaded-media";
    }
  }
  try {
    const u = new URL(url, "https://kalceria.internal");
    const name = u.pathname.split("/").pop();
    if (name) return cleanMediaFilename(name);
  } catch {}
  return cleanMediaFilename(url);
}

/**
 * Normalizes raw browser/network/abort exceptions into clear user-facing Indonesian messages.
 * Guarantees raw DOMException strings like "signal is aborted without reason" are never shown.
 */
export function normalizeUploadErrorMessage(
  err,
  fallbackMsg = "Gagal mengunggah media. Silakan coba lagi."
) {
  const status = err?.response?.status || err?.status;
  if (status === 413) {
    return "Ukuran file melebihi batas 4.5 MB. Mohon gunakan file dengan ukuran lebih kecil.";
  }

  const raw = String(err?.response?.data?.error || err?.message || "").trim();
  const lower = raw.toLowerCase();

  if (
    err?.name === "AbortError" ||
    lower.includes("aborted") ||
    lower.includes("signal is aborted")
  ) {
    return "Waktu unggah habis atau proses terhenti. Silakan coba lagi.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("networkerror") ||
    lower.includes("load failed")
  ) {
    return "Koneksi terganggu saat mengunggah media. Periksa jaringan Anda lalu coba lagi.";
  }

  return raw || fallbackMsg;
}

