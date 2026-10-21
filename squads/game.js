// Gyeaman Squads: Akan squad battler, chapter 1.
// Battles are turn based on a speed turn order (Dislyte style): every hero picks Basic, Skill (cooldown) or Ultimate (energy)
// and a target; enemies show their next move. Big moves get impact frames, small ones stay quiet.
import { KF } from './kf.js?v=20261021m';
import { HEROES, MONS, STAGES, REGIONS, DIFF, RARITY, STARTERS, SKILL_MAX, skillCost, xpNeed, STAR_SHARDS, LOCKED_CHAPTERS, PULL_COST, PULL10_COST, PITY, PULL_RATES, CLASSES, GROWTH, SPELLS } from './data.js?v=20261021m';
import { drawAdinkra, adinkraPath, adinkraSvg, ADINKRA } from './adinkra.js?v=20261021m';

const ROOT = /\/squads\/?$|\/squads\/index\.html$/.test(location.pathname) ? '../assets/' : 'assets/';
const A = ROOT + 'sq/';
const app = document.getElementById('app');
// no pinch or double-tap zoom on phones (iOS ignores user-scalable=no, so block its gesture events too)
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
for (const k of ['gold', 'cowrie', 'xp', 'shard']) document.documentElement.style.setProperty(`--i-${k}`, `url("${A}ui/${k}.webp")`);
const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));
const kr = (s) => s.toLowerCase(); // Kɔradin font: lowercase Latin input, ligatures and nasal marks come from the font

// ---------------- icons ----------------
const ICON = { map: adinkraSvg('nkyimkyim'), heroes: adinkraSvg('gyawuAtiko'), summon: adinkraSvg('nyameDua') };
const CHEV = (r) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${r}deg)"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COIN = (k, cls = '') => `<i class="coin ${k} ${cls}"></i>`;
const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

// ---------------- save ----------------
const KEY = 'gyeaman.squads.v2';
const fresh = () => ({ v: 2, gold: 1500, cowries: 400, heroes: Object.fromEntries(STARTERS.map((id) => [id, newHero(id)])), squad: ['dufie'], stars: {}, pity: 0, lastFree: '', seenIntro: false });
function newHero(id) { return { lvl: 1, xp: 0, stars: RARITY[HEROES[id].rarity].stars, shards: 0, sk: [1, 1, 1, 1], pts: { hp: 0, atk: 0, spd: 0, mag: 0 }, eq: HEROES[id].pool.slice(0, 2), sl: {} }; }
let SAVE;
try { SAVE = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { SAVE = null; }
if (!SAVE || SAVE.v !== 2) SAVE = fresh();
for (const s of Object.values(SAVE.heroes)) while (s.sk.length < 4) s.sk.push(1); // duels have 4 moves
for (const [id, s] of Object.entries(SAVE.heroes)) if (!s.eq) { const P = HEROES[id].pool; s.eq = P.slice(0, 2); s.sl = { [P[0]]: s.sk[1], [P[1]]: s.sk[2] }; } // spell loadouts
for (const id of STARTERS) if (!SAVE.heroes[id]) SAVE.heroes[id] = newHero(id); // new free heroes reach existing saves
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* storage blocked */ } };
const today = () => new Date().toISOString().slice(0, 10);
const starKey = (i, d) => `${i}:${d}`;
const starsOf = (i, d) => SAVE.stars[starKey(i, d)] || 0;
const cleared = (i) => starsOf(i, 'normal') > 0 || starsOf(i, 'easy') > 0 || starsOf(i, 'hard') > 0;
const openStage = () => { let i = 0; while (i < STAGES.length && cleared(i)) i++; return Math.min(i, STAGES.length - 1); };

// ---------------- sound ----------------
let ac = null;
function unlock() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } }
function tone(f, d, type = 'triangle', v = 0.06, slide = 1, delay = 0) {
  if (!ac) return; const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + d);
}
const SFX = {
  click: () => tone(660, .05, 'square', .03), hit: () => { tone(150, .14, 'sawtooth', .05, .5); tone(70, .18, 'sine', .08, .6); },
  crit: () => { tone(220, .22, 'sawtooth', .08, .3); tone(55, .3, 'sine', .14, .5); }, shoot: () => tone(900, .1, 'triangle', .04, .4),
  ult: () => { tone(520, .35, 'sine', .08, 2); tone(220, .4, 'sawtooth', .05, .5, .1); }, heal: () => { tone(523, .15); tone(784, .2, 'triangle', .06, 1, .1); },
  impact: () => { tone(48, .5, 'sine', .22, .6); tone(110, .25, 'square', .06, .3); }, turn: () => tone(880, .04, 'sine', .025),
  die: () => tone(300, .35, 'square', .04, .25), drum: (i = 0) => { tone(90, .25, 'sine', .2, .5, i); tone(180, .08, 'square', .04, .5, i); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .25, 'triangle', .07, 1, i * .1)), lose: () => [392, 330, 262].forEach((f, i) => tone(f, .3, 'sine', .07, 1, i * .15)),
};

