// Gyeaman Fight: 1v1 versus fighter (Tekken style) with the Duels heroes' Firefly keyframe poses.
// Poses come from squads/kf.js: idle_0 stance, idle_1 hurt, idle_2 down/crouch, idle_3 run, *A_* light, *B_* heavy, *ult* special.
import { KF } from '../squads/kf.js';
import { HEROES } from '../squads/data.js';

const ROOT = '../assets/sq/', AV = '?v=f1';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const IDS = ['blay', 'owureku', 'gyakari', 'obiri', 'kuukua', 'kome', 'afrakoma', 'dufie', 'sekan', 'bayi'];
const BGS = ['bg_grove', 'bg_forest', 'bg_gate', 'bg_marsh'];
const RANGED = { obiri: 'fx_arrow', kuukua: 'fx_spear', kome: 'fx_fireball', bayi: 'fx_fireball' };
const IM = {};
const img = (src) => { if (!IM[src]) { const e = { el: new Image(), ok: false }; e.el.onload = () => { e.ok = true; }; e.el.src = src; IM[src] = e; } return IM[src]; };
const kfImg = (id, p) => img(ROOT + 'kf/' + KF[id].p[p][0] + AV);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- move sets built from each hero's poses
function poseSet(id) {
  const keys = Object.keys(KF[id].p);
  const pick = (re) => keys.filter((k) => re.test(k)).sort();
  const reach = (p) => { const D = KF[id].p[p]; return (D[1] - D[3]) / KF[id].ref; };
  let light = pick(/^[a-z]+A_\d$/), heavy = pick(/^[a-z]+B_\d$/), special = pick(/ult/);
  if (id === 'dufie') { light = pick(/^basic_/); heavy = pick(/^kick_/); special = [...pick(/^ultE_[1-3]/), ...pick(/^ultF_[1-3]/)]; }
  const strip0 = (a) => (a.length > 3 ? a.filter((k) => !k.endsWith('_0')) : a);
  light = strip0(light); heavy = strip0(heavy); special = id === 'dufie' ? special : strip0(special);
  const act = (a) => a.reduce((bi, k, i) => (reach(k) > reach(a[bi]) ? i : bi), Math.min(1, a.length - 1));
  return {
    stance: 'idle_0', hurt: 'idle_1', down: 'idle_2', run: 'idle_3', guard: id === 'blay' ? 'parry_1' : 'idle_0',
    light, heavy, special, act: { L: act(light), H: act(heavy), S: act(special) }, reach: { L: reach(light[act(light)]), H: reach(heavy[act(heavy)]), S: reach(special[act(special)]) },
  };
}
const SETS = Object.fromEntries(IDS.map((id) => [id, poseSet(id)]));
for (const id of IDS) for (const p in KF[id].p) kfImg(id, p);
for (const id of IDS) img(ROOT + 'face_' + id + '.webp');
for (const b of BGS) img(ROOT + b + '.webp');
for (const f of new Set(Object.values(RANGED))) img(ROOT + 'kf/' + f + '.webp' + AV);

// ---------------------------------------------------------------- tuning (units: 1 = one body height, seconds)
const T = {
  grav: 9.5, jumpV: 4.1, walk: 1.25, back: 0.95, dash: 3.6, push: 0.27, stageHalf: 5.2, hurtW: 0.3, roundTime: 60, maxHp: 1000,
  L: { dmg: 42, startup: 0.07, active: 0.08, recover: 0.13, stun: 0.3, push: 0.25, meter: 6 },
  H: { dmg: 78, startup: 0.15, active: 0.09, recover: 0.24, stun: 0.42, push: 0.55, meter: 9 },
  D: { dmg: 58, startup: 0.13, active: 0.09, recover: 0.3, stun: 0, push: 0.3, meter: 8, low: true, knock: true },
  S: { dmg: 175, startup: 0.2, active: 0.36, recover: 0.3, stun: 0.6, push: 1.1, meter: 0, cost: 50, knock: true },
};

