import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Programmatically generates `build/icon.png` (256x256) and `build/icon.ico` (ICO container with embedded PNG)
 * representing the Aura Orb, with zero external dependencies.
 */
const SIZE = 256;

function createRgbaPixels(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outerR = size * 0.45;

  const c1 = { r: 139, g: 92, b: 246 }; // #8b5cf6 (violet)
  const c2 = { r: 34, g: 211, b: 238 }; // #22d3ee (cyan)
  const c3 = { r: 244, g: 114, b: 182 }; // #f472b6 (pink)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const idx = (y * size + x) * 4;

      if (dist > outerR + 1.5) {
        rgba[idx + 3] = 0;
        continue;
      }

      const edgeAlpha = dist > outerR ? Math.max(0, 1 - (dist - outerR) / 1.5) : 1;

      const t = Math.min(1, Math.max(0, (x + y) / (size * 1.85)));
      const u = Math.min(1, Math.max(0, (size - x + y) / (size * 2)));
      const highlight =
        Math.max(0, 1 - Math.hypot(x - size * 0.34, y - size * 0.3) / (size * 0.36)) * 0.6;

      let r = c1.r * (1 - t) + c2.r * t;
      let g = c1.g * (1 - t) + c2.g * t;
      let b = c1.b * (1 - t) + c2.b * t;

      r = r * (1 - u * 0.38) + c3.r * (u * 0.38);
      g = g * (1 - u * 0.38) + c3.g * (u * 0.38);
      b = b * (1 - u * 0.38) + c3.b * (u * 0.38);

      r = Math.min(255, Math.round(r + (255 - r) * highlight));
      g = Math.min(255, Math.round(g + (255 - g) * highlight));
      b = Math.min(255, Math.round(b + (255 - b) * highlight));

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = Math.round(edgeAlpha * 255);
    }
  }
  return rgba;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawRows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawRows[rowStart] = 0; // filter None
    rgba.copy(rawRows, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(rawRows, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIcoFromPng(pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  const dir = Buffer.alloc(16);
  dir[0] = 0; // 0 means 256px width
  dir[1] = 0; // 0 means 256px height
  dir[2] = 0; // palette
  dir[3] = 0; // reserved
  dir.writeUInt16LE(1, 4); // color planes
  dir.writeUInt16LE(32, 6); // 32 bpp
  dir.writeUInt32LE(pngBuf.length, 8); // size of image data
  dir.writeUInt32LE(22, 12); // offset (6 + 16)

  return Buffer.concat([header, dir, pngBuf]);
}

const outDir = path.resolve('build');
fs.mkdirSync(outDir, { recursive: true });

const rgba = createRgbaPixels(SIZE);
const png = encodePng(SIZE, rgba);
const ico = encodeIcoFromPng(png);

fs.writeFileSync(path.join(outDir, 'icon.png'), png);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
console.log('[icon] Successfully generated: build/icon.png and build/icon.ico (256x256)');
