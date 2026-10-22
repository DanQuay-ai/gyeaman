import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.clock.install();
await p.addInitScript(() => { const heroes = {}; for (const id of ['blay','owureku','gyakari','obiri','kuukua','kome','afrakoma','dufie','sekan','bayi']) heroes[id] = { lvl: 10, xp: 0, stars: 3, shards: 0, sk: [1,1,1,1], sl: {} };
  localStorage.setItem('gyeaman.squads.v2', JSON.stringify({ v: 2, gold: 0, cowries: 0, heroes, squad: ['dufie'], stars: {}, pity: 0, lastFree: '', seenIntro: true, arena: { team: [], won: {} } })); window.__mlog = []; });
await p.goto('http://localhost:4190/squads/'); await p.clock.runFor(1500);
const ids = await p.evaluate(() => Object.keys(__sq.SAVE.heroes));
for (const h of ids) for (const half of [0, 1]) for (const foe of ['gyakari', 'owureku']) {
  await p.evaluate(([h, half, foe]) => { const S = __sq.SAVE; const pool = Object.values(window.__SPELLS || {}); S.heroes[h].eq = S.heroes[h].eq; const A = __sq.ARENA; A.length = 6; A.push({ name: 'sim', lvl: 16, stars: 4, sk: 1, heroes: [foe === h ? 'kome' : foe], region: 0 }); S.arena.team = [h];
    S.heroes[h].eq = __sq.pool(h).slice(half * 2, half * 2 + 2); __sq.arenaBattle(A.length - 1); __sq.B.auto = true; __sq.B.sim = 'smart'; __sq.B.speed = 6; }, [h, half, foe]);
  for (let t = 0; t < 120; t++) { await p.clock.runFor(5000); if (await p.evaluate(() => __sq.B.over)) break; }
}
const log = await p.evaluate(() => window.__mlog.filter((r) => r.ms.length));
const agg = {}; for (const r of log) { const k = r.h + '.' + r.mv; (agg[k] ||= []).push(r.ms); }
const out = {}; for (const [k, uses] of Object.entries(agg)) { const tot = uses.map((u) => u.reduce((a, x) => a + x, 0)).sort((a, b) => a - b), hits = uses.map((u) => u.length).sort((a, b) => a - b); const med = (a) => a[Math.floor(a.length / 2)]; out[k] = [+med(tot).toFixed(2), med(hits), uses.length, +tot[0].toFixed(2), +tot.at(-1).toFixed(2)]; }
console.log(JSON.stringify(out)); console.log('errs', JSON.stringify(errs.slice(0, 3))); await b.close();