// ---------------------------------------------------------------- input
const keys = new Set();
const P1K = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', L: 'KeyJ', H: 'KeyK', S: 'KeyL', B: 'KeyU' };
const P2K = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', L: 'Numpad1', H: 'Numpad2', S: 'Numpad3', B: 'Numpad0' };
const P2ALT = { L: 'Comma', H: 'Period', S: 'Slash', B: 'ShiftRight' };
addEventListener('keydown', (e) => { keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); menuKey(e.code); });
addEventListener('keyup', (e) => keys.delete(e.code));
const touch = { x: 0, y: 0, L: false, H: false, S: false, B: false, on: false };
function readPad(map, alt) {
  const k = (n) => keys.has(map[n]) || (alt && keys.has(alt[n]));
  return { x: (k('right') ? 1 : 0) - (k('left') ? 1 : 0), y: (k('down') ? 1 : 0) - (k('up') ? 1 : 0), L: k('L'), H: k('H'), S: k('S'), B: k('B') };
}
function readP1() {
  const p = readPad(P1K);
  if (touch.on) { p.x = p.x || touch.x; p.y = p.y || touch.y; p.L ||= touch.L; p.H ||= touch.H; p.S ||= touch.S; p.B ||= touch.B; }
  return p;
}
// floating stick: centre follows the thumb, generous dead zone
(() => {
  const st = document.getElementById('stick'), knob = st.querySelector('.knob'); let id = null, cx = 0, cy = 0;
  const mv = (e) => {
    const r = st.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy);
    if (m > R) { cx += dx * (1 - R / m); cy += dy * (1 - R / m); dx = e.clientX - cx; dy = e.clientY - cy; }
    knob.style.transform = `translate(${dx * 0.5}px,${dy * 0.5}px)`;
    touch.x = dx > R * 0.3 ? 1 : dx < -R * 0.3 ? -1 : 0; touch.y = dy > R * 0.45 ? 1 : dy < -R * 0.45 ? -1 : 0;
  };
  st.addEventListener('pointerdown', (e) => { id = e.pointerId; try { st.setPointerCapture(id); } catch (_) {} cx = e.clientX; cy = e.clientY; mv(e); });
  st.addEventListener('pointermove', (e) => { if (e.pointerId === id) mv(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; touch.x = touch.y = 0; knob.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  for (const b of document.querySelectorAll('.btns b')) {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); touch[k] = true; b.classList.add('on'); });
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(t, () => { touch[k] = false; b.classList.remove('on'); });
  }
  addEventListener('touchstart', () => { touch.on = true; document.body.classList.add('touch'); }, { once: true, passive: true });
})();

// ---------------------------------------------------------------- fighter
class Fighter {
  constructor(id, side, cpu, level) {
    const H = HEROES[id];
    Object.assign(this, { id, side, cpu, level, set: SETS[id], x: side * 1.6, y: 0, vx: 0, vy: 0, face: -side, hp: T.maxHp, show: T.maxHp, meter: 0,
      st: 'idle', t: 0, mv: null, hit: false, stun: 0, combo: 0, ghosts: [], prev: {}, tapT: { x: 0, d: 0 }, ai: { t: 0, plan: null }, wins: 0 });
    this.size = clamp(H.size, 0.94, 1.12);
    this.atkM = 0.85 + 0.3 * clamp((Math.max(H.atk, H.mag) - 40) / 42, 0, 1);
    this.defM = 1.1 - 0.2 * clamp((H.def - 16) / 16, 0, 1);
    this.spdM = 0.9 + 0.2 * clamp((H.spd - 84) / 40, 0, 1);
  }
  get air() { return this.y > 0.001; }
  pose() {
    const s = this.set;
    switch (this.st) {
      case 'atk': { const m = this.mv, fr = s[m.set], i = Math.min(fr.length - 1, Math.floor(this.t / m.total * fr.length * 0.999)); return fr[Math.max(0, i)]; }
      case 'hit': return s.hurt;
      case 'down': case 'ko': return s.down;
      case 'crouch': return s.down;
      case 'dash': case 'jump': return s.run;
      case 'block': return this.lowBlock ? s.down : s.guard;
      default: return s.stance;
    }
  }
}

function startMove(f, key) {
  const def = key === 'D' ? T.D : T[key], set = key === 'D' ? 'heavy' : key === 'L' ? 'light' : key === 'H' ? 'heavy' : 'special';
  if (key === 'S') { if (f.meter < T.S.cost) return false; f.meter -= T.S.cost; fx.flash = 0.25; fx.slow = 0.18; announce(HEROES[f.id].kit[3], 0.9, f); }
  const total = def.startup + def.active + def.recover;
  f.mv = { key, def, set, total, hitDone: 0, hits: key === 'S' && !RANGED[f.id] ? 3 : 1, fired: false };
  f.st = 'atk'; f.t = 0; if (!f.air) f.vx = 0;
  return true;
}

// ---------------------------------------------------------------- game state
const G = { scene: 'title', mode: 'cpu', diff: 1, sel: [0, 3], selStep: 0, f: [], round: 1, time: T.roundTime, bg: 'bg_grove', ann: null, over: null, cam: { x: 0, span: 5 }, hitstop: 0, shake: 0, sparks: [], shots: [], menu: 0, rects: [] };
const fx = { flash: 0, slow: 0 };
function announce(text, dur = 1.1, by = null) { G.ann = { text, t: 0, dur, by }; }

function newMatch() {
  const [a, b] = G.sel.map((i) => IDS[i]);
  G.f = [new Fighter(a, -1, false), new Fighter(b, 1, G.mode === 'cpu', G.diff)];
  G.round = 1; G.bg = BGS[Math.floor(Math.random() * BGS.length)]; newRound();
}
function newRound() {
  for (const f of G.f) Object.assign(f, { x: f.side * 1.6, y: 0, vx: 0, vy: 0, face: -f.side, hp: T.maxHp, show: T.maxHp, st: 'idle', t: 0, mv: null, stun: 0, combo: 0, ghosts: [] });
  G.time = T.roundTime; G.sparks = []; G.shots = []; G.over = null; G.scene = 'fight'; G.intro = 1.6;
  announce('ROUND ' + G.round, 0.9); setTimeout(() => { if (G.scene === 'fight') announce('FIGHT', 0.6); }, 900);
}

