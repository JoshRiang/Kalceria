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
  <rect x="1" y="1" width="458" height="44" rx="8" fill="#0a0e27" stroke="#16a34a" stroke-width="1.5" />
  <circle cx="28" cy="18" r="4" fill="#22c55e" />
  <text x="40" y="22" fill="#22c55e" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5">STATUS: RESMI DIKONFIRMASI &amp; DIKUNCI</text>
  <text x="40" y="37" fill="#8896aa" font-family="Arial, -apple-system, sans-serif" font-size="10">Slot jadwal operasional kamu telah aman dan tersimpan permanen</text>
</svg>`;
  }

  if (isExpired) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46" viewBox="0 0 460 46" fill="none">
  <rect x="1" y="1" width="458" height="44" rx="8" fill="#0a0e27" stroke="#dc2626" stroke-width="1.5" />
  <circle cx="28" cy="18" r="4" fill="#ef4444" />
  <text x="40" y="22" fill="#ef4444" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5">STATUS: KADALUARSA (BATAS WAKTU 3 MENIT HABIS)</text>
  <text x="40" y="37" fill="#8896aa" font-family="Arial, -apple-system, sans-serif" font-size="10">Tombol di email ini telah dinonaktifkan oleh server Kalceria</text>
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
    const label = isLast
      ? 'STATUS: KADALUARSA (BATAS WAKTU 3 MENIT HABIS)'
      : `SISA WAKTU: ${formatted} (AKSI EMAIL AKTIF)`;
    const color = isLast ? '#ef4444' : '#00f0ff';
    const dotColor = isLast ? '#ef4444' : '#00f0ff';

    frames.push(
      `<g visibility="${elapsed === 0 ? 'visible' : 'hidden'}"><circle cx="28" cy="18" r="4" fill="${dotColor}" /><text x="40" y="22" fill="${color}" font-family="Arial, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5">${label}</text>${smil}</g>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="46" viewBox="0 0 460 46" fill="none">
  <rect x="1" y="1" width="458" height="44" rx="8" fill="#0a0e27" stroke="#1e293b" stroke-width="1.5" />
  ${frames.join('\n  ')}
  <text x="40" y="37" fill="#8896aa" font-family="Arial, -apple-system, sans-serif" font-size="10">Konfirmasi atau batalkan sebelum batas 3 menit berakhir</text>
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

  // Palette: 0: dark bg, 1: cyan, 2: white, 3: slate, 4: red, 5: green, 6: border, 7: black
  const palette = Buffer.from([
    0x0a, 0x0e, 0x27, // 0: Dark background (#0a0e27)
    0x00, 0xf0, 0xff, // 1: Cyan accent (#00f0ff)
    0xff, 0xff, 0xff, // 2: White text (#ffffff)
    0x88, 0x96, 0xaa, // 3: Slate gray (#8896aa)
    0xdc, 0x26, 0x26, // 4: Red (#dc2626)
    0x16, 0xa3, 0x4a, // 5: Green (#16a34a)
    0x1e, 0x29, 0x3b, // 6: Card border (#1e293b)
    0x00, 0x00, 0x00, // 7: Pure black
  ]);
  chunks.push(palette);

  chunks.push(Buffer.from([
    0x21, 0xFF, 0x0B,
    0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00
  ]));

  const renderSingleFrame = (title, subtitle, titleColor, borderColor, delayHundredths = 500) => {
    const pixels = new Uint8Array(width * height);
    pixels.fill(0);

    for (let x = 0; x < width; x++) {
      pixels[x] = borderColor;
      pixels[(height - 1) * width + x] = borderColor;
    }
    for (let y = 0; y < height; y++) {
      pixels[y * width] = borderColor;
      pixels[y * width + (width - 1)] = borderColor;
    }

    const titleWidth = measureString(title);
    const titleX = Math.max(8, Math.floor((width - titleWidth) / 2));
    drawString(pixels, width, height, title, titleX, 10, titleColor);

    const subWidth = measureString(subtitle);
    const subX = Math.max(8, Math.floor((width - subWidth) / 2));
    drawString(pixels, width, height, subtitle, subX, 24, 3);

    const gce = Buffer.alloc(8);
    gce[0] = 0x21;
    gce[1] = 0xF9;
    gce[2] = 0x04;
    gce[3] = 0x08;
    gce.writeUInt16LE(delayHundredths, 4);
    gce[6] = 0;
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
      'STATUS: RESMI DIKONFIRMASI & DIKUNCI',
      'SLOT JADWAL OPERASIONAL TELAH AMAN & TERKUNCI',
      5,
      5,
      1000
    );
  } else if (isExpired) {
    renderSingleFrame(
      'STATUS: KADALUARSA (BATAS 3 MENIT HABIS)',
      'TOMBOL DI EMAIL TELAH DINONAKTIFKAN SERVER',
      4,
      4,
      1000
    );
  } else {
    const remainingSec = Math.max(1, Math.min(180, Math.floor((limitMs - elapsedMs) / 1000)));
    for (let s = remainingSec; s >= 0; s--) {
      const isLast = s === 0;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      const timeStr = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      const title = isLast
        ? 'STATUS: KADALUARSA (BATAS 3 MENIT HABIS)'
        : `• SISA WAKTU: ${timeStr} (AKSI EMAIL AKTIF)`;
      const subtitle = isLast
        ? 'TOMBOL DI EMAIL TELAH DINONAKTIFKAN SERVER'
        : 'KONFIRMASI ATAU BATALKAN SEBELUM BATAS 3 MENIT BERAKHIR';

      renderSingleFrame(title, subtitle, isLast ? 4 : 1, 6, isLast ? 500 : 100);
    }
  }

  chunks.push(Buffer.from([0x3B]));
  return Buffer.concat(chunks);
}
