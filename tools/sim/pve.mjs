// PvE check: each hero alone on a few stages, smart AI. usage: node pve.mjs lvl stars sk stages
import { chromium } from 'playwright';
const [LV, ST, SK] = process.argv.slice(2, 5).map(Number), stages = process.argv[5].split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
await p.clock.install();
await p.addInitScript(([LV, ST, SK]) => { const heroes = {}; for (const id of ['blay','owureku','gyakari','obiri','kuukua','kome','afrakoma','dufie','sekan','bayi']) heroes[id] = { lvl: LV, xp: 0, stars: ST, shards: 0, sk: [SK, SK, SK, SK], sl: {} };
  localStorage.setItem('gyeaman.squads.v2', JSON.stringify({ v: 2, gold: 0, cowries: 0, heroes, squad: ['dufie'], stars: {}, pity: 0, lastFree: '', seenIntro: true })); }, [LV, ST, SK]);
await p.goto('http://localhost:'+(process.env.PORT||4190)+'/squads/'); await p.clock.runFor(1500);
const ids = await p.evaluate(() => Object.keys(__sq.SAVE.heroes)); const out = {};
for (const id of ids) { out[id] = []; for (const st of stages) {
  await p.evaluate(([id, st]) => { __sq.SAVE.squad = [id]; __sq.battle(st, 'normal'); __sq.B.auto = true; __sq.B.sim = 'smart'; __sq.B.speed = 6; }, [id, st]);
  let o = null; for (let t = 0; t < 120 && !o; t++) { await p.clock.runFor(5000); o = await p.evaluate(() => { const B = __sq.B; return B && B.over ? { w: B.hero.alive, hp: +(B.hero.hp / B.hero.max).toFixed(2) } : null; }); }
  out[id].push(o ? (o.w ? 'W' + o.hp : 'L') : 'T'); } console.log(id.padEnd(9), out[id].join(' ')); }
await b.close();
