import crypto from 'node:crypto';

// ── Ingress Resolution & Client Identification ──────────────────────────────
export function cleanIpString(rawIp) {
  if (!rawIp) return '';
  let s = String(rawIp).trim().replace(/^::ffff:/i, '');

  // Bracketed IPv6 with optional port: [2001:db8::1]:8080 -> 2001:db8::1
  if (s.startsWith('[')) {
    const closeIdx = s.indexOf(']');
    if (closeIdx !== -1) {
      return s.slice(1, closeIdx);
    }
  }

  // Only strip :port if it is an IPv4 address (contains dots and a single colon)
  const colonCount = (s.match(/:/g) || []).length;
  if (s.includes('.') && colonCount === 1) {
    s = s.replace(/:\d+$/, '');
  }

  return s;
}

export function resolveClientIp(req) {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare ingress (only trust if behind Cloudflare or trusted proxy)
  const cf = req.headers?.['cf-connecting-ip'];
  if (cf) {
    const cleaned = cleanIpString(cf);
    if (cleaned) return cleaned;
  }

  // 2. Standard RFC 7239 Forwarded header
  const fwd = req.headers?.['forwarded'];
  if (fwd) {
    const match = /for="?([^;,"]+)/i.exec(fwd);
    if (match?.[1]) {
      const cleaned = cleanIpString(match[1]);
      if (cleaned && cleaned !== 'unknown') return cleaned;
    }
  }

  // 3. X-Forwarded-For (leftmost client address)
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const first = cleanIpString(String(xff).split(',')[0]);
    if (first && first !== 'unknown') return first;
  }

  // 4. X-Real-IP
  const real = req.headers?.['x-real-ip'];
  if (real) {
    const cleaned = cleanIpString(real);
    if (cleaned) return cleaned;
  }

  // 5. Socket remote address / req.ip
  const direct = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return cleanIpString(direct) || '127.0.0.1';
}

export function resolveClientFingerprint(req) {
  const ip = resolveClientIp(req);
  const rawTag = String(
    req.headers?.['x-client-fingerprint'] || req.headers?.['x-machine-tag'] || ''
  ).trim().slice(0, 128);
  const ua = String(req.headers?.['user-agent'] || '').slice(0, 256);
  const acceptLang = String(req.headers?.['accept-language'] || '').slice(0, 64);
  const secChUa = String(req.headers?.['sec-ch-ua'] || '').slice(0, 128);

  // Hash browser/device traits + /24 IPv4 prefix (or IP) so fingerprint is resilient
  const raw = `${rawTag}|${ua}|${acceptLang}|${secChUa}`;
  const ipBoundFp = `${ip}|${raw}`;

  return {
    ip,
    machineTag: rawTag
      ? crypto.createHash('sha256').update(rawTag).digest('hex')
      : null,
    fingerprint: crypto.createHash('sha256').update(ipBoundFp).digest('hex'),
  };
}

// ── Layer 7 Botnet & Attack Tool Detection ───────────────────────────────────
export function checkL7Botnet(req) {
  const ua = req.headers?.['user-agent'] || '';
  return /loic|hoic|slowloris|nikto|sqlmap|masscan|morfeus|havij|acunetix|dirbuster|gobuster|wpscan|hydra|zgrab|nmap/i.test(ua);
}
