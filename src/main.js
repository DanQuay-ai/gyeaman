// Gyeaman RPG — screens and game flow.
import { HEROES, REGIONS, SPELLS, RARITY, WEAPON_TYPES, MONSTERS, xpForLevel, GEAR_BASES } from './data.js';
import { newPlayer, maxStats, weaponType, gainXp, rollLoot, makeGear, save, load, wipe, availableSpells, rnd, pick, heroOf } from './state.js';
import { drawHero, drawGearIcon, drawMonster, img as imgAsset } from './art.js';
import { Battle, SPELL_ACTIONS } from './battle.js';
import { sfx, unlockAudio } from './sfx.js';

const app = document.getElementById('app');
let P = load();
let battle = null;

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function screen(node) { if (battle) { battle.destroy(); battle = null; } app.innerHTML = ''; app.append(node); window.scrollTo(0, 0); }
function toast(msg) { const t = h(`<div class="toast">${esc(msg)}</div>`); document.body.append(t); setTimeout(() => t.remove(), 2400); }

function portrait(hero, w, hgt, opts) {
  const c = document.createElement('canvas'); const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = w * dpr; c.height = hgt * dpr; c.style.width = w + 'px'; c.style.height = hgt + 'px';
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const draw = () => { g.clearRect(0, 0, w, hgt); drawHero(g, hero, w / 2, hgt - 6, (hgt - 14) / 112, opts); };
  draw(); setTimeout(draw, 400); // redraw if real art finished loading
  return c;
}
function gearCanvas(item, size) {
  const c = document.createElement('canvas'); const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = size * dpr; c.height = size * dpr; c.style.width = size + 'px'; c.style.height = size + 'px';
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const draw = () => { g.clearRect(0, 0, size, size); drawGearIcon(g, item, 1, 1, size - 2, item ? RARITY[item.rarity].color : null); };
  draw(); setTimeout(draw, 400);
  return c;
}
const statLine = (st) => Object.entries(st).map(([k, v]) => `<span>+${v} ${k.toUpperCase()}</span>`).join('');

// ---------------- title ----------------
function title() {
  const s = h(`<section class="title">
    <div class="brush">GYEAMAN</div>
    <p class="sub">Monster hunter of the Akan forests</p>
    <div class="col">
      ${P ? `<button class="primary" id="cont">Continue: ${esc(P.name)}, level ${P.level}</button>` : ''}
      <button class="${P ? 'ghost' : 'primary'}" id="new">${P ? 'New hunter' : 'Begin'}</button>
    </div>
    <p class="fine">Grid tactics RPG. Your progress saves in this browser.</p>
  </section>`);
  screen(s);
  s.querySelector('#new').onclick = () => { unlockAudio(); if (P && !s.querySelector('#new').dataset.sure) { s.querySelector('#new').dataset.sure = 1; s.querySelector('#new').textContent = 'Tap again to replace your hunter'; return; } select(); };
  const c = s.querySelector('#cont'); if (c) c.onclick = () => { unlockAudio(); hub(); };
}

// ---------------- hero select ----------------
function select() {
  const s = h(`<section class="select"><h1>Choose your hunter</h1><div class="grid8"></div><div class="detail"></div></section>`);
  const grid = s.querySelector('.grid8'), det = s.querySelector('.detail');
  let chosen = HEROES[0];
  const show = (hero) => {
    chosen = hero; [...grid.children].forEach((c) => c.classList.toggle('on', c.dataset.id === hero.id));
    const b = hero.base, w = WEAPON_TYPES[hero.weapon];
    det.innerHTML = `<div class="dport"></div><div class="dtext"><div class="eyebrow">${hero.day} · ${hero.title}</div><h2>${hero.name}</h2><p>${esc(hero.bio)}</p>
      <div class="stats">${['hp', 'atk', 'mag', 'def', 'spd', 'move'].map((k) => `<div><b>${b[k]}</b><span>${k.toUpperCase()}</span></div>`).join('')}</div>
      <p class="wpn">Starts with ${w.name} (${w.kind}): ${w.note}.</p>
      <button class="primary" id="pick">Hunt as ${hero.name}</button></div>`;
    det.querySelector('.dport').append(portrait(hero, 150, 220));
    det.querySelector('#pick').onclick = () => { P = newPlayer(chosen.id); save(P); sfx('level'); hub(); };
  };
  for (const hero of HEROES) {
    const card = h(`<button class="hcard" data-id="${hero.id}" type="button"><span class="nm">${hero.name}</span><span class="tt">${hero.title}</span></button>`);
    card.prepend(portrait(hero, 76, 110)); card.onclick = () => { sfx('click'); show(hero); };
    grid.append(card);
  }
  screen(s); show(chosen);
}

