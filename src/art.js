// Art layer: real images from assets/ when present, drawn placeholders otherwise.
// Drop generated art at assets/heroes/<id>.png, assets/monsters/<id>.png, assets/gear/<art>.png
// (transparent PNG). Nothing else needs to change.

const cache = new Map();
/** Load an image; `paths` is tried in order (webp first, older png second). */
export function img(paths) {
  if (!Array.isArray(paths)) paths = [paths];
  const key = paths[0];
  if (cache.has(key)) return cache.get(key);
  const entry = { ok: false, el: new Image(), src: '' };
  let k = 0;
  entry.el.decoding = 'async';
  entry.el.onload = () => { entry.ok = true; entry.src = paths[k]; };
  entry.el.onerror = () => { if (++k < paths.length) entry.el.src = paths[k]; };
  entry.el.src = paths[0];
  cache.set(key, entry);
  return entry;
}
export const heroImg = (id) => img(['assets/heroes/' + id + '.webp', 'assets/heroes/' + id + '.png']);
export const portraitImg = (id) => img(['assets/portraits/' + id + '.webp', 'assets/heroes/' + id + '.webp']);
export const monImg = (id) => img(['assets/monsters/' + id + '.webp', 'assets/monsters/' + id + '.png']);
export const gearImg = (art) => img(['assets/gear/' + art + '.webp', 'assets/gear/' + art + '.png']);
export const heroSrc = (id) => heroImg(id).src || 'assets/heroes/' + id + '.webp';
export const portraitSrc = (id) => portraitImg(id).src || 'assets/portraits/' + id + '.webp';
export const monSrc = (id) => monImg(id).src || 'assets/monsters/' + id + '.webp';

// Pre-scaled copies: big art drawn small in one step aliases on some browsers (Safari ignores
// imageSmoothingQuality). Halve repeatedly on an offscreen canvas, cache per target height.
const scaledCache = new Map();
export function scaled(entry, targetH) {
  if (!entry.ok) return null;
  const el = entry.el, th = Math.max(8, Math.round(targetH / 8) * 8);
  if (th >= el.naturalHeight * 0.75) return el;
  const key = entry.src + '@' + th;
  if (scaledCache.has(key)) return scaledCache.get(key);
  let src = el, w = el.naturalWidth, h = el.naturalHeight;
  while (h / 2 >= th) {
    const c = document.createElement('canvas'); c.width = Math.round(w / 2); c.height = Math.round(h / 2);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
    src = c; w = c.width; h = c.height;
  }
  const c = document.createElement('canvas'); c.width = Math.round(w * th / h); c.height = th;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  scaledCache.set(key, c);
  return c;
}
/** Draw an image with feet at (cx, by), height h (css px), crisp at the given device pixel ratio. */
export function drawArt(g, entry, cx, by, h, dpr = 1, flip = false) {
  const s = scaled(entry, h * dpr); if (!s) return false;
  const w = h * s.width / s.height;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (flip) { g.save(); g.translate(cx, 0); g.scale(-1, 1); g.drawImage(s, -w / 2, by - h, w, h); g.restore(); }
  else g.drawImage(s, cx - w / 2, by - h, w, h);
  return { w, h };
}

const INK = '#120c10';
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
}