// ---------------- images ----------------
const IM = {};
const AV = '?v=20261021m';
// stale-build guard: phones keep old pages/modules around; if the deployed version.json is newer, reload once onto it
(async function checkBuild() {
  const mine = AV.slice(3);
  const look = async () => { try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); const { av } = await r.json();
    if (av && av !== mine && sessionStorage.getItem('gy.reloadedFor') !== av) { sessionStorage.setItem('gy.reloadedFor', av); location.replace(location.pathname + '?b=' + av); } } catch (e) { /* offline: keep playing */ } };
  look(); document.addEventListener('visibilitychange', () => { if (!document.hidden) look(); });
  const tag = document.createElement('div'); tag.textContent = 'build ' + mine; tag.style.cssText = 'position:fixed;right:4px;bottom:2px;font:10px sans-serif;opacity:.35;color:#fff;pointer-events:none;z-index:9999'; document.body.appendChild(tag);
})(); // bump when art files are replaced under the same name (defeats stale browser/CDN caches)
function img(src) {
  if (!IM[src]) { const e = { el: new Image(), ok: false, sc: {}, sil: {} }; e.el.decoding = 'async'; e.el.onload = () => { e.ok = true; }; e.el.src = src; IM[src] = e; }
  return IM[src];
}
// Veo-generated sprite clips, 12 fps, keyed with an ink outline. Sheets hold `per` frames in `cols` columns (kept under ~4 MP for mobile GPUs).
// ax/fy = body centre x and feet y inside a frame, bh = body height in frame px (matched to the static pose 0).
const clip = (name, m, play) => ({ ...m, sheets: m.sheets.map((f) => A + 'anim/' + f), play: play || [...Array(m.n).keys()] });
const CHOREO = {}; // per-hero hand-animated moves (keyframe timelines)
const ANIM = {}; // Veo clip sheets (none active: keyframe poses replaced them)
for (const id in ANIM) for (const c of Object.values(ANIM[id])) c.sheets.forEach((u) => img(u));
// ---------- keyframe choreography (Firefly pose sheets + code movement, smears, speed lines, afterimages) ----------
const kfImg = (id, p) => img(A + 'kf/' + KF[id].p[p][0] + AV);
for (const id in KF) for (const p in KF[id].p) kfImg(id, p);
for (let i = 0; i < 4; i++) img(A + 'kf/blay_fx_' + i + '.webp' + AV);
for (const k of ['fx_spear', 'fx_arrow', 'fx_flash', 'fx_debris']) img(A + 'kf/' + k + '.webp' + AV);
// draw keyframe p for hero id with its floor point at (0,0), body scaled so the idle pose is bodyH tall
function drawKF(g, id, p, bodyH, alpha = 1) {
  const D = KF[id].p[p]; if (!D) return false; const im = kfImg(id, p); if (!im.ok) return false;
  const k = bodyH / KF[id].ref; g.save(); if (alpha < 1) g.globalAlpha *= alpha; g.drawImage(im.el, -D[3] * k, -D[4] * k, D[1] * k, D[2] * k); g.restore(); return true;
}
// a move = list of steps { p: pose, ms, x: fraction of the distance to the enemy, y: lift in body heights, lines, ghost, ev }
const SEQ = {
  dufie: {
    recover: [{ p: 'recover_0', ms: 80, x: 1, y: 0 }, { p: 'recover_1', ms: 120, x: .62, y: .34, ghost: 1 }, { p: 'recover_2', ms: 130, x: .25, y: .42, ghost: 1 }, { p: 'recover_3', ms: 150, x: 0, y: 0, ev: 'land' }],
    basic: [{ p: 'basic_0', ms: 130, x: 0 }, { p: 'basic_1', ms: 170, x: 1, lines: 1, ghost: 1, ev: 'cut1' }, { p: 'basic_2', ms: 190, x: 1, ev: 'cut2' }, { p: 'basic_3', ms: 170, x: 1.04 }],
    dufie1: [{ p: 'step_0', ms: 170, x: 0, ev: 'smoke' }, { p: 'step_1', ms: 110, x: 1, lines: 1, ghost: 1 }, { p: 'step_2', ms: 260, x: 1, ev: 'stab' }, { p: 'step_3', ms: 150, x: .75, y: .38 }],
    dufie2: [{ p: 'vanish_0', ms: 150, x: 0 }, { p: 'vanish_1', ms: 220, x: 0, ev: 'smoke' }, { p: 'vanish_2', ms: 300, x: 0, ev: 'fade' }, { p: 'vanish_3', ms: 260, x: 0, ev: 'reform' }],
    dufKick: [{ p: 'kick_0', ms: 120, x: .5, y: .05, ghost: 1 }, { p: 'kick_1', ms: 190, x: 1, y: .22, lines: 1, ev: 'kick1' }, { p: 'kick_2', ms: 200, x: 1, y: .3, ev: 'kick2' }, { p: 'kick_3', ms: 170, x: 1, y: 0, ev: 'land' }],
    dufStars: [{ p: 'throw_0', ms: 160, x: 0 }, { p: 'throw_1', ms: 230, x: 0, ev: 'throw3' }, { p: 'throw_2', ms: 230, x: 0, ev: 'throw2' }, { p: 'throw_3', ms: 220, x: 0 }],
    ult: [{ p: 'ultC_0', ms: 120, x: 0 }, { p: 'ultC_1', ms: 320, x: -.05, ev: 'charge' }, { p: 'ultE_1', ms: 300, x: .9, y: 0, lines: 1, ghost: 1, ev: 's1' },
      { p: 'ultE_2', ms: 300, x: 1, y: .18, lines: 1, ghost: 1, ev: 's2' }, { p: 'ultE_3', ms: 210, x: 1, y: .4, ghost: 1, ev: 'k1' }, { p: 'ultF_1', ms: 210, x: 1.02, y: .5, ghost: 1, ev: 'k2' },
      { p: 'ultF_2', ms: 230, x: 1.04, y: .58, lines: 1, ghost: 1, ev: 'k3' }, { p: 'ultF_3', ms: 420, x: 1.08, y: 0, lines: 1, ev: 's4' },
      { p: 'recover_1', ms: 130, x: .6, y: .36, ghost: 1 }, { p: 'recover_2', ms: 130, x: .25, y: .42, ghost: 1 }, { p: 'recover_3', ms: 180, x: 0, y: 0, ev: 'land' }],
  },
  blay: { // slashes fly from where he stands; the running dash leaves a blue phantom trail; he flash-steps home
    recover: [{ p: 'idle_3', ms: 43, hold: 1, ev: 'blink' }, { p: 'idle_0', ms: 124, x: 0, y: 0, snap: 1, ev: 'appear' }],
    basic: [{ p: 'swB_3', ms: 90, x: 0 }, { p: 'swA_1', ms: 260, x: .04, ev: 'cut' }, { p: 'idle_0', ms: 87, x: 0 }],
    blay1: [{ p: 'swA_2', ms: 223, x: .03, ev: 'cut1' }, { p: 'swA_3', ms: 236, x: .06, ev: 'cut2' }, { p: 'idle_0', ms: 87, x: 0 }],
    blay2: [{ p: 'parry_1', ms: 347, x: 0, ev: 'guard' }],
    blayRush: [{ p: 'idle_0', ms: 74, x: 0 }, { p: 'idle_3', ms: 186, x: .88, phantom: 1, lines: 1, ev: 'run' }, { p: 'swB_3', ms: 161, x: .9, ev: 'sweep' }, { p: 'swB_1', ms: 186, x: .9, y: .3, ev: 'rise' }, { p: 'swB_2', ms: 149, x: .9, y: 0, ev: 'drop' }],
    blayRally: [{ p: 'parry_3', ms: 434, x: 0, ev: 'rally' }],
    ult: [{ p: 'ultX_1', ms: 322, x: 0, ev: 'charge' }, { p: 'idle_3', ms: 174, x: .85, phantom: 1, lines: 1 }, { p: 'swB_1', ms: 143, x: .88, y: .3, phantom: 1, ev: 'u1' }, { p: 'swA_2', ms: 143, x: .88, y: .1, phantom: 1, ev: 'u2' }, { p: 'swA_3', ms: 143, x: .9, y: 0, ev: 'u3' }, { p: 'swB_2', ms: 143, x: .9, ev: 'u4' },
      { p: 'idle_3', ms: 43, hold: 1, ev: 'blink' }, { p: 'idle_0', ms: 124, x: 0, y: 0, snap: 1, ev: 'appear' }, { p: 'ultX_2', ms: 558, x: .1, ev: 'release' }, { p: 'ultX_3', ms: 322, x: .1 }, { p: 'idle_0', ms: 74, x: 0 }],
  },
  kuukua: { // thrusts: rapid repeated jabs, then a heavier finisher with a flashing impact
    recover: [{ p: 'thA_1', ms: 220, x: 0, phantom: 1 }, { p: 'idle_0', ms: 110, x: 0 }],
    basic: [{ p: 'thA_1', ms: 190, x: .72, phantom: 1, lines: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_2', ms: 160, x: .82, phantom: 1, ev: 'T' }],
    kuukua1: [{ p: 'thA_1', ms: 190, x: .72, phantom: 1, lines: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thB_1', ms: 200, x: .7, phantom: 1, ev: 'charge' }, { p: 'thB_2', ms: 300, x: .9, phantom: 1, ev: 'POW' }],
    kuukua2: [{ p: 'thA_1', ms: 190, x: .72, phantom: 1, lines: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thB_3', ms: 340, x: .82, phantom: 1, ev: 'sweep' }],
    kuuThrow: [{ p: 'kult_1', ms: 300, x: 0, phantom: 1, ev: 'charge' }, { p: 'kult_2', ms: 420, x: .05, phantom: 1, ev: 'throw' }, { p: 'idle_0', ms: 120, x: 0 }],
    kuuWall: [{ p: 'idle_3', ms: 650, x: 0, ev: 'wall' }],
    ult: [{ p: 'thB_1', ms: 360, x: 0, phantom: 1, ev: 'charge' }, { p: 'thA_1', ms: 260, x: .72, phantom: 1, lines: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_2', ms: 85, x: .78, phantom: 1, ev: 't' }, { p: 'thA_1', ms: 55, x: .74, phantom: 1 }, { p: 'thA_3', ms: 85, x: .8, phantom: 1, ev: 't' }, { p: 'thB_1', ms: 160, x: .7, phantom: 1 }, { p: 'thB_2', ms: 280, x: .92, phantom: 1, ev: 'POW' }, { p: 'kult_3', ms: 420, x: .4, phantom: 1, y: 1.1, phantom: 1, ev: 'leap' }, { p: 'kult_3', ms: 700, x: 0, phantom: 1, y: 1.3, ev: 'rain' }, { p: 'thB_3', ms: 260, x: 0, phantom: 1, y: 0, ev: 'land' }, { p: 'idle_0', ms: 120, x: 0 }],
  },
  obiri: { // agile archer: keeps moving, flips are rotated, arrows are projectiles
    recover: [{ p: 'idle_3', ms: 300, x: 0, y: .5, spin: -6.283, phantom: 1 }, { p: 'shA_2', ms: 140, x: 0, y: 0 }, { p: 'idle_0', ms: 100, x: 0 }],
    basic: [{ p: 'shB_3', ms: 200, x: .18, phantom: 1 }, { p: 'shA_1', ms: 280, x: .18, ev: 'shot' }, { p: 'idle_3', ms: 280, x: 0, y: .45, spin: -6.283, phantom: 1 }, { p: 'idle_0', ms: 90, x: 0, y: 0 }],
    obiri1: [{ p: 'idle_3', ms: 300, x: -.15, y: 1, spin: -6.283, phantom: 1 }, { p: 'shB_1', ms: 320, x: -.1, y: .9, ev: 'pin' }, { p: 'shA_2', ms: 240, x: 0, y: 0, ev: 'land' }, { p: 'idle_0', ms: 100, x: 0 }],
    obiri2: [{ p: 'shB_3', ms: 220, x: .1, phantom: 1 }, { p: 'shA_2', ms: 600, x: .1, ev: 'aim' }, { p: 'idle_0', ms: 120, x: 0 }],
    obiVolley: [{ p: 'shB_3', ms: 180, x: .25, phantom: 1 }, { p: 'shB_2', ms: 380, x: .3, y: .8, phantom: 1, ev: 'volley' }, { p: 'idle_3', ms: 260, x: .2, y: .9, spin: -6.283, phantom: 1 }, { p: 'shB_3', ms: 320, x: .1, y: 0, phantom: 1, ev: 'shot' }, { p: 'idle_0', ms: 120, x: 0 }],
    obiKnee: [{ p: 'shB_3', ms: 400, x: .3, phantom: 1, ev: 'knee' }, { p: 'idle_3', ms: 280, x: 0, y: .45, spin: -6.283, phantom: 1 }, { p: 'idle_0', ms: 100, x: 0, y: 0 }],
    ult: [{ p: 'oult_1', ms: 480, x: 0, ev: 'charge' }, { p: 'shA_3', ms: 600, x: -.03, ev: 'sky' }, { p: 'idle_3', ms: 300, x: .1, y: 1.1, spin: -6.283, phantom: 1 }, { p: 'shB_1', ms: 280, x: .2, y: 1, phantom: 1, ev: 'air' }, { p: 'shB_2', ms: 260, x: .3, y: .8, phantom: 1, ev: 'air' }, { p: 'oult_3', ms: 280, x: .25, y: .5, phantom: 1, ev: 'air' },
      { p: 'shB_3', ms: 220, x: 0, y: 0, phantom: 1 }, { p: 'oult_1', ms: 300, x: 0, ev: 'charge2' }, { p: 'oult_2', ms: 650, x: -.12, ev: 'big' }, { p: 'idle_0', ms: 140, x: 0 }],
  },
};
const reachTo = (u, f) => Math.max(0, Math.abs(pos(f)[0] - pos(u)[0]) - f.w * .42 - u.w * .3);
// play a step list on a battle unit; onEv(name, step) fires at each step start
async function runKF(u, f, seq, onEv) {
  const R = f ? reachTo(u, f) : 0;
  for (const st of seq) {
    const cur = kfOff(u), x1 = st.hold ? cur[0] : (st.x ?? 0) * R, y1 = st.hold ? cur[1] : (st.y ?? 0) * u.h;
    u.kf = st.p; u.kfA = st.snap ? { x0: x1, x1, y0: y1, y1, t0: B.t, d: .001 } : { x0: cur[0], x1, y0: cur[1], y1, t0: B.t, d: st.ms / 1000 * .7 };
    if (st.lines) { const [hx, hy] = pos(u); fx('lines', 260, { x0: hx + cur[0], x1: hx + x1, y: hy - u.h * .5, h: u.h * .7 }); }
    if (st.ghost) B.ghosts.push({ u, p: st.p, x: pos(u)[0] + cur[0], y: pos(u)[1] - cur[1], t0: B.t });
    u.kfSpin = st.spin ? { t0: B.t, d: st.ms / 1000 * .9, a: st.spin } : null;
    u.kfPh = !!st.phantom; if (st.phantom) u.phHue = PH_HUE[u.id] ?? 185;
    if (st.ev && onEv) await onEv(st.ev, st);
    await wait(st.ms);
  }
}
function kfOff(u) { const a = u.kfA; if (!a) return [0, 0]; const t = Math.min(1, (B.t - a.t0) / (a.d || .001)), e = 1 - (1 - t) ** 3; return [a.x0 + (a.x1 - a.x0) * e, a.y0 + (a.y1 - a.y0) * e]; }
const kfEnd = (u) => { u.kfSpin = null; u.kfPh = false; u.kf = null; u.kfA = null; u.kfAlpha = 1; };
const VIO = '#c58bff';
const SPL = { dufie: 'ultE_2', blay: 'ultX_2', kuukua: 'thB_2', obiri: 'oult_1' };
const PH_HUE = { blay: 185, kuukua: 322, obiri: 15 };
const PH_LIFE = { blay: 4.8, kuukua: 5.2, obiri: 1.8 }, PH_GAP = { blay: .014, kuukua: .008, obiri: .018 }; // phantom trail tint per hero // ultimate splash pose
async function dufieRecover(u, f) { await runKF(u, f, SEQ.dufie.recover, async (ev) => { if (ev === 'land') { const [x, y] = pos(u); burst(x, y, ['#d8c9b0', '#fff'], 10, 3); } }); kfEnd(u); }
CHOREO.dufie = {
  basic: async (u, f, m, o) => { let d = 0; await runKF(u, f, SEQ.dufie.basic, async (ev) => { const [x, y] = pos(f);
      if (ev === 'cut1') { fx('arc', 300, { x, y: y - f.h * .5, r: f.h * .55, c: VIO, dir: 1 }); d = hit(u, f, m * .6, o); hitStop(60); }
      if (ev === 'cut2' && f.alive) { fx('arc', 300, { x, y: y - f.h * .45, r: f.h * .5, c: '#ffffff', dir: -1, flipY: 1 }); hit(u, f, m * .4, o); hitStop(50); } });
    await dufieRecover(u, f); return d; },
  dufie1: async (u, f, m) => { await runKF(u, f, SEQ.dufie.dufie1, async (ev) => { const [x, y] = pos(f), [hx, hy] = pos(u);
      if (ev === 'smoke') fx('smoke', 700, { x: hx, y: hy, r: u.h * .35, c: VIO, n: 9 });
      if (ev === 'stab') { fx('star', 420, { x, y: y - f.h * .5, r: f.h * .7, c: VIO }); hitStop(130); hit(u, f, 1.4 * m, { color: VIO, crit: true }); } });
    await dufieRecover(u, f); pushTM(u, .5); float(u, 'TURN +50%', '#7ee08a', .8); },
  dufie2: async (u, f, m) => { await runKF(u, null, SEQ.dufie.dufie2, async (ev) => { const [hx, hy] = pos(u);
      if (ev === 'smoke') fx('smoke', 1100, { x: hx, y: hy, r: u.h * .55, c: VIO, n: 16, rise: 1 });
      if (ev === 'fade') u.kfAlpha = .55; if (ev === 'reform') u.kfAlpha = 1; });
    kfEnd(u); u.st.evade = 1; float(u, 'EVADE NEXT HIT', VIO, .9); },
  dufKick: async (u, f, m) => { const S = SPELLS.dufKick; await runKF(u, f, SEQ.dufie.dufKick, async (ev) => { const [x, y] = pos(f);
      if (ev === 'kick1') { fx('arc', 300, { x, y: y - f.h * .62, r: f.h * .5, c: '#ffffff', dir: 1, tilt: -.3 }); hit(u, f, S.mult * .55 * m, { color: '#fff' }); hitStop(60); }
      if (ev === 'kick2' && f.alive) { fx('arc', 320, { x, y: y - f.h * .55, r: f.h * .55, c: VIO, dir: 1, tilt: 1.3 }); hit(u, f, S.mult * .45 * m, { color: VIO }); hitStop(110); B.shake = 10; addSt(f, 'stun', 1); }
      if (ev === 'land') { const [hx, hy] = pos(u); burst(hx + kfOff(u)[0], hy, ['#d8c9b0', '#fff'], 12, 3.5); } });
    await dufieRecover(u, f); },
  dufStars: async (u, f, m) => { const S = SPELLS.dufStars; const toss = async (n) => { for (let k = 0; k < n && f.alive; k++) { const [x0, y0] = pos(u), [x1, y1] = pos(f); fx('shot', 200, { x0: x0 + u.w * .3, y0: y0 - u.h * (.55 + .12 * (k - 1)), x1, y1: y1 - f.h * (.3 + .4 * Math.random()), kind: 'dagger' }); SFX.shoot(); await wait(55); }
        await wait(140); for (let k = 0; k < n && f.alive; k++) hit(u, f, S.mult * m, { color: '#e6edf5' }); };
    await runKF(u, null, SEQ.dufie.dufStars, async (ev) => { if (ev === 'throw3') toss(3); if (ev === 'throw2') toss(2); });
    await wait(200); kfEnd(u); if (f.alive) { addSt(f, 'defDown', 2); float(f, 'DEF▼', '#ff5a4a', .8); } },
  ult: async (u, f, m, T) => { await runKF(u, f, SEQ.dufie.ult, async (ev) => { const [x, y] = pos(f), [hx, hy] = pos(u);
      const strike = (part, o) => { fx('arc', 300, { x: x + rnd(-6, 6), y: y - f.h * (o.yy || .5), r: f.h * (o.r || .6), c: o.c || VIO, dir: o.dir || 1, tilt: o.tilt || 0 }); hit(u, f, part * m, { color: VIO, big: o.big }); hitStop(o.stop || 70); };
      if (ev === 'charge') { fx('star', 340, { x: hx, y: hy - u.h * .5, r: u.h * .6, c: VIO }); B.shake = 4; }
      if (ev === 'leap') burst(hx, hy, ['#fff', '#d8c9b0'], 12, 4);
      if (ev === 's1') { await impactFrames(T, u); strike(.45, { yy: .35, tilt: -1.1, c: '#fff', big: 1, stop: 110 }); }
      if (ev === 's2' && f.alive) strike(.4, { yy: .6, tilt: -.9, r: .75, c: VIO, stop: 90 });
      if (ev === 'k1' && f.alive) strike(.3, { yy: .7, dir: -1, tilt: .2, c: '#fff' });
      if (ev === 'k2' && f.alive) strike(.3, { yy: .75, tilt: -.2, c: VIO });
      if (ev === 'k3' && f.alive) strike(.3, { yy: .8, dir: -1, tilt: .3, c: '#fff', stop: 90 });
      if (ev === 's4' && f.alive) { strike(.28, { r: .7, c: VIO }); strike(.27, { r: .55, c: '#fff', big: 1, stop: 140 }); fx('star', 600, { x, y: y - f.h * .5, r: f.h, c: VIO }); fx('smoke', 900, { x, y, r: f.h * .5, c: VIO, n: 12 }); B.shake = 14; }
      if (ev === 'land') burst(hx, hy, ['#d8c9b0', '#fff'], 10, 3); });
    kfEnd(u); },
};
// Blay: calm body, the cut is the event: blue-black crescents leave the blade and fly across the screen
const BLU = '#2f6bff', BLK = '#0b1230';
const sproj = (u, k, o = {}) => { const [hx, hy] = pos(u), d = u.side ? -1 : 1, [ox] = kfOff(u); fx('sproj', (o.ms || 560) * (u.id === 'blay' ? .8 : 1.35), { k, x0: hx + d * (ox + u.h * .5), x1: o.x1 ?? (d > 0 ? B.w * 1.25 : -B.w * .25), y: hy - u.h * (o.yy ?? .55), s: u.h * (o.s ?? .9) * 1.45, rot: o.rot || 0, flip: o.flip, mir: d < 0 }); };
// shunpo events shared by every Blay move: vanish leaves a navy smear to where he lands
const shunpo = (u, f) => async (ev, st) => { const [hx, hy] = pos(u), d = u.side ? -1 : 1;
  if (ev === 'blink') { const [ox] = kfOff(u); u.kfAlpha = 0; u._sx = hx + d * ox; SFX.hit(); burst(u._sx, hy, ['#1a2550', '#9fb4ff'], 6, 2); }
  if (ev === 'appear') { const [ox] = kfOff(u); u.kfAlpha = 1; fx('streak', 260, { x0: u._sx ?? hx, x1: hx + d * ox, y: hy - u.h * .45, h: u.h * .55, c: '#1a2a6a' }); burst(hx + d * ox, hy, ['#d8c9b0', '#fff'], 8, 3); } };
async function blayRecover(u, f) { const sh = shunpo(u, f); await runKF(u, f, SEQ.blay.recover, sh); kfEnd(u); }
CHOREO.blay = {
  basic: async (u, f, m, o) => { let d = 0; await runKF(u, f, SEQ.blay.basic, async (ev) => {
      if (ev === 'cut') { sproj(u, 1, { s: 1, yy: .5, rot: -.3 }); await wait(150); d = hit(u, f, m, { ...o, color: BLU }); hitStop(80); } }); kfEnd(u); return d; },
  blay1: async (u, f, m) => { await runKF(u, f, SEQ.blay.blay1, async (ev) => {
      if (ev === 'cut1') { sproj(u, 2, { s: 1.15, yy: .62 }); await wait(140); hit(u, f, .8 * m, { color: BLU }); hitStop(80); }
      if (ev === 'cut2' && f.alive) { sproj(u, 0, { s: .75, yy: .58, flip: 1 }); await wait(140); hit(u, f, .8 * m, { color: BLU }); hitStop(90); addSt(f, 'defDown', 2); float(f, 'DEF▼', '#ff5a4a', .8); } });
    kfEnd(u); },
  blay2: async (u, f, m) => { await runKF(u, null, SEQ.blay.blay2, async (ev) => { if (ev === 'guard') { u.st.guard = 1; fx('ward', 900, { unit: u, c: '#5aa8ff' }); float(u, 'PARRY', '#9fd0ff', .8); } }); kfEnd(u); },
  blayRush: async (u, f, m) => { const sh = shunpo(u, f); await runKF(u, f, SEQ.blay.blayRush, async (ev, st) => { await sh(ev, st);
      if (ev === 'sweep') { sproj(u, 0, { s: .65, yy: .16, ms: 420 }); await wait(110); hit(u, f, .5 * m, { color: BLU }); hitStop(70); }
      if (ev === 'rise' && f.alive) { sproj(u, 2, { s: 1.25, yy: .75, flip: 1, ms: 420 }); await wait(110); hit(u, f, .45 * m, { color: BLU }); hitStop(90); }
      if (ev === 'drop' && f.alive) { sproj(u, 2, { s: 1.1, yy: .45, ms: 400 }); await wait(100); hit(u, f, .45 * m, { color: BLU }); hitStop(110); B.shake = 7; } });
    await blayRecover(u, f); pushTM(u, .3); float(u, 'TURN +30%', '#7ee08a', .8); },
  blayRally: async (u, f, m) => { await runKF(u, null, SEQ.blay.blayRally, async (ev) => { if (ev === 'rally') { const [x, y] = pos(u); fx('star', 600, { x, y: y - u.h * 1.05, r: u.h * .4, c: BLU }); delete u.st.stun; delete u.st.burn; addSt(u, 'atkUp', 3); u.atkUpK = 1.25; float(u, 'ATK▲', '#ffb070', .8); } }); kfEnd(u); },
  ult: async (u, f, m, T) => { const sh = shunpo(u, f); await runKF(u, f, SEQ.blay.ult, async (ev, st) => { await sh(ev, st); const [hx, hy] = pos(u);
      const cut = (k, o, part) => { sproj(u, k, { ms: 380, ...o }); if (f.alive) { hit(u, f, part * m, { color: BLU }); hitStop(60); } };
      if (ev === 'charge') { fx('star', 420, { x: hx, y: hy - u.h * .45, r: u.h * .6, c: BLU }); B.shake = 4; }
      if (ev === 'u1') cut(2, { s: 1.25, yy: .75, flip: 1 }, .25);
      if (ev === 'u2') cut(2, { s: 1.2, yy: .6 }, .25);
      if (ev === 'u3') cut(0, { s: .8, yy: .55, flip: 1 }, .25);
      if (ev === 'u4') cut(2, { s: 1.1, yy: .45 }, .25);
      if (ev === 'release') { await impactFrames(T, u); sproj(u, 3, { s: 2.2, ms: 900, yy: .6, x1: B.w * 1.6 }); await wait(80); sproj(u, 0, { s: 1.1, ms: 700, yy: .45, x1: B.w * 1.5 }); await wait(260); B.shake = 16;
        if (!f.alive) return; if (f.hp / f.max < .3 && !f.boss) { hit(u, f, 99, { big: 1, color: BLU }); float(f, 'EXECUTED', '#ffd23c', 1.3); } else hit(u, f, 2.0 * m, { big: 1, color: BLU }); hitStop(160); } });
    kfEnd(u); },
};
// Kuukua: relentless thrusts, every jab a small flash, finishers a big crimson flash
const RED = '#ff3b4a', GOLD = '#ffcf5a';
const debris = (x, y, n = 10, sz = 40) => fx('deb', 1100, { x, y, ps: Array.from({ length: n }, () => ({ vx: rnd(-260, 260), vy: rnd(-620, -260), r: rnd(0, 6), vr: rnd(-8, 8), s: sz * rnd(.4, 1), sx: (Math.random() * 4 | 0) / 4 })) });
const tip = (u, f, yy = .55) => { const [x, y] = pos(f); return [x - (u.side ? -1 : 1) * f.w * .15 + rnd(-6, 6), y - f.h * (yy + rnd(-.08, .08))]; };
async function kuuRecover(u, f) { await runKF(u, f, SEQ.kuukua.recover); kfEnd(u); }
const kuuEv = (u, f, m, per) => async (ev) => { const [x, y] = tip(u, f);
  if (ev === 't' && f.alive) { fx('flash', 220, { x, y, r: f.h * .28, c: RED, n: 8, rot: rnd(0, 1) }); hit(u, f, per * m, { color: '#ffd0d4' }); hitStop(30); }
  if (ev === 'T' && f.alive) { fx('flash', 320, { x, y, r: f.h * .45, c: RED, n: 10 }); hit(u, f, per * 1.6 * m, { color: RED }); hitStop(80); }
  if (ev === 'charge') { const [hx, hy] = pos(u); fx('star', 300, { x: hx, y: hy - u.h * .5, r: u.h * .4, c: RED }); }
  if (ev === 'POW' && f.alive) { fx('flash', 520, { x, y, r: f.h * .95, c: RED, n: 14 }); fx('flash', 400, { x, y, r: f.h * .5, c: '#fff', n: 6, rot: .3 }); B.shake = 12; hitStop(150); return 'pow'; } };
CHOREO.kuukua = {
  basic: async (u, f, m, o) => { let d = 0; const ev = kuuEv(u, f, m, .22); await runKF(u, f, SEQ.kuukua.basic, async (e) => { if (e === 't' && f.alive) { const [x, y] = tip(u, f); fx('flash', 220, { x, y, r: f.h * .28, c: RED }); d += hit(u, f, .22 * m, o); hitStop(30); } else await ev(e); }); await kuuRecover(u, f); return d; },
  kuukua1: async (u, f, m) => { const ev = kuuEv(u, f, m, .12); await runKF(u, f, SEQ.kuukua.kuukua1, async (e) => { if ((await ev(e)) === 'pow') { hit(u, f, .7 * m, { color: RED, big: 1 }); addSt(f, 'defDown', 2); float(f, 'DEF▼', '#ff5a4a', .8); } }); await kuuRecover(u, f); },
  kuukua2: async (u, f, m) => { const ev = kuuEv(u, f, m, .3); await runKF(u, f, SEQ.kuukua.kuukua2, async (e) => { await ev(e); if (e === 'sweep' && f.alive) { const [x, y] = pos(f); fx('arc', 320, { x, y: y - f.h * .12, r: f.h * .5, c: RED, dir: 1, tilt: 1.5 }); hit(u, f, .8 * m, { color: RED }); hitStop(90); pushTM(f, -.4); addSt(f, 'slow', 1); float(f, 'TURN −40%', '#c58bff', .8); } }); await kuuRecover(u, f); },
  kuuThrow: async (u, f, m) => { await runKF(u, f, SEQ.kuukua.kuuThrow, async (e) => { const [hx, hy] = pos(u), [x, y] = pos(f);
      if (e === 'charge') fx('star', 300, { x: hx, y: hy - u.h * .9, r: u.h * .4, c: RED });
      if (e === 'throw') { fx('sproj', 560, { src: 'fx_spear', x0: hx + u.w * .3, x1: x + f.w * .2, y: hy - u.h * .65, s: u.h * .22 }); await wait(300); debris(x, y, 8, u.h * .12); fx('flash', 520, { x, y: y - f.h * .5, r: f.h * .9, c: RED, n: 12 }); hit(u, f, 1.3 * m, { color: RED, crit: true, big: 1 }); hitStop(140); B.shake = 10; } }); kfEnd(u); },
  kuuWall: async (u, f, m) => { await runKF(u, null, SEQ.kuukua.kuuWall, async (e) => { if (e === 'wall') { u.st.guard = 1; addSt(u, 'atkUp', 3); u.atkUpK = 1.2; fx('ward', 900, { unit: u, c: '#ff3040' }); float(u, 'LANCE WALL', '#ffb0b8', .9); } }); kfEnd(u); },
  ult: async (u, f, m, T) => { const ev = kuuEv(u, f, m, .07); const dbl = f.st.slow || f.st.defDown; await runKF(u, f, SEQ.kuukua.ult, async (e) => { const r = await ev(e);
      if (r === 'pow') hit(u, f, .5 * m, { color: RED, big: 1 });
      if (e === 'leap') { B.cam.tz = B.rest.z * .72; B.cam.ty = B.rest.y - .12; await impactFrames(T, u); B.cam.tz = B.rest.z * .72; B.cam.ty = B.rest.y - .12; }
      if (e === 'rain') { const [x, y] = pos(f); for (let k = 0; k < 14; k++) { const xx = x + rnd(-f.w * .9, f.w * .9); fx('spearP', 520, { x0: xx - 60, y0: y - B.hh * .9, x1: xx, y1: y - f.h * rnd(.1, .5), len: u.h * .35, c: RED }); if (k % 3 === 2) setTimeout(() => debris(xx, y, 6, u.h * .1), 260); await wait(45); }
        await wait(160); fx('flash', 600, { x, y: y - f.h * .4, r: f.h * 1.2, c: RED, n: 16 }); B.shake = 16; if (f.alive) hit(u, f, (dbl ? 2.4 : 1.2) * m, { color: RED, big: 1 }); hitStop(160); }
      if (e === 'land') { const [hx, hy] = pos(u); burst(hx, hy, ['#d8c9b0', '#fff'], 12, 4); debris(hx, hy, 8, u.h * .1); B.cam.tz = B.rest.z; B.cam.ty = B.rest.y; } });
    await kuuRecover(u, f); },
};
// Obiri: arrows are glowing projectiles; flips, mid-air shots and arrow rain
const arrow = (u, f, o = {}) => { const [hx, hy] = pos(u), [ox, oy] = kfOff(u), d = u.side ? -1 : 1, [x, y] = pos(f); fx('arrowP', o.ms || 420, { x0: hx + d * (ox + u.h * .35), y0: hy - oy - u.h * (o.yy ?? .62), x1: x + rnd(-6, 6), y1: y - f.h * (o.ty ?? .5), c: o.c || GOLD, hitAt: .6, len: u.h * .16, w: o.w || 3 }); };
CHOREO.obiri = {
  basic: async (u, f, m, o) => { let d = 0; await runKF(u, f, SEQ.obiri.basic, async (e) => { if (e === 'shot') { arrow(u, f); await wait(250); d = hit(u, f, m, { ...o, color: GOLD }); } }); kfEnd(u); return d; },
  obiri1: async (u, f, m) => { await runKF(u, f, SEQ.obiri.obiri1, async (e) => { if (e === 'pin') { arrow(u, f, { ty: .2, w: 4 }); await wait(250); const [x, y] = pos(f); fx('flash', 380, { x, y: y - f.h * .2, r: f.h * .5, c: GOLD }); hit(u, f, 1.0 * m, { color: GOLD }); addSt(f, 'slow', 2); float(f, 'PINNED', GOLD, .8); } if (e === 'land') { const [hx, hy] = pos(u); burst(hx, hy, ['#d8c9b0'], 8, 3); } }); kfEnd(u); },
  obiri2: async (u, f, m) => { await runKF(u, null, SEQ.obiri.obiri2, async (e) => { if (e === 'aim') { u.st.aim = 1; const [hx, hy] = pos(u); fx('star', 600, { x: hx + u.h * .35, y: hy - u.h * .6, r: u.h * .3, c: GOLD }); float(u, 'STEADY AIM', GOLD, .9); } }); kfEnd(u); },
  obiVolley: async (u, f, m) => { await runKF(u, f, SEQ.obiri.obiVolley, async (e) => { if (e === 'volley') for (let k = 0; k < 2; k++) { arrow(u, f, { ty: .4 + k * .2 }); await wait(110); }
      if (e === 'shot') { arrow(u, f, { yy: .3 }); } if (e === 'volley' || e === 'shot') { await wait(200); for (let k = 0; k < (e === 'volley' ? 2 : 1) && f.alive; k++) hit(u, f, .45 * m, { color: GOLD }); } }); kfEnd(u); },
  obiKnee: async (u, f, m) => { await runKF(u, f, SEQ.obiri.obiKnee, async (e) => { if (e === 'knee') { arrow(u, f, { yy: .3, ty: .25, w: 4 }); await wait(260); const [x, y] = pos(f); fx('flash', 420, { x, y: y - f.h * .25, r: f.h * .6, c: GOLD }); hit(u, f, .9 * m, { color: GOLD }); addSt(f, 'stun', 1); if (f.charging) { f.charging = false; float(f, 'INTERRUPTED', GOLD, .9); } } }); kfEnd(u); },
  ult: async (u, f, m, T) => { await runKF(u, f, SEQ.obiri.ult, async (e) => { const [hx, hy] = pos(u), [x, y] = pos(f);
      if (e === 'charge' || e === 'charge2') { fx('star', 420, { x: hx + u.h * .35, y: hy - u.h * .6, r: u.h * .45, c: GOLD }); B.shake = 3; }
      if (e === 'sky') { for (let k = 0; k < 5; k++) { fx('arrowP', 380, { x0: hx + u.h * .3, y0: hy - u.h * .9, x1: hx + u.h * 1.2 + k * 20, y1: -40, c: GOLD, hitAt: 1, len: u.h * .14 }); await wait(60); }
        await wait(200); for (let k = 0; k < 22; k++) { const xx = x + rnd(-f.w * 1.1, f.w * 1.1); fx('arrowP', 420, { x0: xx - 40, y0: -40, x1: xx, y1: y - f.h * rnd(0, .7), c: GOLD, hitAt: .8, len: u.h * .12 }); if (k % 4 === 3 && f.alive) hit(u, f, .12 * m, { color: GOLD }); await wait(28); } }
      if (e === 'air' && f.alive) { arrow(u, f); await wait(200); hit(u, f, .25 * m, { color: GOLD }); }
      if (e === 'big') { await impactFrames(T, u); fx('arrowP', 360, { x0: hx + u.h * .4, y0: hy - u.h * .6, x1: x, y1: y - f.h * .5, c: '#fff1b0', hitAt: .5, len: u.h * .4, w: 7 }); await wait(180); fx('beam', 500, { x0: hx, y0: hy - u.h * .6, x1: x + B.w, y1: y - f.h * .5, c: GOLD }); fx('flash', 600, { x, y: y - f.h * .5, r: f.h * 1.3, c: GOLD, n: 16 }); B.shake = 16; if (f.alive) hit(u, f, 2.0 * m, { color: GOLD, crit: true, big: 1 }); hitStop(160); } });
    kfEnd(u); },
};
// draw one clip frame with feet at (0,0) and body height bodyH
function drawClip(g, c, fi, bodyH) {
  fi = Math.max(0, Math.min(c.n - 1, fi | 0));
  const im = img(c.sheets[Math.floor(fi / c.per)]); if (!im.ok) return false;
  const j = fi % c.per, k = bodyH / c.bh;
  g.drawImage(im.el, (j % c.cols) * c.fw, Math.floor(j / c.cols) * c.fh, c.fw, c.fh, -c.ax * k, -c.fy * k, c.fw * k, c.fh * k);
  return true;
}
const poseSrc = (id, k) => `${A}${id}_${k}.webp${AV}`;
const faceSrc = (id) => (HEROES[id] ? `${A}face_${id}.webp${AV}` : poseSrc(id, 0));
function scaled(e, th) {
  if (!e.ok) return null; th = Math.max(16, Math.round(th / 8) * 8);
  if (th >= e.el.naturalHeight * 0.8) return e.el;
  if (e.sc[th]) return e.sc[th];
  let src = e.el, w = src.naturalWidth, hh = src.naturalHeight;
  while (hh / 2 >= th) { const c = document.createElement('canvas'); c.width = Math.round(w / 2); c.height = Math.round(hh / 2); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); src = c; w = c.width; hh = c.height; }
  const c = document.createElement('canvas'); c.width = Math.round(w * th / hh); c.height = th; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  return (e.sc[th] = c);
}
function silhouette(e, th, color) {
  const s = scaled(e, th); if (!s) return null; const k = th + color;
  if (e.sil[k]) return e.sil[k];
  const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const g = c.getContext('2d');
  g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return (e.sil[k] = c);
}
for (const id of [...Object.keys(HEROES), ...Object.keys(MONS)]) for (let k = 0; k < 3; k++) img(poseSrc(id, k));
for (const r of Object.values(REGIONS)) img(`${A}bg_${r.bg}.webp`);
// Effect animations: frames from Firefly video clips on black, drawn additively so black = transparent.
// base = where the effect touches the ground (fraction of frame height). peak = the frames we actually play (no wind-up, no long tail).
const FXS = {
  shield: { n: 14, w: 244, h: 178, base: .94, loop: [8, 13] },
  heal: { n: 16, w: 208, h: 226, base: .86, peak: [3, 12] },
  fire: { n: 10, w: 348, h: 232, base: .9, peak: [1, 7] },
  hex: { n: 10, w: 348, h: 232, base: .9, peak: [1, 7] },
};
for (const k in FXS) FXS[k].img = img(`${A}fx/${k}.webp`);
// draw one frame; ww/hh can differ (the shield is stretched to cover tall fighters)
function sprite(g, k, frame, cx, by, hh, alpha = 1, ww) {
  const S = FXS[k]; if (!S || !S.img.ok) return false;
  const f = clamp(Math.floor(frame), 0, S.n - 1); ww = ww || hh * S.w / S.h;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.drawImage(S.img.el, f * S.w, 0, S.w, S.h, cx - ww / 2, by - hh * S.base, ww, hh); g.restore(); return true;
}

// ---------------- Adinkra in battle: glowing ink calligraphy ----------------
// Menus use the flat SVGs. In battle the symbol is brushed in: dark ink core, dry-brush texture, coloured energy rim.
const INK = {};
function inkSymbol(sym, color) {
  const key = sym + color; if (INK[key]) return INK[key];
  const S = 256, P = 48, c = document.createElement('canvas'); c.width = c.height = S + P * 2; const g = c.getContext('2d');
  const path = adinkraPath(sym), a = ADINKRA[sym], k = S / 128;
  const draw = (fn) => { g.save(); g.translate(P + S / 2, P + S / 2); g.scale(k, k); g.translate(-a.w / 2, -a.h / 2); fn(); g.restore(); };
  // energy glow
  draw(() => { g.shadowColor = color; g.shadowBlur = 26; g.fillStyle = color; g.fill(path, 'evenodd'); });
  draw(() => { g.lineJoin = 'round'; g.strokeStyle = color; g.lineWidth = 5; g.stroke(path); });
  // ink body, a few offset passes so edges look brushed rather than vector-clean
  for (let i = 0; i < 4; i++) draw(() => { g.translate(rnd(-1.2, 1.2), rnd(-1.2, 1.2)); g.fillStyle = i ? 'rgba(14,8,12,.55)' : '#0e080c'; g.fill(path, 'evenodd'); });
  // dry-brush streaks: knock out thin diagonal hairlines inside the ink
  g.save(); g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,.55)';
  for (let i = 0; i < 70; i++) { const y = rnd(0, S + P * 2), x = rnd(0, S + P * 2), L = rnd(10, 40); g.lineWidth = rnd(.6, 1.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y - L * .35); g.stroke(); }
  g.restore();
  // re-light the rim on top so the edge glows
  draw(() => { g.globalCompositeOperation = 'lighter'; g.strokeStyle = color; g.globalAlpha = .55; g.lineWidth = 2.2; g.stroke(path); });
  return (INK[key] = c);
}

// ---------------- hero stats ----------------
const SPD_STAR = 2; // speed per star above base
const ptsOf = (id) => { const s = SAVE.heroes[id]; if (!s.pts) s.pts = { hp: 0, atk: 0, spd: 0, mag: 0 }; return s.pts; };
const freePts = (id) => { const p = ptsOf(id); return SAVE.heroes[id].lvl - 1 - (p.hp + p.atk + p.mag + p.spd * GROWTH.spdCost); };
function statsOf(id) {
  const H = HEROES[id], s = SAVE.heroes[id], p = ptsOf(id), k = (1 + 0.06 * (s.lvl - 1)) * (1 + 0.15 * (s.stars - 1));
  return { hp: Math.round(H.hp * k * (1 + GROWTH.hp * p.hp)), atk: Math.round(H.atk * k * (1 + GROWTH.atk * p.atk)), def: Math.round(H.def * k),
    spd: CLASSES[H.cls].spd + SPD_STAR * (s.stars - RARITY[H.rarity].stars) + GROWTH.spd * p.spd, mag: Math.round(100 * (1 + GROWTH.mag * p.mag)) };
}
const power = (id) => { const st = statsOf(id), s = SAVE.heroes[id]; return Math.round(st.hp * 0.5 + st.atk * 6 + st.def * 4 + st.spd * 2 + (st.mag - 100) * 4 + (s.sk[0] + s.sk[1] + s.sk[2]) * 30); };
const skMult = (id, i) => 1 + 0.12 * (SAVE.heroes[id].sk[i] - 1);
const spLvl = (id, sid) => (SAVE.heroes[id].sl || {})[sid] || 1;
// name / note / level of the move in slot i (0 basic, 1-2 equipped spells, 3 ultimate) for a hero id
const moveOf = (id, i, eq) => { const H = HEROES[id]; if (i === 0 || i === 3) return { name: H.kit[i], note: H.notes[i], cd: 0 }; const sid = (eq || SAVE.heroes[id]?.eq || H.pool)[i - 1]; return { ...SPELLS[sid], sid }; };
const canPromote = (id) => { const s = SAVE.heroes[id]; return s.stars < 5 && s.shards >= STAR_SHARDS[s.stars + 1]; };
const anyUpgrade = () => Object.keys(SAVE.heroes).some((id) => freePts(id) > 0) || Object.keys(SAVE.heroes).some((id) => canPromote(id) || SAVE.heroes[id].sk.some((l) => l < SKILL_MAX && SAVE.gold >= skillCost(l) * 3));

// ---------------- shell ----------------
let tab = 'map';
function shell(active, content) {
  app.classList.remove('full');
  app.innerHTML = '';
  const top = h(`<header class="topbar"><div class="logo"><img src="star.svg" alt="Gyeaman"></div>
    <span class="res" title="Gold dust">${COIN('gold')}<b class="num">${fmt(SAVE.gold)}</b></span><span class="res" title="Cowries">${COIN('cowrie')}<b class="num">${fmt(SAVE.cowries)}</b></span></header>`);
  const nav = h(`<nav class="nav">${[['map', 'Journey'], ['heroes', 'Heroes'], ['summon', 'Shrine']].map(([k, l]) => `<button class="tab ${k === active ? 'on' : ''}" data-k="${k}" type="button">${ICON[k]}<span>${l}</span></button>`).join('')}</nav>`);
  if (anyUpgrade()) $('[data-k=heroes]', nav).append(h('<i class="dot"></i>'));
  if (SAVE.lastFree !== today()) $('[data-k=summon]', nav).append(h('<i class="dot"></i>'));
  nav.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { unlock(); SFX.click(); tab = b.dataset.k; heroSel = null; route(); }));
  const main = h('<main></main>'); main.append(content);
  app.append(top, main, nav);
}
function route() { stopBattle(); if (mapKeys) { removeEventListener('keydown', mapKeys); mapKeys = null; } ({ map: mapScreen, heroes: () => heroesScreen(), summon: summonScreen })[tab](); }
function toast(msg) { app.querySelectorAll('.toast').forEach((t) => t.remove()); const t = h(`<div class="toast">${msg}</div>`); app.append(t); setTimeout(() => t.remove(), 2200); }
const stars3 = (n) => `<span class="st3">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;

// ---------------- journey: one stage per screen, Previous / Next ----------------
let sel = null, diff = 'normal', mapKeys = null;
// a stage is a short run of duels: one opponent per wave (the boss if there is one, else the toughest)
const duelsOf = (t) => t.waves.map((w) => w.find((m) => MONS[m].boss) || w.reduce((a, b) => (MONS[b].hp > MONS[a].hp ? b : a)));
function mapScreen() {
  const open = openStage();
  if (sel === null || sel > open) sel = open;
  const t = STAGES[sel], R = REGIONS[t.region], foes = duelsOf(t), hardOpen = starsOf(sel, 'normal') > 0;
  if (diff === 'hard' && !hardOpen) diff = 'normal';
  const d = DIFF.find((x) => x.id === diff), gold = Math.round((60 + t.lvl * 40) * d.gold), first = !starsOf(sel, diff);
  const s = h(`<div class="stagescr">
    <div class="pips">${STAGES.map((x, i) => `<button type="button" class="pip ${i === sel ? 'on' : ''} ${cleared(i) ? 'done' : ''} ${x.boss ? 'boss' : ''}" data-i="${i}" ${i > open ? 'disabled' : ''} aria-label="Stage ${i + 1}"></button>`).join('')}</div>
    <div class="scard2" style="--bg:url('${A}bg_${R.bg}.webp')">
      <div class="sc-top"><span class="sub">Chapter 1 · Akan · ${R.name}</span><h2><em>${sel + 1}</em>${t.name}</h2>${t.boss ? '<span class="bosstag">Boss</span>' : ''}</div>
      <div class="opps">${foes.map((k, i) => `<div class="opp ${MONS[k].boss ? 'boss' : ''}"><img src="${poseSrc(k, 0)}" alt="" class="${MONS[k].flip[0] ? 'flip' : ''}"><b>${MONS[k].name}</b><span>Duel ${i + 1}</span></div>`).join('')}</div>
    </div>
    <div class="snav"><button class="navb" type="button" id="prev" ${sel === 0 ? 'disabled' : ''} aria-label="Previous stage">${CHEV(180)}</button>
      <div class="seg">${DIFF.map((x) => `<button class="${x.id === diff ? 'on' : ''}" type="button" data-d="${x.id}" style="--dc:${x.color}" ${x.id === 'hard' && !hardOpen ? 'disabled' : ''}><b>${x.name}</b>${stars3(starsOf(sel, x.id))}</button>`).join('')}</div>
      <button class="navb" type="button" id="next" ${sel >= open ? 'disabled' : ''} aria-label="Next stage">${CHEV(0)}</button></div>
    <div class="reward"><span>${COIN('gold')}${gold}</span>${first ? `<span>${COIN('cowrie')}${t.boss ? 100 : diff === 'hard' ? 60 : 30}</span>` : ''}<span>${COIN('xp')}${30 + t.lvl * 15} XP</span><span class="lvtag">Level ${t.lvl}</span></div>
    <button class="btn wide big" type="button" id="go">Choose fighter</button></div>`);
  shell('map', s);
  const go = (i) => { if (i < 0 || i > open) return; sel = i; SFX.click(); mapScreen(); };
  $('#prev', s).onclick = () => go(sel - 1); $('#next', s).onclick = () => go(sel + 1);
  s.querySelectorAll('.pip').forEach((p) => (p.onclick = () => go(+p.dataset.i)));
  s.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { diff = b.dataset.d; SFX.click(); mapScreen(); }));
  $('#go', s).onclick = () => { unlock(); SFX.click(); pickScreen(); };
  // swipe and arrow keys also move between stages
  let sx = null; const card = $('.scard2', s);
  card.onpointerdown = (e) => { sx = e.clientX; }; card.onpointerup = (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50) go(sel + (e.clientX < sx ? 1 : -1)); sx = null; };
  mapKeys = (e) => { if (e.key === 'ArrowLeft') go(sel - 1); if (e.key === 'ArrowRight') go(sel + 1); };
  addEventListener('keydown', mapKeys);
}

// ---------------- choose a fighter ----------------
function heroCard(id, extra = '') {
  const H = HEROES[id], s = SAVE.heroes[id], own = !!s;
  return `<button class="hc ${own ? '' : 'locked'} ${extra}" type="button" data-id="${id}" style="--rc:${RARITY[H.rarity].color}"><img src="${faceSrc(id)}" alt="">
    ${own ? `<span class="lv">${s.lvl}</span><span class="stars">${'★'.repeat(s.stars)}</span>` : ''}<span class="lab"><b>${H.name}</b><span>${own ? H.role : 'Not recruited'}</span></span></button>`;
}
const MON_LVL = 0.22;
const MM = { hp: 2.4, atk: 1.25 }; // monster tuning for duels (balance pass)
const heroPower = (id) => (SAVE.heroes[id] ? power(id) : 0);
function enemyPower(t, d) {
  const k = (1 + (t.lvl - 1) * MON_LVL) * d.mult * t.pow;
  return Math.round(.5 * Math.max(...duelsOf(t).map((id) => { const M = MONS[id]; return (M.hp * MM.hp * .5 + M.atk * MM.atk * 6 + M.def * 4 + M.spd * 2) * k; })) * (1 + .15 * (t.waves.length - 1)));
}
function powerRow(mine, foe) {
  const r = mine / foe, c = r >= 1.15 ? 'var(--good)' : r >= .9 ? 'var(--orange)' : 'var(--blood)', w = r >= 1.15 ? 'Favoured' : r >= .9 ? 'Even fight' : 'Dangerous';
  return `<div class="vs"><div><span>Your fighter</span><b class="num">${fmt(mine)}</b></div><em style="color:${c}">${w}</em><div><span>Enemy</span><b class="num">${fmt(foe)}</b></div></div>`;
}
function pickScreen() {
  const t = STAGES[sel], D = DIFF.find((x) => x.id === diff);
  if (!SAVE.heroes[SAVE.squad[0]]) SAVE.squad = [Object.keys(SAVE.heroes)[0]];
  const s = h(`<div class="screen pick"><div class="head"><button class="back" type="button" aria-label="Back">${CHEV(180)}</button><div><h2>Choose your fighter</h2><span class="sub">Stage ${sel + 1} · ${t.name} · <b style="color:${D.color}">${D.name}</b></span></div></div>
    <div class="duelcard"></div><div class="grid roster"></div>
    <div class="dock"><button class="btn wide big" type="button" id="fight">Fight</button></div></div>`);
  shell('map', s);
  $('.back', s).onclick = mapScreen;
  const draw = () => {
    const id = SAVE.squad[0], H = HEROES[id];
    $('.duelcard', s).innerHTML = `<div class="dc-h"><img src="${faceSrc(id)}" alt=""><b>${H.name}</b><span>${H.role} · ${H.en}</span></div><div class="dc-vs">VS</div>
      <div class="dc-m">${duelsOf(t).map((k) => `<img src="${poseSrc(k, 0)}" alt="${MONS[k].name}" class="${MONS[k].flip[0] ? 'flip' : ''}">`).join('')}</div>${powerRow(heroPower(id), enemyPower(t, D))}`;
    $('.roster', s).innerHTML = Object.keys(HEROES).filter((x) => SAVE.heroes[x]).sort((a, b) => power(b) - power(a)).map((x) => heroCard(x, x === id ? 'on' : '')).join('');
    s.querySelectorAll('.roster .hc').forEach((c) => (c.onclick = () => { SAVE.squad = [c.dataset.id]; SFX.click(); store(); draw(); }));
  };
  $('#fight', s).onclick = () => { unlock(); battle(sel, diff); };
  draw();
}

// ---------------- heroes (Dislyte-style: art first, panels on demand) ----------------
const ICO = {
  guardian: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
  warrior: '<path d="M19 2h3v3L10 17l-3-3zM3 18l3-3 3 3-3 3zM6 13l5 5-2 2-5-5z"/>',
  sage: '<path d="M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7 4 4 0 1 1-4 4H5a7 7 0 1 0 7-7z"/>',
  hunter: '<path d="M2 21 15 8l-3-1 8-5-5 8-1-3L2 21z"/>',
  shadow: '<path d="M14 2C8 2 4 7 4 12s4 10 10 10c-4-2-6-6-6-10s2-8 6-10zM18 6l-6 6 1 1 6-6z"/>',
  skills: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  growth: '<path d="M12 3 4 11h5v10h6V11h5z"/>',
  stars: '<path d="m12 2 3 7 7 .6-5.3 4.6L18.4 22 12 18l-6.4 4 1.7-7.8L2 9.6 9 9z"/>',
  lore: '<path d="M4 3h11l5 5v13H4zm10 1v5h5"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  close: '<path d="m5 5 14 14M19 5 5 19" stroke="currentColor" stroke-width="3" fill="none"/>',
};
const icon = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICO[k]}</svg>`;
let heroSel = null, poseLoop = null, heroTab = null, heroFilter = 'all';
const rarOrder = (r) => 'R SR SSR'.indexOf(r);
function heroList() {
  return Object.keys(HEROES).sort((a, b) => (SAVE.heroes[b] ? 1 : 0) - (SAVE.heroes[a] ? 1 : 0) || (SAVE.heroes[a] && SAVE.heroes[b] ? power(b) - power(a) : 0) || rarOrder(HEROES[b].rarity) - rarOrder(HEROES[a].rarity));
}
const needsYou = (id) => SAVE.heroes[id] && (canPromote(id) || freePts(id) > 0);
function heroesScreen(id) {
  if (poseLoop) { cancelAnimationFrame(poseLoop); poseLoop = null; }
  if (id) { heroSel = id; heroTab = null; }
  if (!heroSel) {
    const ids = heroList().filter((x) => heroFilter === 'all' || HEROES[x].cls === heroFilter);
    const s = h(`<div class="screen hlist"><div class="head"><div><h2>Heroes</h2><span class="sub">${Object.keys(SAVE.heroes).length} of ${Object.keys(HEROES).length} recruited</span></div></div>
      <div class="cfilter">${['all', ...Object.keys(CLASSES)].map((c) => `<button type="button" data-c="${c}" class="${heroFilter === c ? 'on' : ''}">${c === 'all' ? 'All' : icon(c) + CLASSES[c].name}</button>`).join('')}</div>
      <div class="hgrid">${ids.map((x) => { const H = HEROES[x], sv = SAVE.heroes[x];
        return `<button class="hcard ${sv ? '' : 'locked'}" type="button" data-id="${x}" style="--rc:${RARITY[H.rarity].color}"><img src="${faceSrc(x)}" alt="" loading="lazy">
          <span class="cl" title="${CLASSES[H.cls].name}">${icon(H.cls)}</span>${sv ? `<span class="stars">${'★'.repeat(sv.stars)}</span>` : ''}${needsYou(x) ? '<i class="dot"></i>' : ''}
          <span class="lab"><b>${H.name}</b><span>${sv ? 'Lv ' + sv.lvl : 'Not recruited'}</span></span></button>`; }).join('')}</div></div>`);
    shell('heroes', s);
    s.querySelectorAll('.cfilter button').forEach((b) => (b.onclick = () => { heroFilter = b.dataset.c; SFX.click(); heroesScreen(); }));
    s.querySelectorAll('.hcard').forEach((c) => (c.onclick = () => { SFX.click(); heroesScreen(c.dataset.id); }));
    return;
  }
  const H = HEROES[heroSel], s0 = SAVE.heroes[heroSel], own = !!s0, R = RARITY[H.rarity], C = CLASSES[H.cls], AD = ADINKRA[H.sym];
  const st = own ? statsOf(heroSel) : { hp: H.hp, atk: H.atk, def: H.def, spd: C.spd, mag: 100 };
  const order = heroList(), idx = order.indexOf(heroSel);
  const s = h(`<div class="hdet" style="--rc:${R.color}">
    <canvas class="hart" aria-label="${H.name}"></canvas><div class="hshade"></div>
    <div class="htop"><button class="back" type="button" aria-label="Back">${CHEV(180)}</button>
      <div class="hname"><span class="rar">${R.name}</span><h2>${H.name}</h2><span class="hcls">${icon(H.cls)}${C.name}<i>·</i><span class="kr" title="${H.role}">${H.kr}</span></span></div></div>
    <div class="hstats">${own ? `<div class="pw"><span>Power</span><b>${fmt(power(heroSel))}</b></div><div class="lv">Lv <b>${s0.lvl}</b> <span>${'★'.repeat(s0.stars)}</span></div>` : '<div class="lv locked">Not recruited</div>'}
      <ul><li><span>HP</span><b>${fmt(st.hp)}</b></li><li><span>ATK</span><b>${st.atk}</b></li><li><span>SPD</span><b>${st.spd}</b></li></ul></div>
    <nav class="hrail">${[['skills', 'Skills'], ['growth', 'Growth'], ['stars', 'Stars'], ['lore', 'Symbol']].map(([k, l]) => `<button type="button" data-t="${k}" aria-label="${l}">${icon(k)}<span>${l}</span>${(k === 'growth' && own && freePts(heroSel) > 0) || (k === 'stars' && own && canPromote(heroSel)) ? '<i class="dot"></i>' : ''}</button>`).join('')}
      <button type="button" class="play" aria-label="Preview moves">${icon('play')}<span>Moves</span></button></nav>
    <div class="hnav"><button type="button" class="prevh" aria-label="Previous hero">${CHEV(180)}</button><span>${idx + 1} / ${order.length}</span><button type="button" class="nexth" aria-label="Next hero">${CHEV(0)}</button></div>
    <div class="hsheet" aria-hidden="true"><div class="hs-head"><b></b><button type="button" class="hs-x" aria-label="Close">${icon('close')}</button></div><div class="hs-body"></div></div></div>`);
  shell('heroes', s);
  const go = (d) => { const n = order[(idx + d + order.length) % order.length]; SFX.click(); const t = heroTab; heroesScreen(n); if (t) { heroTab = t; } };
  $('.back', s).onclick = () => { heroSel = null; heroesScreen(); };
  $('.prevh', s).onclick = () => go(-1); $('.nexth', s).onclick = () => go(1);
  const sheet = $('.hsheet', s), body = $('.hs-body', sheet);
  const close = () => { heroTab = null; s.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); s.querySelectorAll('.hrail button').forEach((b) => b.classList.remove('on')); };
  $('.hs-x', s).onclick = () => { SFX.click(); close(); };
  const open = (t) => {
    heroTab = t; s.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    s.querySelectorAll('.hrail button[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    $('.hs-head b', s).textContent = { skills: 'Skills', growth: 'Growth', stars: 'Stars', lore: 'Symbol' }[t];
    if (t === 'growth') {
      const p = own ? ptsOf(heroSel) : { hp: 0, atk: 0, spd: 0, mag: 0 }, free = own ? freePts(heroSel) : 0;
      const G = [['hp', 'Health', st.hp, '+5% health'], ['atk', 'Attack', st.atk, '+5% damage'], ['mag', 'Magic', st.mag + '%', '+5% skills, ultimate, healing'], ['spd', 'Speed', st.spd, `+${GROWTH.spd} · costs ${GROWTH.spdCost} · max ${GROWTH.spdCap}`]];
      body.innerHTML = `${own ? `<div class="lvrow"><b>Lv ${s0.lvl}</b><div class="bar"><i style="transform:scaleX(${s0.xp / xpNeed(s0.lvl)})"></i></div><span>${s0.xp}/${xpNeed(s0.lvl)} XP</span></div>
          <div class="gpts"><b>${free}</b> point${free === 1 ? '' : 's'} to spend<small>One per level. ${C.name}s start at speed ${C.spd}. Free reset in beta.</small></div>` : `<p class="note">${C.name} · base speed ${C.spd}. Recruit at the Shrine to grow.</p>`}
        <div class="growth">${G.map(([k, l, v, n]) => { const can = own && (k === 'spd' ? free >= GROWTH.spdCost && p.spd < GROWTH.spdCap : free >= 1);
          return `<div class="gr"><div><span>${l}</span><b>${v}</b><small>${n}</small></div><em>${p[k] || 0}${k === 'spd' ? '/' + GROWTH.spdCap : ''}</em>${own ? `<button class="btn sm" type="button" data-g="${k}" ${can ? '' : 'disabled'} aria-label="Add a point to ${l}">+</button>` : ''}</div>`; }).join('')}</div>
        ${own && p.hp + p.atk + p.mag + p.spd ? '<button class="btn ghost sm" id="respec" type="button">Reset points</button>' : ''}`;
      body.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { ptsOf(heroSel)[b.dataset.g]++; SFX.heal(); store(); heroesScreen(heroSel); heroTab = 'growth'; reopen(); }));
      const rs = $('#respec', body); if (rs) rs.onclick = () => { s0.pts = { hp: 0, atk: 0, spd: 0, mag: 0 }; SFX.click(); store(); heroesScreen(heroSel); heroTab = 'growth'; reopen(); };
    } else if (t === 'stars') {
      body.innerHTML = own ? `<div class="starbig">${'★'.repeat(s0.stars)}<i>${'★'.repeat(5 - s0.stars)}</i></div>
        <div class="row card"><div>${COIN('shard')} <b>${s0.shards} / ${s0.stars < 5 ? STAR_SHARDS[s0.stars + 1] : 'max'} shards</b><small>Duplicates from the Shrine give shards. Each star adds 15% to all stats and +${SPD_STAR} speed.</small></div>
        <button class="btn sm" id="promo" type="button" ${canPromote(heroSel) ? '' : 'disabled'}>Promote</button></div>` : '<p class="note">Not recruited yet. Call heroes at the Shrine.</p>';
      const pr = $('#promo', body); if (pr) pr.onclick = () => { s0.shards -= STAR_SHARDS[s0.stars + 1]; s0.stars++; SFX.win(); store(); toast(`${H.name} reached ${s0.stars} stars`); heroesScreen(heroSel); heroTab = 'stars'; reopen(); };
    } else if (t === 'lore') {
      body.innerHTML = `<div class="codex">${adinkraSvg(H.sym)}<div><span class="sub">Ultimate symbol</span><b>${AD.name}</b><p>${AD.meaning}</p></div></div>
        <div class="codex kr"><span class="krbig">${H.kr}</span><div><span class="sub">Role in Kɔradin</span><b>${H.role}</b><p>${H.en}</p></div></div>`;
    } else {
      body.innerHTML = '<div class="sktabs"></div><div class="skdetail"></div><div class="pool"><span class="sub">Spell pool · equip any two</span><div class="pgrid"></div></div>';
      const tabsEl = $('.sktabs', body), det = $('.skdetail', body), pg = $('.pgrid', body);
      const eq = own ? s0.eq : H.pool.slice(0, 2), tags = ['Basic', 'Spell 1', 'Spell 2', 'Ultimate'];
      const lvOf = (key) => !own ? 1 : key === 'basic' ? s0.sk[0] : key === 'ult' ? s0.sk[3] : spLvl(heroSel, key);
      const show1 = (key, tag) => {
        const M = key === 'basic' ? moveOf(heroSel, 0) : key === 'ult' ? moveOf(heroSel, 3) : SPELLS[key], lvl = lvOf(key), cost = skillCost(lvl);
        const meta = key === 'basic' ? 'No cooldown' : key === 'ult' ? '100 energy' : `Cooldown ${M.cd} turns`;
        const slot = eq.indexOf(key);
        det.innerHTML = `<div class="skh">${spellIcon(heroSel, 0, eq, key)}<div><b>${M.name}</b><span>${tag} · ${meta}</span></div></div><p>${M.note}${lvl > 1 ? ` <em>+${Math.round(12 * (lvl - 1))}% power</em>` : ''}</p>
          ${own ? `<div class="skup"><span>Level <b>${lvl}</b> / ${SKILL_MAX}</span><button class="btn sm up" type="button" ${lvl >= SKILL_MAX || SAVE.gold < cost ? 'disabled' : ''}>${lvl >= SKILL_MAX ? 'Max' : `Upgrade ${COIN('gold')}${fmt(cost)}`}</button></div>` : ''}
          ${own && SPELLS[key] ? (slot >= 0 ? `<p class="eqd">Equipped in spell slot ${slot + 1}</p>` : `<div class="eqrow"><button class="btn sm ghost" data-s="0" type="button">Equip in slot 1</button><button class="btn sm ghost" data-s="1" type="button">Equip in slot 2</button></div>`) : ''}`;
        const up = $('.up', det); if (up) up.onclick = () => { SAVE.gold -= cost; if (key === 'basic') s0.sk[0]++; else if (key === 'ult') s0.sk[3]++; else s0.sl[key] = lvl + 1; SFX.heal(); store(); show1(key, tag); };
        det.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { s0.eq[+b.dataset.s] = key; SFX.heal(); store(); open('skills'); }));
      };
      const keys = ['basic', eq[0], eq[1], 'ult'];
      tabsEl.innerHTML = keys.map((k, i) => `<button type="button">${spellIcon(heroSel, i, eq)}<span>${tags[i]}</span><b>${moveOf(heroSel, i, eq).name}</b>${own ? `<em>${lvOf(k)}</em>` : ''}</button>`).join('');
      const sel = (i) => { tabsEl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', i === j)); pg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); show1(keys[i], tags[i]); };
      tabsEl.querySelectorAll('button').forEach((b, i) => (b.onclick = () => { SFX.click(); sel(i); }));
      pg.innerHTML = H.pool.map((k) => `<button type="button" data-k="${k}" class="${eq.includes(k) ? 'eq' : ''}">${spellIcon(heroSel, 0, eq, k)}<b>${SPELLS[k].name}</b><span>${eq.includes(k) ? 'Equipped' : `CD ${SPELLS[k].cd}`}</span></button>`).join('');
      pg.querySelectorAll('button').forEach((b) => (b.onclick = () => { SFX.click(); tabsEl.querySelectorAll('button').forEach((x) => x.classList.remove('on')); pg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); show1(b.dataset.k, 'Spell'); }));
      sel(0);
    }
  };
  const reopen = () => { if (heroTab) { const t = heroTab; const scr = $('.hdet'); if (scr) $(`.hrail [data-t=${t}]`, scr).click(); } };
  s.querySelectorAll('.hrail button[data-t]').forEach((b) => (b.onclick = () => { SFX.click(); if (heroTab === b.dataset.t && s.classList.contains('open')) close(); else open(b.dataset.t); }));
  if (heroTab) open(heroTab);
  // art: idle loop; Moves cycles attack, skills, ultimate
  const cv = $('.hart', s); let pose = 0, poseT = 0, clipName = null;
  const MOVES = [['atk', 1], [null, 's1'], [null, 's2'], [null, 2]];
  let mi = -1;
  let kseq = null, kT = 0;
  const KMOVES = KF[heroSel] && SEQ[heroSel] ? Object.keys(SEQ[heroSel]).filter((k) => k !== 'recover') : [];
  $('.play', s).onclick = () => { if (KMOVES.length) { mi = (mi + 1) % KMOVES.length; const k = KMOVES[mi], S0 = SEQ[heroSel][k]; kseq = ['basic', 'dufie1', 'dufKick', 'ult', 'blay1', 'blayRush'].includes(k) && !(heroSel === 'blay' && k === 'ult') ? [...S0, ...SEQ[heroSel].recover] : S0; kT = performance.now(); SFX.hit(); const nm = k === 'basic' ? H.kit[0] : k === 'ult' ? H.kit[3] : SPELLS[k].name; toast(nm); return; }
    mi = (mi + 1) % MOVES.length; const [c, p] = MOVES[mi]; const AN = ANIM[heroSel]; clipName = AN && AN[c] ? c : null; pose = clipName ? 0 : (typeof p === 'string' && !AN ? 1 : p); poseT = performance.now(); if (p === 2) SFX.ult(); else SFX.hit(); };
  let sx = null; cv.onpointerdown = (e) => { sx = e.clientX; }; cv.onpointerup = (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; };
  const draw = (now) => {
    if (!cv.isConnected) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2.5, devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const sheetOpen = s.classList.contains('open');
    const floorY = sheetOpen ? r.height * .44 : r.height * .86, bodyH = Math.min(sheetOpen ? r.height * .34 : r.height * .56, r.width * 1.1);
    const x = r.width * (sheetOpen ? .5 : .56), y = floorY;
    const AN = ANIM[heroSel];
    if (KF[heroSel]) { // keyframe hero: play the chosen move, else breathe between two idle poses
      let p = 'idle_0', ox = 0, oy = 0;
      if (kseq) { let t = now - kT, i = 0, prev = { x: 0, y: 0 }; while (i < kseq.length && t > kseq[i].ms * 1.6) { t -= kseq[i].ms * 1.6; prev = kseq[i]; i++; }
        if (i >= kseq.length) kseq = null; else { const st = kseq[i], e = 1 - (1 - Math.min(1, t / (st.ms * 1.6 * .7))) ** 3, Rr = r.width * .3; p = st.p; ox = ((prev.x ?? 0) + ((st.x ?? 0) - (prev.x ?? 0)) * e) * Rr; oy = ((prev.y ?? 0) + ((st.y ?? 0) - (prev.y ?? 0)) * e) * bodyH; } }
      g.save(); g.translate(x - (kseq ? r.width * .14 : 0) + ox, y - oy); drawKF(g, heroSel, p, bodyH); g.restore();
      poseLoop = requestAnimationFrame(draw); return;
    }
    if (clipName && AN) { const c = AN[clipName], f = Math.floor((now - poseT) / 1000 * 12); if (f >= c.play.length) clipName = null; else { g.save(); g.translate(x, y); drawClip(g, c, c.play[f], bodyH); g.restore(); } }
    if (!clipName) {
      const e0 = img(poseSrc(heroSel, 0)), e = img(poseSrc(heroSel, pose));
      if (pose !== 0 && now - poseT > 1600) pose = 0;
      if (pose === 2) { const t = Math.min(1, (now - poseT) / 600), ink = inkSymbol(H.sym, '#e3b448'), S = Math.min(r.width, r.height) * .7; g.save(); g.globalAlpha = .85 * t; g.drawImage(ink, x - S / 2, y - bodyH * .55 - S / 2, S, S); g.restore(); }
      let dn = false;
      if (AN && pose === 0) { g.save(); g.translate(x, y); dn = drawClip(g, AN.idle, AN.idle.play[Math.floor(now / 1000 * 12) % AN.idle.play.length], bodyH); g.restore(); }
      if (!dn && e.ok && e0.ok) { const k = bodyH / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k, sc = scaled(e, ph * dpr);
        if (sc) { g.save(); g.translate(x, y + Math.sin(now / 500) * 2); if (H.flip[pose]) g.scale(-1, 1); g.drawImage(sc, -pw / 2, -ph, pw, ph); g.restore(); } }
    }
    poseLoop = requestAnimationFrame(draw);
  };
  poseLoop = requestAnimationFrame(draw);
}

