// Gyeaman Squads: Hero Wars style squad battler, Akan chapter.
// Screens: map (pannable, stars per difficulty) · squad pick · battle (auto basics, timed skills, manual ultimates)
// · heroes (levels, stars from shards, skill upgrades with gold) · summon (cowrie gacha, beta: no purchases).
import { HEROES, MONS, STAGES, REGIONS, DIFF, RARITY, STARTERS, SKILL_MAX, skillCost, xpNeed, STAR_SHARDS, LOCKED_CHAPTERS, PULL_COST, PULL10_COST, PITY, PULL_RATES } from './data.js';
import { drawAdinkra, adinkraSvg, ADINKRA } from './adinkra.js';

const ROOT = /\/squads\/?$|\/squads\/index\.html$/.test(location.pathname) ? '../assets/' : 'assets/';
const A = ROOT + 'sq/';
const app = document.getElementById('app');
// painted currency icons (gold dust, cowries, XP, shards) are used by .coin elements through CSS variables
for (const k of ['gold', 'cowrie', 'xp', 'shard']) document.documentElement.style.setProperty(`--i-${k}`, `url("${A}ui/${k}.webp")`);
const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));

// ---------------- icons ----------------
const sv = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
// nav uses the Adinkra set: twisting path = the journey, Gyawu Atiko = valour (heroes), Nyame Dua = the altar (shrine)
const ICON = { map: adinkraSvg('nkyimkyim'), heroes: adinkraSvg('gyawuAtiko'), summon: adinkraSvg('nyameDua') };
const CHEV = (r) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${r}deg)"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COIN = (k, cls = '') => `<i class="coin ${k} ${cls}"></i>`;

// ---------------- save ----------------
const KEY = 'gyeaman.squads.v2';
const fresh = () => ({ v: 2, gold: 1500, cowries: 400, heroes: Object.fromEntries(STARTERS.map((id) => [id, newHero(id)])), squad: [...STARTERS], stars: {}, pity: 0, lastFree: '', seenIntro: false });
function newHero(id) { return { lvl: 1, xp: 0, stars: RARITY[HEROES[id].rarity].stars, shards: 0, sk: [1, 1, 1] }; }
let SAVE;
try { SAVE = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { SAVE = null; }
if (!SAVE || SAVE.v !== 2) SAVE = fresh();
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* storage blocked */ } };
const today = () => new Date().toISOString().slice(0, 10);
const starKey = (i, d) => `${i}:${d}`;
const starsOf = (i, d) => SAVE.stars[starKey(i, d)] || 0;
const cleared = (i) => starsOf(i, 'normal') > 0 || starsOf(i, 'easy') > 0 || starsOf(i, 'hard') > 0;
const openStage = () => { let i = 0; while (i < STAGES.length && cleared(i)) i++; return Math.min(i, STAGES.length - 1); };

// ---------------- sound ----------------
let ac = null;
function unlock() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } }
function tone(f, d, type = 'triangle', v = 0.06, slide = 1, delay = 0) {
  if (!ac) return; const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + d);
}
const SFX = {
  click: () => tone(660, .05, 'square', .03), hit: () => { tone(150, .14, 'sawtooth', .06, .5); tone(70, .18, 'sine', .1, .6); },
  crit: () => { tone(220, .22, 'sawtooth', .08, .3); tone(55, .3, 'sine', .14, .5); }, shoot: () => tone(900, .1, 'triangle', .04, .4),
  ult: () => { tone(520, .35, 'sine', .08, 2); tone(220, .4, 'sawtooth', .05, .5, .1); }, heal: () => { tone(523, .15); tone(784, .2, 'triangle', .06, 1, .1); },
  die: () => tone(300, .35, 'square', .04, .25), drum: (i = 0) => { tone(90, .25, 'sine', .2, .5, i); tone(180, .08, 'square', .04, .5, i); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .25, 'triangle', .07, 1, i * .1)), lose: () => [392, 330, 262].forEach((f, i) => tone(f, .3, 'sine', .07, 1, i * .15)),
};

// ---------------- images ----------------
const IM = {};
function img(src) {
  if (!IM[src]) { const e = { el: new Image(), ok: false, sc: {}, sil: {} }; e.el.decoding = 'async'; e.el.onload = () => { e.ok = true; }; e.el.src = src; IM[src] = e; }
  return IM[src];
}
const poseSrc = (id, k) => `${A}${id}_${k}.webp`;
const faceSrc = (id) => (HEROES[id] ? `${A}face_${id}.webp` : poseSrc(id, 0));
// Prescaled copy (crisp downsizing) and silhouettes for outline/flash effects.
function scaled(e, th) {
  if (!e.ok) return null; th = Math.max(16, Math.round(th / 8) * 8);
  if (th >= e.el.naturalHeight * 0.8) return e.el;
  if (e.sc[th]) return e.sc[th];
  let src = e.el, w = src.naturalWidth, hh = src.naturalHeight;
  while (hh / 2 >= th) { const c = document.createElement('canvas'); c.width = Math.round(w / 2); c.height = Math.round(hh / 2); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); src = c; w = c.width; hh = c.height; }
  const c = document.createElement('canvas'); c.width = Math.round(w * th / hh); c.height = th; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
  return (e.sc[th] = c);
}
function silhouette(e, th, color) {
  const s = scaled(e, th); if (!s) return null; const k = th + color;
  if (e.sil[k]) return e.sil[k];
  const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const g = c.getContext('2d');
  g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return (e.sil[k] = c);
}
// preload everything we will draw in battle
for (const id of [...Object.keys(HEROES), ...Object.keys(MONS)]) for (let k = 0; k < 3; k++) img(poseSrc(id, k));
for (const r of Object.values(REGIONS)) img(`${A}bg_${r.bg}.webp`);
// Effect animations: frames rendered from Firefly video clips on black, drawn additively ('lighter') so black = transparent.
// base = where the effect touches the ground, as a fraction of frame height.
const FXS = {
  shield: { n: 14, w: 244, h: 178, base: .94, loop: [8, 13] },
  heal: { n: 16, w: 208, h: 226, base: .86 },
  fire: { n: 10, w: 348, h: 232, base: .9 },
  hex: { n: 10, w: 348, h: 232, base: .9 },
};
for (const k in FXS) FXS[k].img = img(`${A}fx/${k}.webp`);
function sprite(g, k, frame, cx, by, hh, alpha = 1) {
  const S = FXS[k]; if (!S || !S.img.ok) return false;
  const f = clamp(Math.floor(frame), 0, S.n - 1), ww = hh * S.w / S.h;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.drawImage(S.img.el, f * S.w, 0, S.w, S.h, cx - ww / 2, by - hh * S.base, ww, hh); g.restore(); return true;
}

// ---------------- hero stats ----------------
function statsOf(id) {
  const H = HEROES[id], s = SAVE.heroes[id], k = (1 + 0.1 * (s.lvl - 1)) * (1 + 0.15 * (s.stars - 1));
  return { hp: Math.round(H.hp * k), atk: Math.round(H.atk * k), def: Math.round(H.def * k), spd: H.spd };
}
const power = (id) => { const st = statsOf(id), s = SAVE.heroes[id]; return Math.round(st.hp * 0.5 + st.atk * 6 + st.def * 4 + (s.sk[0] + s.sk[1] + s.sk[2]) * 25); };
const skMult = (id, i) => 1 + 0.12 * (SAVE.heroes[id].sk[i] - 1);
const canPromote = (id) => { const s = SAVE.heroes[id]; return s.stars < 5 && s.shards >= STAR_SHARDS[s.stars + 1]; };
const anyUpgrade = () => Object.keys(SAVE.heroes).some((id) => canPromote(id) || SAVE.heroes[id].sk.some((l) => l < SKILL_MAX && SAVE.gold >= skillCost(l) * 3));

// ---------------- shell ----------------
let tab = 'map';
function shell(active, content) {
  app.classList.remove('full');
  app.innerHTML = '';
  const top = h(`<header class="topbar"><a class="logo" href="../" title="Back to Gyeaman"><img src="mark.svg" alt=""><span class="wm"><b>GYEAMAN</b><i>Gyeaman</i></span><em>Squads</em></a>
    <span class="res num" title="Gold dust">${COIN('gold')}<b>${fmt(SAVE.gold)}</b></span><span class="res num" title="Cowries">${COIN('cowrie')}<b>${fmt(SAVE.cowries)}</b></span></header>`);
  const nav = h(`<nav class="nav">${[['map', 'Journey'], ['heroes', 'Heroes'], ['summon', 'Shrine']].map(([k, l]) => `<button class="tab ${k === active ? 'on' : ''}" data-k="${k}" type="button">${ICON[k]}<span>${l}</span></button>`).join('')}</nav>`);
  if (anyUpgrade()) $('[data-k=heroes]', nav).append(h('<i class="dot"></i>'));
  if (SAVE.lastFree !== today()) $('[data-k=summon]', nav).append(h('<i class="dot"></i>'));
  nav.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { unlock(); SFX.click(); tab = b.dataset.k; route(); }));
  const main = h('<main></main>'); main.append(content);
  app.append(top, main, nav);
}
function route() { stopBattle(); if (mapKeys) { removeEventListener('keydown', mapKeys); mapKeys = null; } ({ map: mapScreen, heroes: () => heroesScreen(), summon: summonScreen })[tab](); }
function toast(msg) { app.querySelectorAll('.toast').forEach((t) => t.remove()); const t = h(`<div class="toast">${msg}</div>`); app.append(t); setTimeout(() => t.remove(), 2200); }

