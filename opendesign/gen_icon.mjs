import sharp from 'sharp';
import { writeFileSync } from 'fs';

const SIZES = [16, 24, 32, 48, 64, 96, 128, 256];
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#6366f1"/>
  <rect x="9" y="9" width="21" height="21" rx="5" fill="#8c8af6"/>
  <rect x="34" y="9" width="21" height="21" rx="5" fill="#a7a5fa"/>
  <rect x="9" y="34" width="21" height="21" rx="5" fill="#9694f8"/>
  <rect x="34" y="34" width="21" height="21" rx="5" fill="#f97316"/>
  <line x1="20" y1="12" x2="20" y2="50" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <polyline points="20 31 28 40 46 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter"/>
</svg>`;

// 每个尺寸直接用 SVG 原生渲染，避免缩放模糊
const pngs = await Promise.all(SIZES.map(s => {
  const sSvg = svg.replace(
    'width="256" height="256"',
    `width="${s}" height="${s}"`
  );
  return sharp(Buffer.from(sSvg)).png().toBuffer();
}));

// Save individual PNGs in a subfolder
import { mkdirSync } from 'fs';
mkdirSync('D:/桌面文件/todo-appv2/opendesign/icons', { recursive: true });
SIZES.forEach((s, i) => writeFileSync(`D:/桌面文件/todo-appv2/opendesign/icons/icon_${s}.png`, pngs[i]));

// Save 256px preview
writeFileSync('D:/桌面文件/todo-appv2/opendesign/kanote.png', pngs[pngs.length - 1]);

// Build ICO manually
// ICO format: header (6 bytes) + entries (16 bytes each) + image data
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);  // reserved
header.writeUInt16LE(1, 2);  // type: ICO
header.writeUInt16LE(SIZES.length, 4);  // count

let offset = 6 + 16 * SIZES.length;
const entries = [];
const imageData = [];

SIZES.forEach((s, i) => {
  const png = pngs[i];

  // ICO entry: width, height, colors, reserved, planes, bpp, size, offset
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s === 256 ? 0 : s, 0);  // width
  entry.writeUInt8(s === 256 ? 0 : s, 1);  // height
  entry.writeUInt8(0, 2);   // color palette
  entry.writeUInt8(0, 3);   // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png.length, 8); // size
  entry.writeUInt32LE(offset, 12);    // offset
  entries.push(entry);
  imageData.push(png);
  offset += png.length;
});

const ico = Buffer.concat([header, ...entries, ...imageData]);
writeFileSync('D:/桌面文件/todo-appv2/opendesign/kanote.ico', ico);
console.log('OK - kanote.ico + kanote.png');
