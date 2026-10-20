// Gyeaman RPG — screens and flow. Mobile first: every screen fits one viewport (no page scroll);
// anything longer is paged with ‹ › and swipes. Monster Clearer model: no money, gear only from
// monsters and the shrine trade-in.
import { HEROES, DAY_NAMES, WORLDS, SPELLS, QUALITY, MONSTERS, SKILLS, SLOTS, SLOT_INFO, xpForLevel } from './data.js';
import { newPlayer, maxStats, gainXp, rollItem, save, load, wipe, heroOf, has, skillPoints, canLearn, offer, shrineChoices } from './state.js';
import { drawGearIcon } from './art.js';
import { Battle } from './battle.js';
import { ICON } from './icons.js';
import { sfx, unlockAudio } from './sfx.js';

const app = document.getElementById('app');
let P = load();
if (P && P.v !== 2) P = null;
if (P && !P.named) P.named = true;
let battle = null, mapSel = null, hunterTab = 'stats', skillTree = 'attack';

// ---------- helpers ----------
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (root, sel) => root.querySelector(sel);
function show(node) { if (battle) { battle.destroy(); battle = null; } app.innerHTML = ''; app.append(node); }
function toast(msg) { app.querySelectorAll('.toast').forEach((t) => t.remove()); const t = h(`<div class="toast">${esc(msg)}</div>`); app.append(t); setTimeout(() => t.remove(), 2200); }
const statTxt = (st) => Object.entries(st).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' · ');
const heroPath = (id) => `assets/heroes/${id}.webp`, portraitPath = (id) => `assets/portraits/${id}.webp`, monPath = (id) => `assets/monsters/${id}.webp`;
/** <img> with a fallback chain (webp art → round-1 png). */
function art(src, alts = [], cls = '', alt = '') {
  const im = document.createElement('img'); if (cls) im.className = cls; im.alt = alt; im.decoding = 'async'; im.draggable = false;
  let k = 0; im.onerror = () => { if (k < alts.length) im.src = alts[k++]; else im.onerror = null; };
  im.src = src; return im;
}
const heroArt = (id, cls) => art(heroPath(id), [`assets/heroes/${id}.png`], cls);
const faceArt = (id, cls) => art(portraitPath(id), [heroPath(id), `assets/heroes/${id}.png`], cls);
const monArt = (id, cls) => art(monPath(id), [`assets/monsters/${id}.png`], cls);
function gearCanvas(item, size) {
  const c = document.createElement('canvas'), dpr = Math.min(3, devicePixelRatio || 1);
  c.width = c.height = size * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
  const draw = () => { g.clearRect(0, 0, size, size); drawGearIcon(g, item, 1, 1, size - 2, item ? QUALITY[item.q].color : null); };
  draw(); setTimeout(draw, 300); setTimeout(draw, 1200);
  return c;
}
/** Swipe left/right on an element. */
function swipe(el, onPrev, onNext) {
  let x0 = null, y0 = 0;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) (dx < 0 ? onNext : onPrev)(); });
}
/** Paged list: renders `per` items at a time with ‹ pips › controls. */
function paged(items, per, renderItem, wrapCls = 'icards') {
  const box = h(`<div class="pagedbox" style="display:flex;flex-direction:column;gap:8px;min-height:0"><div class="${wrapCls}"></div><div class="pager"></div></div>`);
  const list = $(box, '.' + wrapCls.split(' ')[0]), nav = $(box, '.pager');
  const pages = Math.max(1, Math.ceil(items.length / per)); let page = 0;
  const draw = () => {
    list.innerHTML = '';
    items.slice(page * per, page * per + per).forEach((it, i) => list.append(renderItem(it, page * per + i)));
    nav.innerHTML = '';
    if (pages > 1) {
      const prev = h(`<button class="pg" type="button" aria-label="Previous page">‹</button>`), next = h(`<button class="pg" type="button" aria-label="Next page">›</button>`);
      prev.disabled = page === 0; next.disabled = page === pages - 1;
      prev.onclick = () => { page--; sfx('click'); draw(); }; next.onclick = () => { page++; sfx('click'); draw(); };
      nav.append(prev, h(`<div class="pips">${Array.from({ length: pages }, (_, k) => `<i class="${k === page ? 'on' : ''}"></i>`).join('')}</div>`), next);
    }
  };
  swipe(list, () => { if (page > 0) { page--; draw(); } }, () => { if (page < pages - 1) { page++; draw(); } });
  draw(); return box;
}
/** Bottom sheet over the current screen. */
function sheet(title, build, { onClose } = {}) {
  const v = h(`<div class="veil"><div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="hd"><h3>${esc(title)}</h3><button class="iconbtn" type="button" aria-label="Close">${ICON.close}</button></div><div class="body"></div></div></div>`);
  const close = () => { v.remove(); if (onClose) onClose(); };
  $(v, '.hd button').onclick = close;
  v.addEventListener('pointerdown', (e) => { if (e.target === v) close(); });
  build($(v, '.body'), close, $(v, '.hd h3'));
  app.append(v); return close;
}