// ---------------- map ----------------
let sel = null, diff = 'normal', mapKeys = null;
function mapScreen() {
  const open = openStage();
  if (sel === null || sel > open) sel = open;
  const s = h(`<div class="mapscr"><div class="chapters"><span class="chap on">Ch. 1 · Akan</span>${LOCKED_CHAPTERS.map((c, i) => `<span class="chap">🔒 Ch. ${i + 2} · ${c}</span>`).join('')}</div>
    <div class="mapview"><div class="mapinner"><img src="${ROOT}map.webp" alt="World map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg></div>
      <button class="marrow l" type="button" aria-label="Pan left">${CHEV(180)}</button><button class="marrow r" type="button" aria-label="Pan right">${CHEV(0)}</button>
      <button class="marrow u" type="button" aria-label="Pan up">${CHEV(-90)}</button><button class="marrow d" type="button" aria-label="Pan down">${CHEV(90)}</button></div>
    <div class="stagepanel"></div></div>`);
  shell('map', s);
  const view = $('.mapview', s), inner = $('.mapinner', s), svg = $('svg', s);
  svg.innerHTML = `<polyline fill="none" stroke="rgba(244,238,228,.55)" stroke-width=".35" stroke-dasharray="1 1" points="${STAGES.map((t) => `${t.x * 100},${t.y * 100}`).join(' ')}"/>`;
  for (const [k, r] of Object.entries(REGIONS)) {
    const st = STAGES.filter((t) => t.region === k), x = st.reduce((a, t) => a + t.x, 0) / st.length, y = Math.min(...st.map((t) => t.y)) - .045;
    inner.append(h(`<div class="region" style="left:${x * 100}%;top:${y * 100}%">${r.name.toUpperCase()}</div>`));
  }
  STAGES.forEach((t, i) => {
    const best = Math.max(starsOf(i, 'easy'), starsOf(i, 'normal'), starsOf(i, 'hard'));
    const state = cleared(i) ? 'done' : i === open ? 'open' : '';
    const n = h(`<button class="node ${state} ${t.boss ? 'boss' : ''} ${i === sel ? 'sel' : ''}" type="button" style="left:${t.x * 100}%;top:${t.y * 100}%" ${i > open ? 'disabled' : ''} aria-label="Stage ${i + 1}, ${t.name}">
      ${t.boss ? `<img src="${poseSrc(t.waves.at(-1).find((m) => MONS[m].boss), 0)}" alt="">` : ''}<span class="n">${i + 1}</span>${best ? `<span class="st">${'★'.repeat(best)}${'☆'.repeat(3 - best)}</span>` : ''}</button>`);
    n.onclick = () => { sel = i; SFX.click(); inner.querySelectorAll('.node').forEach((x) => x.classList.remove('sel')); n.classList.add('sel'); centre(i, true); panel(); };
    inner.append(n);
  });
  // the map is drawn larger than the view; arrows (or arrow keys) pan it, selecting a stage centres it
  const size = () => {
    const r = view.getBoundingClientRect(); const H = Math.max(r.height * 1.5, r.width * 4 / 3 * 1.1), W = H * 0.75;
    inner.style.width = W + 'px'; inner.style.height = H + 'px'; return { r, W, H };
  };
  let { r, W, H } = size();
  const P = { x: 0, y: 0 };
  const arrows = { l: $('.marrow.l', s), r: $('.marrow.r', s), u: $('.marrow.u', s), d: $('.marrow.d', s) };
  const apply = (anim) => {
    P.x = clamp(P.x, Math.min(0, r.width - W), 0); P.y = clamp(P.y, Math.min(0, r.height - H), 0);
    inner.style.transition = anim ? 'transform .45s cubic-bezier(.2,.8,.2,1)' : 'none'; inner.style.transform = `translate(${P.x}px, ${P.y}px)`;
    arrows.l.hidden = P.x >= -1; arrows.r.hidden = P.x <= r.width - W + 1; arrows.u.hidden = P.y >= -1; arrows.d.hidden = P.y <= r.height - H + 1;
  };
  function centre(i, anim) { const t = STAGES[i]; P.x = r.width / 2 - t.x * W; P.y = r.height / 2 - t.y * H; apply(anim); }
  const pan = (dx, dy) => { unlock(); SFX.click(); P.x -= dx * r.width * .65; P.y -= dy * r.height * .65; apply(true); };
  arrows.l.onclick = () => pan(-1, 0); arrows.r.onclick = () => pan(1, 0); arrows.u.onclick = () => pan(0, -1); arrows.d.onclick = () => pan(0, 1);
  mapKeys = (e) => { const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (k && view.isConnected) { e.preventDefault(); pan(...k); } };
  addEventListener('keydown', mapKeys);
  centre(sel, false);
  new ResizeObserver(() => { if (!view.isConnected) return; ({ r, W, H } = size()); centre(sel, false); }).observe(view);
  const pane = $('.stagepanel', s);
  const panel = () => {
    const t = STAGES[sel], foes = [...new Set(t.waves.flat())], d = DIFF.find((x) => x.id === diff);
    const hardOpen = starsOf(sel, 'normal') > 0;
    if (diff === 'hard' && !hardOpen) diff = 'normal';
    const gold = Math.round((60 + t.lvl * 40) * d.gold), first = !starsOf(sel, diff);
    pane.innerHTML = `<div class="scard"><div class="eyebrow">Stage ${sel + 1} · ${REGIONS[t.region].name} · level ${t.lvl} · ${t.waves.length} wave${t.waves.length > 1 ? 's' : ''}</div><h3>${t.name}</h3>
      <div class="foes">${foes.map((k) => `<div class="f ${MONS[k].boss ? 'boss' : ''}" title="${MONS[k].name}"><img src="${poseSrc(k, 0)}" alt="${MONS[k].name}"></div>`).join('')}</div>
      <div class="diffs">${DIFF.map((x) => `<button class="diff ${x.id === diff ? 'on' : ''}" type="button" data-d="${x.id}" style="--dc:${x.color}" ${x.id === 'hard' && !hardOpen ? 'disabled title="Clear Normal first"' : ''}><b>${x.name}</b><span>${'★'.repeat(starsOf(sel, x.id))}${'☆'.repeat(3 - starsOf(sel, x.id))}</span></button>`).join('')}</div>
      <div class="reward"><span>${COIN('gold')}${gold}</span>${first ? `<span>${COIN('cowrie')}${t.boss ? 100 : diff === 'hard' ? 60 : 30} first clear</span>` : ''}<span>${COIN('xp')}${30 + t.lvl * 15} XP</span></div>
      ${powerRow(squadPower(), enemyPower(t, d))}</div>
      <button class="btn wide" type="button" id="go">Prepare squad</button>`;
    pane.querySelectorAll('.diff').forEach((b) => (b.onclick = () => { diff = b.dataset.d; SFX.click(); panel(); }));
    $('#go', pane).onclick = () => { unlock(); SFX.click(); squadScreen(); };
  };
  panel();
}

