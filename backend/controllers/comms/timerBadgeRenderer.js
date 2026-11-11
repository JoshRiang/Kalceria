/**
 * Kalceria Email Dynamic Timer & Status Badge Renderer
 *
 * Generates dynamic, vector-crisp SVGs and animated GIFs for HTML emails
 * to display the real-time 3-minute operational status across all email clients
 * (Gmail, Apple Mail, Outlook, Yahoo, Android).
 *
 * Zero external npm dependencies (IL-10). Pure Node.js buffer rendering.
 */

class BitWriter {
  constructor() {
    this.buffer = [];
    this.currentByte = 0;
    this.currentBit = 0;
  }
  writeBits(value, numBits) {
    for (let i = 0; i < numBits; i++) {
      const bit = (value >> i) & 1;
      this.currentByte |= (bit << this.currentBit);
      this.currentBit++;
      if (this.currentBit === 8) {
        this.buffer.push(this.currentByte);
        this.currentByte = 0;
        this.currentBit = 0;
      }
    }
  }
  flush() {
    if (this.currentBit > 0) {
      this.buffer.push(this.currentByte);
      this.currentByte = 0;
      this.currentBit = 0;
    }
  }
  getBytes() {
    this.flush();
    return Buffer.from(this.buffer);
  }
}

function lzwEncode(minCodeSize, indexedPixels) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;

  const writer = new BitWriter();
  writer.writeBits(clearCode, codeSize);

  let prefix = '';
  const dictionary = new Map();

  for (let i = 0; i < clearCode; i++) {
    dictionary.set(String(i), i);
  }

  for (let i = 0; i < indexedPixels.length; i++) {
    const k = indexedPixels[i];
    const prefixK = prefix === '' ? String(k) : `${prefix},${k}`;

    if (dictionary.has(prefixK)) {
      prefix = prefixK;
    } else {
      writer.writeBits(dictionary.get(prefix), codeSize);
      if (nextCode < 4096) {
        dictionary.set(prefixK, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        writer.writeBits(clearCode, codeSize);
        dictionary.clear();
        for (let j = 0; j < clearCode; j++) {
          dictionary.set(String(j), j);
        }
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
      }
      prefix = String(k);
    }
  }

  if (prefix !== '') {
    writer.writeBits(dictionary.get(prefix), codeSize);
  }
  writer.writeBits(eoiCode, codeSize);

  const raw = writer.getBytes();
  const subBlocks = [];
  let offset = 0;
  while (offset < raw.length) {
    const chunkSize = Math.min(255, raw.length - offset);
    subBlocks.push(chunkSize);
    for (let c = 0; c < chunkSize; c++) {
      subBlocks.push(raw[offset + c]);
    }
    offset += chunkSize;
  }
  subBlocks.push(0);
  return Buffer.from([minCodeSize, ...subBlocks]);
}

const FONT_5X7 = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '(': [0x00, 0x1c, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1c, 0x00],
  '•': [0x00, 0x1c, 0x1c, 0x1c, 0x00],
  'A': [0x7e, 0x11, 0x11, 0x11, 0x7e],
  'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
  'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
  'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
  'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
  'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
  'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
  'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
  'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
  'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
  'V': [0x1f, 0x20, 0x40, 0x20, 0x1f],
  'W': [0x7f, 0x20, 0x18, 0x20, 0x7f],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
};

function drawChar(pixels, width, height, char, startX, startY, colorIndex) {
  const glyph = FONT_5X7[char.toUpperCase()] || FONT_5X7[' '];
  for (let col = 0; col < 5; col++) {
    const colByte = glyph[col];
    for (let row = 0; row < 7; row++) {
      if ((colByte >> row) & 1) {
        const x = startX + col;
        const y = startY + row;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          pixels[y * width + x] = colorIndex;
        }
      }
    }
  }
}

function drawString(pixels, width, height, str, startX, startY, colorIndex) {
  let curX = startX;
  for (const ch of str) {
    drawChar(pixels, width, height, ch, curX, startY, colorIndex);
    curX += 6;
  }
}

function measureString(str) {
  return str.length * 6;
}