// ---------------- world map (hub) ----------------
const WAVES = { forest: 10, marsh: 12, grove: 14, gate: 16 };
const MAP_POS = { kumasi: [0.66, 0.36], forest: [0.22, 0.32], marsh: [0.18, 0.74], grove: [0.5, 0.66], gate: [0.84, 0.72] };
let mapSel = 'forest';
function prog(id) { P.progress = P.progress || {}; return (P.progress[id] = P.progress[id] || { wave: 1, best: 0 }); }

function drawMap(g, w, h, t) {
  // placeholder painted map; replaced by assets/map.png when present
  const im = mapImg(); if (im.ok) { g.drawImage(im.el, 0, 0, w, h); return; }
  g.fillStyle = '#7fae5a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2f6b3a'; g.beginPath(); g.ellipse(w * 0.2, h * 0.3, w * 0.28, h * 0.32, 0.2, 0, 6.28); g.fill();
  for (let i = 0; i < 60; i++) { const x = (i * 97) % (w * 0.45), y = (i * 53) % (h * 0.6); g.fillStyle = i % 2 ? '#24572e' : '#3b7a40'; g.beginPath(); g.arc(x + 10, y + 10, 9, 0, 6.28); g.fill(); }
  g.fillStyle = '#5e7a62'; g.beginPath(); g.ellipse(w * 0.17, h * 0.78, w * 0.2, h * 0.16, 0, 0, 6.28); g.fill();
  g.fillStyle = '#8a5a3a'; g.beginPath(); g.moveTo(w * 0.6, h); g.lineTo(w * 0.78, h * 0.42); g.lineTo(w, h * 0.3); g.lineTo(w, h); g.fill();
  g.fillStyle = '#a06a44'; g.beginPath(); g.moveTo(w * 0.38, h * 0.85); g.lineTo(w * 0.5, h * 0.52); g.lineTo(w * 0.62, h * 0.85); g.fill();
  g.strokeStyle = '#4f8fd0'; g.lineWidth = w * 0.025; g.beginPath(); g.moveTo(0, h * 0.95); g.bezierCurveTo(w * 0.3, h * 0.82, w * 0.55, h * 0.98, w * 0.8, h * 0.88); g.stroke();
  g.fillStyle = '#d9c9a0'; g.beginPath(); g.ellipse(w * 0.66, h * 0.36, w * 0.11, h * 0.09, 0, 0, 6.28); g.fill();
  g.strokeStyle = '#8a7a6a'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; g.fillStyle = '#b5523a'; g.fillRect(w * 0.66 + Math.cos(a) * w * 0.07 - 3, h * 0.36 + Math.sin(a) * h * 0.055 - 3, 6, 6); }
}
function mapImg() { return imgAsset('assets/map.png'); }

