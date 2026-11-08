// ── Deserialization, Prototype Pollution & Injection Inspection ──────────────
export const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export const MAX_PAYLOAD_DEPTH = 8;
export const MAX_INSPECTED_NODES = 500;
export const MAX_STRING_INSPECT_LEN = 10_000;

// Requires SQL syntax context (quotes, comments, semicolons, or table keywords) to avoid false positives on normal English sentences
export const SQL_INJECTION_PATTERN =
  /(?:\bunion\s+(?:all\s+)?select\b|\bdrop\s+table\b|\balter\s+table\b|\bexec(?:\s|\+)+(?:s|x)p_|\bwaitfor\s+delay\b|;\s*(?:drop|delete|insert|update|alter)\b)/i;
export const SQL_LOGIC_BYPASS_PATTERN =
  /(?:'|%27)\s*(?:or|and)\s*['"]?[a-z0-9_]+['"]?\s*=\s*['"]?[a-z0-9_]+/i;
export const XSS_SCRIPT_PATTERN =
  /<script[\s/>]|<\/script>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|<iframe[\s/>]|<object[\s/>]|<embed[\s/>]|\bon[a-z]{3,20}\s*=/i;

export function inspectPayloadSafety(obj, depth = 0, state = { nodes: 0, maxStringLen: MAX_STRING_INSPECT_LEN }) {
  if (depth > MAX_PAYLOAD_DEPTH) {
    return { safe: false, reason: 'Payload depth exceeds allowed limits.' };
  }
  state.nodes += 1;
  if (state.nodes > MAX_INSPECTED_NODES) {
    return { safe: false, reason: 'Payload complexity exceeds allowed limits.' };
  }

  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      const limit = state.maxStringLen || MAX_STRING_INSPECT_LEN;
      if (obj.length > limit) {
        return { safe: false, reason: 'Field length exceeds maximum security limit.' };
      }
      if (!state.skipPatternRegex) {
        if (XSS_SCRIPT_PATTERN.test(obj)) {
          return { safe: false, reason: 'Disallowed script injection detected.' };
        }
        if (SQL_INJECTION_PATTERN.test(obj) || SQL_LOGIC_BYPASS_PATTERN.test(obj)) {
          return { safe: false, reason: 'Disallowed SQL injection pattern detected.' };
        }
      }
    }
    return { safe: true };
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const check = inspectPayloadSafety(item, depth + 1, state);
      if (!check.safe) return check;
    }
    return { safe: true };
  }

  for (const key of Object.keys(obj)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key) || key.includes('__proto__')) {
      return { safe: false, reason: 'Prototype pollution attempt detected.' };
    }
    if (key.startsWith('$') || key.includes('.')) {
      return { safe: false, reason: 'Operator injection attempt detected.' };
    }
    const isLargeMediaField =
      key === 'ciphertext' ||
      key === 'mediaUrl' ||
      key === 'encryptedPayload' ||
      key === 'rtcPayload' ||
      key === 'description' ||
      key === 'profilePicture' ||
      key === 'coverImage' ||
      key === 'coverUrl';
    const isBase64MediaDataUrl =
      (key === 'profilePicture' || key === 'coverImage' || key === 'coverUrl') &&
      typeof obj[key] === 'string' &&
      /^data:(?:image|video)\/(?:webp|png|jpeg|jpg|gif|mp4|webm);base64,[A-Za-z0-9+/=\s]+$/i.test(obj[key]);
    const isOpaqueCryptoField =
      key === 'ciphertext' ||
      key === 'iv' ||
      key === 'sig' ||
      key === 'nonce' ||
      key === 'code' ||
      key === 'state' ||
      key === 'cityToken' ||
      key === 'encryptedPayload' ||
      key === 'rtcPayload' ||
      key === 'mediaUrl' ||
      isBase64MediaDataUrl;
    const childState = {
      ...state,
      maxStringLen: isLargeMediaField ? 16_000_000 : state.maxStringLen,
      skipPatternRegex: isOpaqueCryptoField ? true : state.skipPatternRegex,
    };
    const check = inspectPayloadSafety(obj[key], depth + 1, childState);
    if (!check.safe) return check;
    state.nodes = childState.nodes;
  }
  return { safe: true };
}

// ── Global Payload Defense Middleware ─────────────────────────────────────────
export function globalPayloadDefense(req, res, next) {
  if (req.body) {
    const bodyCheck = inspectPayloadSafety(req.body);
    if (!bodyCheck.safe) {
      return res.status(400).json({ error: `Malicious payload rejected: ${bodyCheck.reason}` });
    }
  }
  if (req.query) {
    const queryCheck = inspectPayloadSafety(req.query);
    if (!queryCheck.safe) {
      return res.status(400).json({ error: `Malicious query rejected: ${queryCheck.reason}` });
    }
  }
  if (req.params) {
    const paramsCheck = inspectPayloadSafety(req.params);
    if (!paramsCheck.safe) {
      return res.status(400).json({ error: `Malicious parameter rejected: ${paramsCheck.reason}` });
    }
  }
  req._payloadInspected = true;
  return next();
}
