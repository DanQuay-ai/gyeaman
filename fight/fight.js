// Gyeaman Fight: 1v1 action fighter with the Duels heroes' Firefly keyframe poses.
// Touch: tap to strike (3-tap string), swipe left/right to dash (brief invulnerability), swipe up to jump, hold a side to walk.
// Skills come as cards that pop into a 3-card hand; the Sunsum special card appears when the gauge is full.
// No guarding, except Gyakari's Shield card.
// Poses (squads/kf.js): idle_0 stance, idle_1 hurt, idle_2 down, idle_3 run, *A_* light, *B_* heavy, *ult* special.
import { KF } from '../squads/kf.js';
import { HEROES } from '../squads/data.js';

const ROOT = '../assets/sq/', AV = '?v=f1';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const IDS = ['blay', 'owureku', 'gyakari', 'obiri', 'kuukua', 'kome', 'afrakoma', 'dufie', 'sekan', 'bayi'];
const BGS = ['bg_grove', 'bg_forest', 'bg_gate', 'bg_marsh'];
const RANGED = { obiri: 'fx_arrow', kuukua: 'fx_spear', kome: 'fx_fireball', bayi: 'fx_fireball' };
const IM = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- images and measured hitboxes
// Each pose's reach is measured from its opaque pixels (front-most pixel in the body band), not from the image box.
const REACH = {};
function measure(id, p, el) {
  const D = KF[id].p[p], sc = 160 / D[2], w = Math.max(1, Math.round(D[1] * sc)), h = 160;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(el, 0, 0, w, h); const a = x.getImageData(0, 0, w, h).data, ax = D[3] * sc, fy = D[4] * sc, ref = KF[id].ref * sc;
  let front = 0, back = 0, low = 0;
  for (let yy = 0; yy < h; yy++) {
    const hgt = (fy - yy) / ref; if (hgt < 0.05 || hgt > 1.15) continue;
    for (let xx = 0; xx < w; xx++) if (a[(yy * w + xx) * 4 + 3] > 90) { const d = (xx - ax) / ref; if (d > front) { front = d; low = hgt; } if (-d > back) back = -d; }
  }
  REACH[id + '/' + p] = { front, back, low };
}
const img = (src, onok) => {
  if (!IM[src]) { const e = { el: new Image(), ok: false }; e.el.onload = () => { e.ok = true; onok && onok(e.el); }; e.el.src = src; IM[src] = e; }
  return IM[src];
};
const kfImg = (id, p) => img(ROOT + 'kf/' + KF[id].p[p][0] + AV, (el) => { try { measure(id, p, el); } catch (_) { } });

// ---------------------------------------------------------------- move sets
function poseSet(id) {
  const keys = Object.keys(KF[id].p);
  const pick = (re) => keys.filter((k) => re.test(k)).sort();
  let light = pick(/^[a-z]+A_\d$/), heavy = pick(/^[a-z]+B_\d$/), special = pick(/ult/);
  if (id === 'dufie') { light = pick(/^basic_/); heavy = pick(/^kick_/); special = [...pick(/^ultE_[1-3]/), ...pick(/^ultF_[1-3]/)]; }
  const strip0 = (a) => (a.length > 3 ? a.filter((k) => !k.endsWith('_0')) : a);
  light = strip0(light); heavy = strip0(heavy); special = id === 'dufie' ? special : strip0(special);
  const skill = id === 'dufie' ? pick(/^step_[1-3]/) : id === 'blay' ? pick(/^parry_[1-3]/) : heavy;
  return { stance: 'idle_0', hurt: 'idle_1', down: 'idle_2', run: 'idle_3', guard: 'idle_0', light, heavy, special, skill, sweep: heavy };
}
const SETS = Object.fromEntries(IDS.map((id) => [id, poseSet(id)]));
for (const id of IDS) for (const p in KF[id].p) kfImg(id, p);
for (const id of IDS) img(ROOT + 'face_' + id + '.webp');
for (const b of BGS) img(ROOT + b + '.webp');
for (const f of new Set(Object.values(RANGED))) img(ROOT + 'kf/' + f + '.webp' + AV);
const reachOf = (f, p) => { const r = REACH[f.id + '/' + p]; return r ? r.front : 0.6; };

// ---------------------------------------------------------------- tuning (1 unit = one body height, seconds)
const T = {
  grav: 9.5, jumpV: 4.1, walk: 1.2, dash: 6.2, dashT: 0.22, iframes: 0.2, push: 0.27, stageHalf: 5.2, hurtW: 0.24, roundTime: 60, maxHp: 1000,
  span: 6.4, spanP: 3.6, hand: 3, refill: 1.4,
};
// moves: dmg, frame timing, stun, push, gauge gain. set = which poses
const MOVES = {
  L1: { set: 'light', frames: [0], dmg: 30, startup: 0.06, active: 0.07, recover: 0.12, stun: 0.32, push: 0.18, meter: 5 },
  L2: { set: 'light', frames: [1], dmg: 34, startup: 0.06, active: 0.07, recover: 0.12, stun: 0.34, push: 0.2, meter: 5 },
  L3: { set: 'light', frames: [2], dmg: 46, startup: 0.08, active: 0.08, recover: 0.22, stun: 0.5, push: 0.5, meter: 7, knock: true },
  H: { set: 'heavy', dmg: 82, startup: 0.16, active: 0.1, recover: 0.24, stun: 0.45, push: 0.6, meter: 9, launch: true },
  D: { set: 'sweep', dmg: 60, startup: 0.12, active: 0.1, recover: 0.28, stun: 0, push: 0.3, meter: 8, knock: true, low: true },
  K: { set: 'skill', dmg: 52, startup: 0.12, active: 0.24, recover: 0.24, stun: 0.45, push: 0.5, meter: 8, hits: 2, lunge: 3.2 },
  S: { set: 'special', dmg: 175, startup: 0.2, active: 0.36, recover: 0.3, stun: 0.6, push: 1.1, meter: 0, knock: true, hits: 3, lunge: 2.6 },
  G: { set: 'guard', guard: 1.2 },
};
// cards: what pops into the hand
const CARDS = {
  H: { name: (H) => H.kit[0], tag: 'HEAVY', col: '#e3b448' },
  D: { name: () => 'Sweep', tag: 'LOW', col: '#7fd06a' },
  K: { name: (H) => H.kit[1], tag: 'SKILL', col: '#7fd0ff' },
  G: { name: (H) => H.kit[2], tag: 'SHIELD', col: '#9fd3ff' },
  S: { name: (H) => H.kit[3], tag: 'SUNSUM', col: '#c58bff' },
};
const deckOf = (id) => (id === 'gyakari' ? ['H', 'D', 'K', 'G', 'H'] : ['H', 'D', 'K', 'H']);