function hub() {
  const st = maxStats(P), need = xpForLevel(P.level);
  const s = h(`<section class="hub">
    <div class="mapwrap"><canvas id="map"></canvas></div>
    <div class="loc"></div>
    <div class="dock">
      <div class="dk stats"><div class="row"><b>${st.atk}</b><span>ATK</span></div><div class="row"><b>${st.def}</b><span>DEF</span></div><div class="row"><b>${st.mag}</b><span>MAG</span></div>
        <button id="skills" class="dbtn">Skills · Lv ${P.level}</button></div>
      <div class="dk mid"><div class="hp"><i style="--f:${P.hp / st.hp}"></i><span>${P.hp}/${st.hp}</span></div>
        <div class="slots"></div>
        <div class="xp"><i style="--f:${P.xp / need}"></i><span>Lv ${P.level} · ${P.xp}/${need} XP</span></div></div>
      <div class="dk right"><button id="rest" class="dbtn">Rest</button><button id="bag" class="dbtn">Bag (${P.bag.length})</button>
        <div class="gold">${P.gold} gold · tonic ×${P.potions} · ether ×${P.ethers}</div></div>
    </div>
    <p class="fine">Kills ${P.stats.kills} · Bosses ${P.stats.bosses} · <button class="link" id="wipe">Delete save</button></p>
  </section>`);
  screen(s);
  const slots = s.querySelector('.slots');
  for (const k of ['weapon', 'head', 'body', 'charm']) { const b = h(`<button class="slotb" type="button" title="${k}"></button>`); b.append(gearCanvas(P.equip[k], 40)); b.onclick = () => gear(hub); slots.append(b); }
  s.querySelector('#skills').onclick = () => spells(hub);
  s.querySelector('#bag').onclick = () => gear(hub);
  s.querySelector('#rest').onclick = () => { P.hp = st.hp; save(P); sfx('heal'); toast('Rested. HP full.'); hub(); };
  s.querySelector('#wipe').onclick = (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to delete'; return; } wipe(); P = null; title(); };
  // map canvas
  const cv = s.querySelector('#map'), dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; return r; };
  let rect = size();
  const places = [{ id: 'kumasi', name: 'Kumasi' }, ...REGIONS.map((r) => ({ id: r.id, name: r.name, r }))];
  let raf;
  const draw = (now) => {
    if (!cv.isConnected) return cancelAnimationFrame(raf);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, hh = rect.height, t = now / 1000;
    drawMap(g, w, hh, t);
    for (const p of places) {
      const [px, py] = MAP_POS[p.id], x = px * w, y = py * hh;
      const open = p.id === 'kumasi' || P.unlocked.includes(p.id);
      g.globalAlpha = open ? 1 : 0.45;
      if (p.r) drawMonster(g, p.r.boss, MONSTERS[p.r.boss], x, y + 18, 0.3, t, 0);
      g.globalAlpha = 1;
      if (mapSel === p.id) { const k = 26 + 3 * Math.sin(t * 4); g.strokeStyle = '#e8c35a'; g.lineWidth = 3; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(x + dx * k, y + dy * k * 0.6); g.lineTo(x + dx * k, y + dy * (k * 0.6 + 10)); g.moveTo(x + dx * k, y + dy * k * 0.6); g.lineTo(x + dx * (k - 10), y + dy * k * 0.6); g.stroke(); } }
      g.font = '13px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(20,12,16,.85)'; g.strokeText(p.name, x, y + 34); g.fillStyle = open ? '#fff6dc' : '#bbb'; g.fillText(p.name, x, y + 34);
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  cv.onpointerdown = (e) => {
    rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
    let best = null, bd = 0.08;
    for (const p of places) { const [px, py] = MAP_POS[p.id]; const d = Math.hypot(px - x, (py - y) * 0.75); if (d < bd) { bd = d; best = p.id; } }
    if (best) { mapSel = best; sfx('click'); showLoc(s.querySelector('.loc')); }
  };
  showLoc(s.querySelector('.loc'));
}

function showLoc(el) {
  if (mapSel === 'kumasi') {
    el.innerHTML = `<div class="eyebrow">Capital of the Asante</div><h3>Kumasi</h3><p>The Kejetia market sells tonics, ether gourds and gear.</p><button class="primary" id="mk">Enter the market</button>`;
    el.querySelector('#mk').onclick = shop; return;
  }
  const r = REGIONS.find((x) => x.id === mapSel), open = P.unlocked.includes(r.id), pr = prog(r.id), max = WAVES[r.id];
  el.innerHTML = `<div class="eyebrow">${open ? 'Monster level ' + r.lvl + '+' : 'Locked'}${P.cleared.includes(r.id) ? ' · Cleared' : ''}</div><h3>${r.name}</h3><p>${r.desc}</p>
    <p class="fine">Waves ${max} · checkpoint every 5 · boss: ${MONSTERS[r.boss].name} · best wave ${pr.best}</p>
    ${open ? `<button class="primary" id="go">Fight wave ${pr.wave}</button>` : `<p class="fine">Defeat the boss of the previous region to open this path.</p>`}`;
  if (open) el.querySelector('#go').onclick = () => { if (P.hp <= 0) return toast('Rest first.'); fight(r); };
}

function fight(region) {
  const pr = prog(region.id), max = WAVES[region.id];
  const s = h(`<section class="battle2"><header class="bar"><button class="back" id="flee">Retreat</button><span class="place">${region.name}</span><span class="lv">${esc(P.name)} Lv ${P.level}</span></header>
    <div class="bwrap"><canvas id="bc"></canvas></div><div class="bui"></div></section>`);
  screen(s);
  battle = new Battle({ canvas: s.querySelector('#bc'), ui: s.querySelector('.bui'), player: P, region, wave: pr.wave, maxWave: max, sfx, onEnd: (r) => afterFight(region, r) });
  s.querySelector('#flee').onclick = () => { if (battle) { P.hp = battle.hero.hp; battle.destroy(); battle = null; } pr.wave = Math.max(1, Math.floor((pr.wave - 1) / 5) * 5 + 1); save(P); toast('You retreat to the last checkpoint.'); hub(); };
}

function afterFight(region, r) {
  battle = null;
  const pr = prog(region.id), max = WAVES[region.id];
  const msgs = gainXp(P, r.win ? r.xp : Math.floor(r.xp / 2));
  P.gold += r.win ? r.gold : Math.floor(r.gold / 2); P.stats.kills += r.kills;
  const drops = [];
  if (!r.win) {
    pr.wave = Math.max(1, Math.floor((pr.wave - 1) / 5) * 5 + 1);
    P.hp = 0; save(P); sfx('lose');
    const s = h(`<section class="result lose"><div class="brush red">Fallen</div><p>You crawl back to Kumasi. Rest to recover. Progress returns to wave ${pr.wave} (last checkpoint).</p>
      <ul><li>+${Math.floor(r.xp / 2)} XP · +${Math.floor(r.gold / 2)} gold</li>${msgs.map((m) => `<li class="up">${m}</li>`).join('')}</ul><button class="primary" id="ok">Back to the map</button></section>`);
    screen(s); s.querySelector('#ok').onclick = hub; return;
  }
  const ilvl = region.lvl + Math.floor((pr.wave - 1) / 2);
  if (Math.random() < (r.boss ? 1 : pr.wave % 5 === 0 ? 0.9 : 0.4)) drops.push(rollLoot(ilvl, r.boss ? 0.35 : pr.wave % 5 === 0 ? 0.2 : 0));
  if (r.boss) drops.push(rollLoot(ilvl + 1, 0.3));
  if (Math.random() < 0.25) { P.potions++; drops.push(null); }
  P.bag.push(...drops.filter(Boolean));
  pr.best = Math.max(pr.best, pr.wave);
  let extra = '';
  if (r.boss) {
    P.stats.bosses++; if (!P.cleared.includes(region.id)) P.cleared.push(region.id);
    const next = REGIONS[REGIONS.indexOf(region) + 1]; if (next && !P.unlocked.includes(next.id)) { P.unlocked.push(next.id); extra = next.name + ' is now open on the map.'; }
    pr.wave = 1;
  } else pr.wave++;
  save(P); sfx(msgs.length ? 'level' : 'win');
  const s = h(`<section class="result"><div class="brush">${r.boss ? 'Boss slain' : 'Wave cleared'}</div>${extra ? `<p>${extra}</p>` : ''}
    <ul><li>+${r.xp} XP · +${r.gold} gold · ${r.kills} monsters</li>${drops.includes(null) ? '<li>Found a herbal tonic</li>' : ''}${msgs.map((m) => `<li class="up">${m}</li>`).join('')}</ul>
    <div class="drops"></div>
    <div class="menu">${r.boss ? '' : `<button class="primary" id="next"><strong>Next wave (${pr.wave}/${max})</strong><small>HP carries over: ${P.hp}/${maxStats(P).hp}</small></button>`}
      <button id="gearb"><strong>Gear</strong><small>Equip new drops</small></button>
      <button class="ghost" id="map"><strong>Back to the map</strong><small>Progress is saved at wave ${pr.wave}</small></button></div></section>`);
  drops.filter(Boolean).forEach((d) => s.querySelector('.drops').append(itemCard(d)));
  screen(s);
  const nb = s.querySelector('#next'); if (nb) nb.onclick = () => fight(region);
  s.querySelector('#gearb').onclick = () => gear(() => afterFightMenu(region));
  s.querySelector('#map').onclick = hub;
}
function afterFightMenu(region) {
  const pr = prog(region.id);
  const s = h(`<section><div class="menu"><button class="primary" id="next"><strong>Next wave (${pr.wave}/${WAVES[region.id]})</strong><small>HP ${P.hp}/${maxStats(P).hp}</small></button><button class="ghost" id="map"><strong>Back to the map</strong></button></div></section>`);
  screen(s); s.querySelector('#next').onclick = () => fight(region); s.querySelector('#map').onclick = hub;
}

// ---------------- gear ----------------
function itemCard(it, actions = []) {
  const r = RARITY[it.rarity];
  const el = h(`<div class="item" style="--rc:${r.color}"><div class="ic"></div><div class="it"><div class="eyebrow" style="color:${r.color}">${r.name} ${it.slot}${it.type ? ' · ' + WEAPON_TYPES[it.type].kind : ''} · iLvl ${it.ilvl}</div>
    <strong>${esc(it.name)}</strong><div class="sl">${statLine(it.stats)}</div><div class="acts"></div></div></div>`);
  el.querySelector('.ic').append(gearCanvas(it, 52));
  for (const [label, fn, cls] of actions) { const b = h(`<button type="button" class="${cls || ''}">${label}</button>`); b.onclick = fn; el.querySelector('.acts').append(b); }
  return el;
}
function gear(back) {
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">Gear</span></header><div class="slots"></div><h3 class="pad">Equipped by ${esc(P.name)}</h3><div class="eq"></div><h3 class="pad">Bag (${P.bag.length})</h3><div class="bag"></div></section>`);
  const slots = s.querySelector('.slots');
  for (const k of ['weapon', 'head', 'body', 'charm']) { const it = P.equip[k]; const d = h(`<div class="slot"><span>${k}</span></div>`); d.prepend(gearCanvas(it, 60)); slots.append(d); }
  for (const k of ['weapon', 'head', 'body', 'charm']) { const it = P.equip[k]; if (it) s.querySelector('.eq').append(itemCard(it, k === 'weapon' ? [] : [['Unequip', () => { P.bag.push(it); P.equip[k] = null; clampHp(); save(P); gear(back); }, 'ghost']])); }
  const bag = s.querySelector('.bag');
  if (!P.bag.length) bag.append(h('<p class="fine pad">Your bag is empty. Monsters drop gear; the market sells some.</p>'));
  [...P.bag].sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl).forEach((it) => {
    const cur = P.equip[it.slot];
    const diff = Object.keys({ ...it.stats, ...(cur ? cur.stats : {}) }).map((k) => { const d = (it.stats[k] || 0) - (cur ? cur.stats[k] || 0 : 0); return d ? `<em class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : ''}${d} ${k.toUpperCase()}</em>` : ''; }).join(' ');
    const card = itemCard(it, [['Equip', () => { P.bag.splice(P.bag.indexOf(it), 1); if (cur) P.bag.push(cur); P.equip[it.slot] = it; clampHp(); sfx('equip'); save(P); gear(back); }, 'primary'],
      ['Sell ' + it.value + 'g', () => { P.bag.splice(P.bag.indexOf(it), 1); P.gold += it.value; sfx('coin'); save(P); gear(back); }, 'ghost']]);
    card.querySelector('.sl').insertAdjacentHTML('beforeend', `<div class="cmp">vs equipped: ${diff || 'same'}</div>`);
    bag.append(card);
  });
  screen(s); s.querySelector('#b').onclick = back;
}
function clampHp() { const st = maxStats(P); P.hp = Math.min(P.hp, st.hp); P.mp = Math.min(P.mp, st.mp); }