// ---------------- squad ----------------
function heroCard(id, extra = '') {
  const H = HEROES[id], s = SAVE.heroes[id], own = !!s;
  return `<button class="hc ${own ? '' : 'locked'} ${extra}" type="button" data-id="${id}" style="--rc:${RARITY[H.rarity].color}"><img src="${faceSrc(id)}" alt="">
    ${own ? `<span class="lv">Lv ${s.lvl}</span><span class="stars">${'★'.repeat(s.stars)}</span>` : ''}<span class="lab"><b>${H.name}</b><span>${own ? H.role : 'Summon to recruit'}</span></span></button>`;
}
const squadPower = () => SAVE.squad.filter((x) => SAVE.heroes[x]).reduce((a, id) => a + power(id), 0);
function enemyPower(t, d) {
  const k = (1 + (t.lvl - 1) * MON_LVL) * d.mult * t.pow;
  return Math.round(Math.max(...t.waves.map((w) => w.reduce((a, id) => { const M = MONS[id]; return a + (M.hp * .5 + M.atk * 6 + M.def * 4) * k; }, 0))));
}
function powerRow(mine, foe) {
  const r = mine / foe, c = r >= 1.15 ? 'var(--good)' : r >= .9 ? 'var(--orange)' : 'var(--blood)', w = r >= 1.15 ? 'Favoured' : r >= .9 ? 'Even fight' : 'Dangerous';
  return `<div class="vs"><div><span>Your squad</span><b class="num">${fmt(mine)}</b></div><em style="color:${c}">${w}</em><div><span>Enemy</span><b class="num">${fmt(foe)}</b></div></div>`;
}
function squadScreen() {
  const t = STAGES[sel], D = DIFF.find((x) => x.id === diff);
  const s = h(`<div class="screen"><div class="head"><button class="btn ghost sm" type="button">${CHEV(180)} Journey</button><h2>Prepare squad</h2><span class="pill" style="color:${D.color}">${D.name}</span></div>
    <div class="formation"></div><div class="vsbox"></div><div class="eyebrow">Roster · tap to add or remove</div><div class="grid roster"></div>
    <div class="squadbar"><button class="btn wide big" type="button" id="fight">Fight · Stage ${sel + 1}</button></div></div>`);
  shell('map', s);
  $('.head .btn', s).onclick = mapScreen;
  const grid = $('.roster', s), form = $('.formation', s);
  const toggle = (id) => { const i = SAVE.squad.indexOf(id); if (i >= 0) SAVE.squad.splice(i, 1); else if (SAVE.squad.length < 5) SAVE.squad.push(id); else return toast('A squad holds 5 heroes'); SFX.click(); store(); draw(); };
  const draw = () => {
    SAVE.squad = SAVE.squad.filter((x) => SAVE.heroes[x]);
    const ids = Object.keys(HEROES).filter((id) => SAVE.heroes[id]).sort((a, b) => power(b) - power(a));
    // formation: front line first (as they stand in battle, right to left)
    const sq = [...SAVE.squad].sort((a, b) => HEROES[a].row - HEROES[b].row);
    form.innerHTML = Array.from({ length: 5 }, (_, i) => sq[i] ? heroCard(sq[i], 'on mini').replace('data-id', 'data-sq="1" data-id') : '<div class="hc empty"><span>+</span></div>').reverse().join('');
    grid.innerHTML = ids.map((id) => heroCard(id, SAVE.squad.includes(id) ? 'picked' : '')).join('');
    s.querySelectorAll('.hc[data-id]').forEach((c) => (c.onclick = () => toggle(c.dataset.id)));
    $('.vsbox', s).innerHTML = powerRow(squadPower(), enemyPower(t, D));
    $('#fight', s).disabled = !SAVE.squad.length;
  };
  $('#fight', s).onclick = () => { unlock(); battle(sel, diff); };
  draw();
}

// ---------------- heroes ----------------
let heroSel = null, poseLoop = null;
function heroesScreen(id) {
  if (poseLoop) { cancelAnimationFrame(poseLoop); poseLoop = null; }
  if (id) heroSel = id;
  if (!heroSel) {
    const ids = Object.keys(HEROES).sort((a, b) => (SAVE.heroes[b] ? 1 : 0) - (SAVE.heroes[a] ? 1 : 0) || 'R SR SSR'.indexOf(HEROES[b].rarity) - 'R SR SSR'.indexOf(HEROES[a].rarity));
    const s = h(`<div class="screen"><div class="head"><h2>Heroes</h2><span class="pill">${Object.keys(SAVE.heroes).length}/8</span></div><div class="grid">${ids.map((x) => heroCard(x)).join('')}</div></div>`);
    shell('heroes', s);
    s.querySelectorAll('.hc').forEach((c) => { if (SAVE.heroes[c.dataset.id] && (canPromote(c.dataset.id))) c.append(h('<i class="dot"></i>')); c.onclick = () => { SFX.click(); heroesScreen(c.dataset.id); }; });
    return;
  }
  const H = HEROES[heroSel], s0 = SAVE.heroes[heroSel], own = !!s0, R = RARITY[H.rarity], AD = ADINKRA[H.sym];
  const st = own ? statsOf(heroSel) : { hp: H.hp, atk: H.atk, def: H.def };
  const s = h(`<div class="screen"><div class="head"><button class="btn ghost sm" type="button">‹ Heroes</button><h2></h2></div><div class="detail">
    <div class="stage3"><canvas aria-label="${H.name}"></canvas><div class="poses"><button class="btn ghost sm" data-p="0" type="button">Idle</button><button class="btn ghost sm" data-p="1" type="button">Attack</button><button class="btn ghost sm" data-p="2" type="button">Ultimate</button></div></div>
    <div class="info"><div><span class="eyebrow" style="color:${R.color}">${R.name}</span><h2>${H.name}</h2><div class="rolel">${H.role} · ${H.en}</div></div>
      ${own ? `<div class="eyebrow">Level ${s0.lvl} · ${'★'.repeat(s0.stars)}${'☆'.repeat(5 - s0.stars)}</div><div class="bar"><i style="transform:scaleX(${s0.xp / xpNeed(s0.lvl)})"></i></div>` : '<div class="eyebrow" style="color:var(--orange)">Not recruited · summon at the shrine</div>'}
      <div class="st4"><div><b>${st.hp}</b><span>HP</span></div><div><b>${st.atk}</b><span>ATK</span></div><div><b>${st.def}</b><span>DEF</span></div><div><b>${own ? power(heroSel) : '?'}</b><span>POWER</span></div></div>
      ${own ? `<div class="skill"><div><strong>${COIN('shard')} Shards ${s0.shards}/${s0.stars < 5 ? STAR_SHARDS[s0.stars + 1] : 'max'}</strong><small>Duplicate summons give shards. Each star adds 15% to all stats.</small></div><button class="btn sm" id="promo" type="button" ${canPromote(heroSel) ? '' : 'disabled'}>Promote</button></div>` : ''}
      <div class="skills" style="display:grid;gap:6px"></div>
      <div class="codex">${adinkraSvg(H.sym)}<div><span class="eyebrow">Ultimate symbol</span><b>${AD.name}</b><small>${AD.meaning}</small></div></div></div></div></div>`);
  shell('heroes', s);
  $('.head .btn', s).onclick = () => { heroSel = null; heroesScreen(); };
  const sk = $('.skills', s);
  ['Basic', 'Skill', 'Ultimate'].forEach((tag, i) => {
    const lvl = own ? s0.sk[i] : 1, cost = skillCost(lvl);
    const row = h(`<div class="skill"><div><span class="tag">${tag}</span><strong>${H.kit[i]}<em>${own ? 'Lv ' + lvl : ''}</em></strong><small>${H.notes[i]}${own && lvl > 1 ? ` (+${Math.round((skMult(heroSel, i) - 1) * 100)}%)` : ''}</small></div>
      ${own ? `<button class="btn sm ghost" type="button" ${lvl >= SKILL_MAX || SAVE.gold < cost ? 'disabled' : ''}>${lvl >= SKILL_MAX ? 'Max' : `<i class="coin gold"></i>${fmt(cost)}`}</button>` : ''}</div>`);
    const b = $('button', row); if (b) b.onclick = () => { SAVE.gold -= cost; s0.sk[i]++; SFX.heal(); store(); heroesScreen(); };
    sk.append(row);
  });
  const pr = $('#promo', s); if (pr) pr.onclick = () => { s0.shards -= STAR_SHARDS[s0.stars + 1]; s0.stars++; SFX.win(); store(); toast(`${H.name} reached ${s0.stars} stars`); heroesScreen(); };
  // pose stage: idle breathing, tap a pose to see it (with its effect)
  const cv = $('canvas', s); let pose = 0, poseT = 0, fxT = 0;
  s.querySelectorAll('.poses .btn').forEach((b) => (b.onclick = () => { pose = +b.dataset.p; poseT = performance.now(); fxT = poseT; if (pose === 2) SFX.ult(); else if (pose === 1) SFX.hit(); }));
  const draw = (now) => {
    if (!cv.isConnected) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    if (pose && now - poseT > (pose === 2 ? 2200 : 900)) pose = 0;
    const e0 = img(poseSrc(heroSel, 0)), e = img(poseSrc(heroSel, pose));
    if (e.ok && e0.ok) {
      const Hh = (r.height - 50) * 0.95, k = Hh / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k;
      const sc = scaled(e, ph * dpr), x = r.width / 2, y = r.height - 44 + Math.sin(now / 500) * 2;
      if (pose === 2) { const t = (now - fxT) / 1000; g.save(); g.translate(x, y - ph * .55); g.globalAlpha = Math.max(0, 1 - t / 2); g.fillStyle = '#e3b448'; g.shadowColor = '#e3b448'; g.shadowBlur = 20; drawAdinkra(g, H.sym, Math.min(r.width, r.height) * (.5 + t * .15)); g.restore(); }
      if (sc) { g.save(); if (H.flip[pose]) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); } g.drawImage(sc, x - pw / 2, y - ph, pw, ph); g.restore(); }
    }
    poseLoop = requestAnimationFrame(draw);
  };
  poseLoop = requestAnimationFrame(draw);
  $('.head h2', s).textContent = '';
}

