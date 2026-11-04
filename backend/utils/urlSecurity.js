/**
 * URL Normalization and Security Sanitizer
 * Defends against:
 * - Serialization / deserialization exploits (PHP/Java/Python serialized markers, prototype pollution)
 * - Path enumeration / Directory traversal (.., %2e%2e, null bytes %00, \0)
 * - Remote File Inclusion (RFI) & SSRF (blocking localhost, 127.0.0.1, RFC 1918 private ranges, AWS/GCP metadata)
 * - Local File Inclusion (LFI) & Scheme Injection (blocking file://, javascript:, data:, ftp://, etc.)
 * - MIME / Extension enforcement: strictly .png, .jpg, .jpeg, .mp4
 */

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /metadata\.google\.internal/i,
  /169\.254\.169\.254/,
  /instance-data/i,
];

const VALID_MEDIA_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.mp4'];

export function sanitizeAndNormalizeMediaUrl(rawInput) {
  if (rawInput === undefined || rawInput === null || rawInput === '') {
    return { valid: true, normalized: null };
  }

  if (typeof rawInput !== 'string') {
    return { valid: false, error: 'URL harus berupa teks string.' };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: true, normalized: null };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: 'Panjang URL melebihi batas maksimum 2048 karakter.' };
  }

  // 1. Check for null bytes, unprintable control characters, or percent-encoded nulls
  if (/[\x00-\x1F\x7F]/.test(trimmed) || /%00|\0/i.test(trimmed)) {
    return { valid: false, error: 'URL mengandung karakter kontrol ilegal atau null bytes.' };
  }

  // 2. Check for serialized object indicators (PHP/Java/Python/YAML)
  if (/(?:^|\W)(?:[OaCs]:\d+:|rO0AB|aced0005)/i.test(trimmed)) {
    return { valid: false, error: 'URL mengandung pola serialisasi terlarang.' };
  }

  // 3. Prototype pollution defense
  if (/\b(?:__proto__|constructor|prototype)\b/i.test(trimmed)) {
    return { valid: false, error: 'URL mengandung payload prototype yang mencurigakan.' };
  }

  // Support comma-separated URLs
  const rawUrls = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  if (rawUrls.length === 0) {
    return { valid: true, normalized: null };
  }

  const normalizedList = [];

  for (const item of rawUrls) {
    // Check for directory traversal sequences anywhere in the URL string
    if (item.includes('..') || /%2e%2e|\.\.%2f|\.\.%5c/i.test(item)) {
      return { valid: false, error: 'Terdeteksi upaya path traversal / enumerasi direktori dalam URL.' };
    }

    // Relative internal paths (e.g. /media/gifs/event_cafe_1.mp4)
    if (item.startsWith('/media/')) {
      const extMatch = item.match(/\.([a-z0-9]+)(?:[\?#]|$)/i);
      const ext = extMatch ? '.' + extMatch[1].toLowerCase() : '';
      if (!VALID_MEDIA_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Format media tidak diizinkan. Hanya .png, .jpeg, dan .mp4 yang diterima.' };
      }
      normalizedList.push(item);
      continue;
    }

    let parsed;
    try {
      parsed = new URL(item);
    } catch {
      return { valid: false, error: 'Format URL tidak valid.' };
    }

    // Strictly enforce HTTPS protocol (allow HTTP strictly in non-production local development)
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (parsed.protocol !== 'https:') {
        return { valid: false, error: 'Hanya protokol HTTPS yang diizinkan untuk keamanan media.' };
      }
    } else {
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { valid: false, error: 'Hanya protokol HTTPS / HTTP yang diizinkan.' };
      }
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block SSRF / Private LAN / Cloud Metadata IP addresses
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          error: 'Akses ke alamat jaringan internal / privat / localhost dilarang keras demi keamanan.',
        };
      }
    }

    // Check pathname traversal
    const pathname = parsed.pathname;
    if (pathname.includes('..') || /%2e/i.test(pathname)) {
      return { valid: false, error: 'Terdeteksi path traversal dalam URL media.' };
    }

    // Validate media file extension: must be .png, .jpg, .jpeg, or .mp4
    const extMatch = pathname.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? '.' + extMatch[1].toLowerCase() : '';

    if (!VALID_MEDIA_EXTENSIONS.includes(ext)) {
      // If hosted on trusted blob storage (e.g. Vercel Blob), check if file name contains valid ext
      const isTrustedStorage =
        hostname.endsWith('public.blob.vercel-storage.com') ||
        hostname.endsWith('blob.vercel-storage.com');

      if (!isTrustedStorage || !VALID_MEDIA_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Ekstensi file tidak diizinkan. Hanya file .png, .jpeg, dan .mp4 yang diterima.' };
      }
    }

    // Sanitize query parameters: disallow script tags, quotes, or eval markers
    if (parsed.search && (/[<>'"`\\]/.test(parsed.search) || /script|javascript|onerror/i.test(parsed.search))) {
      return { valid: false, error: 'URL mengandung parameter query yang mencurigakan atau berbahaya.' };
    }

    // Canonical normalized URL
    normalizedList.push(parsed.href);
  }

  return { valid: true, normalized: normalizedList.join(', ') };
}