// ---------------------------------------------------------------- simulation
function hurtbox(f) { const w = 0.3; return { x0: f.x - w, x1: f.x + w, y0: f.y, y1: f.y + (f.st === 'crouch' || (f.st === 'block' && f.lowBlock) ? 0.62 : 0.95) }; }
function hitbox(f) {
  const m = f.mv, k = m.key, reach = f.set.reach[k === 'D' ? 'H' : k] * 0.92 * f.size;
  const x0 = f.x + f.face * 0.1, x1 = f.x + f.face * Math.max(0.45, reach);
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: f.y + (k === 'D' ? 0 : 0.25), y1: f.y + (k === 'D' ? 0.35 : 0.95) };
}
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function control(f, foe, inp, dt) {
  const fwd = f.face, xin = inp.x, toward = xin === fwd, away = xin === -fwd;
  const pv = f.prev; const press = (k) => inp[k] && !pv[k]; f.prev = { ...inp };
  if (f.st === 'hit' || f.st === 'down' || f.st === 'ko' || f.st === 'atk') return;
  // double tap forward: dash
  if (xin !== 0 && f.lastX === 0) { const now = performance.now(); if (f.tapT.d === xin && now - f.tapT.x < 260 && toward) { f.st = 'dash'; f.t = 0; } f.tapT = { x: now, d: xin }; }
  f.lastX = xin;
  if (f.air) { if (press('L')) startMove(f, 'L'); else if (press('H')) startMove(f, 'H'); return; }
  if (press('S') && startMove(f, 'S')) return;
  if (press('H')) { startMove(f, inp.y > 0 ? 'D' : 'H'); return; }
  if (press('L')) { startMove(f, 'L'); return; }
  const guarding = inp.B || (away && foe.st === 'atk');
  if (inp.y < 0) { f.vy = T.jumpV; f.vx = xin * T.walk * 1.1 * f.spdM; f.st = 'jump'; f.y = 0.002; return; }
  if (guarding) { f.st = 'block'; f.lowBlock = inp.y > 0; f.vx = 0; return; }
  if (inp.y > 0) { f.st = 'crouch'; f.vx = 0; return; }
  if (f.st === 'dash') { if (!toward || f.t > 0.45) f.st = 'idle'; else { f.vx = fwd * T.dash * f.spdM; return; } }
  f.vx = toward ? T.walk * fwd * f.spdM : away ? -T.back * fwd * f.spdM : 0;
  f.st = f.vx ? 'walk' : 'idle';
}

function aiInput(f, foe, dt) {
  const A = f.ai, lv = f.level; A.t -= dt;
  const d = Math.abs(foe.x - f.x), fwd = Math.sign(foe.x - f.x), reachL = f.set.reach.L * f.size, reachH = f.set.reach.H * f.size;
  const react = [0.35, 0.6, 0.85][lv];
  const inp = { x: 0, y: 0, L: false, H: false, S: false, B: false };
  // block incoming attacks
  if (foe.st === 'atk' && d < foe.set.reach[foe.mv.key === 'D' ? 'H' : foe.mv.key] * 1.15 + 0.2 && foe.t < foe.mv.def.startup + 0.05) {
    if (A.blockRoll === undefined) A.blockRoll = Math.random() < react;
    if (A.blockRoll) { inp.B = true; inp.y = foe.mv.key === 'D' ? 1 : 0; return inp; }
  } else A.blockRoll = undefined;
  if (A.t > 0) return { ...inp, ...(A.plan || {}), L: false, H: false, S: false };
  A.t = rnd(0.12, 0.32) * (1.4 - lv * 0.3); A.plan = null;
  if (RANGED[f.id] && f.meter >= T.S.cost && d > 1.6 && Math.random() < 0.5) return { ...inp, S: true };
  if (d > reachH + 0.32) { A.plan = { x: fwd }; if (Math.random() < 0.15) A.plan = { x: fwd, y: -1 }; else if (d > 2.6 && Math.random() < 0.4) { inp.x = fwd; f.st === 'idle' && (f.st = 'dash'); } return { ...inp, ...A.plan }; }
  const r = Math.random();
  if (f.meter >= T.S.cost && r < 0.25 + 0.1 * lv) return { ...inp, S: true };
  if (d <= reachL + 0.3 && r < 0.5) return { ...inp, L: true };
  if (r < 0.72) return { ...inp, H: true, y: Math.random() < 0.3 ? 1 : 0 };
  if (r < 0.85) { A.plan = { x: -fwd }; return { ...inp, x: -fwd }; }
  A.plan = { B: true }; return { ...inp, B: true };
}