// ---------------------------------------------------------------- fighter
class Fighter {
  constructor(id, side, cpu, level) {
    const H = HEROES[id];
    Object.assign(this, { id, side, cpu, level, set: SETS[id], x: side * 1.6, y: 0, vx: 0, vy: 0, face: -side, hp: T.maxHp, show: T.maxHp, meter: 0,
      st: 'idle', t: 0, mv: null, stun: 0, combo: 0, chain: 0, chainT: 0, ghosts: [], ai: { t: 0, plan: null }, wins: 0, inv: 0, guardT: 0, walkPh: 0,
      hand: [], refillT: [] });
    this.size = clamp(H.size, 0.94, 1.12);
    this.atkM = 0.85 + 0.3 * clamp((Math.max(H.atk, H.mag) - 40) / 42, 0, 1);
    this.defM = 1.1 - 0.2 * clamp((H.def - 16) / 16, 0, 1);
    this.spdM = 0.9 + 0.2 * clamp((H.spd - 84) / 40, 0, 1);
    this.deck = deckOf(id); this.fillHand(true);
  }
  fillHand(all) {
    for (let i = 0; i < T.hand; i++) if (all || this.hand[i] == null) { this.hand[i] = this.deck[Math.floor(Math.random() * this.deck.length)]; this.refillT[i] = 0; }
    if (this.id === 'gyakari' && all && !this.hand.includes('G')) this.hand[2] = 'G';
  }
  get air() { return this.y > 0.001; }
  pose() {
    const s = this.set;
    switch (this.st) {
      case 'atk': {
        const m = this.mv, fr = s[m.d.set];
        if (m.d.frames) return fr[Math.min(fr.length - 1, m.d.frames[0])];
        const i = Math.min(fr.length - 1, Math.floor(this.t / m.total * fr.length * 0.999)); return fr[Math.max(0, i)];
      }
      case 'hit': return s.hurt;
      case 'down': case 'ko': return s.down;
      case 'dash': case 'jump': return s.run;
      case 'guard': return s.guard;
      default: return s.stance;
    }
  }
}

function startMove(f, key) {
  const d = MOVES[key]; if (!d) return false;
  if (key === 'S') { if (f.meter < 100) return false; f.meter = 0; fx.flash = 0.25; fx.slow = 0.18; announce(HEROES[f.id].kit[3], 0.9, f); }
  if (key === 'G') { f.st = 'guard'; f.t = 0; f.guardT = d.guard; f.vx = 0; announce(HEROES[f.id].kit[2], 0.6, f); return true; }
  const total = d.startup + d.active + d.recover;
  f.mv = { key, d, total, hitDone: 0, hits: d.hits && !(key === 'S' && RANGED[f.id]) ? d.hits : 1, fired: false };
  f.st = 'atk'; f.t = 0; if (!f.air) f.vx = 0;
  return true;
}
function strike(f) {
  if (f.st === 'atk' && f.mv.key.startsWith('L') && f.t > f.mv.d.startup + f.mv.d.active * 0.5) { f.queued = true; return; }
  if (!free(f)) return;
  f.chain = f.chainT > 0 ? (f.chain % 3) + 1 : 1; startMove(f, 'L' + f.chain);
}
function playCard(f, i) {
  if (i === 'S') { if (free(f) && f.meter >= 100) startMove(f, 'S'); return; }
  const c = f.hand[i]; if (c == null || !free(f)) return;
  if (startMove(f, c)) { f.hand[i] = null; f.refillT[i] = T.refill + (c === 'G' ? 2 : 0); if (!f.cpu) cardsDirty = true; }
}
function dash(f, dir) {
  if (!free(f) || f.air) return;
  f.st = 'dash'; f.t = 0; f.vx = dir * T.dash * f.spdM; f.inv = T.iframes; f.dashDir = dir;
}
function jump(f, dir) { if (!free(f) || f.air) return; f.vy = T.jumpV; f.vx = dir * T.walk * 1.2 * f.spdM; f.st = 'jump'; f.y = 0.002; }
const free = (f) => ['idle', 'walk', 'jump'].includes(f.st) || (f.st === 'dash' && f.t > T.dashT * 0.6);

// ---------------------------------------------------------------- game state
const G = { scene: 'title', mode: 'cpu', diff: 1, sel: [0, 3], selStep: 0, f: [], round: 1, time: T.roundTime, bg: 'bg_grove', ann: null, over: null, cam: { x: 0 }, hitstop: 0, shake: 0, sparks: [], shots: [], menu: 0, rects: [] };
const fx = { flash: 0, slow: 0 };
function announce(text, dur = 1.1, by = null) { G.ann = { text, t: 0, dur, by }; }
function newMatch() {
  const [a, b] = G.sel.map((i) => IDS[i]);
  G.f = [new Fighter(a, -1, false), new Fighter(b, 1, G.mode === 'cpu', G.diff)];
  G.round = 1; G.bg = BGS[Math.floor(Math.random() * BGS.length)]; newRound();
}
function newRound() {
  for (const f of G.f) { Object.assign(f, { x: f.side * 1.6, y: 0, vx: 0, vy: 0, face: -f.side, hp: T.maxHp, show: T.maxHp, st: 'idle', t: 0, mv: null, stun: 0, combo: 0, ghosts: [], inv: 0 }); f.fillHand(true); }
  G.cam.x = 0; G.time = T.roundTime; G.sparks = []; G.shots = []; G.over = null; G.scene = 'fight'; G.intro = 1.6; cardsDirty = true;
  announce('ROUND ' + G.round, 0.9); setTimeout(() => { if (G.scene === 'fight') announce('FIGHT', 0.6); }, 900);
}

