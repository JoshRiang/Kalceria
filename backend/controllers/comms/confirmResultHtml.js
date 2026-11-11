/**
 * Kalceria Direct Confirmation Response Renderer
 *
 * Renders an unboxed, elegant, GPU-smooth status card for email magic link clicks.
 * Automatically attempts to close the tab so the user seamlessly stays in their email client.
 */

export function renderConfirmResultHtml({
  status = 'SUCCESS', // 'SUCCESS' | 'ALREADY_CONFIRMED' | 'EXPIRED' | 'NOT_FOUND' | 'UNAUTHORIZED'
  title = '',
  description = '',
  bookingId = '',
  registrationId = '',
  autoClose = false,
  returnUrl = 'https://www.kalceria.id',
}) {
  const isExpired = status === 'EXPIRED';
  const isSuccess = status === 'SUCCESS' || status === 'ALREADY_CONFIRMED';
  const idBadge = bookingId
    ? `ID Pemesanan: #${bookingId.slice(-6)}`
    : (registrationId ? `ID Registrasi: #${registrationId.slice(-6)}` : '');
  const homeUrl = returnUrl || 'https://www.kalceria.id';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Kalceria Confirmation'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0a0e27;
      color: #ffffff;
      font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background-color: #0d1233;
      border: 1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.4)' : isExpired ? 'rgba(239, 68, 68, 0.3)' : '#2a2d42'};
      border-radius: 12px;
      padding: 36px 28px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      ${isExpired ? 'opacity: 0.85;' : ''}
    }
    .icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 20px auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      color: ${isSuccess ? '#10b981' : '#ef4444'};
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      font-size: 12px;
      font-family: monospace;
      color: #cbd5e1;
      margin-bottom: 24px;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 10px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 13px 20px;
      background: #000000;
      color: #ffffff;
      border: 1px solid #ffffff;
      border-radius: 8px;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, color 0.2s;
    }
    .btn:hover {
      background: #ffffff;
      color: #000000;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #94a3b8;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .timer-note {
      font-size: 12px;
      color: #64748b;
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      ${isSuccess ? `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ` : `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `}
    </div>
    <h1>${title}</h1>
    <p>${description}</p>
    ${idBadge ? `<div class="badge">${idBadge}</div>` : ''}

    <div class="btn-group">
      <a href="${homeUrl}" class="btn">Kembali ke Kalceria</a>
      <button type="button" class="btn btn-secondary" onclick="tryCloseWindow()">Tutup Tab Ini</button>
    </div>

    ${autoClose ? `<div class="timer-note">Tab akan ditutup atau dialihkan dalam <span id="cd">3</span> detik...</div>` : ''}
  </div>

  <script>
    function tryCloseWindow() {
      try {
        window.close();
      } catch (e) {}
      setTimeout(function() {
        window.location.href = '${homeUrl}';
      }, 350);
    }
    ${autoClose ? `
      let seconds = 3;
      const cdEl = document.getElementById('cd');
      const interval = setInterval(function() {
        seconds--;
        if (cdEl) cdEl.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(interval);
          tryCloseWindow();
        }
      }, 1000);
    ` : ''}
  </script>
</body>
</html>`;
}

