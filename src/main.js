// Gyeaman RPG — screens and flow (Monster Clearer model: no money, gear only from monsters and the shrine).
import { HEROES, WORLDS, SPELLS, QUALITY, MONSTERS, SKILLS, SLOTS, WEAPON_ACTIONS, xpForLevel } from './data.js';
import { newPlayer, maxStats, gainXp, rollItem, save, load, wipe, heroOf, has, skillPoints, canLearn, offer, shrineChoices } from './state.js';
import { drawHero, drawGearIcon, drawMonster, img as imgAsset } from './art.js';
import { Battle } from './battle.js';
import { sfx, unlockAudio } from './sfx.js';

const app = document.getElementById('app');
let P = load();
if (P && P.v !== 2) P = null; // old save format
let battle = null;
let mapSel = 'forest';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function screen(node) { if (battle) { battle.destroy(); battle = null; } app.innerHTML = ''; app.append(node); window.scrollTo(0, 0); }
function toast(msg) { const t = h(`<div class="toast">${esc(msg)}</div>`); document.body.append(t); setTimeout(() => t.remove(), 2400); }
const statTxt = (st) => Object.entries(st).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' · ');

function canvasOf(w, hh, draw) {
  const c = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = w * dpr; c.height = hh * dpr; c.style.width = w + 'px'; c.style.height = hh + 'px';
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const go = () => { g.clearRect(0, 0, w, hh); draw(g); }; go(); setTimeout(go, 500);
  return c;
}
const portrait = (hero, w, hh) => canvasOf(w, hh, (g) => drawHero(g, hero, w / 2, hh - 6, (hh - 14) / 112));
const gearIcon = (item, size) => canvasOf(size, size, (g) => drawGearIcon(g, item, 1, 1, size - 2, item ? QUALITY[item.q].color : null));