// ---------------------------------------------------------------- input: keyboard
const keys = new Set();
const KB = [
  { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', strike: 'KeyJ', c0: 'KeyK', c1: 'KeyL', c2: 'KeyI', sp: 'KeyO', dash: 'ShiftLeft' },
  { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', strike: 'Numpad1', c0: 'Numpad4', c1: 'Numpad5', c2: 'Numpad6', sp: 'Numpad0', dash: 'NumpadEnter' },
];
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (G.scene === 'fight' && !G.intro_block()) {
    G.f.forEach((f, i) => {
      if (f.cpu || (i === 1 && G.mode === 'cpu')) return; const k = KB[i];
      const dir = (keys.has(k.right) ? 1 : 0) - (keys.has(k.left) ? 1 : 0);
      if (e.code === k.strike) strike(f);
      if (e.code === k.c0) playCard(f, 0); if (e.code === k.c1) playCard(f, 1); if (e.code === k.c2) playCard(f, 2);
      if (e.code === k.sp) playCard(f, 'S');
      if (e.code === k.up) jump(f, dir);
      if (e.code === k.dash) dash(f, dir || f.face);
      if ((e.code === k.left || e.code === k.right)) { const d2 = e.code === k.right ? 1 : -1, now = performance.now(); if (f.tapDir === d2 && now - f.tapAt < 260) dash(f, d2); f.tapDir = d2; f.tapAt = now; }
      if (e.code === k.down && keys.has(k.c0)) playCard(f, 0);
    });
  }
  menuKey(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
G.intro_block = () => G.intro > 0 || !!G.over;
const kbWalk = (i) => { const k = KB[i]; return (keys.has(k.right) ? 1 : 0) - (keys.has(k.left) ? 1 : 0); };

// ---------------------------------------------------------------- input: touch (tap, swipe, hold)
const touch = { on: false, hold: 0, id: null };
cv.addEventListener('pointerdown', (e) => {
  if (G.scene !== 'fight') return menuTap(e);
  if (e.clientX > W / 2 - 40 && e.clientX < W / 2 + 40 && e.clientY < 70) { G.scene = 'pause'; G.menu = 0; return; }
  if (touch.id !== null) { const f = G.f[0]; if (f && !G.intro_block()) strike(f); return; }   // second finger: strike
  touch.id = e.pointerId; touch.x0 = e.clientX; touch.y0 = e.clientY; touch.t0 = performance.now(); touch.mode = 'tap'; touch.hold = 0;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { }
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== touch.id || G.scene !== 'fight') return; const f = G.f[0]; if (!f) return;
  const dx = e.clientX - touch.x0, dy = e.clientY - touch.y0, dt = performance.now() - touch.t0, m = Math.hypot(dx, dy);
  if (touch.mode === 'tap' && m > 28) {
    if (dt < 260) {
      touch.mode = 'swiped';
      if (!G.intro_block()) { if (-dy > Math.abs(dx)) jump(f, Math.abs(dx) > 20 ? Math.sign(dx) : 0); else if (dy > Math.abs(dx)) playCardTag(f, 'D'); else dash(f, Math.sign(dx)); }
    } else { touch.mode = 'hold'; }
  }
  if (touch.mode === 'hold') touch.hold = Math.abs(dx) > 20 ? Math.sign(dx) : 0;
});
const endTouch = (e) => {
  if (e.pointerId !== touch.id) return;
  if (G.scene === 'fight' && touch.mode === 'tap' && performance.now() - touch.t0 < 260 && G.f[0] && !G.intro_block()) strike(G.f[0]);
  touch.id = null; touch.hold = 0; touch.mode = null;
};
cv.addEventListener('pointerup', endTouch); cv.addEventListener('pointercancel', endTouch);
// long press without moving: walk toward the pressed side
setInterval(() => { if (touch.id !== null && touch.mode === 'tap' && performance.now() - touch.t0 > 260) { touch.mode = 'hold'; const f = G.f[0]; if (f) { const V = view(); touch.hold = Math.sign(touch.x0 - V.sx(f.x)) || 0; } } }, 50);
addEventListener('touchstart', () => { touch.on = true; }, { once: true, passive: true });
function playCardTag(f, tag) { const i = f.hand.indexOf(tag); if (i >= 0) playCard(f, i); }

// ---------------------------------------------------------------- cards (DOM)
const handEl = document.getElementById('hand'); let cardsDirty = true; const shown = [];
function renderCards() {
  const f = G.f[0]; const on = G.scene === 'fight' && f && !f.cpu;
  handEl.style.display = on ? 'flex' : 'none'; if (!on) return;
  const slots = [...f.hand.map((c, i) => [c, i]), [f.meter >= 100 ? 'S' : null, 'S']];
  slots.forEach(([c, i], k) => {
    let el = shown[k];
    if (!el) { el = shown[k] = document.createElement('button'); el.className = 'card'; el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); playCard(G.f[0], el.dataset.i === 'S' ? 'S' : +el.dataset.i); }); handEl.appendChild(el); }
    el.dataset.i = i;
    const key = c ? c + f.id : '';
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      if (!c) { el.className = 'card empty' + (i === 'S' ? ' sp' : ''); el.innerHTML = i === 'S' ? '<i>SUNSUM</i>' : ''; }
      else {
        const C = CARDS[c], H0 = HEROES[f.id];
        el.className = 'card pop' + (c === 'S' ? ' sp' : ''); el.style.setProperty('--c', C.col);
        el.innerHTML = `<img src="${ROOT}face_${f.id}.webp" alt=""><b>${C.name(H0)}</b><i>${C.tag}</i>`;
      }
    }
    if (c == null && i !== 'S') { const pct = 1 - f.refillT[i] / T.refill; el.style.setProperty('--p', clamp(pct, 0, 1)); }
  });
}

// ---------------------------------------------------------------- simulation
function hurtbox(f) { return { x0: f.x - T.hurtW, x1: f.x + T.hurtW, y0: f.y, y1: f.y + 0.95 }; }
function hitbox(f) {
  const reach = Math.max(0.42, reachOf(f, f.pose()) * f.size), low = f.mv.d.low;
  const x0 = f.x + f.face * 0.05, x1 = f.x + f.face * reach;
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: f.y + (low ? 0 : 0.2), y1: f.y + (low ? 0.4 : 1.0) };
}
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function aiThink(f, foe, dt) {
  const A = f.ai, lv = f.level; A.t -= dt; if (A.t > 0 || G.intro_block()) return;
  A.t = rnd(0.14, 0.34) * (1.45 - lv * 0.3);
  const d = Math.abs(foe.x - f.x), fwd = Math.sign(foe.x - f.x), reach = Math.max(0.6, reachOf(f, f.set.light[0]) * f.size) + T.hurtW;
  // dodge an incoming attack with a dash, or shield (Gyakari)
  if (foe.st === 'atk' && foe.t < foe.mv.d.startup && d < 1.4 && Math.random() < [0.15, 0.35, 0.6][lv]) {
    if (f.hand.includes('G')) return playCardTag(f, 'G');
    return dash(f, -fwd);
  }
  if (f.meter >= 100 && Math.random() < 0.5 && (RANGED[f.id] || d < 1.6)) return playCard(f, 'S');
  if (RANGED[f.id] && d > 1.8 && f.hand.includes('K') && Math.random() < 0.4) return playCardTag(f, 'K');
  if (d > reach + 0.15) { A.walk = fwd; if (d > 2.4 && Math.random() < 0.3) dash(f, fwd); else if (Math.random() < 0.08) jump(f, fwd); return; }
  A.walk = 0;
  const r = Math.random();
  if (r < 0.5) { strike(f); A.t = 0.12; A.combo = 2; }
  else if (r < 0.8) { const c = f.hand.findIndex((x) => x && x !== 'G'); if (c >= 0) playCard(f, c); else strike(f); }
  else if (r < 0.9) dash(f, -fwd); else A.walk = -fwd;
}

