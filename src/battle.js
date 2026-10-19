// Monster Clearer battle. A world is one board that stays full: when a monster dies, the next one
// from the world's queue takes its cell, until the enemy count runs out (the boss comes last).
// Monsters start passive. Hitting them changes their aggression:
//   0 passive · 1 alert (grey hourglass, wakes in N rounds) · 2 ready (yellow, attacks next round) · 3 aggressive (red)
// Sword: free, enrages its target and wakes neighbours. Axe/spear: cost stamina, calm one step.
// Spells: cooldowns, magic damage, put everything they hit to alert.
// Touch: pick an action, then press on a monster; drag to aim (the pattern previews), release to strike.
// With no action picked, a tap inspects the monster.
import { MONSTERS, SPELLS, HEROES, WEAPON_ACTIONS } from './data.js';
import { maxStats, has, rnd, pick } from './state.js';
import { drawMonster, drawHero, heroImg } from './art.js';
import { ICON } from './icons.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROLE_COLOR = { buffer: '#4fa3ff', caster: '#c58bff', ranger: '#ffd23c', treasure: '#e3a72f' };
const AGG_COLOR = ['', '#9a9aa6', '#ffd23c', '#ff4a3c'];
const PAT = { single: 'single target', row3: 'row of 3', cross: 'cross', xcross: 'diagonal cross', box: '3×3', row: 'whole row', col: 'whole column', random4: '4 random' };
const ease = { out: (p) => 1 - (1 - p) ** 3, in: (p) => p * p, back: (p) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2 };
const now = () => performance.now();

