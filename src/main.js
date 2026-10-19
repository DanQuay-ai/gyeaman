// Gyeaman RPG — screens and game flow.
import { HEROES, REGIONS, SPELLS, RARITY, WEAPON_TYPES, MONSTERS, xpForLevel, GEAR_BASES } from './data.js';
import { newPlayer, maxStats, weaponType, gainXp, rollLoot, makeGear, save, load, wipe, availableSpells, rnd, pick, heroOf } from './state.js';
import { drawHero, drawGearIcon, drawMonster } from './art.js';
import { Battle } from './battle.js';
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
  const c = s.querySelector('#cont'); if (c) c.onclick = () => { unlockAudio(); town(); };
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
    det.querySelector('#pick').onclick = () => { P = newPlayer(chosen.id); save(P); sfx('level'); town(); };
  };
  for (const hero of HEROES) {
    const card = h(`<button class="hcard" data-id="${hero.id}" type="button"><span class="nm">${hero.name}</span><span class="tt">${hero.title}</span></button>`);
    card.prepend(portrait(hero, 76, 110)); card.onclick = () => { sfx('click'); show(hero); };
    grid.append(card);
  }
  screen(s); show(chosen);
}

// ---------------- town (hub) ----------------
function heroPanel() {
  const st = maxStats(P), need = xpForLevel(P.level), w = weaponType(P);
  const el = h(`<div class="hpanel"><div class="pp"></div><div class="pinfo">
    <div class="eyebrow">${esc(heroOf(P).title)}</div><h2>${esc(P.name)} <small>Lv ${P.level}</small></h2>
    <div class="xp"><i style="--f:${P.xp / need}"></i><span>${P.xp} / ${need} XP</span></div>
    <div class="hpmp"><span>HP ${P.hp}/${st.hp}</span><span>MP ${P.mp}/${st.mp}</span><span class="gold">${P.gold} gold</span></div>
    <div class="stats sm">${['atk', 'mag', 'def', 'spd', 'crit'].map((k) => `<div><b>${st[k]}</b><span>${k.toUpperCase()}</span></div>`).join('')}</div>
    <div class="wpn">${w.kind}: ${esc(P.equip.weapon.name)}</div></div></div>`);
  el.querySelector('.pp').append(portrait(heroOf(P), 110, 160));
  return el;
}
function town() {
  if (P.run) return runMenu();
  const s = h(`<section class="town"><header class="bar"><span class="place">Kumasi · Hunters' Lodge</span></header></section>`);
  s.append(heroPanel());
  const menu = h(`<div class="menu">
    <button class="primary" id="exp"><strong>Expedition</strong><small>Hunt monsters in the regions</small></button>
    <button id="gear"><strong>Gear</strong><small>${P.bag.length} items in your bag</small></button>
    <button id="spells"><strong>Spells</strong><small>${P.spells.length} of 4 equipped</small></button>
    <button id="shop"><strong>Market</strong><small>Tonics, ethers, gear</small></button>
    <button id="inn"><strong>Rest</strong><small>${restCost() ? restCost() + ' gold' : 'Free'} · full HP and MP</small></button>
  </div>`);
  s.append(menu);
  s.append(h(`<p class="fine">Kills ${P.stats.kills} · Expeditions ${P.stats.runs} · Bosses ${P.stats.bosses} · <button class="link" id="wipe">Delete save</button></p>`));
  screen(s);
  menu.querySelector('#exp').onclick = regions;
  menu.querySelector('#gear').onclick = () => gear(town);
  menu.querySelector('#spells').onclick = () => spells(town);
  menu.querySelector('#shop').onclick = shop;
  menu.querySelector('#inn').onclick = () => {
    const c = restCost(); if (P.gold < c) return toast('Not enough gold.');
    P.gold -= c; const st = maxStats(P); P.hp = st.hp; P.mp = st.mp; save(P); sfx('heal'); toast('You rest by the fire. Fully healed.'); town();
  };
  s.querySelector('#wipe').onclick = (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to delete'; return; } wipe(); P = null; title(); };
}
const restCost = () => (P.level <= 2 ? 0 : P.level * 4);

// ---------------- regions + runs ----------------
function regions() {
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">Choose a region</span></header><div class="regions"></div></section>`);
  const list = s.querySelector('.regions');
  REGIONS.forEach((r, i) => {
    const open = P.unlocked.includes(r.id);
    const card = h(`<button class="region ${open ? '' : 'locked'}" type="button" ${open ? '' : 'disabled'}>
      <canvas width="10" height="10"></canvas>
      <div><div class="eyebrow">${open ? 'Recommended level ' + r.lvl : 'Clear ' + REGIONS[i - 1].name + ' to unlock'}${P.cleared.includes(r.id) ? ' · Cleared' : ''}</div>
      <h3>${r.name}</h3><p>${r.desc}</p><p class="fine">${r.floors} floors · Boss: ${MONSTERS[r.boss].name}</p></div></button>`);
    const cv = card.querySelector('canvas'); const dpr = Math.min(2, devicePixelRatio || 1); cv.width = 90 * dpr; cv.height = 100 * dpr; cv.style.width = '90px'; cv.style.height = '100px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr); drawMonster(g, r.boss, MONSTERS[r.boss], 45, 96, 0.72, 0, 0);
    if (open) card.onclick = () => startRun(r);
    list.append(card);
  });
  screen(s); s.querySelector('#b').onclick = town;
}
function startRun(region) {
  P.run = { region: region.id, floor: 1, loot: [], gold: 0 }; P.stats.runs++; save(P);
  sfx('click'); fight();
}
function regionOf() { return REGIONS.find((r) => r.id === P.run.region); }
function enemiesFor(region, floor) {
  const lvl = Math.max(region.lvl, Math.round(region.lvl + (floor - 1) * 0.6 + (P.level - region.lvl) * 0.35));
  if (floor === region.floors) {
    const out = [{ id: region.boss, lvl }];
    const minions = region.id === 'forest' ? 2 : 2 + rnd(2);
    for (let i = 0; i < minions; i++) out.push({ id: pick(region.pool), lvl: Math.max(1, lvl - 1) });
    return out;
  }
  const n = Math.min(5, 2 + Math.floor(floor / 2) + (Math.random() < 0.35 ? 1 : 0));
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: pick(region.pool), lvl });
  if (floor === region.floors - 1) out[0] = { id: pick(region.elite), lvl: lvl + 1 };
  return out;
}

