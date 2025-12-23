import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

// Icon designs for YouTube Transcript extension

const DESIGNS = {
  // Design 1: CC badge (closed captions) - clean and recognizable
  cc: (size) => {
    const pixels = [];
    const pad = Math.floor(size * 0.1);
    const radius = Math.floor(size * 0.15);

    for (let y = 0; y < size; y++) {
      pixels.push(0);
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        // Rounded rectangle background
        const inRect = x >= pad && x < size - pad && y >= pad && y < size - pad;
        const inCorner = (
          (x < pad + radius && y < pad + radius && dist(x, y, pad + radius, pad + radius) > radius) ||
          (x >= size - pad - radius && y < pad + radius && dist(x, y, size - pad - radius, pad + radius) > radius) ||
          (x < pad + radius && y >= size - pad - radius && dist(x, y, pad + radius, size - pad - radius) > radius) ||
          (x >= size - pad - radius && y >= size - pad - radius && dist(x, y, size - pad - radius, size - pad - radius) > radius)
        );

        if (inRect && !inCorner) {
          // YouTube red background
          r = 255; g = 0; b = 0; a = 255;

          // Draw "CC" text
          const cx = size / 2;
          const cy = size / 2;
          const letterW = size * 0.25;
          const letterH = size * 0.35;
          const gap = size * 0.05;
          const thick = Math.max(2, size * 0.12);

          // First C
          const c1x = cx - gap / 2 - letterW / 2;
          if (isC(x, y, c1x, cy, letterW, letterH, thick)) {
            r = 255; g = 255; b = 255; a = 255;
          }

          // Second C
          const c2x = cx + gap / 2 + letterW / 2;
          if (isC(x, y, c2x, cy, letterW, letterH, thick)) {
            r = 255; g = 255; b = 255; a = 255;
          }
        }

        pixels.push(r, g, b, a);
      }
    }
    return pixels;
  },

  // Design 2: Speech bubble with lines - represents transcript
  bubble: (size) => {
    const pixels = [];
    const cx = size / 2;
    const cy = size * 0.42;
    const rx = size * 0.4;
    const ry = size * 0.32;

    for (let y = 0; y < size; y++) {
      pixels.push(0);
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        // Ellipse bubble
        const inEllipse = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1;

        // Tail triangle
        const tailY = cy + ry * 0.7;
        const tailH = size * 0.22;
        const inTail = y >= tailY && y < tailY + tailH &&
                       x >= cx - (y - tailY) * 0.3 &&
                       x <= cx + size * 0.15 - (y - tailY) * 0.5;

        if (inEllipse || inTail) {
          r = 255; g = 0; b = 0; a = 255;

          // Text lines inside bubble
          const lineH = Math.max(1, size * 0.06);
          const lineGap = size * 0.12;
          const lineY1 = cy - lineGap;
          const lineY2 = cy;
          const lineY3 = cy + lineGap;
          const lineX1 = cx - rx * 0.6;
          const lineW1 = rx * 1.1;
          const lineW2 = rx * 0.9;
          const lineW3 = rx * 0.6;

          if ((y >= lineY1 && y < lineY1 + lineH && x >= lineX1 && x < lineX1 + lineW1) ||
              (y >= lineY2 && y < lineY2 + lineH && x >= lineX1 && x < lineX1 + lineW2) ||
              (y >= lineY3 && y < lineY3 + lineH && x >= lineX1 && x < lineX1 + lineW3)) {
            r = 255; g = 255; b = 255; a = 255;
          }
        }

        pixels.push(r, g, b, a);
      }
    }
    return pixels;
  },

  // Design 3: Document with play button overlay
  doc: (size) => {
    const pixels = [];
    const pad = size * 0.12;
    const fold = size * 0.22;

    for (let y = 0; y < size; y++) {
      pixels.push(0);
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        // Document shape with folded corner
        const inDoc = x >= pad && x < size - pad && y >= pad && y < size - pad;
        const inFold = x >= size - pad - fold && y < pad + fold &&
                       (x - (size - pad - fold)) + (y - pad) < fold;

        if (inDoc && !inFold) {
          r = 255; g = 255; b = 255; a = 255;

          // Red header bar
          if (y < pad + size * 0.18) {
            r = 255; g = 0; b = 0; a = 255;
          }

          // Text lines
          const lineH = Math.max(1, size * 0.05);
          const lineGap = size * 0.11;
          const lineX = pad + size * 0.08;
          const maxW = size - pad * 2 - size * 0.16;

          for (let i = 0; i < 4; i++) {
            const ly = pad + size * 0.26 + i * lineGap;
            const lw = maxW * (i === 3 ? 0.5 : (0.9 - i * 0.1));
            if (y >= ly && y < ly + lineH && x >= lineX && x < lineX + lw) {
              r = 200; g = 200; b = 200; a = 255;
            }
          }
        }

        // Folded corner
        if (x >= size - pad - fold && y >= pad && y < pad + fold && !inFold) {
          r = 220; g = 220; b = 220; a = 255;
        }

        pixels.push(r, g, b, a);
      }
    }
    return pixels;
  },

  // Design 4: Minimalist T with underline (current but better)
  tmin: (size) => {
    const pixels = [];
    const pad = Math.floor(size * 0.12);
    const radius = Math.floor(size * 0.18);

    for (let y = 0; y < size; y++) {
      pixels.push(0);
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        // Rounded rectangle
        const inRect = x >= pad && x < size - pad && y >= pad && y < size - pad;
        const inCorner = (
          (x < pad + radius && y < pad + radius && dist(x, y, pad + radius, pad + radius) > radius) ||
          (x >= size - pad - radius && y < pad + radius && dist(x, y, size - pad - radius, pad + radius) > radius) ||
          (x < pad + radius && y >= size - pad - radius && dist(x, y, pad + radius, size - pad - radius) > radius) ||
          (x >= size - pad - radius && y >= size - pad - radius && dist(x, y, size - pad - radius, size - pad - radius) > radius)
        );

        if (inRect && !inCorner) {
          r = 255; g = 0; b = 0; a = 255;

          const cx = size / 2;
          const tTop = size * 0.22;
          const tBarH = Math.max(2, size * 0.13);
          const tBarW = size * 0.52;
          const tStemW = Math.max(2, size * 0.15);
          const tBottom = size * 0.68;

          // T top bar
          if (y >= tTop && y < tTop + tBarH && x >= cx - tBarW/2 && x < cx + tBarW/2) {
            r = 255; g = 255; b = 255; a = 255;
          }
          // T stem
          if (y >= tTop + tBarH && y < tBottom && x >= cx - tStemW/2 && x < cx + tStemW/2) {
            r = 255; g = 255; b = 255; a = 255;
          }

          // Underline (represents text)
          const ulY = size * 0.74;
          const ulH = Math.max(1, size * 0.06);
          if (y >= ulY && y < ulY + ulH && x >= cx - tBarW/2 && x < cx + tBarW/2) {
            r = 255; g = 255; b = 255; a = 200;
          }
        }

        pixels.push(r, g, b, a);
      }
    }
    return pixels;
  },

  // Design 5: Play button with subtitle bar
  play: (size) => {
    const pixels = [];
    const cx = size / 2;
    const cy = size * 0.4;
    const triSize = size * 0.28;

    for (let y = 0; y < size; y++) {
      pixels.push(0);
      for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0;

        // Circle background
        const circleR = size * 0.35;
        if (dist(x, y, cx, cy) <= circleR) {
          r = 255; g = 0; b = 0; a = 255;

          // Play triangle
          const tx = cx - triSize * 0.15;
          const inTri = x >= tx &&
                        x < tx + triSize * 0.7 &&
                        Math.abs(y - cy) < (x - tx) * 0.8;
          if (inTri) {
            r = 255; g = 255; b = 255; a = 255;
          }
        }

        // Subtitle bar at bottom
        const barY = size * 0.72;
        const barH = size * 0.14;
        const barPad = size * 0.15;
        const barRadius = size * 0.05;

        const inBar = x >= barPad && x < size - barPad &&
                      y >= barY && y < barY + barH;
        const inBarCorner = (
          (x < barPad + barRadius && y < barY + barRadius && dist(x, y, barPad + barRadius, barY + barRadius) > barRadius) ||
          (x >= size - barPad - barRadius && y < barY + barRadius && dist(x, y, size - barPad - barRadius, barY + barRadius) > barRadius) ||
          (x < barPad + barRadius && y >= barY + barH - barRadius && dist(x, y, barPad + barRadius, barY + barH - barRadius) > barRadius) ||
          (x >= size - barPad - barRadius && y >= barY + barH - barRadius && dist(x, y, size - barPad - barRadius, barY + barH - barRadius) > barRadius)
        );

        if (inBar && !inBarCorner) {
          r = 40; g = 40; b = 40; a = 230;

          // Text dots in bar
          const dotY = barY + barH / 2;
          const dotR = size * 0.025;
          for (let i = 0; i < 3; i++) {
            const dotX = size * 0.28 + i * size * 0.18;
            const dotW = size * (0.08 + i * 0.04);
            if (y >= dotY - dotR && y < dotY + dotR && x >= dotX && x < dotX + dotW) {
              r = 255; g = 255; b = 255; a = 255;
            }
          }
        }

        pixels.push(r, g, b, a);
      }
    }
    return pixels;
  }
};

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