function applyHit(att, def, d, key, mult = 1) {
  if (def.inv > 0) { spark(def, att.face, 'rgba(255,255,255,.5)', 4); return; }
  const guarded = def.st === 'guard';
  let dmg = d.dmg * att.atkM * def.defM * mult;
  if (guarded) {
    dmg *= 0.1; def.vx = att.face * d.push * 1.4; att.vx = -att.face * 0.8; att.st = 'hit'; att.t = 0; att.stun = 0.35; att.mv = null;   // shield repels
    def.meter = Math.min(100, def.meter + 8); spark(def, att.face, '#9fd3ff', 10); sfx('block');
  } else {
    dmg *= Math.max(0.35, 1 - 0.1 * att.combo); att.combo++;
    att.meter = Math.min(100, att.meter + d.meter); def.meter = Math.min(100, def.meter + d.meter * 0.6);
    const launch = def.air || d.knock || (d.launch && def.st === 'hit');
    def.st = launch ? 'down' : 'hit'; def.mv = null; def.t = 0; def.stun = d.stun || 0.5; def.vx = att.face * d.push * 2.2;
    if (launch) { def.vy = d.low ? 1.2 : 3.2; def.y = Math.max(def.y, 0.01); }
    spark(def, att.face, key === 'S' ? '#ffd76a' : '#ffffff', key.startsWith('L') ? 9 : 16);
    G.hitstop = key.startsWith('L') ? 0.05 : key === 'S' ? 0.12 : 0.09; G.shake = key.startsWith('L') ? 0.05 : 0.14;
    sfx(key.startsWith('L') ? 'light' : 'heavy');
  }
  def.hp = Math.max(0, def.hp - dmg);
}
function spark(f, dir, col, n) {
  const x = f.x - dir * 0.05, y = f.y + 0.6;
  for (let i = 0; i < n; i++) { const a = rnd(-1.2, 1.2) + (dir > 0 ? 0 : Math.PI); G.sparks.push({ x, y, vx: Math.cos(a) * rnd(2, 5), vy: Math.sin(a) * rnd(1, 4), t: 0, life: rnd(0.15, 0.3), col }); }
  G.sparks.push({ ring: true, x, y, t: 0, life: 0.22, col });
}
function dust(f) { for (let i = 0; i < 8; i++) G.sparks.push({ x: f.x + rnd(-0.3, 0.3), y: 0.02, vx: rnd(-1, 1), vy: rnd(0.3, 1), t: 0, life: 0.4, col: 'rgba(210,190,160,.8)', dust: true }); }

function stepFighter(f, foe, dt, walkIn) {
  f.t += dt; f.inv = Math.max(0, f.inv - dt); f.chainT = Math.max(0, f.chainT - dt);
  for (let i = 0; i < T.hand; i++) if (f.hand[i] == null) { f.refillT[i] -= dt; if (f.refillT[i] <= 0) { let c; do { c = f.deck[Math.floor(Math.random() * f.deck.length)]; } while (c === 'G' && f.hand.includes('G')); f.hand[i] = c; if (!f.cpu) cardsDirty = true; } }
  if (f.st === 'atk') {
    const m = f.mv, d = m.d, tt = f.t;
    if (d.lunge && !(m.key === 'S' && RANGED[f.id]) && tt > d.startup && tt < d.startup + d.active) f.vx = f.face * d.lunge;
    else if (!f.air) f.vx *= 0.8;
    if (tt >= d.startup && tt < d.startup + d.active) {
      if ((m.key === 'S' || m.key === 'K') && RANGED[f.id]) {
        if (!m.fired) { m.fired = true; G.shots.push({ owner: f, x: f.x + f.face * 0.5, y: f.y + 0.62, vx: f.face * (m.key === 'S' ? 5.5 : 4.2), im: RANGED[f.id], t: 0, tint: f.id === 'bayi', d, key: m.key, big: m.key === 'S' }); sfx('shot'); }
      } else {
        const slot = Math.floor((tt - d.startup) / d.active * m.hits);
        if (slot >= m.hitDone && overlap(hitbox(f), hurtbox(foe)) && foe.st !== 'ko') { m.hitDone = slot + 1; applyHit(f, foe, d, m.key, m.hits > 1 ? 1 / m.hits * 1.5 : 1); }
      }
      if (m.key === 'S' || m.key === 'K' || m.key === 'H') f.ghosts.push({ x: f.x, y: f.y, p: f.pose(), a: 0.4 });
    }
    if (tt >= m.total) {
      const L = m.key.startsWith('L'); f.st = f.air ? 'jump' : 'idle'; f.mv = null;
      if (L) { f.chainT = 0.35; if (f.queued) { f.queued = false; strike(f); } }
    }
  } else if (f.st === 'hit') { f.vx *= 0.86; if (f.t > f.stun) { f.st = 'idle'; foe.combo = 0; } }
  else if (f.st === 'down') { if (!f.air && f.t > 0.75) { f.st = f.hp <= 0 ? 'ko' : 'idle'; foe.combo = 0; f.inv = 0.4; } if (!f.air) f.vx *= 0.8; }
  else if (f.st === 'guard') { f.vx *= 0.8; f.guardT -= dt; if (f.guardT <= 0) f.st = 'idle'; }
  else if (f.st === 'dash') { if (f.t > T.dashT) { f.st = 'idle'; f.vx *= 0.3; } else f.ghosts.push({ x: f.x, y: f.y, p: f.set.run, a: 0.3, face: f.face }); }
  else if (!f.air && (f.st === 'idle' || f.st === 'walk') && !G.intro_block()) {
    f.vx = walkIn * T.walk * f.spdM * (walkIn === f.face ? 1 : 0.8); f.st = walkIn ? 'walk' : 'idle';
  }
  if (f.st === 'walk') f.walkPh += dt * 9 * f.spdM * Math.sign(f.vx * f.face || 1);
  // physics
  if (f.air || f.vy > 0) { f.vy -= T.grav * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; if (f.st === 'jump' || (f.st === 'atk' && f.mv?.key.startsWith('L'))) { f.st = 'idle'; f.mv = null; } if (f.st === 'down') { G.shake = 0.08; dust(f); } } }
  f.x = clamp(f.x + f.vx * dt, -T.stageHalf, T.stageHalf);
  f.show += (f.hp - f.show) * Math.min(1, dt * (f.show > f.hp ? 2.5 : 10));
  f.ghosts = f.ghosts.filter((g2) => (g2.a -= dt * 1.6) > 0).slice(-6);
  if (['idle', 'walk', 'jump'].includes(f.st) && !f.air) f.face = Math.sign(foe.x - f.x) || f.face;
}