function applyHit(att, def, mvdef, key, mult = 1) {
  const blocked = def.st === 'block' && (!mvdef.low || def.lowBlock) && !def.air;
  const scale = Math.max(0.35, 1 - 0.12 * att.combo);
  let dmg = mvdef.dmg * att.atkM * def.defM * mult;
  if (blocked) {
    dmg *= 0.12; def.vx = att.face * mvdef.push * 1.8; att.vx = -att.face * 0.6; def.t = 0;
    def.meter = Math.min(100, def.meter + 4); spark(def, att.face, '#9fd3ff', 6); sfx('block');
  } else {
    dmg *= scale; att.combo++; att.meter = Math.min(100, att.meter + mvdef.meter); def.meter = Math.min(100, def.meter + mvdef.meter * 0.6);
    const launch = def.air || mvdef.knock || (key === 'H' && def.st === 'hit');
    def.st = launch ? 'down' : 'hit'; def.mv = null; def.t = 0;
    def.stun = mvdef.stun || 0.5; def.vx = att.face * mvdef.push * 2.2;
    if (launch) { def.vy = key === 'D' ? 1.2 : 3.2; def.y = Math.max(def.y, 0.01); }
    spark(def, att.face, key === 'S' ? '#ffd76a' : '#ffffff', key === 'L' ? 9 : 16);
    G.hitstop = key === 'L' ? 0.05 : key === 'S' ? 0.12 : 0.09; G.shake = key === 'L' ? 0.05 : 0.14;
    sfx(key === 'L' ? 'light' : 'heavy');
  }
  def.hp = Math.max(0, def.hp - dmg);
}

function spark(f, dir, col, n) {
  const x = f.x - dir * 0.05, y = f.y + 0.6;
  for (let i = 0; i < n; i++) { const a = rnd(-1.2, 1.2) + (dir > 0 ? 0 : Math.PI); G.sparks.push({ x, y, vx: Math.cos(a) * rnd(2, 5), vy: Math.sin(a) * rnd(1, 4), t: 0, life: rnd(0.15, 0.3), col }); }
  G.sparks.push({ ring: true, x, y, t: 0, life: 0.22, col });
}

function stepFighter(f, foe, dt) {
  f.t += dt;
  if (f.st === 'atk') {
    const m = f.mv, d = m.def, tt = f.t;
    if (m.key === 'S' && !RANGED[f.id] && tt > d.startup && tt < d.startup + d.active) f.vx = f.face * 2.6;
    else if (!f.air) f.vx *= 0.8;
    if (tt >= d.startup && tt < d.startup + d.active) {
      if (m.key === 'S' && RANGED[f.id]) {
        if (!m.fired) { m.fired = true; G.shots.push({ owner: f, x: f.x + f.face * 0.5, y: f.y + 0.62, vx: f.face * 5, im: RANGED[f.id], t: 0, tint: f.id === 'bayi' }); sfx('shot'); }
      } else {
        const slot = Math.floor((tt - d.startup) / d.active * m.hits);
        if (slot >= m.hitDone && overlap(hitbox(f), hurtbox(foe)) && foe.st !== 'ko') { m.hitDone = slot + 1; applyHit(f, foe, d, m.key, m.hits > 1 ? 0.5 : 1); }
      }
      if (m.key === 'S' || m.key === 'H') f.ghosts.push({ x: f.x, y: f.y, p: f.pose(), a: 0.4 });
    }
    if (tt >= m.total) { f.st = f.air ? 'jump' : 'idle'; f.mv = null; }
  }
  if (f.st === 'hit') { f.vx *= 0.86; if (f.t > f.stun) { f.st = 'idle'; foe.combo = 0; } }
  if (f.st === 'down') { if (!f.air && f.t > 0.75) { f.st = f.hp <= 0 ? 'ko' : 'idle'; foe.combo = 0; } if (!f.air) f.vx *= 0.8; }
  if (f.st === 'block') { f.vx *= 0.85; }
  // physics
  if (f.air || f.vy > 0) { f.vy -= T.grav * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; if (f.st === 'jump' || (f.st === 'atk' && f.mv?.key !== 'S')) { f.st = 'idle'; f.mv = null; } if (f.st === 'down') { G.shake = 0.08; dust(f); } } }
  f.x += f.vx * dt;
  f.x = clamp(f.x, -T.stageHalf, T.stageHalf);
  f.show += (f.hp - f.show) * Math.min(1, dt * (f.show > f.hp ? 2.5 : 10));
  f.ghosts = f.ghosts.filter((g2) => (g2.a -= dt * 1.6) > 0).slice(-6);
  if (f.st !== 'atk' && f.st !== 'hit' && f.st !== 'down' && f.st !== 'ko' && !f.air) f.face = Math.sign(foe.x - f.x) || f.face;
}
function dust(f) { for (let i = 0; i < 8; i++) G.sparks.push({ x: f.x + rnd(-0.3, 0.3), y: 0.02, vx: rnd(-1, 1), vy: rnd(0.3, 1), t: 0, life: 0.4, col: 'rgba(210,190,160,.8)', dust: true }); }

