/**
 * Client-Side URL Normalization and Security Sanitizer
 * Mirrors backend defenses against serialization, path enumeration, RFI, SSRF, LFI, and enforces .png, .jpeg, .webp, .mp4, .webm
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

const VALID_MEDIA_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm'];
const MAX_MEDIA_URLS = 100;
const MAX_SINGLE_URL_LENGTH = 2048;
const MAX_TOTAL_URL_LIST_LENGTH = 32768;

export function splitMediaUrlListClient(rawInput) {
  if (typeof rawInput !== 'string') return [];
  const trimmed = rawInput.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/,\s*(?=(?:[a-z][a-z0-9+.-]*:|\/))/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasUnsafeQuery(search) {
  return Boolean(
    search &&
      (/[<>'"`\\]/.test(search) || /script|javascript|onerror|onload|eval\(/i.test(search))
  );
}

function isTrustedVercelBlobHost(hostname) {
  const lower = String(hostname || '').toLowerCase();
  return (
    lower === 'blob.vercel-storage.com' ||
    lower.endsWith('.blob.vercel-storage.com')
  );
}

function validatePrivateBlobProxyUrlClient(item) {
  let wrapperParsed;
  try {
    wrapperParsed = new URL(item, 'https://kalceria.internal');
  } catch {
    return { valid: false, error: 'Format proxy URL Blob tidak valid.' };
  }

  if (wrapperParsed.pathname !== '/api/blob/raw') {
    return { valid: false, error: 'Hanya endpoint proxy media resmi yang diizinkan.' };
  }

  if (hasUnsafeQuery(wrapperParsed.search)) {
    return { valid: false, error: 'URL mengandung parameter query yang mencurigakan atau berbahaya.' };
  }

  const rawInner = wrapperParsed.searchParams.get('url');
  if (!rawInner || rawInner.length > MAX_SINGLE_URL_LENGTH) {
    return { valid: false, error: 'Parameter url Blob tidak valid atau terlalu panjang.' };
  }

  if (rawInner.includes('..') || /%2e%2e|\.\.%2f|\.\.%5c/i.test(rawInner)) {
    return { valid: false, error: 'Terdeteksi upaya path traversal / enumerasi direktori dalam URL.' };
  }

  const [targetBase] = rawInner.split('#');
  let targetParsed;
  try {
    targetParsed = new URL(targetBase);
  } catch {
    return { valid: false, error: 'Target URL Blob tidak valid.' };
  }

  if (targetParsed.protocol !== 'https:') {
    return { valid: false, error: 'Hanya protokol HTTPS yang diizinkan untuk Blob storage.' };
  }

  const hostname = targetParsed.hostname.toLowerCase();
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: 'Akses ke alamat jaringan internal / privat / localhost dilarang keras demi keamanan.',
      };
    }
  }

  if (!isTrustedVercelBlobHost(hostname)) {
    return { valid: false, error: 'Proxy Blob hanya diizinkan mengakses host Vercel Blob resmi.' };
  }

  if (targetParsed.pathname.includes('..') || /%2e/i.test(targetParsed.pathname)) {
    return { valid: false, error: 'Terdeteksi path traversal dalam URL media.' };
  }

  const extMatch = targetParsed.pathname.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
  if (!VALID_MEDIA_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Ekstensi file tidak diizinkan. Hanya file .png, .jpeg, .webp, .mp4, dan .webm yang diterima.',
    };
  }

  return { valid: true, normalized: item };
}

export function validateAndNormalizeMediaUrlClient(rawInput) {
  if (rawInput === undefined || rawInput === null || rawInput === '') {
    return { valid: true, normalized: '' };
  }

  if (typeof rawInput !== 'string') {
    return { valid: false, error: 'URL harus berupa teks string.' };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }

  if (trimmed.length > MAX_TOTAL_URL_LIST_LENGTH) {
    return { valid: false, error: 'Total panjang daftar URL media melebihi batas maksimum.' };
  }

  // 1. Control chars & null bytes
  if (/[\x00-\x1F\x7F]/.test(trimmed) || /%00|\0/i.test(trimmed)) {
    return { valid: false, error: 'URL mengandung karakter kontrol ilegal atau null bytes.' };
  }

  // 2. Serialized object indicators
  if (/(?:^|\W)(?:[OaCs]:\d+:|rO0AB|aced0005)/i.test(trimmed)) {
    return { valid: false, error: 'URL mengandung pola serialisasi terlarang.' };
  }

  // 3. Prototype injection markers
  if (/\b(?:__proto__|constructor|prototype)\b/i.test(trimmed)) {
    return { valid: false, error: 'URL mengandung payload prototype yang mencurigakan.' };
  }

  const rawUrls = splitMediaUrlListClient(trimmed);
  if (rawUrls.length === 0) {
    return { valid: true, normalized: '' };
  }
  if (rawUrls.length > MAX_MEDIA_URLS) {
    return { valid: false, error: `Maksimum ${MAX_MEDIA_URLS} item media diperbolehkan.` };
  }

  const normalizedList = [];

  for (const item of rawUrls) {
    if (item.length > MAX_SINGLE_URL_LENGTH) {
      return { valid: false, error: 'Panjang URL melebihi batas maksimum 2048 karakter.' };
    }

    // Check directory traversal sequences
    if (item.includes('..') || /%2e%2e|\.\.%2f|\.\.%5c/i.test(item)) {
      return { valid: false, error: 'Terdeteksi upaya path traversal / enumerasi direktori dalam URL.' };
    }

    // Signed/private Vercel Blob proxy URL
    if (item.startsWith('/api/blob/raw')) {
      const proxyCheck = validatePrivateBlobProxyUrlClient(item);
      if (!proxyCheck.valid) return proxyCheck;
      normalizedList.push(proxyCheck.normalized);
      continue;
    }

    // Relative internal paths (e.g. /media/gifs/...)
    if (item.startsWith('/media/')) {
      const extMatch = item.match(/\.([a-z0-9]+)(?:[\?#]|$)/i);
      const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
      if (!VALID_MEDIA_EXTENSIONS.includes(ext)) {
        return {
          valid: false,
          error: 'Format media tidak diizinkan. Hanya .png, .jpeg, .webp, .mp4, dan .webm yang diterima.',
        };
      }
      normalizedList.push(item);
      continue;
    }

    let parsed;
    try {
      parsed = new URL(item);
    } catch {
      return { valid: false, error: 'Format URL tidak valid. Masukkan URL lengkap (misal https://...).' };
    }

    // Protocol validation: must be https (allow http only in localhost dev)
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (!isDev && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Hanya protokol HTTPS yang diizinkan untuk keamanan media.' };
    } else if (isDev && parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'Hanya protokol HTTPS / HTTP yang diizinkan.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // SSRF / Private LAN / Cloud Metadata IP addresses
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

    // Media file extension
    const extMatch = pathname.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    if (!VALID_MEDIA_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: 'Ekstensi file tidak diizinkan. Hanya file .png, .jpeg, .webp, .mp4, dan .webm yang diterima.',
      };
    }

    // Disallow dangerous script queries
    if (hasUnsafeQuery(parsed.search)) {
      return { valid: false, error: 'URL mengandung parameter query yang mencurigakan atau berbahaya.' };
    }

    normalizedList.push(parsed.href);
  }

  return { valid: true, normalized: normalizedList.join(', ') };
}