function update(dt) {
  if (G.scene !== 'fight') return;
  if (G.ann) { G.ann.t += dt; if (G.ann.t > G.ann.dur) G.ann = null; }
  fx.flash = Math.max(0, fx.flash - dt); G.shake = Math.max(0, G.shake - dt);
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  if (fx.slow > 0) { fx.slow -= dt; dt *= 0.35; }
  if (G.over) { dt *= G.over.t < 1 ? 0.3 : 1; G.over.t += dt; }
  const [a, b] = G.f;
  if (G.intro > 0) G.intro -= dt; else if (!G.over) G.time = Math.max(0, G.time - dt);
  const walkOf = (f, i) => (f.cpu ? f.ai.walk || 0 : i === 0 ? kbWalk(0) || touch.hold : kbWalk(1));
  if (b.cpu) aiThink(b, a, dt); if (a.cpu) aiThink(a, b, dt);
  stepFighter(a, b, dt, walkOf(a, 0)); stepFighter(b, a, dt, walkOf(b, 1));
  const dx = b.x - a.x, minD = T.push * 2 * ((a.size + b.size) / 2);
  if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 0.8 && a.st !== 'dash' && b.st !== 'dash') { const o = (minD - Math.abs(dx)) / 2 * (Math.sign(dx) || 1); a.x -= o; b.x += o; }
  for (const s of G.shots) {
    s.t += dt; s.x += s.vx * dt; const foe = s.owner === a ? b : a;
    if (!s.dead && overlap({ x0: s.x - 0.2, x1: s.x + 0.2, y0: s.y - 0.12, y1: s.y + 0.12 }, hurtbox(foe))) { s.dead = true; applyHit(s.owner, foe, s.d, s.key, s.big ? 0.9 : 1); }
    if (Math.abs(s.x) > T.stageHalf + 3) s.dead = true;
  }
  G.shots = G.shots.filter((s) => !s.dead);
  for (const p of G.sparks) { p.t += dt; if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= (p.dust ? 1 : 8) * dt; } }
  G.sparks = G.sparks.filter((p) => p.t < p.life);
  if (!G.over && (a.hp <= 0 || b.hp <= 0 || G.time <= 0)) {
    const w = a.hp === b.hp ? null : a.hp > b.hp ? a : b; G.over = { t: 0, w };
    for (const f of G.f) if (f.hp <= 0) { f.st = 'down'; f.t = 0; f.vy = 2.4; f.y = 0.01; }
    if (w) w.wins++;
    announce(G.time <= 0 ? 'TIME' : w && w.hp >= T.maxHp ? 'PERFECT' : 'K.O.', 1.6); sfx('ko');
  }
  if (G.over && G.over.t > 3) {
    const champ = G.f.find((f) => f.wins >= 2);
    if (champ) { G.scene = 'result'; G.champ = champ; G.menu = 0; } else { G.round++; newRound(); }
  }
  // camera pans with the fighters, fixed zoom
  const span = portrait() ? T.spanP : T.span, mid = clamp((a.x + b.x) / 2, -T.stageHalf + span / 2 - 0.4, T.stageHalf - span / 2 + 0.4);
  G.cam.x += (mid - G.cam.x) * Math.min(1, dt * 5);
}

// ---------------------------------------------------------------- audio
let AC = null;
function sfx(k) {
  try {
    AC ||= new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
    const o = AC.createOscillator(), gn = AC.createGain(); o.connect(gn); gn.connect(AC.destination);
    const S = { light: [520, 180, 0.08, 'square'], heavy: [220, 60, 0.16, 'sawtooth'], block: [900, 700, 0.06, 'triangle'], shot: [300, 900, 0.12, 'triangle'], ko: [180, 40, 0.6, 'sawtooth'], ui: [660, 880, 0.06, 'square'] }[k];
    o.type = S[3]; o.frequency.setValueAtTime(S[0], t); o.frequency.exponentialRampToValueAtTime(S[1], t + S[2]);
    gn.gain.setValueAtTime(0.12, t); gn.gain.exponentialRampToValueAtTime(0.001, t + S[2]); o.start(t); o.stop(t + S[2] + 0.02);
  } catch (_) { }
}