// ---------- shell: top chip + stage + tab bar ----------
const alertsHunter = () => P && (P.attrPts > 0 || skillPoints(P) > 0);
const betterInBag = () => P && P.bag.some((it) => { const cur = P.equip[slotFor(it)]; return !cur || score(it) > score(cur); });
const score = (it) => Object.entries(it.stats).reduce((s, [k, v]) => s + (k === 'hp' ? v / 6 : v), 0);
function shell(active, stage, dock) {
  const st = maxStats(P), need = xpForLevel(P.level);
  const s = h(`<section class="scr">
    <div class="top"><button class="chip" type="button" aria-label="Hunter details"><div class="face"></div><div class="who"><div class="nm">${esc(P.name)} <span class="lv">Lv ${P.level}</span></div>
      <div class="bars"><div class="meter"><i style="--f:${Math.min(1, P.hp / st.hp)}"></i></div><div class="meter xp"><i style="--f:${P.xp / need}"></i></div></div></div></button>
      <span class="fine num">${P.xp}/${need} XP</span></div>
    <div class="stage"></div><div class="dockslot"></div>
    <nav class="tabs">${[['map', 'Map'], ['hunter', 'Hunter'], ['gear', 'Gear'], ['shrine', 'Shrine']].map(([k, l]) => `<button class="tab ${k === active ? 'on' : ''}" data-k="${k}" type="button">${ICON[k]}${l}</button>`).join('')}</nav></section>`);
  $(s, '.face').append(faceArt(P.hero));
  $(s, '.chip').onclick = () => go('hunter');
  if (alertsHunter()) $(s, '[data-k=hunter]').append(h('<i class="dot"></i>'));
  if (P.choices) $(s, '[data-k=shrine]').append(h('<i class="dot"></i>'));
  if (betterInBag()) $(s, '[data-k=gear]').append(h('<i class="dot"></i>'));
  s.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { sfx('click'); go(b.dataset.k); }));
  $(s, '.stage').append(stage);
  if (dock) $(s, '.dockslot').append(dock);
  show(s); return s;
}
function go(k) { ({ map: mapScreen, hunter: hunterScreen, gear: gearScreen, shrine: shrineScreen })[k](); }

// ---------------- title ----------------
function title() {
  const s = h(`<section class="scr"><div class="title-bg" style="background-image:url(assets/map.webp)"></div><div class="title-shade"></div>
    <div class="lineup"></div>
    <div class="logo"><img src="squads/mark.svg" alt="" style="width:96px;height:96px;display:block;margin:0 auto 6px;filter:drop-shadow(0 0 18px rgba(227,180,72,.45))"><h1>GYEAMAN</h1><p>MONSTER CLEARER OF THE AKAN FORESTS</p></div>
    <div class="title-menu"></div></section>`);
  const trio = P ? [HEROES[(HEROES.findIndex((x) => x.id === P.hero) + 7) % 8].id, P.hero, HEROES[(HEROES.findIndex((x) => x.id === P.hero) + 1) % 8].id] : ['akosua', 'kwame', 'ama'];
  trio.forEach((id) => $(s, '.lineup').append(heroArt(id)));
  const menu = $(s, '.title-menu');
  if (P) { const c = h(`<button class="btn hot wide" type="button">Continue · ${esc(P.name)} Lv ${P.level}</button>`); c.onclick = () => { unlockAudio(); sfx('click'); mapScreen(); }; menu.append(c); }
  const n = h(`<button class="btn ${P ? 'ghost' : 'hot'} wide" type="button">${P ? 'New hunter' : 'Begin'}</button>`);
  n.onclick = () => { unlockAudio(); sfx('click'); if (P && !n.dataset.sure) { n.dataset.sure = 1; n.textContent = 'Tap again: this replaces your hunter'; return; } create(0); };
  menu.append(n);
  menu.append(h(`<a class="btn ghost wide" href="squads/" style="text-decoration:none">Squads (beta) · new mode</a>`));
  show(s);
}

