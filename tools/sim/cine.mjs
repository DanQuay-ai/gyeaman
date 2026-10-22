// capture a hero's move frame by frame. usage: node cine.mjs hero move monster region secs outdir
import { chromium } from 'playwright'; import fs from 'fs';
const [hero, mv, mon, reg, secs, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.clock.install();
await p.addInitScript(() => { const heroes = {}; for (const id of ['blay','owureku','gyakari','obiri','kuukua','kome','afrakoma','dufie','sekan','bayi']) heroes[id] = { lvl: 20, xp: 0, stars: 4, shards: 0, sk: [3,3,3,3], sl: {} };
  localStorage.setItem('gyeaman.squads.v2', JSON.stringify({ v: 2, gold: 0, cowries: 0, heroes, squad: ['dufie'], stars: {}, pity: 0, lastFree: '', seenIntro: true, arena: { team: [], won: {} } })); });
await p.goto('http://localhost:4190/squads/'); await p.clock.pauseAt(new Date(Date.now() + 3000)); await p.clock.runFor(1500);
await p.evaluate(([h, m, r]) => __sq.cinema(h, m, +r), [hero, mon, reg]); await p.clock.runFor(1800);
const cv = p.locator('canvas'); let n = 0; const fr = 1000 / 30;
for (let i = 0; i < 12; i++) { await p.clock.runFor(fr); await cv.screenshot({ path: `${out}/f${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }); }
await p.evaluate((mv) => { window.__done = false; window.__t0 = __sq.B.t; __sq.cinemaMove(mv).then(() => { window.__done = true; }); }, mv);
let tail = 0, nh = 0; const hf = []; while (n < secs * 30) { await p.clock.runFor(fr); await cv.screenshot({ path: `${out}/f${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }); const st = await p.evaluate(() => [window.__done, __sq.B.hitT.length]); if (st[1] > nh) { hf.push(n - 1); nh = st[1]; } if (st[0]) { if (++tail > 14) break; } }
const hits = await p.evaluate(() => __sq.B.hitT.map((t) => +(t - window.__t0).toFixed(3)));
fs.writeFileSync(`${out}/hits.json`, JSON.stringify({ frames: n, pre: 12, hits, hf }));
console.log(hero, mv, 'frames', n, 'hits', hits.length, JSON.stringify(errs.slice(0, 2))); await b.close();