/** Hero placeholder, anime ink style. (cx, by) = feet centre; s = scale (1 ≈ 100px tall). */
export function drawHero(g, hero, cx, by, s, opts = {}) {
  const im = heroImg(hero.id);
  if (im.ok) { drawArt(g, im, cx, by, 110 * s * hero.body.h, opts.dpr || 1, opts.flip); return; }
  const H = 100 * s * hero.body.h, W = hero.body.w;
  const accent = opts.accent || '#e3a72f';
  g.save(); g.translate(cx, by); g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = Math.max(1.5, 2.6 * s); g.strokeStyle = INK;
  const skin = hero.skin, cloth = opts.cloth || (hero.sex === 'm' ? '#efe6d3' : '#2a2a35');
  // legs
  g.fillStyle = '#1c1820';
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 9 * s * W, -H * 0.45); g.lineTo(d * 11 * s * W, -2 * s); g.lineTo(d * 3 * s, -2 * s); g.lineTo(d * 2 * s, -H * 0.45); g.closePath(); g.fill(); g.stroke(); }
  // torso (hakama-like robe)
  g.fillStyle = cloth;
  g.beginPath(); g.moveTo(-16 * s * W, -H * 0.78); g.lineTo(16 * s * W, -H * 0.78); g.lineTo(19 * s * W, -H * 0.42); g.lineTo(-19 * s * W, -H * 0.42); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = shade(cloth, -0.25); g.beginPath(); g.moveTo(0, -H * 0.78); g.lineTo(16 * s * W, -H * 0.78); g.lineTo(19 * s * W, -H * 0.42); g.lineTo(4 * s, -H * 0.42); g.closePath(); g.fill();
  // sash
  g.fillStyle = accent; g.fillRect(-19 * s * W, -H * 0.47, 38 * s * W, 5 * s); g.strokeRect(-19 * s * W, -H * 0.47, 38 * s * W, 5 * s);
  // arms
  g.strokeStyle = skin; g.lineWidth = 7 * s * Math.min(1.2, W);
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 16 * s * W, -H * 0.74); g.quadraticCurveTo(d * 26 * s * W, -H * 0.6, d * 20 * s * W, -H * 0.48); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = Math.max(1.5, 2.6 * s);
  // scarf
  g.fillStyle = accent; g.beginPath(); g.ellipse(0, -H * 0.79, 15 * s * W, 6 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // head
  const hy = -H * 0.88;
  g.fillStyle = skin; g.beginPath(); g.ellipse(0, hy, 10 * s, 12 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // hair
  g.fillStyle = INK; g.strokeStyle = INK;
  switch (hero.hair) {
    case 'locs': case 'braids': {
      g.beginPath(); g.ellipse(0, hy - 6 * s, 11 * s, 7 * s, 0, Math.PI, 0); g.fill();
      g.lineWidth = 2.4 * s;
      for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 2.6 * s, hy - 8 * s); g.quadraticCurveTo(i * 3.4 * s, hy + 6 * s, i * 3.2 * s + (i > 0 ? 3 : -3) * s, hy + (hero.hair === 'braids' ? 22 : 16) * s); g.stroke(); }
      break;
    }
    case 'cornrows': { g.beginPath(); g.ellipse(0, hy - 4 * s, 10.5 * s, 9 * s, 0, Math.PI * 1.02, -0.02); g.fill(); g.strokeStyle = '#3a2a22'; g.lineWidth = 1; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 2.5 * s, hy - 12 * s); g.lineTo(i * 3 * s, hy - 2 * s); g.stroke(); } break; }
    case 'puffs': { for (const d of [-1, 1]) { g.beginPath(); g.arc(d * 10 * s, hy - 11 * s, 7 * s, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.ellipse(0, hy - 6 * s, 10.5 * s, 6 * s, 0, Math.PI, 0); g.fill(); break; }
    case 'knots': { g.beginPath(); g.ellipse(0, hy - 5 * s, 10.5 * s, 7 * s, 0, Math.PI, 0); g.fill(); for (const [x, y] of [[-8, -12], [0, -15], [8, -12]]) { g.beginPath(); g.arc(x * s, hy + y * s, 3.5 * s, 0, Math.PI * 2); g.fill(); } break; }
    case 'buzz': { g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, hy - 4 * s, 10.3 * s, 8.5 * s, 0, Math.PI * 1.05, -0.05); g.fill(); g.globalAlpha = 1; break; }
    case 'shaved': { g.globalAlpha = 0.35; g.beginPath(); g.ellipse(0, hy - 4 * s, 10 * s, 8 * s, 0, Math.PI * 1.05, -0.05); g.fill(); g.globalAlpha = 1; break; }
    case 'bald': { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 * s; g.beginPath(); g.arc(-3 * s, hy - 6 * s, 4 * s, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); g.fillStyle = INK; g.beginPath(); g.ellipse(0, hy + 8 * s, 7 * s, 4 * s, 0, 0, Math.PI); g.fill(); break; }
  }
  // eyes (sharp anime)
  g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 1.2 * s;
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 2 * s, hy - 1 * s); g.lineTo(d * 7 * s, hy - 2.5 * s); g.lineTo(d * 6 * s, hy + 0.5 * s); g.closePath(); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(d * 4.8 * s, hy - 1 * s, 1.1 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; }
  g.restore();
}