// ---------------- summon ----------------
function summonScreen() {
  const free = SAVE.lastFree !== today();
  const s = h(`<div class="summon"><div class="shrine"><canvas width="300" height="300" aria-hidden="true"></canvas></div>
    <div class="sm-txt"><h2>Abosom Shrine</h2><p>Offer cowries to call a hero. Duplicates become shards that raise their stars.</p></div>
    <div class="pullrow">${free ? '<button class="btn big" type="button" data-n="0">Free daily call</button>' : ''}<button class="btn ${free ? 'ghost' : 'big'}" type="button" data-n="1">Call 1 · ${COIN('cowrie')}${PULL_COST}</button><button class="btn ghost" type="button" data-n="10">Call 10 · ${COIN('cowrie')}${PULL10_COST}</button></div>
    <p class="rates">Legendary 4% · Epic 18% · Rare 38% · gold 40%. A Legendary within ${PITY} calls (${PITY - SAVE.pity} left). Beta: cowries are earned in play, nothing is sold.</p></div>`);
  shell('summon', s);
  const c = $('canvas', s), g = c.getContext('2d'); g.translate(150, 150); g.fillStyle = '#e3b448'; g.shadowColor = '#e3b448'; g.shadowBlur = 16; drawAdinkra(g, 'nyameDua', 190);
  s.querySelectorAll('.pullrow .btn').forEach((b) => (b.onclick = () => {
    unlock(); const n = +b.dataset.n;
    if (n === 0) { SAVE.lastFree = today(); return doPulls(1); }
    const cost = n === 10 ? PULL10_COST : PULL_COST;
    if (SAVE.cowries < cost) { toast('Not enough cowries. Clear stages to earn more.'); return; }
    SAVE.cowries -= cost; doPulls(n);
  }));
}
function rollOne() {
  SAVE.pity++;
  let tier;
  if (SAVE.pity >= PITY) tier = 'SSR';
  else { let r = Math.random(); tier = PULL_RATES.find(([, p]) => (r -= p) < 0)?.[0] || 'gold'; }
  if (tier === 'SSR') SAVE.pity = 0;
  if (tier === 'gold') { const g = 400 + Math.floor(Math.random() * 6) * 100; SAVE.gold += g; return { gold: g }; }
  const pool = Object.keys(HEROES).filter((id) => HEROES[id].rarity === tier), id = pick(pool);
  if (SAVE.heroes[id]) { SAVE.heroes[id].shards += RARITY[tier].shards; return { id, shards: RARITY[tier].shards }; }
  SAVE.heroes[id] = newHero(id); return { id, fresh: true };
}
function doPulls(n) {
  const res = Array.from({ length: n }, rollOne); store();
  const best = res.reduce((b, r) => (r.id && 'R SR SSR'.indexOf(HEROES[r.id].rarity) > (b ? 'R SR SSR'.indexOf(HEROES[b].rarity) : -1) ? r.id : b), null);
  const rc = best ? RARITY[HEROES[best].rarity].color : '#e3b448';
  const v = h(`<div class="reveal" style="--rc:${rc}"><div class="glow"></div><div class="body"></div></div>`);
  app.append(v);
  [0, .25, .5].forEach((d) => SFX.drum(d)); if (best && HEROES[best].rarity === 'SSR') setTimeout(SFX.win, 700);
  const body = $('.body', v);
  const card = (r, i) => r.gold ? `<div class="hc gcard" style="--rc:#e3b448;animation-delay:${i * .08}s">${COIN('gold', 'big')}<b>${r.gold}</b></div>`
    : heroCard(r.id).replace('class="hc', `style="animation-delay:${i * .08}s" class="hc`).replace('</button>', `<span class="tagnew">${r.fresh ? 'NEW' : '+' + r.shards}</span></button>`);
  if (n === 1) {
    const r = res[0];
    body.innerHTML = r.gold ? `<div class="one" style="--rc:#e3b448">${COIN('gold', 'huge')}<h2>${r.gold} gold</h2></div>`
      : `<div class="one" style="--rc:${RARITY[HEROES[r.id].rarity].color}"><img src="${poseSrc(r.id, 2)}" alt="" class="${HEROES[r.id].flip[2] ? 'flip' : ''}"><span class="sub" style="color:var(--rc)">${RARITY[HEROES[r.id].rarity].name}${r.fresh ? ' · new hero' : ` · +${r.shards} shards`}</span><h2>${HEROES[r.id].name}</h2><div class="rolel">${HEROES[r.id].role} · ${HEROES[r.id].en}</div></div>`;
  } else body.innerHTML = `<div class="ten">${res.map(card).join('')}</div>`;
  body.append(h('<button class="btn big" type="button">Continue</button>'));
  $('.btn', body).onclick = () => { v.remove(); summonScreen(); };
}