// ---------------- spells ----------------
function spells(back) {
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">Spells · ${P.spells.length}/4 equipped</span></header><div class="spl"></div></section>`);
  const list = s.querySelector('.spl');
  for (const [id, sp] of Object.entries(SPELLS)) {
    const known = sp.lvl <= P.level, on = P.spells.includes(id);
    const row = h(`<button type="button" class="spell ${on ? 'on' : ''}" ${known ? '' : 'disabled'} style="--sc:${sp.color}">
      <i></i><div><strong>${sp.name}</strong> <span>${sp.en}</span><small>${known ? SPELL_ACTIONS[id].st + ' stamina · ' + (SPELL_ACTIONS[id].self ? 'self' : SPELL_ACTIONS[id].pat) + (sp.status ? ' · ' + Object.keys(sp.status).join(', ') : '') + (SPELL_ACTIONS[id].ends ? '' : ' · extra turn') : 'Learned at level ' + sp.lvl}</small></div><b>${on ? 'Equipped' : known ? 'Equip' : 'Lv ' + sp.lvl}</b></button>`);
    if (known) row.onclick = () => {
      if (on) { if (P.spells.length > 1) P.spells = P.spells.filter((x) => x !== id); }
      else if (P.spells.length < 4) P.spells.push(id); else return toast('Unequip a spell first (max 4).');
      sfx('click'); save(P); spells(back);
    };
    list.append(row);
  }
  screen(s); s.querySelector('#b').onclick = back;
}