function update(dt) {
  if (G.scene !== 'fight') return;
  if (G.ann) { G.ann.t += dt; if (G.ann.t > G.ann.dur) G.ann = null; }
  fx.flash = Math.max(0, fx.flash - dt); G.shake = Math.max(0, G.shake - dt);
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  if (fx.slow > 0) { fx.slow -= dt; dt *= 0.35; }
  if (G.over) { dt *= G.over.t < 1 ? 0.3 : 1; G.over.t += dt; }
  const [a, b] = G.f;
  if (G.intro > 0) G.intro -= dt;
  else if (!G.over) {
    G.time = Math.max(0, G.time - dt);
    control(a, b, a.cpu ? aiInput(a, b, dt) : readP1(), dt);
    control(b, a, b.cpu ? aiInput(b, a, dt) : readPad(P2K, P2ALT), dt);
  }
  stepFighter(a, b, dt); stepFighter(b, a, dt);
  // push apart
  const dx = b.x - a.x, minD = T.push * 2 * ((a.size + b.size) / 2);
  if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 0.8) { const o = (minD - Math.abs(dx)) / 2 * (Math.sign(dx) || 1); a.x -= o; b.x += o; }
  // projectiles
  for (const s of G.shots) {
    s.t += dt; s.x += s.vx * dt; const foe = s.owner === a ? b : a;
    if (!s.dead && overlap({ x0: s.x - 0.2, x1: s.x + 0.2, y0: s.y - 0.1, y1: s.y + 0.1 }, hurtbox(foe))) { s.dead = true; applyHit(s.owner, foe, T.S, 'S', 0.9); }
    if (Math.abs(s.x) > T.stageHalf + 2) s.dead = true;
  }
  G.shots = G.shots.filter((s) => !s.dead);
  for (const p of G.sparks) { p.t += dt; if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= (p.dust ? 1 : 8) * dt; } }
  G.sparks = G.sparks.filter((p) => p.t < p.life);
  // round end
  if (!G.over && (a.hp <= 0 || b.hp <= 0 || G.time <= 0)) {
    const w = a.hp === b.hp ? null : a.hp > b.hp ? a : b; G.over = { t: 0, w };
    for (const f of G.f) if (f.hp <= 0) { f.st = 'down'; f.t = 0; f.vy = 2.4; f.y = 0.01; }
    if (w) w.wins++;
    announce(G.time <= 0 ? 'TIME' : w && w.hp >= T.maxHp ? 'PERFECT' : 'K.O.', 1.6); sfx('ko');
  }
  if (G.over && G.over.t > 3) {
    const champ = G.f.find((f) => f.wins >= 2);
    if (champ) { G.scene = 'result'; G.champ = champ; G.menu = 0; }
    else { G.round++; newRound(); }
  }
  // camera
  const mid = (a.x + b.x) / 2, span = portrait() ? clamp(Math.abs(b.x - a.x) + 1.9, 2.5, 6) : clamp(Math.abs(b.x - a.x) + 2.8, 3.8, 7.5);
  G.cam.x += (mid - G.cam.x) * Math.min(1, dt * 6); G.cam.span += (span - G.cam.span) * Math.min(1, dt * 4);
}