// =====================================================================================
// DUEL: one hero against one monster at a time, speed turn meter, 4 moves, visible enemy intent
// =====================================================================================
let B = null;
function stopBattle() { if (B) { cancelAnimationFrame(B.raf); B.dead = true; B = null; } if (poseLoop) { cancelAnimationFrame(poseLoop); poseLoop = null; } }
const ST_LABEL = { stun: ['STUN', '#ffd23c'], burn: ['BURN', '#ff8a3c'], shield: ['SHIELD', '#6fb6ff'], atkUp: ['ATK▲', '#ffb070'], defDown: ['DEF▼', '#ff5a4a'], slow: ['SLOW', '#c58bff'], guard: ['GUARD', '#9fd0ff'], evade: ['VANISH', '#c58bff'], aim: ['AIM', '#ffd23c'] };
function unitBase(o) { return { kfAlpha: 1, st: {}, tm: 0, en: 0, pose: 0, poseT: 0, dash: 0, reach: 0, hurt: 0, h: 100, w: 60, alive: true, cd: [0, 0], shFlash: 0, shieldAmt: 0, ...o }; }
function mkHero(id) {
  const H = HEROES[id], st = statsOf(id);
  return unitBase({ side: 0, id, d: H, spells: SAVE.heroes[id].eq.slice(), name: H.name, hp: st.hp, max: st.hp, atk: st.atk, def: st.def, spd: st.spd, size: H.size, flip: H.flip, en: 25, fx: .3, fy: .7, depth: 1 });
}
function mkMon(id, lvl, mult) {
  const M = MONS[id], k = (1 + (lvl - 1) * MON_LVL) * mult;
  return unitBase({ side: 1, id, d: M, name: M.name, hp: Math.round(M.hp * k * MM.hp), max: Math.round(M.hp * k * MM.hp), atk: M.atk * k * MM.atk, def: M.def * k, spd: M.spd, range: M.range, size: M.size, flip: M.flip, boss: M.boss, enter: 1, fx: .7, fy: .7, depth: 1 });
}
const spdOf = (u) => u.spd * (u.st.slow ? .7 : 1);
function pos(u) { const W = B.w; const dir = u.side ? -1 : 1; return [u.fx * W + dir * u.dash * u.reach + (u.enter || 0) * (u.side ? 1 : -1) * W * .5, B.gy0 + u.fy * (B.gy1 - B.gy0)]; }
const wait = (ms) => new Promise((res) => { const b = B; if (!b || b.dead) return; b.waits.push({ t: b.t + ms / 1000, res }); });
function fx(type, dur, o) { B.fx.push({ type, t0: B.t, dur: dur / 1000, ...o }); }
function setPose(u, p, ms, clipName = null) { u.pose = p; u.poseT = ms / 1000; u.poseD = ms / 1000; u.clip = clipName; }
function float(u, t, c, size = 1) { const [x, y] = pos(u); B.floats.push({ x: x + rnd(-10, 10), y: y - u.h * .85, t, c, life: 1, size }); }
function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = sp * rnd(.4, 1.2); B.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: .15, life: 1, c: cols[i % cols.length], sz: rnd(2, 4) }); } }
const foeOf = (u) => (u.side ? B.hero : B.foe);

