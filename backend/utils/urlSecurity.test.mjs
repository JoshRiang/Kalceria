import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAndNormalizeMediaUrl } from './urlSecurity.js';

test('URL Security: allows valid HTTPS images and videos', () => {
  const result1 = sanitizeAndNormalizeMediaUrl('https://example.com/images/photo.png');
  assert.equal(result1.valid, true);
  assert.equal(result1.normalized, 'https://example.com/images/photo.png');

  const result2 = sanitizeAndNormalizeMediaUrl('https://public.blob.vercel-storage.com/upload-123.jpg');
  assert.equal(result2.valid, true);

  const result3 = sanitizeAndNormalizeMediaUrl('https://cdn.kalceria.id/assets/clip.mp4');
  assert.equal(result3.valid, true);
});

test('URL Security: allows relative /media/ paths', () => {
  const result = sanitizeAndNormalizeMediaUrl('/media/gifs/event_cafe_1.mp4');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, '/media/gifs/event_cafe_1.mp4');
});

test('URL Security: rejects path traversal and directory enumeration', () => {
  const r1 = sanitizeAndNormalizeMediaUrl('https://example.com/images/../../etc/passwd.png');
  assert.equal(r1.valid, false);

  const r2 = sanitizeAndNormalizeMediaUrl('https://example.com/%2e%2e/%2e%2e/root.jpg');
  assert.equal(r2.valid, false);

  const r3 = sanitizeAndNormalizeMediaUrl('/media/../../config.mp4');
  assert.equal(r3.valid, false);
});

test('URL Security: blocks SSRF and private IP destinations', () => {
  const r1 = sanitizeAndNormalizeMediaUrl('https://127.0.0.1/exploit.png');
  assert.equal(r1.valid, false);

  const r2 = sanitizeAndNormalizeMediaUrl('https://169.254.169.254/latest/meta-data.jpg');
  assert.equal(r2.valid, false);

  const r3 = sanitizeAndNormalizeMediaUrl('https://192.168.1.100/admin.png');
  assert.equal(r3.valid, false);

  const r4 = sanitizeAndNormalizeMediaUrl('https://10.0.0.1/internal.mp4');
  assert.equal(r4.valid, false);

  const r5 = sanitizeAndNormalizeMediaUrl('https://localhost/leak.png');
  assert.equal(r5.valid, false);
});

test('URL Security: blocks dangerous protocols (LFI, XSS)', () => {
  const r1 = sanitizeAndNormalizeMediaUrl('file:///etc/passwd');
  assert.equal(r1.valid, false);

  const r2 = sanitizeAndNormalizeMediaUrl('javascript:alert(1)');
  assert.equal(r2.valid, false);

  const r3 = sanitizeAndNormalizeMediaUrl('data:text/html,<script>alert(1)</script>');
  assert.equal(r3.valid, false);
});

test('URL Security: blocks serialization payloads and null bytes', () => {
  const r1 = sanitizeAndNormalizeMediaUrl('https://example.com/photo.png\0.php');
  assert.equal(r1.valid, false);

  const r2 = sanitizeAndNormalizeMediaUrl('https://example.com/photo.png%00');
  assert.equal(r2.valid, false);

  const r3 = sanitizeAndNormalizeMediaUrl('O:8:"Exploit":0:{}');
  assert.equal(r3.valid, false);

  const r4 = sanitizeAndNormalizeMediaUrl('rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAU=');
  assert.equal(r4.valid, false);
});

test('URL Security: strictly enforces .png, .jpg, .jpeg, .mp4 extensions', () => {
  const r1 = sanitizeAndNormalizeMediaUrl('https://example.com/shell.php');
  assert.equal(r1.valid, false);

  const r2 = sanitizeAndNormalizeMediaUrl('https://example.com/script.js');
  assert.equal(r2.valid, false);

  const r3 = sanitizeAndNormalizeMediaUrl('https://example.com/executable.exe');
  assert.equal(r3.valid, false);
});

test('URL Security: validates multiple comma-separated URLs', () => {
  const good = 'https://example.com/a.png, https://example.com/b.mp4';
  const rGood = sanitizeAndNormalizeMediaUrl(good);
  assert.equal(rGood.valid, true);
  assert.equal(rGood.normalized, 'https://example.com/a.png, https://example.com/b.mp4');

  const mixed = 'https://example.com/a.png, https://127.0.0.1/evil.png';
  const rMixed = sanitizeAndNormalizeMediaUrl(mixed);
  assert.equal(rMixed.valid, false);
});