/** Monster placeholder. (cx, by) = feet centre, s = scale. */
export function drawMonster(g, id, m, cx, by, s, t = 0, hit = 0, dpr = 1) {
  const im = monImg(id);
  if (im.ok) { drawArt(g, im, cx, by, 120 * s, dpr); return; }
  g.save(); g.translate(cx, by - 55 * s); g.scale(s, s);
  const breath = Math.sin(t * 2.4) * 2;
  const body = hit > 0.5 ? '#fff' : m.color;
  g.lineWidth = 3; g.strokeStyle = INK; g.lineJoin = 'round';
  if (m.shape === 'wings' || m.shape === 'owl' || m.shape === 'lord') {
    const flap = Math.sin(t * 3) * 0.18;
    for (const d of [-1, 1]) {
      g.save(); g.scale(d, 1); g.rotate(flap);
      g.fillStyle = shade(m.color, -0.3);
      g.beginPath(); g.moveTo(18, -20); g.quadraticCurveTo(80, -75, 108, -12); g.lineTo(84, -6); g.lineTo(96, 18); g.lineTo(66, 6); g.lineTo(64, 30); g.lineTo(30, 12); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }
  if (m.shape === 'ghost') { g.globalAlpha = 0.85; }
  g.fillStyle = body;
  const bw = m.shape === 'dwarf' ? 30 : m.shape === 'lord' ? 50 : m.shape === 'thorn' ? 26 : 40;
  const bh = m.shape === 'dwarf' ? 34 : 48;
  if (m.shape === 'ghost') {
    g.beginPath(); g.moveTo(-34, 10); g.quadraticCurveTo(-36, -50, 0, -56); g.quadraticCurveTo(36, -50, 34, 10);
    for (let i = 0; i < 5; i++) g.quadraticCurveTo(34 - i * 17 - 8, 30 + (i % 2) * 6, 34 - (i + 1) * 17, 14);
    g.closePath(); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.ellipse(0, 18 + breath * 0.3, bw, bh, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    const hy = m.shape === 'dwarf' ? -18 : -32;
    g.beginPath(); g.ellipse(0, hy + breath * 0.2, m.shape === 'owl' ? 30 : 24, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = shade(m.color, -0.45);
    if (m.shape === 'lord' || m.shape === 'wings') for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 12, hy - 18); g.quadraticCurveTo(d * 36, hy - 40, d * 24, hy - 58); g.quadraticCurveTo(d * 26, hy - 34, d * 4, hy - 20); g.fill(); g.stroke(); }
    if (m.shape === 'owl') for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 16, hy - 14); g.lineTo(d * 30, hy - 38); g.lineTo(d * 6, hy - 20); g.fill(); }
    if (m.shape === 'dwarf') { g.beginPath(); g.moveTo(-16, hy - 14); g.lineTo(0, hy - 50); g.lineTo(16, hy - 14); g.fill(); g.stroke(); }
    if (m.shape === 'thorn') { g.strokeStyle = shade(m.color, -0.5); g.lineWidth = 3; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 24, 18 + Math.sin(a) * 40); g.lineTo(Math.cos(a) * 36, 18 + Math.sin(a) * 54); g.stroke(); } g.strokeStyle = INK; }
    if (m.shape === 'hook') { g.strokeStyle = '#8a8f99'; g.lineWidth = 4; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 18, 60); g.lineTo(d * 22, 82); g.arc(d * 22 + d * 6, 82, 6, Math.PI, d > 0 ? Math.PI * 0.2 : Math.PI * 1.8, d < 0); g.stroke(); } g.strokeStyle = INK; g.lineWidth = 3; }
    // eyes
    g.fillStyle = m.eye; g.shadowColor = m.eye; g.shadowBlur = 12;
    for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * 9, hy - 1, m.shape === 'owl' ? 7 : 5, m.shape === 'owl' ? 7 : 4, d * 0.35, 0, Math.PI * 2); g.fill(); }
    g.shadowBlur = 0;
    g.fillStyle = INK; g.beginPath(); g.moveTo(-10, hy + 9); g.quadraticCurveTo(0, hy + 16, 10, hy + 9); g.closePath(); g.fill();
  }
  if (m.shape === 'ghost') {
    g.fillStyle = m.eye; g.shadowColor = m.eye; g.shadowBlur = 14;
    for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * 10, -30, 5, 7, 0, 0, Math.PI * 2); g.fill(); }
    g.shadowBlur = 0;
  }
  g.restore();
}