function battle(stageIdx, diffId) {
  stopBattle();
  const t = STAGES[stageIdx], D = DIFF.find((x) => x.id === diffId), duels = duelsOf(t);
  app.innerHTML = ''; app.classList.add('full');
  const s = h(`<main><div class="battle"><div class="btop"><button class="back" type="button" id="leave" aria-label="Leave">${CHEV(180)}</button><div class="t"><b>${t.name}</b><span id="wave"></span></div>
    <button class="tog" type="button" id="auto" aria-pressed="false">Auto</button><button class="tog" type="button" id="spd" aria-pressed="false">×2</button></div>
    <div class="order" aria-label="Turn order"></div>
    <div class="field"><canvas aria-label="Duel"></canvas><div class="cutwrap"></div></div>
    <div class="act"><div class="hintl"></div><div class="abtns"></div></div></div></main>`);
  app.append(s);
  const hero = mkHero(SAVE.squad[0]);
  B = { t: 0, waits: [], gy0: 0, gy1: 1, ground: REGIONS[t.region].ground, stage: t, stageIdx, D, duels, duel: 0, hero, foe: null, heroes: [hero], foes: [], fx: [], parts: [], floats: [], auto: false, speed: 1, slowT: 0, freeze: 0,
    shake: 0, dim: 0, dimTo: 0, cam: { z: 1, x: .5, y: .6, tz: 1, tx: .5, ty: .6 }, rest: { z: 1, y: .6 }, impact: null, over: false, cur: null, choice: null, armed: 0, cv: $('canvas', s), s, last: performance.now(), bg: img(`${A}bg_${REGIONS[t.region].bg}.webp`) };
  $('#leave', s).onclick = () => { stopBattle(); mapScreen(); };
  $('#auto', s).onclick = (e) => { B.auto = !B.auto; e.currentTarget.setAttribute('aria-pressed', B.auto); SFX.click(); if (B.auto && B.choice) { const c = B.choice; B.choice = null; c(aiHero(B.hero)); } };
  $('#spd', s).onclick = (e) => { B.speed = B.speed === 1 ? 2 : 1; e.currentTarget.setAttribute('aria-pressed', B.speed === 2); SFX.click(); };
  B.raf = requestAnimationFrame(loop);
  run(B);
}
async function run(b) {
  nextDuel();
  await wait(1000);
  while (B === b && !b.over) {
    const u = nextActor();
    b.cur = u; drawOrder(); { const box = $('.act', b.s); if (box) box.dataset.msg = u.side ? `${u.name} acts` : b.auto ? `${u.name} · auto` : ''; }
    await takeTurn(u);
    if (B !== b) return;
    if (!b.hero.alive) { finish(false); break; }
    if (!b.foe.alive) {
      if (b.duel < b.duels.length - 1) { b.duel++; await wait(700); const hv = Math.round(b.hero.max * .25); b.hero.hp = Math.min(b.hero.max, b.hero.hp + hv); float(b.hero, '+' + hv, '#7ee08a'); nextDuel(); await wait(1000); }
      else { finish(true); break; }
    }
  }
}
function nextDuel() {
  const id = B.duels[B.duel];
  B.foe = mkMon(id, B.stage.lvl, B.D.mult * B.stage.pow); B.foes = [B.foe];
  B.hero.tm = 0; B.foe.tm = 0; B.hero.st = Object.fromEntries(Object.entries(B.hero.st).filter(([k]) => k === 'atkUp'));
  planIntent(B.foe);
  $('#wave', B.s).textContent = `${B.D.name} · duel ${B.duel + 1} of ${B.duels.length}`;
  SFX.drum();
  if (B.foe.boss) cutIn(poseSrc(B.foe.id, 2), B.foe.name, 'BOSS', '#d23b31', true, B.foe.flip[2]);
  drawOrder();
}
function nextActor() {
  const list = [B.hero, B.foe];
  let best = null, bt = Infinity;
  for (const u of list) { const t = (1000 - u.tm) / spdOf(u); if (t < bt) { bt = t; best = u; } }
  for (const u of list) u.tm += spdOf(u) * Math.max(0, bt);
  best.tm = 0; return best;
}
function previewOrder(n = 6) {
  const list = [B.hero, B.foe].map((u) => ({ u, tm: u.tm })), out = [];
  for (let k = 0; k < n; k++) { let best = null, bt = Infinity; for (const o of list) { const t = (1000 - o.tm) / spdOf(o.u); if (t < bt) { bt = t; best = o; } } for (const o of list) o.tm += spdOf(o.u) * bt; best.tm = 0; out.push(best.u); }
  return out;
}
function drawOrder() {
  if (!B) return; const el = $('.order', B.s); if (!el) return;
  const q = [B.cur, ...previewOrder(6)].filter(Boolean);
  el.innerHTML = q.map((u, i) => `<span class="oi ${u.side ? 'foe' : 'ally'} ${i === 0 ? 'now' : ''}"><img src="${u.side ? poseSrc(u.id, 0) : faceSrc(u.id)}" alt="${u.name}" class="${u.side ? 'mface' : ''}"></span>`).join('') + '<span class="olab">Next turns</span>';
}
const pushTM = (u, f) => { u.tm = clamp(u.tm + 1000 * f, 0, 999); };

// ---------- statuses ----------
function addSt(u, k, n, extra) {
  if (!u.alive) return;
  if (k === 'stun' && u.boss && Math.random() < .35) { float(u, 'RESIST', '#ddd'); return; }
  u.st[k] = Math.max(u.st[k] || 0, n); if (extra) Object.assign(u, extra); if (k === 'shield') u.shFlash = 1;
  if (k === 'stun' && u.charging) { u.charging = false; float(u, 'CHARGE BROKEN', '#ffd23c', 1.1); B.shake = 10; }
}
function tickSt(u) { for (const k of Object.keys(u.st)) { if (k === 'stun' || k === 'guard' || k === 'evade' || k === 'aim') continue; u.st[k]--; if (u.st[k] <= 0) { delete u.st[k]; if (k === 'shield') u.shieldAmt = 0; } } }

// ---------- damage ----------
function hit(src, dst, mult, o = {}) {
  if (!dst || !dst.alive || !B) return 0;
  if (dst.st.evade) { delete dst.st.evade; float(dst, 'MISS', '#c58bff', 1.1); return 0; }
  const aim = src.st.aim; if (aim) delete src.st.aim;
  let d = src.atk * mult * (src.st.atkUp ? (src.atkUpK || 1.3) : 1) * rnd(.92, 1.08) * 100 / (100 + (aim ? 0 : dst.def * (dst.st.defDown ? .5 : 1)));
  const crit = aim || o.crit === true || Math.random() < (o.crit || .1); if (crit) d *= 1.6;
  if (dst.st.guard) { d *= .5; }
  d = Math.round(d);
  if (dst.st.shield && dst.shieldAmt > 0) { const ab = Math.min(dst.shieldAmt, d); dst.shieldAmt -= ab; d -= ab; dst.shFlash = 1; if (dst.shieldAmt <= 0) delete dst.st.shield; }
  dst.hp -= d; dst.hurt = 1;
  if (!dst.side) dst.en = Math.min(100, dst.en + 12);
  const [x, y] = pos(dst);
  B.floats.push({ x: x + rnd(-10, 10), y: y - dst.h * .8, t: (crit ? 'CRIT ' : '') + d, c: crit ? '#ffd23c' : dst.side ? '#fff' : '#ff6a5a', life: 1, size: (o.big ? 1.7 : 1.1) * (crit ? 1.2 : 1) });
  burst(x, y - dst.h * .45, [o.color || '#fff', '#fff'], crit ? 8 : 4, crit ? 4 : 2.5);
  B.shake = Math.max(B.shake, crit ? 7 : 3); (crit ? SFX.crit : SFX.hit)();
  if (src.d.on === 'defDown' && Math.random() < .35) addSt(dst, 'defDown', 1);
  if (src.d.on === 'drain') heal(src, d * .3, true);
  if (dst.hp <= 0) {
    dst.alive = false; dst.hp = 0; dst.dieT = 1; burst(x, y - dst.h * .4, ['#fff', '#d23b31', '#1a1216'], 16, 5); SFX.die(); B.slowT = .5;
    if (dst.d.gold) { B.bonusGold = (B.bonusGold || 0) + 200; B.floats.push({ x, y: y - dst.h, t: '+200 gold', c: '#e3b448', life: 1.3, size: 1 }); }
  } else if (dst.st.guard && !o.counter) { delete dst.st.guard; float(dst, 'COUNTER', '#9fd0ff', .9); if (dst.id === 'blay' && KF.blay) { dst.kf = 'parry_2'; sproj(dst, 0, { s: .5, ms: 380 }); setTimeout(() => { if (dst.kf === 'parry_2') kfEnd(dst); }, 450); } hit(dst, src, .8, { counter: 1, color: '#9fd0ff' }); }
  return d;
}
function heal(u, n, quiet) { if (!u.alive) return; const v = Math.round(n); u.hp = Math.min(u.max, u.hp + v); float(u, '+' + v, '#7ee08a'); if (!quiet) fx('spr', 750, { k: 'heal', unit: u, hs: .95, a: .7 }); }

// ---------- moves ----------
// 0 basic, 1 skill one, 2 skill two, 3 ultimate
const canUse = (u, i) => i === 0 || (i < 3 && u.cd[i - 1] <= 0) || (i === 3 && u.en >= 100);
function aiHero(u) { return { i: u.en >= 100 ? 3 : 0 }; } // auto: basics and ultimates only
function aiSmart(u) { // models a player for the balance sim: break charges, heal when low, otherwise skills on cooldown
  const f = B.foe, low = u.hp / u.max < .45;
  if (f.charging && canUse(u, 1) && ['owureku', 'gyakari'].includes(u.id)) return { i: 1 };
  if (u.en >= 100) return { i: 3 };
  if (low && u.id === 'kome' && canUse(u, 1)) return { i: 1 };
  if (f.charging && canUse(u, 2) && ['blay', 'gyakari', 'dufie'].includes(u.id)) return { i: 2 };
  for (const i of [1, 2]) if (canUse(u, i) && !(u.id === 'kome' && i === 1 && !low)) return { i };
  return { i: 0 };
}

