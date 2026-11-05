// App icons: Gobzilla Jr. in a chef-orange tile with a little pot. Run: node scripts/make-icons.mjs
import sharp from 'sharp';
const sprite = 'public/art/kaiju-0.webp';
async function icon(size, file, pad, rounded) {
  const r = rounded ? Math.round(size * 0.19) : 0;
  const s = size;
  const bg = Buffer.from(`<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${r}" fill="#ffb347"/>
    ${[0.2, 0.4, 0.6].map(f => `<rect y="${s * f}" width="${s}" height="${Math.max(2, s * 0.01)}" fill="#f09a2e"/>`).join('')}
    <rect y="${s * 0.78}" width="${s}" height="${s * 0.22}" fill="#9a6438"/><rect y="${s * 0.78}" width="${s}" height="${s * 0.04}" fill="#ece6dc"/></svg>`);
  const inner = Math.round(s * (1 - pad * 2) * 0.86);
  const fg = await sharp(sprite).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer();
  const m = await sharp(fg).metadata();
  let img = sharp(bg).composite([{ input: fg, left: Math.round((s - m.width) / 2), top: Math.round(s * 0.8 - m.height) }]);
  if (rounded) img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(`<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${r}" fill="#fff"/></svg>`), blend: 'dest-in' }]);
  await img.png().toFile(file);
  console.log('wrote', file);
}
await icon(192, 'public/icons/icon-192.png', 0.08, true);
await icon(512, 'public/icons/icon-512.png', 0.08, true);
await icon(512, 'public/icons/maskable-512.png', 0.18, false);
await icon(180, 'public/icons/apple-touch-icon.png', 0.08, false);
await icon(64, 'public/favicon.png', 0.04, true);