function isC(px, py, cx, cy, w, h, thick) {
  // Draw a C shape
  const outerRx = w / 2;
  const outerRy = h / 2;
  const innerRx = outerRx - thick;
  const innerRy = outerRy - thick;

  const dx = px - cx;
  const dy = py - cy;

  // Inside outer ellipse
  const inOuter = (dx*dx)/(outerRx*outerRx) + (dy*dy)/(outerRy*outerRy) <= 1;
  // Outside inner ellipse
  const outInner = (dx*dx)/(innerRx*innerRx) + (dy*dy)/(innerRy*innerRy) >= 1;
  // Opening on right side
  const notOpening = !(dx > 0 && Math.abs(dy) < h * 0.3);

  return inOuter && outInner && notOpening;
}

function createPNG(width, height, pixelData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const compressed = deflateSync(Buffer.from(pixelData), { level: 9 });
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

// Generate all designs at 128px for preview
const sizes = [16, 48, 128];
const designName = process.argv[2] || 'all';

if (designName === 'all') {
  // Generate all at 128px for comparison
  for (const [name, fn] of Object.entries(DESIGNS)) {
    const pixels = fn(128);
    const png = createPNG(128, 128, pixels);
    writeFileSync(`dist/icon-${name}-128.png`, png);
    console.log(`Created dist/icon-${name}-128.png`);
  }
} else if (DESIGNS[designName]) {
  // Generate chosen design at all sizes
  for (const size of sizes) {
    const pixels = DESIGNS[designName](size);
    const png = createPNG(size, size, pixels);
    writeFileSync(`dist/icon${size}.png`, png);
    console.log(`Created dist/icon${size}.png (${designName})`);
  }
} else {
  console.log('Available designs:', Object.keys(DESIGNS).join(', '));
}