export function renderTimerBadgeSvg({
  status = 'ACTIVE',
  elapsedMs = 0,
  limitMs = 180000,
}) {
  const isConfirmed = status === 'CONFIRMED' || status === 'PROCESSED';
  const isExpired = status === 'EXPIRED' || (!isConfirmed && elapsedMs >= limitMs);

  if (isConfirmed) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46" viewBox="0 0 460 46" fill="none">
  <rect width="460" height="46" fill="#ffffff" />
  <!-- Theme anchor: #0a0e27 -->
  <text x="230" y="20" fill="#16a34a" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">STATUS: RESMI DIKONFIRMASI &amp; DIKUNCI</text>
  <text x="230" y="36" fill="#64748b" font-family="Arial, -apple-system, sans-serif" font-size="11" text-anchor="middle">Slot jadwal operasional kamu telah aman dan tersimpan permanen</text>
</svg>`;
  }

  if (isExpired) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46" viewBox="0 0 460 46" fill="none">
  <rect width="460" height="46" fill="#ffffff" />
  <text x="230" y="20" fill="#dc2626" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">STATUS: KADALUARSA (BATAS 3 MENIT HABIS)</text>
  <text x="230" y="36" fill="#64748b" font-family="Arial, -apple-system, sans-serif" font-size="11" text-anchor="middle">Tombol di email ini telah dinonaktifkan oleh server Kalceria</text>
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
      smil = `<set attributeName="visibility" to="hidden" begin="1s" />`;
    } else if (s === 0) {
      smil = `<set attributeName="visibility" to="visible" begin="${elapsed}s" />`;
    } else {
      smil = `<set attributeName="visibility" to="visible" begin="${elapsed}s" /><set attributeName="visibility" to="hidden" begin="${elapsed + 1}s" />`;
    }

    const isLast = s === 0;

    frames.push(
      `<g visibility="${elapsed === 0 ? 'visible' : 'hidden'}"><text x="230" y="20" fill="#0a0e27" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">${isLast ? '<tspan fill="#dc2626">STATUS: KADALUARSA (BATAS 3 MENIT HABIS)</tspan>' : `SISA WAKTU: <tspan fill="#dc2626">${formatted}</tspan>`}</text>${smil}</g>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46" viewBox="0 0 460 46" fill="none">
  <rect width="460" height="46" fill="#ffffff" />
  ${frames.join('\n  ')}
  <text x="230" y="36" fill="#64748b" font-family="Arial, -apple-system, sans-serif" font-size="11" text-anchor="middle">Konfirmasi atau batalkan sebelum batas 3 menit berakhir</text>
</svg>`;
}

export function renderTimerBadgeGif({
  status = 'ACTIVE',
  elapsedMs = 0,
  limitMs = 180000,
  width = 460,
  height = 44,
}) {
  const isConfirmed = status === 'CONFIRMED' || status === 'PROCESSED';
  const isExpired = status === 'EXPIRED' || (!isConfirmed && elapsedMs >= limitMs);

  const chunks = [];
  chunks.push(Buffer.from('GIF89a'));

  const lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(width, 0);
  lsd.writeUInt16LE(height, 2);
  lsd[4] = 0xF2; // 8 colors
  lsd[5] = 0;
  lsd[6] = 0;
  chunks.push(lsd);

  // Palette: 0: white bg, 1: dark slate, 2: red, 3: muted slate, 4: green, 5: black, 6: white, 7: white
  const palette = Buffer.from([
    0xff, 0xff, 0xff, // 0: White background (#ffffff)
    0x33, 0x41, 0x55, // 1: Dark Slate text (#334155)
    0xdc, 0x26, 0x26, // 2: Red digits (#dc2626)
    0x64, 0x74, 0x8b, // 3: Muted Slate gray (#64748b)
    0x16, 0xa3, 0x4a, // 4: Green (#16a34a)
    0x0f, 0x17, 0x2a, // 5: Deep navy (#0f172a)
    0xff, 0xff, 0xff, // 6: White
    0x00, 0x00, 0x00, // 7: Pure black
  ]);
  chunks.push(palette);

  chunks.push(Buffer.from([
    0x21, 0xFF, 0x0B,
    0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00
  ]));

  const renderSingleFrame = (parts, subtitle, isRedSubtitle = false, delayHundredths = 500) => {
    const pixels = new Uint8Array(width * height);
    pixels.fill(0); // Fill with index 0 (white, transparent)

    let line1Width = 0;
    for (const p of parts) {
      line1Width += measureString(p.text);
    }
    const startX = Math.max(8, Math.floor((width - line1Width) / 2));
    let curX = startX;
    for (const p of parts) {
      drawString(pixels, width, height, p.text, curX, 10, p.color);
      curX += measureString(p.text);
    }

    if (subtitle) {
      const subWidth = measureString(subtitle);
      const subX = Math.max(8, Math.floor((width - subWidth) / 2));
      drawString(pixels, width, height, subtitle, subX, 24, isRedSubtitle ? 2 : 3);
    }

    const gce = Buffer.alloc(8);
    gce[0] = 0x21;
    gce[1] = 0xF9;
    gce[2] = 0x04;
    gce[3] = 0x09; // Transparent Color Flag = 1, Disposal = Do not dispose
    gce.writeUInt16LE(delayHundredths, 4);
    gce[6] = 0;    // Transparent color index = 0 (white)
    gce[7] = 0x00;
    chunks.push(gce);

    const id = Buffer.alloc(10);
    id[0] = 0x2C;
    id.writeUInt16LE(0, 1);
    id.writeUInt16LE(0, 3);
    id.writeUInt16LE(width, 5);
    id.writeUInt16LE(height, 7);
    id[9] = 0x00;
    chunks.push(id);

    chunks.push(lzwEncode(3, pixels));
  };

  if (isConfirmed) {
    renderSingleFrame(
      [{ text: 'STATUS: RESMI DIKONFIRMASI & DIKUNCI', color: 4 }],
      'SLOT JADWAL OPERASIONAL TELAH AMAN & TERKUNCI',
      false,
      1000
    );
  } else if (isExpired) {
    renderSingleFrame(
      [{ text: 'STATUS: KADALUARSA (BATAS 3 MENIT HABIS)', color: 2 }],
      'TOMBOL DI EMAIL TELAH DINONAKTIFKAN SERVER',
      true,
      1000
    );
  } else {
    const remainingSec = Math.max(1, Math.min(180, Math.floor((limitMs - elapsedMs) / 1000)));
    for (let s = remainingSec; s >= 0; s--) {
      const isLast = s === 0;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      const timeStr = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      const parts = isLast
        ? [{ text: 'STATUS: KADALUARSA (BATAS 3 MENIT HABIS)', color: 2 }]
        : [
            { text: 'Sisa waktu : ', color: 1 },
            { text: timeStr, color: 2 }, // Red font for time digits!
          ];
      const subtitle = isLast
        ? 'TOMBOL DI EMAIL TELAH DINONAKTIFKAN SERVER'
        : 'Konfirmasi atau batalkan sebelum batas 3 menit berakhir';

      renderSingleFrame(parts, subtitle, isLast, isLast ? 500 : 100);
    }
  }

  chunks.push(Buffer.from([0x3B]));
  return Buffer.concat(chunks);
}