// ---------------- summon ----------------
function summonScreen() {
  const free = SAVE.lastFree !== today();
  const s = h(`<div class="summon"><div><div class="shrine"><canvas width="300" height="300" aria-hidden="true"></canvas></div>
    <h2 style="margin-top:14px;font-size:30px">Abosom Shrine</h2><p style="color:#ddd3c6;max-width:360px;margin:6px auto 0">Offer cowries to call a hunter. Duplicates become shards that raise their stars.</p>
    <div class="pullrow">${free ? '<button class="btn" type="button" data-n="0">Free daily call</button>' : ''}<button class="btn ${free ? 'ghost' : ''}" type="button" data-n="1"><i class="coin cowrie"></i>${PULL_COST} · Call 1</button><button class="btn ghost" type="button" data-n="10"><i class="coin cowrie"></i>${PULL10_COST} · Call 10</button></div>
    <p class="rates">Legendary 4% · Epic 18% · Rare 38% · gold 40% · Legendary guaranteed within ${PITY} calls (${PITY - SAVE.pity} left) · Beta: cowries are earned in play, nothing is sold.</p></div></div>`);
  shell('summon', s);
  const c = $('canvas', s), g = c.getContext('2d'); g.translate(150, 150); g.fillStyle = '#e3b448'; g.shadowColor = '#e3b448'; g.shadowBlur = 16; drawAdinkra(g, 'nyameDua', 200);
  s.querySelectorAll('.pullrow .btn').forEach((b) => (b.onclick = () => {
    unlock(); const n = +b.dataset.n;
    if (n === 0) { SAVE.lastFree = today(); return doPulls(1); }
    const cost = n === 10 ? PULL10_COST : PULL_COST;
    if (SAVE.cowries < cost) { toast('Not enough cowries. Clear stages to earn more.'); return; }
    SAVE.cowries -= cost; doPulls(n);
  }));
}
function rollOne() {
  SAVE.pity++;
  let tier;
  if (SAVE.pity >= PITY) tier = 'SSR';
  else { let r = Math.random(); tier = PULL_RATES.find(([, p]) => (r -= p) < 0)?.[0] || 'gold'; }
  if (tier === 'SSR') SAVE.pity = 0;
  if (tier === 'gold') { const g = 400 + Math.floor(Math.random() * 6) * 100; SAVE.gold += g; return { gold: g }; }
  const pool = Object.keys(HEROES).filter((id) => HEROES[id].rarity === tier), id = pick(pool);
  if (SAVE.heroes[id]) { SAVE.heroes[id].shards += RARITY[tier].shards; return { id, shards: RARITY[tier].shards }; }
  SAVE.heroes[id] = newHero(id); return { id, fresh: true };
}
function doPulls(n) {
  const res = Array.from({ length: n }, rollOne); store();
  const best = res.reduce((b, r) => (r.id && 'R SR SSR'.indexOf(HEROES[r.id].rarity) > (b ? 'R SR SSR'.indexOf(HEROES[b].rarity) : -1) ? r.id : b), null);
  const rc = best ? RARITY[HEROES[best].rarity].color : '#e3b448';
  const v = h(`<div class="reveal" style="--rc:${rc}"><div class="glow"></div><div class="body" style="position:relative;display:grid;gap:14px;justify-items:center"></div></div>`);
  app.append(v);
  [0, .25, .5].forEach((d) => SFX.drum(d)); if (best && HEROES[best].rarity === 'SSR') setTimeout(SFX.win, 700);
  const body = $('.body', v);
  const card = (r, i) => r.gold ? `<div class="hc" style="--rc:#e3b448;animation-delay:${i * .08}s;display:grid;place-items:center"><span style="font:20px var(--display);color:var(--gold);text-align:center"><i class="coin gold" style="width:28px;height:28px;display:block;margin:0 auto 6px"></i>${r.gold}</span></div>`
    : heroCard(r.id).replace('class="hc', `style="animation-delay:${i * .08}s" class="hc`).replace('</button>', `${r.fresh ? '<span class="lv" style="top:auto;bottom:40px;color:var(--gold)">NEW</span>' : `<span class="lv" style="top:auto;bottom:40px">+${r.shards} shards</span>`}</button>`);
  if (n === 1) {
    const r = res[0];
    body.innerHTML = r.gold ? `<div class="one" style="--rc:#e3b448"><i class="coin gold" style="width:90px;height:90px"></i><h2>${r.gold} gold</h2></div>`
      : `<div class="one" style="--rc:${RARITY[HEROES[r.id].rarity].color}"><img src="${poseSrc(r.id, 2)}" alt=""><span class="eyebrow" style="color:var(--rc)">${RARITY[HEROES[r.id].rarity].name}${r.fresh ? ' · new hunter' : ` · +${r.shards} shards`}</span><h2>${HEROES[r.id].name}</h2><div style="font:16px var(--display);color:var(--orange)">${HEROES[r.id].role} · ${HEROES[r.id].en}</div></div>`;
  } else body.innerHTML = `<div class="ten">${res.map(card).join('')}</div>`;
  body.append(h('<button class="btn" type="button">Continue</button>'));
  $('.btn', body).onclick = () => { v.remove(); summonScreen(); };
}