// ---------------- create: pick a hero (carousel), then name them ----------------
function create(i) {
  const hero = HEROES[i], b = hero.base;
  const s = h(`<section class="scr create">
    <div class="top"><button class="iconbtn" type="button" aria-label="Back">${ICON.back}</button><div class="eyebrow" style="flex:1">Choose your hunter · ${i + 1} / ${HEROES.length}</div></div>
    <div class="stage"><div class="ghostname">${hero.name.toUpperCase()}</div><div class="slash"></div>
      <button class="navarrow l" type="button" aria-label="Previous hunter">‹</button><button class="navarrow r" type="button" aria-label="Next hunter">›</button></div>
    <div class="card info"><div class="eyebrow">${hero.day} · age ${hero.age} · ${hero.weapon}</div>
      <h2>${hero.name}${hero.teen ? '<span class="tag">Teen</span>' : ''}</h2>
      <div class="eyebrow" style="color:var(--orange);margin-top:4px">${hero.title}</div>
      <p class="bio">${esc(hero.bio)}</p>
      <div class="stats4">${['hp', 'atk', 'def', 'mag'].map((k) => `<div><b>${b[k]}</b><span>${k.toUpperCase()}</span></div>`).join('')}</div>
      <button class="btn hot wide" type="button">Choose ${hero.name}</button></div>
    <div class="pager" style="padding-bottom:calc(8px + var(--safe-b))"><div class="pips">${HEROES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div></div></section>`);
  const body = heroArt(hero.id, 'bodyart'); $(s, '.stage').append(body);
  const prev = () => { sfx('step'); create((i + HEROES.length - 1) % HEROES.length); }, next = () => { sfx('step'); create((i + 1) % HEROES.length); };
  $(s, '.navarrow.l').onclick = prev; $(s, '.navarrow.r').onclick = next;
  swipe($(s, '.stage'), prev, next);
  $(s, '.top .iconbtn').onclick = title;
  $(s, '.info .btn').onclick = () => { sfx('click'); nameStep(hero); };
  // preload neighbours so swiping feels instant
  [HEROES[(i + 1) % 8], HEROES[(i + 7) % 8]].forEach((x) => { const im = new Image(); im.src = heroPath(x.id); });
  show(s);
}
function nameStep(hero) {
  const pool = [...new Set([hero.name, ...DAY_NAMES[hero.sex]])].slice(0, 7);
  const s = h(`<section class="scr create">
    <div class="top"><button class="iconbtn" type="button" aria-label="Back">${ICON.back}</button><div class="eyebrow" style="flex:1">Name your hunter</div></div>
    <div class="stage"><div class="ghostname">${hero.name.toUpperCase()}</div><div class="bigface"><div class="frame"></div></div></div>
    <div class="card info namebox"><label class="eyebrow" for="nm">What do the villages call you?</label>
      <input id="nm" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(hero.name)}">
      <div class="sugg">${pool.map((n) => `<button type="button">${n}</button>`).join('')}</div>
      <button class="btn hot wide" type="button">Begin the hunt</button></div>
    <div style="height:calc(8px + var(--safe-b))"></div></section>`);
  $(s, '.frame').append(faceArt(hero.id));
  const inp = $(s, '#nm');
  s.querySelectorAll('.sugg button').forEach((b) => (b.onclick = () => { inp.value = b.textContent; sfx('click'); }));
  const begin = () => {
    const name = inp.value.replace(/[^\p{L}\p{N} '\-ɛɔƐƆ]/gu, '').trim().slice(0, 14) || hero.name;
    P = newPlayer(hero.id); P.name = name; P.named = true; save(P); sfx('level'); mapScreen(); toast(`${name}, the forest is waiting.`);
  };
  $(s, '.namebox .btn').onclick = begin;
  inp.onkeydown = (e) => { if (e.key === 'Enter') begin(); };
  $(s, '.top .iconbtn').onclick = () => create(HEROES.indexOf(hero));
  show(s);
}

// ---------------- map ----------------
function mapScreen() {
  P.hp = maxStats(P).hp; // hunters always heal between worlds
  if (!mapSel) mapSel = [...WORLDS].reverse().find((w) => P.unlocked.includes(w.id) && !P.cleared.includes(w.id))?.id || 'forest';
  const stage = h(`<div class="mapbox"><div class="mapfit"></div></div>`);
  const fit = $(stage, '.mapfit');
  fit.append(art('assets/map.webp', ['assets/map.png'], 'mapimg', 'World map'));
  const pins = {};
  for (const w of WORLDS) {
    const open = P.unlocked.includes(w.id), done = P.cleared.includes(w.id);
    const pin = h(`<button class="pin ${open ? '' : 'locked'} ${w.id === mapSel ? 'sel' : ''}" type="button" style="left:${w.pos[0] * 100}%;top:${w.pos[1] * 100}%"><div class="ring"></div><span>${w.name}</span>${done ? '<b class="ok">✓</b>' : ''}</button>`);
    $(pin, '.ring').append(monArt(w.boss));
    pin.onclick = () => { mapSel = w.id; sfx('click'); Object.values(pins).forEach((p) => p.classList.remove('sel')); pin.classList.add('sel'); fillCard(); };
    pins[w.id] = pin; fit.append(pin);
  }
  const card = h(`<div class="card wcard"></div>`);
  const fillCard = () => {
    const w = WORLDS.find((x) => x.id === mapSel), open = P.unlocked.includes(w.id), boss = MONSTERS[w.boss];
    card.innerHTML = `<div class="bossart"></div><div><div class="eyebrow">${open ? `Level ${w.lvl}+ · ${w.cols}×${w.rows} board` : 'Locked'}</div><h3>${w.name}</h3>
      <div class="row"><span>${w.count} monsters</span><span>Boss: ${boss.name}</span>${P.best[w.id] ? `<span>Best ${P.best[w.id]}/${w.count}</span>` : ''}</div></div>`;
    $(card, '.bossart').append(monArt(w.boss));
    const b = h(`<button class="btn ${open ? 'hot' : 'ghost'}" type="button" style="grid-column:1/-1" ${open ? '' : 'disabled'}>${open ? 'Enter ' + w.name : 'Beat the previous boss first'}</button>`);
    if (open) b.onclick = () => { sfx('click'); fight(w); };
    card.append(b);
  };
  fillCard();
  shell('map', stage, card);
}

// ---------------- hunter: attributes + skills ----------------
function hunterScreen() {
  const st = maxStats(P), sp = skillPoints(P);
  const wrap = h(`<div style="position:absolute;inset:0;display:flex;flex-direction:column"><div class="seg"><button type="button" data-t="stats">Attributes</button><button type="button" data-t="skills">Skills</button></div><div style="flex:1;min-height:0;position:relative" class="pane"></div></div>`);
  wrap.querySelectorAll('.seg button').forEach((b) => { b.classList.toggle('on', b.dataset.t === hunterTab); b.onclick = () => { hunterTab = b.dataset.t; sfx('click'); hunterScreen(); }; });
  if (P.attrPts) $(wrap, '[data-t=stats]').append(h('<i class="dot"></i>'));
  if (sp > 0) $(wrap, '[data-t=skills]').append(h('<i class="dot"></i>'));
  const pane = $(wrap, '.pane');
  if (hunterTab === 'stats') {
    const v = h(`<div class="split"><div class="art"></div><div class="side">
      <div><div class="eyebrow">${heroOf(P).title}</div><div class="ptsbadge">${P.attrPts ? `${P.attrPts} point${P.attrPts > 1 ? 's' : ''} to spend` : 'Level up for points'}</div></div>
      <div class="attrs" style="display:grid;gap:6px"></div>
      <div class="mini"><div><b>${st.stamina}</b>Stamina</div><div><b>${st.potionSlots}</b>Tonics / world</div><div><b>${P.stats.kills}</b>Kills</div><div><b>${P.stats.bosses}</b>Bosses</div></div>
      <button class="fine" type="button" style="text-align:left;text-decoration:underline;margin-top:auto">Delete save</button></div></div>`);
    $(v, '.art').append(heroArt(P.hero));
    for (const [k, label, gain] of [['atk', 'Attack', '+1'], ['def', 'Defence', '+1'], ['mag', 'Magic', '+1'], ['hp', 'Health', '+8']]) {
      const row = h(`<div class="attr"><span>${label}</span><b class="num">${st[k]}</b><button type="button" ${P.attrPts ? '' : 'disabled'} aria-label="Add to ${label}">${gain}</button></div>`);
      $(row, 'button').onclick = () => { P.attrPts--; P.attr[k]++; sfx('equip'); save(P); hunterScreen(); };
      $(v, '.attrs').append(row);
    }
    const del = v.querySelector('.side > button.fine');
    del.onclick = () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Tap again to delete everything'; return; } wipe(); P = null; title(); };
    pane.append(v);
  } else {
    const v = h(`<div class="skills"><div class="seg" style="margin:0">${Object.keys(SKILLS).map((t) => `<button type="button" data-t="${t}" class="${t === skillTree ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      <div class="list" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:8px"></div>
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:6px"><span class="ptsbadge" style="flex:1">${sp} skill point${sp === 1 ? '' : 's'} · one every 4 levels</span><button class="btn ghost sm" type="button">Reset</button></div></div>`);
    v.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { skillTree = b.dataset.t; sfx('click'); hunterScreen(); }));
    for (const sk of SKILLS[skillTree]) {
      const own = has(P, sk.id), can = canLearn(P, sk);
      const b = h(`<button type="button" class="skill ${own ? 'on' : can ? 'can' : ''}" ${can || own ? '' : 'disabled'}><div class="lvl">${sk.lvl}</div><div><strong>${sk.name}</strong><small>${sk.note}</small><br><em>${own ? 'Learned' : can ? 'Tap to learn' : 'Unlocks at level ' + sk.lvl}</em></div></button>`);
      if (can) b.onclick = () => { P.skills.push(sk.id); sfx('level'); save(P); hunterScreen(); };
      $(v, '.list').append(b);
    }
    v.querySelector('.btn.sm').onclick = () => { P.skills = []; save(P); sfx('click'); hunterScreen(); };
    pane.append(v);
  }
  shell('hunter', wrap);
}

// ---------------- gear: paper doll, slot → candidates ----------------
const slotFor = (it) => (it.kind === 'ring' ? (P.equip.ring1 ? (P.equip.ring2 ? 'ring1' : 'ring2') : 'ring1') : it.kind);
const kindOf = (slot) => slot.replace(/\d/, '');
function icard(it, btns = [], cmpWith) {
  const q = QUALITY[it.q];
  const el = h(`<div class="icard" style="--qc:${q.color}"><div class="ic"></div><div><div class="eyebrow" style="color:${q.color}">${q.name} · ${it.en}</div><strong>${esc(it.name)}</strong><div class="st">${statTxt(it.stats)}</div></div><div class="b" style="display:grid;gap:6px"></div></div>`);
  $(el, '.ic').append(gearCanvas(it, 64));
  if (cmpWith !== undefined) {
    const keys = Object.keys({ ...it.stats, ...(cmpWith ? cmpWith.stats : {}) });
    const parts = keys.map((k) => { const d = (it.stats[k] || 0) - (cmpWith ? cmpWith.stats[k] || 0 : 0); return d ? `<span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : ''}${d} ${k.toUpperCase()}</span>` : ''; }).filter(Boolean);
    $(el, '.st').insertAdjacentHTML('afterend', `<div class="cmp">${parts.length ? parts.join(' ') : '<span class="fine">same as equipped</span>'}</div>`);
  }
  for (const [label, fn, cls] of btns) { const b = h(`<button class="btn sm ${cls || ''}" type="button">${label}</button>`); b.onclick = fn; $(el, '.b').append(b); }
  return el;
}
function equip(it, slot) { const cur = P.equip[slot]; P.bag.splice(P.bag.indexOf(it), 1); if (cur) P.bag.push(cur); P.equip[slot] = it; sfx('equip'); save(P); }
function gearScreen() {
  const st = maxStats(P);
  const stage = h(`<div class="doll"><div class="art"></div><div class="slotcol l"></div><div class="slotcol r"></div></div>`);
  $(stage, '.art').append(heroArt(P.hero));
  const layout = { l: ['sword', 'shield', 'armour'], r: ['helmet', 'ring1', 'ring2'] };
  for (const [side, slots] of Object.entries(layout)) for (const k of slots) {
    const it = P.equip[k], info = SLOT_INFO[kindOf(k)];
    const cands = P.bag.filter((x) => x.kind === kindOf(k)).length;
    const b = h(`<button class="slot ${it ? '' : 'empty'}" type="button" style="--qc:${it ? QUALITY[it.q].color : 'var(--line)'}" aria-label="${info.en} slot"><span class="lab">${info.name}</span></button>`);
    if (it) b.prepend(gearCanvas(it, 60));
    if (cands) b.append(h(`<i class="dot" style="top:4px;right:4px"></i>`));
    b.onclick = () => { sfx('click'); slotSheet(k); };
    $(stage, '.slotcol.' + side).append(b);
  }
  const dock = h(`<div><div class="totals">${['atk', 'def', 'mag', 'hp'].map((k) => `<div>${st[k]}<span>${k.toUpperCase()}</span></div>`).join('')}</div>
    <div style="padding:0 12px 6px"><button class="btn ghost wide" type="button">Bag · ${P.bag.length} item${P.bag.length === 1 ? '' : 's'}</button></div></div>`);
  $(dock, '.btn').onclick = () => { sfx('click'); bagSheet('view'); };
  shell('gear', stage, dock);
}
function slotSheet(slot) {
  const kind = kindOf(slot), info = SLOT_INFO[kind];
  sheet(`${info.name} · ${info.en}`, (body, close) => {
    const cur = P.equip[slot];
    if (cur) body.append(h('<div class="eyebrow">Equipped</div>'), icard(cur, slot === 'sword' ? [] : [['Remove', () => { P.bag.push(cur); P.equip[slot] = null; save(P); close(); gearScreen(); }, 'ghost']]));
    else body.append(h(`<p class="fine">Nothing equipped. ${info.en}s add ${info.stat ? info.stat.toUpperCase() : 'ATK, DEF or MAG'}.</p>`));
    const cands = P.bag.filter((x) => x.kind === kind).sort((a, b) => score(b) - score(a));
    body.append(h(`<div class="eyebrow">From your bag · ${cands.length}</div>`));
    if (!cands.length) body.append(h(`<p class="fine">No ${info.en.toLowerCase()} yet. Monsters drop gear, gold-bordered treasure imps always do, and the Shrine trades 5 items for a gift.</p>`));
    else body.append(paged(cands, 3, (it) => icard(it, [['Equip', () => { equip(it, slot); close(); gearScreen(); }, 'hot']], cur || null)));
  }, { onClose: null });
}
function bagSheet(mode, onDone) {
  const picked = new Set();
  sheet(mode === 'offer' ? 'Offer to Asase Yaa' : `Bag · ${P.bag.length}`, (body, close, ttl) => {
    if (!P.bag.length) { body.append(h(`<p class="fine">Empty. Monsters drop gear; gold-bordered treasure imps always do.</p>`)); return; }
    body.append(h(`<p class="fine">${mode === 'offer' ? 'Tap items to offer. Every 5 offerings earn one gift.' : 'Tap an item to equip or offer it.'}</p>`));
    const items = [...P.bag].sort((a, b) => b.q - a.q || score(b) - score(a));
    const box = paged(items, 12, (it) => {
      const t = h(`<button class="tile" type="button" style="--qc:${QUALITY[it.q].color}" aria-label="${esc(it.name)}"></button>`);
      t.append(gearCanvas(it, 64));
      if (picked.has(it)) t.classList.add('picked');
      t.onclick = () => {
        sfx('click');
        if (mode === 'offer') { picked.has(it) ? picked.delete(it) : picked.add(it); t.classList.toggle('picked'); confirm.textContent = picked.size ? `Offer ${picked.size} item${picked.size > 1 ? 's' : ''}` : 'Pick items'; confirm.disabled = !picked.size; }
        else itemSheet(it, () => { close(); gearScreen(); });
      };
      return t;
    }, 'tiles');
    body.append(box);
    const confirm = h(`<button class="btn hot wide" type="button" disabled>Pick items</button>`);
    if (mode === 'offer') {
      confirm.onclick = () => { const before = P.choices; for (const it of picked) offer(P, it); save(P); sfx('coin'); close(); if (P.choices > before) toast('Asase Yaa has a gift for you.'); (onDone || shrineScreen)(); };
      body.append(confirm);
    }
  });
}
function itemSheet(it, after) {
  const slot = slotFor(it), cur = P.equip[slot];
  sheet(it.en, (body, close) => {
    body.append(icard(it, [], cur || null));
    body.append(h(`<p class="fine">${cur ? 'Compared with your equipped ' + cur.en.toLowerCase() + '.' : 'Your ' + it.en.toLowerCase() + ' slot is empty.'}</p>`));
    const acts = h(`<div class="acts"><button class="btn hot" type="button">Equip</button><button class="btn ghost" type="button">Offer</button></div>`);
    acts.children[0].onclick = () => { equip(it, slot); close(); after(); };
    acts.children[1].onclick = () => { offer(P, it); save(P); sfx('coin'); close(); if (P.choices) toast('Asase Yaa has a gift for you.'); after(); };
    body.append(acts);
  });
}

// ---------------- shrine ----------------
let gifts = null;
function shrineScreen() {
  if (P.choices && !gifts) gifts = shrineChoices(P);
  const stage = h(`<div class="shrine"><div style="display:grid;gap:18px;justify-items:center"><div class="altar"><div class="core num">${P.offered}/5<small>OFFERINGS</small></div></div>
    <div><h3 style="font-size:28px">Shrine of Asase Yaa</h3><p class="fine" style="margin-top:6px;max-width:300px">No market in these forests. Offer 5 items you don't need; the Earth Mother returns one gift of your choice from 5.</p></div></div></div>`);
  const altar = $(stage, '.altar');
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * (Math.PI * 2 / 5); altar.append(h(`<i class="pip ${k < P.offered ? 'on' : ''}" style="left:calc(50% + ${Math.cos(a) * 41}% - 17px);top:calc(50% + ${Math.sin(a) * 41}% - 17px)"></i>`)); }
  const dock = h(`<div style="padding:0 12px 6px;display:grid;gap:8px"></div>`);
  if (P.choices) { const g = h(`<button class="btn hot wide" type="button">Choose your gift${P.choices > 1 ? ` (${P.choices})` : ''}</button>`); g.onclick = giftSheet; dock.append(g); }
  const o = h(`<button class="btn ${P.choices ? 'ghost' : 'hot'} wide" type="button" ${P.bag.length ? '' : 'disabled'}>${P.bag.length ? 'Offer items' : 'Bag is empty'}</button>`);
  o.onclick = () => bagSheet('offer'); dock.append(o);
  shell('shrine', stage, dock);
}
function giftSheet() {
  sheet('Choose one gift', (body, close) => {
    body.append(paged(gifts, 3, (it) => icard(it, [['Take', () => { P.bag.push(it); P.choices--; gifts = null; sfx('level'); save(P); close(); toast(`${it.name} is in your bag.`); shrineScreen(); }, 'hot']], P.equip[slotFor(it)] || null)));
  });
}