async function takeTurn(u) {
  const b = B; SFX.turn();
  if (u.st.burn) { const d = Math.round(Math.min(u.max * .07, (u.burnPow || 30))); u.hp -= d; u.hurt = .7; float(u, '' + d, '#ff8a3c'); fx('spr', 600, { k: 'fire', unit: u, hs: .6, a: .5 }); if (u.hp <= 0) { u.hp = 0; u.alive = false; u.dieT = 1; SFX.die(); await wait(500); return; } await wait(320); }
  const stunned = u.st.stun; delete u.st.stun; tickSt(u);
  for (let k = 0; k < 2; k++) if (u.cd[k] > 0) u.cd[k]--;
  if (stunned) { float(u, 'STUNNED', '#ffd23c'); await wait(600); if (u.side) planIntent(u); return; }
  if (u.side === 0) {
    let act;
    if (b.auto) { await wait(220); act = (b.sim === 'smart' ? aiSmart : aiHero)(u); }
    else act = await choose(u);
    if (B !== b) return;
    await doHero(u, act.i);
  } else {
    await wait(240);
    await doMonster(u);
    planIntent(u);
  }
}
function choose(u) { return new Promise((res) => { B.choice = (a) => { renderAct(null); res(a); }; B.armed = 0; renderAct(u); }); }
function commit(i) { const u = B.hero, c = B.choice; if (!c || !canUse(u, i)) return; B.choice = null; c({ i }); }
function renderAct(u) {
  if (!B) return; const box = $('.act', B.s); if (!box) return;
  const hint = $('.hintl', box), btns = $('.abtns', box);
  if (!u) { if (B.cur) box.dataset.msg = `${B.cur.name} acts`; box.classList.remove('mine'); hint.textContent = ''; btns.innerHTML = ''; return; }
  box.classList.add('mine');
  const lab = (i) => i === 0 ? 'Basic' : i === 3 ? `${Math.floor(u.en)}%` : u.cd[i - 1] > 0 ? `${u.cd[i - 1]} turn${u.cd[i - 1] > 1 ? 's' : ''}` : 'Ready';
  btns.innerHTML = [0, 1, 2, 3].map((i) => { const M = moveOf(u.id, i, u.spells); return `<button class="ab k${i} ${B.armed === i ? 'armed' : ''}" type="button" data-i="${i}" ${canUse(u, i) ? '' : 'disabled'}>${spellIcon(u.id, i, u.spells)}<div><b>${M.name}</b><span>${lab(i)}</span></div>${i === 3 ? `<i style="transform:scaleX(${u.en / 100})"></i>` : ''}</button>`; }).join('');
  const AM = moveOf(u.id, B.armed, u.spells); hint.innerHTML = `<b>${AM.name}</b> ${AM.note} <em>Tap again to use.</em>`;
  btns.querySelectorAll('.ab').forEach((bt) => (bt.onclick = () => {
    const i = +bt.dataset.i; if (!canUse(u, i)) return; SFX.click();
    if (B.armed === i) return commit(i);
    B.armed = i; renderAct(u);
  }));
}

// monster intent: a plain hit, or a charge (next turn: big move) that a stun can break
function planIntent(m) {
  if (!m.alive) return;
  if (m.charging) { m.intent = { k: m.d.ult, label: m.d.ult === 'heal' ? 'Heals next turn' : 'Big hit next turn' }; return; }
  m.intent = { k: 'atk', label: 'Attack' };
}
async function doMonster(m) {
  const h0 = B.hero;
  if (m.charging) { m.charging = false; m.en = 0; await monUlt(m, m.d.ult, h0); return; }
  await basicStrike(m, h0, 1, { color: '#ff4a3c' });
  if (m.d.ult) { m.en = Math.min(100, m.en + 34); if (m.en >= 100) { m.charging = true; setPose(m, 2, 700); float(m, 'CHARGING', '#ff9a8a', 1); await wait(350); } }
}
async function monUlt(m, kind, tg) {
  if (m.boss) await ultIntro(m, 'kuntanKantan', '#ff3b2a');
  else { setPose(m, 2, 900); await wait(350); }
  setPose(m, 2, 900);
  if (kind === 'heal') { heal(m, m.max * .25); SFX.heal(); await wait(650); }
  else { await impactFrames([tg], m); fx(kind === 'aoe' ? 'boom' : 'x', 700, { unit: tg, hex: 1, c: '#ff3b2a' }); hit(m, tg, (kind === 'aoe' ? 2.0 : 2.3) * (m.boss ? .85 : 1), { color: '#ff3b2a', big: 1 }); await wait(650); }
  endUlt();
}
async function basicStrike(u, tg, mult, o = {}) {
  if (!tg || !tg.alive) return 0;
  if (!u.side && KF[u.id] && CHOREO[u.id] && CHOREO[u.id].basic) return CHOREO[u.id].basic(u, tg, mult, o);
  const AC = ANIM[u.id] && ANIM[u.id].atk;
  if (AC && !u.side) return animStrike(u, tg, mult, o, AC);
  setPose(u, 1, 420);
  const [x0, y0] = pos(u);
  let dealt = 0;
  const ranged = u.side ? u.range : ['obiri', 'kome', 'kuukua'].includes(u.id);
  if (ranged) {
    const kind = u.side ? (u.d.shot || 'hex') : u.id === 'kome' ? 'fire' : u.id === 'obiri' ? 'arrow' : 'spear';
    const [x1, y1] = pos(tg);
    fx('shot', 240, { x0: x0 + (u.side ? -1 : 1) * u.w * .3, y0: y0 - u.h * .6, x1, y1: y1 - tg.h * .5, kind }); SFX.shoot();
    await wait(240); dealt = hit(u, tg, mult, o);
  } else {
    u.reach = Math.max(0, Math.abs(pos(tg)[0] - x0) - tg.w * .35 - u.w * .3); u.dashTo = 1;
    await wait(170);
    const [x, y] = pos(tg); fx('slash', 240, { x, y: y - tg.h * .5, r: tg.h * .36, c: o.color || '#fff', dir: u.side ? -1 : 1 });
    dealt = hit(u, tg, mult, o);
    await wait(180); u.dashTo = 0;
  }
  await wait(220);
  return dealt;
}
const hitStop = (ms) => { B.freeze = ms / 1000; };
// animated basic: lunge clip with two hand-drawn slash arcs (forehand then backhand)
async function animStrike(u, tg, mult, o, AC) {
  const dur = AC.play.length / 14 * 1000; setPose(u, 1, dur, 'atk');
  u.reach = Math.max(0, Math.abs(pos(tg)[0] - pos(u)[0]) - tg.w * .4 - u.w * .25); u.dashTo = 1;
  await wait(dur * .3);
  const [x, y] = pos(tg), c = o.color || '#c58bff';
  fx('arc', 300, { x, y: y - tg.h * .5, r: tg.h * .55, c, dir: 1 }); SFX.hit && SFX.hit();
  const d1 = hit(u, tg, mult * .6, o); hitStop(60);
  await wait(dur * .28);
  if (tg.alive) { fx('arc', 300, { x, y: y - tg.h * .45, r: tg.h * .5, c, dir: -1, flipY: 1 }); hit(u, tg, mult * .4, { ...o, quiet: 1 }); }
  await wait(dur * .3); u.dashTo = 0; await wait(dur * .12);
  return d1;
}
async function skillBeat(u, i) { float(u, moveOf(u.id, i, u.spells).name, '#f08a24', .9); setPose(u, 1, 500); await wait(200); }
async function ultIntro(u, sym, color) {
  const [x, y] = pos(u);
  B.dimTo = .62; B.cam.tz = B.rest.z * 1.18; B.cam.tx = x / B.w; B.cam.ty = (y - u.h * .5) / B.hh; setPose(u, 2, 1800);
  fx('ink', 1500, { s: Math.min(B.hh * .42, B.w * .36, u.h * 1.1), sym, c: color, follow: u });
  SFX.ult();
  if (!u.side) { await cutscene(u, sym, color); return; }
  cutIn(poseSrc(u.id, 2), u.name, 'ULTIMATE', color, true, u.flip[2]);
  await wait(900);
}
// fullscreen ultimate cutscene: dedicated art (or a Veo clip once generated), push-in, speed lines, X-slash, title
const CUTS = {}; // optional per-hero splash art; keyframe heroes use their signature pose
function cutscene(u, sym, color) {
  const C = CUTS[u.id] || (KF[u.id] && KF[u.id].p[SPL[u.id]] ? { img: A + 'kf/' + KF[u.id].p[SPL[u.id]][0] + AV, pose: 1, short: 1 } : { img: poseSrc(u.id, 2), pose: 1 });
  const media = C.video ? `<video poster="${C.img}" muted playsinline autoplay preload="auto"><source src="${C.video.replace('.mp4', '.webm')}" type="video/webm"><source src="${C.video}" type="video/mp4"></video>` : `<img src="${C.img}" alt="" class="${C.pose ? 'pose' : ''} ${C.pose && u.flip[2] ? 'flip' : ''}">`;
  const el = h(`<div class="ultcs" style="--rc:${color}"><div class="cs-bg"></div><div class="cs-art">${media}</div><div class="cs-lines"></div>
    <div class="cs-sym">${adinkraSvg(sym)}</div><i class="cs-x a"></i><i class="cs-x b"></i><div class="cs-flash"></div>
    <div class="cs-title"><span>${u.name.toUpperCase()} · ${u.d.role.toUpperCase()}</span><b>${u.d.kit[3]}</b></div></div>`);
  document.body.append(el);
  const vid = el.querySelector('video'); if (vid) { vid.playbackRate = C.rate || 1; el.classList.add('vid'); vid.play().catch(() => {}); }
  const dur = C.video ? (C.len || 6000) / (C.rate || 1) - 100 : C.short ? 950 : 1900; if (C.short) el.classList.add('short');
  return new Promise((res) => { let done = false; const end = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 220); res(); };
    el.onclick = end; if (vid) vid.onended = end; setTimeout(() => SFX.hit && SFX.hit(), C.video ? 1600 / (C.rate || 1) : 1150); setTimeout(end, dur / (B && B.speed > 1 ? 1.5 : 1)); });
}
async function impactFrames(targets, src) {
  B.cam.tx = targets.reduce((a, t) => a + pos(t)[0], 0) / targets.length / B.w; B.cam.ty = B.rest.y;
  await wait(110);
  SFX.impact();
  B.impact = { k: 0, list: targets, src }; hitStop(90); await wait(1);
  B.impact = { k: 1, list: targets, src }; hitStop(80); await wait(1);
  B.impact = null; B.shake = 16;
}
function endUlt() { B.dimTo = 0; B.cam.tz = B.rest.z; B.cam.tx = .5; B.cam.ty = B.rest.y; }

// spell icons: generated art when a hero has had an art pass, else a glyph on the class colour
const ICONS = { kuukua: ['basic', 'kuukua1', 'kuukua2', 'kuuThrow', 'kuuWall', 'ult'], obiri: ['basic', 'obiri1', 'obiri2', 'obiVolley', 'obiKnee', 'ult'], dufie: ['basic', 'dufie1', 'dufie2', 'dufKick', 'dufStars', 'ult'], blay: ['basic', 'blay1', 'blay2', 'blayRush', 'blayRally', 'ult'] };
const KIND_GLYPH = { melee: 'warrior', ranged: 'hunter', buff: 'growth', shield: 'guardian', heal: 'sage' };
function spellIcon(id, i, eq, sidIn) {
  const H = HEROES[id], key = sidIn || (i === 0 ? 'basic' : i === 3 ? 'ult' : (eq || SAVE.heroes[id]?.eq || H.pool)[i - 1]);
  if ((ICONS[id] || []).includes(key)) return `<span class="sic"><img src="${A}icons/${id}_${key}.webp${AV}" alt=""></span>`;
  const S = SPELLS[key], g = key === 'basic' ? H.cls : key === 'ult' ? 'stars' : S && S.legacy ? 'skills' : KIND_GLYPH[S && S.kind] || 'skills';
  return `<span class="sic glyph" style="--rc:${RARITY[H.rarity].color}">${icon(g)}</span>`;
}
// data-driven spells (see SPELLS in data.js)
async function castSpell(u, f, S, m) {
  const c = S.c || (u.id === 'dufie' ? '#c58bff' : u.id === 'kome' ? '#ffb43c' : '#e6edf5'), hits = S.hits || 1;
  if (S.t === 'melee' || S.t === 'ranged') {
    for (let k = 0; k < hits && f.alive; k++) {
      if (S.t === 'ranged') { const [x0, y0] = pos(u), [x1, y1] = pos(f); setPose(u, 1, 300); fx('shot', 220, { x0: x0 + u.w * .3, y0: y0 - u.h * .6, x1, y1: y1 - f.h * (.35 + .3 * Math.random()), kind: S.proj }); SFX.shoot(); await wait(200); hit(u, f, S.mult * m, { color: c, crit: S.crit }); }
      else { await basicStrike(u, f, S.mult * m, { color: c, crit: S.crit }); }
      if (hits > 1) await wait(90);
    }
    hitStop(80);
    if (f.alive) for (const [k, n] of S.foe || []) { addSt(f, k, n); if (k === 'defDown') float(f, 'DEF▼', '#ff5a4a', .8); if (k === 'slow') float(f, 'SLOW', '#6fb6ff', .8); }
    if (S.tmFoe) { pushTM(f, -S.tmFoe); float(f, `TURN −${Math.round(S.tmFoe * 100)}%`, '#c58bff', .8); }
  }
  if (S.cleanse) { delete u.st.stun; delete u.st.burn; }
  if (S.heal) heal(u, u.max * S.heal * m);
  if (S.shield) { addSt(u, 'shield', S.turns || 2); u.shieldAmt = Math.round(u.max * S.shield * m); fx('spr', 600, { k: 'shield', unit: u, hs: .9, a: .45 }); }
  if (S.guard) { u.st.guard = 1; float(u, 'GUARD', '#9fd0ff', .8); }
  if (S.atkUp) { addSt(u, 'atkUp', (S.turns || 2) + 1); u.atkUpK = S.atkUp; float(u, 'ATK▲', '#ffb070', .8); }
  for (const [k, n] of S.self || []) addSt(u, k, n);
  if (S.tmSelf) { pushTM(u, S.tmSelf); float(u, `TURN +${Math.round(S.tmSelf * 100)}%`, '#7ee08a', .8); }
  if (S.t === 'self') await wait(420);
}
async function doHero(u, i) {
  const f = B.foe, sk = SAVE.heroes[u.id].sk, sid = i === 1 || i === 2 ? u.spells[i - 1] : null, S = sid && SPELLS[sid];
  const lv = S ? spLvl(u.id, sid) : (sk[i] || 1), m = (1 + 0.12 * (lv - 1)) * (i > 0 ? 1 + GROWTH.mag * ptsOf(u.id).mag : 1);
  if (i === 0) u.en = Math.min(100, u.en + 35);
  if (S) { u.cd[i - 1] = S.cd + 1; u.en = Math.min(100, u.en + 20); }
  if (i === 3) u.en = 0;
  if (i === 0) {
    const d = await basicStrike(u, f, 1 * m, { color: u.id === 'kome' ? '#ffb43c' : u.id === 'dufie' ? '#c58bff' : '#fff' });
    return;
  }
  if (i === 1 || i === 2) {
    if (KF[u.id] && CHOREO[u.id] && CHOREO[u.id][sid]) { await CHOREO[u.id][sid](u, f, m); await wait(200); return; }
    await skillBeat(u, i);
    if (!S.legacy) { await castSpell(u, f, S, m); await wait(220); return; }
    const k = S.legacy;
    switch (k) {
      case 'blay1': await basicStrike(u, f, .8 * m); hitStop(90); if (f.alive) { hit(u, f, .8 * m); addSt(f, 'defDown', 2); float(f, 'DEF▼', '#ff5a4a', .8); } break;
      case 'blay2': u.st.guard = 1; fx('spr', 600, { k: 'shield', unit: u, hs: .9, a: .45 }); await wait(400); break;
      case 'owureku1': { const [x0, y0] = pos(u), [x1, y1] = pos(f); fx('shot', 360, { x0, y0: y0 - u.h * .6, x1, y1: y1 - f.h * .5, kind: 'axe' }); await wait(360); hitStop(110); hit(u, f, 1.1 * m, { color: '#ffb070' }); addSt(f, 'stun', 1); break; }
      case 'owureku2': addSt(u, 'atkUp', 3); u.atkUpK = 1.3 + .03 * (m - 1) * 10; heal(u, u.max * .1); await wait(400); break;
      case 'gyakari1': await basicStrike(u, f, .9 * m, { color: '#6fb6ff' }); hitStop(120); addSt(f, 'stun', 1); break;
      case 'gyakari2': addSt(u, 'shield', 2); u.shieldAmt = Math.round(u.max * .3 * m); await wait(450); break;
      case 'obiri1': await basicStrike(u, f, 1.2 * m, { color: '#e6edf5' }); hitStop(90); addSt(f, 'slow', 2); break;
      case 'obiri2': u.st.aim = 1; float(u, 'AIM', '#ffd23c'); await wait(400); break;
      case 'kuukua1': await basicStrike(u, f, 1.15 * m, { color: '#e6edf5' }); hitStop(90); addSt(f, 'defDown', 2); break;
      case 'kuukua2': await basicStrike(u, f, .9 * m, { color: '#e6edf5' }); hitStop(90); pushTM(f, -.4); addSt(f, 'slow', 1); float(f, 'TURN −40%', '#c58bff', .8); break;
      case 'kome1': { const [x, y] = pos(u); fx('ink', 900, { x, y: y - u.h * .55, s: u.h * .55, sym: 'nyameDua', c: '#7ee08a', small: 1 }); heal(u, u.max * .22 * m); delete u.st.stun; delete u.st.burn; SFX.heal(); await wait(550); break; }
      case 'kome2': await basicStrike(u, f, .7 * m, { color: '#ffb43c' }); fx('boom', 700, { unit: f }); addSt(f, 'burn', 3, { burnPow: u.atk * .7 * m }); break;
      case 'afrakoma1': { const d = await basicStrike(u, f, 1.25 * m, { color: '#ff8a3c' }); hitStop(100); heal(u, d * .5, true); break; }
      case 'afrakoma2': addSt(u, 'atkUp', 3); u.atkUpK = 1.4; u.hp = Math.max(1, Math.round(u.hp - u.max * .1)); float(u, '−10%', '#ff6a5a'); await wait(400); break;
      case 'dufie1': { const [x0, y0] = pos(u); fx('smoke', 700, { x: x0, y: y0, r: u.h * .35, c: '#c58bff', n: 9 }); setPose(u, 's1', 900);
        u.reach = Math.max(0, Math.abs(pos(f)[0] - x0) - f.w * .3); u.dashTo = 1; fx('streak', 380, { x0, x1: pos(f)[0], y: y0 - u.h * .45, h: u.h * .5, c: '#7b3fd6' }); await wait(200);
        const [x, y] = pos(f); fx('star', 420, { x, y: y - f.h * .5, r: f.h * .7, c: '#c58bff' }); fx('arc', 300, { x, y: y - f.h * .5, r: f.h * .6, c: '#c58bff', dir: 1 }); hitStop(130); hit(u, f, 1.4 * m, { color: '#c58bff', crit: true }); await wait(260); u.dashTo = 0; pushTM(u, .5); break; }
      case 'dufie2': { const [x0, y0] = pos(u); setPose(u, 's2', 900); fx('smoke', 1100, { x: x0, y: y0, r: u.h * .55, c: '#c58bff', n: 16, rise: 1 }); u.st.evade = 1; float(u, 'VANISH', '#c58bff'); await wait(600); break; }
    }
    await wait(220); return;
  }
  // ultimate: dim, zoom, ink Adinkra, cut-in, impact frames, a decisive hit
  await ultIntro(u, u.d.sym, RARITY[u.d.rarity].color === '#6fb6ff' ? '#e3b448' : RARITY[u.d.rarity].color);
  const T = [f];
  switch (u.id) {
    case 'blay': if (CHOREO.blay.ult) { await CHOREO.blay.ult(u, f, m, T); break; } { await impactFrames(T, u); fx('slash', 420, { x: pos(f)[0], y: pos(f)[1] - f.h * .5, r: f.h * .6, c: '#fff', dir: 1, big: 1 }); if (f.hp / f.max < .3 && !f.boss) { hit(u, f, 99, { big: 1 }); float(f, 'EXECUTED', '#ffd23c', 1.3); } else hit(u, f, 3.0 * m, { big: 1 }); break; }
    case 'owureku': { await impactFrames(T, u); for (let k = 0; k < 3 && f.alive; k++) { fx('slash', 300, { x: pos(f)[0], y: pos(f)[1] - f.h * .5, r: f.h * .55, c: '#ffb070', dir: 1, big: 1 }); hit(u, f, 1.15 * m, { color: '#ffb070', big: 1 }); await wait(160); } break; }
    case 'gyakari': { addSt(u, 'shield', 2); u.shieldAmt = Math.round(u.max * .35 * m); await wait(300); await impactFrames(T, u); hit(u, f, 1.2 * m + u.shieldAmt / u.atk * .5, { color: '#6fb6ff', big: 1 }); break; }
    case 'obiri': if (CHOREO.obiri.ult && KF.obiri) { await CHOREO.obiri.ult(u, f, m, T); break; } { await impactFrames(T, u); const [x0, y0] = pos(u), [x, y] = pos(f); fx('beam', 500, { x0, y0: y0 - u.h * .6, x1: x, y1: y - f.h * .5, c: '#ffd23c' }); hit(u, f, 3.2 * m, { color: '#ffd23c', crit: true, big: 1 }); break; }
    case 'kuukua': if (CHOREO.kuukua.ult && KF.kuukua) { await CHOREO.kuukua.ult(u, f, m, T); break; } { await impactFrames(T, u); fx('rain', 600, { unit: f }); hit(u, f, (f.st.slow || f.st.defDown ? 3.6 : 1.8) * m, { color: '#e6edf5', big: 1 }); break; }
    case 'kome': { heal(u, u.max * .2 * m); await impactFrames(T, u); fx('boom', 800, { unit: f }); hit(u, f, (f.st.burn ? 3.4 : 1.7) * m, { color: '#ffb43c', big: 1 }); SFX.heal(); break; }
    case 'afrakoma': { await impactFrames(T, u); fx('slash', 420, { x: pos(f)[0], y: pos(f)[1] - f.h * .5, r: f.h * .6, c: '#ff8a3c', dir: 1, big: 1 }); const d = hit(u, f, 3.0 * m, { color: '#ff8a3c', big: 1 }); heal(u, d * .5, true); break; }
    case 'dufie': if (CHOREO.dufie.ult) { await CHOREO.dufie.ult(u, f, m, T); break; } { await impactFrames(T, u); const [x, y] = pos(f); for (let k = 0; k < 6 && f.alive; k++) { fx('arc', 260, { x: x + rnd(-8, 8), y: y - f.h * (.35 + .3 * Math.random()), r: f.h * rnd(.45, .7), c: k % 2 ? '#ffffff' : '#c58bff', dir: k % 2 ? -1 : 1, tilt: rnd(-.6, .6) }); hit(u, f, .62 * m, { color: '#c58bff' }); await wait(110); } fx('star', 600, { x, y: y - f.h * .5, r: f.h, c: '#c58bff' }); fx('smoke', 900, { x, y, r: f.h * .5, c: '#c58bff', n: 12 }); break; }
  }
  await wait(600); endUlt(); await wait(220);
}

