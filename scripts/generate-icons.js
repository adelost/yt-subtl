import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

// Simple PNG generator for solid color icons with a "T" shape
function createIcon(size) {
  const pixels = [];
  const padding = Math.floor(size * 0.15);
  const tTop = Math.floor(size * 0.2);
  const tBottom = Math.floor(size * 0.85);
  const tBarHeight = Math.floor(size * 0.15);
  const tStemWidth = Math.floor(size * 0.25);
  const tStemLeft = Math.floor((size - tStemWidth) / 2);
  const tStemRight = tStemLeft + tStemWidth;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Background: YouTube red (#cc0000)
      let r = 204, g = 0, b = 0, a = 255;

      // Check if inside rounded rect area
      const inBounds = x >= padding && x < size - padding && y >= padding && y < size - padding;

      if (inBounds) {
        // Draw white "T" for transcript
        const inTopBar = y >= tTop && y < tTop + tBarHeight && x >= padding && x < size - padding;
        const inStem = y >= tTop + tBarHeight && y < tBottom && x >= tStemLeft && x < tStemRight;

        if (inTopBar || inStem) {
          r = 255; g = 255; b = 255; // White T
        }
      } else {
        a = 0; r = 0; g = 0; b = 0; // Transparent outside
      }

      pixels.push(r, g, b, a);
    }
  }

  return createPNG(size, size, Buffer.from(pixels));
}

function createPNG(width, height, pixelData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // color type (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // IDAT chunk (compressed pixel data)
  const compressed = deflateSync(pixelData, { level: 9 });

  // IEND chunk
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend)
  ]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc;
}

// Generate icons
const sizes = [16, 48, 128];
for (const size of sizes) {
  const png = createIcon(size);
  writeFileSync(`dist/icon${size}.png`, png);
  console.log(`Created dist/icon${size}.png`);
}
