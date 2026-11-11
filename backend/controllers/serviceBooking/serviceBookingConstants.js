/**
 * Service Booking Constants & Pure Time Helpers
 */

export const RATE_PER_HOUR = 120000;
export const WA_ADMIN = process.env.WA_ADMIN_NUMBER || '628117998790';
export const THREE_MINUTES_MS = 3 * 60 * 1000;

export function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function calcHours(start, end) {
  const s = timeToMinutes(start);
  let e = timeToMinutes(end);
  if (e === 0) e = 24 * 60; // midnight = end of day
  return (e - s) / 60;
}

export function buildWaUrl(booking, user) {
  const dateStr = new Date(booking.bookingDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const msg = [
    `WEH ADA PESANAN MASUK! 🔥`,
    ``,
    `Layanan: SHOOTING`,
    `Pemesan: ${user?.name || '—'} (${user?.email || '—'})`,
    `Tanggal: ${dateStr}`,
    `Waktu: ${booking.startTime} - ${booking.endTime}`,
    `Total Tagihan: Rp ${(booking.totalAmount || 0).toLocaleString('id-ID')}`,
    ``,
    `Mohon segera konfirmasi!`,
  ].join('\n');
  return `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
}