// ---------------------------------------------------------------- audio (tiny synth)
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
  const floor = portrait() ? H * 0.56 : H * 0.86, s = Math.min(W / G.cam.span, H * (portrait() ? 0.26 : 0.42));
  return { floor, s, sx: (x) => W / 2 + (x - G.cam.x) * s, sy: (y) => floor - y * s };
}
function cover(im, alpha = 1) {
  if (!im.ok) return; const e = im.el, r = Math.max(W / e.width, H / e.height) * 1.08, w = e.width * r, h = e.height * r;
  const px = clamp(-G.cam.x * 6, -(w - W) / 2, (w - W) / 2);
  g.globalAlpha = alpha; g.drawImage(e, (W - w) / 2 + px, (H - h) / (portrait() ? 3 : 2), w, h); g.globalAlpha = 1;
}
function drawPose(id, p, x, y, face, s, size, alpha = 1, white = false) {
  const D = KF[id].p[p]; if (!D) return; const im = kfImg(id, p); if (!im.ok) return;
  const k = s * size / KF[id].ref;
  g.save(); g.translate(x, y); g.scale(face, 1); if (alpha < 1) g.globalAlpha = alpha;
  if (white) g.filter = 'brightness(3) saturate(0)';
  g.drawImage(im.el, -D[3] * k, -D[4] * k, D[1] * k, D[2] * k); g.restore();
}
function drawFight() {
  const V = view();
  const sh = G.shake > 0 ? rnd(-1, 1) * 6 * G.shake / 0.14 : 0;
  g.save(); g.translate(sh, sh * 0.5);
  cover(img(ROOT + G.bg + '.webp'));
  const gr = g.createLinearGradient(0, V.floor - 40, 0, H); gr.addColorStop(0, 'rgba(10,6,4,0)'); gr.addColorStop(1, 'rgba(10,6,4,.75)'); g.fillStyle = gr; g.fillRect(0, V.floor - 40, W, H);
  g.fillStyle = 'rgba(227,180,72,.25)'; g.fillRect(0, V.floor, W, 2);
  // shadows, ghosts, fighters
  for (const f of G.f) { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(V.sx(f.x), V.floor + 2, V.s * 0.32 * f.size / (1 + f.y), V.s * 0.05, 0, 0, 7); g.fill(); }
  const order = [...G.f].sort((a, b) => (a.st === 'atk') - (b.st === 'atk'));
  for (const f of order) {
    for (const gh of f.ghosts) drawPose(f.id, gh.p, V.sx(gh.x), V.sy(gh.y), f.face, V.s, f.size, gh.a * 0.6);
    if (f.st === 'dash' || (f.st === 'atk' && f.mv.key === 'S')) speedLines(V, f);
    drawPose(f.id, f.pose(), V.sx(f.x), V.sy(f.y), f.face, V.s, f.size, 1, f.st === 'hit' && f.t < 0.06);
    if (f.st === 'block') { g.strokeStyle = 'rgba(159,211,255,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(V.sx(f.x + f.face * 0.25), V.sy(f.y + (f.lowBlock ? 0.3 : 0.55)), V.s * 0.32, -1.1, 1.1); if (f.face < 0) { g.beginPath(); g.arc(V.sx(f.x + f.face * 0.25), V.sy(f.y + (f.lowBlock ? 0.3 : 0.55)), V.s * 0.32, Math.PI - 1.1, Math.PI + 1.1); } g.stroke(); }
  }
  for (const s of G.shots) {
    const im = img(ROOT + 'kf/' + s.im + '.webp' + AV); if (!im.ok) continue; const h = V.s * 0.3, w = im.el.width / im.el.height * h;
    g.save(); g.translate(V.sx(s.x), V.sy(s.y)); g.scale(Math.sign(s.vx), 1); if (s.tint) g.filter = 'hue-rotate(220deg)'; g.drawImage(im.el, -w / 2, -h / 2, w, h); g.restore();
  }
  for (const p of G.sparks) {
    const a = 1 - p.t / p.life; g.globalAlpha = a;
    if (p.ring) { g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(V.sx(p.x), V.sy(p.y), V.s * (0.1 + p.t * 1.6), 0, 7); g.stroke(); }
    else { g.strokeStyle = p.col; g.lineWidth = p.dust ? 5 : 2.5; g.beginPath(); g.moveTo(V.sx(p.x), V.sy(p.y)); g.lineTo(V.sx(p.x - p.vx * 0.03), V.sy(p.y - p.vy * 0.03)); g.stroke(); }
    g.globalAlpha = 1;
  }
  g.restore();
  if (fx.flash > 0) { g.fillStyle = `rgba(255,230,160,${fx.flash * 1.2})`; g.fillRect(0, 0, W, H); }
  hud(V);
}
function speedLines(V, f) {
  g.strokeStyle = 'rgba(255,240,200,.45)'; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const y = V.sy(f.y + 0.15 + Math.random() * 0.8), x = V.sx(f.x) - f.face * V.s * rnd(0.3, 0.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x - f.face * V.s * rnd(0.4, 0.9), y); g.stroke(); }
}
function txt(t, x, y, size, col = '#f3e7cf', align = 'left', font = 'Anton', stroke = true) {
  g.font = `${size}px ${font}`; g.textAlign = align; g.textBaseline = 'top';
  if (stroke) { g.lineWidth = Math.max(2, size / 8); g.strokeStyle = '#0d0a0a'; g.strokeText(t, x, y); }
  g.fillStyle = col; g.fillText(t, x, y);
}
function hud() {
  const pad = 12, bw = Math.min(W * 0.36, 420), bh = 16, top = 14 + (portrait() ? 20 : 0);
  G.f.forEach((f, i) => {
    const L = i === 0, x = L ? pad + 58 : W - pad - 58 - bw, H0 = HEROES[f.id];
    const face = img(ROOT + 'face_' + f.id + '.webp');
    const fxp = L ? pad : W - pad - 50;
    g.fillStyle = '#0d0a0a'; g.fillRect(fxp - 2, top - 2, 54, 54);
    if (face.ok) { g.save(); if (!L) { g.translate(fxp + 50, 0); g.scale(-1, 1); g.drawImage(face.el, 0, top, 50, 50); } else g.drawImage(face.el, fxp, top, 50, 50); g.restore(); }
    g.strokeStyle = '#e3b448'; g.lineWidth = 2; g.strokeRect(fxp - 1, top - 1, 52, 52);
    // health: red chip trail then gold bar, filling from the outside in
    g.fillStyle = '#1a0d07'; g.fillRect(x, top, bw, bh);
    const fw = (v) => bw * v / T.maxHp, dx = (v) => (L ? x + bw - fw(v) : x);
    g.fillStyle = '#c8322a'; g.fillRect(dx(f.show), top, fw(f.show), bh);
    const hg = g.createLinearGradient(0, top, 0, top + bh); hg.addColorStop(0, '#ffe08a'); hg.addColorStop(1, '#c9971a');
    g.fillStyle = f.hp < 300 ? '#ff7a4a' : hg; g.fillRect(dx(f.hp), top, fw(f.hp), bh);
    g.strokeStyle = '#e3b448'; g.strokeRect(x - 1, top - 1, bw + 2, bh + 2);
    txt(H0.name.toUpperCase(), L ? x : x + bw, top + bh + 4, 18, '#f3e7cf', L ? 'left' : 'right');
    txt(H0.kr, L ? x + 4 + g.measureText(H0.name.toUpperCase()).width + 10 : x + bw - g.measureText(H0.name.toUpperCase()).width - 14, top + bh + 6, 18, '#e3b448', L ? 'left' : 'right', 'Koradin', false);
    for (let k = 0; k < 2; k++) { g.fillStyle = k < f.wins ? '#e3b448' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(L ? x + bw - 10 - k * 16 : x + 10 + k * 16, top + bh + 14, 5, 0, 7); g.fill(); }
    // sunsum meter
    const my = portrait() ? H * 0.56 + 18 : H - 26, mw = Math.min(W * 0.3, 260), mx = L ? pad : W - pad - mw;
    g.fillStyle = '#1a0d07'; g.fillRect(mx, my, mw, 9);
    g.fillStyle = f.meter >= T.S.cost ? (Math.floor(performance.now() / 150) % 2 ? '#7fd0ff' : '#c58bff') : '#4a7fb0';
    g.fillRect(L ? mx : mx + mw - mw * f.meter / 100, my, mw * f.meter / 100, 9);
    g.fillStyle = '#0d0a0a'; g.fillRect(mx + mw / 2 - 1, my, 2, 9);
    g.strokeStyle = '#8a5a16'; g.strokeRect(mx - 1, my - 1, mw + 2, 11);
    txt('SUNSUM', L ? mx : mx + mw, my - 15, 12, '#9fd3ff', L ? 'left' : 'right', 'Karla');
    if (f.combo > 1 && (G.f[1 - i].st === 'hit' || G.f[1 - i].st === 'down')) txt(f.combo + ' HITS', L ? pad : W - pad, top + 80, 30, '#ffe08a', L ? 'left' : 'right');
  });
  txt(String(Math.ceil(G.time)).padStart(2, '0'), W / 2, top - 2, 40, G.time < 10 ? '#ff7a4a' : '#f3e7cf', 'center');
  if (G.ann) {
    const a = G.ann, p = a.t / a.dur, sc = 1 + Math.max(0, 0.25 - p) * 2;
    g.save(); g.globalAlpha = Math.min(1, (1 - p) * 4); g.translate(W / 2, H * (portrait() ? 0.3 : 0.38)); g.scale(sc, sc);
    txt(a.text, 0, 0, a.by ? 34 : 72, a.by ? '#ffe08a' : '#e3b448', 'center'); g.restore();
  }
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
  const n = IDS.length, show = [IDS[(Math.floor(performance.now() / 2500)) % n], IDS[(Math.floor(performance.now() / 2500) + 5) % n]];
  const s = Math.min(H * 0.42, W * 0.32), fy = H * 0.68;
  drawPose(show[0], 'idle_0', W * 0.24, fy, 1, s, 1); drawPose(show[1], 'idle_0', W * 0.76, fy, -1, s, 1);
  txt('GYEAMAN', W / 2, H * 0.1, Math.min(96, W * 0.14), '#e3b448', 'center');
  txt('FIGHT', W / 2, H * 0.1 + Math.min(96, W * 0.14) + 2, Math.min(48, W * 0.08), '#f3e7cf', 'center');
  const bw = Math.min(280, W * 0.7), bx = W / 2 - bw / 2; let y = H * 0.44;
  const items = [['VS CPU', 'One player', () => { G.mode = 'cpu'; G.scene = 'select'; G.selStep = 0; }], ['2 PLAYERS', 'Same keyboard', () => { G.mode = 'pvp'; G.scene = 'select'; G.selStep = 0; }],
    [['EASY', 'NORMAL', 'HARD'][G.diff], 'CPU difficulty', () => { G.diff = (G.diff + 1) % 3; }], ['HOW TO PLAY', 'Controls', () => { G.scene = 'help'; }]];
  items.forEach(([l, sub, go], i) => { button(l, bx, y, bw, 52, G.menu === i, go, sub); y += 60; });
  G.items = items;
}
function drawHelp() {
  g.fillStyle = '#0d0a0a'; g.fillRect(0, 0, W, H);
  const L = [['P1 (keyboard)', 'A D move, W jump, S crouch, J light, K heavy, L special, U guard'], ['P2 (keyboard)', 'Arrows move, Numpad 1 2 3 attacks, 0 guard (or , . / and Right Shift)'],
    ['Touch', 'Stick on the left (it follows your thumb), buttons on the right'],
    ['Guard', 'Hold back or Guard. Crouch-guard (down + back) stops low sweeps'], ['Dash', 'Tap forward twice'],
    ['Combos', 'Light into Heavy launches. Heavy hits a juggled foe again'], ['Low sweep', 'Down + Heavy, knocks down'],
    ['Special', 'Costs half the Sunsum gauge. Marksmen and priests shoot, fighters rush with 3 hits'], ['Rounds', 'First to 2 rounds, 60 seconds each']];
  let y = 40; txt('HOW TO PLAY', W / 2, y, 40, '#e3b448', 'center'); y += 64;
  for (const [a, b] of L) { txt(a, Math.max(20, W / 2 - 300), y, 18, '#ffe08a', 'left', 'Karla', false); wrap(b, Math.max(20, W / 2 - 300) + (W > 640 ? 170 : 0), y + (W > 640 ? 0 : 22), Math.min(W - 40, 430), 16); y += W > 640 ? 34 : 64; }
  button('BACK', W / 2 - 90, Math.min(H - 70, y + 10), 180, 48, true, () => { G.scene = 'title'; });
  G.items = [['BACK', '', () => { G.scene = 'title'; }]];
}
function wrap(t, x, y, w, size) { g.font = `600 ${size}px Karla`; const words = t.split(' '); let line = ''; for (const wd of words) { if (g.measureText(line + wd).width > w) { txt(line, x, y, size, '#f3e7cf', 'left', 'Karla', false); y += size + 4; line = ''; } line += wd + ' '; } txt(line, x, y, size, '#f3e7cf', 'left', 'Karla', false); }
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
  // big previews
  const s = Math.min(H * (portrait() ? 0.28 : 0.45), W * 0.3), fy = gy - 96;
  const draw = (k, x, face) => { const id = IDS[G.sel[k]], H0 = HEROES[id]; drawPose(id, 'idle_0', x, fy, face, s, 1); txt(H0.name.toUpperCase(), x, fy + 4, 28, k ? '#7fd0ff' : '#e3b448', 'center'); txt(H0.kr, x, fy + 36, 22, '#e3b448', 'center', 'Koradin', false); txt(H0.en + ' · ' + H0.kit[3], x, fy + 62, 13, '#f3e7cf', 'center', 'Karla', false); };
  draw(0, W * 0.27, 1); if (G.selStep === 1) draw(1, W * 0.73, -1);
  button(G.selStep === 0 ? "SELECT" : "FIGHT", W / 2 - 80, gy - 170, 160, 46, true, confirmSel);
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
  items.forEach(([l, s, go], k) => button(l, W / 2 - bw / 2, H * 0.74 + k * 54, bw, 46, G.menu === k, go));
  G.items = items;
}
function drawPause() {
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H); txt('PAUSED', W / 2, H * 0.25, 56, '#e3b448', 'center');
  const items = [['RESUME', '', () => { G.scene = 'fight'; }], ['NEW FIGHTERS', '', () => { G.scene = 'select'; G.selStep = 0; }], ['TITLE', '', () => { G.scene = 'title'; }]];
  items.forEach(([l, s, go], k) => button(l, W / 2 - 110, H * 0.42 + k * 56, 220, 46, G.menu === k, go)); G.items = items;
}
function menuKey(code) {
  if (G.scene === 'fight') { if (code === 'Escape' || code === 'KeyP') { G.scene = 'pause'; G.menu = 0; } return; }
  if (G.scene === 'select') {
    const k = G.selStep; const cols = portrait() ? 5 : 10;
    if (code === 'ArrowRight' || code === 'KeyD') G.sel[k] = (G.sel[k] + 1) % IDS.length;
    if (code === 'ArrowLeft' || code === 'KeyA') G.sel[k] = (G.sel[k] + IDS.length - 1) % IDS.length;
    if (code === 'ArrowDown' || code === 'KeyS') G.sel[k] = (G.sel[k] + cols) % IDS.length;
    if (code === 'ArrowUp' || code === 'KeyW') G.sel[k] = (G.sel[k] + IDS.length - cols) % IDS.length;
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
cv.addEventListener('pointerdown', (e) => {
  if (G.scene === 'fight') { if (e.clientX > W / 2 - 40 && e.clientX < W / 2 + 40 && e.clientY < 70) { G.scene = 'pause'; G.menu = 0; } return; }
  for (const r of G.rects) if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) { sfx('ui'); G.menu = 0; r.go(); break; }
});

// ---------------------------------------------------------------- loop (fixed step)
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= 1 / 120) { update(1 / 120); acc -= 1 / 120; }
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingQuality = 'high'; g.fillStyle = '#0d0a0a'; g.fillRect(0, 0, W, H); G.rects = [];
  ({ title: drawTitle, select: drawSelect, help: drawHelp, fight: drawFight, result: drawResult, pause: () => { drawFight(); drawPause(); } })[G.scene]();
  document.body.classList.toggle('touch', touch.on && (G.scene === 'fight'));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.GF = { G, T, SETS, startMove, newMatch };