// ---------------- battle ----------------
let B = null;
const MON_LVL = 0.22;
function stopBattle() { if (B) { cancelAnimationFrame(B.raf); B = null; } if (poseLoop) { cancelAnimationFrame(poseLoop); poseLoop = null; } }
// slots (x, depth on the floor 0 = far .. 1 = near, scale): front line first, alternating lanes so nobody hides behind anybody.
// Feet are placed inside the background's painted floor band (REGIONS[].ground) so nobody stands in the trees or the sky.
const SLOTS = [[.36, .6, 1], [.27, .12, .9], [.23, .98, 1.04], [.15, .4, .94], [.09, .02, .88]];
function mkHero(id, i) {
  const H = HEROES[id], st = statsOf(id);
  return { side: 0, id, d: H, name: H.name, hp: st.hp, max: st.hp, atk: st.atk, def: st.def, spd: H.spd, range: H.range, row: H.row, dive: H.dive,
    sk: SAVE.heroes[id].sk, cd: rnd(.3, 1), skCd: [0, 6, 7, 8, 7, 7, 6, 7, 6][i] || 7, skT: rnd(3, 5), en: 0, shield: 0, taunt: 0, stun: 0, buff: 0, pose: 0, poseT: 0, dash: 0, reach: 0, hurt: 0, h: 100, w: 60, alive: true, size: H.size, flip: H.flip };
}
function mkMon(id, lvl, mult) {
  const M = MONS[id], k = (1 + (lvl - 1) * MON_LVL) * mult;
  return { side: 1, id, d: M, name: M.name, hp: Math.round(M.hp * k), max: Math.round(M.hp * k), atk: M.atk * k, def: M.def * k, spd: M.spd, range: M.range, row: M.range ? 1 : 0,
    cd: rnd(.6, 1.4), en: M.boss ? 25 : 0, shield: 0, taunt: 0, stun: 0, buff: 0, pose: 0, poseT: 0, dash: 0, reach: 0, hurt: 0, h: 100, w: 60, alive: true, size: M.size, flip: M.flip, boss: M.boss, enter: 1 };
}
function place(list, side) {
  const order = [...list].sort((a, b) => a.row - b.row);
  order.forEach((u, i) => { const s = SLOTS[i % SLOTS.length]; u.fx = side ? 1 - s[0] : s[0]; u.fy = s[1]; u.depth = s[2]; u.slot = i; });
}
function battle(stageIdx, diffId) {
  stopBattle();
  const t = STAGES[stageIdx], D = DIFF.find((x) => x.id === diffId);
  app.innerHTML = ''; app.classList.add('full');
  const s = h(`<main><div class="battle"><div class="btop"><button class="btn ghost sm" type="button" id="leave">${CHEV(180)}</button><div class="t"><b>${t.name}</b><span id="wave"></span></div>
    <button class="tog" type="button" id="auto" aria-pressed="false">AUTO</button><button class="tog" type="button" id="spd" aria-pressed="false">×2</button></div>
    <div class="field"><canvas aria-label="Battlefield"></canvas><div class="hint" id="hint">Tap an enemy to focus it · tap a glowing card for its ultimate</div></div><div class="cards"></div></div></main>`);
  app.append(s);
  const heroes = SAVE.squad.map((id, i) => mkHero(id, Object.keys(HEROES).indexOf(id) + 1));
  place(heroes, 0);
  B = { gy0: 0, gy1: 1, ground: REGIONS[t.region].ground, t, stageIdx, D, wave: 0, heroes, foes: [], fx: [], parts: [], floats: [], auto: false, speed: 1, shake: 0, flash: 0, over: false, pause: 0, focus: null, cv: $('canvas', s), s, last: performance.now(), bg: img(`${A}bg_${REGIONS[t.region].bg}.webp`) };
  $('#leave', s).onclick = () => { stopBattle(); mapScreen(); };
  $('#auto', s).onclick = (e) => { B.auto = !B.auto; e.currentTarget.setAttribute('aria-pressed', B.auto); SFX.click(); };
  $('#spd', s).onclick = (e) => { B.speed = B.speed === 1 ? 2 : 1; e.currentTarget.setAttribute('aria-pressed', B.speed === 2); SFX.click(); };
  setTimeout(() => { const hn = $('#hint', s); if (hn) hn.remove(); }, 5000);
  const cards = $('.cards', s);
  for (let i = 0; i < 5; i++) {
    const u = heroes[i];
    const c = h(`<button class="uc ${u ? '' : 'empty'}" type="button" ${u ? '' : 'disabled'}>${u ? `<img src="${faceSrc(u.id)}" alt="${u.name}"><span class="nm">${u.name}</span><div class="bars"><i style="--c:var(--good)"></i><i style="--c:var(--gold)"></i></div>` : ''}</button>`);
    if (u) { u.card = c; c.onclick = () => castUlt(u); }
    cards.append(c);
  }
  B.cv.onpointerdown = (e) => {
    const r = B.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hitU = alive(B.foes).find((u) => { const [ux, uy] = pos(u); return Math.abs(x - ux) < u.w / 2 && y < uy && y > uy - u.h; });
    if (hitU) { B.focus = B.focus === hitU ? null : hitU; SFX.click(); }
  };
  nextWave();
  B.raf = requestAnimationFrame(loop);
}
function nextWave() {
  const ids = B.t.waves[B.wave];
  B.foes = ids.map((id) => mkMon(id, B.t.lvl, B.D.mult * B.t.pow)); place(B.foes, 1); B.focus = null; B.wave > 0 && SFX.drum();
  $('#wave', B.s).textContent = `${B.D.name} · wave ${B.wave + 1}/${B.t.waves.length}`;
  const boss = B.foes.find((f) => f.boss); if (boss) cutIn(poseSrc(boss.id, 2), boss.name, 'BOSS', '#d23b31', true, boss.flip[2]);
}
const alive = (l) => l.filter((u) => u.alive);
function pos(u) { const W = B.w; const dir = u.side ? -1 : 1; return [u.fx * W + dir * u.dash * u.reach + (u.enter || 0) * (u.side ? 1 : -1) * W * .4, B.gy0 + u.fy * (B.gy1 - B.gy0)]; }
function targetFor(u, kind) {
  const foes = alive(u.side ? B.heroes : B.foes); if (!foes.length) return null;
  const taunt = foes.find((f) => f.taunt > 0); if (taunt) return taunt;
  if (!u.side && B.focus && B.focus.alive) return B.focus;
  if (kind === 'weak' || u.dive) return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
  if (kind === 'back') return foes.reduce((a, b) => (Math.abs(b.fx - u.fx) > Math.abs(a.fx - u.fx) ? b : a));
  if (u.range) return pick(foes);
  return foes.reduce((a, b) => (Math.abs(b.fx - u.fx) < Math.abs(a.fx - u.fx) ? b : a));
}
function hit(src, dst, mult, color = '#fff', o = {}) {
  if (!dst || !dst.alive || !B) return 0;
  let d = src.atk * mult * (1 + (src.buff > 0 ? .2 : 0)) * rnd(.9, 1.1) * 100 / (100 + dst.def);
  const crit = o.crit === true || Math.random() < (o.crit || .08); if (crit) d *= 1.6;
  d = Math.round(d);
  if (dst.shield) { const ab = Math.min(dst.shield, d); dst.shield -= ab; d -= ab; }
  dst.hp -= d; dst.hurt = 1;
  dst.en = Math.min(100, dst.en + 6 + d / dst.max * 70); if (!o.noEn) src.en = Math.min(100, src.en + 12);
  const [x, y] = pos(dst);
  B.floats.push({ x: x + rnd(-12, 12), y: y - dst.h * .8, t: (crit ? 'CRIT ' : '') + d, c: crit ? '#ffd23c' : dst.side ? '#fff' : '#ff6a5a', life: 1, size: crit ? 1.35 : 1 });
  burst(x, y - dst.h * .45, [color, '#fff'], crit ? 12 : 6, crit ? 5 : 3);
  (crit ? SFX.crit : SFX.hit)();
  if (dst.hp <= 0) {
    dst.alive = false; dst.hp = 0; dst.dieT = 1; burst(x, y - dst.h * .4, ['#fff', '#d23b31', '#1a1216'], 22, 6); SFX.die();
    if (dst.d.gold) { B.bonusGold = (B.bonusGold || 0) + 200; B.floats.push({ x, y: y - dst.h, t: '+200 gold', c: '#e3b448', life: 1.3, size: 1 }); }
    if (B.focus === dst) B.focus = null;
  }
  return d;
}
function heal(u, n) { if (!u.alive) return; const v = Math.round(n); u.hp = Math.min(u.max, u.hp + v); const [x, y] = pos(u); B.floats.push({ x, y: y - u.h * .85, t: '+' + v, c: '#7ee08a', life: 1, size: 1 }); fx('spr', 1150, { k: 'heal', unit: u, hs: 1.3 }); for (let i = 0; i < 4; i++) B.parts.push({ x: x + rnd(-u.w * .3, u.w * .3), y: y - rnd(0, u.h * .8), vx: 0, vy: -rnd(.6, 1.6), g: -.01, life: 1, c: i % 2 ? '#7ee08a' : '#e9ffd0', sz: rnd(2, 4), glow: 1 }); }
function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = sp * rnd(.4, 1.2); B.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: .15, life: 1, c: cols[i % cols.length], sz: rnd(2, 5) }); } }
function fx(type, dur, o) { B.fx.push({ type, t0: performance.now(), dur, ...o }); }
const later = (ms, fn) => setTimeout(() => { if (B && !B.over) fn(); }, ms / (B ? B.speed : 1));
function setPose(u, p, ms) { u.pose = p; u.poseT = ms / 1000; }

