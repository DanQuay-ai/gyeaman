// Monster-clearer battle: the hero faces a 6x6 board of monsters, one wave at a time.
// Pick an action, then a monster. Only EXPOSED monsters (touching the board edge or an empty cell)
// can be targeted unless the action says "any". Monsters next to each other grow stronger.
// Each monster has an attack timer; when a round ends, timers tick and monsters at 0 strike.
import { MONSTERS, SPELLS, HEROES } from './data.js';
import { maxStats, weaponType, rnd, pick } from './state.js';
import { drawMonster, drawHero } from './art.js';

export const B = 6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- action patterns (row, col offsets) ----------
const PAT = {
  single: [[0, 0]],
  row3: [[0, -1], [0, 0], [0, 1]],
  col3: [[-1, 0], [0, 0], [1, 0]],
  cross: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],
  box: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]],
  row: 'row', col: 'col', exposed: 'exposed',
};

// Weapon basic attack + weapon skill, by weapon type.
export const WEAPON_ACTIONS = {
  afena: [{ id: 'w', name: 'Slash', pat: 'single', power: 1.15, stat: 'atk', st: 0, ends: true },
          { id: 'ws', name: 'Afena Rush', pat: 'cross', power: 1.0, stat: 'atk', st: 2, ends: true }],
  akuma: [{ id: 'w', name: 'Chop', pat: 'row3', power: 0.9, stat: 'atk', st: 0, ends: true },
          { id: 'ws', name: 'Cleave', pat: 'box', power: 0.85, stat: 'atk', st: 3, ends: true, stun: 1 }],
  pea:   [{ id: 'w', name: 'Thrust', pat: 'col3', power: 0.9, stat: 'atk', st: 0, ends: true },
          { id: 'ws', name: 'Impale', pat: 'col', power: 1.0, stat: 'atk', st: 2, ends: true }],
  agyan: [{ id: 'w', name: 'Shoot', pat: 'single', power: 0.95, stat: 'atk', st: 0, ends: true, any: true },
          { id: 'ws', name: 'Volley', pat: 'random4', power: 0.85, stat: 'atk', st: 2, ends: true, any: true }],
  poma:  [{ id: 'w', name: 'Staff Bolt', pat: 'cross', power: 0.6, stat: 'mag', st: 0, ends: true },
          { id: 'ws', name: 'Spirit Lance', pat: 'row', power: 0.9, stat: 'mag', st: 2, ends: true }],
  sekan: [{ id: 'w', name: 'Twin Cut', pat: 'single', power: 0.62, hits: 2, stat: 'atk', st: 0, ends: true },
          { id: 'ws', name: 'Flurry', pat: 'single', power: 0.5, hits: 4, stat: 'atk', st: 2, ends: false }],
};
// Spells as board actions.
export const SPELL_ACTIONS = {
  ogya:     { pat: 'cross', power: 1.25, stat: 'mag', st: 2, ends: true, burn: 2 },
  nkwa:     { self: 'heal', st: 1, ends: false },
  aprannaa: { pat: 'box', power: 1.0, stat: 'mag', st: 3, ends: true, stun: 1 },
  nsuo:     { pat: 'row', power: 1.05, stat: 'mag', st: 2, ends: true },
  sunsum:   { pat: 'single', power: 1.7, stat: 'mag', st: 1, ends: true, any: true },
  aduto:    { pat: 'random5', power: 0.4, stat: 'mag', st: 2, ends: true, poison: 3, any: true },
  nkabom:   { self: 'ward', st: 1, ends: false },
  asase:    { pat: 'exposed', power: 1.2, stat: 'mag', st: 4, ends: true },
};