/** Gear icon placeholder (Adinkra-flavoured glyph per slot/type). */
export function drawGearIcon(g, item, x, y, size, rarityColor) {
  const im = item ? gearImg(item.art) : null;
  g.save();
  g.fillStyle = '#1b1419'; g.strokeStyle = rarityColor || '#5a4a40'; g.lineWidth = 2;
  roundRect(g, x, y, size, size, size * 0.18); g.fill(); g.stroke();
  if (!item) { g.restore(); return; }
  if (im && im.ok) { const sc = scaled(im, size * 2) || im.el; const r = Math.min((size - 8) / sc.width, (size - 8) / sc.height); const w = sc.width * r, hh = sc.height * r; g.imageSmoothingQuality = 'high'; g.drawImage(sc, x + (size - w) / 2, y + (size - hh) / 2, w, hh); g.restore(); return; }
  g.translate(x + size / 2, y + size / 2);
  const k = size * 0.32; g.strokeStyle = rarityColor; g.fillStyle = rarityColor; g.lineWidth = Math.max(2, size * 0.07); g.lineCap = 'round';
  const t = { sword: 'afena', shield: 'shield', helmet: 'head', armour: 'body', ring: 'ring' }[item.kind] || item.type || item.slot;
  if (t === 'afena') { g.rotate(-0.8); g.beginPath(); g.moveTo(0, -k * 1.3); g.lineTo(0, k * 0.8); g.moveTo(-k * 0.5, k * 0.45); g.lineTo(k * 0.5, k * 0.45); g.stroke(); g.beginPath(); g.arc(0, -k * 1.0, k * 0.35, 0, Math.PI); g.stroke(); }
  else if (t === 'akuma') { g.rotate(-0.6); g.beginPath(); g.moveTo(0, -k * 1.2); g.lineTo(0, k * 1.2); g.stroke(); g.beginPath(); g.moveTo(0, -k); g.quadraticCurveTo(k * 1.2, -k * 0.9, k, -k * 0.1); g.lineTo(0, -k * 0.3); g.fill(); }
  else if (t === 'pea') { g.rotate(-0.8); g.beginPath(); g.moveTo(0, -k * 1.4); g.lineTo(0, k * 1.3); g.stroke(); g.beginPath(); g.moveTo(0, -k * 1.5); g.lineTo(k * 0.3, -k * 0.9); g.lineTo(-k * 0.3, -k * 0.9); g.fill(); }
  else if (t === 'agyan') { g.beginPath(); g.arc(-k * 0.4, 0, k * 1.1, -1.1, 1.1); g.stroke(); g.beginPath(); g.moveTo(-k * 0.4 + Math.cos(-1.1) * k * 1.1, Math.sin(-1.1) * k * 1.1); g.lineTo(-k * 0.4 + Math.cos(1.1) * k * 1.1, Math.sin(1.1) * k * 1.1); g.stroke(); g.beginPath(); g.moveTo(-k, 0); g.lineTo(k * 1.1, 0); g.stroke(); }
  else if (t === 'poma') { g.beginPath(); g.moveTo(0, k * 1.3); g.lineTo(0, -k * 0.6); g.stroke(); g.beginPath(); g.arc(0, -k * 0.95, k * 0.4, 0, Math.PI * 2); g.stroke(); }
  else if (t === 'sekan') { for (const d of [-1, 1]) { g.save(); g.rotate(d * 0.6); g.beginPath(); g.moveTo(0, -k * 1.1); g.lineTo(0, k * 0.7); g.stroke(); g.restore(); } }
  else if (t === 'shield') { g.beginPath(); g.moveTo(0, -k * 1.1); g.lineTo(k, -k * 0.6); g.quadraticCurveTo(k, k * 0.7, 0, k * 1.2); g.quadraticCurveTo(-k, k * 0.7, -k, -k * 0.6); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(0, -k * 0.6); g.lineTo(0, k * 0.7); g.stroke(); }
  else if (t === 'ring') { g.beginPath(); g.arc(0, k * 0.2, k * 0.8, 0, Math.PI * 2); g.stroke(); g.fill(); g.fillStyle = '#1b1419'; g.beginPath(); g.arc(0, k * 0.2, k * 0.5, 0, Math.PI * 2); g.fill(); g.fillStyle = rarityColor; g.beginPath(); g.arc(0, -k * 0.8, k * 0.3, 0, Math.PI * 2); g.fill(); }
  else if (t === 'head') { g.beginPath(); g.arc(0, k * 0.3, k, Math.PI, 0); g.stroke(); g.beginPath(); g.moveTo(-k, k * 0.3); g.lineTo(k, k * 0.3); g.stroke(); }
  else if (t === 'body') { g.beginPath(); g.moveTo(-k, -k * 0.6); g.lineTo(-k * 0.4, -k); g.lineTo(k * 0.4, -k); g.lineTo(k, -k * 0.6); g.lineTo(k * 0.7, k); g.lineTo(-k * 0.7, k); g.closePath(); g.stroke(); }
  else { // charm: spiral
    g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = a * k * 0.09; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.beginPath(); g.arc(0, 0, k * 1.15, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export { shade };