export class Battle {
  constructor({ canvas, hud, top, player, world, onEnd, onInspect, onBoss, sfx }) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.hud = hud; this.top = top; this.p = player; this.world = world;
    this.onEnd = onEnd; this.onInspect = onInspect || (() => {}); this.onBoss = onBoss || (() => {}); this.sfx = sfx || (() => {});
    this.C = world.cols; this.R = world.rows;
    this.st = maxStats(player);
    this.heroDef = HEROES.find((h) => h.id === player.hero);
    this.hero = { hp: Math.min(player.hp, this.st.hp), max: this.st.hp, stamina: has(player, 'sankofa') ? this.st.stamina : 1, maxSt: this.st.stamina };
    this.potions = this.st.potionSlots;
    this.cds = {};
    this.queue = this.makeQueue();
    this.total = this.queue.length; this.kills = 0; this.xp = 0; this.drops = [];
    this.board = Array.from({ length: this.C * this.R }, () => this.next());
    this.sel = null; this.aim = -1; this.busy = false; this.over = false;
    this.fx = []; this.parts = []; this.floats = []; this.round = 1; this.shake = 0; this.heroDash = 0; this.heroHurt = 0; this.redFlash = 0; this.whiteFlash = 0;
    this.msg = 'Monsters sleep until you hit them. Pick an action, then a monster.';
    this.resize(); this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    canvas.onpointerdown = (e) => this.down(e);
    canvas.onpointermove = (e) => this.move(e);
    canvas.onpointerup = (e) => this.up(e);
    canvas.onpointercancel = () => { this.aim = -1; this.pressing = false; };
    this.renderUI();
  }

  // ---------- spawning ----------
  makeQueue() {
    const w = this.world, q = [];
    for (let i = 0; i < w.count - 1; i++) {
      let id = pick(w.pool);
      if (id === 'sika' && Math.random() > 0.35) id = w.pool[0]; // treasure imps are rare
      q.push({ id, lvl: w.lvl + Math.floor(i / (w.count / 4)) });
    }
    q.push({ id: w.boss, lvl: w.lvl + 3 });
    return q;
  }
  next() {
    const e = this.queue.shift(); if (!e) return null;
    const m = MONSTERS[e.id], k = 1 + (e.lvl - 1) * 0.22;
    if (m.boss && this.board) setTimeout(() => this.onBoss(e.id), 250);
    return { id: e.id, m, lvl: e.lvl, hp: Math.round(m.hp * k), max: Math.round(m.hp * k), atk: Math.round(m.atk * k), def: Math.round(m.def * k),
      agg: 0, timer: 0, charge: 0, stun: 0, burn: 0, buffed: false, hit: 0, born: now(), lunge: 0, frost: 0, ph: Math.random() * 6 };
  }

  // ---------- geometry ----------
  rc(i) { return [Math.floor(i / this.C), i % this.C]; }
  idx(r, c) { return r >= 0 && c >= 0 && r < this.R && c < this.C ? r * this.C + c : -1; }
  cx(k) { return this.ox + (k % this.C + 0.5) * this.cs; }
  cy(k) { return this.oy + (Math.floor(k / this.C) + 0.5) * this.cs; }
  neighbours(i) { const [r, c] = this.rc(i); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => this.idx(r + a, c + b)).filter((k) => k >= 0 && this.board[k]); }
  cellsFor(a, i) {
    const [r, c] = this.rc(i);
    const offs = { single: [[0, 0]], row3: [[0, -1], [0, 0], [0, 1]], cross: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],
      xcross: [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]], box: [-1, 0, 1].flatMap((a2) => [-1, 0, 1].map((b) => [a2, b])) };
    if (a.pat === 'row') return Array.from({ length: this.C }, (_, k) => r * this.C + k);
    if (a.pat === 'col') return Array.from({ length: this.R }, (_, k) => k * this.C + c);
    if (a.pat === 'random4') { const alive = this.board.map((m, k) => (m && k !== i ? k : -1)).filter((k) => k >= 0).sort(() => Math.random() - 0.5); return [i, ...alive.slice(0, 3)]; }
    return offs[a.pat].map(([a2, b]) => this.idx(r + a2, c + b)).filter((k) => k >= 0);
  }

  // ---------- input ----------
  cellAt(e) {
    const r = this.cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - r.left - this.ox) / this.cs), rr = Math.floor((e.clientY - r.top - this.oy) / this.cs);
    return this.idx(rr, c);
  }
  down(e) { if (this.busy || this.over) return; this.pressing = true; this.aim = this.cellAt(e); try { this.cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
  move(e) { if (this.pressing) this.aim = this.cellAt(e); }
  up(e) {
    if (!this.pressing) return; this.pressing = false;
    const i = this.cellAt(e); this.aim = -1;
    if (this.busy || this.over || i < 0 || !this.board[i]) return;
    if (!this.sel) { this.onInspect(this.board[i], this); return; }
    const a = this.sel; this.sel = null; this.execute(a, i);
  }

  // ---------- actions ----------
  actions() {
    const list = WEAPON_ACTIONS.filter((w) => this.p.level >= w.lvl).map((w) => ({ ...w, kind: 'weapon', key: w.id, stat: 'atk' }));
    for (const [id, s] of Object.entries(SPELLS)) if (this.p.cleared.length >= s.unlock) list.push({ ...s, kind: 'spell', key: id, stat: 'mag', st: 0 });
    return list;
  }
  ready(a) { return this.hero.stamina >= (a.st || 0) && !(this.cds[a.key] > 0); }
  pickAction(a) {
    if (this.busy || this.over || !this.ready(a)) return;
    this.sel = this.sel && this.sel.key === a.key ? null : a; this.sfx('click');
    this.msg = this.sel ? `<b>${a.name}</b> · ${PAT[a.pat]} · press a monster, drag to aim` : 'Pick an action, or tap a monster to inspect it.';
    this.renderUI();
  }
  roleText(r) { return { buffer: 'Buffer: triples an aggressive ally\'s damage', caster: 'Caster: charges 3 rounds, then a huge hit', ranger: 'Ranger: also attacks when ready (yellow)', treasure: 'Treasure: harmless, always drops gear' }[r]; }

  dmg(a, mon) {
    let atk = this.st[a.stat];
    if (a.stat === 'atk' && has(this.p, 'enrage') && this.hero.hp < this.hero.max * 0.4) atk *= 1.25;
    let d = atk * a.power * (0.9 + Math.random() * 0.2) - mon.def * 0.5;
    if (a.key === 'afena' && has(this.p, 'execute') && mon.hp < mon.max * 0.25) d *= 2;
    const crit = Math.random() < 0.06; if (crit) d *= 1.7;
    return { d: Math.max(1, Math.round(d)), crit };
  }

  async execute(a, i) {
    this.busy = true; this.renderUI();
    this.hero.stamina -= a.st || 0;
    if (a.kind === 'spell') this.cds[a.key] = Math.max(1, a.cd - (has(this.p, 'meditation') ? 1 : 0)) + 1;
    const targets = this.cellsFor(a, i).filter((k) => this.board[k]);
    this.sfx(a.kind === 'spell' ? 'spell' : 'swing');
    const order = await this.playAction(a, i, targets);
    for (const k of order) {
      const mon = this.board[k]; if (!mon) continue;
      const r = this.dmg(a, mon);
      mon.hp -= r.d; mon.hit = 1;
      this.impact(k, a.color || '#fff4dc', r.crit);
      this.float(this.cx(k), this.cy(k) - this.cs * 0.1, (r.crit ? 'CRIT ' : '') + r.d, r.crit ? '#ffd23c' : '#fff', r.crit ? 1.35 : 1);
      if (a.provoke) { mon.agg = 3; if (!has(this.p, 'calm')) for (const n of this.neighbours(k)) { const nm = this.board[n]; if (nm.agg === 0) { nm.agg = 1; nm.timer = 2 + rnd(2); } } }
      else if (a.kind === 'spell') { mon.agg = mon.m.role === 'treasure' ? 0 : 1; mon.timer = a.calmTo ? 3 : 2; }
      else if (a.calm) { if (mon.agg === 3) mon.agg = 2; else if (mon.agg === 0) { mon.agg = 1; mon.timer = 2; } }
      if (a.burn) mon.burn = a.burn;
      if (a.stun) mon.stun = a.stun;
      if (a.calmTo) mon.frost = 1;
      if (mon.m.role === 'treasure') mon.agg = 0;
      this.sfx(r.crit ? 'crit' : 'hit');
      if (order.length > 1) await sleep(a.pat === 'random4' ? 0 : 45);
    }
    this.shake = Math.max(this.shake, Math.min(12, 3 + targets.length * 1.2));
    await sleep(240);
    for (const k of order) if (this.board[k] && this.board[k].hp <= 0) await this.kill(k);
    this.say(`${a.name}: ${a.en}.`);
    await sleep(160);
    if (this.checkEnd()) return;
    await this.endRound();
  }

  // ---------- action animations: each resolves at the moment of impact, returns hit order ----------
  hand() { return [this.heroX + this.heroW * 0.18, this.heroY - this.heroH * 0.62]; }
  addFx(type, dur, o = {}) { const f = { type, t0: now(), dur, ...o }; this.fx.push(f); return f; }
  async playAction(a, i, targets) {
    const cs = this.cs, x = this.cx(i), y = this.cy(i);
    this.heroDash = 1;
    switch (a.key) {
      case 'afena': {
        this.addFx('slash', 300, { x, y, r: cs * 0.62, a0: -2.4, sweep: 2.9, color: '#ffffff', glow: '#f08a24', w: cs * 0.16 });
        await sleep(130); return targets;
      }
      case 'akuma': {
        const xs = targets.map((k) => this.cx(k));
        const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
        this.addFx('sweep', 360, { x: mid, y, rx: Math.max(cs * 1.25, (Math.max(...xs) - Math.min(...xs)) / 2 + cs * 0.55), ry: cs * 0.38, color: '#ffe0b0', glow: '#d2622a' });
        await sleep(170); return [...targets].sort((p, q) => this.cx(p) - this.cx(q));
      }
      case 'pea': {
        const [hx, hy] = this.hand();
        this.addFx('thrust', 380, { x0: hx, y0: hy, x1: x, y1: y });
        await sleep(200); this.addFx('ring', 380, { x, y, r: cs * 0.7, color: '#dfe6f0', w: 5 }); this.shake = 8; return targets;
      }
      case 'ogya': {
        const [hx, hy] = this.hand();
        this.addFx('fireball', 420, { x0: hx, y0: hy, x1: x, y1: y, r: cs * 0.2 });
        await sleep(420);
        for (const k of targets) this.addFx('boom', 520, { x: this.cx(k), y: this.cy(k), r: cs * 0.62 });
        for (const k of targets) this.burst(this.cx(k), this.cy(k), ['#ffd23c', '#ff6a2a', '#c8342e'], 10, 4.5);
        this.whiteFlash = 0.25; return targets;
      }
      case 'nsuo': {
        const r0 = Math.floor(i / this.C);
        this.addFx('wave', 620, { y0: this.oy + r0 * cs, h: cs });
        const sorted = [...targets].sort((p, q) => this.cx(p) - this.cx(q));
        await sleep(160); return sorted;
      }
      case 'awow': {
        this.addFx('frost', 700, { x, y, r: cs * 1.75 });
        await sleep(200); return targets;
      }
      case 'aprannaa': {
        const pts = [[x + (Math.random() - 0.5) * cs, -10], ...targets.map((k) => [this.cx(k), this.cy(k)])];
        this.addFx('bolt', 640, { pts });
        this.whiteFlash = 0.35; this.sfx('zap');
        await sleep(120); return targets;
      }
      case 'nkyinkyim': {
        this.addFx('twist', 560, { x, y, L: cs * 1.75 });
        await sleep(300); return targets;
      }
      case 'asase': {
        const sorted = [...targets].sort((p, q) => this.cy(p) - this.cy(q));
        sorted.forEach((k, n) => this.addFx('spikes', 620, { x: this.cx(k), y: this.cy(k) + cs * 0.48, w: cs * 0.9, h: cs * 0.9, delay: n * 70 }));
        this.shake = 10; await sleep(160); return sorted;
      }
      default: this.addFx('flashcells', 300, { cells: targets, color: a.color || '#fff' }); await sleep(120); return targets;
    }
  }
  impact(k, color, crit) {
    const x = this.cx(k), y = this.cy(k);
    this.addFx('hitflash', 160, { cell: k });
    this.addFx('ring', 260, { x, y, r: this.cs * (crit ? 0.75 : 0.5), color: crit ? '#ffd23c' : color, w: crit ? 6 : 3 });
    this.burst(x, y, [color, '#ffffff'], crit ? 14 : 7, crit ? 5 : 3);
  }

  async drink() {
    if (this.busy || this.over || this.potions <= 0) return;
    this.potions--;
    const amt = Math.round((this.hero.max * 0.3 + this.st.mag * 2) * (has(this.p, 'potency') ? 1.5 : 1));
    this.hero.hp = Math.min(this.hero.max, this.hero.hp + amt);
    if (has(this.p, 'bloodthirst')) this.hero.stamina = this.hero.maxSt;
    this.float(this.heroX, this.heroY - this.heroH * 0.8, '+' + amt, '#7ee08a', 1.2);
    for (let n = 0; n < 26; n++) this.parts.push({ x: this.heroX + (Math.random() - 0.5) * this.heroW * 0.8, y: this.heroY - Math.random() * this.heroH * 0.9, vx: 0, vy: -0.6 - Math.random() * 1.4, g: -0.01, life: 1, decay: 0.012, size: 3 + Math.random() * 3, color: n % 3 ? '#7ee08a' : '#e9ffd0', glow: true });
    this.sfx('heal'); this.say('Herbal tonic: +' + amt + ' HP. Drinking does not end the round.');
  }
  async kill(k) {
    const mon = this.board[k];
    this.kills++; this.p.stats.kills++;
    this.xp += Math.round(mon.m.xp * (1 + (mon.lvl - 1) * 0.3));
    const tier = this.p.cleared.length + (this.world.lvl >= 8 ? 1 : 0);
    let dropped = false;
    if (mon.m.role === 'treasure') { this.drops.push({ tier: Math.max(tier, Math.floor(this.world.lvl / 4)), luck: 0.45 }); dropped = true; }
    else if (mon.m.boss) { this.drops.push({ tier: Math.floor(this.world.lvl / 4) + 1, luck: 0.5 }, { tier: Math.floor(this.world.lvl / 4), luck: 0.3 }); dropped = true; }
    else if (Math.random() < 0.1) { this.drops.push({ tier: Math.floor(this.world.lvl / 4), luck: 0 }); dropped = true; }
    const x = this.cx(k), y = this.cy(k);
    this.addFx('death', 520, { x, y, r: this.cs * 0.7, id: mon.id, m: mon.m, size: this.cs });
    this.burst(x, y, [mon.m.color, '#1a1216', '#ffffff'], 18, 5);
    if (dropped) { this.float(x, y - this.cs * 0.3, 'GEAR!', '#e3b448', 1.1); for (let n = 0; n < 14; n++) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 3, g: 0.18, life: 1, decay: 0.02, size: 4, color: '#e3b448', glow: true }); this.sfx('coin'); }
    this.sfx('die');
    this.board[k] = this.next();
    this.updateTop();
  }

  async endRound() {
    for (let k = 0; k < this.board.length; k++) {
      const m = this.board[k]; if (!m || !m.burn) continue;
      const d = Math.max(1, Math.round(m.max * 0.08)); m.hp -= d; m.burn--; this.float(this.cx(k), this.cy(k), d, '#ff8a3c', 0.8);
      for (let n = 0; n < 6; n++) this.parts.push({ x: this.cx(k) + (Math.random() - 0.5) * this.cs * 0.5, y: this.cy(k) + this.cs * 0.2, vx: 0, vy: -1 - Math.random(), g: -0.02, life: 1, decay: 0.03, size: 3, color: '#ff8a3c', glow: true });
      if (m.hp <= 0) await this.kill(k);
    }
    if (this.checkEnd()) return;
    for (const m of this.board) if (m) m.buffed = false;
    for (let k = 0; k < this.board.length; k++) {
      const m = this.board[k]; if (!m || m.m.role !== 'buffer' || m.agg < 2 || m.stun) continue;
      const allies = this.board.map((x, j) => [x, j]).filter(([x]) => x && x !== m && x.agg === 3 && x.atk > 0);
      if (allies.length) { const [ally, j] = pick(allies); ally.buffed = true; this.addFx('link', 700, { a: k, b: j }); }
    }
    const attackers = [];
    for (let k = 0; k < this.board.length; k++) {
      const m = this.board[k]; if (!m) continue;
      m.frost = 0;
      if (m.stun) { m.stun--; continue; }
      const role = m.m.role;
      if (role === 'treasure' || role === 'buffer') { if (m.agg === 1 && --m.timer <= 0) m.agg = 2; else if (m.agg === 2) m.agg = 3; continue; }
      if (m.agg === 3) {
        if (role === 'caster') { m.charge++; if (m.charge >= 3) { m.charge = 0; attackers.push([k, 3]); } }
        else attackers.push([k, 1]);
      } else if (m.agg === 2) { if (role === 'ranger') attackers.push([k, 0.7]); m.agg = 3; }
      else if (m.agg === 1) { if (--m.timer <= 0) m.agg = 2; }
    }
    await sleep(140);
    for (const [k, mult] of attackers) {
      const m = this.board[k]; if (!m) continue;
      await this.monsterAttack(k, m, mult);
      let d = m.atk * mult * (m.buffed ? 3 : 1) - this.st.def * 0.5;
      if (has(this.p, 'stoneskin')) d *= 0.88;
      d = Math.max(1, Math.round(d * (0.9 + Math.random() * 0.2)));
      this.hero.hp = Math.max(0, this.hero.hp - d);
      this.heroHurt = 1; this.redFlash = mult > 1 || m.m.boss ? 0.5 : 0.28; this.shake = 7 + (mult > 1 ? 6 : 0);
      this.sfx(mult > 1 ? 'crit' : 'hurt');
      this.float(this.heroX + (Math.random() - 0.5) * 40, this.heroY - this.heroH * 0.75, '-' + d, '#ff6a5a', mult > 1 ? 1.4 : 1.1);
      this.renderUI(true);
      await sleep(170);
      if (this.hero.hp <= 0) { this.finish(false); return; }
    }
    for (const key of Object.keys(this.cds)) if (this.cds[key] > 0) this.cds[key]--;
    this.hero.stamina = Math.min(this.hero.maxSt, this.hero.stamina + 1);
    this.round++; this.busy = false;
    const red = this.board.filter((m) => m && m.agg === 3).length;
    this.say(attackers.length ? `${attackers.length} hit${attackers.length > 1 ? 's' : ''} taken. ${red} aggressive.` : `${red} aggressive. Keep it low.`);
    this.updateTop();
  }
  async monsterAttack(k, m, mult) {
    const x = this.cx(k), y = this.cy(k), hx = this.heroX, hy = this.heroY - this.heroH * 0.55;
    m.lunge = 1;
    if (m.m.role === 'caster') {
      this.addFx('charge', 360, { x, y, r: this.cs * 0.5 }); await sleep(300);
      this.addFx('beam', 420, { x0: x, y0: y, x1: hx, y1: hy, color: '#c58bff' }); await sleep(160);
      this.addFx('ring', 420, { x: hx, y: hy, r: this.heroH * 0.5, color: '#c58bff', w: 8 });
    } else if (m.m.role === 'ranger') {
      this.addFx('thorn', 330, { x0: x, y0: y, x1: hx, y1: hy }); await sleep(330);
      this.addFx('claw', 300, { x: hx, y: hy, s: this.heroH * 0.3, color: '#ffd23c', n: 1 });
    } else if (m.m.boss) {
      this.addFx('ring', 500, { x, y, r: this.cs * 1.6, color: '#ff3b2a', w: 10 }); await sleep(200);
      this.addFx('claw', 420, { x: hx, y: hy, s: this.heroH * 0.5, color: '#ff3b2a', n: 4 });
      this.whiteFlash = 0.2;
    } else {
      await sleep(110);
      this.addFx('claw', 320, { x: hx, y: hy, s: this.heroH * 0.36, color: '#ff4a3c', n: 3 });
    }
  }
  checkEnd() { if (this.kills >= this.total) { this.finish(true); return true; } return false; }
  finish(win) {
    this.over = true; this.busy = true; this.p.hp = this.hero.hp; this.renderUI();
    if (win) { this.sfx('win'); this.whiteFlash = 0.6; }
    setTimeout(() => { this.destroy(); this.onEnd({ win, xp: this.xp, kills: this.kills, total: this.total, drops: this.drops }); }, win ? 1100 : 900);
  }

  // ---------- HUD (DOM) ----------
  say(t) { this.msg = t; this.renderUI(); }
  updateTop() { if (this.top) { this.top.cnt.textContent = `${this.kills}/${this.total}`; this.top.round.textContent = `Round ${this.round}`; } }
  renderUI(hurt) {
    const H = this.hero;
    if (!this.hudBuilt) {
      this.hud.innerHTML = `<div class="hudrow"><div class="face"><img alt=""></div><div class="vit">
        <div class="hpline"><span>HP</span><b class="num"></b></div><div class="meter"><i></i></div><div class="stam"></div></div></div>
        <div class="blog"></div><div class="acts5"></div>`;
      const im = this.hud.querySelector('.face img');
      im.src = `assets/portraits/${this.p.hero}.webp`; im.onerror = () => { im.onerror = null; im.src = `assets/heroes/${this.p.hero}.png`; };
      this.hudBuilt = true;
    }
    this.hud.querySelector('.hpline b').textContent = `${H.hp} / ${H.max}`;
    this.hud.querySelector('.meter i').style.setProperty('--f', Math.max(0, H.hp / H.max));
    this.hud.querySelector('.stam').innerHTML = Array.from({ length: H.maxSt }, (_, k) => `<i class="${k < H.stamina ? 'on' : ''}"></i>`).join('') + '<em>STAMINA</em>';
    this.hud.querySelector('.blog').innerHTML = this.msg;
    if (hurt) { const f = this.hud.querySelector('.face'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
    const row = this.hud.querySelector('.acts5'); row.innerHTML = '';
    for (const a of this.actions()) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'act ' + a.kind + (this.sel && this.sel.key === a.key ? ' on' : '');
      b.style.setProperty('--ac', a.color || '#f3e7cf');
      const cd = this.cds[a.key] || 0;
      b.innerHTML = `${ICON[a.key] || ''}<strong>${a.name}</strong><small>${a.kind === 'spell' ? 'cd ' + a.cd : a.st ? a.st + ' stam' : 'free'}</small>${cd ? `<span class="cdv">${cd}</span>` : ''}`;
      b.setAttribute('aria-label', `${a.name}, ${a.en}, ${PAT[a.pat]}`);
      b.disabled = this.busy || this.over || !this.ready(a);
      b.onclick = () => this.pickAction(a);
      row.append(b);
    }
    const t = document.createElement('button'); t.type = 'button'; t.className = 'act item'; t.style.setProperty('--ac', '#7ee08a');
    t.innerHTML = `${ICON.tonic}<strong>Tonic</strong><small>${this.potions} left</small>`;
    t.disabled = this.busy || this.over || this.potions <= 0; t.onclick = () => this.drink(); row.append(t);
    this.updateTop();
  }

  // ---------- canvas ----------
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    const strip = Math.max(120, r.height * 0.26);
    this.cs = Math.min((r.width - 12) / this.C, (r.height - strip - 10) / this.R, 96);
    this.ox = (r.width - this.cs * this.C) / 2; this.oy = 6;
    const top = this.oy + this.cs * this.R + 8;
    this.heroH = Math.min(r.height - top + 6, 330);
    const im = heroImg(this.heroDef.id);
    this.heroW = im.ok ? this.heroH * im.el.naturalWidth / im.el.naturalHeight : this.heroH * 0.6;
    this.heroX = Math.max(this.heroW / 2 + 4, r.width * 0.26); this.heroY = r.height + 2;
  }
  float(x, y, text, color, size = 1) { this.floats.push({ x, y, text: String(text), color, life: 1, size }); }
  burst(x, y, colors, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = sp * (0.4 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: 0.16, life: 1, decay: 0.025 + Math.random() * 0.02, size: 2 + Math.random() * 3, color: colors[i % colors.length] }); } }

  loop(tms) {
    const t = tms / 1000, T = now(), rect = this.cv.getBoundingClientRect();
    if (rect.width !== this.w || rect.height !== this.h || (!this.heroSized && heroImg(this.heroDef.id).ok)) { this.heroSized = heroImg(this.heroDef.id).ok; this.resize(); }
    const g = this.g, cs = this.cs, ox = this.ox, oy = this.oy, C = this.C, R = this.R, dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, this.w, this.h);
    const sh = this.shake; this.shake = Math.max(0, sh - 0.6);
    g.save(); g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    // strip backdrop: world name watermark + ground glow
    g.save(); g.globalAlpha = 0.07; g.fillStyle = '#f4eee4'; g.font = `${Math.round(this.h * 0.12)}px Anton, Impact, sans-serif`; g.textAlign = 'right';
    g.fillText(this.world.name.split(' ')[0].toUpperCase(), this.w - 8, this.h - 12); g.restore();
    const gr = g.createRadialGradient(this.heroX, this.h, 4, this.heroX, this.h, this.heroW * 0.9);
    gr.addColorStop(0, 'rgba(240,138,36,.25)'); gr.addColorStop(1, 'rgba(240,138,36,0)'); g.fillStyle = gr; g.fillRect(0, this.h - this.heroH, this.w, this.heroH);

    // board
    g.fillStyle = 'rgba(10,7,10,.55)'; g.fillRect(ox - 4, oy - 4, cs * C + 8, cs * R + 8);
    let preview = new Set();
    if (this.sel && this.aim >= 0 && this.board[this.aim]) preview = new Set(this.sel.pat === 'random4' ? [this.aim] : this.cellsFor(this.sel, this.aim));
    for (let k = 0; k < C * R; k++) {
      const [r, c] = this.rc(k), x = ox + c * cs, y = oy + r * cs, m = this.board[k];
      g.fillStyle = (r + c) % 2 ? '#2b2130' : '#251c29'; g.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      if (!m) continue;
      const role = m.m.role;
      if (m.agg === 3) { g.fillStyle = 'rgba(200,52,46,.22)'; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
      if (m.m.boss) { const bg = g.createRadialGradient(x + cs / 2, y + cs / 2, 2, x + cs / 2, y + cs / 2, cs * 0.7); bg.addColorStop(0, 'rgba(255,60,40,.35)'); bg.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = bg; g.fillRect(x, y, cs, cs); }
      if (preview.has(k)) { g.fillStyle = 'rgba(255,214,120,.32)'; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
      // monster
      const age = Math.min(1, (T - m.born) / 380), bob = Math.sin(t * 2.2 + m.ph) * cs * 0.012;
      g.save(); g.beginPath(); g.rect(x + 1, y + 1, cs - 2, cs - 2); g.clip();
      g.globalAlpha = age;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + cs / 2, y + cs * 0.92, cs * 0.3, cs * 0.06, 0, 0, 6.28); g.fill();
      const lunge = m.lunge * cs * 0.14;
      drawMonster(g, m.id, m.m, x + cs / 2, y + cs * 0.96 + bob + lunge + (1 - age) * cs * 0.3, cs / 128 * (m.m.boss ? 1.08 : 0.92), t + k, m.hit, dpr);
      if (m.hit > 0.4) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${(m.hit - 0.4) * 1.2})`; g.fillRect(x, y, cs, cs); g.globalCompositeOperation = 'source-over'; }
      if (m.frost) { g.fillStyle = 'rgba(190,232,255,.18)'; g.fillRect(x, y, cs, cs); }
      g.restore(); g.globalAlpha = 1;
      if (role) { g.strokeStyle = ROLE_COLOR[role]; g.lineWidth = 2.5; g.strokeRect(x + 2.5, y + 2.5, cs - 5, cs - 5); }
      if (this.sel && !this.busy) { g.strokeStyle = `rgba(240,138,36,${0.35 + 0.3 * Math.sin(t * 6)})`; g.lineWidth = 1.5; g.strokeRect(x + 5, y + 5, cs - 10, cs - 10); }
      // hp bar
      const bw = cs - 10; g.fillStyle = 'rgba(0,0,0,.8)'; g.fillRect(x + 5, y + cs - 8, bw, 4);
      g.fillStyle = m.m.boss ? '#ff3b2a' : '#d23b31'; g.fillRect(x + 5, y + cs - 8, bw * Math.max(0, m.hp) / m.max, 4);
      // aggression hourglass
      if (m.agg > 0 || m.stun) {
        const s = Math.max(10, cs * 0.18), bx = x + cs - s - 4, by = y + 4;
        g.fillStyle = m.stun ? '#4fa3ff' : AGG_COLOR[m.agg]; g.strokeStyle = '#120c10'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + s, by); g.lineTo(bx + s / 2, by + s * 0.6); g.lineTo(bx + s, by + s * 1.2); g.lineTo(bx, by + s * 1.2); g.lineTo(bx + s / 2, by + s * 0.6); g.closePath(); g.fill(); g.stroke();
        if (m.agg === 1 && !m.stun) { g.font = `800 ${Math.round(s)}px Karla, sans-serif`; g.textAlign = 'right'; g.lineWidth = 3; g.strokeText(String(m.timer), bx - 2, by + s); g.fillStyle = '#fff'; g.fillText(String(m.timer), bx - 2, by + s); }
      }
      if (role === 'caster' && m.charge) { g.fillStyle = '#c58bff'; for (let q = 0; q < m.charge; q++) { g.beginPath(); g.arc(x + 9 + q * 9, y + 9, 3.5, 0, 6.28); g.fill(); } }
      if (m.buffed) { g.font = `${Math.round(cs * 0.2)}px Bangers, Impact, sans-serif`; g.textAlign = 'left'; g.lineWidth = 3; g.strokeStyle = '#120c10'; g.strokeText('×3', x + 5, y + cs * 0.24); g.fillStyle = '#4fa3ff'; g.fillText('×3', x + 5, y + cs * 0.24); }
      if (m.burn) { g.fillStyle = '#ff8a3c'; g.shadowColor = '#ff8a3c'; g.shadowBlur = 8; g.beginPath(); g.arc(x + 9, y + cs - 15, 3.5, 0, 6.28); g.fill(); g.shadowBlur = 0; }
      m.hit = Math.max(0, m.hit - 0.07); m.lunge = Math.max(0, m.lunge - 0.08);
    }

    // hero
    const dash = ease.out(this.heroDash) * 14, hurt = this.heroHurt;
    const hx = this.heroX + dash - hurt * 10 * Math.sin(T / 30), hy = this.heroY - dash * 0.6;
    const breathe = 1 + Math.sin(t * 2) * 0.006;
    g.save(); g.translate(hx, hy); g.scale(1, breathe); g.translate(-hx, -hy);
    drawHero(g, this.heroDef, hx, hy, this.heroH / (110 * this.heroDef.body.h), { dpr });
    g.restore();
    this.heroDash = Math.max(0, this.heroDash - 0.06); this.heroHurt = Math.max(0, this.heroHurt - 0.05);

    // effects
    this.fx = this.fx.filter((f) => this.drawFx(g, f, T));
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= p.decay;
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color;
      if (p.glow) { g.shadowColor = p.color; g.shadowBlur = 8; }
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); g.shadowBlur = 0;
    }
    g.globalAlpha = 1; this.parts = this.parts.filter((p) => p.life > 0);
    g.textAlign = 'center';
    for (const f of this.floats) {
      f.y -= 0.8; f.life -= 0.018; const pop = f.life > 0.85 ? 1 + (f.life - 0.85) * 3 : 1;
      g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6)); g.font = `${Math.round(22 * f.size * pop)}px Bangers, Impact, sans-serif`;
      g.lineWidth = 5; g.strokeStyle = '#120c10'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y);
    }
    g.globalAlpha = 1; this.floats = this.floats.filter((f) => f.life > 0);
    g.restore();
    // screen flashes
    if (this.redFlash > 0) { const v = g.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.25, this.w / 2, this.h / 2, this.h * 0.75); v.addColorStop(0, 'rgba(255,0,0,0)'); v.addColorStop(1, `rgba(220,20,20,${this.redFlash})`); g.fillStyle = v; g.fillRect(0, 0, this.w, this.h); this.redFlash = Math.max(0, this.redFlash - 0.02); }
    if (this.whiteFlash > 0) { g.fillStyle = `rgba(255,250,235,${this.whiteFlash})`; g.fillRect(0, 0, this.w, this.h); this.whiteFlash = Math.max(0, this.whiteFlash - 0.04); }
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Draw one effect; returns false when finished. */
  drawFx(g, f, T) {
    const el = T - f.t0 - (f.delay || 0); if (el < 0) return true;
    const p = Math.min(1, el / f.dur);
    g.save();
    switch (f.type) {
      case 'slash': {
        const e = ease.out(Math.min(1, p * 1.6)), a1 = f.a0 + f.sweep * e, a0 = f.a0 + f.sweep * Math.max(0, e - 0.55);
        g.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
        g.shadowColor = f.glow; g.shadowBlur = 18; g.strokeStyle = f.glow; g.lineCap = 'round';
        g.lineWidth = f.w * 1.6; g.beginPath(); g.arc(f.x, f.y, f.r, a0, a1); g.stroke();
        g.strokeStyle = f.color; g.lineWidth = f.w * 0.7; g.beginPath(); g.arc(f.x, f.y, f.r, a0, a1); g.stroke();
        g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.7)';
        for (let n = 0; n < 3; n++) { const a = a1 - 0.2 * n; g.beginPath(); g.moveTo(f.x + Math.cos(a) * f.r * 0.9, f.y + Math.sin(a) * f.r * 0.9); g.lineTo(f.x + Math.cos(a) * f.r * 1.35, f.y + Math.sin(a) * f.r * 1.35); g.stroke(); }
        break;
      }
      case 'sweep': {
        const e = ease.out(Math.min(1, p * 1.5)), a0 = Math.PI * 0.95, span = Math.PI * 1.1;
        g.globalAlpha = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
        g.translate(f.x, f.y); g.scale(1, f.ry / f.rx);
        g.shadowColor = f.glow; g.shadowBlur = 20; g.lineCap = 'round';
        g.strokeStyle = f.glow; g.lineWidth = 26; g.beginPath(); g.arc(0, 0, f.rx, a0 + span * Math.max(0, e - 0.5), a0 + span * e); g.stroke();
        g.strokeStyle = f.color; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, f.rx, a0 + span * Math.max(0, e - 0.4), a0 + span * e); g.stroke();
        break;
      }
      case 'thrust': {
        const e = p < 0.55 ? ease.in(p / 0.55) : 1, x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e;
        const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), len = 70;
        g.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
        for (let n = -2; n <= 2; n++) { const ox = Math.cos(ang + 1.57) * n * 6, oy = Math.sin(ang + 1.57) * n * 6; g.beginPath(); g.moveTo(x - Math.cos(ang) * (len + 60) + ox, y - Math.sin(ang) * (len + 60) + oy); g.lineTo(x - Math.cos(ang) * len + ox, y - Math.sin(ang) * len + oy); g.stroke(); }
        g.strokeStyle = '#6b4424'; g.lineWidth = 5; g.beginPath(); g.moveTo(x - Math.cos(ang) * len * 2, y - Math.sin(ang) * len * 2); g.lineTo(x, y); g.stroke();
        g.strokeStyle = '#e3b448'; g.lineWidth = 6; g.beginPath(); g.moveTo(x - Math.cos(ang) * 30, y - Math.sin(ang) * 30); g.lineTo(x - Math.cos(ang) * 24, y - Math.sin(ang) * 24); g.stroke();
        g.translate(x, y); g.rotate(ang); g.fillStyle = '#e6edf5'; g.shadowColor = '#ffffff'; g.shadowBlur = 12;
        g.beginPath(); g.moveTo(16, 0); g.quadraticCurveTo(0, -9, -22, 0); g.quadraticCurveTo(0, 9, 16, 0); g.fill();
        break;
      }
      case 'ring': {
        g.globalAlpha = 1 - p; g.strokeStyle = f.color; g.lineWidth = f.w * (1 - p) + 1; g.shadowColor = f.color; g.shadowBlur = 12;
        g.beginPath(); g.arc(f.x, f.y, f.r * ease.out(p), 0, 6.28); g.stroke(); break;
      }
      case 'hitflash': break;
      case 'fireball': {
        const e = ease.in(p), mx = (f.x0 + f.x1) / 2, my = Math.min(f.y0, f.y1) - 90;
        const x = (1 - e) ** 2 * f.x0 + 2 * (1 - e) * e * mx + e * e * f.x1, y = (1 - e) ** 2 * f.y0 + 2 * (1 - e) * e * my + e * e * f.y1;
        for (let n = 0; n < 3; n++) this.parts.push({ x: x + (Math.random() - 0.5) * f.r, y: y + (Math.random() - 0.5) * f.r, vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random(), g: -0.02, life: 0.9, decay: 0.04, size: 3 + Math.random() * 4, color: n ? '#ff8a3c' : '#ffd23c', glow: true });
        const rg = g.createRadialGradient(x, y, 1, x, y, f.r * 1.8); rg.addColorStop(0, '#fff8d0'); rg.addColorStop(0.35, '#ffb43c'); rg.addColorStop(0.7, 'rgba(255,90,30,.7)'); rg.addColorStop(1, 'rgba(200,40,20,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, f.r * 1.8, 0, 6.28); g.fill(); break;
      }
      case 'boom': {
        const e = ease.out(p);
        const rg = g.createRadialGradient(f.x, f.y, 1, f.x, f.y, f.r * (0.4 + e * 0.8)); rg.addColorStop(0, `rgba(255,248,208,${1 - p})`); rg.addColorStop(0.4, `rgba(255,150,40,${0.9 * (1 - p)})`); rg.addColorStop(1, 'rgba(200,40,20,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(f.x, f.y, f.r * (0.4 + e * 0.8), 0, 6.28); g.fill();
        g.globalAlpha = 1 - p; g.strokeStyle = '#ffd23c'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, f.r * e * 1.1, 0, 6.28); g.stroke(); break;
      }
      case 'wave': {
        const W = this.cs * this.C, x0 = this.ox, front = x0 - this.cs + (W + this.cs * 2) * ease.out(p);
        g.globalAlpha = p < 0.7 ? 0.85 : 0.85 * (1 - (p - 0.7) / 0.3);
        g.beginPath(); g.rect(this.ox, f.y0, W, f.h); g.clip();
        const top = (x) => f.y0 + f.h * 0.28 + Math.sin(x * 0.06 + T / 90) * f.h * 0.1 - Math.max(0, 1 - Math.abs(x - front) / (this.cs * 0.9)) * f.h * 0.22;
        const lg = g.createLinearGradient(0, f.y0, 0, f.y0 + f.h); lg.addColorStop(0, 'rgba(120,190,255,.9)'); lg.addColorStop(1, 'rgba(20,70,160,.9)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(x0, f.y0 + f.h);
        for (let x = x0; x <= Math.min(front, x0 + W); x += 4) g.lineTo(x, top(x));
        g.lineTo(Math.min(front, x0 + W), f.y0 + f.h); g.closePath(); g.fill();
        g.strokeStyle = '#eaf6ff'; g.lineWidth = 3; g.beginPath();
        for (let x = x0; x <= Math.min(front, x0 + W); x += 4) (x === x0 ? g.moveTo(x, top(x)) : g.lineTo(x, top(x)));
        g.stroke();
        if (front < x0 + W) for (let n = 0; n < 2; n++) this.parts.push({ x: front, y: top(front), vx: 1 + Math.random() * 2, vy: -1 - Math.random() * 2, g: 0.15, life: 0.8, decay: 0.04, size: 3, color: '#dff1ff' });
        break;
      }
      case 'frost': {
        const e = ease.out(p);
        g.globalAlpha = 1 - p * 0.8;
        const rg = g.createRadialGradient(f.x, f.y, 1, f.x, f.y, f.r * e); rg.addColorStop(0, 'rgba(230,248,255,.5)'); rg.addColorStop(1, 'rgba(160,220,255,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(f.x, f.y, f.r * e, 0, 6.28); g.fill();
        g.strokeStyle = '#e8f7ff'; g.lineWidth = 4 * (1 - p) + 1; g.shadowColor = '#bfe8ff'; g.shadowBlur = 14;
        g.beginPath(); g.arc(f.x, f.y, f.r * e, 0, 6.28); g.stroke();
        g.lineWidth = 2;
        for (let n = 0; n < 12; n++) { const a = n / 12 * 6.28 + p * 1.2, r0 = f.r * e * 0.55, r1 = f.r * e * 0.95; g.beginPath(); g.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0); g.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); g.moveTo(f.x + Math.cos(a) * r1 * 0.85, f.y + Math.sin(a) * r1 * 0.85); g.lineTo(f.x + Math.cos(a + 0.12) * r1 * 0.75, f.y + Math.sin(a + 0.12) * r1 * 0.75); g.stroke(); }
        break;
      }
      case 'bolt': {
        const segs = f.pts.length - 1, shown = Math.min(segs, Math.floor(p * segs * 2.2) + 1);
        g.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        g.lineJoin = 'round'; g.shadowColor = '#ffe066'; g.shadowBlur = 18;
        for (const [lw, col] of [[7, 'rgba(255,224,102,.7)'], [2.5, '#ffffff']]) {
          g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(f.pts[0][0], f.pts[0][1]);
          for (let s = 0; s < shown; s++) {
            const [ax, ay] = f.pts[s], [bx, by] = f.pts[s + 1], n = 7;
            for (let q = 1; q <= n; q++) { const u = q / n, jit = q === n ? 0 : (Math.random() - 0.5) * 22; g.lineTo(ax + (bx - ax) * u + jit, ay + (by - ay) * u + jit * 0.6); }
          }
          g.stroke();
        }
        break;
      }
      case 'twist': {
        const e = ease.out(p), rot = (1 - e) * Math.PI * 0.75, L = f.L * e;
        g.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        g.translate(f.x, f.y); g.rotate(rot); g.shadowColor = '#c58bff'; g.shadowBlur = 20; g.lineCap = 'round';
        for (const [lw, col] of [[14, 'rgba(197,139,255,.55)'], [4, '#f3e8ff']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(-L, -L); g.lineTo(L, L); g.moveTo(L, -L); g.lineTo(-L, L); g.stroke(); }
        g.strokeStyle = 'rgba(197,139,255,.8)'; g.lineWidth = 2; g.beginPath();
        for (let a = 0; a < 12; a += 0.25) { const r = a * L * 0.06; g.lineTo(Math.cos(a - rot * 3) * r, Math.sin(a - rot * 3) * r); } g.stroke();
        break;
      }
      case 'spikes': {
        const up = p < 0.35 ? ease.back(p / 0.35) : p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
        g.fillStyle = '#7a4a26'; g.strokeStyle = '#2a1a10'; g.lineWidth = 2;
        const base = f.y, hh = f.h * up;
        for (const [dx, k] of [[-0.3, 0.7], [0, 1], [0.28, 0.8]]) { g.beginPath(); g.moveTo(f.x + dx * f.w - f.w * 0.14, base); g.lineTo(f.x + dx * f.w, base - hh * k); g.lineTo(f.x + dx * f.w + f.w * 0.14, base); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#b5652b'; g.beginPath(); g.moveTo(f.x + dx * f.w, base - hh * k); g.lineTo(f.x + dx * f.w + f.w * 0.14, base); g.lineTo(f.x + dx * f.w + f.w * 0.04, base); g.closePath(); g.fill(); g.fillStyle = '#7a4a26'; }
        if (p < 0.4 && Math.random() < 0.6) this.parts.push({ x: f.x + (Math.random() - 0.5) * f.w, y: base, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, g: 0.12, life: 0.8, decay: 0.03, size: 4, color: '#a07850' });
        break;
      }
      case 'death': {
        g.globalAlpha = 1 - p; g.strokeStyle = '#ffffff'; g.lineWidth = 3 * (1 - p) + 1; g.beginPath(); g.arc(f.x, f.y, f.r * ease.out(p), 0, 6.28); g.stroke();
        g.globalAlpha = 0.6 * (1 - p); g.fillStyle = '#ffffff';
        for (let n = 0; n < 4; n++) { const a = n * 1.57 + 0.78; g.save(); g.translate(f.x, f.y); g.rotate(a); g.fillRect(0, -1.5, f.r * 1.3 * ease.out(p), 3); g.restore(); }
        break;
      }
      case 'link': {
        const ax = this.cx(f.a), ay = this.cy(f.a), bx = this.cx(f.b), by = this.cy(f.b);
        g.globalAlpha = Math.sin(p * Math.PI); g.strokeStyle = '#4fa3ff'; g.lineWidth = 4; g.shadowColor = '#4fa3ff'; g.shadowBlur = 14; g.setLineDash([8, 6]); g.lineDashOffset = -T / 20;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); break;
      }
      case 'charge': {
        const rg = g.createRadialGradient(f.x, f.y, 1, f.x, f.y, f.r * (0.3 + p)); rg.addColorStop(0, 'rgba(255,240,255,.9)'); rg.addColorStop(0.5, 'rgba(197,139,255,.7)'); rg.addColorStop(1, 'rgba(120,60,200,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(f.x, f.y, f.r * (0.3 + p), 0, 6.28); g.fill(); break;
      }
      case 'beam': {
        g.globalAlpha = 1 - p; g.lineCap = 'round'; g.shadowColor = f.color; g.shadowBlur = 22;
        for (const [lw, col] of [[16 * (1 - p) + 4, f.color], [4, '#ffffff']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.stroke(); }
        break;
      }
      case 'thorn': {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p, ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
        g.translate(x, y); g.rotate(ang); g.fillStyle = '#d8c25a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(14, 0); g.lineTo(-10, -4); g.lineTo(-6, 0); g.lineTo(-10, 4); g.closePath(); g.fill(); g.stroke(); break;
      }
      case 'claw': {
        g.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4; g.lineCap = 'round'; g.shadowColor = f.color; g.shadowBlur = 14;
        for (let n = 0; n < f.n; n++) {
          const lp = Math.min(1, Math.max(0, p * 2.2 - n * 0.18)), off = (n - (f.n - 1) / 2) * f.s * 0.28;
          const x0 = f.x - f.s * 0.6 + off, y0 = f.y - f.s * 0.7, x1 = f.x + f.s * 0.5 + off, y1 = f.y + f.s * 0.6;
          g.strokeStyle = f.color; g.lineWidth = 7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * lp, y0 + (y1 - y0) * lp); g.stroke();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * lp, y0 + (y1 - y0) * lp); g.stroke();
        }
        break;
      }
      case 'flashcells': {
        g.globalAlpha = 0.6 * (1 - p); g.fillStyle = f.color;
        for (const k of f.cells) { const [r, c] = this.rc(k); g.fillRect(this.ox + c * this.cs, this.oy + r * this.cs, this.cs, this.cs); }
        break;
      }
    }
    g.restore();
    return p < 1;
  }
  destroy() { cancelAnimationFrame(this.raf); this.cv.onpointerdown = this.cv.onpointermove = this.cv.onpointerup = this.cv.onpointercancel = null; }
}
