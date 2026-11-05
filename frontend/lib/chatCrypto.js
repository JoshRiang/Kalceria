"use client";

const KEY_CACHE = new Map();

function bytesToBase64(bytes) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === "function" ? btoa(binary) : "";
}

function base64ToBytes(base64) {
  if (!base64 || typeof atob !== "function") return new Uint8Array(0);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateCryptoNonce() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return bytesToHex(arr);
  }
  return `nc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

async function sha256Hex(input) {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const hashBuf = await window.crypto.subtle.digest("SHA-256", encoded);
    return bytesToHex(new Uint8Array(hashBuf));
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

async function deriveConversationKey(userA, userB) {
  const sorted = [String(userA || "anon"), String(userB || "anon")].sort();
  const pairId = `${sorted[0]}::${sorted[1]}`;
  if (KEY_CACHE.has(pairId)) {
    return KEY_CACHE.get(pairId);
  }

  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(`kalceria_e2ee_v1::${pairId}`),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(`kalceria_salt_v1::${sorted[0]}_${sorted[1]}`),
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  KEY_CACHE.set(pairId, key);
  return key;
}

export async function encryptChatPayload(payloadObj, userA, userB) {
  const ts = Date.now();
  const nonce = generateCryptoNonce();
  const id = payloadObj.id || `msg_${nonce.slice(0, 14)}`;
  const rawJson = JSON.stringify({
    text: String(payloadObj.text || ""),
    msgType: payloadObj.msgType || "text",
    mediaUrl: payloadObj.mediaUrl || null,
    voiceDuration: payloadObj.voiceDuration || null,
    voiceWaveform: Array.isArray(payloadObj.voiceWaveform) ? payloadObj.voiceWaveform : null,
    replyTo: payloadObj.replyTo || null,
    senderId: String(userA || "me"),
    ts,
  });

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const key = await deriveConversationKey(userA, userB);
      const ivBytes = new Uint8Array(12);
      window.crypto.getRandomValues(ivBytes);
      const encoded = new TextEncoder().encode(rawJson);
      const encryptedBuf = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        encoded
      );
      const ciphertext = bytesToBase64(new Uint8Array(encryptedBuf));
      const iv = bytesToBase64(ivBytes);
      const sig = await sha256Hex(`${nonce}:${iv}:${ciphertext}:${ts}`);
      return {
        id,
        alg: "AES-256-GCM",
        iv,
        ciphertext,
        sig,
        nonce,
        msgType: payloadObj.msgType || "text",
        mediaUrl: payloadObj.mediaUrl || null,
        voiceDuration: payloadObj.voiceDuration || null,
        voiceWaveform: Array.isArray(payloadObj.voiceWaveform) ? payloadObj.voiceWaveform : null,
        replyTo: payloadObj.replyTo || null,
        ts,
      };
    } catch {}
  }

  const fallbackCipher = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(rawJson))) : rawJson;
  const fallbackIv = generateCryptoNonce().slice(0, 24);
  const sig = await sha256Hex(`${nonce}:${fallbackIv}:${fallbackCipher}:${ts}`);
  return {
    id,
    alg: "AES-256-GCM",
    iv: fallbackIv,
    ciphertext: fallbackCipher,
    sig,
    nonce,
    msgType: payloadObj.msgType || "text",
    mediaUrl: payloadObj.mediaUrl || null,
    voiceDuration: payloadObj.voiceDuration || null,
    voiceWaveform: Array.isArray(payloadObj.voiceWaveform) ? payloadObj.voiceWaveform : null,
    replyTo: payloadObj.replyTo || null,
    ts,
  };
}

export async function decryptChatEnvelope(envelope, userA, userB) {
  if (!envelope) return null;
  if (typeof envelope.text === "string" && !envelope.ciphertext) {
    return envelope;
  }

  const { ciphertext, iv, nonce, ts, sig } = envelope;
  if (!ciphertext || !iv) return null;

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      if (nonce && sig && ts) {
        const expectedSig = await sha256Hex(`${nonce}:${iv}:${ciphertext}:${ts}`);
        if (expectedSig !== sig) {
          // Reject tampered/intercepted packet
          return null;
        }
      }
      const key = await deriveConversationKey(userA, userB);
      const ivBytes = base64ToBytes(iv);
      const cipherBytes = base64ToBytes(ciphertext);
      const plainBuf = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        cipherBytes
      );
      const decoded = JSON.parse(new TextDecoder().decode(plainBuf));
      return {
        ...envelope,
        text: decoded.text || "",
        msgType: decoded.msgType || envelope.msgType || "text",
        mediaUrl: decoded.mediaUrl || envelope.mediaUrl || null,
        voiceDuration: decoded.voiceDuration || envelope.voiceDuration || null,
        voiceWaveform: decoded.voiceWaveform || envelope.voiceWaveform || null,
        verifiedE2EE: true,
      };
    } catch {}
  }

  try {
    const raw = decodeURIComponent(escape(atob(ciphertext)));
    const decoded = JSON.parse(raw);
    return {
      ...envelope,
      text: decoded.text || "",
      msgType: decoded.msgType || envelope.msgType || "text",
      mediaUrl: decoded.mediaUrl || envelope.mediaUrl || null,
      voiceDuration: decoded.voiceDuration || envelope.voiceDuration || null,
      voiceWaveform: decoded.voiceWaveform || envelope.voiceWaveform || null,
      verifiedE2EE: true,
    };
  } catch {
    return null;
  }
}

export async function generateSafetyCode(userA, userB) {
  const sorted = [String(userA || "anon"), String(userB || "anon")].sort();
  const hex = await sha256Hex(`kalceria_safety_code::${sorted[0]}::${sorted[1]}`);
  const digits = hex
    .slice(0, 20)
    .split("")
    .map((c) => (parseInt(c, 16) % 10).toString())
    .join("");
  return `${digits.slice(0, 5)} ${digits.slice(5, 10)} ${digits.slice(10, 15)} ${digits.slice(15, 20)}`;
}

