// round robin: every hero vs every hero, both sides, N reps. usage: node rr.mjs N lvl stars sk [ids]
import { chromium } from 'playwright';
const [N, LV, ST, SK] = process.argv.slice(2, 6).map(Number); const only = process.argv[6] ? process.argv[6].split(',') : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await p.clock.install();
await p.addInitScript(([LV, ST, SK]) => { const heroes = {}; for (const id of ['blay','owureku','gyakari','obiri','kuukua','kome','afrakoma','dufie','sekan','bayi']) heroes[id] = { lvl: LV, xp: 0, stars: ST, shards: 0, sk: [SK, SK, SK, SK], sl: {} };
  localStorage.setItem('gyeaman.squads.v2', JSON.stringify({ v: 2, gold: 0, cowries: 0, heroes, squad: ['dufie'], stars: {}, pity: 0, lastFree: '', seenIntro: true, arena: { team: [], won: {} } })); }, [LV, ST, SK]);
await p.goto('http://localhost:4190/squads/'); await p.clock.runFor(1500);
const ids = only || await p.evaluate(() => Object.keys(__sq.SAVE.heroes));
const res = {}; for (const a of ids) res[a] = { w: 0, n: 0, dealt: 0, turns: 0, hpLeft: 0 };
for (const a of ids) for (const c of ids) { if (a === c) continue; for (let r = 0; r < N; r++) {
  await p.evaluate(([a, c, LV, ST, SK]) => { const A = __sq.ARENA; A.length = Math.min(A.length, 6); A.push({ name: 'sim', lvl: LV, stars: ST, sk: SK, heroes: [c], region: 0 }); __sq.SAVE.arena.team = [a]; __sq.arenaBattle(A.length - 1); __sq.B.auto = true; __sq.B.speed = 6; }, [a, c, LV, ST, SK]);
  let o = null; for (let t = 0; t < 120 && !o; t++) { await p.clock.runFor(5000); o = await p.evaluate(() => { const B = __sq.B; if (!B || !B.over) return null; const [h, f] = B.all; return { win: h.alive, hd: h.tal.dealt, fd: f.tal.dealt, hm: h.tal.moves, fm: f.tal.moves, hl: h.hp / h.max, fl: f.hp / f.max }; }); }
  if (!o) { console.log('timeout', a, c); continue; }
  res[a].n++; res[c].n++; if (o.win) res[a].w++; else res[c].w++; res[a].dealt += o.hd; res[c].dealt += o.fd; res[a].turns += o.hm; res[c].turns += o.fm; res[a].hpLeft += o.hl; res[c].hpLeft += o.fl;
} }
for (const [k, v] of Object.entries(res).sort((x, y) => y[1].w / y[1].n - x[1].w / x[1].n)) console.log(k.padEnd(9), 'win', (v.w / v.n * 100).toFixed(0).padStart(3) + '%', 'dmg/turn', (v.dealt / v.turns).toFixed(0).padStart(4), 'turns', (v.turns / v.n).toFixed(1));
console.log('errs', JSON.stringify(errs.slice(0, 4))); await b.close();
