import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generatePng(width, height, isMaskable = false) {
  // Emerald green: #10B981 (16, 185, 129), darker: #047857 (4, 120, 87)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded background gradient
      let r = 16, g = 185, b = 129, a = 255;
      const t = y / height;
      r = Math.round(16 * (1 - t) + 4 * t);
      g = Math.round(185 * (1 - t) + 120 * t);
      b = Math.round(129 * (1 - t) + 87 * t);

      // Draw white center emblem (shield/wallet symbol)
      const inEmblem = (Math.abs(dx) < radius * 0.55 && Math.abs(dy) < radius * 0.55);
      const isCross = (Math.abs(dx) < width * 0.05 && Math.abs(dy) < radius * 0.35) ||
                      (Math.abs(dy) < height * 0.05 && Math.abs(dx) < radius * 0.35);

      if (inEmblem && dist < radius * 0.6) {
        if (isCross) {
          r = 255; g = 255; b = 255; a = 255;
        } else if (dist > radius * 0.45 && dist < radius * 0.58) {
          r = 255; g = 255; b = 255; a = 255;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT (Deflate)
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files
const p192 = generatePng(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), p192);

const p512 = generatePng(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), p512);

const pMaskable = generatePng(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pMaskable);

const appleTouch = generatePng(180, 180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('✅ PWA PNG icons generated successfully!');