// ---------------- battle ----------------
function fight(world) {
  const s = h(`<section class="scr">
    <div class="bt-top"><button class="iconbtn" type="button" aria-label="Leave world">${ICON.close}</button><div class="wn"><b>${world.name}</b><span class="rd">Round 1</span></div><div class="cnt num">0/${world.count}</div><button class="iconbtn" type="button" aria-label="How to play">${ICON.help}</button></div>
    <div class="bstage"><canvas aria-label="Monster board"></canvas></div><div class="hud"></div></section>`);
  show(s);
  const [leave, help] = s.querySelectorAll('.bt-top .iconbtn');
  battle = new Battle({ canvas: $(s, 'canvas'), hud: $(s, '.hud'), top: { cnt: $(s, '.cnt'), round: $(s, '.rd') }, player: P, world, sfx,
    onEnd: (r) => afterFight(world, r), onInspect: inspect, onBoss: (id) => splash(id, MONSTERS[id].name, 'BOSS · ' + MONSTERS[id].lore.toUpperCase()) });
  splash(world.boss, world.name, `${world.count} MONSTERS · BOSS LAST`);
  leave.onclick = () => {
    if (!leave.dataset.sure) { leave.dataset.sure = 1; toast('Tap × again to leave. You keep XP and gear.'); setTimeout(() => delete leave.dataset.sure, 2500); return; }
    if (battle) { P.hp = battle.hero.hp; const r = { win: false, fled: true, xp: battle.xp, kills: battle.kills, total: battle.total, drops: battle.drops }; battle.destroy(); battle = null; afterFight(world, r); }
  };
  help.onclick = helpSheet;
  if (!P.seenHelp) { P.seenHelp = true; save(P); setTimeout(helpSheet, 2000); }
}
function splash(id, big, small) {
  const el = h(`<div class="splash"><div class="t"><b>${esc(big)}</b><span>${esc(small)}</span></div></div>`);
  el.prepend(monArt(id)); app.append(el); setTimeout(() => el.remove(), 1950);
}
function inspect(m) {
  sheet(m.m.name, (body) => {
    const v = h(`<div class="inspect"><div class="art"></div><div class="facts">
      <div class="eyebrow">Level ${m.lvl}${m.m.boss ? ' · Boss' : ''}</div><p style="color:#ddd3c6">${esc(m.m.lore)}</p>
      <div><b class="num">${Math.max(0, m.hp)}/${m.max}</b> HP</div><div><b class="num">${m.atk}</b> attack · <b class="num">${m.def}</b> defence</div>
      ${m.m.role ? `<div><span class="rolepill" style="--rc:${{ buffer: '#4fa3ff', caster: '#c58bff', ranger: '#ffd23c', treasure: '#e3a72f' }[m.m.role]}">${m.m.role}</span></div><p class="fine">${battle ? battle.roleText(m.m.role) : ''}</p>` : ''}
      <p class="fine">${['Passive: harmless until hit.', `Waking: attacks in ${m.timer} round${m.timer === 1 ? '' : 's'}.`, 'Ready: attacks next round.', 'Aggressive: attacks every round.'][m.agg]}${m.stun ? ' Stunned.' : ''}</p></div></div>`);
    $(v, '.art').append(monArt(m.id));
    body.append(v);
  });
}
function helpSheet() {
  const pages = [
    ['Wake them carefully', 'Monsters sleep until hit. Each one shows an hourglass: <b style="color:#9a9aa6">grey</b> = waking (number = rounds), <b style="color:#ffd23c">yellow</b> = attacks next round, <b style="color:#ff4a3c">red</b> = attacks every round.'],
    ['Weapons', '<b>Afena</b> (sword) is free but enrages its target and wakes its neighbours. <b>Akuma</b> (axe, 3 in a row) and <b>Pea</b> (spear, heavy) cost stamina and calm red monsters back to yellow.'],
    ['Spells', 'Spells cost nothing but have cooldowns. Everything they hit drops back to grey. New spells unlock each time you clear a world.'],
    ['Aim', 'Pick an action, press a monster and drag to see the pattern, release to strike. With nothing picked, a tap shows a monster\'s card.'],
    ['Special monsters', '<span style="color:#4fa3ff">Blue</span> buffers triple an ally, <span style="color:#c58bff">purple</span> casters charge 3 rounds then blast, <span style="color:#ffd23c">yellow</span> rangers also shoot when ready, <span style="color:#e3b448">gold</span> imps never fight and always drop gear.'],
  ];
  sheet('How to hunt', (body) => {
    body.append(paged(pages, 1, ([t, p]) => h(`<div class="helpcard"><h4>${t}</h4><p>${p}</p></div>`), 'helpwrap'));
  });
}
function afterFight(world, r) {
  battle = null;
  const msgs = gainXp(P, r.xp);
  const items = r.drops.map((d) => rollItem(d.tier, d.luck));
  P.bag.push(...items);
  P.best[world.id] = Math.max(P.best[world.id] || 0, r.kills);
  let head = r.fled ? 'You withdrew' : 'Fallen';
  const extra = [];
  if (r.win) {
    head = 'World cleared'; P.stats.bosses++;
    if (!P.cleared.includes(world.id)) {
      P.cleared.push(world.id);
      const next = WORLDS[WORLDS.indexOf(world) + 1]; if (next && !P.unlocked.includes(next.id)) { P.unlocked.push(next.id); extra.push(`${next.name} is open on the map`); mapSel = next.id; }
      const spell = Object.values(SPELLS).filter((sp) => sp.unlock === P.cleared.length); spell.forEach((sp) => extra.push(`New spell: ${sp.name} (${sp.en})`));
    }
  }
  P.hp = maxStats(P).hp; save(P); sfx(r.win ? 'level' : r.fled ? 'click' : 'lose');
  const s = h(`<section class="scr result"><div class="stage"><div class="split" style="grid-template-columns:52% 48%"><div class="art" style="${r.win ? '' : 'filter:grayscale(.7) brightness(.6)'}"></div>
    <div class="side" style="justify-content:center"><h2>${head}</h2><div class="lines"><div>${r.kills}/${r.total} monsters</div><div>+${r.xp} XP</div>
    ${[...msgs, ...extra].map((m) => `<div class="up">${esc(m)}</div>`).join('')}</div></div></div></div>
    <div class="card" style="margin:0 12px 8px"><div class="eyebrow" style="margin-bottom:8px">${items.length ? `Loot · ${items.length}` : 'No loot this time'}</div><div class="drops"></div></div>
    <div style="padding:0 12px calc(12px + var(--safe-b))"><button class="btn hot wide" type="button">Back to the map</button></div></section>`);
  $(s, '.art').append(heroArt(P.hero));
  if (items.length) $(s, '.drops').append(paged(items, 4, (it) => { const t = h(`<div class="tile" style="--qc:${QUALITY[it.q].color}"></div>`); t.append(gearCanvas(it, 60)); return t; }, 'tiles'));
  else $(s, '.drops').append(h(`<p class="fine">${r.win ? '' : 'You keep every XP point earned. The world resets next time.'}</p>`));
  $(s, '.btn.hot').onclick = () => mapScreen();
  show(s);
}

title();
window.__g = { get battle() { return battle; }, get P() { return P; }, go, fight: (id) => fight(WORLDS.find((w) => w.id === id)) };