function fight() {
  const region = regionOf(), floor = P.run.floor;
  const boss = floor === region.floors;
  const s = h(`<section class="battle"><header class="bar"><span class="place">${region.name} · ${boss ? 'Boss floor' : 'Floor ' + floor + ' of ' + region.floors}</span><span class="lv">${esc(P.name)} Lv ${P.level}</span></header>
    <div class="board"><canvas id="bc"></canvas></div><div class="bui"></div></section>`);
  screen(s);
  battle = new Battle({ canvas: s.querySelector('#bc'), ui: s.querySelector('.bui'), player: P, region, floor, enemies: enemiesFor(region, floor), sfx, onEnd: (r) => afterFight(r) });
}

function afterFight(r) {
  battle = null;
  const region = regionOf();
  if (!r.win) {
    // Hybrid rule: keep XP and levels, lose the run's unbanked loot and half its gold.
    const lostItems = P.run.loot.length, keptGold = Math.floor(P.run.gold / 2);
    const msgs = gainXp(P, Math.floor(r.xp / 2));
    P.gold += keptGold; P.stats.kills += r.kills;
    const st = maxStats(P); P.hp = Math.ceil(st.hp * 0.5); P.mp = st.mp;
    P.run = null; save(P); sfx('lose');
    const s = h(`<section class="result lose"><div class="brush red">Fallen</div>
      <p>Hunters carry you back to Kumasi. You keep your level and equipped gear.</p>
      <ul><li>Lost ${lostItems} unbanked item${lostItems === 1 ? '' : 's'}</li><li>Kept ${keptGold} gold</li><li>+${Math.floor(r.xp / 2)} XP</li>${msgs.map((m) => `<li class="up">${m}</li>`).join('')}</ul>
      <button class="primary" id="ok">Return to town</button></section>`);
    screen(s); s.querySelector('#ok').onclick = town; return;
  }
  const msgs = gainXp(P, r.xp);
  P.run.gold += r.gold; P.stats.kills += r.kills;
  const drops = [];
  const dropChance = r.hasBoss ? 1 : 0.55;
  if (Math.random() < dropChance) drops.push(rollLoot(Math.max(1, region.lvl + P.run.floor - 1), r.hasBoss ? 0.35 : 0));
  if (r.hasBoss) drops.push(rollLoot(region.lvl + 2, 0.25));
  P.run.loot.push(...drops);
  if (msgs.length) sfx('level'); else sfx('win');
  const boss = P.run.floor === region.floors;
  if (boss) {
    P.gold += P.run.gold; P.bag.push(...P.run.loot); P.stats.bosses++;
    if (!P.cleared.includes(region.id)) P.cleared.push(region.id);
    const next = REGIONS[REGIONS.indexOf(region) + 1]; if (next && !P.unlocked.includes(next.id)) P.unlocked.push(next.id);
    const banked = P.run.loot.length, gold = P.run.gold; P.run = null; save(P);
    const s = h(`<section class="result"><div class="brush">Region cleared</div>
      <p>${MONSTERS[region.boss].name} is defeated. ${next ? next.name + ' is now open.' : 'The spirits are banished. You are the Gyeaman of the Akan lands.'}</p>
      <ul><li>+${r.xp} XP</li><li>${gold} gold banked</li><li>${banked} items banked</li>${msgs.map((m) => `<li class="up">${m}</li>`).join('')}</ul>
      <div class="drops"></div><button class="primary" id="ok">Return to town</button></section>`);
    drops.forEach((d) => s.querySelector('.drops').append(itemCard(d)));
    screen(s); s.querySelector('#ok').onclick = town; return;
  }
  P.run.floor++; save(P);
  const s = h(`<section class="result"><div class="brush">Victory</div>
    <ul><li>+${r.xp} XP</li><li>+${r.gold} gold (unbanked)</li>${msgs.map((m) => `<li class="up">${m}</li>`).join('')}</ul>
    <div class="drops"></div>
    <p class="fine">Unbanked loot is lost if you fall. Return to town to keep it safe.</p>
    <h3>Choose one before the next floor</h3>
    <div class="menu">
      <button id="shrine"><strong>Shrine of Asase Yaa</strong><small>Heal 40% HP and MP</small></button>
      <button id="chest"><strong>Forest cache</strong><small>One more random item</small></button>
      <button id="press" class="primary"><strong>Press on</strong><small>+25% gold on the next floor</small></button>
      <button id="home" class="ghost"><strong>Return to town</strong><small>Bank ${P.run.loot.length} items and ${P.run.gold} gold, end the expedition</small></button>
    </div></section>`);
  drops.forEach((d) => s.querySelector('.drops').append(itemCard(d)));
  screen(s);
  s.querySelector('#shrine').onclick = () => { const st = maxStats(P); P.hp = Math.min(st.hp, P.hp + Math.round(st.hp * 0.4)); P.mp = Math.min(st.mp, P.mp + Math.round(st.mp * 0.4)); sfx('heal'); save(P); runMenu(); };
  s.querySelector('#chest').onclick = () => { const it = rollLoot(region.lvl + P.run.floor - 1, 0.1); P.run.loot.push(it); toast('Found ' + it.name); save(P); runMenu(); };
  s.querySelector('#press').onclick = () => { P.run.gold = Math.round(P.run.gold * 1.25); save(P); fight(); };
  s.querySelector('#home').onclick = () => { P.gold += P.run.gold; P.bag.push(...P.run.loot); P.run = null; save(P); toast('Loot banked.'); town(); };
}
function runMenu() {
  const region = regionOf(); const st = maxStats(P);
  const s = h(`<section><header class="bar"><span class="place">${region.name} · before floor ${P.run.floor}</span></header>
    <div class="menu">
      <p class="fine">HP ${P.hp}/${st.hp} · MP ${P.mp}/${st.mp} · ${P.run.loot.length} unbanked items · ${P.run.gold} unbanked gold</p>
      <button class="primary" id="go"><strong>Descend</strong><small>${P.run.floor === region.floors ? 'Boss: ' + MONSTERS[region.boss].name : 'Floor ' + P.run.floor}</small></button>
      <button id="gear"><strong>Gear</strong><small>Equip what you found</small></button>
      <button id="spells"><strong>Spells</strong><small>${P.spells.length} of 4 equipped</small></button>
      <button class="ghost" id="home"><strong>Return to town</strong><small>Bank loot and end the expedition</small></button>
    </div></section>`);
  screen(s);
  s.querySelector('#go').onclick = fight;
  s.querySelector('#gear').onclick = () => gear(runMenu);
  s.querySelector('#spells').onclick = () => spells(runMenu);
  s.querySelector('#home').onclick = () => { P.gold += P.run.gold; P.bag.push(...P.run.loot); P.run = null; save(P); town(); };
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
      <i></i><div><strong>${sp.name}</strong> <span>${sp.en}</span><small>${known ? sp.mp + ' MP · range ' + sp.range.join('-') + (sp.area ? ' · area ' + sp.area : '') + (sp.status ? ' · ' + Object.keys(sp.status).join(', ') : '') : 'Learned at level ' + sp.lvl}</small></div><b>${on ? 'Equipped' : known ? 'Equip' : 'Lv ' + sp.lvl}</b></button>`);
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
  screen(s); s.querySelector('#b').onclick = town;
}

title();
window.__g = { get battle() { return battle; }, get P() { return P; } };
