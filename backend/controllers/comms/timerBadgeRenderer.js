/**
 * Kalceria Email Dynamic Timer & Status Badge Renderer
 *
 * Generates dynamic, vector-crisp SVGs for HTML emails to clearly display
 * the live 3-minute operational status in any email client (Gmail, Outlook, Apple Mail).
 *
 * Zero external npm dependencies (IL-10). Pure SVG vector rendering.
 */

export function renderTimerBadgeSvg({
  status = 'ACTIVE', // 'ACTIVE' | 'CONFIRMED' | 'EXPIRED' | 'NOT_FOUND'
  elapsedMs = 0,
  limitMs = 180000, // 3 minutes default
}) {
  const isConfirmed = status === 'CONFIRMED' || status === 'PROCESSED';
  const isExpired = status === 'EXPIRED' || (!isConfirmed && elapsedMs >= limitMs);

  if (isConfirmed) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="44" viewBox="0 0 460 44" fill="none">
  <text x="230" y="18" text-anchor="middle" fill="#15803d" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" letter-spacing="0.5">STATUS: RESMI DIKONFIRMASI &amp; DIKUNCI</text>
  <text x="230" y="36" text-anchor="middle" fill="#64748b" font-family="Arial, -apple-system, sans-serif" font-size="11">Slot jadwal operasional kamu telah aman dan tersimpan permanen</text>
</svg>`;
  }

  if (isExpired) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="44" viewBox="0 0 460 44" fill="none">
  <text x="230" y="18" text-anchor="middle" fill="#dc2626" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" letter-spacing="0.5">STATUS: KADALUARSA (BATAS WAKTU 3 MENIT HABIS)</text>
  <text x="230" y="36" text-anchor="middle" fill="#64748b" font-family="Arial, -apple-system, sans-serif" font-size="11">Tombol di email ini telah dinonaktifkan oleh server Kalceria</text>
</svg>`;
  }

  const remainingSec = Math.max(1, Math.min(180, Math.floor((limitMs - elapsedMs) / 1000)));
  const frames = [];

  for (let s = remainingSec; s >= 0; s--) {
    const elapsed = remainingSec - s;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    let smil = '';
    if (elapsed === 0) {
      smil = `<set attributeName="display" to="none" begin="1s" />`;
    } else if (s === 0) {
      smil = `<set attributeName="display" to="inline" begin="${elapsed}s" />`;
    } else {
      smil = `<set attributeName="display" to="inline" begin="${elapsed}s" /><set attributeName="display" to="none" begin="${elapsed + 1}s" />`;
    }

    const isLast = s === 0;
    const label = isLast
      ? 'STATUS: KADALUARSA (BATAS WAKTU 3 MENIT HABIS)'
      : `SISA WAKTU: ${formatted} (AKSI EMAIL AKTIF)`;
    const color = isLast ? '#dc2626' : '#0f172a';

    frames.push(
      `<g ${elapsed === 0 ? '' : 'display="none"'}><text x="230" y="18" text-anchor="middle" fill="${color}" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" letter-spacing="0.5">${label}</text>${smil}</g>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="44" viewBox="0 0 460 44" fill="none">
  ${frames.join('\n  ')}
  <text x="230" y="36" text-anchor="middle" fill="#64748b" font-family="Arial, -apple-system, sans-serif" font-size="11">Konfirmasi atau batalkan sebelum batas 3 menit berakhir</text>
</svg>`;
}