// ---------------------------------------------------------------- rendering
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; }
addEventListener('resize', resize); resize();
const portrait = () => H > W;
function view() {
  const floor = portrait() ? H * 0.6 : H * 0.8, s = Math.min(W / (portrait() ? T.spanP : T.span), H * 0.42);
  return { floor, s, sx: (x) => W / 2 + (x - G.cam.x) * s, sy: (y) => floor - y * s };
}
function cover(im, alpha = 1) {
  if (!im.ok) return; const e = im.el, r = Math.max(W / e.width, H / e.height) * 1.12, w = e.width * r, h = e.height * r;
  const px = clamp(-G.cam.x * 8, -(w - W) / 2, (w - W) / 2);
  g.globalAlpha = alpha; g.drawImage(e, (W - w) / 2 + px, (H - h) / (portrait() ? 3 : 2), w, h); g.globalAlpha = 1;
}
// walk: the stance pose stepping, with bob, lean and a heel-to-toe sway (until Firefly walk frames exist)
function drawPose(id, p, x, y, face, s, size, o = {}) {
  const D = KF[id].p[p]; if (!D) return; const im = kfImg(id, p); if (!im.ok) return;
  const k = s * size / KF[id].ref;
  g.save(); g.translate(x, y); g.scale(face, 1); if (o.alpha < 1) g.globalAlpha = o.alpha;
  if (o.walk !== undefined) {
    const ph = o.walk, step = Math.abs(Math.sin(ph));
    g.translate(Math.sin(ph) * s * 0.02, -step * s * 0.035); g.rotate(0.035 + Math.sin(ph * 2) * 0.012); g.scale(1 + step * 0.015, 1 - step * 0.02);
  }
  if (o.white) g.filter = 'brightness(3) saturate(0)';
  g.drawImage(im.el, -D[3] * k, -D[4] * k, D[1] * k, D[2] * k); g.restore();
}
function drawFight() {
  const V = view(), sh = G.shake > 0 ? rnd(-1, 1) * 6 * G.shake / 0.14 : 0;
  g.save(); g.translate(sh, sh * 0.5);
  cover(img(ROOT + G.bg + '.webp'));
  const gr = g.createLinearGradient(0, V.floor - 40, 0, H); gr.addColorStop(0, 'rgba(10,6,4,0)'); gr.addColorStop(1, 'rgba(10,6,4,.8)'); g.fillStyle = gr; g.fillRect(0, V.floor - 40, W, H);
  g.fillStyle = 'rgba(227,180,72,.25)'; g.fillRect(0, V.floor, W, 2);
  for (const f of G.f) { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(V.sx(f.x), V.floor + 2, V.s * 0.32 * f.size / (1 + f.y), V.s * 0.05, 0, 0, 7); g.fill(); }
  const order = [...G.f].sort((a, b) => (a.st === 'atk') - (b.st === 'atk'));
  for (const f of order) {
    for (const gh of f.ghosts) drawPose(f.id, gh.p, V.sx(gh.x), V.sy(gh.y), gh.face || f.face, V.s, f.size, { alpha: gh.a * 0.6 });
    if (f.st === 'dash' || (f.st === 'atk' && (f.mv.key === 'S' || f.mv.key === 'K'))) speedLines(V, f);
    drawPose(f.id, f.pose(), V.sx(f.x), V.sy(f.y), f.face, V.s, f.size, { white: f.st === 'hit' && f.t < 0.06, walk: f.st === 'walk' ? f.walkPh : undefined, alpha: f.inv > 0 && f.st === 'dash' ? 0.75 : 1 });
    if (f.st === 'guard') { g.strokeStyle = 'rgba(159,211,255,.8)'; g.lineWidth = 4; g.beginPath(); g.ellipse(V.sx(f.x + f.face * 0.2), V.sy(f.y + 0.5), V.s * 0.22, V.s * 0.55, 0, 0, 7); g.stroke(); }
  }
  for (const s of G.shots) {
    const im = img(ROOT + 'kf/' + s.im + '.webp' + AV); if (!im.ok) continue; const h = V.s * (s.big ? 0.36 : 0.26), w = im.el.width / im.el.height * h;
    g.save(); g.translate(V.sx(s.x), V.sy(s.y)); g.scale(Math.sign(s.vx), 1); if (s.tint) g.filter = 'hue-rotate(220deg)'; g.drawImage(im.el, -w / 2, -h / 2, w, h); g.restore();
  }
  for (const p of G.sparks) {
    g.globalAlpha = 1 - p.t / p.life; g.strokeStyle = p.col;
    if (p.ring) { g.lineWidth = 3; g.beginPath(); g.arc(V.sx(p.x), V.sy(p.y), V.s * (0.1 + p.t * 1.6), 0, 7); g.stroke(); }
    else { g.lineWidth = p.dust ? 5 : 2.5; g.beginPath(); g.moveTo(V.sx(p.x), V.sy(p.y)); g.lineTo(V.sx(p.x - p.vx * 0.03), V.sy(p.y - p.vy * 0.03)); g.stroke(); }
    g.globalAlpha = 1;
  }
  if (window.GF_DEBUG) for (const f of G.f) { const hb = hurtbox(f); g.strokeStyle = '#0f0'; g.strokeRect(V.sx(hb.x0), V.sy(hb.y1), (hb.x1 - hb.x0) * V.s, (hb.y1 - hb.y0) * V.s); if (f.st === 'atk') { const a = hitbox(f); g.strokeStyle = '#f00'; g.strokeRect(V.sx(a.x0), V.sy(a.y1), (a.x1 - a.x0) * V.s, (a.y1 - a.y0) * V.s); } }
  g.restore();
  if (fx.flash > 0) { g.fillStyle = `rgba(255,230,160,${fx.flash * 1.2})`; g.fillRect(0, 0, W, H); }
  hud();
}
function speedLines(V, f) {
  g.strokeStyle = 'rgba(255,240,200,.45)'; g.lineWidth = 2; const dir = f.st === 'dash' ? Math.sign(f.vx) : f.face;
  for (let i = 0; i < 6; i++) { const y = V.sy(f.y + 0.15 + Math.random() * 0.8), x = V.sx(f.x) - dir * V.s * rnd(0.3, 0.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x - dir * V.s * rnd(0.4, 0.9), y); g.stroke(); }
}
function txt(t, x, y, size, col = '#f3e7cf', align = 'left', font = 'Anton', stroke = true) {
  g.font = `${size}px ${font}`; g.textAlign = align; g.textBaseline = 'top';
  if (stroke) { g.lineWidth = Math.max(2, size / 8); g.strokeStyle = '#0d0a0a'; g.strokeText(t, x, y); }
  g.fillStyle = col; g.fillText(t, x, y);
}
function hud() {
  const pad = 12, bw = Math.min(W * 0.36, 420), bh = 16, top = 14 + (portrait() ? 20 : 0);
  G.f.forEach((f, i) => {
    const L = i === 0, x = L ? pad + 58 : W - pad - 58 - bw, H0 = HEROES[f.id], face = img(ROOT + 'face_' + f.id + '.webp'), fxp = L ? pad : W - pad - 50;
    g.fillStyle = '#0d0a0a'; g.fillRect(fxp - 2, top - 2, 54, 54);
    if (face.ok) { g.save(); if (!L) { g.translate(fxp + 50, 0); g.scale(-1, 1); g.drawImage(face.el, 0, top, 50, 50); } else g.drawImage(face.el, fxp, top, 50, 50); g.restore(); }
    g.strokeStyle = '#e3b448'; g.lineWidth = 2; g.strokeRect(fxp - 1, top - 1, 52, 52);
    g.fillStyle = '#1a0d07'; g.fillRect(x, top, bw, bh);
    const fw = (v) => bw * v / T.maxHp, dx = (v) => (L ? x + bw - fw(v) : x);
    g.fillStyle = '#c8322a'; g.fillRect(dx(f.show), top, fw(f.show), bh);
    const hg = g.createLinearGradient(0, top, 0, top + bh); hg.addColorStop(0, '#ffe08a'); hg.addColorStop(1, '#c9971a');
    g.fillStyle = f.hp < 300 ? '#ff7a4a' : hg; g.fillRect(dx(f.hp), top, fw(f.hp), bh);
    g.strokeStyle = '#e3b448'; g.strokeRect(x - 1, top - 1, bw + 2, bh + 2);
    txt(H0.name.toUpperCase(), L ? x : x + bw, top + bh + 4, 18, '#f3e7cf', L ? 'left' : 'right');
    const nw = g.measureText(H0.name.toUpperCase()).width;
    txt(H0.kr, L ? x + nw + 12 : x + bw - nw - 12, top + bh + 6, 18, '#e3b448', L ? 'left' : 'right', 'Koradin', false);
    for (let k = 0; k < 2; k++) { g.fillStyle = k < f.wins ? '#e3b448' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(L ? x + bw - 10 - k * 16 : x + 10 + k * 16, top + bh + 14, 5, 0, 7); g.fill(); }
    // Sunsum gauge under the health bar
    const my = top + bh + 30, mw = bw * 0.6, mx = L ? x : x + bw - mw;
    g.fillStyle = '#1a0d07'; g.fillRect(mx, my, mw, 7);
    g.fillStyle = f.meter >= 100 ? (Math.floor(performance.now() / 150) % 2 ? '#7fd0ff' : '#c58bff') : '#4a7fb0';
    g.fillRect(L ? mx : mx + mw - mw * f.meter / 100, my, mw * f.meter / 100, 7); g.strokeStyle = '#8a5a16'; g.strokeRect(mx - 1, my - 1, mw + 2, 9);
    if (f.combo > 1 && (G.f[1 - i].st === 'hit' || G.f[1 - i].st === 'down')) txt(f.combo + ' HITS', L ? pad : W - pad, top + 92, 30, '#ffe08a', L ? 'left' : 'right');
  });
  txt(String(Math.ceil(G.time)).padStart(2, '0'), W / 2, top - 2, 40, G.time < 10 ? '#ff7a4a' : '#f3e7cf', 'center');
  if (G.ann) {
    const a = G.ann, p = a.t / a.dur, sc = 1 + Math.max(0, 0.25 - p) * 2;
    g.save(); g.globalAlpha = Math.min(1, (1 - p) * 4); g.translate(W / 2, H * (portrait() ? 0.3 : 0.36)); g.scale(sc, sc);
    txt(a.text, 0, 0, a.by ? 34 : 72, a.by ? '#ffe08a' : '#e3b448', 'center'); g.restore();
  }
  if (G.intro > 0 && G.round === 1 && touch.on) txt('TAP strike · SWIPE dash · SWIPE UP jump · HOLD walk', W / 2, H * 0.5, 15, '#f3e7cf', 'center', 'Karla');
}