function cutIn(src, big, small, color, foe = false, flip = 0) {
  if (!B) return; const w = $('.cutwrap', B.s); if (!w) return;
  const c = h(`<div class="cutin ${foe ? 'foe' : ''}" style="--rc:${color}"><div class="band"></div><img src="${src}" alt="" class="${flip ? 'flip' : ''}"><div class="t"><b>${big}</b><span>${small}</span></div></div>`);
  w.append(c); setTimeout(() => c.remove(), 950);
}

// ---------- end ----------
function finish(win) {
  if (B.over) return; B.over = true; renderAct(null);
  const t = B.stage, idx = B.stageIdx, dId = B.D.id, u = B.hero;
  const stars = win ? (u.hp / u.max >= .5 ? 3 : u.hp / u.max >= .2 ? 2 : 1) : 0;
  const chips = []; let up = 0;
  if (win) {
    const first = !starsOf(idx, dId), prev = starsOf(idx, dId);
    SAVE.stars[starKey(idx, dId)] = Math.max(prev, stars);
    const gold = Math.round((60 + t.lvl * 40) * B.D.gold) + (B.bonusGold || 0); SAVE.gold += gold; chips.push([COIN('gold', 'big'), '+' + gold, 'Gold dust']);
    let cw = 0; if (first) cw += t.boss ? 100 : dId === 'hard' ? 60 : 30; if (stars === 3 && prev < 3) cw += 20;
    if (cw) { SAVE.cowries += cw; chips.push([COIN('cowrie', 'big'), '+' + cw, first ? 'First clear' : '3 stars']); }
    const xp = 40 + t.lvl * 20; chips.push([COIN('xp', 'big'), '+' + xp, 'XP']);
    const s = SAVE.heroes[u.id]; s.xp += xp; while (s.xp >= xpNeed(s.lvl)) { s.xp -= xpNeed(s.lvl); s.lvl++; up = s.lvl; }
    SFX.win();
  } else SFX.lose();
  store();
  const b = B;
  setTimeout(() => {
    if (B !== b) return;
    const v = h(`<div class="veil"><div class="result ${win ? 'win' : 'lose'}"><span class="sub">Stage ${idx + 1} · ${t.name} · ${B.D.name}</span>
      <div class="rtitle">${adinkraSvg(win ? 'fawohodie' : 'hyeWonhye')}<h2>${win ? 'Victory' : 'Defeat'}</h2></div>
      ${win ? `<div class="stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${.15 + i * .18}s">★</i>`).join('')}</div>
        <div class="chips">${chips.map(([ic, n, l]) => `<div class="chip">${ic}<b>${n}</b><span>${l}</span></div>`).join('')}</div>`
        : `<p>Hye won hye: what does not burn comes back stronger. Break charged attacks with a stun, guard before big hits, level up or try Easy.</p>`}
      <div class="rheroes"><div class="rh ${u.alive ? '' : 'ko'}"><img src="${faceSrc(u.id)}" alt=""><b>${up ? 'Lv ' + up + ' ▲' : 'Lv ' + SAVE.heroes[u.id].lvl}</b></div>${up ? `<span class="gnote">+${freePts(u.id)} growth point${freePts(u.id) === 1 ? '' : 's'}: spend them in Heroes · Growth</span>` : ''}</div>
      <div class="row2"><button class="btn ghost" type="button">${win ? 'Replay' : 'Retry'}</button><button class="btn" type="button">${win && idx < STAGES.length - 1 ? 'Next stage' : 'Journey'}</button></div></div></div>`);
    const [retry, next] = v.querySelectorAll('.btn');
    retry.onclick = () => battle(idx, dId);
    next.onclick = () => { stopBattle(); if (win && idx < STAGES.length - 1) sel = idx + 1; tab = 'map'; mapScreen(); };
    app.append(v);
  }, 900);
}
// ---------- render loop ----------
function loop(now) {
  if (!B) return;
  const real = Math.min(.05, (now - B.last) / 1000); B.last = now;
  let dt = real * B.speed;
  if (B.freeze > 0) { B.freeze -= real; dt = 0; }
  if (B.slowT > 0) { B.slowT -= real; dt *= .35; }
  B.t += dt;
  // resolve waits on the battle clock
  if (B.waits.length) { const due = B.waits.filter((w) => w.t <= B.t); if (due.length) { B.waits = B.waits.filter((w) => w.t > B.t); due.forEach((w) => w.res()); } }
  const cv = B.cv, r = cv.getBoundingClientRect(), dpr = Math.min(2.5, devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  B.w = r.width; B.hh = r.height;
  { const port = r.height > r.width * .9, rz = port ? 1.12 : 1, ry = port ? .66 : .6; if (B.rest.z !== rz || B.rest.y !== ry) { B.rest = { z: rz, y: ry }; if (B.dimTo === 0) { B.cam.tz = rz; B.cam.ty = ry; } } }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingQuality = 'high';
  // camera
  const C = B.cam, ease = 1 - Math.pow(.002, real); C.z += (C.tz - C.z) * ease; C.x += (C.tx - C.x) * ease; C.y += (C.ty - C.y) * ease;
  { const mx = (1 - 1 / C.z) / 2; C.x = clamp(C.x, .5 - mx, .5 + mx); C.y = clamp(C.y, .6 - .6 * (1 - 1 / C.z), .6 + .4 * (1 - 1 / C.z)); } // never show past the painted background
  B.dim += (B.dimTo - B.dim) * ease;
  const sh = B.shake; B.shake = Math.max(0, sh - 40 * real);
  g.save();
  g.translate(r.width * .5, r.height * .6); g.scale(C.z, C.z); g.translate(-r.width * C.x, -r.height * C.y);
  g.translate(rnd(-1, 1) * sh, rnd(-1, 1) * sh);
  // background, anchored to the bottom so the painted floor stays under the fighters
  let bgTop = 0, bgH = r.height;
  if (B.bg.ok) { const im = B.bg.el, k = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight) * 1.08; const w = im.naturalWidth * k; bgH = im.naturalHeight * k; bgTop = r.height - bgH + bgH * .04; g.drawImage(im, (r.width - w) / 2, bgTop, w, bgH); }
  else { g.fillStyle = '#1a1216'; g.fillRect(-50, -50, r.width + 100, r.height + 100); }
  B.gy0 = bgTop + B.ground[0] * bgH; B.gy1 = Math.min(r.height - 8, bgTop + B.ground[1] * bgH);
  if (B.dim > .01) { g.fillStyle = `rgba(6,3,8,${B.dim})`; g.fillRect(-r.width, -r.height, r.width * 3, r.height * 3); }
  B.fx = B.fx.filter((f) => f.type !== 'ink' || drawFx(g, f)); // ink symbols sit behind the fighters
  const units = [...B.heroes, ...B.foes].filter((u) => u.alive || u.dieT > 0).sort((a, b) => a.fy - b.fy);
  const portrait = r.height > r.width * .9, baseH = portrait ? Math.min(r.height * .36, r.width * .42) : Math.min(r.height * .5, r.width * .24);
  // phantom trail: a moving keyframe step flagged phantom drops blue afterimages every few frames
  for (const u of [...(B.heroes || []), ...(B.foes || [])]) if (u.kfPh && u.kf && B.t - (u.phT || 0) > (PH_GAP[u.id] || .018)) { u.phT = B.t; const [ox, oy] = kfOff(u), d = u.side ? -1 : 1; B.ghosts.push({ u, p: u.kf, x: pos(u)[0] + d * ox, y: pos(u)[1] - oy, t0: B.t, life: PH_LIFE[u.id] || 1.6, blue: 1, hue: u.phHue ?? 185, red: u.id === 'kuukua' }); }
  B.ghosts = (B.ghosts || []).filter((q) => B.t - q.t0 < (q.life || .28));
  for (const q of B.ghosts) { const a = 1 - (B.t - q.t0) / (q.life || .28), k0 = img(poseSrc(q.u.id, 0)); if (!k0.ok) continue; g.save(); g.translate(q.x, q.y); g.globalCompositeOperation = q.red ? 'source-over' : 'lighter'; g.globalAlpha = a * (q.red ? .5 : q.blue ? .55 : .35); g.filter = q.red ? 'brightness(0.32) sepia(1) hue-rotate(-42deg) saturate(14) brightness(1.5)' : q.blue ? `brightness(0.55) sepia(1) hue-rotate(${q.hue ?? 185}deg) saturate(6)` : 'brightness(0.6) sepia(1) hue-rotate(230deg) saturate(3)'; drawKF(g, q.u.id, q.p, q.u.h); g.restore(); }
  for (const u of units) {
    u.h = baseH * u.size * u.depth;
    if (u.enter) u.enter = Math.max(0, u.enter - dt * 2.2);
    if (u.poseT > 0) { u.poseT -= dt; if (u.poseT <= 0) u.pose = 0; }
    u.dash += ((u.dashTo || 0) - u.dash) * Math.min(1, dt * 14);
    u.hurt = Math.max(0, u.hurt - dt * 4); u.shFlash = Math.max(0, u.shFlash - dt * 1.4);
    const e0 = img(poseSrc(u.id, 0)), e = img(poseSrc(u.id, u.pose));
    if (!e0.ok || !e.ok) { u.w = u.h * .6; continue; }
    const k = u.h / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k;
    u.w = e0.el.naturalWidth * k;
    const [x, y] = pos(u), bob = Math.sin(B.t * 2.4 + (u.slot || 0)) * u.h * .006;
    const flip = u.flip[u.pose], isCur = u === B.cur && !B.over;
    g.save();
    if (!u.alive) { u.dieT = Math.max(0, u.dieT - dt * 1.4); g.globalAlpha = u.dieT; }
    const shg = g.createRadialGradient(x, y, 1, x, y, u.w * .5); shg.addColorStop(0, 'rgba(0,0,0,.6)'); shg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shg; g.save(); g.translate(x, y); g.scale(1, .14); g.beginPath(); g.arc(0, 0, u.w * .5, 0, 6.28); g.restore(); g.fill();
    if (isCur) { g.strokeStyle = u.side ? 'rgba(255,90,74,.9)' : 'rgba(227,180,72,.95)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, u.w * .5, u.h * .07, 0, 0, 6.28); g.stroke(); }
    if (u.st.taunt) { g.strokeStyle = 'rgba(111,182,255,.8)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.ellipse(x, y, u.w * .6, u.h * .09, 0, 0, 6.28); g.stroke(); g.setLineDash([]); }
    g.translate(x, y + bob); if (flip) g.scale(-1, 1); if (u.hurt > .5) g.translate(rnd(-3, 3), 0);
    const th = ph * dpr * C.z;
    const ring = u.side && u.charging && u.alive ? '#ff3b2a' : null;
    if (ring) { const sil = silhouette(e, th, ring); if (sil) { g.save(); g.globalAlpha *= .85; for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) g.drawImage(sil, -pw / 2 + ox, -ph + oy, pw, ph); g.restore(); } }
    const AN = ANIM[u.id], bodyH = e0.el.naturalHeight * k; let drawn = false;
    if (KF[u.id]) { // keyframe heroes: move pose, else idle breathing / hurt / defeated
      const [ox, oy] = kfOff(u), p = u.kf || (!u.alive ? 'idle_2' : u.hurt > .35 ? 'idle_1' : 'idle_0');
      g.save(); g.translate((flip ? -1 : 1) * ox, -oy - (u.kf ? 0 : bob * .3)); if (!u.kf) { const br = Math.sin(B.t * 2.2) * .006; g.scale(1 - br * .4, 1 + br); } if (u.kfSpin) { const s = u.kfSpin, t = Math.min(1, (B.t - s.t0) / s.d), e = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; g.translate(0, -bodyH * .5); g.rotate(s.a * e); g.translate(0, bodyH * .5); } drawn = drawKF(g, u.id, p, bodyH, u.kfAlpha); g.restore();
    }
    if (AN && u.alive && u.pose === 0) { const P = AN.idle.play; drawn = drawClip(g, AN.idle, P[Math.floor(B.t * 12) % P.length], bodyH); }
    else if (AN && u.clip && AN[u.clip]) { const c = AN[u.clip], P = c.play, pr = 1 - Math.max(0, u.poseT) / (u.poseD || 1); drawn = drawClip(g, c, P[Math.min(P.length - 1, Math.floor(pr * P.length))], bodyH); }
    if (!drawn) { const sc = scaled(e, th); if (sc) g.drawImage(sc, -pw / 2, -ph, pw, ph); }
    if (u.hurt > .45 && !KF[u.id]) { const sil = silhouette(e, th, '#ffffff'); if (sil) { g.globalAlpha = (u.hurt - .45) * 1.4; g.drawImage(sil, -pw / 2, -ph, pw, ph); } }
    g.restore();
    if (u.alive) drawOverlay(g, u, x, y);
  }
  B.fx = B.fx.filter((f) => f.type === 'ink' || drawFx(g, f));
  for (const p of B.parts) { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vy += p.g * dt * 60; p.life -= dt * 1.8; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
  g.globalAlpha = 1; B.parts = B.parts.filter((p) => p.life > 0);
  g.textAlign = 'center';
  for (const f of B.floats) { f.y -= 34 * dt; f.life -= dt * .8; g.globalAlpha = Math.max(0, Math.min(1, f.life * 2)); g.font = `${Math.round(19 * f.size)}px Bangers, Impact, sans-serif`; g.lineWidth = 4; g.strokeStyle = '#120c10'; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.c; g.fillText(f.t, f.x, f.y); }
  g.globalAlpha = 1; B.floats = B.floats.filter((f) => f.life > 0);
  g.restore();
  // impact frames are drawn flat over everything
  if (B.impact) drawImpact(g, r, dpr);
  B.raf = requestAnimationFrame(loop);
}
function drawOverlay(g, u, x, y) {
  // shield: brief full dome when cast or hit, a faint shell otherwise; stretched to cover the whole fighter
  if (u.st.shield) {
    const S = FXS.shield, f = u.shFlash > 0 ? 2.5 + (1 - u.shFlash) * 6 : S.loop[0] + (Math.floor(B.t * 8) % (S.loop[1] - S.loop[0] + 1));
    if (!sprite(g, 'shield', f, x, y + u.h * .02, u.h * 1.16, u.shFlash > 0 ? .55 * Math.min(1, u.shFlash * 2) + .22 : .22, Math.max(u.w * 1.25, u.h * .78))) { g.strokeStyle = 'rgba(111,182,255,.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - u.h * .5, u.w * .6, u.h * .58, 0, 0, 6.28); g.stroke(); }
  }
  const bw = Math.max(40, Math.min(90, u.w * .75)), by = y - u.h * 1.02 - 10;
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 7);
  g.fillStyle = u.side ? (u.boss ? '#ff3b2a' : '#d23b31') : '#5fd07a'; g.fillRect(x - bw / 2, by, bw * u.hp / u.max, 5);
  if (u.st.shield && u.shieldAmt) { g.fillStyle = 'rgba(160,210,255,.9)'; g.fillRect(x - bw / 2, by, Math.min(bw, bw * u.shieldAmt / u.max), 2); }
  if (!u.side || u.d.ult) { g.fillStyle = '#e3b448'; g.fillRect(x - bw / 2, by + 6, bw * u.en / 100, 2); }
  // statuses as small labelled chips with turns left
  const keys = Object.keys(u.st); let cx = x - bw / 2;
  g.font = '700 9px Karla, system-ui, sans-serif'; g.textAlign = 'left';
  for (const k of keys) { const [lab, col] = ST_LABEL[k] || [k, '#fff'], txt = `${lab} ${u.st[k]}`, w = g.measureText(txt).width + 6; g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(cx, by - 13, w, 11); g.fillStyle = col; g.fillText(txt, cx + 3, by - 4.5); cx += w + 2; }
  // enemy intent badge
  if (u.side && u.intent && !B.over) {
    const it = u.intent, txt = it.k === 'atk' ? '⚔ Attack' : `✸ ${it.label}`;
    g.font = '700 11px Karla, system-ui, sans-serif'; const w = g.measureText(txt).width + 10, iy = by - (keys.length ? 28 : 16);
    g.fillStyle = it.k === 'atk' ? 'rgba(20,10,14,.85)' : 'rgba(120,18,14,.92)'; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, iy - 10, w, 15, 7) : g.rect(x - w / 2, iy - 10, w, 15); g.fill();
    g.fillStyle = it.k === 'atk' ? '#ffcfbf' : '#fff'; g.textAlign = 'center'; g.fillText(txt, x, iy + 1);
  }
  g.textAlign = 'center';
}
function drawImpact(g, r, dpr) {
  const I = B.impact, dark = I.k === 0;
  g.save(); g.fillStyle = dark ? '#000' : '#fff'; g.fillRect(0, 0, r.width, r.height);
  const C = B.cam; g.translate(r.width * .5, r.height * .6); g.scale(C.z, C.z); g.translate(-r.width * C.x, -r.height * C.y);
  for (const u of [...I.list, I.src].filter(Boolean)) {
    const e0 = img(poseSrc(u.id, 0)), e = img(poseSrc(u.id, u.pose)); if (!e.ok || !e0.ok) continue;
    const k = u.h / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k, [x, y] = pos(u);
    const sil = silhouette(e, ph * dpr * C.z, u === I.src ? (dark ? '#e3b448' : '#000') : (dark ? '#fff' : '#000')); if (!sil) continue;
    g.save(); g.translate(x, y); if (u.flip[u.pose]) g.scale(-1, 1); g.drawImage(sil, -pw / 2, -ph, pw, ph); g.restore();
  }
  // speed lines toward the impact point
  g.restore(); g.save(); g.strokeStyle = dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.45)'; g.lineWidth = 2;
  const cx = r.width / 2, cy = r.height * .55; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28 + rnd(-.05, .05), r0 = Math.max(r.width, r.height) * rnd(.3, .45); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r0 * 2, cy + Math.sin(a) * r0 * 2); g.stroke(); }
  g.restore();
}
function drawFx(g, f) {
  const p = Math.min(1, (B.t - f.t0) / f.dur);
  g.save(); g.lineCap = 'round';
  switch (f.type) {
    case 'slash': { const e = 1 - (1 - Math.min(1, p * 1.6)) ** 3, a0 = f.dir < 0 ? -0.6 : -2.5, sw = 2.9 * (f.dir < 0 ? -1 : 1); g.globalAlpha = (p < .6 ? 1 : 1 - (p - .6) / .4) * .85; g.strokeStyle = f.c; g.lineWidth = (f.big ? 8 : 4) * (1 - p * .5);
      g.beginPath(); g.arc(f.x, f.y, f.r, a0 + sw * Math.max(0, e - .5), a0 + sw * e, sw < 0); g.stroke(); break; }
    case 'x': { const [x, y] = f.unit ? [pos(f.unit)[0], pos(f.unit)[1] - f.unit.h * .5] : [f.x, f.y], R = f.unit ? f.unit.h * .45 : f.r, L = R * Math.min(1, p * 2.2); g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = 5; g.beginPath(); g.moveTo(x - L, y - L); g.lineTo(x + L, y + L); g.moveTo(x + L, y - L); g.lineTo(x - L, y + L); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); break; }
    case 'shot': {
      const x = f.x0 + (f.x1 - f.x0) * p, arc = f.kind === 'arrow' || f.kind === 'axe' ? Math.sin(p * Math.PI) * 26 : 0, y = f.y0 + (f.y1 - f.y0) * p - arc, a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      g.translate(x, y);
      if (f.kind === 'dagger') { g.rotate(a + p * 18); g.fillStyle = '#e6edf5'; g.strokeStyle = '#1a1020'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(13, 0); g.lineTo(-4, -3); g.lineTo(-4, 3); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e3b448'; g.fillRect(-9, -2, 5, 4); }
      else if (f.kind === 'arrow' || f.kind === 'spear') { g.rotate(a); g.strokeStyle = '#6b4424'; g.lineWidth = f.kind === 'spear' ? 4 : 2.5; g.beginPath(); g.moveTo(-26, 0); g.lineTo(6, 0); g.stroke(); g.fillStyle = '#e6edf5'; g.beginPath(); g.moveTo(14, 0); g.lineTo(2, -4); g.lineTo(2, 4); g.fill(); }
      else if (f.kind === 'axe') { g.rotate(p * 14); g.strokeStyle = '#6b4424'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.stroke(); g.fillStyle = '#cfd6e0'; g.beginPath(); g.moveTo(6, -2); g.quadraticCurveTo(16, -10, 14, 6); g.lineTo(6, 3); g.fill(); }
      else if (f.kind === 'thorn') { g.rotate(a); g.fillStyle = '#d8c25a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, 0); g.lineTo(-10, -4); g.lineTo(-6, 0); g.lineTo(-10, 4); g.closePath(); g.fill(); g.stroke(); }
      else { const col = f.kind === 'fire' ? ['#fff8d0', '#ffb43c', 'rgba(255,90,30,0)'] : ['#f6ecff', '#c58bff', 'rgba(110,50,200,0)']; const rg = g.createRadialGradient(0, 0, 1, 0, 0, 11); rg.addColorStop(0, col[0]); rg.addColorStop(.45, col[1]); rg.addColorStop(1, col[2]); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 11, 0, 6.28); g.fill(); }
      break;
    }
    case 'arc': { // anime crescent slash: filled crescent with a white core and coloured rim, swept in fast
      const sw = Math.min(1, p / .35), fade = p < .45 ? 1 : 1 - (p - .45) / .55, dir = f.dir || 1;
      g.translate(f.x, f.y); g.rotate((f.tilt || 0) + (dir < 0 ? Math.PI : 0)); if (f.flipY) g.scale(1, -1); g.globalCompositeOperation = 'lighter';
      const a0 = -2.4, a1 = a0 + 2.6 * sw, R0 = f.r, th = f.r * .22 * (1 - p * .4);
      const crescent = (r, t) => { g.beginPath(); g.arc(0, 0, r, a0, a1); g.arc(t * .3, -t * .25, r - t, a1, a0, true); g.closePath(); };
      g.globalAlpha = fade * .55; g.fillStyle = f.c; crescent(R0 * 1.06, th * 1.5); g.fill();
      g.globalAlpha = fade; g.fillStyle = '#ffffff'; crescent(R0, th * .55); g.fill();
      g.globalCompositeOperation = 'source-over'; break; }
    case 'sproj': { const im = img(A + 'kf/' + (f.src || 'blay_fx_' + f.k) + '.webp' + AV); if (!im.ok) break; const e = p < .5 ? p * 1.25 : .625 + (p - .5) * .75, x = f.x0 + (f.x1 - f.x0) * Math.min(1, e), h = f.s * (.7 + .5 * Math.min(1, p * 1.4)), w = h * im.el.naturalWidth / im.el.naturalHeight;
      g.translate(x, f.y); if (f.mir) g.scale(-1, 1); g.rotate(f.rot || 0); if (f.flip) g.scale(1, -1); const al = p < .78 ? 1 : 1 - (p - .78) / .22, X = -w * .75, Y = -h / 2;
      g.globalAlpha = al; g.shadowColor = '#4f8dff'; g.shadowBlur = Math.max(18, h * .28); g.drawImage(im.el, X, Y, w, h); g.shadowBlur = Math.max(8, h * .1); g.shadowColor = '#bfd6ff'; g.drawImage(im.el, X, Y, w, h);
      g.shadowBlur = 0; g.globalCompositeOperation = 'lighter'; g.globalAlpha = al * .55; g.drawImage(im.el, X, Y, w, h); g.globalCompositeOperation = 'source-over'; break; }
    case 'arrowP': { const im = img(A + 'kf/fx_arrow.webp' + AV); if (im.ok) { const e = Math.min(1, p / (f.hitAt || .55)), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(e * Math.PI) * (f.arc || 0), a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), al = e < 1 ? 1 : Math.max(0, 1 - (p - (f.hitAt || .55)) * 4);
        if (al <= 0) break; const h = (f.len || 46) * .55 * (f.w || 3) / 3, w = h * im.el.naturalWidth / im.el.naturalHeight; g.globalAlpha = al; g.translate(x, y); g.rotate(a); g.shadowColor = f.c || GOLD; g.shadowBlur = 16; g.drawImage(im.el, -w * .85, -h / 2, w, h); g.globalCompositeOperation = 'lighter'; g.globalAlpha = al * .4; g.drawImage(im.el, -w * .85, -h / 2, w, h); g.globalCompositeOperation = 'source-over'; break; } }
    case 'arrowP_code': { // code-drawn fallback: straight or falling (rain), with a light trail
      const e = Math.min(1, p / (f.hitAt || .55)), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(e * Math.PI) * (f.arc || 0), a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), L = f.len || 46, al = e < 1 ? 1 : Math.max(0, 1 - (p - (f.hitAt || .55)) * 4);
      if (al <= 0) break; g.globalAlpha = al; g.translate(x, y); g.rotate(a); g.globalCompositeOperation = 'lighter';
      const tg = g.createLinearGradient(-L * 3, 0, 0, 0); tg.addColorStop(0, 'rgba(0,0,0,0)'); tg.addColorStop(1, f.c || '#ffcf5a'); g.strokeStyle = tg; g.lineWidth = (f.w || 5) * 2.2; g.beginPath(); g.moveTo(-L * 3, 0); g.lineTo(0, 0); g.stroke();
      g.globalCompositeOperation = 'source-over'; g.shadowColor = f.c || '#ffcf5a'; g.shadowBlur = 14; g.strokeStyle = '#5a3a1c'; g.lineWidth = f.w || 3; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L * .25, 0); g.stroke();
      g.fillStyle = '#fff8e0'; g.beginPath(); g.moveTo(L * .5, 0); g.lineTo(L * .2, -6); g.lineTo(L * .2, 6); g.closePath(); g.fill();
      g.fillStyle = f.c || '#ffcf5a'; g.fillRect(-L, -5, 10, 10); break; }
    case 'spearP': { const im = img(A + 'kf/fx_spear.webp' + AV); if (im.ok) { const e = Math.min(1, p / .5), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e, a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), w = (f.len || 120) * 1.6, h = w * im.el.naturalHeight / im.el.naturalWidth;
        if (p > .75) g.globalAlpha = 1 - (p - .75) * 4; g.translate(x, y); g.rotate(a); g.shadowColor = f.c || RED; g.shadowBlur = 14; g.drawImage(im.el, -w * .9, -h / 2, w, h); break; } }
    case 'spearP_code': { const e = Math.min(1, p / .5), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e, a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), L = f.len || 120;
      if (p > .75) g.globalAlpha = 1 - (p - .75) * 4; g.translate(x, y); g.rotate(a); g.shadowColor = f.c || '#ff3b4a'; g.shadowBlur = 18;
      g.strokeStyle = '#2a1a14'; g.lineWidth = 4; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L * .3, 0); g.stroke(); g.fillStyle = '#e3b448'; g.beginPath(); g.arc(-L, 0, 4, 0, 6.28); g.fill();
      g.fillStyle = '#3a3a44'; g.beginPath(); g.moveTo(L * .55, 0); g.lineTo(L * .28, -7); g.lineTo(L * .3, 0); g.lineTo(L * .28, 7); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); break; }
    case 'flash': { const im = f.c === RED && img(A + 'kf/fx_flash.webp' + AV); if (im && im.ok) { const e = Math.min(1, p / .12), fade = p < .25 ? 1 : 1 - (p - .25) / .75, s = f.r * 2.2 * (.6 + .4 * e); g.translate(f.x, f.y); g.rotate(f.rot || 0); g.globalAlpha = fade; g.globalCompositeOperation = 'lighter'; g.drawImage(im.el, -s / 2, -s * im.el.naturalHeight / im.el.naturalWidth / 2, s, s * im.el.naturalHeight / im.el.naturalWidth); g.globalCompositeOperation = 'source-over'; break; } }
    case 'flash_code': { // thrust impact: sharp white star burst with a coloured rim
      const e = Math.min(1, p / .15), fade = p < .25 ? 1 : 1 - (p - .25) / .75, R = f.r * (.5 + .5 * e); g.translate(f.x, f.y); g.globalCompositeOperation = 'lighter'; g.globalAlpha = fade;
      const n = f.n || 8; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + (f.rot || 0), l = R * (i % 2 ? .55 : 1); g.fillStyle = i % 2 ? f.c || '#ff3b4a' : '#ffffff'; g.beginPath(); g.moveTo(Math.cos(a) * l, Math.sin(a) * l); g.lineTo(Math.cos(a + .18) * R * .12, Math.sin(a + .18) * R * .12); g.lineTo(Math.cos(a - .18) * R * .12, Math.sin(a - .18) * R * .12); g.closePath(); g.fill(); }
      const rg = g.createRadialGradient(0, 0, 1, 0, 0, R * .5); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, R * .5, 0, 6.28); g.fill(); g.globalCompositeOperation = 'source-over'; break; }
    case 'ward': { const [x, y] = pos(f.unit), [ox, oy] = kfOff(f.unit), d = f.unit.side ? -1 : 1, H = f.unit.h * 1.15, X = x + d * (ox + f.unit.w * .45), e = Math.min(1, p / .15), fade = p < .6 ? 1 : 1 - (p - .6) / .4;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = fade * .85; const lg = g.createLinearGradient(X - 26, 0, X + 26, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(.5, f.c); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg;
      g.beginPath(); g.ellipse(X, y - oy - H * .5, 26 * e, H * .55 * e, 0, 0, 6.28); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.globalAlpha = fade * .7; g.beginPath(); g.ellipse(X, y - oy - H * .5, 10 * e, H * .52 * e, 0, 0, 6.28); g.stroke(); g.globalCompositeOperation = 'source-over'; break; }
    case 'deb': { const im = img(A + 'kf/fx_debris.webp' + AV); if (!im.ok) break; for (const q of f.ps) { const t = p * f.dur, x = f.x + q.vx * t, y = f.y + q.vy * t + 900 * t * t; g.save(); g.globalAlpha = 1 - p; g.translate(x, y); g.rotate(q.r + t * q.vr); const s = q.s; g.drawImage(im.el, q.sx * im.el.naturalWidth, 0, im.el.naturalWidth / 4, im.el.naturalHeight, -s / 2, -s / 2, s, s * im.el.naturalHeight / (im.el.naturalWidth / 4)); g.restore(); } break; }
    case 'lines': { const fade = 1 - p; g.strokeStyle = '#ffffff'; g.lineCap = 'butt'; const L = f.x1 - f.x0; if (!f.ls) f.ls = Array.from({ length: 9 }, () => [Math.random(), rnd(.3, 1), rnd(1, 3)]);
      for (const [yy, len, w] of f.ls) { g.globalAlpha = fade * .8; g.lineWidth = w; const xe = f.x0 + L * (.2 + .8 * Math.min(1, p * 3)), xs = xe - L * len * (1 - p * .6); g.beginPath(); g.moveTo(xs, f.y - f.h / 2 + yy * f.h); g.lineTo(xe, f.y - f.h / 2 + yy * f.h); g.stroke(); } break; }
    case 'streak': { const e = Math.min(1, p / .4), fade = 1 - p; g.globalCompositeOperation = 'lighter';
      const x0 = f.x0, x1 = f.x0 + (f.x1 - f.x0) * e;
      for (let i = 0; i < 5; i++) { g.globalAlpha = fade * (.5 - i * .08); g.fillStyle = i % 2 ? '#ffffff' : f.c; const yy = f.y + (i - 2) * f.h * .14, hh = f.h * (.1 - i * .012); g.fillRect(Math.min(x0, x1), yy - hh / 2, Math.abs(x1 - x0), hh); }
      g.globalCompositeOperation = 'source-over'; break; }
    case 'star': { const e = Math.min(1, p / .2), fade = p < .3 ? 1 : 1 - (p - .3) / .7, R = f.r * (.4 + .6 * e); g.translate(f.x, f.y); g.rotate(p * .6); g.globalCompositeOperation = 'lighter';
      for (const [col, sc, al] of [[f.c, 1, .6], ['#ffffff', .55, 1]]) { g.globalAlpha = fade * al; g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = (i % 2 ? .12 : 1) * R * sc; g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } g.closePath(); g.fill(); }
      g.globalCompositeOperation = 'source-over'; break; }
    case 'smoke': { if (!f.puffs) { f.puffs = Array.from({ length: f.n || 10 }, () => ({ a: Math.random() * 6.28, s: rnd(.4, 1), r: rnd(.25, .5), d: rnd(0, .25), w: rnd(-1, 1) })); }
      for (const q of f.puffs) { const t = Math.max(0, (p - q.d) / (1 - q.d)); if (!t) continue; const dist = f.r * q.s * (.3 + t * 1.1), px = f.x + Math.cos(q.a) * dist + q.w * t * f.r * .3, py = f.y - (f.rise ? t * f.r * 2.2 * q.s : 0) + Math.sin(q.a) * dist * .35 - f.r * .25, rr = f.r * q.r * (.6 + t * 1.2);
        const rg = g.createRadialGradient(px, py, rr * .1, px, py, rr); rg.addColorStop(0, 'rgba(14,6,20,.95)'); rg.addColorStop(.55, 'rgba(40,14,60,.75)'); rg.addColorStop(.8, f.c + '55'); rg.addColorStop(1, 'rgba(20,8,30,0)');
        g.globalAlpha = (1 - t) ** .7; g.fillStyle = rg; g.beginPath(); g.arc(px, py, rr, 0, 6.28); g.fill(); }
      break; }
    case 'beam': { g.globalAlpha = (1 - p) * .9; g.strokeStyle = f.c; g.lineWidth = 8 * (1 - p) + 2; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); break; }
    case 'boom': { if (!f.unit) break; const S = FXS[f.hex ? 'hex' : 'fire'], [a, b] = S.peak, [x, y] = pos(f.unit); sprite(g, f.hex ? 'hex' : 'fire', a + p * (b - a + 1), x, y, f.unit.h * .95, (p > .7 ? (1 - p) / .3 : 1) * .78); break; }
    case 'spr': { const S = FXS[f.k], [a, b] = S.peak || [0, S.n - 1], [x, y] = pos(f.unit); sprite(g, f.k, a + p * (b - a + 1), x, y, f.unit.h * f.hs, (p > .75 ? (1 - p) / .25 : 1) * (f.a || 1)); break; }
    case 'rain': { const [x, y0] = pos(f.unit), H = f.unit.h; g.strokeStyle = '#e6edf5'; g.lineWidth = 3; g.globalAlpha = 1 - p * .6; for (let i = 0; i < 3; i++) { const yy = y0 - H * 1.4 + (p * 1.6 - i * .2) * H; g.beginPath(); g.moveTo(x + (i - 1) * 10, yy - 22); g.lineTo(x + (i - 1) * 10, yy); g.stroke(); } break; }
    case 'ink': {
      // brush-reveal of the glowing ink Adinkra: a diagonal wipe paints it in, it breathes, then fades
      const ink = inkSymbol(f.sym, f.c), S = f.s * 1.35, x = f.follow ? pos(f.follow)[0] + (f.follow.side ? -1 : 1) * f.follow.w * .15 : f.x, y = f.follow ? pos(f.follow)[1] - f.follow.h * .62 : f.y;
      const rev = Math.min(1, p / .35), a = p < .75 ? 1 : 1 - (p - .75) / .25, sc = 1 + p * .06;
      g.translate(x, y); g.scale(sc, sc); g.globalAlpha = a * (f.small ? .8 : .95);
      g.beginPath(); g.moveTo(-S, -S * .6); g.lineTo(-S + S * 2.6 * rev, -S * .6 - S * .5); g.lineTo(-S + S * 2.6 * rev - S * .4, S * .9); g.lineTo(-S, S * .9); g.closePath(); g.clip();
      g.drawImage(ink, -S / 2, -S / 2, S, S);
      break;
    }
  }
  g.restore(); return p < 1;
}

// ---------------- boot ----------------
route();
window.__sq = { get B() { return B; }, get SAVE() { return SAVE; }, battle, route, MM, renderAct: () => B && B.cur && renderAct(B.cur), ratio: (i, d) => heroPower(SAVE.squad[0]) / enemyPower(STAGES[i], DIFF.find((x) => x.id === d)) };
