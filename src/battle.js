// Grid tactics battle: one hero vs a pack of monsters on an 8x8 board.
import { MONSTERS, SPELLS, HEROES } from './data.js';
import { maxStats, weaponType, rnd, pick } from './state.js';
import { drawHero, drawMonster, shade } from './art.js';

const N = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const TILESETS = {
  forest: { a: '#2f4a27', b: '#36532c', block: '#1d2e18', water: '#24465a', deco: '#4d6b33' },
  marsh:  { a: '#2c3a33', b: '#33443b', block: '#1b241f', water: '#203a44', deco: '#4a5a46' },
  grove:  { a: '#3a2f22', b: '#433627', block: '#211a12', water: '#2a3640', deco: '#5c4a2c' },
  gate:   { a: '#3a1f1f', b: '#442525', block: '#1e0f0f', water: '#3a1010', deco: '#5c2a20' },
};

export class Battle {
  constructor({ canvas, ui, player, region, floor, enemies, onEnd, sfx }) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.ui = ui; this.p = player; this.region = region; this.floor = floor;
    this.onEnd = onEnd; this.sfx = sfx || (() => {});
    this.tiles = TILESETS[region.tiles] || TILESETS.forest;
    this.fx = []; this.floats = []; this.log = [];
    this.mode = 'idle'; this.busy = false; this.over = false;
    this.makeMap();
    const st = maxStats(player);
    this.hero = { side: 'hero', x: 1, y: 6, hp: Math.min(player.hp, st.hp), mp: Math.min(player.mp, st.mp), st, status: {}, anim: { dx: 0, dy: 0, hit: 0 }, cds: {} };
    this.foes = enemies.map((e, i) => this.spawn(e.id, e.lvl, i));
    this.turn = 1; this.moved = false; this.acted = false; this.start = { x: this.hero.x, y: this.hero.y };
    this.resize(); this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    canvas.onpointerdown = (e) => this.tap(e);
    this.say('Floor ' + floor + ': ' + enemies.length + ' foes. Move, then act.');
    this.renderUI();
  }

  // ---------- setup ----------
  makeMap() {
    for (let tries = 0; tries < 50; tries++) {
      const m = [];
      for (let y = 0; y < N; y++) { m.push([]); for (let x = 0; x < N; x++) { const r = Math.random(); m[y].push(r < 0.09 ? 'T' : r < 0.13 ? 'R' : r < 0.16 ? 'W' : '.'); } }
      for (const [x, y] of [[1, 6], [1, 7], [0, 6], [2, 6], [6, 1], [5, 1], [6, 2], [6, 0], [5, 0], [7, 1]]) m[y][x] = '.';
      this.map = m;
      const reach = this.reachable({ x: 1, y: 6 }, 99, false, true);
      const open = m.flat().filter((c) => c === '.').length;
      if (reach.size >= open - 1) return;
    }
  }
  spawn(id, lvl, i) {
    const m = MONSTERS[id];
    const k = 1 + (lvl - 1) * 0.16;
    const spots = [[6, 1], [5, 0], [7, 2], [4, 1], [6, 3], [3, 0], [7, 0], [5, 2]];
    let [x, y] = spots[i % spots.length];
    while (this.unitAt(x, y) || this.map[y][x] !== '.') { x = rnd(N); y = rnd(3); }
    const st = { hp: Math.round(m.hp * k), atk: Math.round(m.atk * k), mag: Math.round(m.mag * k), def: Math.round(m.def * (1 + (lvl - 1) * 0.1)), spd: m.spd, move: m.move };
    return { side: 'foe', id, m, lvl, x, y, hp: st.hp, st, status: {}, cds: { skill: 1 + rnd(2) }, anim: { dx: 0, dy: 0, hit: 0 } };
  }

  // ---------- geometry ----------
  units() { return this.hero ? [this.hero, ...(this.foes || []).filter((f) => f.hp > 0)] : []; }
  unitAt(x, y) { return this.units().find((u) => u.x === x && u.y === y && u.hp > 0); }
  walkable(x, y, fly) { if (x < 0 || y < 0 || x >= N || y >= N) return false; const c = this.map[y][x]; return fly ? c !== 'R' : c === '.'; }
  reachable(from, move, fly, ignoreUnits = false, side = 'hero') {
    const seen = new Map([[from.x + ',' + from.y, 0]]); const q = [[from.x, from.y, 0]];
    while (q.length) {
      const [x, y, d] = q.shift(); if (d >= move) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || !this.walkable(nx, ny, fly)) continue;
        const u = ignoreUnits ? null : this.unitAt(nx, ny);
        if (u && u.side !== side) continue; // can pass allies, never enemies
        seen.set(k, d + 1); q.push([nx, ny, d + 1]);
      }
    }
    for (const k of [...seen.keys()]) { const [x, y] = k.split(',').map(Number); const u = ignoreUnits ? null : this.unitAt(x, y); if (u && !(x === from.x && y === from.y)) seen.delete(k); }
    return seen;
  }
  inRange(a, b, range) { const d = dist(a, b); return d >= range[0] && d <= range[1]; }

  // ---------- input ----------
  cellFromEvent(e) {
    const r = this.cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / N)); const y = Math.floor((e.clientY - r.top) / (r.height / N));
    return x >= 0 && y >= 0 && x < N && y < N ? { x, y } : null;
  }
  tap(e) {
    if (this.busy || this.over) return;
    const c = this.cellFromEvent(e); if (!c) return;
    if (this.mode === 'move') {
      if (this.moveSet.has(c.x + ',' + c.y)) { this.hero.x = c.x; this.hero.y = c.y; this.moved = true; this.sfx('step'); this.mode = 'idle'; this.renderUI(); }
      return;
    }
    if (this.mode === 'target') {
      const k = c.x + ',' + c.y;
      if (!this.targetSet.has(k)) return;
      const act = this.pending; this.mode = 'idle';
      this.doHeroAction(act, c);
      return;
    }
    // idle: tap hero to move, tap foe to inspect
    if (c.x === this.hero.x && c.y === this.hero.y && !this.moved && !this.acted) { this.beginMove(); return; }
    const f = this.unitAt(c.x, c.y);
    if (f && f.side === 'foe') this.say(f.m.name + ' L' + f.lvl + ': ' + f.hp + '/' + f.st.hp + ' HP. ' + f.m.lore + '.');
  }
  beginMove() { this.moveSet = this.reachable(this.hero, this.hero.st.move, false); this.mode = 'move'; this.renderUI(); }
  beginTarget(act) {
    const range = act.kind === 'attack' ? weaponType(this.p).range : SPELLS[act.id].range;
    const set = new Set();
    if (act.kind === 'spell' && SPELLS[act.id].target === 'self') { this.doHeroAction(act, this.hero); return; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = dist(this.hero, { x, y }); if (d < range[0] || d > range[1]) continue;
      const u = this.unitAt(x, y);
      if (act.kind === 'attack' || (act.kind === 'spell' && SPELLS[act.id].target === 'enemy')) { if (u && u.side === 'foe') set.add(x + ',' + y); }
      else if (act.kind === 'spell' && SPELLS[act.id].teleport) { if (!u && this.walkable(x, y, false)) set.add(x + ',' + y); }
      else set.add(x + ',' + y);
    }
    if (!set.size) { this.say('No target in range. Move closer.'); return; }
    this.targetSet = set; this.pending = act; this.mode = 'target'; this.renderUI();
  }

  // ---------- combat math ----------
  damage(att, def, power, stat = 'atk', el = null) {
    let base = att.st[stat] * power * (0.9 + Math.random() * 0.2);
    if (att.side === 'hero' && stat === 'mag' && weaponType(this.p).magBoost) base *= 1 + weaponType(this.p).magBoost;
    let d = Math.max(1, base - def.st.def * 0.6);
    if (def.status.curse) d *= 1.3;
    if (def.status.ward) d *= 0.6;
    if (att.status.curse && att.side === 'hero') d *= 0.85;
    let crit = false;
    if (att.side === 'hero' && Math.random() * 100 < (att.st.crit || 5)) { d *= 1.75; crit = true; }
    return { d: Math.round(d), crit };
  }
  async hit(att, def, dmg, color = '#fff', crit = false) {
    def.hp = Math.max(0, def.hp - dmg);
    def.anim.hit = 1;
    const p = this.px(def);
    this.floats.push({ x: p.x, y: p.y - this.ts * 0.9, text: (crit ? 'CRIT ' : '') + dmg, color: crit ? '#ffd23c' : color, life: 1, size: crit ? 1.25 : 1 });
    this.burst(p.x, p.y - this.ts * 0.4, color, crit ? 26 : 14);
    this.shake = crit ? 10 : 6;
    this.sfx(crit ? 'crit' : 'hit');
    if (def.hp <= 0) { this.sfx('die'); this.floats.push({ x: p.x, y: p.y - this.ts * 1.2, text: def.side === 'hero' ? 'DOWN' : 'Slain', color: '#ff6a5a', life: 1.2, size: 0.9 }); }
    await sleep(240);
  }
  applyStatus(u, status) { for (const [k, v] of Object.entries(status || {})) u.status[k] = Math.max(u.status[k] || 0, v); }

  async lunge(u, to, amt = 0.35) {
    const dx = Math.sign(to.x - u.x) * amt, dy = Math.sign(to.y - u.y) * amt;
    for (let i = 0; i <= 5; i++) { u.anim.dx = dx * i / 5; u.anim.dy = dy * i / 5; await sleep(14); }
    for (let i = 5; i >= 0; i--) { u.anim.dx = dx * i / 5; u.anim.dy = dy * i / 5; await sleep(18); }
  }
  async bolt(from, to, color) {
    const a = this.px(from), b = this.px(to);
    const f = { kind: 'bolt', x: a.x, y: a.y - this.ts * 0.5, tx: b.x, ty: b.y - this.ts * 0.5, color, t: 0 };
    this.fx.push(f);
    for (let i = 0; i <= 10; i++) { f.t = i / 10; await sleep(16); }
    this.fx.splice(this.fx.indexOf(f), 1);
  }

  // ---------- hero actions ----------
  async doHeroAction(act, cell) {
    this.busy = true; this.renderUI();
    const H = this.hero;
    if (act.kind === 'attack') {
      const w = weaponType(this.p); const tgt = this.unitAt(cell.x, cell.y);
      if (w.range[1] > 1 && dist(H, tgt) > 1) await this.bolt(H, tgt, '#f3e7cf'); else await this.lunge(H, tgt);
      for (let i = 0; i < w.hits; i++) { if (tgt.hp <= 0) break; const r = this.damage(H, tgt, w.power, w.stat); await this.hit(H, tgt, r.d, '#fff', r.crit); }
      if (w.cleave) for (const f of this.foes) if (f !== tgt && f.hp > 0 && dist(f, H) === 1) { const r = this.damage(H, f, w.power * 0.6, 'atk'); await this.hit(H, f, r.d, '#ffd9a8'); }
      if (w.pierce) { const dx = Math.sign(tgt.x - H.x), dy = Math.sign(tgt.y - H.y); const b = this.unitAt(tgt.x + dx, tgt.y + dy); if (b && b.side === 'foe') { const r = this.damage(H, b, w.power * 0.7, 'atk'); await this.hit(H, b, r.d, '#ffd9a8'); } }
      this.say('You strike with your ' + this.p.equip.weapon.name + '.');
    } else if (act.kind === 'spell') {
      const s = SPELLS[act.id];
      H.mp -= s.mp; this.sfx('spell');
      if (s.heal) { const amt = Math.round(H.st.hp * s.heal + H.st.mag); H.hp = Math.min(H.st.hp, H.hp + amt); const p = this.px(H); this.floats.push({ x: p.x, y: p.y - this.ts, text: '+' + amt, color: s.color, life: 1, size: 1 }); this.burst(p.x, p.y - this.ts * 0.4, s.color, 20); await sleep(300); }
      if (s.teleport) { this.burst(this.px(H).x, this.px(H).y - this.ts * 0.4, s.color, 18); H.x = cell.x; H.y = cell.y; this.burst(this.px(H).x, this.px(H).y - this.ts * 0.4, s.color, 18); await sleep(260); }
      if (s.target === 'self' && s.status) { this.applyStatus(H, s.status); const p = this.px(H); this.burst(p.x, p.y - this.ts * 0.4, s.color, 24); await sleep(260); }
      if (s.power) {
        const center = s.target === 'self' ? H : cell;
        const victims = this.foes.filter((f) => f.hp > 0 && (s.area ? dist(f, center) <= s.area : f.x === cell.x && f.y === cell.y));
        if (s.target !== 'self') await this.bolt(H, center, s.color);
        else { this.fx.push({ kind: 'ring', x: this.px(H).x, y: this.px(H).y - this.ts * 0.3, r: 0, max: this.ts * (s.area + 0.6), color: s.color, t: 0, life: 1 }); await sleep(220); }
        for (const f of victims) {
          const r = this.damage(H, f, s.power, 'mag', s.el); await this.hit(H, f, r.d, s.color, r.crit);
          if (s.status && f.hp > 0) this.applyStatus(f, s.status);
          if (s.push && f.hp > 0) { const dx = Math.sign(f.x - H.x), dy = Math.sign(f.y - H.y); for (let i = 0; i < s.push; i++) { const nx = f.x + (dx || 0), ny = f.y + (dy || 0); if (this.walkable(nx, ny, f.m.fly) && !this.unitAt(nx, ny)) { f.x = nx; f.y = ny; } } }
        }
      }
      this.say(s.name + ': ' + s.en + '.');
    } else if (act.kind === 'potion') {
      this.p.potions--; const amt = Math.round(H.st.hp * 0.45); H.hp = Math.min(H.st.hp, H.hp + amt);
      const p = this.px(H); this.floats.push({ x: p.x, y: p.y - this.ts, text: '+' + amt, color: '#7ee08a', life: 1, size: 1 }); this.sfx('heal'); await sleep(300);
      this.say('You drink a herbal tonic.');
    } else if (act.kind === 'ether') {
      this.p.ethers--; const amt = Math.round(H.st.mp * 0.6); H.mp = Math.min(H.st.mp, H.mp + amt);
      const p = this.px(H); this.floats.push({ x: p.x, y: p.y - this.ts, text: '+' + amt + ' MP', color: '#4fa3ff', life: 1, size: 1 }); this.sfx('heal'); await sleep(300);
    }
    this.acted = true; this.busy = false;
    if (this.checkEnd()) return;
    await this.endTurn();
  }

  // ---------- turn flow ----------
  async endTurn() {
    if (this.over) return;
    this.busy = true; this.mode = 'idle'; this.renderUI();
    await this.tickStatus(this.hero);
    if (this.checkEnd()) return;
    for (const f of this.foes) {
      if (f.hp <= 0) continue;
      await this.tickStatus(f);
      if (f.hp <= 0) { if (this.checkEnd()) return; continue; }
      if (f.status.stun) { this.floats.push({ x: this.px(f).x, y: this.px(f).y - this.ts, text: 'Stunned', color: '#ffe066', life: 0.8, size: 0.8 }); await sleep(250); continue; }
      await this.foeAct(f);
      if (this.checkEnd()) return;
    }
    for (const u of this.units()) for (const k of Object.keys(u.status)) { u.status[k]--; if (u.status[k] <= 0) delete u.status[k]; }
    this.turn++; this.moved = false; this.acted = false; this.start = { x: this.hero.x, y: this.hero.y };
    this.hero.mp = Math.min(this.hero.st.mp, this.hero.mp + 2);
    this.busy = false;
    if (this.hero.status.stun) { this.say('You are stunned!'); this.acted = true; this.moved = true; await sleep(500); return this.endTurn(); }
    this.say('Turn ' + this.turn + '. Tap your hero to move.');
    this.renderUI();
  }
  async tickStatus(u) {
    const p = this.px(u);
    if (u.status.burn) { const d = Math.max(1, Math.round(u.st.hp * 0.05)); u.hp = Math.max(0, u.hp - d); this.floats.push({ x: p.x, y: p.y - this.ts, text: d + ' burn', color: '#ff8a3c', life: 0.8, size: 0.8 }); await sleep(180); }
    if (u.status.poison) { const d = Math.max(1, Math.round(u.st.hp * 0.07)); u.hp = Math.max(0, u.hp - d); this.floats.push({ x: p.x, y: p.y - this.ts * 0.7, text: d + ' poison', color: '#9ccf3a', life: 0.8, size: 0.8 }); await sleep(180); }
  }

  async foeAct(f) {
    const H = this.hero, m = f.m;
    const skillReady = m.skill && f.cds.skill <= 0;
    const range = m.range;
    // choose destination
    const reach = this.reachable(f, f.st.move, !!m.fly, false, 'foe');
    let best = null, bestScore = -1e9;
    for (const [k, steps] of reach) {
      const [x, y] = k.split(',').map(Number); const d = dist({ x, y }, H);
      let score = -steps * 0.1;
      if (d >= range[0] && d <= range[1]) score += 100 + (m.ai === 'ranged' || m.ai === 'caster' ? d * 2 : -d);
      else score -= Math.abs(d - range[1]) * 3;
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    if (best && (best.x !== f.x || best.y !== f.y)) {
      // animate step by step (straight-line tween is fine for placeholders)
      const sx = f.x, sy = f.y; for (let i = 1; i <= 6; i++) { f.anim.dx = (best.x - sx) * i / 6; f.anim.dy = (best.y - sy) * i / 6; await sleep(22); }
      f.x = best.x; f.y = best.y; f.anim.dx = 0; f.anim.dy = 0;
    }
    f.cds.skill = (f.cds.skill || 0) - 1;
    const d = dist(f, H);
    if (d < range[0] || d > range[1]) return;
    if (skillReady) {
      const sk = m.skill; f.cds.skill = sk.cd;
      this.floats.push({ x: this.px(f).x, y: this.px(f).y - this.ts * 1.3, text: sk.name, color: '#ffb3a8', life: 1, size: 0.85 });
      if (sk.pull) { await this.bolt(f, H, '#9aa0a8'); const dx = Math.sign(f.x - H.x), dy = Math.sign(f.y - H.y); const nx = H.x + dx, ny = H.y + dy; if (this.walkable(nx, ny, false) && !this.unitAt(nx, ny)) { H.x = nx; H.y = ny; } }
      else if (m.ai === 'caster' || m.ai === 'boss' && d > 1) await this.bolt(f, H, m.eye); else await this.lunge(f, H, 0.5);
      const r = this.damage(f, H, sk.power, m.ai === 'caster' || (m.ai === 'boss' && m.mag > m.atk) ? 'mag' : 'atk');
      await this.hit(f, H, r.d, '#ff6a5a');
      if (sk.status) this.applyStatus(H, sk.status);
      this.say(m.name + ' uses ' + sk.name + '!');
    } else {
      if (d > 1) await this.bolt(f, H, m.ai === 'caster' ? m.eye : '#d8c8a8'); else await this.lunge(f, H);
      const r = this.damage(f, H, 1, m.ai === 'caster' ? 'mag' : 'atk');
      await this.hit(f, H, r.d, '#ff6a5a');
    }
  }

  checkEnd() {
    if (this.over) return true;
    if (this.hero.hp <= 0) { this.finish(false); return true; }
    if (this.foes.every((f) => f.hp <= 0)) { this.finish(true); return true; }
    return false;
  }
  finish(win) {
    this.over = true; this.busy = true;
    const xp = this.foes.filter((f) => f.hp <= 0).reduce((a, f) => a + Math.round(f.m.xp * (1 + (f.lvl - 1) * 0.25)), 0);
    const gold = this.foes.filter((f) => f.hp <= 0).reduce((a, f) => a + 4 + f.lvl * 2 + rnd(6), 0);
    this.p.hp = this.hero.hp; this.p.mp = this.hero.mp;
    setTimeout(() => { cancelAnimationFrame(this.raf); this.cv.onpointerdown = null; this.onEnd({ win, xp, gold, kills: this.foes.filter((f) => f.hp <= 0).length, hasBoss: this.foes.some((f) => f.m.ai === 'boss') }); }, 900);
  }

  // ---------- UI ----------
  say(t) { this.log.unshift(t); this.log.length = Math.min(this.log.length, 3); this.renderUI(); }
  renderUI() {
    const H = this.hero, ui = this.ui, p = this.p;
    const w = weaponType(p);
    ui.innerHTML = '';
    const bars = document.createElement('div'); bars.className = 'bhud';
    bars.innerHTML = `<div class="bar"><span>HP</span><i style="--f:${H.hp / H.st.hp};--c:#3f9a5a"></i><b>${H.hp}/${H.st.hp}</b></div>
      <div class="bar"><span>MP</span><i style="--f:${H.mp / H.st.mp};--c:#4fa3ff"></i><b>${H.mp}/${H.st.mp}</b></div>
      <div class="tags">${Object.keys(H.status).map((k) => `<em>${k} ${H.status[k]}</em>`).join('')}</div>`;
    ui.append(bars);
    const row = document.createElement('div'); row.className = 'actions';
    const btn = (label, sub, fn, dis = false, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = `<strong>${label}</strong>${sub ? `<small>${sub}</small>` : ''}`; b.disabled = dis || this.busy || this.over; b.onclick = fn; row.append(b); };
    if (this.mode === 'move' || this.mode === 'target') {
      btn('Cancel', this.mode === 'move' ? 'Pick a gold tile' : 'Pick a red tile', () => { this.mode = 'idle'; this.renderUI(); }, false, 'ghost');
    } else {
      btn('Move', this.moved ? 'Done' : H.st.move + ' tiles', () => this.beginMove(), this.moved || this.acted);
      if (this.moved && !this.acted) btn('Undo', 'move', () => { H.x = this.start.x; H.y = this.start.y; this.moved = false; this.renderUI(); }, false, 'ghost');
      btn(w.kind, w.range[0] === w.range[1] ? 'range ' + w.range[0] : 'range ' + w.range.join('-'), () => this.beginTarget({ kind: 'attack' }), this.acted, 'atk');
      for (const id of p.spells) { const s = SPELLS[id]; btn(s.name, s.mp + ' MP · ' + s.en, () => this.beginTarget({ kind: 'spell', id }), this.acted || H.mp < s.mp, 'spell'); }
      btn('Tonic', '×' + p.potions, () => this.doHeroAction({ kind: 'potion' }), this.acted || p.potions <= 0, 'item');
      btn('Ether', '×' + p.ethers, () => this.doHeroAction({ kind: 'ether' }), this.acted || p.ethers <= 0, 'item');
      btn('End turn', '', () => this.endTurn(), false, 'ghost');
    }
    ui.append(row);
    const log = document.createElement('div'); log.className = 'blog'; log.textContent = this.log[0] || ''; ui.append(log);
  }

  // ---------- render ----------
  resize() {
    const r = this.cv.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.width * dpr);
    this.ts = r.width / N; this.dpr = dpr;
  }
  px(u) { return { x: (u.x + (u.anim ? u.anim.dx : 0) + 0.5) * this.ts, y: (u.y + (u.anim ? u.anim.dy : 0) + 0.9) * this.ts }; }
  burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; this.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, color, life: 1 }); } }
  loop(now) {
    const t = now / 1000;
    if (this.cv.getBoundingClientRect().width / N !== this.ts) this.resize();
    const g = this.g, ts = this.ts, T = this.tiles;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sh = this.shake || 0; this.shake = Math.max(0, sh - 0.6);
    g.save(); g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = this.map[y][x];
      g.fillStyle = (x + y) % 2 ? T.a : T.b; g.fillRect(x * ts, y * ts, ts + 1, ts + 1);
      if (c === 'W') { g.fillStyle = T.water; g.fillRect(x * ts, y * ts, ts + 1, ts + 1); g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x * ts + ts * 0.2, y * ts + ts * (0.5 + 0.05 * Math.sin(t * 2 + x))); g.lineTo(x * ts + ts * 0.8, y * ts + ts * (0.5 + 0.05 * Math.sin(t * 2 + x + 1))); g.stroke(); }
    }
    // highlights
    if (this.mode === 'move') for (const k of this.moveSet.keys()) { const [x, y] = k.split(',').map(Number); g.fillStyle = 'rgba(227,167,47,.28)'; g.fillRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4); g.strokeStyle = 'rgba(227,167,47,.7)'; g.strokeRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4); }
    if (this.mode === 'target') for (const k of this.targetSet) { const [x, y] = k.split(',').map(Number); g.fillStyle = 'rgba(200,52,46,.3)'; g.fillRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4); g.strokeStyle = 'rgba(255,106,90,.85)'; g.strokeRect(x * ts + 2, y * ts + 2, ts - 4, ts - 4); }
    // blockers + units sorted by y for depth
    const draw = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = this.map[y][x]; if (c === 'T' || c === 'R') draw.push({ y: y + 0.5, f: () => this.drawBlock(g, c, x, y, ts, T) }); }
    for (const u of this.units()) draw.push({ y: u.y + (u.anim.dy || 0) + 0.6, f: () => this.drawUnit(g, u, t) });
    draw.sort((a, b) => a.y - b.y).forEach((d) => d.f());
    // fx
    for (const f of this.fx) {
      if (f.kind === 'p') { f.x += f.vx; f.y += f.vy; f.vy += 0.15; f.life -= 0.03; g.globalAlpha = Math.max(0, f.life); g.fillStyle = f.color; g.fillRect(f.x - 2, f.y - 2, 4, 4); }
      if (f.kind === 'bolt') { const x = f.x + (f.tx - f.x) * f.t, y = f.y + (f.ty - f.y) * f.t; g.globalAlpha = 1; g.strokeStyle = f.color; g.lineWidth = 4; g.beginPath(); g.moveTo(x - (f.tx - f.x) * 0.12, y - (f.ty - f.y) * 0.12); g.lineTo(x, y); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
      if (f.kind === 'ring') { f.t += 0.05; f.r = f.max * f.t; g.globalAlpha = Math.max(0, 1 - f.t); g.strokeStyle = f.color; g.lineWidth = 6; g.beginPath(); g.ellipse(f.x, f.y, f.r, f.r * 0.55, 0, 0, Math.PI * 2); g.stroke(); if (f.t >= 1) f.life = 0; else f.life = 1; }
    }
    g.globalAlpha = 1;
    this.fx = this.fx.filter((f) => f.kind === 'bolt' || f.life > 0);
    g.textAlign = 'center';
    for (const f of this.floats) { f.y -= 0.6; f.life -= 0.018; g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5)); g.font = `${Math.round(ts * 0.3 * f.size)}px "Bangers", "Impact", sans-serif`; g.lineWidth = 4; g.strokeStyle = '#120c10'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y); }
    g.globalAlpha = 1; this.floats = this.floats.filter((f) => f.life > 0);
    g.restore();
    for (const u of this.units()) u.anim.hit = Math.max(0, u.anim.hit - 0.08);
    this.raf = requestAnimationFrame(this.loop);
  }
  drawBlock(g, c, x, y, ts, T) {
    const cx = x * ts + ts / 2, by = y * ts + ts * 0.9;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx, by, ts * 0.38, ts * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#120c10'; g.lineWidth = 2;
    if (c === 'T') { g.fillStyle = '#4a3020'; g.fillRect(cx - ts * 0.06, by - ts * 0.5, ts * 0.12, ts * 0.5); g.fillStyle = T.deco; g.beginPath(); g.arc(cx, by - ts * 0.7, ts * 0.36, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = shade(T.deco, 0.15); g.beginPath(); g.arc(cx - ts * 0.1, by - ts * 0.8, ts * 0.14, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = '#6a6070'; g.beginPath(); g.moveTo(cx - ts * 0.38, by); g.lineTo(cx - ts * 0.26, by - ts * 0.5); g.lineTo(cx + ts * 0.1, by - ts * 0.62); g.lineTo(cx + ts * 0.38, by - ts * 0.2); g.lineTo(cx + ts * 0.32, by); g.closePath(); g.fill(); g.stroke(); }
  }
  drawUnit(g, u, t) {
    const p = this.px(u), ts = this.ts;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(p.x, p.y, ts * 0.3, ts * 0.1, 0, 0, Math.PI * 2); g.fill();
    if (u.side === 'hero') {
      if (!this.busy && !this.over && this.mode === 'idle' && !this.moved && !this.acted) { g.strokeStyle = `rgba(227,167,47,${0.5 + 0.5 * Math.sin(t * 5)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, p.y, ts * 0.38, ts * 0.13, 0, 0, Math.PI * 2); g.stroke(); }
      const hero = HEROES.find((h) => h.id === this.p.hero);
      g.save(); if (u.anim.hit > 0.5) g.filter = 'brightness(3)'; drawHero(g, hero, p.x, p.y, ts / 82); g.restore();
    } else {
      const s = ts / 88 * (u.m.ai === 'boss' ? 1.35 : u.m.shape === 'dwarf' || u.m.shape === 'thorn' ? 0.8 : 1);
      const bob = u.m.fly ? Math.sin(t * 3 + u.x) * ts * 0.05 - ts * 0.08 : 0;
      drawMonster(g, u.id, u.m, p.x, p.y + bob, s, t, u.anim.hit);
      // hp bar
      const w = ts * 0.7; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(p.x - w / 2, p.y - ts * 1.05 - (u.m.ai === 'boss' ? ts * 0.4 : 0), w, 5);
      g.fillStyle = '#c8342e'; g.fillRect(p.x - w / 2, p.y - ts * 1.05 - (u.m.ai === 'boss' ? ts * 0.4 : 0), w * u.hp / u.st.hp, 5);
      const st = Object.keys(u.status); if (st.length) { g.font = `${Math.round(ts * 0.16)}px Karla, sans-serif`; g.fillStyle = '#ffe066'; g.textAlign = 'center'; g.fillText(st.join(' '), p.x, p.y - ts * 1.12); }
    }
  }
  destroy() { cancelAnimationFrame(this.raf); this.cv.onpointerdown = null; }
}