function attack(u) {
  const tg = targetFor(u); if (!tg) return;
  setPose(u, 1, 380);
  const [x0, y0] = pos(u);
  if (u.range) {
    const kind = u.side ? (u.d.shot || 'hex') : u.id === 'kome' ? 'fire' : u.id === 'obiri' ? 'arrow' : 'spear';
    const [x1, y1] = pos(tg);
    fx('shot', 300, { x0: x0 + (u.side ? -1 : 1) * u.w * .3, y0: y0 - u.h * .6, x1, y1: y1 - tg.h * .5, kind });
    SFX.shoot(); later(300, () => hit(u, tg, 1 * (u.side ? 1 : skMult(u.id, 0)), kind === 'fire' ? '#ffb43c' : kind === 'hex' ? '#c58bff' : '#e6edf5'));
  } else {
    u.reach = Math.max(0, Math.abs(pos(tg)[0] - x0) - tg.w * .35 - u.w * .25); u.dash = 1; u.dashT = .25;
    later(170, () => { const [x, y] = pos(tg); fx('slash', 240, { x, y: y - tg.h * .5, r: tg.h * .38, c: u.side ? '#ff4a3c' : '#ffffff', dir: u.side ? -1 : 1 }); hit(u, tg, 1 * (u.side ? 1 : skMult(u.id, 0)), u.side ? '#ff4a3c' : '#fff'); });
  }
}
// auto skill (heroes, timed)
function skill(u) {
  const foes = alive(B.foes), team = alive(B.heroes); if (!foes.length) return;
  const m = skMult(u.id, 1), tg = targetFor(u);
  setPose(u, 1, 420);
  B.floats.push({ x: pos(u)[0], y: pos(u)[1] - u.h - 6, t: u.d.kit[1], c: '#f08a24', life: 1, size: .8 });
  switch (u.id) {
    case 'blay': [0, 160].forEach((d) => later(d, () => { const [x, y] = pos(tg); fx('slash', 220, { x, y: y - tg.h * .5, r: tg.h * .4, c: '#fff', dir: 1 }); hit(u, tg, 1.1 * m, '#fff'); })); break;
    case 'owureku': { const t2 = targetFor(u, 'back'); const [x0, y0] = pos(u), [x1, y1] = pos(t2); fx('shot', 380, { x0, y0: y0 - u.h * .6, x1, y1: y1 - t2.h * .5, kind: 'axe' }); later(380, () => hit(u, t2, 1.4 * m, '#ffb070')); break; }
    case 'gyakari': later(150, () => { hit(u, tg, 0.9 * m, '#6fb6ff'); tg.stun = 1.5; }); break;
    case 'obiri': for (let i = 0; i < 3; i++) later(i * 120, () => { const l = alive(B.foes); if (!l.length) return; const t2 = pick(l); const [x0, y0] = pos(u), [x1, y1] = pos(t2); fx('shot', 280, { x0, y0: y0 - u.h * .6, x1, y1: y1 - t2.h * .5, kind: 'arrow' }); later(280, () => hit(u, t2, .8 * m, '#e6edf5')); }); break;
    case 'kuukua': { const two = foes.sort((a, b) => Math.abs(a.fx - u.fx) - Math.abs(b.fx - u.fx)).slice(0, 2); const [x0, y0] = pos(u); for (const f of two) { const [x, y] = pos(f); fx('beam', 360, { x0, y0: y0 - u.h * .55, x1: x, y1: y - f.h * .5, c: '#e6edf5' }); hit(u, f, 1.3 * m, '#e6edf5'); } break; }
    case 'kome': { const w = team.reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a)); const [x, y] = pos(w); fx('sym', 900, { x, y: y - w.h * .55, s: w.h * .6, sym: 'nyameDua', c: '#7ee08a' }); heal(w, w.max * .25 * m); SFX.heal(); break; }
    case 'afrakoma': for (const f of foes.sort((a, b) => Math.abs(a.fx - u.fx) - Math.abs(b.fx - u.fx)).slice(0, 2)) { const [x, y] = pos(f); fx('slash', 300, { x, y: y - f.h * .5, r: f.h * .5, c: '#ff8a3c', dir: 1, big: 1 }); hit(u, f, 1.1 * m, '#ff8a3c'); } break;
    case 'dufie': { const t2 = targetFor(u, 'weak'); u.reach = Math.max(0, Math.abs(pos(t2)[0] - pos(u)[0]) - t2.w * .3); u.dash = 1; later(160, () => { const [x, y] = pos(t2); fx('x', 300, { x, y: y - t2.h * .5, r: t2.h * .45, c: '#c58bff' }); hit(u, t2, 1.4 * m, '#c58bff', { crit: true }); }); break; }
  }
}
function castUlt(u) {
  if (!B || B.over || !u.alive || u.en < 100 || B.pause > 0) return;
  unlock(); u.en = 0; B.pause = .95; B.flash = .45; B.shake = 8; setPose(u, 2, 1500);
  cutIn(poseSrc(u.id, 2), u.d.kit[2], `${u.name.toUpperCase()} · ${u.d.role.toUpperCase()}`, RARITY[u.d.rarity].color, false, u.flip[2]);
  SFX.ult();
  later(750, () => ult(u));
}
function ult(u) {
  const foes = alive(B.foes), team = alive(B.heroes); if (!foes.length) return;
  const m = skMult(u.id, 2), front = foes.sort((a, b) => Math.abs(a.fx - u.fx) - Math.abs(b.fx - u.fx));
  const stamp = (x, y, s, c = '#e3b448') => fx('sym', 1100, { x, y: Math.max(y, B.gy0 - B.hh * .45), s: Math.min(s, B.w * .4, B.hh * .5), sym: u.d.sym, c });
  B.shake = 12;
  const W = B.w, H = B.hh;
  switch (u.id) {
    case 'blay': stamp(W * .62, H * .5, H * .7); for (const f of front.slice(0, 3)) { const [x, y] = pos(f); fx('slash', 420, { x, y: y - f.h * .5, r: f.h * .6, c: '#fff', dir: 1, big: 1 }); hit(u, f, 2.4 * m, '#fff', { noEn: 1 }); } break;
    case 'owureku': stamp(pos(u)[0], H * .4, H * .5, '#ffb070'); [0, 220, 440].forEach((d) => later(d, () => { const tg = targetFor(u); if (!tg) return; const [x, y] = pos(tg); fx('slash', 300, { x, y: y - tg.h * .5, r: tg.h * .5, c: '#ffb070', dir: 1, big: 1 }); hit(u, tg, 1.7 * m, '#ffb070', { noEn: 1 }); })); for (const t of team) t.buff = 6; break;
    case 'gyakari': stamp(pos(u)[0], H * .45, H * .7, '#6fb6ff'); for (const f of foes) f.taunt = 0; u.taunt = 5; for (const t of team) t.shield += Math.round(u.max * .2 * m); fx('ring', 700, { list: team, c: '#6fb6ff' }); break;
    case 'obiri': { const tg = foes.reduce((a, b) => (b.hp < a.hp ? b : a)); const [x0, y0] = pos(u), [x, y] = pos(tg); stamp(x, y - tg.h * .5, tg.h * .9, '#ffd23c'); fx('beam', 500, { x0, y0: y0 - u.h * .6, x1: x, y1: y - tg.h * .5, c: '#ffd23c' }); hit(u, tg, 4.4 * m, '#ffd23c', { noEn: 1, crit: .5 }); break; }
    case 'kuukua': stamp(W * .66, H * .3, H * .5, '#e6edf5'); for (const f of foes) { const [x, y] = pos(f); fx('rain', 600, { x, y: y - f.h, h: f.h }); later(300, () => hit(u, f, 1.5 * m, '#e6edf5', { noEn: 1 })); } break;
    case 'kome': stamp(W * .25, H * .5, H * .7, '#7ee08a'); for (const t of team) heal(t, t.max * .3 * m); for (const f of foes) { const [x, y] = pos(f); fx('boom', 900, { x, y: y - f.h * .45, r: f.h * .6, unit: f }); hit(u, f, 1.1 * m, '#ffb43c', { noEn: 1 }); } SFX.heal(); break;
    case 'afrakoma': { stamp(W * .62, H * .45, H * .6, '#ff8a3c'); let tot = 0; for (const f of foes) { const [x, y] = pos(f); fx('slash', 420, { x, y: y - f.h * .5, r: f.h * .55, c: '#ff8a3c', dir: 1, big: 1 }); tot += hit(u, f, 1.6 * m, '#ff8a3c', { noEn: 1 }); } heal(u, tot * .5); break; }
    case 'dufie': stamp(W * .6, H * .5, H * .7, '#c58bff'); for (let i = 0; i < 6; i++) later(i * 110, () => { const l = alive(B.foes); if (!l.length) return; const tg = pick(l); const [x, y] = pos(tg); fx('x', 240, { x, y: y - tg.h * .5, r: tg.h * .4, c: '#c58bff' }); hit(u, tg, 1.05 * m, '#c58bff', { noEn: 1 }); }); break;
  }
}
function monUlt(m) {
  m.en = 0; const l = alive(B.heroes); if (!l.length) return;
  setPose(m, 2, 1200);
  if (m.boss) { cutIn(poseSrc(m.id, 2), m.name, 'ULTIMATE', '#d23b31', true, m.flip[2]); const [x, y] = pos(m); fx('sym', 1100, { x, y: y - m.h * .6, s: m.h * .7, sym: 'kuntanKantan', c: '#ff3b2a' }); }
  B.shake = 10;
  later(m.boss ? 750 : 200, () => {
    const kind = m.d.ult;
    if (kind === 'heal') { for (const f of alive(B.foes)) heal(f, f.max * .2); fx('ring', 700, { list: alive(B.foes), c: '#bfe8ff' }); return; }
    if (kind === 'aoe') { for (const t of alive(B.heroes)) { const [x, y] = pos(t); fx('boom', 900, { x, y: y - t.h * .45, r: t.h * .6, hex: 1, unit: t }); hit(m, t, 1.3, '#c58bff', { noEn: 1 }); } return; }
    const tg = targetFor(m); if (tg) { const [x, y] = pos(tg); fx('x', 450, { x, y: y - tg.h * .5, r: tg.h * .7, c: '#ff3b2a' }); hit(m, tg, 2.6, '#ff3b2a', { noEn: 1 }); }
  });
}
function cutIn(src, big, small, color, foe = false, flip = 0) {
  const c = h(`<div class="cutin ${foe ? 'foe' : ''}" style="--rc:${color}"><div class="band"></div><img src="${src}" alt="" class="${flip ? 'flip' : ''}"><div class="t"><b>${big}</b><span>${small}</span></div></div>`);
  app.append(c); setTimeout(() => c.remove(), 1050);
}