// ---------------------------------------------------------------- menus
function button(label, x, y, w, h, on, go, sub) {
  g.fillStyle = on ? 'rgba(227,180,72,.22)' : 'rgba(0,0,0,.45)'; g.fillRect(x, y, w, h);
  g.strokeStyle = on ? '#e3b448' : 'rgba(227,180,72,.35)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  txt(label, x + w / 2, y + h / 2 - (sub ? 16 : 12), 22, on ? '#ffe08a' : '#f3e7cf', 'center');
  if (sub) txt(sub, x + w / 2, y + h / 2 + 8, 12, 'rgba(243,231,207,.65)', 'center', 'Karla', false);
  G.rects.push({ x, y, w, h, go });
}
function drawTitle() {
  cover(img(ROOT + 'bg_gate.webp'), 1); g.fillStyle = 'rgba(10,6,4,.6)'; g.fillRect(0, 0, W, H);
  const n = IDS.length, k = Math.floor(performance.now() / 2500), s = Math.min(H * 0.42, W * 0.32), fy = H * 0.68;
  drawPose(IDS[k % n], 'idle_0', W * 0.24, fy, 1, s, 1); drawPose(IDS[(k + 5) % n], 'idle_0', W * 0.76, fy, -1, s, 1);
  const ts = Math.min(96, W * 0.14);
  txt('GYEAMAN', W / 2, H * 0.1, ts, '#e3b448', 'center'); txt('FIGHT', W / 2, H * 0.1 + ts + 2, Math.min(48, W * 0.08), '#f3e7cf', 'center');
  const bw = Math.min(280, W * 0.7), bx = W / 2 - bw / 2; let y = H * 0.44;
  const items = [['VS CPU', 'One player', () => { G.mode = 'cpu'; G.scene = 'select'; G.selStep = 0; }], ['2 PLAYERS', 'Same keyboard', () => { G.mode = 'pvp'; G.scene = 'select'; G.selStep = 0; }],
    [['EASY', 'NORMAL', 'HARD'][G.diff], 'CPU difficulty', () => { G.diff = (G.diff + 1) % 3; }], ['HOW TO PLAY', 'Controls', () => { G.scene = 'help'; }]];
  items.forEach(([l, sub, go], i) => { button(l, bx, y, bw, 52, G.menu === i, go, sub); y += 60; });
  G.items = items;
}
function drawHelp() {
  g.fillStyle = '#0d0a0a'; g.fillRect(0, 0, W, H);
  const L = [['Touch', 'Tap to strike (tap again for a 3-hit string). Swipe left or right to dash, you dodge through attacks. Swipe up to jump, swipe down for a low sweep. Hold a side of the screen to walk.'],
    ['Cards', 'Skill cards pop into your hand. Tap one to use it; a new card pops in after a moment. The Sunsum card appears when the gauge is full.'],
    ['No guard', 'Dodge with dashes. Only Gyakari can block, with his Shield card, and it knocks the attacker back.'],
    ['P1 keyboard', 'A D walk (double tap to dash), W jump, J strike, K L I cards, O Sunsum, Left Shift dash'],
    ['P2 keyboard', 'Arrows, Numpad 1 strike, 4 5 6 cards, 0 Sunsum, Numpad Enter dash'], ['Rounds', 'First to 2 rounds, 60 seconds each']];
  let y = 40; txt('HOW TO PLAY', W / 2, y, 40, '#e3b448', 'center'); y += 64;
  const lx = Math.max(20, W / 2 - 300), wide = W > 640;
  for (const [a, b] of L) { txt(a, lx, y, 18, '#ffe08a', 'left', 'Karla', false); y = wrap(b, lx + (wide ? 150 : 0), y + (wide ? 0 : 22), Math.min(W - 40, 450), 16) + 14; }
  button('BACK', W / 2 - 90, Math.min(H - 70, y + 10), 180, 48, true, () => { G.scene = 'title'; });
  G.items = [['BACK', '', () => { G.scene = 'title'; }]];
}
function wrap(t, x, y, w, size) { g.font = `600 ${size}px Karla`; let line = ''; for (const wd of t.split(' ')) { if (g.measureText(line + wd).width > w) { txt(line, x, y, size, '#f3e7cf', 'left', 'Karla', false); y += size + 4; line = ''; } line += wd + ' '; } txt(line, x, y, size, '#f3e7cf', 'left', 'Karla', false); return y + size; }
function drawSelect() {
  cover(img(ROOT + 'bg_forest.webp'), 1); g.fillStyle = 'rgba(10,6,4,.72)'; g.fillRect(0, 0, W, H);
  const who = G.selStep === 0 ? 'PLAYER 1' : G.mode === 'cpu' ? 'CPU OPPONENT' : 'PLAYER 2';
  txt('CHOOSE YOUR FIGHTER', W / 2, 18, Math.min(40, W * 0.07), '#e3b448', 'center'); txt(who, W / 2, 18 + Math.min(44, W * 0.08), 18, '#f3e7cf', 'center', 'Karla');
  const cols = portrait() ? 5 : 10, cs = Math.min(84, (W - 40) / cols - 8), gw = cols * (cs + 8), gx = W / 2 - gw / 2, gy = portrait() ? H - (cs + 8) * 2 - 30 : H - cs - 40;
  IDS.forEach((id, i) => {
    const x = gx + (i % cols) * (cs + 8), y = gy + Math.floor(i / cols) * (cs + 8), f = img(ROOT + 'face_' + id + '.webp');
    if (f.ok) g.drawImage(f.el, x, y, cs, cs);
    const on1 = G.sel[0] === i, on2 = G.selStep === 1 && G.sel[1] === i;
    g.lineWidth = 3; g.strokeStyle = on1 && G.selStep === 0 ? '#e3b448' : on2 ? '#7fd0ff' : on1 ? 'rgba(227,180,72,.6)' : 'rgba(255,255,255,.15)'; g.strokeRect(x, y, cs, cs);
    G.rects.push({ x, y, w: cs, h: cs, go: () => { if (G.sel[G.selStep] === i) confirmSel(); else { G.sel[G.selStep] = i; sfx('ui'); } } });
  });
  const s = Math.min(H * (portrait() ? 0.28 : 0.45), W * 0.3), fy = gy - 96;
  const draw = (k, x, face) => { const id = IDS[G.sel[k]], H0 = HEROES[id]; drawPose(id, 'idle_0', x, fy, face, s, 1); txt(H0.name.toUpperCase(), x, fy + 4, 28, k ? '#7fd0ff' : '#e3b448', 'center'); txt(H0.kr, x, fy + 36, 22, '#e3b448', 'center', 'Koradin', false); txt(H0.en + (id === 'gyakari' ? ' · can block' : '') + ' · ' + H0.kit[3], x, fy + 62, 13, '#f3e7cf', 'center', 'Karla', false); };
  draw(0, W * 0.27, 1); if (G.selStep === 1) draw(1, W * 0.73, -1);
  button(G.selStep === 0 ? 'SELECT' : 'FIGHT', W / 2 - 80, gy - 170, 160, 46, true, confirmSel);
  G.items = [['', '', confirmSel]];
}
function confirmSel() { sfx('ui'); if (G.selStep === 0) { G.selStep = 1; if (G.sel[1] === G.sel[0]) G.sel[1] = (G.sel[0] + 3) % IDS.length; } else newMatch(); }
function drawResult() {
  drawFight(); g.fillStyle = 'rgba(10,6,4,.65)'; g.fillRect(0, 0, W, H);
  const c = G.champ, i = G.f.indexOf(c), H0 = HEROES[c.id];
  drawPose(c.id, c.set.special[c.set.special.length - 1] || 'idle_0', W / 2, H * 0.7, i === 0 ? 1 : -1, Math.min(H * 0.45, W * 0.4), 1);
  txt((G.mode === 'cpu' ? (i === 0 ? 'YOU WIN' : 'YOU LOSE') : 'PLAYER ' + (i + 1) + ' WINS'), W / 2, H * 0.08, Math.min(72, W * 0.12), '#e3b448', 'center');
  txt(H0.name.toUpperCase() + ' · ' + H0.role, W / 2, H * 0.08 + Math.min(78, W * 0.13), 20, '#f3e7cf', 'center', 'Karla');
  const bw = Math.min(220, W * 0.42);
  const items = [['REMATCH', '', () => newMatch()], ['NEW FIGHTERS', '', () => { G.scene = 'select'; G.selStep = 0; }], ['TITLE', '', () => { G.scene = 'title'; }]];
  items.forEach(([l, s, go], k) => button(l, W / 2 - bw / 2, H * 0.74 + k * 54, bw, 46, G.menu === k, go)); G.items = items;
}
function drawPause() {
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H); txt('PAUSED', W / 2, H * 0.25, 56, '#e3b448', 'center');
  const items = [['RESUME', '', () => { G.scene = 'fight'; }], ['NEW FIGHTERS', '', () => { G.scene = 'select'; G.selStep = 0; }], ['TITLE', '', () => { G.scene = 'title'; }]];
  items.forEach(([l, s, go], k) => button(l, W / 2 - 110, H * 0.42 + k * 56, 220, 46, G.menu === k, go)); G.items = items;
}
function menuKey(code) {
  if (G.scene === 'fight') { if (code === 'Escape' || code === 'KeyP') { G.scene = 'pause'; G.menu = 0; } return; }
  if (G.scene === 'select') {
    const k = G.selStep, cols = portrait() ? 5 : 10, n = IDS.length;
    if (code === 'ArrowRight' || code === 'KeyD') G.sel[k] = (G.sel[k] + 1) % n;
    if (code === 'ArrowLeft' || code === 'KeyA') G.sel[k] = (G.sel[k] + n - 1) % n;
    if (code === 'ArrowDown' || code === 'KeyS') G.sel[k] = (G.sel[k] + cols) % n;
    if (code === 'ArrowUp' || code === 'KeyW') G.sel[k] = (G.sel[k] + n - cols) % n;
    if (code === 'Enter' || code === 'KeyJ' || code === 'Space') confirmSel();
    if (code === 'Escape') { if (G.selStep) G.selStep = 0; else G.scene = 'title'; }
    return;
  }
  const n = (G.items || []).length; if (!n) return;
  if (code === 'ArrowDown' || code === 'KeyS') G.menu = (G.menu + 1) % n;
  if (code === 'ArrowUp' || code === 'KeyW') G.menu = (G.menu + n - 1) % n;
  if (code === 'Enter' || code === 'KeyJ' || code === 'Space') { sfx('ui'); const it = G.items[G.menu]; G.menu = 0; it[2](); }
  if (code === 'Escape' && G.scene === 'pause') G.scene = 'fight';
}
function menuTap(e) { for (const r of G.rects) if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) { sfx('ui'); G.menu = 0; r.go(); break; } }

// ---------------------------------------------------------------- loop
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= 1 / 120) { update(1 / 120); acc -= 1 / 120; }
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingQuality = 'high'; g.fillStyle = '#0d0a0a'; g.fillRect(0, 0, W, H); G.rects = [];
  ({ title: drawTitle, select: drawSelect, help: drawHelp, fight: drawFight, result: drawResult, pause: () => { drawFight(); drawPause(); } })[G.scene]();
  renderCards();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.GF = { G, T, SETS, REACH, startMove, strike, playCard, dash, newMatch };
