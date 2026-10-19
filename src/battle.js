// Monster Clearer battle. A world is one board that stays full: when a monster dies, the next one
// from the world's queue takes its cell, until the enemy count runs out (the boss comes last).
// Monsters start passive. Hitting them changes their aggression:
//   0 passive · 1 alert (grey hourglass, wakes in N rounds) · 2 ready (yellow, attacks next round) · 3 aggressive (red)
// Sword: free, enrages its target and wakes neighbours. Axe/spear: cost stamina, calm one step.
// Spells: cooldowns, magic damage, put everything they hit to alert.
import { MONSTERS, SPELLS, HEROES, WEAPON_ACTIONS } from './data.js';
import { maxStats, has, rnd, pick } from './state.js';
import { drawMonster, drawHero } from './art.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROLE_COLOR = { buffer: '#4fa3ff', caster: '#c58bff', ranger: '#ffd23c', treasure: '#e3a72f' };
const AGG_COLOR = ['', '#9a9aa6', '#ffd23c', '#ff4a3c'];

export class Battle {
  constructor({ canvas, ui, player, world, onEnd, sfx }) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.ui = ui; this.p = player; this.world = world;
    this.onEnd = onEnd; this.sfx = sfx || (() => {});
    this.C = world.cols; this.R = world.rows;
    this.st = maxStats(player);
    this.hero = { hp: Math.min(player.hp, this.st.hp), max: this.st.hp, stamina: has(player, 'sankofa') ? this.st.stamina : 1, maxSt: this.st.stamina };
    this.potions = this.st.potionSlots;
    this.cds = {};
    this.queue = this.makeQueue();
    this.total = this.queue.length; this.kills = 0; this.xp = 0; this.drops = [];
    this.board = Array.from({ length: this.C * this.R }, () => this.next());
    this.sel = null; this.hover = -1; this.busy = false; this.over = false;
    this.fx = []; this.floats = []; this.round = 1;
    this.msg = 'Monsters are passive until you hit them. Pick an action, then a monster.';
    this.resize(); this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    canvas.onpointerdown = (e) => this.tap(e);
    canvas.onpointermove = (e) => { this.hover = this.cellAt(e); };
    canvas.onpointerleave = () => { this.hover = -1; };
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
    return { id: e.id, m, lvl: e.lvl, hp: Math.round(m.hp * k), max: Math.round(m.hp * k), atk: Math.round(m.atk * k), def: Math.round(m.def * k),
      agg: 0, timer: 0, charge: 0, stun: 0, burn: 0, buffed: false, hit: 0, born: 1, lunge: 0 };
  }

  // ---------- geometry ----------
  rc(i) { return [Math.floor(i / this.C), i % this.C]; }
  idx(r, c) { return r >= 0 && c >= 0 && r < this.R && c < this.C ? r * this.C + c : -1; }
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

  // ---------- actions ----------
  actions() {
    const list = WEAPON_ACTIONS.filter((w) => this.p.level >= w.lvl).map((w) => ({ ...w, kind: 'weapon', key: w.id, stat: 'atk' }));
    for (const [id, s] of Object.entries(SPELLS)) if (this.p.cleared.length >= s.unlock) list.push({ ...s, kind: 'spell', key: id, stat: 'mag', st: 0 });
    return list;
  }
  ready(a) { return this.hero.stamina >= (a.st || 0) && !(this.cds[a.key] > 0); }
  pickAction(a) {
    if (this.busy || this.over || !this.ready(a)) return;
    this.sel = this.sel && this.sel.key === a.key ? null : a; this.sfx('click'); this.renderUI();
  }
  tap(e) {
    if (this.busy || this.over) return;
    const i = this.cellAt(e); if (i < 0 || !this.board[i]) return;
    if (!this.sel) { const m = this.board[i]; this.say(`${m.m.name} L${m.lvl}: ${Math.max(0, m.hp)}/${m.max} HP, attack ${m.atk}${m.m.role ? ' · ' + this.roleText(m.m.role) : ''}.`); return; }
    const a = this.sel; this.sel = null; this.execute(a, i);
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
    this.busy = true;
    this.hero.stamina -= a.st || 0;
    if (a.kind === 'spell') this.cds[a.key] = Math.max(1, a.cd - (has(this.p, 'meditation') ? 1 : 0)) + 1;
    const targets = this.cellsFor(a, i).filter((k) => this.board[k]);
    this.sfx(a.kind === 'spell' ? 'spell' : 'hit');
    this.fx.push({ kind: 'flash', cells: targets, color: a.color || '#fff4dc', life: 1 });
    await sleep(120);
    for (const k of targets) {
      const mon = this.board[k];
      const r = this.dmg(a, mon);
      mon.hp -= r.d; mon.hit = 1;
      this.float(k, (r.crit ? 'CRIT ' : '') + r.d, r.crit ? '#ffd23c' : '#fff', r.crit ? 1.3 : 1);
      // aggression changes
      if (a.provoke) { mon.agg = 3; if (!has(this.p, 'calm')) for (const n of this.neighbours(k)) { const nm = this.board[n]; if (nm.agg === 0) { nm.agg = 1; nm.timer = 2 + rnd(2); } } }
      else if (a.kind === 'spell') { mon.agg = mon.m.role === 'treasure' ? 0 : 1; mon.timer = a.calmTo ? 3 : 2; }
      else if (a.calm) { if (mon.agg === 3) mon.agg = 2; else if (mon.agg === 0) { mon.agg = 1; mon.timer = 2; } }
      if (a.burn) mon.burn = a.burn;
      if (a.stun) mon.stun = a.stun;
      if (mon.m.role === 'treasure') mon.agg = 0;
      if (mon.hp <= 0) await this.kill(k);
    }
    this.shake = Math.min(10, 3 + targets.length);
    this.say(`${a.name}: ${a.en}.`);
    await sleep(160);
    if (this.checkEnd()) return;
    await this.endRound();
  }
  async drink() {
    if (this.busy || this.over || this.potions <= 0) return;
    this.potions--;
    const amt = Math.round((this.hero.max * 0.3 + this.st.mag * 2) * (has(this.p, 'potency') ? 1.5 : 1));
    this.hero.hp = Math.min(this.hero.max, this.hero.hp + amt);
    if (has(this.p, 'bloodthirst')) this.hero.stamina = this.hero.maxSt;
    this.floats.push({ x: this.heroX, y: this.heroY - 70, text: '+' + amt, color: '#7ee08a', life: 1, size: 1 });
    this.sfx('heal'); this.say('Herbal tonic: +' + amt + ' HP. Drinking does not end the round.');
  }
  async kill(k) {
    const mon = this.board[k];
    this.kills++; this.p.stats.kills++;
    this.xp += Math.round(mon.m.xp * (1 + (mon.lvl - 1) * 0.3));
    const tier = this.p.cleared.length + (this.world.lvl >= 8 ? 1 : 0);
    if (mon.m.role === 'treasure') this.drops.push({ tier: Math.max(tier, Math.floor(this.world.lvl / 4)), luck: 0.45 });
    else if (mon.m.boss) { this.drops.push({ tier: Math.floor(this.world.lvl / 4) + 1, luck: 0.5 }, { tier: Math.floor(this.world.lvl / 4), luck: 0.3 }); }
    else if (Math.random() < 0.1) this.drops.push({ tier: Math.floor(this.world.lvl / 4), luck: 0 });
    this.burst(k, mon.m.color); this.sfx('die');
    this.board[k] = this.next();
  }
  async endRound() {
    // burn
    for (let k = 0; k < this.board.length; k++) {
      const m = this.board[k]; if (!m || !m.burn) continue;
      const d = Math.max(1, Math.round(m.max * 0.08)); m.hp -= d; m.burn--; this.float(k, d, '#ff8a3c', 0.8);
      if (m.hp <= 0) await this.kill(k);
    }
    if (this.checkEnd()) return;
    // buffers pick an aggressive ally
    for (const m of this.board) if (m) m.buffed = false;
    for (let k = 0; k < this.board.length; k++) {
      const m = this.board[k]; if (!m || m.m.role !== 'buffer' || m.agg < 2 || m.stun) continue;
      const allies = this.board.filter((x) => x && x !== m && x.agg === 3 && x.atk > 0); if (allies.length) pick(allies).buffed = true;
    }
    // attacks
    const attackers = [];
    for (let k = 0; k < this.board.length; k++) {
      const m = this.board[k]; if (!m) continue;
      if (m.stun) { m.stun--; continue; }
      const role = m.m.role;
      if (role === 'treasure' || role === 'buffer') { if (m.agg === 1 && --m.timer <= 0) m.agg = 2; else if (m.agg === 2) m.agg = 3; continue; }
      if (m.agg === 3) {
        if (role === 'caster') { m.charge++; if (m.charge >= 3) { m.charge = 0; attackers.push([k, 3]); } }
        else attackers.push([k, 1]);
      } else if (m.agg === 2) { if (role === 'ranger') attackers.push([k, 0.7]); m.agg = 3; }
      else if (m.agg === 1) { if (--m.timer <= 0) m.agg = 2; }
    }
    await sleep(120);
    for (const [k, mult] of attackers) {
      const m = this.board[k]; if (!m) continue;
      m.lunge = 1; await sleep(100);
      let d = m.atk * mult * (m.buffed ? 3 : 1) - this.st.def * 0.5;
      if (has(this.p, 'stoneskin')) d *= 0.88;
      d = Math.max(1, Math.round(d * (0.9 + Math.random() * 0.2)));
      this.hero.hp = Math.max(0, this.hero.hp - d);
      this.heroHit = 1; this.shake = 7 + (mult > 1 ? 6 : 0); this.sfx(mult > 1 ? 'crit' : 'hurt');
      this.floats.push({ x: this.heroX + (Math.random() - 0.5) * 40, y: this.heroY - this.heroScale * 80, text: '-' + d, color: '#ff6a5a', life: 1, size: mult > 1 ? 1.3 : 1 });
      await sleep(150);
      if (this.hero.hp <= 0) { this.finish(false); return; }
    }
    for (const key of Object.keys(this.cds)) if (this.cds[key] > 0) this.cds[key]--;
    this.hero.stamina = Math.min(this.hero.maxSt, this.hero.stamina + 1);
    this.round++; this.busy = false;
    const red = this.board.filter((m) => m && m.agg === 3).length;
    this.say(attackers.length ? `${attackers.length} hit${attackers.length > 1 ? 's' : ''} taken. ${red} aggressive.` : `${red} aggressive. Keep it low.`);
  }
  checkEnd() { if (this.kills >= this.total) { this.finish(true); return true; } return false; }
  finish(win) {
    this.over = true; this.busy = true; this.p.hp = this.hero.hp;
    setTimeout(() => { this.destroy(); this.onEnd({ win, xp: this.xp, kills: this.kills, total: this.total, drops: this.drops }); }, 800);
  }

  // ---------- UI ----------
  say(t) { this.msg = t; this.renderUI(); }
  renderUI() {
    const H = this.hero;
    this.ui.innerHTML = `<div class="bhud">
      <div class="bar"><span>HP</span><i style="--f:${H.hp / H.max};--c:#c8342e"></i><b>${H.hp}/${H.max}</b></div>
      <div class="stam">${Array.from({ length: H.maxSt }, (_, k) => `<i class="${k < H.stamina ? 'on' : ''}"></i>`).join('')}<b>stamina</b></div></div>
      <div class="acts2"></div><div class="blog">${this.msg}</div>`;
    const row = this.ui.querySelector('.acts2');
    const PAT = { single: 'Single', row3: 'Row of 3', cross: 'Cross', xcross: 'Diagonal cross', box: '3×3', row: 'Whole row', col: 'Whole column', random4: '4 random' };
    for (const a of this.actions()) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'act ' + a.kind + (this.sel && this.sel.key === a.key ? ' on' : '');
      b.style.setProperty('--ac', a.color || '#f3e7cf');
      const cd = this.cds[a.key] || 0;
      b.innerHTML = `<strong>${a.name}</strong><small>${a.en} · ${PAT[a.pat]}</small><em>${a.kind === 'spell' ? (cd ? 'ready in ' + cd : 'cooldown ' + a.cd) : a.st ? a.st + ' stamina' : 'free'}</em>`;
      b.title = a.note || '';
      b.disabled = this.busy || this.over || !this.ready(a);
      b.onclick = () => this.pickAction(a);
      row.append(b);
    }
    const t = document.createElement('button'); t.type = 'button'; t.className = 'act item';
    t.innerHTML = `<strong>Tonic</strong><small>${this.potions} left this world</small><em>does not end round</em>`;
    t.disabled = this.busy || this.over || this.potions <= 0; t.onclick = () => this.drink(); row.append(t);
  }

  // ---------- render ----------
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.cs = Math.min((r.width - 16) / this.C, (r.height - 130) / this.R);
    this.ox = (r.width - this.cs * this.C) / 2; this.oy = 26;
    this.heroX = r.width / 2; this.heroY = r.height - 4; this.heroScale = Math.max(0.6, Math.min(1.6, (r.height - (this.oy + this.cs * this.R) - 30) / 118));
  }
  cellAt(e) {
    const r = this.cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - r.left - this.ox) / this.cs), rr = Math.floor((e.clientY - r.top - this.oy) / this.cs);
    return this.idx(rr, c);
  }
  float(k, text, color, size) { const [r, c] = this.rc(k); this.floats.push({ x: this.ox + (c + 0.5) * this.cs, y: this.oy + (r + 0.45) * this.cs, text: String(text), color, life: 1, size }); }
  burst(k, color) { const [r, c] = this.rc(k); const x = this.ox + (c + 0.5) * this.cs, y = this.oy + (r + 0.5) * this.cs; for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 4; this.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, color, life: 1 }); } }

  loop(now) {
    const t = now / 1000, rect = this.cv.getBoundingClientRect();
    if (rect.width !== this.w || rect.height !== this.h) this.resize();
    const g = this.g, cs = this.cs, ox = this.ox, oy = this.oy, C = this.C, R = this.R;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.w, this.h);
    const sh = this.shake || 0; this.shake = Math.max(0, sh - 0.7);
    g.save(); g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    // header: kills / total
    g.fillStyle = '#c9b27a'; g.font = '15px Anton, Impact, sans-serif'; g.textAlign = 'left';
    g.fillText(this.world.name.toUpperCase(), ox, 18); g.textAlign = 'right';
    g.fillText(`${this.kills} / ${this.total}  ·  ROUND ${this.round}`, ox + cs * C, 18);
    g.fillStyle = '#2a1f2e'; g.fillRect(ox - 5, oy - 5, cs * C + 10, cs * R + 10);
    g.strokeStyle = '#c9b27a'; g.lineWidth = 3; g.strokeRect(ox - 5, oy - 5, cs * C + 10, cs * R + 10);
    let preview = new Set();
    if (this.sel && this.hover >= 0 && this.board[this.hover] && this.sel.pat !== 'random4') preview = new Set(this.cellsFor(this.sel, this.hover));
    for (let k = 0; k < C * R; k++) {
      const [r, c] = this.rc(k), x = ox + c * cs, y = oy + r * cs, m = this.board[k];
      g.fillStyle = (r + c) % 2 ? '#3a2c40' : '#33273a'; g.fillRect(x, y, cs, cs);
      if (!m) continue;
      const role = m.m.role;
      g.fillStyle = m.m.boss ? '#5a1a1a' : m.agg === 3 ? '#4a2228' : '#2f2436';
      g.fillRect(x + 2, y + 2, cs - 4, cs - 4);
      if (role) { g.strokeStyle = ROLE_COLOR[role]; g.lineWidth = 2.5; g.strokeRect(x + 3, y + 3, cs - 6, cs - 6); }
      if (this.sel) { g.strokeStyle = `rgba(240,138,36,${0.4 + 0.3 * Math.sin(t * 6)})`; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, cs - 10, cs - 10); }
      if (preview.has(k)) { g.fillStyle = 'rgba(255,214,120,.38)'; g.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
      g.save(); g.beginPath(); g.rect(x + 2, y + 2, cs - 4, cs - 4); g.clip();
      const born = m.born; m.born = Math.max(0, born - 0.06);
      g.globalAlpha = 1 - born;
      drawMonster(g, m.id, m.m, x + cs / 2, y + cs * 0.97 + m.lunge * cs * 0.12 + born * cs * 0.3, cs / 128 * (m.m.boss ? 1.15 : 0.95), t + k, m.hit);
      g.restore(); g.globalAlpha = 1;
      // hp bar
      g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x + 3, y + cs - 8, cs - 6, 5);
      g.fillStyle = '#c8342e'; g.fillRect(x + 3, y + cs - 8, (cs - 6) * Math.max(0, m.hp) / m.max, 5);
      // aggression badge (top-right)
      if (m.agg > 0 || m.stun) {
        const bx = x + cs - 18, by = y + 4;
        g.fillStyle = m.stun ? '#4fa3ff' : AGG_COLOR[m.agg]; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 14, by); g.lineTo(bx + 7, by + 8); g.lineTo(bx + 14, by + 16); g.lineTo(bx, by + 16); g.lineTo(bx + 7, by + 8); g.closePath(); g.fill();
        if (m.agg === 1 && !m.stun) { g.fillStyle = '#fff'; g.font = '700 10px Karla, sans-serif'; g.textAlign = 'right'; g.fillText(String(m.timer), bx - 2, by + 12); }
      }
      if (m.m.role === 'caster' && m.charge) { g.fillStyle = '#c58bff'; for (let q = 0; q < m.charge; q++) { g.beginPath(); g.arc(x + 8 + q * 8, y + 9, 3, 0, 6.28); g.fill(); } }
      if (m.buffed) { g.fillStyle = '#4fa3ff'; g.font = '700 11px Karla, sans-serif'; g.textAlign = 'left'; g.fillText('×3', x + 5, y + 14); }
      if (m.burn) { g.fillStyle = '#ff8a3c'; g.beginPath(); g.arc(x + 8, y + cs - 14, 3.5, 0, 6.28); g.fill(); }
      m.hit = Math.max(0, m.hit - 0.08); m.lunge = Math.max(0, m.lunge - 0.1);
    }
    const hero = HEROES.find((h) => h.id === this.p.hero);
    g.save(); if (this.heroHit > 0.5) g.filter = 'brightness(3) saturate(0)'; drawHero(g, hero, this.heroX, this.heroY, this.heroScale); g.restore();
    this.heroHit = Math.max(0, (this.heroHit || 0) - 0.06);
    for (const f of this.fx) {
      if (f.kind === 'p') { f.x += f.vx; f.y += f.vy; f.vy += 0.15; f.life -= 0.03; g.globalAlpha = Math.max(0, f.life); g.fillStyle = f.color; g.fillRect(f.x - 2, f.y - 2, 4, 4); }
      if (f.kind === 'flash') { f.life -= 0.07; g.globalAlpha = Math.max(0, 0.7 * f.life); g.fillStyle = f.color; for (const k of f.cells) { const [r, c] = this.rc(k); g.fillRect(ox + c * cs, oy + r * cs, cs, cs); } }
    }
    g.globalAlpha = 1; this.fx = this.fx.filter((f) => f.life > 0);
    g.textAlign = 'center';
    for (const f of this.floats) { f.y -= 0.7; f.life -= 0.02; g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6)); g.font = `${Math.round(20 * f.size)}px Bangers, Impact, sans-serif`; g.lineWidth = 4; g.strokeStyle = '#120c10'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.color; g.fillText(f.text, f.x, f.y); }
    g.globalAlpha = 1; this.floats = this.floats.filter((f) => f.life > 0);
    g.restore();
    this.raf = requestAnimationFrame(this.loop);
  }
  destroy() { cancelAnimationFrame(this.raf); this.cv.onpointerdown = this.cv.onpointermove = this.cv.onpointerleave = null; }
}