export class Battle {
  constructor({ canvas, ui, player, region, wave, maxWave, onEnd, sfx }) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.ui = ui; this.p = player;
    this.region = region; this.wave = wave; this.maxWave = maxWave; this.onEnd = onEnd; this.sfx = sfx || (() => {});
    const st = maxStats(player);
    this.st = st;
    this.hero = { hp: Math.min(player.hp, st.hp), max: st.hp, stamina: 3, maxSt: 4 + Math.floor(player.level / 4), status: {} };
    this.board = this.makeBoard();
    this.sel = null; this.hover = null; this.busy = false; this.over = false;
    this.fx = []; this.floats = []; this.round = 1; this.kills = 0; this.xp = 0; this.gold = 0;
    this.msg = 'Pick an action, then a glowing monster.';
    this.resize();
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    canvas.onpointerdown = (e) => this.tap(e);
    canvas.onpointermove = (e) => { this.hover = this.cellAt(e); };
    canvas.onpointerleave = () => { this.hover = null; };
    this.renderUI();
  }

  // ---------- board ----------
  makeBoard() {
    const r = this.region, w = this.wave;
    const boss = w === this.maxWave;
    const lvl = r.lvl + Math.floor((w - 1) / 2);
    const count = Math.min(30, 12 + Math.floor(w * 1.6));
    const cells = Array.from({ length: B * B }, () => null);
    const order = [...cells.keys()].sort(() => Math.random() - 0.5);
    const mk = (id, l, big) => {
      const m = MONSTERS[id], k = 1 + (l - 1) * 0.17;
      return { id, m, lvl: l, hp: Math.round(m.hp * k * (big ? 1 : 0.55)), max: Math.round(m.hp * k * (big ? 1 : 0.55)), atk: Math.round(m.atk * k * (big ? 1 : 0.6)), def: Math.round(m.def * k * 0.7),
        cd: big ? 2 : 3 + rnd(2), timer: 2 + rnd(3), status: {}, hit: 0 };
    };
    for (let i = 0; i < count; i++) cells[order[i]] = mk(pick(r.pool), lvl, false);
    // elites every 5th wave, boss at the end, placed in the inner area so they must be dug out
    const inner = [7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22, 25, 26, 27, 28];
    if (w % 5 === 0 && !boss) cells[pick(inner)] = mk(pick(r.elite), lvl + 1, true);
    if (boss) cells[pick([14, 15, 20, 21])] = mk(r.boss, lvl + 1, true);
    return cells;
  }
  at(r, c) { return r >= 0 && c >= 0 && r < B && c < B ? this.board[r * B + c] : undefined; }
  exposed(i) {
    const r = Math.floor(i / B), c = i % B;
    if (r === 0 || c === 0 || r === B - 1 || c === B - 1) return true;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => !this.at(r + dr, c + dc));
  }
  neighbours(i) { const r = Math.floor(i / B), c = i % B; return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dr, dc]) => this.at(r + dr, c + dc)).length; }
  atkOf(mon, i) { return Math.round(mon.atk * (1 + 0.15 * this.neighbours(i))); }

  // ---------- actions ----------
  actions() {
    const w = this.p.equip.weapon ? this.p.equip.weapon.type : 'afena';
    const list = WEAPON_ACTIONS[w].map((a) => ({ ...a, kind: 'weapon', key: a.id }));
    for (const id of this.p.spells) { const s = SPELLS[id], a = SPELL_ACTIONS[id]; if (a) list.push({ ...a, kind: 'spell', key: id, name: s.name, en: s.en, color: s.color }); }
    return list;
  }
  cellsFor(a, i) {
    if (a.pat === 'exposed') return this.board.map((m, k) => (m && this.exposed(k) ? k : -1)).filter((k) => k >= 0);
    if (a.pat && a.pat.startsWith('random')) return [i];
    const r = Math.floor(i / B), c = i % B;
    if (a.pat === 'row') return Array.from({ length: B }, (_, k) => r * B + k);
    if (a.pat === 'col') return Array.from({ length: B }, (_, k) => k * B + c);
    return PAT[a.pat].map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < B && cc < B).map(([rr, cc]) => rr * B + cc);
  }
  canTarget(a, i) { const m = this.board[i]; return !!m && (a.any || this.exposed(i)); }

  pickAction(a) {
    if (this.busy || this.over) return;
    if (this.hero.stamina < a.st) { this.say('Not enough stamina.'); return; }
    if (a.self) { this.useSelf(a); return; }
    if (a.pat === 'exposed') { this.execute(a, -1); return; }
    this.sel = this.sel && this.sel.key === a.key ? null : a; this.sfx('click'); this.renderUI();
  }
  tap(e) {
    if (this.busy || this.over || !this.sel) return;
    const i = this.cellAt(e); if (i < 0) return;
    if (!this.canTarget(this.sel, i)) { this.say(this.board[i] ? 'That monster is shielded by others. Clear a path to it first.' : 'Empty ground.'); return; }
    const a = this.sel; this.sel = null; this.execute(a, i);
  }

  dmg(a, mon) {
    const base = this.st[a.stat] * a.power * (0.9 + Math.random() * 0.2) * (a.stat === 'mag' && weaponType(this.p).magBoost ? 1 + weaponType(this.p).magBoost : 1);
    let d = Math.max(1, base - mon.def * 0.5);
    const crit = Math.random() * 100 < (this.st.crit || 5);
    if (crit) d *= 1.75;
    return { d: Math.round(d), crit };
  }
  async execute(a, i) {
    this.busy = true; this.hero.stamina -= a.st; this.renderUI();
    let targets;
    if (a.pat === 'random4' || a.pat === 'random5') {
      const alive = this.board.map((m, k) => (m ? k : -1)).filter((k) => k >= 0).sort(() => Math.random() - 0.5);
      targets = [i, ...alive.filter((k) => k !== i)].slice(0, a.pat === 'random4' ? 4 : 5);
    } else targets = this.cellsFor(a, i);
    targets = targets.filter((k) => this.board[k]);
    this.sfx(a.kind === 'spell' ? 'spell' : 'swing');
    this.fx.push({ kind: 'flash', cells: targets, color: a.color || '#f3e7cf', t: 0 });
    await sleep(140);
    for (let h = 0; h < (a.hits || 1); h++) {
      for (const k of targets) {
        const mon = this.board[k]; if (!mon) continue;
        const r = this.dmg(a, mon);
        mon.hp -= r.d; mon.hit = 1;
        if (a.stun) mon.status.stun = Math.max(mon.status.stun || 0, a.stun);
        if (a.burn) mon.status.burn = a.burn;
        if (a.poison) mon.status.poison = a.poison;
        this.float(k, (r.crit ? 'CRIT ' : '') + r.d, r.crit ? '#ffd23c' : '#fff', r.crit ? 1.3 : 1);
        this.sfx(r.crit ? 'crit' : 'hit');
        if (mon.hp <= 0) this.kill(k);
      }
      this.shake = Math.min(12, 4 + targets.length);
      await sleep(170);
    }
    this.say(a.name + (targets.length > 1 ? ' hits ' + targets.length + ' monsters.' : '.'));
    if (this.checkWin()) return;
    if (a.ends) await this.endRound(); else { this.busy = false; this.renderUI(); }
  }
  async useSelf(a) {
    this.busy = true; this.hero.stamina -= a.st; this.sfx('heal');
    if (a.self === 'heal') { const amt = Math.round(this.hero.max * 0.3 + this.st.mag); this.hero.hp = Math.min(this.hero.max, this.hero.hp + amt); this.say('Nkwa restores ' + amt + ' HP.'); }
    if (a.self === 'ward') { this.hero.status.ward = 3; this.say('Unity Ward: damage taken reduced for 3 rounds.'); }
    await sleep(250); this.busy = false; this.renderUI();
  }
  async useItem(kind) {
    if (this.busy || this.over) return;
    if (kind === 'tonic' && this.p.potions > 0) { this.p.potions--; const amt = Math.round(this.hero.max * 0.45); this.hero.hp = Math.min(this.hero.max, this.hero.hp + amt); this.say('Herbal tonic: +' + amt + ' HP.'); }
    else if (kind === 'ether' && this.p.ethers > 0) { this.p.ethers--; this.hero.stamina = Math.min(this.hero.maxSt, this.hero.stamina + 3); this.say('Ether gourd: +3 stamina.'); }
    else return;
    this.sfx('heal'); this.renderUI();
  }
  kill(k) {
    const mon = this.board[k];
    this.board[k] = null; this.kills++;
    this.xp += Math.round(mon.m.xp * (1 + (mon.lvl - 1) * 0.25) * (mon.max > mon.m.hp * 0.8 ? 1 : 0.45));
    this.gold += 1 + Math.floor(mon.lvl / 2) + (Math.random() < 0.3 ? rnd(4) : 0);
    this.burst(k, mon.m.color);
    this.sfx('die');
  }
  async endRound() {
    // status ticks + monster attacks
    const hits = [];
    for (let k = 0; k < this.board.length; k++) {
      const mon = this.board[k]; if (!mon) continue;
      if (mon.status.burn || mon.status.poison) {
        const d = Math.max(1, Math.round(mon.max * (mon.status.poison ? 0.12 : 0.08)));
        mon.hp -= d; this.float(k, d, mon.status.poison ? '#9ccf3a' : '#ff8a3c', 0.8);
        if (mon.status.burn) mon.status.burn--; if (mon.status.poison) mon.status.poison--;
        if (!mon.status.burn) delete mon.status.burn; if (!mon.status.poison) delete mon.status.poison;
        if (mon.hp <= 0) { this.kill(k); continue; }
      }
      if (mon.status.stun) { mon.status.stun--; if (!mon.status.stun) delete mon.status.stun; continue; }
      mon.timer--;
      if (mon.timer <= 0) { mon.timer = mon.cd; hits.push(k); }
    }
    if (this.checkWin()) return;
    await sleep(160);
    for (const k of hits) {
      const mon = this.board[k]; if (!mon) continue;
      mon.lunge = 1; await sleep(110);
      let d = Math.max(1, this.atkOf(mon, k) - this.st.def * 0.6);
      if (this.hero.status.ward) d *= 0.55;
      d = Math.round(d * (0.9 + Math.random() * 0.2));
      this.hero.hp = Math.max(0, this.hero.hp - d);
      this.heroHit = 1; this.shake = 8; this.sfx('hurt');
      this.floats.push({ x: this.heroX, y: this.heroY - 40, text: '-' + d, color: '#ff6a5a', life: 1, size: 1 });
      await sleep(160);
      if (this.hero.hp <= 0) { this.finish(false); return; }
    }
    if (this.hero.status.ward) { this.hero.status.ward--; if (!this.hero.status.ward) delete this.hero.status.ward; }
    this.round++;
    this.hero.stamina = Math.min(this.hero.maxSt, this.hero.stamina + 1);
    this.busy = false;
    this.say(hits.length ? hits.length + ' monster' + (hits.length > 1 ? 's' : '') + ' struck you. Round ' + this.round + '.' : 'Round ' + this.round + '.');
  }
  checkWin() { if (this.board.every((m) => !m)) { this.finish(true); return true; } return false; }
  finish(win) {
    this.over = true; this.busy = true;
    this.p.hp = this.hero.hp;
    setTimeout(() => { this.destroy(); this.onEnd({ win, xp: this.xp, gold: this.gold, kills: this.kills, boss: this.wave === this.maxWave }); }, 700);
  }

  // ---------- UI ----------
  say(t) { this.msg = t; this.renderUI(); }
  renderUI() {
    const H = this.hero, ui = this.ui;
    const acts = this.actions();
    ui.innerHTML = `<div class="bhud">
        <div class="bar"><span>HP</span><i style="--f:${H.hp / H.max};--c:#c8342e"></i><b>${H.hp}/${H.max}</b></div>
        <div class="stam">${Array.from({ length: H.maxSt }, (_, k) => `<i class="${k < H.stamina ? 'on' : ''}"></i>`).join('')}<b>${H.stamina}/${H.maxSt} stamina</b></div>
      </div>
      <div class="acts2"></div>
      <div class="blog">${this.msg}</div>`;
    const row = ui.querySelector('.acts2');
    for (const a of acts) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'act ' + a.kind + (this.sel && this.sel.key === a.key ? ' on' : '');
      b.style.setProperty('--ac', a.color || '#f3e7cf');
      const what = a.self ? (a.self === 'heal' ? 'Heal self' : 'Ward self') : (a.pat === 'exposed' ? 'All exposed' : (a.pat.startsWith('random') ? a.pat.slice(6) + ' random' : a.pat === 'row3' ? 'Row of 3' : a.pat === 'col3' ? 'Column of 3' : a.pat === 'box' ? '3×3' : a.pat === 'row' ? 'Whole row' : a.pat === 'col' ? 'Whole column' : a.pat === 'cross' ? 'Cross' : 'Single')) + (a.hits > 1 ? ' ×' + a.hits : '') + (a.any ? ' · any target' : '');
      b.innerHTML = `<strong>${a.name}</strong><small>${what}</small><em>${a.st ? a.st + ' st' : 'free'}${a.ends ? '' : ' · extra turn'}</em>`;
      b.disabled = this.busy || this.over || H.stamina < a.st;
      b.onclick = () => this.pickAction(a);
      row.append(b);
    }
    const it = (label, sub, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'act item'; b.innerHTML = `<strong>${label}</strong><small>${sub}</small><em>extra turn</em>`; b.disabled = dis || this.busy || this.over; b.onclick = fn; row.append(b); };
    it('Tonic', '×' + this.p.potions + ' · +45% HP', () => this.useItem('tonic'), this.p.potions <= 0);
    it('Ether', '×' + this.p.ethers + ' · +3 stamina', () => this.useItem('ether'), this.p.ethers <= 0);
  }

  // ---------- render ----------
  resize() {
    const r = this.cv.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.cs = Math.min((r.width - 16) / B, (r.height - 110) / B);
    this.ox = (r.width - this.cs * B) / 2; this.oy = 8;
    this.heroX = r.width / 2; this.heroY = this.oy + this.cs * B + 96;
  }
  cellAt(e) {
    const r = this.cv.getBoundingClientRect();
    const x = e.clientX - r.left - this.ox, y = e.clientY - r.top - this.oy;
    const c = Math.floor(x / this.cs), rr = Math.floor(y / this.cs);
    return c >= 0 && rr >= 0 && c < B && rr < B ? rr * B + c : -1;
  }
  float(k, text, color, size) { const r = Math.floor(k / B), c = k % B; this.floats.push({ x: this.ox + (c + 0.5) * this.cs, y: this.oy + (r + 0.4) * this.cs, text: String(text), color, life: 1, size }); }
  burst(k, color) { const r = Math.floor(k / B), c = k % B; const x = this.ox + (c + 0.5) * this.cs, y = this.oy + (r + 0.5) * this.cs; for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 4; this.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, color, life: 1 }); } }

  loop(now) {
    const t = now / 1000;
    const rect = this.cv.getBoundingClientRect(); if (rect.width !== this.w || rect.height !== this.h) this.resize();
    const g = this.g, cs = this.cs, ox = this.ox, oy = this.oy;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    const sh = this.shake || 0; this.shake = Math.max(0, sh - 0.7);
    g.save(); g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    // board frame
    g.fillStyle = '#2a1f2e'; g.fillRect(ox - 6, oy - 6, cs * B + 12, cs * B + 12);
    g.strokeStyle = '#c9b27a'; g.lineWidth = 3; g.strokeRect(ox - 6, oy - 6, cs * B + 12, cs * B + 12);
    // preview area
    let preview = new Set();
    if (this.sel && this.hover !== null && this.hover >= 0 && this.canTarget(this.sel, this.hover) && !(this.sel.pat || '').startsWith('random')) preview = new Set(this.cellsFor(this.sel, this.hover));
    for (let k = 0; k < B * B; k++) {
      const r = Math.floor(k / B), c = k % B, x = ox + c * cs, y = oy + r * cs, m = this.board[k];
      g.fillStyle = (r + c) % 2 ? '#3a2c40' : '#33273a'; g.fillRect(x, y, cs, cs);
      if (!m) continue;
      const exp = this.exposed(k);
      const tgt = this.sel && this.canTarget(this.sel, k);
      g.fillStyle = m.m.ai === 'boss' ? '#5a1a1a' : exp ? '#4a3550' : '#2b2030';
      g.fillRect(x + 2, y + 2, cs - 4, cs - 4);
      if (tgt) { g.strokeStyle = `rgba(240,138,36,${0.55 + 0.35 * Math.sin(t * 6)})`; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, cs - 6, cs - 6); }
      if (preview.has(k)) { g.fillStyle = 'rgba(255,214,120,.35)'; g.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
      g.save(); g.beginPath(); g.rect(x + 2, y + 2, cs - 4, cs - 4); g.clip();
      g.globalAlpha = exp ? 1 : 0.55;
      const lunge = m.lunge ? m.lunge * cs * 0.12 : 0;
      drawMonster(g, m.id, m.m, x + cs / 2, y + cs * 0.96 + lunge, cs / 128 * (m.m.ai === 'boss' ? 1.15 : 0.95), t + k, m.hit);
      g.restore();
      // timer + hp
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x + 3, y + cs - 9, cs - 6, 6);
      g.fillStyle = '#c8342e'; g.fillRect(x + 3, y + cs - 9, (cs - 6) * Math.max(0, m.hp) / m.max, 6);
      const urgent = m.timer <= 1 && !m.status.stun;
      g.fillStyle = urgent ? '#c8342e' : '#120c10'; g.fillRect(x + cs - 20, y + 3, 17, 16);
      g.fillStyle = '#fff'; g.font = '700 12px Karla, sans-serif'; g.textAlign = 'center'; g.fillText(m.status.stun ? 'z' : String(m.timer), x + cs - 11.5, y + 15);
      const nb = this.neighbours(k); if (nb >= 2) { g.fillStyle = '#ffb347'; g.font = '700 10px Karla, sans-serif'; g.textAlign = 'left'; g.fillText('+' + nb * 15 + '%', x + 4, y + 13); }
      if (m.status.burn || m.status.poison) { g.fillStyle = m.status.poison ? '#9ccf3a' : '#ff8a3c'; g.beginPath(); g.arc(x + 9, y + cs - 16, 4, 0, 6.28); g.fill(); }
      m.hit = Math.max(0, m.hit - 0.08); if (m.lunge) m.lunge = Math.max(0, m.lunge - 0.1);
    }
    // wave label + hero
    g.fillStyle = '#c9b27a'; g.font = '16px Anton, Impact, sans-serif'; g.textAlign = 'left';
    g.fillText('WAVE ' + this.wave + ' / ' + this.maxWave, ox, oy + cs * B + 26);
    g.textAlign = 'right'; g.fillText(this.region.name.toUpperCase(), ox + cs * B, oy + cs * B + 26);
    const hero = HEROES.find((h) => h.id === this.p.hero);
    g.save(); if (this.heroHit > 0.5) g.filter = 'brightness(3) saturate(0)'; drawHero(g, hero, this.heroX, this.heroY, 0.75); g.restore();
    this.heroHit = Math.max(0, (this.heroHit || 0) - 0.06);
    // fx
    for (const f of this.fx) {
      if (f.kind === 'p') { f.x += f.vx; f.y += f.vy; f.vy += 0.15; f.life -= 0.03; g.globalAlpha = Math.max(0, f.life); g.fillStyle = f.color; g.fillRect(f.x - 2, f.y - 2, 4, 4); }
      if (f.kind === 'flash') { f.t += 0.06; f.life = 1 - f.t; g.globalAlpha = Math.max(0, 0.7 * (1 - f.t)); g.fillStyle = f.color; for (const k of f.cells) { const r = Math.floor(k / B), c = k % B; g.fillRect(ox + c * cs, oy + r * cs, cs, cs); } }
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