function step(dt) {
  if (B.pause > 0) { B.pause -= dt; return; }
  for (const u of [...alive(B.heroes), ...alive(B.foes)]) {
    if (u.enter) continue;
    u.taunt = Math.max(0, u.taunt - dt); u.buff = Math.max(0, u.buff - dt);
    if (u.stun > 0) { u.stun -= dt; continue; }
    u.cd -= dt; if (u.cd <= 0) { u.cd = u.spd; attack(u); }
    if (!u.side) { u.skT -= dt; if (u.skT <= 0) { u.skT = u.skCd; skill(u); } }
    if (u.side && u.en >= 100 && u.d.ult) monUlt(u);
    if (!u.side && B.auto && u.en >= 100) castUlt(u);
  }
  if (B.over) return;
  if (!alive(B.heroes).length) return finish(false);
  if (!alive(B.foes).length) { if (B.wave < B.t.waves.length - 1) { B.wave++; B.pause = 1.2; later(900, nextWave); } else finish(true); }
}
function finish(win) {
  B.over = true;
  const left = alive(B.heroes).length, total = B.heroes.length, t = B.t, idx = B.stageIdx, dId = B.D.id;
  const stars = win ? (left === total ? 3 : left >= Math.ceil(total / 2) ? 2 : 1) : 0;
  const chips = [], ups = {};
  if (win) {
    const first = !starsOf(idx, dId), prev = starsOf(idx, dId);
    SAVE.stars[starKey(idx, dId)] = Math.max(prev, stars);
    const gold = Math.round((60 + t.lvl * 40) * B.D.gold) + (B.bonusGold || 0); SAVE.gold += gold; chips.push([COIN('gold', 'big'), '+' + gold, 'Gold dust']);
    let cw = 0; if (first) cw += t.boss ? 100 : dId === 'hard' ? 60 : 30; if (stars === 3 && prev < 3) cw += 20;
    if (cw) { SAVE.cowries += cw; chips.push([COIN('cowrie', 'big'), '+' + cw, first ? 'First clear' : '3 stars']); }
    const xp = 30 + t.lvl * 15; chips.push([COIN('xp', 'big'), '+' + xp, 'XP each']);
    for (const u of B.heroes) { const s = SAVE.heroes[u.id]; s.xp += xp; while (s.xp >= xpNeed(s.lvl)) { s.xp -= xpNeed(s.lvl); s.lvl++; ups[u.id] = s.lvl; } }
    SFX.win();
  } else SFX.lose();
  store();
  setTimeout(() => {
    if (!B) return;
    const heroesRow = B.heroes.map((u) => `<div class="rh ${u.alive ? '' : 'ko'}"><img src="${faceSrc(u.id)}" alt=""><b>${ups[u.id] ? 'LV ' + ups[u.id] + ' ▲' : 'Lv ' + SAVE.heroes[u.id].lvl}</b></div>`).join('');
    const v = h(`<div class="veil"><div class="result ${win ? 'win' : 'lose'}"><div class="eyebrow">Stage ${idx + 1} · ${t.name} · ${B.D.name}</div>
      <div class="rtitle">${adinkraSvg(win ? 'fawohodie' : 'hyeWonhye')}<h2>${win ? 'Victory' : 'Defeat'}</h2></div>
      ${win ? `<div class="stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${.15 + i * .18}s">★</i>`).join('')}</div>
        <div class="chips">${chips.map(([ic, n, l]) => `<div class="chip">${ic}<b>${n}</b><span>${l}</span></div>`).join('')}</div>`
        : `<p>Hye won hye: what does not burn comes back stronger. Level up, upgrade skills at the Heroes tab, call new heroes at the Shrine, or try Easy.</p>`}
      <div class="rheroes">${heroesRow}</div>
      <div class="row"><button class="btn ghost" type="button">${win ? 'Replay' : 'Retry'}</button>${win ? '' : '<button class="btn ghost" type="button" data-go="heroes">Heroes</button>'}<button class="btn" type="button">${win && idx < STAGES.length - 1 ? 'Next stage' : 'Journey'}</button></div></div></div>`);
    const btns = v.querySelectorAll('.btn'), retry = btns[0], next = btns[btns.length - 1];
    retry.onclick = () => battle(idx, dId);
    next.onclick = () => { stopBattle(); if (win && idx < STAGES.length - 1) sel = idx + 1; tab = 'map'; mapScreen(); };
    const hb = v.querySelector('[data-go]'); if (hb) hb.onclick = () => { tab = 'heroes'; heroSel = null; route(); };
    app.append(v);
  }, 1000);
}

function loop(now) {
  if (!B) return;
  const dt = Math.min(.05, (now - B.last) / 1000) * B.speed; B.last = now;
  const cv = B.cv, r = cv.getBoundingClientRect(), dpr = Math.min(2.5, devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  B.w = r.width; B.hh = r.height;
  if (!B.over) step(dt);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingQuality = 'high';
  // background: cover, anchored to the bottom so the ground plane stays under the fighters
  let bgTop = 0, bgH = r.height;
  if (B.bg.ok) { const im = B.bg.el, k = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight); const w = im.naturalWidth * k; bgH = im.naturalHeight * k; bgTop = r.height - bgH; g.drawImage(im, (r.width - w) / 2, bgTop, w, bgH); }
  else { g.fillStyle = '#1a1216'; g.fillRect(0, 0, r.width, r.height); }
  B.gy0 = bgTop + B.ground[0] * bgH; B.gy1 = Math.min(r.height - 6, bgTop + B.ground[1] * bgH);
  const vg = g.createLinearGradient(0, 0, 0, r.height); vg.addColorStop(0, 'rgba(10,6,10,.35)'); vg.addColorStop(.6, 'rgba(10,6,10,0)'); vg.addColorStop(1, 'rgba(10,6,10,.35)'); g.fillStyle = vg; g.fillRect(0, 0, r.width, r.height);
  const sh = B.shake; B.shake = Math.max(0, sh - 30 * dt);
  g.save(); g.translate(rnd(-1, 1) * sh, rnd(-1, 1) * sh);
  // units sorted by depth
  const units = [...B.heroes, ...B.foes].filter((u) => u.alive || u.dieT > 0).sort((a, b) => a.fy - b.fy);
  const portrait = r.height > r.width * .9, baseH = portrait ? Math.min(r.height * .32, r.width * .34) : Math.min(r.height * .38, r.width * .19);
  for (const u of units) {
    u.h = baseH * u.size * u.depth;
    if (u.enter) u.enter = Math.max(0, u.enter - dt * 2);
    if (u.poseT > 0) { u.poseT -= dt; if (u.poseT <= 0) u.pose = 0; }
    if (u.dash > 0) { u.dashT = (u.dashT || .25) - dt; if (u.dashT <= 0) u.dash = Math.max(0, u.dash - dt * 5); }
    u.hurt = Math.max(0, u.hurt - dt * 4);
    const e0 = img(poseSrc(u.id, 0)), e = img(poseSrc(u.id, u.pose));
    if (!e0.ok || !e.ok) { u.w = u.h * .6; continue; }
    const k = u.h / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k;
    u.w = e0.el.naturalWidth * k;
    const [x, y] = pos(u), bob = Math.sin(now / 420 + (u.slot || 0)) * u.h * .006;
    const flip = u.flip[u.pose];
    g.save();
    if (!u.alive) { u.dieT = Math.max(0, u.dieT - dt * 1.4); g.globalAlpha = u.dieT; }
    // ground shadow
    const shg = g.createRadialGradient(x, y, 1, x, y, u.w * .5); shg.addColorStop(0, 'rgba(0,0,0,.6)'); shg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shg; g.save(); g.translate(x, y); g.scale(1, .14); g.beginPath(); g.arc(0, 0, u.w * .5, 0, 6.28); g.restore(); g.fill();
    if (u.taunt > 0) { g.strokeStyle = 'rgba(111,182,255,.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, u.w * .55, u.h * .07, 0, 0, 6.28); g.stroke(); }
    g.translate(x, y + bob); if (flip) g.scale(-1, 1); if (u.hurt > .5) g.translate(rnd(-3, 3), 0);
    const th = ph * dpr;
    // outline glows follow the silhouette (not a box)
    const ring = (!u.side && u.alive && u.en >= 100) ? '#e3b448' : (u === B.focus ? '#ff3b2a' : null);
    if (ring) { const sil = silhouette(e, th, ring); if (sil) { g.save(); g.globalAlpha *= .9; for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) g.drawImage(sil, -pw / 2 + ox, -ph + oy, pw, ph); g.restore(); } }
    const sc = scaled(e, th); if (sc) g.drawImage(sc, -pw / 2, -ph, pw, ph);
    if (u.hurt > .45) { const sil = silhouette(e, th, '#ffffff'); if (sil) { g.globalAlpha = (u.hurt - .45) * 1.6; g.drawImage(sil, -pw / 2, -ph, pw, ph); } }
    g.restore();
    // overlays (unflipped)
    if (u.alive) {
      if (u.shield > 0) {
        u.shT = (u.shT || 0) + dt; const S = FXS.shield, fps = 14, f0 = u.shT * fps;
        const fr = f0 < S.loop[0] ? f0 : S.loop[0] + Math.abs(((f0 - S.loop[0]) % ((S.loop[1] - S.loop[0]) * 2)) - (S.loop[1] - S.loop[0]));
        if (!sprite(g, 'shield', fr, x, y + u.h * .03, u.h * .98, f0 < S.loop[0] ? .85 : .5)) { g.strokeStyle = 'rgba(111,182,255,.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - u.h * .5, u.w * .6, u.h * .58, 0, 0, 6.28); g.stroke(); }
      } else u.shT = 0;
      if (u.stun > 0) { g.fillStyle = '#ffd23c'; for (let i = 0; i < 3; i++) { const a = now / 200 + i * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * u.w * .25, y - u.h * 1.02 + Math.sin(a) * 4, 3, 0, 6.28); g.fill(); } }
      if (u.buff > 0) { g.fillStyle = '#ffb070'; g.font = `${Math.round(12)}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.fillText('▲ATK', x, y - u.h - 18); }
      if (u.side) {
        const bw = Math.max(36, u.w * .7), by = y - u.h * 1.04 - 8;
        g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x - bw / 2, by, bw, 5); g.fillStyle = u.boss ? '#ff3b2a' : '#d23b31'; g.fillRect(x - bw / 2, by, bw * u.hp / u.max, 5);
        if (u.d.ult) { g.fillStyle = '#e3b448'; g.fillRect(x - bw / 2, by + 6, bw * u.en / 100, 2); }
        if (u === B.focus) { g.strokeStyle = '#ff3b2a'; g.lineWidth = 2; const ry = by - 10; g.beginPath(); g.moveTo(x - 6, ry - 6); g.lineTo(x, ry); g.lineTo(x + 6, ry - 6); g.stroke(); }
      }
    }
  }
  B.fx = B.fx.filter((f) => drawFx(g, f, now));
  for (const p of B.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= dt * 1.6; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; if (p.glow) { g.shadowColor = p.c; g.shadowBlur = 8; } g.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); g.shadowBlur = 0; }
  g.globalAlpha = 1; B.parts = B.parts.filter((p) => p.life > 0);
  g.textAlign = 'center';
  for (const f of B.floats) { f.y -= 40 * dt; f.life -= dt * .9; g.globalAlpha = Math.max(0, Math.min(1, f.life * 2)); g.font = `${Math.round(20 * f.size)}px Bangers, Impact, sans-serif`; g.lineWidth = 4; g.strokeStyle = '#120c10'; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.c; g.fillText(f.t, f.x, f.y); }
  g.globalAlpha = 1; B.floats = B.floats.filter((f) => f.life > 0);
  g.restore();
  if (B.flash > 0) { g.fillStyle = `rgba(255,248,230,${B.flash})`; g.fillRect(0, 0, r.width, r.height); B.flash = Math.max(0, B.flash - dt * 1.5); }
  for (const u of B.heroes) {
    const c = u.card; if (!c) continue; const [hpb, enb] = c.querySelectorAll('.bars i');
    hpb.style.setProperty('--f', u.hp / u.max); enb.style.setProperty('--f', u.en / 100);
    c.classList.toggle('ready', u.alive && u.en >= 100 && !B.over); c.classList.toggle('dead', !u.alive);
  }
  B.raf = requestAnimationFrame(loop);
}
function drawFx(g, f, now) {
  const p = Math.min(1, (now - f.t0) / (f.dur / (B ? B.speed : 1)));
  g.save(); g.lineCap = 'round';
  switch (f.type) {
    case 'slash': { const e = 1 - (1 - Math.min(1, p * 1.6)) ** 3, a0 = f.dir < 0 ? -0.6 : -2.5, sw = 2.9 * (f.dir < 0 ? -1 : 1); g.globalAlpha = p < .6 ? 1 : 1 - (p - .6) / .4; g.shadowColor = f.c; g.shadowBlur = 16; g.strokeStyle = f.c; g.lineWidth = (f.big ? 11 : 6) * (1 - p * .5);
      g.beginPath(); g.arc(f.x, f.y, f.r, a0 + sw * Math.max(0, e - .55), a0 + sw * e, sw < 0); g.stroke(); break; }
    case 'x': { const L = f.r * Math.min(1, p * 2); g.globalAlpha = 1 - p; g.shadowColor = f.c; g.shadowBlur = 20; g.strokeStyle = f.c; g.lineWidth = 7; g.beginPath(); g.moveTo(f.x - L, f.y - L); g.lineTo(f.x + L, f.y + L); g.moveTo(f.x + L, f.y - L); g.lineTo(f.x - L, f.y + L); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); break; }
    case 'shot': {
      const x = f.x0 + (f.x1 - f.x0) * p, arc = f.kind === 'arrow' || f.kind === 'axe' ? Math.sin(p * Math.PI) * 30 : 0, y = f.y0 + (f.y1 - f.y0) * p - arc, a = Math.atan2(f.y1 - f.y0 - (f.kind === 'arrow' ? Math.cos(p * Math.PI) * 30 * Math.PI : 0), f.x1 - f.x0);
      g.translate(x, y);
      if (f.kind === 'arrow' || f.kind === 'spear') { g.rotate(a); g.strokeStyle = '#6b4424'; g.lineWidth = f.kind === 'spear' ? 4 : 2.5; g.beginPath(); g.moveTo(-26, 0); g.lineTo(6, 0); g.stroke(); g.fillStyle = '#e6edf5'; g.beginPath(); g.moveTo(14, 0); g.lineTo(2, -4); g.lineTo(2, 4); g.fill(); if (f.kind === 'arrow') { g.strokeStyle = '#f4eee4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-32, -4); g.moveTo(-26, 0); g.lineTo(-32, 4); g.stroke(); } }
      else if (f.kind === 'axe') { g.rotate(p * 14); g.strokeStyle = '#6b4424'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.stroke(); g.fillStyle = '#cfd6e0'; g.beginPath(); g.moveTo(6, -2); g.quadraticCurveTo(16, -10, 14, 6); g.lineTo(6, 3); g.fill(); }
      else if (f.kind === 'thorn') { g.rotate(a + Math.PI); g.fillStyle = '#d8c25a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, 0); g.lineTo(-10, -4); g.lineTo(-6, 0); g.lineTo(-10, 4); g.closePath(); g.fill(); g.stroke(); }
      else { const col = f.kind === 'fire' ? ['#fff8d0', '#ffb43c', 'rgba(255,90,30,0)'] : ['#f6ecff', '#c58bff', 'rgba(110,50,200,0)']; const rg = g.createRadialGradient(0, 0, 1, 0, 0, 14); rg.addColorStop(0, col[0]); rg.addColorStop(.45, col[1]); rg.addColorStop(1, col[2]); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 14, 0, 6.28); g.fill(); if (B && Math.random() < .7) B.parts.push({ x, y, vx: rnd(-.5, .5), vy: rnd(-1, .2), g: -.02, life: .7, c: col[1], sz: rnd(2, 4), glow: 1 }); }
      break;
    }
    case 'beam': { g.globalAlpha = 1 - p; g.shadowColor = f.c; g.shadowBlur = 22; g.strokeStyle = f.c; g.lineWidth = 12 * (1 - p) + 2; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke(); break; }
    case 'spr': {
      const S = FXS[f.k]; let x = f.x, y = f.y; if (f.unit) { [x, y] = pos(f.unit); }
      const hh = f.unit ? f.unit.h * f.hs : f.hh, a = p > .8 ? (1 - p) / .2 : 1;
      if (sprite(g, f.k, p * S.n, x, y, hh, a * (f.a || 1))) break;
      break;
    }
    case 'boom': {
      if (f.unit && sprite(g, f.hex ? 'hex' : 'fire', p * FXS.fire.n, pos(f.unit)[0], pos(f.unit)[1], f.unit.h * 1.15, p > .7 ? (1 - p) / .3 : 1)) break; const rr = f.r * (.3 + p * .9), rg = g.createRadialGradient(f.x, f.y, 1, f.x, f.y, rr); rg.addColorStop(0, f.hex ? `rgba(240,225,255,${1 - p})` : `rgba(255,248,208,${1 - p})`); rg.addColorStop(.45, f.hex ? `rgba(160,90,240,${.85 * (1 - p)})` : `rgba(255,150,40,${.85 * (1 - p)})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(f.x, f.y, rr, 0, 6.28); g.fill(); break; }
    case 'ring': { g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.shadowColor = f.c; g.shadowBlur = 14; g.lineWidth = 4; for (const u of f.list) { if (!u.alive) continue; const [x, y] = pos(u); g.beginPath(); g.ellipse(x, y, u.w * .4 * (1 + p), u.h * .06 * (1 + p), 0, 0, 6.28); g.stroke(); } break; }
    case 'rain': { g.strokeStyle = '#e6edf5'; g.lineWidth = 3; g.globalAlpha = 1 - p * .6; for (let i = 0; i < 3; i++) { const yy = f.y - f.h * .6 + (p * 1.6 - i * .2) * f.h; g.beginPath(); g.moveTo(f.x + (i - 1) * 10, yy - 22); g.lineTo(f.x + (i - 1) * 10, yy); g.stroke(); } break; }
    case 'sym': {
      // Adinkra stamp: scales in, glows, fades; ring burst underneath
      const e = p < .25 ? p / .25 : 1, a = p < .7 ? 1 : 1 - (p - .7) / .3;
      g.translate(f.x, f.y); g.globalAlpha = a * .9;
      g.strokeStyle = f.c; g.fillStyle = f.c; g.shadowColor = f.c; g.shadowBlur = 26;
      g.beginPath(); g.arc(0, 0, f.s * (.5 + p * .3), 0, 6.28); g.lineWidth = 3; g.stroke();
      g.globalAlpha = a * .35; g.beginPath(); g.arc(0, 0, f.s * (.62 + p * .5), 0, 6.28); g.lineWidth = 8 * (1 - p); g.stroke(); g.globalAlpha = a * .92;
      g.scale(.7 + e * .3, .7 + e * .3); drawAdinkra(g, f.sym, f.s * .82);
      break;
    }
  }
  g.restore(); return p < 1;
}

// ---------------- boot ----------------
route();
window.__sq = { get B() { return B; }, get SAVE() { return SAVE; }, battle, route, ratio: (i, d) => squadPower() / enemyPower(STAGES[i], DIFF.find((x) => x.id === d)) };
