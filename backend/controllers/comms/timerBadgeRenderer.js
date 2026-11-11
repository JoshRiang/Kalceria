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

  let remainingSec = 0;
  if (!isConfirmed && !isExpired) {
    remainingSec = Math.max(0, Math.floor((limitMs - elapsedMs) / 1000));
  }
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let bg = '#0B0C10';
  let border = 'rgba(255, 255, 255, 0.15)';
  let textColor = '#ffffff';
  let labelText = '';
  let subText = '';
  let dotColor = '#38bdf8';

  if (isConfirmed) {
    bg = '#051b14';
    border = '#10b981';
    textColor = '#10b981';
    labelText = 'STATUS: RESMI DIKONFIRMASI &amp; DIKUNCI';
    subText = 'Slot jadwal operasional kamu telah aman dan tersimpan permanen';
    dotColor = '#10b981';
  } else if (isExpired) {
    bg = '#1c0f13';
    border = 'rgba(239, 68, 68, 0.45)';
    textColor = '#ef4444';
    labelText = 'STATUS: KADALUARSA (BATAS WAKTU 3 MENIT HABIS)';
    subText = 'Tombol di email ini telah dinonaktifkan oleh server Kalceria';
    dotColor = '#ef4444';
  } else {
    bg = '#081426';
    border = 'rgba(56, 189, 248, 0.4)';
    textColor = '#38bdf8';
    labelText = `SISA WAKTU: ${timeFormatted} (AKSI EMAIL AKTIF)`;
    subText = 'Konfirmasi atau batalkan sebelum batas 3 menit berakhir';
    dotColor = '#38bdf8';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46" viewBox="0 0 460 46" fill="none">
  <rect width="460" height="46" rx="8" fill="${bg}" stroke="${border}" stroke-width="1.5"/>
  <circle cx="22" cy="23" r="5" fill="${dotColor}" ${!isExpired && !isConfirmed ? 'opacity="0.9"' : ''}/>
  <text x="36" y="21" fill="${textColor}" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5">${labelText}</text>
  <text x="36" y="35" fill="#94a3b8" font-family="Arial, -apple-system, sans-serif" font-size="10">${subText}</text>
</svg>`;
}