// ---------------- shop ----------------
let stock = null;
function shop() {
  if (!stock || stock.level !== P.level) stock = { level: P.level, items: Array.from({ length: 4 }, () => rollLoot(Math.max(1, P.level), 0.05)) };
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">Kejetia Market</span><span class="gold">${P.gold} gold</span></header>
    <div class="menu"><button id="pot"><strong>Herbal tonic · 15g</strong><small>Heals 45% HP in battle · you have ${P.potions}</small></button>
    <button id="eth"><strong>Ether gourd · 20g</strong><small>Restores 60% MP in battle · you have ${P.ethers}</small></button></div>
    <h3 class="pad">Gear on sale</h3><div class="bag"></div></section>`);
  const buy = (cost, fn) => { if (P.gold < cost) return toast('Not enough gold.'); P.gold -= cost; fn(); sfx('coin'); save(P); shop(); };
  s.querySelector('#pot').onclick = () => buy(15, () => P.potions++);
  s.querySelector('#eth').onclick = () => buy(20, () => P.ethers++);
  stock.items.forEach((it) => s.querySelector('.bag').append(itemCard(it, [['Buy ' + it.value * 3 + 'g', () => buy(it.value * 3, () => { P.bag.push(it); stock.items = stock.items.filter((x) => x !== it); }), 'primary']])));
  screen(s); s.querySelector('#b').onclick = hub;
}

title();
window.__g = { get battle() { return battle; }, get P() { return P; } };