// ---------------- title ----------------
function title() {
  const s = h(`<section class="title"><div class="brush">GYEAMAN</div><p class="sub">Monster clearer of the Akan forests</p>
    <div class="col">${P ? `<button class="primary" id="cont">Continue: ${esc(P.name)}, level ${P.level}</button>` : ''}
    <button class="${P ? 'ghost' : 'primary'}" id="new">${P ? 'New hunter' : 'Begin'}</button></div>
    <p class="fine">Your progress saves in this browser.</p></section>`);
  screen(s);
  s.querySelector('#new').onclick = (e) => { unlockAudio(); if (P && !e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to replace your hunter'; return; } select(); };
  const c = s.querySelector('#cont'); if (c) c.onclick = () => { unlockAudio(); hub(); };
}

// ---------------- hero select ----------------
function select() {
  const s = h(`<section class="select"><h1>Choose your hunter</h1><div class="grid8"></div><div class="detail"></div></section>`);
  const grid = s.querySelector('.grid8'), det = s.querySelector('.detail');
  const show = (hero) => {
    [...grid.children].forEach((c) => c.classList.toggle('on', c.dataset.id === hero.id));
    const b = hero.base;
    det.innerHTML = `<div class="dport"></div><div class="dtext"><div class="eyebrow">${hero.day} · ${hero.title}</div><h2>${hero.name}</h2><p>${esc(hero.bio)}</p>
      <div class="stats s4">${['hp', 'atk', 'def', 'mag'].map((k) => `<div><b>${b[k]}</b><span>${k.toUpperCase()}</span></div>`).join('')}</div>
      <button class="primary" id="pick">Hunt as ${hero.name}</button></div>`;
    det.querySelector('.dport').append(portrait(hero, 150, 220));
    det.querySelector('#pick').onclick = () => { P = newPlayer(hero.id); save(P); sfx('level'); hub(); };
  };
  for (const hero of HEROES) {
    const card = h(`<button class="hcard" data-id="${hero.id}" type="button"><span class="nm">${hero.name}</span><span class="tt">${hero.title}</span></button>`);
    card.prepend(portrait(hero, 76, 110)); card.onclick = () => { sfx('click'); show(hero); };
    grid.append(card);
  }
  screen(s); show(HEROES[0]);
}

// ---------------- world map hub ----------------
function drawMap(g, w, hh) {
  const im = imgAsset('assets/map.png'); if (im.ok) { g.drawImage(im.el, 0, 0, w, hh); return; }
  g.fillStyle = '#7fae5a'; g.fillRect(0, 0, w, hh);
  g.fillStyle = '#2f6b3a'; g.beginPath(); g.ellipse(w * 0.2, hh * 0.3, w * 0.28, hh * 0.32, 0.2, 0, 6.28); g.fill();
  for (let i = 0; i < 60; i++) { const x = (i * 97) % (w * 0.45), y = (i * 53) % (hh * 0.6); g.fillStyle = i % 2 ? '#24572e' : '#3b7a40'; g.beginPath(); g.arc(x + 10, y + 10, 9, 0, 6.28); g.fill(); }
  g.fillStyle = '#5e7a62'; g.beginPath(); g.ellipse(w * 0.17, hh * 0.78, w * 0.2, hh * 0.16, 0, 0, 6.28); g.fill();
  g.fillStyle = '#8a5a3a'; g.beginPath(); g.moveTo(w * 0.6, hh); g.lineTo(w * 0.78, hh * 0.42); g.lineTo(w, hh * 0.3); g.lineTo(w, hh); g.fill();
  g.fillStyle = '#a06a44'; g.beginPath(); g.moveTo(w * 0.38, hh * 0.85); g.lineTo(w * 0.5, hh * 0.52); g.lineTo(w * 0.62, hh * 0.85); g.fill();
  g.strokeStyle = '#4f8fd0'; g.lineWidth = w * 0.025; g.beginPath(); g.moveTo(0, hh * 0.95); g.bezierCurveTo(w * 0.3, hh * 0.82, w * 0.55, hh * 0.98, w * 0.8, hh * 0.88); g.stroke();
  g.fillStyle = '#d9c9a0'; g.beginPath(); g.ellipse(w * 0.66, hh * 0.36, w * 0.11, hh * 0.09, 0, 0, 6.28); g.fill();
}

function hub() {
  const st = maxStats(P), need = xpForLevel(P.level);
  const alerts = (P.attrPts ? 1 : 0) + (skillPoints(P) > 0 ? 1 : 0);
  const s = h(`<section class="hub">
    <div class="mapwrap"><canvas id="map"></canvas></div>
    <div class="loc"></div>
    <div class="dock">
      <div class="dk stats"><div class="row"><b>${st.atk}</b><span>ATK</span></div><div class="row"><b>${st.def}</b><span>DEF</span></div><div class="row"><b>${st.mag}</b><span>MAG</span></div>
        <button id="char" class="dbtn">${alerts ? '● ' : ''}Hunter · Lv ${P.level}</button></div>
      <div class="dk mid"><div class="hp"><i style="--f:${P.hp / st.hp}"></i><span>${P.hp}/${st.hp} HP</span></div>
        <div class="slots6"></div>
        <div class="xp"><i style="--f:${P.xp / need}"></i><span>Lv ${P.level} · ${P.xp}/${need} XP</span></div></div>
      <div class="dk right"><button id="rest" class="dbtn">Rest</button><button id="bag" class="dbtn">Bag (${P.bag.length})</button>
        <button id="shrine" class="dbtn">${P.choices ? '● ' : ''}Shrine ${P.offered}/5</button></div>
    </div>
    <p class="fine">Kills ${P.stats.kills} · Bosses ${P.stats.bosses} · <button class="link" id="wipe">Delete save</button></p></section>`);
  screen(s);
  const slots = s.querySelector('.slots6');
  for (const k of SLOTS) { const b = h(`<button class="slotb" type="button" title="${k}"></button>`); b.append(gearIcon(P.equip[k], 40)); b.onclick = () => bag(hub); slots.append(b); }
  s.querySelector('#char').onclick = character;
  s.querySelector('#bag').onclick = () => bag(hub);
  s.querySelector('#shrine').onclick = shrine;
  s.querySelector('#rest').onclick = () => { P.hp = st.hp; save(P); sfx('heal'); toast('Rested. HP full.'); hub(); };
  s.querySelector('#wipe').onclick = (e) => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to delete'; return; } wipe(); P = null; title(); };
  const cv = s.querySelector('#map'), dpr = Math.min(2, devicePixelRatio || 1);
  let rect;
  const size = () => { rect = cv.getBoundingClientRect(); cv.width = rect.width * dpr; cv.height = rect.height * dpr; };
  size();
  const draw = (now) => {
    if (!cv.isConnected) return;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, hh = rect.height, t = now / 1000;
    drawMap(g, w, hh);
    for (const wd of WORLDS) {
      const x = wd.pos[0] * w, y = wd.pos[1] * hh, open = P.unlocked.includes(wd.id);
      g.globalAlpha = open ? 1 : 0.45; drawMonster(g, wd.boss, MONSTERS[wd.boss], x, y + 18, 0.3, t, 0); g.globalAlpha = 1;
      if (mapSel === wd.id) { const k = 26 + 3 * Math.sin(t * 4); g.strokeStyle = '#e8c35a'; g.lineWidth = 3; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(x + dx * k, y + dy * k * 0.6); g.lineTo(x + dx * k, y + dy * (k * 0.6 + 10)); g.moveTo(x + dx * k, y + dy * k * 0.6); g.lineTo(x + dx * (k - 10), y + dy * k * 0.6); g.stroke(); } }
      g.font = '13px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(20,12,16,.85)'; g.strokeText(wd.name, x, y + 34); g.fillStyle = open ? '#fff6dc' : '#bbb'; g.fillText(wd.name, x, y + 34);
      if (P.cleared.includes(wd.id)) { g.fillStyle = '#e8c35a'; g.font = '700 11px Karla, sans-serif'; g.fillText('✓ cleared', x, y + 48); }
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  cv.onpointerdown = (e) => {
    rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
    let best = null, bd = 0.1;
    for (const wd of WORLDS) { const d = Math.hypot(wd.pos[0] - x, (wd.pos[1] - y) * 0.75); if (d < bd) { bd = d; best = wd.id; } }
    if (best) { mapSel = best; sfx('click'); showLoc(s.querySelector('.loc')); }
  };
  showLoc(s.querySelector('.loc'));
}
function showLoc(el) {
  const w = WORLDS.find((x) => x.id === mapSel), open = P.unlocked.includes(w.id);
  el.innerHTML = `<div class="eyebrow">${open ? 'Monster level ' + w.lvl + '+' : 'Locked'} · ${w.cols}×${w.rows} board · ${w.count} enemies</div><h3>${w.name}</h3><p>${w.desc}</p>
    <p class="fine">Boss: ${MONSTERS[w.boss].name} · best ${P.best[w.id] || 0}/${w.count}</p>
    ${open ? `<button class="primary" id="go">Enter ${w.name}</button>` : '<p class="fine">Defeat the previous boss to open this path.</p>'}`;
  if (open) el.querySelector('#go').onclick = () => { if (P.hp <= 0) return toast('Rest first.'); fight(w); };
}

// ---------------- battle ----------------
function fight(world) {
  const s = h(`<section class="battle2"><header class="bar"><button class="back" id="flee">Leave</button><span class="place">${world.name}</span><span class="lv">${esc(P.name)} Lv ${P.level}</span></header>
    <div class="bwrap"><canvas id="bc"></canvas></div><div class="bui"></div>
    <details class="legend"><summary>How to play</summary><ul>
      <li>Monsters are <b>passive</b> until hit. The hourglass shows aggression: grey = waking (number = rounds), yellow = attacks next round, red = attacking every round.</li>
      <li><b>Afena</b> (sword) is free but enrages its target and wakes neighbours. <b>Akuma</b> and <b>Pea</b> cost stamina and calm red to yellow.</li>
      <li><b>Spells</b> have cooldowns and put everything they hit back to grey.</li>
      <li>Coloured borders: blue buffer (triples an ally), purple caster (charges 3 rounds), yellow ranger, gold treasure (drops gear).</li>
      <li>The board refills until the enemy count is spent. The boss comes last.</li></ul></details></section>`);
  screen(s);
  s.querySelector('.bwrap').style.aspectRatio = `${world.cols} / ${world.rows + 2.6}`;
  battle = new Battle({ canvas: s.querySelector('#bc'), ui: s.querySelector('.bui'), player: P, world, sfx, onEnd: (r) => afterFight(world, r) });
  s.querySelector('#flee').onclick = () => { if (battle) { P.hp = battle.hero.hp; const r = { win: false, fled: true, xp: battle.xp, kills: battle.kills, total: battle.total, drops: battle.drops }; battle.destroy(); battle = null; afterFight(world, r); } };
}
function afterFight(world, r) {
  battle = null;
  const msgs = gainXp(P, r.xp);
  const items = r.drops.map((d) => rollItem(d.tier, d.luck));
  P.bag.push(...items);
  P.best[world.id] = Math.max(P.best[world.id] || 0, r.kills);
  let head = r.fled ? 'You left' : 'Fallen', extra = '';
  if (r.win) {
    head = 'World cleared'; P.stats.bosses++;
    if (!P.cleared.includes(world.id)) {
      P.cleared.push(world.id);
      const next = WORLDS[WORLDS.indexOf(world) + 1]; if (next && !P.unlocked.includes(next.id)) { P.unlocked.push(next.id); extra += `<p>${next.name} is open on the map.</p>`; }
      const spell = Object.values(SPELLS).find((sp) => sp.unlock === P.cleared.length); if (spell) extra += `<p class="up">New spell: ${spell.name} (${spell.en})</p>`;
    }
  }
  if (!r.win && !r.fled) P.hp = 1;
  save(P); sfx(r.win ? 'level' : r.fled ? 'click' : 'lose');
  const s = h(`<section class="result ${r.win ? '' : 'lose'}"><div class="brush ${r.win ? '' : 'red'}">${head}</div>${extra}
    <ul><li>${r.kills}/${r.total} monsters · +${r.xp} XP</li>${msgs.map((m) => `<li class="up">${m}</li>`).join('')}</ul>
    <div class="drops"></div><p class="fine">${r.win ? '' : 'You keep all XP and gear you earned. The world resets next time.'}</p>
    <div class="menu"><button class="primary" id="ok"><strong>Back to the map</strong></button></div></section>`);
  items.forEach((it) => s.querySelector('.drops').append(itemRow(it)));
  screen(s); s.querySelector('#ok').onclick = hub;
}

// ---------------- character: attributes + skills ----------------
function character() {
  const st = maxStats(P), sp = skillPoints(P);
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">${esc(P.name)} · Level ${P.level}</span></header>
    <div class="charp"><div class="pp"></div><div><h3>Attributes</h3><p class="fine">${P.attrPts} point${P.attrPts === 1 ? '' : 's'} to spend</p><div class="attrs"></div></div></div>
    <h3 class="pad">Skills <span class="fine">· ${sp} point${sp === 1 ? '' : 's'} (one every 4 levels) · respec is free</span></h3><div class="trees"></div>
    <div class="menu"><button class="ghost" id="respec"><strong>Reset skills</strong><small>Get all skill points back</small></button></div></section>`);
  s.querySelector('.pp').append(portrait(heroOf(P), 110, 160));
  const attrs = s.querySelector('.attrs');
  for (const [k, label, gain] of [['atk', 'Attack', '+1 ATK'], ['def', 'Defence', '+1 DEF'], ['mag', 'Magic', '+1 MAG'], ['hp', 'Health', '+8 HP']]) {
    const row = h(`<div class="arow"><span>${label}</span><b>${k === 'hp' ? st.hp : st[k]}</b><button type="button" ${P.attrPts ? '' : 'disabled'}>${gain}</button></div>`);
    row.querySelector('button').onclick = () => { P.attrPts--; P.attr[k]++; if (k === 'hp') P.hp += 8; sfx('equip'); save(P); character(); };
    attrs.append(row);
  }
  const trees = s.querySelector('.trees');
  for (const [tree, list] of Object.entries(SKILLS)) {
    const col = h(`<div class="tree"><div class="eyebrow">${tree}</div></div>`);
    for (const sk of list) {
      const own = has(P, sk.id), can = canLearn(P, sk);
      const b = h(`<button type="button" class="skill ${own ? 'on' : ''}" ${can || own ? '' : 'disabled'}><strong>${sk.name}</strong><small>${sk.note}</small><em>${own ? 'Learned' : 'Level ' + sk.lvl}</em></button>`);
      if (can) b.onclick = () => { P.skills.push(sk.id); sfx('level'); save(P); character(); };
      col.append(b);
    }
    trees.append(col);
  }
  s.querySelector('#respec').onclick = () => { P.skills = []; save(P); character(); };
  screen(s); s.querySelector('#b').onclick = hub;
}

// ---------------- bag / equipment / shrine offering ----------------
const slotFor = (it) => (it.kind === 'ring' ? (P.equip.ring1 ? (P.equip.ring2 ? 'ring1' : 'ring2') : 'ring1') : it.kind);
function itemRow(it, actions = []) {
  const q = QUALITY[it.q];
  const el = h(`<div class="item" style="--rc:${q.color}"><div class="ic"></div><div class="it"><div class="eyebrow" style="color:${q.color}">${q.name} ${it.en}</div>
    <strong>${esc(it.name)}</strong><div class="sl">${statTxt(it.stats)}</div><div class="acts"></div></div></div>`);
  el.querySelector('.ic').append(gearIcon(it, 52));
  for (const [label, fn, cls] of actions) { const b = h(`<button type="button" class="${cls || ''}">${label}</button>`); b.onclick = fn; el.querySelector('.acts').append(b); }
  return el;
}
function bag(back) {
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">Equipment</span></header>
    <div class="eq"></div><h3 class="pad">Bag (${P.bag.length})</h3>
    <p class="fine">Gear only comes from monsters. Offer what you don't need at the Shrine: every 5 offerings earn a pick of 5 new items. Offered ${P.offered}/5.</p><div class="bagl"></div></section>`);
  const eq = s.querySelector('.eq');
  for (const k of SLOTS) {
    const it = P.equip[k];
    if (it) eq.append(itemRow(it, k === 'sword' ? [] : [['Unequip', () => { P.bag.push(it); P.equip[k] = null; clamp(); save(P); bag(back); }, 'ghost']]));
    else eq.append(h(`<div class="item empty"><div class="ic"></div><div class="it"><div class="eyebrow">${k.replace(/\d/, '')}</div><strong>Empty</strong></div></div>`));
  }
  const list = s.querySelector('.bagl');
  [...P.bag].sort((a, b) => b.q - a.q || b.tier - a.tier).forEach((it) => {
    const slot = slotFor(it), cur = P.equip[slot];
    const row = itemRow(it, [['Equip', () => { P.bag.splice(P.bag.indexOf(it), 1); if (cur) P.bag.push(cur); P.equip[slot] = it; clamp(); sfx('equip'); save(P); bag(back); }, 'primary'],
      ['Offer', () => { offer(P, it); sfx('coin'); save(P); if (P.choices) toast('The shrine has a gift for you.'); bag(back); }, 'ghost']]);
    const cmp = Object.keys({ ...it.stats, ...(cur ? cur.stats : {}) }).map((k) => { const d = (it.stats[k] || 0) - (cur ? cur.stats[k] || 0 : 0); return d ? `<em class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : ''}${d} ${k.toUpperCase()}</em>` : ''; }).join(' ');
    row.querySelector('.sl').insertAdjacentHTML('beforeend', `<div class="cmp">vs ${cur ? 'equipped' : 'empty slot'}: ${cmp || 'same'}</div>`);
    list.append(row);
  });
  if (!P.bag.length) list.append(h('<p class="fine">Empty. Monsters drop gear; gold-bordered treasure imps always do.</p>'));
  screen(s); s.querySelector('#b').onclick = back;
}
function clamp() { P.hp = Math.min(P.hp, maxStats(P).hp); }

let shrinePicks = null;
function shrine() {
  if (P.choices && !shrinePicks) shrinePicks = shrineChoices(P);
  const s = h(`<section><header class="bar"><button class="back" id="b">Back</button><span class="place">Shrine of Asase Yaa</span></header>
    <div class="loc"><p>Offer 5 items you don't need. The shrine returns one gift of your choice from 5.</p><p class="fine">Offered ${P.offered}/5 · gifts waiting: ${P.choices}</p></div>
    <div class="bagl"></div></section>`);
  const list = s.querySelector('.bagl');
  if (P.choices && shrinePicks) shrinePicks.forEach((it) => list.append(itemRow(it, [['Take this gift', () => { P.bag.push(it); P.choices--; shrinePicks = null; sfx('level'); save(P); shrine(); }, 'primary']])));
  else list.append(h(`<p class="fine pad">No gifts yet. Offer items from your Bag.</p>`));
  screen(s); s.querySelector('#b').onclick = hub;
}

title();
window.__g = { get battle() { return battle; }, get P() { return P; } };
