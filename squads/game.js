// Gyeaman Squads: Akan squad battler, chapter 1.
// Battles are turn based on a speed turn order (Dislyte style): every hero picks Basic, Skill (cooldown) or Ultimate (energy)
// and a target; enemies show their next move. Big moves get impact frames, small ones stay quiet.
import { HEROES, MONS, STAGES, REGIONS, DIFF, RARITY, STARTERS, SKILL_MAX, skillCost, xpNeed, STAR_SHARDS, LOCKED_CHAPTERS, PULL_COST, PULL10_COST, PITY, PULL_RATES } from './data.js';
import { drawAdinkra, adinkraPath, adinkraSvg, ADINKRA } from './adinkra.js';

const ROOT = /\/squads\/?$|\/squads\/index\.html$/.test(location.pathname) ? '../assets/' : 'assets/';
const A = ROOT + 'sq/';
const app = document.getElementById('app');
for (const k of ['gold', 'cowrie', 'xp', 'shard']) document.documentElement.style.setProperty(`--i-${k}`, `url("${A}ui/${k}.webp")`);
const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));
const kr = (s) => s.toLowerCase(); // Kɔradin font: lowercase Latin input, ligatures and nasal marks come from the font

// ---------------- icons ----------------
const ICON = { map: adinkraSvg('nkyimkyim'), heroes: adinkraSvg('gyawuAtiko'), summon: adinkraSvg('nyameDua') };
const CHEV = (r) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${r}deg)"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COIN = (k, cls = '') => `<i class="coin ${k} ${cls}"></i>`;
const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

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
  click: () => tone(660, .05, 'square', .03), hit: () => { tone(150, .14, 'sawtooth', .05, .5); tone(70, .18, 'sine', .08, .6); },
  crit: () => { tone(220, .22, 'sawtooth', .08, .3); tone(55, .3, 'sine', .14, .5); }, shoot: () => tone(900, .1, 'triangle', .04, .4),
  ult: () => { tone(520, .35, 'sine', .08, 2); tone(220, .4, 'sawtooth', .05, .5, .1); }, heal: () => { tone(523, .15); tone(784, .2, 'triangle', .06, 1, .1); },
  impact: () => { tone(48, .5, 'sine', .22, .6); tone(110, .25, 'square', .06, .3); }, turn: () => tone(880, .04, 'sine', .025),
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
for (const id of [...Object.keys(HEROES), ...Object.keys(MONS)]) for (let k = 0; k < 3; k++) img(poseSrc(id, k));
for (const r of Object.values(REGIONS)) img(`${A}bg_${r.bg}.webp`);
// Effect animations: frames from Firefly video clips on black, drawn additively so black = transparent.
// base = where the effect touches the ground (fraction of frame height). peak = the frames we actually play (no wind-up, no long tail).
const FXS = {
  shield: { n: 14, w: 244, h: 178, base: .94, loop: [8, 13] },
  heal: { n: 16, w: 208, h: 226, base: .86, peak: [3, 12] },
  fire: { n: 10, w: 348, h: 232, base: .9, peak: [1, 7] },
  hex: { n: 10, w: 348, h: 232, base: .9, peak: [1, 7] },
};
for (const k in FXS) FXS[k].img = img(`${A}fx/${k}.webp`);
// draw one frame; ww/hh can differ (the shield is stretched to cover tall fighters)
function sprite(g, k, frame, cx, by, hh, alpha = 1, ww) {
  const S = FXS[k]; if (!S || !S.img.ok) return false;
  const f = clamp(Math.floor(frame), 0, S.n - 1); ww = ww || hh * S.w / S.h;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.drawImage(S.img.el, f * S.w, 0, S.w, S.h, cx - ww / 2, by - hh * S.base, ww, hh); g.restore(); return true;
}

// ---------------- Adinkra in battle: glowing ink calligraphy ----------------
// Menus use the flat SVGs. In battle the symbol is brushed in: dark ink core, dry-brush texture, coloured energy rim.
const INK = {};
function inkSymbol(sym, color) {
  const key = sym + color; if (INK[key]) return INK[key];
  const S = 256, P = 48, c = document.createElement('canvas'); c.width = c.height = S + P * 2; const g = c.getContext('2d');
  const path = adinkraPath(sym), a = ADINKRA[sym], k = S / 128;
  const draw = (fn) => { g.save(); g.translate(P + S / 2, P + S / 2); g.scale(k, k); g.translate(-a.w / 2, -a.h / 2); fn(); g.restore(); };
  // energy glow
  draw(() => { g.shadowColor = color; g.shadowBlur = 26; g.fillStyle = color; g.fill(path, 'evenodd'); });
  draw(() => { g.lineJoin = 'round'; g.strokeStyle = color; g.lineWidth = 5; g.stroke(path); });
  // ink body, a few offset passes so edges look brushed rather than vector-clean
  for (let i = 0; i < 4; i++) draw(() => { g.translate(rnd(-1.2, 1.2), rnd(-1.2, 1.2)); g.fillStyle = i ? 'rgba(14,8,12,.55)' : '#0e080c'; g.fill(path, 'evenodd'); });
  // dry-brush streaks: knock out thin diagonal hairlines inside the ink
  g.save(); g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,.55)';
  for (let i = 0; i < 70; i++) { const y = rnd(0, S + P * 2), x = rnd(0, S + P * 2), L = rnd(10, 40); g.lineWidth = rnd(.6, 1.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y - L * .35); g.stroke(); }
  g.restore();
  // re-light the rim on top so the edge glows
  draw(() => { g.globalCompositeOperation = 'lighter'; g.strokeStyle = color; g.globalAlpha = .55; g.lineWidth = 2.2; g.stroke(path); });
  return (INK[key] = c);
}

// ---------------- hero stats ----------------
const SPD_STAR = 2; // speed per star above base
function statsOf(id) {
  const H = HEROES[id], s = SAVE.heroes[id], k = (1 + 0.1 * (s.lvl - 1)) * (1 + 0.15 * (s.stars - 1));
  return { hp: Math.round(H.hp * k), atk: Math.round(H.atk * k), def: Math.round(H.def * k), spd: H.spd + SPD_STAR * (s.stars - RARITY[H.rarity].stars) };
}
const power = (id) => { const st = statsOf(id), s = SAVE.heroes[id]; return Math.round(st.hp * 0.5 + st.atk * 6 + st.def * 4 + st.spd * 2 + (s.sk[0] + s.sk[1] + s.sk[2]) * 30); };
const skMult = (id, i) => 1 + 0.12 * (SAVE.heroes[id].sk[i] - 1);
const canPromote = (id) => { const s = SAVE.heroes[id]; return s.stars < 5 && s.shards >= STAR_SHARDS[s.stars + 1]; };
const anyUpgrade = () => Object.keys(SAVE.heroes).some((id) => canPromote(id) || SAVE.heroes[id].sk.some((l) => l < SKILL_MAX && SAVE.gold >= skillCost(l) * 3));

// ---------------- shell ----------------
let tab = 'map';
function shell(active, content) {
  app.classList.remove('full');
  app.innerHTML = '';
  const top = h(`<header class="topbar"><a class="logo" href="../" title="Gyeaman"><img src="mark.svg" alt=""><span class="krw" aria-label="Gyeaman in Kɔradin">gyeaman</span><b>Squads</b></a>
    <span class="res" title="Gold dust">${COIN('gold')}<b class="num">${fmt(SAVE.gold)}</b></span><span class="res" title="Cowries">${COIN('cowrie')}<b class="num">${fmt(SAVE.cowries)}</b></span></header>`);
  const nav = h(`<nav class="nav">${[['map', 'Journey'], ['heroes', 'Heroes'], ['summon', 'Shrine']].map(([k, l]) => `<button class="tab ${k === active ? 'on' : ''}" data-k="${k}" type="button">${ICON[k]}<span>${l}</span></button>`).join('')}</nav>`);
  if (anyUpgrade()) $('[data-k=heroes]', nav).append(h('<i class="dot"></i>'));
  if (SAVE.lastFree !== today()) $('[data-k=summon]', nav).append(h('<i class="dot"></i>'));
  nav.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { unlock(); SFX.click(); tab = b.dataset.k; heroSel = null; route(); }));
  const main = h('<main></main>'); main.append(content);
  app.append(top, main, nav);
}
function route() { stopBattle(); if (mapKeys) { removeEventListener('keydown', mapKeys); mapKeys = null; } ({ map: mapScreen, heroes: () => heroesScreen(), summon: summonScreen })[tab](); }
function toast(msg) { app.querySelectorAll('.toast').forEach((t) => t.remove()); const t = h(`<div class="toast">${msg}</div>`); app.append(t); setTimeout(() => t.remove(), 2200); }
const stars3 = (n) => `<span class="st3">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;

// ---------------- map (full screen, arrows to pan, stage sheet slides up) ----------------
let sel = null, diff = 'normal', mapKeys = null, sheetOpen = false;
function mapScreen() {
  const open = openStage();
  if (sel === null || sel > open) sel = open;
  const s = h(`<div class="mapscr"><div class="mapview"><div class="mapinner"><img src="${ROOT}map.webp" alt="World map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg></div>
      <button class="chip-ch" type="button">Ch. 1 · Akan ${CHEV(90)}</button>
      <button class="marrow l" type="button" aria-label="Pan left">${CHEV(180)}</button><button class="marrow r" type="button" aria-label="Pan right">${CHEV(0)}</button>
      <button class="marrow u" type="button" aria-label="Pan up">${CHEV(-90)}</button><button class="marrow d" type="button" aria-label="Pan down">${CHEV(90)}</button>
      <button class="btn cont" type="button"></button></div>
    <div class="sheet stage"></div></div>`);
  shell('map', s);
  const view = $('.mapview', s), inner = $('.mapinner', s), svg = $('svg', s), sheet = $('.sheet', s), cont = $('.cont', s);
  svg.innerHTML = `<polyline fill="none" stroke="rgba(244,238,228,.6)" stroke-width=".4" stroke-dasharray="1 1" points="${STAGES.map((t) => `${t.x * 100},${t.y * 100}`).join(' ')}"/>`;
  for (const [k, r] of Object.entries(REGIONS)) {
    const st = STAGES.filter((t) => t.region === k), x = st.reduce((a, t) => a + t.x, 0) / st.length, y = Math.min(...st.map((t) => t.y)) - .045;
    inner.append(h(`<div class="region" style="left:${x * 100}%;top:${y * 100}%">${r.name}</div>`));
  }
  const nodes = STAGES.map((t, i) => {
    const best = Math.max(starsOf(i, 'easy'), starsOf(i, 'normal'), starsOf(i, 'hard'));
    const state = cleared(i) ? 'done' : i === open ? 'open' : 'locked';
    const n = h(`<button class="node ${state} ${t.boss ? 'boss' : ''}" type="button" style="left:${t.x * 100}%;top:${t.y * 100}%" ${i > open ? 'disabled' : ''} aria-label="Stage ${i + 1}, ${t.name}">
      ${t.boss ? `<img src="${poseSrc(t.waves.at(-1).find((m) => MONS[m].boss), 0)}" alt="">` : ''}<span class="n">${i + 1}</span>${best ? stars3(best) : ''}</button>`);
    n.onclick = () => { sel = i; SFX.click(); mark(); centre(i, true); showSheet(); };
    inner.append(n); return n;
  });
  const mark = () => nodes.forEach((n, i) => n.classList.toggle('sel', i === sel && sheetOpen));
  $('.chip-ch', s).onclick = () => toast(`Next chapters: ${LOCKED_CHAPTERS.join(', ')}. Locked in the beta.`);
  // the map is drawn larger than the view; arrows (or arrow keys) pan it, tapping a stage glides to it
  const size = () => {
    const r = view.getBoundingClientRect(), port = r.height > r.width;
    const W = port ? Math.max(r.width * 1.7, r.height * 1.05 * .75) : Math.max(r.width * 1.05, r.height * 1.35 * .75), H = W / .75;
    inner.style.width = W + 'px'; inner.style.height = H + 'px'; return { r, W, H };
  };
  let { r, W, H } = size();
  const P = { x: 0, y: 0 };
  const arrows = { l: $('.marrow.l', s), r: $('.marrow.r', s), u: $('.marrow.u', s), d: $('.marrow.d', s) };
  const apply = (anim) => {
    const bottomPad = sheetOpen && r.height > r.width ? sheet.getBoundingClientRect().height : 0;
    P.x = clamp(P.x, Math.min(0, r.width - W), 0); P.y = clamp(P.y, Math.min(0, r.height - bottomPad - H), 0);
    inner.style.transition = anim ? 'transform .45s cubic-bezier(.2,.8,.2,1)' : 'none'; inner.style.transform = `translate(${P.x}px, ${P.y}px)`;
    arrows.l.hidden = P.x >= -1; arrows.r.hidden = P.x <= r.width - W + 1; arrows.u.hidden = P.y >= -1; arrows.d.hidden = P.y <= r.height - bottomPad - H + 1 || sheetOpen;
  };
  function centre(i, anim) { const t = STAGES[i], bottomPad = sheetOpen && r.height > r.width ? sheet.getBoundingClientRect().height : 0; P.x = r.width / 2 - t.x * W; P.y = (r.height - bottomPad) * .45 - t.y * H; apply(anim); }
  const pan = (dx, dy) => { unlock(); SFX.click(); P.x -= dx * r.width * .6; P.y -= dy * r.height * .6; apply(true); };
  arrows.l.onclick = () => pan(-1, 0); arrows.r.onclick = () => pan(1, 0); arrows.u.onclick = () => pan(0, -1); arrows.d.onclick = () => pan(0, 1);
  mapKeys = (e) => { const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (k && view.isConnected) { e.preventDefault(); pan(...k); } if (e.key === 'Escape') hideSheet(); };
  addEventListener('keydown', mapKeys);
  new ResizeObserver(() => { if (!view.isConnected) return; ({ r, W, H } = size()); centre(sel, false); }).observe(view);
  const hideSheet = () => { sheetOpen = false; sheet.classList.remove('open'); cont.hidden = false; mark(); apply(true); };
  inner.addEventListener('click', (e) => { if (e.target === inner || e.target.tagName === 'IMG' && !e.target.closest('.node')) hideSheet(); });
  const showSheet = () => {
    const t = STAGES[sel], foes = [...new Set(t.waves.flat())], hardOpen = starsOf(sel, 'normal') > 0;
    if (diff === 'hard' && !hardOpen) diff = 'normal';
    const d = DIFF.find((x) => x.id === diff), gold = Math.round((60 + t.lvl * 40) * d.gold), first = !starsOf(sel, diff);
    sheet.innerHTML = `<div class="grab"></div><button class="x" type="button" aria-label="Close">${X_ICON}</button>
      <div class="sh-head"><span class="sub">Stage ${sel + 1} · ${REGIONS[t.region].name}</span><h3>${t.name}</h3><span class="sub">Level ${t.lvl} · ${t.waves.length} wave${t.waves.length > 1 ? 's' : ''}${t.boss ? ' · boss' : ''}</span></div>
      <div class="foes">${foes.map((k) => `<div class="f ${MONS[k].boss ? 'boss' : ''}"><img src="${poseSrc(k, 0)}" alt=""><span>${MONS[k].name}</span></div>`).join('')}</div>
      <div class="seg">${DIFF.map((x) => `<button class="${x.id === diff ? 'on' : ''}" type="button" data-d="${x.id}" style="--dc:${x.color}" ${x.id === 'hard' && !hardOpen ? 'disabled' : ''}><b>${x.name}</b>${stars3(starsOf(sel, x.id))}</button>`).join('')}</div>
      <div class="reward"><span>${COIN('gold')}${gold}</span>${first ? `<span>${COIN('cowrie')}${t.boss ? 100 : diff === 'hard' ? 60 : 30}</span>` : ''}<span>${COIN('xp')}${30 + t.lvl * 15} XP</span></div>
      ${powerRow(squadPower(), enemyPower(t, d))}
      <button class="btn wide big" type="button" id="go">Prepare squad</button>`;
    sheet.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { diff = b.dataset.d; SFX.click(); showSheet(); }));
    $('#go', sheet).onclick = () => { unlock(); SFX.click(); squadScreen(); };
    $('.x', sheet).onclick = hideSheet;
    sheetOpen = true; sheet.classList.add('open'); cont.hidden = true; mark();
    requestAnimationFrame(() => centre(sel, true));
  };
  cont.innerHTML = `${cleared(open) ? 'Replay' : 'Continue'} · Stage ${open + 1}`;
  cont.onclick = () => { sel = open; SFX.click(); centre(open, true); showSheet(); };
  sheetOpen = false; centre(sel, false);
}

// ---------------- squad prep ----------------
function heroCard(id, extra = '') {
  const H = HEROES[id], s = SAVE.heroes[id], own = !!s;
  return `<button class="hc ${own ? '' : 'locked'} ${extra}" type="button" data-id="${id}" style="--rc:${RARITY[H.rarity].color}"><img src="${faceSrc(id)}" alt="">
    ${own ? `<span class="lv">${s.lvl}</span><span class="stars">${'★'.repeat(s.stars)}</span>` : ''}<span class="lab"><b>${H.name}</b><span>${own ? H.role : 'Not recruited'}</span></span></button>`;
}
const squadPower = () => SAVE.squad.filter((x) => SAVE.heroes[x]).reduce((a, id) => a + power(id), 0);
const MON_LVL = 0.22;
const MM = { hp: 1.45, atk: 1.8 }; // global monster tuning for turn-based play (set by the balance pass)
function enemyPower(t, d) {
  const k = (1 + (t.lvl - 1) * MON_LVL) * d.mult * t.pow;
  // .72 calibrates the shown number so an equal shown power is an even fight for a player who uses skills
  return Math.round(.72 * Math.max(...t.waves.map((w) => w.reduce((a, id) => { const M = MONS[id]; return a + (M.hp * MM.hp * .5 + M.atk * MM.atk * 6 + M.def * 4 + M.spd * 2) * k; }, 0))) * (1 + .12 * (t.waves.length - 1)));
}
function powerRow(mine, foe) {
  const r = mine / foe, c = r >= 1.15 ? 'var(--good)' : r >= .9 ? 'var(--orange)' : 'var(--blood)', w = r >= 1.15 ? 'Favoured' : r >= .9 ? 'Even fight' : 'Dangerous';
  return `<div class="vs"><div><span>Your squad</span><b class="num">${fmt(mine)}</b></div><em style="color:${c}">${w}</em><div><span>Enemy</span><b class="num">${fmt(foe)}</b></div></div>`;
}
function squadScreen() {
  const t = STAGES[sel], D = DIFF.find((x) => x.id === diff);
  const s = h(`<div class="screen squad"><div class="head"><button class="back" type="button" aria-label="Back">${CHEV(180)}</button><div><h2>Squad</h2><span class="sub">Stage ${sel + 1} · ${t.name} · <b style="color:${D.color}">${D.name}</b></span></div></div>
    <div class="formation"></div><div class="vsbox"></div><div class="grid roster"></div>
    <div class="dock"><button class="btn wide big" type="button" id="fight">Fight</button></div></div>`);
  shell('map', s);
  $('.back', s).onclick = () => { mapScreen(); };
  const grid = $('.roster', s), form = $('.formation', s);
  const toggle = (id) => { const i = SAVE.squad.indexOf(id); if (i >= 0) SAVE.squad.splice(i, 1); else if (SAVE.squad.length < 5) SAVE.squad.push(id); else return toast('A squad holds 5 heroes'); SFX.click(); store(); draw(); };
  const draw = () => {
    SAVE.squad = SAVE.squad.filter((x) => SAVE.heroes[x]);
    const ids = Object.keys(HEROES).filter((id) => SAVE.heroes[id]).sort((a, b) => power(b) - power(a));
    const sq = [...SAVE.squad].sort((a, b) => HEROES[a].row - HEROES[b].row);
    form.innerHTML = '<span class="cap">Back</span>' + Array.from({ length: 5 }, (_, i) => sq[i] ? heroCard(sq[i], 'on mini') : '<div class="hc empty"><span>+</span></div>').reverse().join('') + '<span class="cap">Front</span>';
    grid.innerHTML = ids.map((id) => heroCard(id, SAVE.squad.includes(id) ? 'picked' : '')).join('');
    s.querySelectorAll('.hc[data-id]').forEach((c) => (c.onclick = () => toggle(c.dataset.id)));
    $('.vsbox', s).innerHTML = powerRow(squadPower(), enemyPower(t, D));
    $('#fight', s).disabled = !SAVE.squad.length;
  };
  $('#fight', s).onclick = () => { unlock(); battle(sel, diff); };
  draw();
}

// ---------------- heroes ----------------
let heroSel = null, poseLoop = null, heroTab = 'skills';
function heroesScreen(id) {
  if (poseLoop) { cancelAnimationFrame(poseLoop); poseLoop = null; }
  if (id) heroSel = id;
  if (!heroSel) {
    const ids = Object.keys(HEROES).sort((a, b) => (SAVE.heroes[b] ? 1 : 0) - (SAVE.heroes[a] ? 1 : 0) || 'R SR SSR'.indexOf(HEROES[b].rarity) - 'R SR SSR'.indexOf(HEROES[a].rarity));
    const s = h(`<div class="screen"><div class="head"><div><h2>Heroes</h2><span class="sub">${Object.keys(SAVE.heroes).length} of 8 recruited</span></div></div><div class="grid">${ids.map((x) => heroCard(x)).join('')}</div></div>`);
    shell('heroes', s);
    s.querySelectorAll('.hc').forEach((c) => { if (SAVE.heroes[c.dataset.id] && canPromote(c.dataset.id)) c.append(h('<i class="dot"></i>')); c.onclick = () => { SFX.click(); heroesScreen(c.dataset.id); }; });
    return;
  }
  const H = HEROES[heroSel], s0 = SAVE.heroes[heroSel], own = !!s0, R = RARITY[H.rarity], AD = ADINKRA[H.sym];
  const st = own ? statsOf(heroSel) : { hp: H.hp, atk: H.atk, def: H.def, spd: H.spd };
  const s = h(`<div class="screen hero"><div class="head"><button class="back" type="button" aria-label="Back">${CHEV(180)}</button><div><h2>${H.name}</h2><span class="sub"><b style="color:${R.color}">${R.name}</b> · ${H.role} · ${H.en}</span></div></div>
    <div class="stage3"><canvas aria-label="${H.name}"></canvas><span class="krole" title="${H.role} in Kɔradin">${kr(H.role)}</span>
      <div class="poses"><button data-p="0" type="button" class="on">Idle</button><button data-p="1" type="button">Attack</button><button data-p="2" type="button">Ultimate</button></div></div>
    <div class="tabs"><button data-t="skills" type="button">Skills</button><button data-t="stats" type="button">Stats</button><button data-t="symbol" type="button">Symbol</button></div>
    <div class="pane"></div></div>`);
  shell('heroes', s);
  $('.back', s).onclick = () => { heroSel = null; heroesScreen(); };
  const pane = $('.pane', s);
  const show = (t) => {
    heroTab = t; s.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    if (t === 'stats') {
      pane.innerHTML = `${own ? `<div class="lvl"><b>Level ${s0.lvl}</b><span class="st5">${'★'.repeat(s0.stars)}<i>${'★'.repeat(5 - s0.stars)}</i></span></div><div class="bar"><i style="transform:scaleX(${s0.xp / xpNeed(s0.lvl)})"></i></div>` : '<p class="note">Not recruited yet. Call heroes at the Shrine.</p>'}
        <div class="st4"><div><b>${st.hp}</b><span>Health</span></div><div><b>${st.atk}</b><span>Attack</span></div><div><b>${st.def}</b><span>Defence</span></div><div><b>${st.spd}</b><span>Speed</span></div></div>
        ${own ? `<div class="row card"><div>${COIN('shard')} <b>Shards ${s0.shards} / ${s0.stars < 5 ? STAR_SHARDS[s0.stars + 1] : 'max'}</b><small>Duplicates give shards. Each star adds 15% to all stats and a little speed.</small></div><button class="btn sm" id="promo" type="button" ${canPromote(heroSel) ? '' : 'disabled'}>Promote</button></div>
          <div class="row card"><div><b>Power ${power(heroSel)}</b><small>Speed decides how often ${H.name} acts.</small></div></div>` : ''}`;
      const pr = $('#promo', pane); if (pr) pr.onclick = () => { s0.shards -= STAR_SHARDS[s0.stars + 1]; s0.stars++; SFX.win(); store(); toast(`${H.name} reached ${s0.stars} stars`); heroesScreen(); };
    } else if (t === 'symbol') {
      pane.innerHTML = `<div class="codex">${adinkraSvg(H.sym)}<div><span class="sub">Ultimate symbol</span><b>${AD.name}</b><p>${AD.meaning}</p></div></div>
        <div class="codex kr"><span class="krbig">${kr(H.role)}</span><div><span class="sub">Role in Kɔradin</span><b>${H.role}</b><p>${H.en}</p></div></div>`;
    } else {
      pane.innerHTML = '';
      ['Basic', 'Skill', 'Ultimate'].forEach((tag, i) => {
        const lvl = own ? s0.sk[i] : 1, cost = skillCost(lvl), extra = i === 1 ? ` · cooldown ${H.cd} turns` : i === 2 ? ' · 100 energy' : '';
        const row = h(`<div class="row card"><div><span class="sub">${tag}${extra}</span><b>${H.kit[i]} ${own ? `<em>Lv ${lvl}</em>` : ''}</b><small>${H.notes[i]}${own && lvl > 1 ? ` +${Math.round((skMult(heroSel, i) - 1) * 100)}% power.` : ''}</small></div>
          ${own ? `<button class="btn sm ghost" type="button" ${lvl >= SKILL_MAX || SAVE.gold < cost ? 'disabled' : ''}>${lvl >= SKILL_MAX ? 'Max' : `${COIN('gold')}${fmt(cost)}`}</button>` : ''}</div>`);
        const b = $('button', row); if (b) b.onclick = () => { SAVE.gold -= cost; s0.sk[i]++; SFX.heal(); store(); heroesScreen(); };
        pane.append(row);
      });
    }
  };
  s.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { SFX.click(); show(b.dataset.t); }));
  show(heroTab);
  // pose stage
  const cv = $('canvas', s); let pose = 0, poseT = 0;
  s.querySelectorAll('.poses button').forEach((b) => (b.onclick = () => { pose = +b.dataset.p; poseT = performance.now(); s.querySelectorAll('.poses button').forEach((x) => x.classList.toggle('on', x === b)); if (pose === 2) SFX.ult(); else if (pose === 1) SFX.hit(); }));
  const draw = (now) => {
    if (!cv.isConnected) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const e0 = img(poseSrc(heroSel, 0)), e = img(poseSrc(heroSel, pose));
    if (e.ok && e0.ok) {
      const Hh = (r.height - 54) * 0.92, k = Hh / e0.el.naturalHeight, ph = Math.min(r.height - 54, e.el.naturalHeight * k), pw = e.el.naturalWidth * (ph / e.el.naturalHeight);
      const sc = scaled(e, ph * dpr), x = r.width / 2, y = r.height - 48 + Math.sin(now / 500) * 1.5;
      if (pose === 2) { const t = Math.min(1, (now - poseT) / 600), ink = inkSymbol(H.sym, '#e3b448'), S = Math.min(r.width, r.height) * .8; g.save(); g.globalAlpha = .9 * t; g.beginPath(); g.rect(x - S / 2, y - ph * .5 - S / 2, S * t, S); g.clip(); g.drawImage(ink, x - S / 2, y - ph * .5 - S / 2, S, S); g.restore(); }
      if (sc) { g.save(); if (H.flip[pose]) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); } g.drawImage(sc, x - pw / 2, y - ph, pw, ph); g.restore(); }
    }
    poseLoop = requestAnimationFrame(draw);
  };
  poseLoop = requestAnimationFrame(draw);
}

// ---------------- summon ----------------
function summonScreen() {
  const free = SAVE.lastFree !== today();
  const s = h(`<div class="summon"><div class="shrine"><canvas width="300" height="300" aria-hidden="true"></canvas></div>
    <div class="sm-txt"><h2>Abosom Shrine</h2><p>Offer cowries to call a hero. Duplicates become shards that raise their stars.</p></div>
    <div class="pullrow">${free ? '<button class="btn big" type="button" data-n="0">Free daily call</button>' : ''}<button class="btn ${free ? 'ghost' : 'big'}" type="button" data-n="1">Call 1 · ${COIN('cowrie')}${PULL_COST}</button><button class="btn ghost" type="button" data-n="10">Call 10 · ${COIN('cowrie')}${PULL10_COST}</button></div>
    <p class="rates">Legendary 4% · Epic 18% · Rare 38% · gold 40%. A Legendary within ${PITY} calls (${PITY - SAVE.pity} left). Beta: cowries are earned in play, nothing is sold.</p></div>`);
  shell('summon', s);
  const c = $('canvas', s), g = c.getContext('2d'); g.translate(150, 150); g.fillStyle = '#e3b448'; g.shadowColor = '#e3b448'; g.shadowBlur = 16; drawAdinkra(g, 'nyameDua', 190);
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
  const v = h(`<div class="reveal" style="--rc:${rc}"><div class="glow"></div><div class="body"></div></div>`);
  app.append(v);
  [0, .25, .5].forEach((d) => SFX.drum(d)); if (best && HEROES[best].rarity === 'SSR') setTimeout(SFX.win, 700);
  const body = $('.body', v);
  const card = (r, i) => r.gold ? `<div class="hc gcard" style="--rc:#e3b448;animation-delay:${i * .08}s">${COIN('gold', 'big')}<b>${r.gold}</b></div>`
    : heroCard(r.id).replace('class="hc', `style="animation-delay:${i * .08}s" class="hc`).replace('</button>', `<span class="tagnew">${r.fresh ? 'NEW' : '+' + r.shards}</span></button>`);
  if (n === 1) {
    const r = res[0];
    body.innerHTML = r.gold ? `<div class="one" style="--rc:#e3b448">${COIN('gold', 'huge')}<h2>${r.gold} gold</h2></div>`
      : `<div class="one" style="--rc:${RARITY[HEROES[r.id].rarity].color}"><img src="${poseSrc(r.id, 2)}" alt="" class="${HEROES[r.id].flip[2] ? 'flip' : ''}"><span class="sub" style="color:var(--rc)">${RARITY[HEROES[r.id].rarity].name}${r.fresh ? ' · new hero' : ` · +${r.shards} shards`}</span><h2>${HEROES[r.id].name}</h2><div class="rolel">${HEROES[r.id].role} · ${HEROES[r.id].en}</div></div>`;
  } else body.innerHTML = `<div class="ten">${res.map(card).join('')}</div>`;
  body.append(h('<button class="btn big" type="button">Continue</button>'));
  $('.btn', body).onclick = () => { v.remove(); summonScreen(); };
}

// =====================================================================================
// BATTLE: speed turn order, chosen actions, enemy intents, statuses, impact frames
// =====================================================================================
let B = null;
function stopBattle() { if (B) { cancelAnimationFrame(B.raf); B.dead = true; B = null; } if (poseLoop) { cancelAnimationFrame(poseLoop); poseLoop = null; } }
// slots (x, depth on floor 0 far..1 near, scale): front line first
const SLOTS = [[.37, .62, 1], [.27, .14, .9], [.23, 1, 1.04], [.14, .42, .94], [.08, .04, .88]];
const ST_LABEL = { stun: ['STUN', '#ffd23c'], burn: ['BURN', '#ff8a3c'], shield: ['SHLD', '#6fb6ff'], taunt: ['TAUNT', '#9fd0ff'], atkUp: ['ATK▲', '#ffb070'], defDown: ['DEF▼', '#ff5a4a'], spdUp: ['SPD▲', '#7ee08a'], slow: ['SPD▼', '#c58bff'] };
function unitBase(o) { return { st: {}, tm: rnd(0, 120), en: 0, pose: 0, poseT: 0, dash: 0, reach: 0, hurt: 0, h: 100, w: 60, alive: true, cdLeft: 0, shFlash: 0, ...o }; }
function mkHero(id) {
  const H = HEROES[id], st = statsOf(id);
  return unitBase({ side: 0, id, d: H, name: H.name, hp: st.hp, max: st.hp, atk: st.atk, def: st.def, spd: st.spd, range: H.range, row: H.row, dive: H.dive, sk: SAVE.heroes[id].sk, size: H.size, flip: H.flip, en: 20, cdLeft: 1 });
}
function mkMon(id, lvl, mult) {
  const M = MONS[id], k = (1 + (lvl - 1) * MON_LVL) * mult;
  return unitBase({ side: 1, id, d: M, name: M.name, hp: Math.round(M.hp * k * MM.hp), max: Math.round(M.hp * k * MM.hp), atk: M.atk * k * MM.atk, def: M.def * k, spd: M.spd, range: M.range, row: M.range ? 1 : 0, size: M.size, flip: M.flip, boss: M.boss, enter: 1, en: M.boss ? 34 : 0 });
}
function place(list, side) {
  const order = [...list].sort((a, b) => a.row - b.row);
  order.forEach((u, i) => { const s = SLOTS[i % SLOTS.length]; u.fx = side ? 1 - s[0] : s[0]; u.fy = s[1]; u.depth = s[2]; u.slot = i; });
}
const alive = (l) => l.filter((u) => u.alive);
const foesOf = (u) => alive(u.side ? B.heroes : B.foes), alliesOf = (u) => alive(u.side ? B.foes : B.heroes);
const spdOf = (u) => u.spd * (u.st.spdUp ? 1.3 : 1) * (u.st.slow ? .7 : 1);
function pos(u) { const W = B.w; const dir = u.side ? -1 : 1; return [u.fx * W + dir * u.dash * u.reach + (u.enter || 0) * (u.side ? 1 : -1) * W * .4, B.gy0 + u.fy * (B.gy1 - B.gy0)]; }
// battle clock: everything (waits, fx) runs on B.t so hit-stop and slow motion freeze/slow the whole scene
const wait = (ms) => new Promise((res) => { const b = B; if (!b || b.dead) return; b.waits.push({ t: b.t + ms / 1000, res }); });
function fx(type, dur, o) { B.fx.push({ type, t0: B.t, dur: dur / 1000, ...o }); }
function setPose(u, p, ms) { u.pose = p; u.poseT = ms / 1000; }
function float(u, t, c, size = 1) { const [x, y] = pos(u); B.floats.push({ x: x + rnd(-10, 10), y: y - u.h * .85, t, c, life: 1, size }); }
function burst(x, y, cols, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = sp * rnd(.4, 1.2); B.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: .15, life: 1, c: cols[i % cols.length], sz: rnd(2, 4) }); } }

function battle(stageIdx, diffId) {
  stopBattle();
  const t = STAGES[stageIdx], D = DIFF.find((x) => x.id === diffId);
  app.innerHTML = ''; app.classList.add('full');
  const s = h(`<main><div class="battle"><div class="btop"><button class="back" type="button" id="leave" aria-label="Leave">${CHEV(180)}</button><div class="t"><b>${t.name}</b><span id="wave"></span></div>
    <button class="tog" type="button" id="auto" aria-pressed="false">Auto</button><button class="tog" type="button" id="spd" aria-pressed="false">×2</button></div>
    <div class="order" aria-label="Turn order"></div>
    <div class="field"><canvas aria-label="Battlefield"></canvas><div class="cutwrap"></div></div>
    <div class="act"><div class="who"></div><div class="hintl"></div><div class="abtns"></div></div></div></main>`);
  app.append(s);
  const heroes = SAVE.squad.filter((id) => SAVE.heroes[id]).map((id) => mkHero(id));
  place(heroes, 0);
  B = { t: 0, waits: [], gy0: 0, gy1: 1, ground: REGIONS[t.region].ground, stage: t, stageIdx, D, wave: 0, heroes, foes: [], fx: [], parts: [], floats: [], auto: false, speed: 1, timeScale: 1, slowT: 0, freeze: 0,
    shake: 0, dim: 0, dimTo: 0, cam: { z: 1, x: .5, y: .6, tz: 1, tx: .5, ty: .6 }, rest: { z: 1, y: .6 }, impact: null, over: false, cur: null, choice: null, armed: 0, target: null, cv: $('canvas', s), s, last: performance.now(), bg: img(`${A}bg_${REGIONS[t.region].bg}.webp`) };
  $('#leave', s).onclick = () => { stopBattle(); mapScreen(); };
  $('#auto', s).onclick = (e) => { B.auto = !B.auto; e.currentTarget.setAttribute('aria-pressed', B.auto); SFX.click(); if (B.auto && B.choice) { const c = B.choice; B.choice = null; c(aiHero(B.cur)); } };
  $('#spd', s).onclick = (e) => { B.speed = B.speed === 1 ? 2 : 1; e.currentTarget.setAttribute('aria-pressed', B.speed === 2); SFX.click(); };
  B.cv.onpointerdown = (e) => {
    const r = B.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hitU = [...alive(B.foes), ...alive(B.heroes)].find((u) => { const [ux, uy] = pos(u); return Math.abs(x - ux) < Math.max(28, u.w * .45) && y < uy + 10 && y > uy - u.h; });
    if (!hitU || !B.choice) return;
    const need = actionNeeds(B.cur, B.armed);
    if (need === 'enemy' && hitU.side === 1) { SFX.click(); commit(hitU); }
    else if (need === 'ally' && hitU.side === 0) { SFX.click(); commit(hitU); }
  };
  B.raf = requestAnimationFrame(loop);
  run(B);
}
async function run(b) {
  nextWave(true);
  await wait(900);
  while (B === b && !b.over) {
    const u = nextActor(); if (!u) break;
    b.cur = u; drawOrder(); { const box = $('.act', b.s); if (box) box.dataset.msg = u.side ? `${u.name} acts` : b.auto ? `${u.name} · auto` : ''; }
    await takeTurn(u);
    if (B !== b) return;
    if (!alive(b.heroes).length) { finish(false); break; }
    if (!alive(b.foes).length) {
      if (b.wave < b.stage.waves.length - 1) { b.wave++; await wait(500); nextWave(false); await wait(900); }
      else { finish(true); break; }
    }
  }
}
function nextWave(first) {
  const ids = B.stage.waves[B.wave];
  B.foes = ids.map((id) => mkMon(id, B.stage.lvl, B.D.mult * B.stage.pow)); place(B.foes, 1);
  if (!first) for (const u of alive(B.heroes)) u.tm = rnd(0, 120);
  for (const f of B.foes) planIntent(f);
  $('#wave', B.s).textContent = `${B.D.name} · wave ${B.wave + 1} of ${B.stage.waves.length}`;
  SFX.drum();
  const boss = B.foes.find((f) => f.boss); if (boss) cutIn(poseSrc(boss.id, 2), boss.name, 'BOSS', '#d23b31', true, boss.flip[2]);
  drawOrder();
}
// speed turn order: everyone fills a meter at their speed, the first to 1000 acts and resets to 0
function nextActor() {
  const list = [...alive(B.heroes), ...alive(B.foes)]; if (!list.length) return null;
  let best = null, bt = Infinity;
  for (const u of list) { const t = (1000 - u.tm) / spdOf(u); if (t < bt) { bt = t; best = u; } }
  for (const u of list) u.tm += spdOf(u) * Math.max(0, bt);
  best.tm = 0; return best;
}
function previewOrder(n = 8) {
  const list = [...alive(B.heroes), ...alive(B.foes)].map((u) => ({ u, tm: u.tm })), out = [];
  for (let k = 0; k < n && list.length; k++) {
    let best = null, bt = Infinity; for (const o of list) { const t = (1000 - o.tm) / spdOf(o.u); if (t < bt) { bt = t; best = o; } }
    for (const o of list) o.tm += spdOf(o.u) * bt; best.tm = 0; out.push(best.u);
  }
  return out;
}
function drawOrder() {
  if (!B) return; const el = $('.order', B.s); if (!el) return;
  const q = [B.cur, ...previewOrder(7)].filter(Boolean);
  el.innerHTML = q.map((u, i) => `<span class="oi ${u.side ? 'foe' : 'ally'} ${i === 0 ? 'now' : ''}"><img src="${u.side ? poseSrc(u.id, 0) : faceSrc(u.id)}" alt="${u.name}" class="${u.side ? 'mface' : ''}"></span>`).join('');
}
const pushTM = (u, f) => { u.tm = clamp(u.tm + 1000 * f, 0, 999); };

// ---------- statuses ----------
function addSt(u, k, n, extra) { if (!u.alive) return; if (k === 'stun' && u.boss && Math.random() < .5) { float(u, 'RESIST', '#ddd'); return; } u.st[k] = Math.max(u.st[k] || 0, n); if (extra) Object.assign(u, extra); if (k === 'shield') u.shFlash = 1; }
function tickSt(u) { for (const k of Object.keys(u.st)) { if (k === 'stun') continue; u.st[k]--; if (u.st[k] <= 0) { delete u.st[k]; if (k === 'shield') u.shieldAmt = 0; } } }

// ---------- damage ----------
function hit(src, dst, mult, o = {}) {
  if (!dst || !dst.alive || !B) return 0;
  let d = src.atk * mult * (src.st.atkUp ? 1.25 : 1) * rnd(.92, 1.08) * 100 / (100 + dst.def * (dst.st.defDown ? .55 : 1));
  const crit = o.crit === true || Math.random() < (o.crit || .1); if (crit) d *= 1.6;
  d = Math.round(d);
  if (dst.st.shield && dst.shieldAmt > 0) { const ab = Math.min(dst.shieldAmt, d); dst.shieldAmt -= ab; d -= ab; dst.shFlash = 1; if (dst.shieldAmt <= 0) delete dst.st.shield; }
  dst.hp -= d; dst.hurt = 1;
  if (!dst.side) dst.en = Math.min(100, dst.en + 8);
  const [x, y] = pos(dst);
  B.floats.push({ x: x + rnd(-10, 10), y: y - dst.h * .8, t: (crit ? 'CRIT ' : '') + d, c: crit ? '#ffd23c' : dst.side ? '#fff' : '#ff6a5a', life: 1, size: (o.big ? 1.6 : 1) * (crit ? 1.2 : 1) });
  burst(x, y - dst.h * .45, [o.color || '#fff', '#fff'], crit ? 8 : 4, crit ? 4 : 2.5);
  B.shake = Math.max(B.shake, crit ? 7 : 3); (crit ? SFX.crit : SFX.hit)();
  if (src.d.on === 'defDown' && Math.random() < .35) addSt(dst, 'defDown', 1);
  if (src.d.on === 'drain') heal(src, d * .3, true);
  if (dst.hp <= 0) {
    dst.alive = false; dst.hp = 0; dst.dieT = 1; burst(x, y - dst.h * .4, ['#fff', '#d23b31', '#1a1216'], 16, 5); SFX.die();
    B.slowT = .45; // a kill gets a short slow-motion beat
    if (dst.d.gold) { B.bonusGold = (B.bonusGold || 0) + 200; B.floats.push({ x, y: y - dst.h, t: '+200 gold', c: '#e3b448', life: 1.3, size: 1 }); }
    if (B.target === dst) B.target = null;
  }
  return d;
}
function heal(u, n, quiet) { if (!u.alive) return; const v = Math.round(n); u.hp = Math.min(u.max, u.hp + v); float(u, '+' + v, '#7ee08a'); if (!quiet) fx('spr', 750, { k: 'heal', unit: u, hs: .95, a: .7 }); }

// ---------- target helpers ----------
const nearest = (u, list) => list.reduce((a, b) => (Math.abs(b.fx - u.fx) < Math.abs(a.fx - u.fx) ? b : a));
const weakest = (list) => list.reduce((a, b) => (b.hp / b.max < a.hp / a.max ? b : a));
const lowestHp = (list) => list.reduce((a, b) => (b.hp < a.hp ? b : a));
const frontOf = (u, list, n) => [...list].sort((a, b) => Math.abs(a.fx - u.fx) - Math.abs(b.fx - u.fx)).slice(0, n);

// ---------- hero kits: what each action needs, and what it does ----------
// needs: 'enemy' (tap an enemy), 'ally' (tap a hero), 'none' (fires at once)
const NEEDS = {
  blay: ['enemy', 'enemy', 'none'], owureku: ['enemy', 'none', 'enemy'], gyakari: ['enemy', 'enemy', 'none'], obiri: ['enemy', 'none', 'none'],
  kuukua: ['enemy', 'enemy', 'none'], kome: ['enemy', 'none', 'none'], afrakoma: ['enemy', 'none', 'none'], dufie: ['none', 'enemy', 'none'],
};
const actionNeeds = (u, i) => (u && NEEDS[u.id] ? NEEDS[u.id][i] : 'enemy');
const canUse = (u, i) => i === 0 || (i === 1 && u.cdLeft <= 0) || (i === 2 && u.en >= 100);
function defaultTarget(u) {
  const foes = foesOf(u); if (!foes.length) return null;
  const taunt = foes.find((f) => f.st.taunt); if (taunt && !u.range) return taunt;
  if (B.target && B.target.alive && B.target.side !== u.side) return B.target;
  return u.range ? lowestHp(foes) : nearest(u, foes);
}
function aiHero(u) { return { i: u.en >= 100 ? 2 : 0, target: defaultTarget(u) }; } // auto: basics and ultimates only
function aiSmart(u) { // used by the balance sim to model a player who also uses skills
  const i = u.en >= 100 ? 2 : u.cdLeft <= 0 ? 1 : 0; return { i, target: u.id === 'kome' && i === 1 ? weakest(alliesOf(u)) : defaultTarget(u) };
}

async function takeTurn(u) {
  const b = B; SFX.turn();
  // start of turn: burn ticks, stun skips
  if (u.st.burn) { const d = Math.round(Math.min(u.max * .08, (u.burnPow || 30))); u.hp -= d; u.hurt = .7; float(u, '' + d, '#ff8a3c'); fx('spr', 600, { k: 'fire', unit: u, hs: .7, a: .55 }); if (u.hp <= 0) { u.hp = 0; u.alive = false; u.dieT = 1; SFX.die(); await wait(500); return; } await wait(350); }
  const stunned = u.st.stun; delete u.st.stun; tickSt(u); // durations count down at the start of the bearer's turn
  if (stunned) { float(u, 'STUNNED', '#ffd23c'); await wait(650); if (u.side) planIntent(u); return; }
  if (u.side === 0) {
    if (u.cdLeft > 0) u.cdLeft--;
    let act;
    if (b.auto) { await wait(220); act = (b.sim === 'smart' ? aiSmart : aiHero)(u); }
    else act = await choose(u);
    if (B !== b) return;
    await doHero(u, act.i, act.target);
  } else {
    await wait(260);
    await doMonster(u);
    planIntent(u);
  }
}
// player input: action bar with Basic / Skill / Ultimate; Basic is pre-armed so tapping an enemy attacks at once
function choose(u) {
  return new Promise((res) => {
    B.choice = (a) => { renderAct(null); res(a); };
    B.armed = 0; renderAct(u);
  });
}
function commit(target) {
  const u = B.cur, i = B.armed, c = B.choice; if (!c || !canUse(u, i)) return;
  B.choice = null; c({ i, target });
}
function renderAct(u) {
  if (!B) return; const box = $('.act', B.s); if (!box) return;
  const who = $('.who', box), hint = $('.hintl', box), btns = $('.abtns', box);
  if (!u) { if (B.cur) box.dataset.msg = `${B.cur.name} acts`; box.classList.remove('mine'); who.innerHTML = ''; hint.textContent = ''; btns.innerHTML = ''; return; }
  box.classList.add('mine');
  who.innerHTML = `<img src="${faceSrc(u.id)}" alt=""><div><b>${u.name}</b><span>${u.d.role}</span></div>`;
  const lab = (i) => i === 1 ? (u.cdLeft > 0 ? `${u.cdLeft} turn${u.cdLeft > 1 ? 's' : ''}` : 'Ready') : i === 2 ? `${Math.floor(u.en)}%` : 'Basic';
  btns.innerHTML = [0, 1, 2].map((i) => `<button class="ab k${i} ${B.armed === i ? 'armed' : ''}" type="button" data-i="${i}" ${canUse(u, i) ? '' : 'disabled'}><b>${u.d.kit[i]}</b><span>${lab(i)}</span>${i === 2 ? `<i style="transform:scaleX(${u.en / 100})"></i>` : ''}</button>`).join('');
  const need = actionNeeds(u, B.armed);
  hint.innerHTML = `${u.d.notes[B.armed]} <em>${need === 'enemy' ? 'Tap an enemy.' : need === 'ally' ? 'Tap a hero.' : 'Tap again to use.'}</em>`;
  btns.querySelectorAll('.ab').forEach((bt) => (bt.onclick = () => {
    const i = +bt.dataset.i; if (!canUse(u, i)) return; SFX.click();
    if (B.armed === i) { // second tap: use on the default target
      const need = actionNeeds(u, i); commit(need === 'ally' ? weakest(alliesOf(u)) : defaultTarget(u)); return;
    }
    B.armed = i; renderAct(u);
    if (actionNeeds(u, i) === 'none' && false) commit(null);
  }));
}

// ---------- monster AI with visible intents ----------
function planIntent(m) {
  if (!m.alive) return;
  const ult = m.d.ult && m.en + 34 >= 100;
  if (ult && m.d.ult === 'heal') m.intent = { k: 'heal', label: 'Heal all' };
  else if (ult && m.d.ult === 'aoe') m.intent = { k: 'aoe', label: 'Hits all' };
  else {
    const heroes = alive(B.heroes); if (!heroes.length) return;
    const tg = m.range ? lowestHp(heroes) : nearest(m, heroes);
    m.intent = { k: ult ? 'smash' : 'atk', target: tg };
  }
}
async function doMonster(m) {
  if (m.d.ult) m.en = Math.min(100, m.en + 34);
  const heroes = alive(B.heroes); if (!heroes.length) return;
  let it = m.intent || { k: 'atk' };
  const taunt = heroes.find((x) => x.st.taunt);
  let tg = taunt || (it.target && it.target.alive ? it.target : (m.range ? lowestHp(heroes) : nearest(m, heroes)));
  if (it.k === 'heal' || it.k === 'aoe' || it.k === 'smash') { m.en = 0; await monUlt(m, it.k, tg); return; }
  await basicStrike(m, tg, 1, { color: '#ff4a3c' });
}
async function monUlt(m, kind, tg) {
  if (m.boss) await ultIntro(m, 'kuntanKantan', '#ff3b2a');
  else { setPose(m, 2, 900); float(m, kind === 'heal' ? 'Spirit mend' : kind === 'aoe' ? 'Hex storm' : 'Crushing blow', '#ff9a8a', .8); await wait(450); }
  setPose(m, 2, 900);
  if (kind === 'heal') { for (const f of alive(B.foes)) heal(f, f.max * .2); SFX.heal(); await wait(700); }
  else if (kind === 'aoe') { await impactFrames(alive(B.heroes), m); for (const t of alive(B.heroes)) { fx('boom', 800, { unit: t, hex: 1 }); hit(m, t, 1.15, { color: '#c58bff', big: m.boss }); } await wait(800); }
  else { await impactFrames([tg], m); fx('x', 420, { unit: tg, c: '#ff3b2a' }); hit(m, tg, 2.3, { color: '#ff3b2a', big: 1 }); await wait(700); }
  endUlt();
}

// ---------- shared action pieces ----------
async function basicStrike(u, tg, mult, o = {}) {
  if (!tg) return 0;
  setPose(u, 1, 420);
  const [x0, y0] = pos(u);
  let dealt = 0;
  if (u.range) {
    const kind = u.side ? (u.d.shot || 'hex') : u.id === 'kome' ? 'fire' : u.id === 'obiri' ? 'arrow' : 'spear';
    const [x1, y1] = pos(tg);
    fx('shot', 260, { x0: x0 + (u.side ? -1 : 1) * u.w * .3, y0: y0 - u.h * .6, x1, y1: y1 - tg.h * .5, kind }); SFX.shoot();
    await wait(260); dealt = hit(u, tg, mult, o);
  } else {
    u.reach = Math.max(0, Math.abs(pos(tg)[0] - x0) - tg.w * .35 - u.w * .3); u.dashTo = 1;
    await wait(180);
    const [x, y] = pos(tg); fx('slash', 240, { x, y: y - tg.h * .5, r: tg.h * .36, c: o.color || '#fff', dir: u.side ? -1 : 1 });
    dealt = hit(u, tg, mult, o);
    await wait(200); u.dashTo = 0;
  }
  await wait(260);
  return dealt;
}
async function skillBeat(u) { // a skill: name pops, short hit-stop on contact
  float(u, u.d.kit[1], '#f08a24', .85); setPose(u, 1, 500); await wait(220);
}
const hitStop = (ms) => { B.freeze = ms / 1000; };
async function ultIntro(u, sym, color) {
  // dim the field, push the camera onto the caster, brush the Adinkra in, cut-in banner
  const [x, y] = pos(u);
  B.dimTo = .62; B.cam.tz = B.rest.z * 1.18; B.cam.tx = x / B.w; B.cam.ty = (y - u.h * .5) / B.hh; setPose(u, 2, 1800);
  fx('ink', 1500, { x: x + (u.side ? -1 : 1) * u.w * .15, y: y - u.h * .62, s: Math.min(B.hh * .4, B.w * .32, u.h * 1.1), sym, c: color, follow: u });
  cutIn(poseSrc(u.id, 2), u.side ? u.name : u.d.kit[2], u.side ? 'ULTIMATE' : `${u.name.toUpperCase()} · ${u.d.role.toUpperCase()}`, color, !!u.side, u.flip[2]);
  SFX.ult();
  await wait(950);
}
async function impactFrames(targets, src) {
  // 2 impact frames: black field with white silhouettes, then white field with black silhouettes; then the hit lands
  B.cam.tx = targets.reduce((a, t) => a + pos(t)[0], 0) / targets.length / B.w; B.cam.ty = B.rest.y;
  await wait(120);
  SFX.impact();
  B.impact = { k: 0, list: targets, src }; hitStop(90); await wait(1);
  B.impact = { k: 1, list: targets, src }; hitStop(80); await wait(1);
  B.impact = null; B.shake = 16;
}
function endUlt() { B.dimTo = 0; B.cam.tz = B.rest.z; B.cam.tx = .5; B.cam.ty = B.rest.y; }

async function doHero(u, i, tg) {
  const m = skMult(u.id, i), foes = () => alive(B.foes), team = () => alive(B.heroes);
  if (i === 0) u.en = Math.min(100, u.en + 34);
  if (i === 1) { u.cdLeft = u.d.cd + 1; u.en = Math.min(100, u.en + 20); }
  if (i === 2) u.en = 0;
  if (!tg || !tg.alive) tg = defaultTarget(u);
  if (!tg && i !== 2 && u.id !== 'kome') return;
  if (i === 0) {
    switch (u.id) {
      case 'gyakari': await basicStrike(u, tg, .85 * m, { color: '#6fb6ff' }); addSt(u, 'taunt', 1); break;
      case 'kome': await basicStrike(u, tg, .9 * m, { color: '#ffb43c' }); addSt(tg, 'burn', 2, { burnPow: u.atk * .5 }); break;
      case 'afrakoma': { await basicStrike(u, tg, 1 * m, { color: '#ff8a3c' }); const nx = foes().filter((f) => f !== tg)[0]; if (nx) hit(u, nx, .35 * m, { color: '#ff8a3c' }); break; }
      case 'dufie': await basicStrike(u, weakest(foes()), 1 * m, { color: '#c58bff' }); break;
      default: await basicStrike(u, tg, 1 * m);
    }
    return;
  }
  if (i === 1) {
    await skillBeat(u);
    switch (u.id) {
      case 'blay': await basicStrike(u, tg, .75 * m); hitStop(90); if (tg.alive) { hit(u, tg, .75 * m); addSt(tg, 'defDown', 2); float(tg, 'DEF▼', '#ff5a4a', .8); } break;
      case 'owureku': { const t2 = foesOf(u).reduce((a, b) => (Math.abs(b.fx - u.fx) > Math.abs(a.fx - u.fx) ? b : a)); const [x0, y0] = pos(u), [x1, y1] = pos(t2); fx('shot', 380, { x0, y0: y0 - u.h * .6, x1, y1: y1 - t2.h * .5, kind: 'axe' }); await wait(380); hitStop(100); hit(u, t2, 1.25 * m, { color: '#ffb070' }); addSt(t2, 'stun', 1); break; }
      case 'gyakari': await basicStrike(u, tg, .9 * m, { color: '#6fb6ff' }); hitStop(110); addSt(tg, 'stun', 1); break;
      case 'obiri': { for (const f of foes()) { const [x0, y0] = pos(u), [x1, y1] = pos(f); fx('shot', 300, { x0, y0: y0 - u.h * .6, x1, y1: y1 - f.h * .5, kind: 'arrow' }); } await wait(300); hitStop(90); for (const f of foes()) hit(u, f, .6 * m, { color: '#e6edf5' }); break; }
      case 'kuukua': await basicStrike(u, tg, 1.2 * m, { color: '#e6edf5' }); hitStop(90); addSt(tg, 'slow', 2); pushTM(tg, -.2); break;
      case 'kome': { const w = tg && tg.side === 0 ? tg : weakest(team()); const [x, y] = pos(w); fx('ink', 900, { x, y: y - w.h * .55, s: w.h * .55, sym: 'nyameDua', c: '#7ee08a', small: 1 }); heal(w, w.max * .35 * m); delete w.st.stun; delete w.st.burn; SFX.heal(); await wait(600); break; }
      case 'afrakoma': { let tot = 0; for (const f of frontOf(u, foes(), 2)) { const [x, y] = pos(f); fx('slash', 300, { x, y: y - f.h * .5, r: f.h * .5, c: '#ff8a3c', dir: 1, big: 1 }); tot += hit(u, f, 1.05 * m, { color: '#ff8a3c' }); } hitStop(100); heal(u, tot * .5, true); await wait(400); break; }
      case 'dufie': { u.reach = Math.max(0, Math.abs(pos(tg)[0] - pos(u)[0]) - tg.w * .3); u.dashTo = 1; await wait(170); const [x, y] = pos(tg); fx('x', 300, { x, y: y - tg.h * .5, r: tg.h * .45, c: '#c58bff' }); hitStop(120); hit(u, tg, 1.55 * m, { color: '#c58bff', crit: true }); await wait(220); u.dashTo = 0; pushTM(u, .5); break; }
    }
    await wait(250); return;
  }
  // ultimates: dim, zoom, ink symbol, cut-in, impact frames, big hit
  await ultIntro(u, u.d.sym, RARITY[u.d.rarity].color === '#6fb6ff' ? '#e3b448' : RARITY[u.d.rarity].color);
  const F = foes();
  switch (u.id) {
    case 'blay': { const L = frontOf(u, F, 3); await impactFrames(L, u); for (const f of L) { const [x, y] = pos(f); fx('slash', 420, { x, y: y - f.h * .5, r: f.h * .6, c: '#fff', dir: 1, big: 1 }); hit(u, f, 2.0 * m, { big: 1 }); } addSt(u, 'atkUp', 2); break; }
    case 'owureku': { await impactFrames([tg], u); fx('slash', 420, { x: pos(tg)[0], y: pos(tg)[1] - tg.h * .5, r: tg.h * .6, c: '#ffb070', dir: 1, big: 1 }); hit(u, tg, 2.0 * m, { color: '#ffb070', big: 1 }); for (const t of team()) { addSt(t, 'atkUp', 2); pushTM(t, .25); } break; }
    case 'gyakari': { for (const t of team()) { addSt(t, 'shield', 2); t.shieldAmt = Math.round(u.max * .22 * m); } u.st.taunt = 2; for (const f of F) f.intent && (f.intent.target = u); await wait(300); break; }
    case 'obiri': { const t2 = lowestHp(F); await impactFrames([t2], u); const [x0, y0] = pos(u), [x, y] = pos(t2); fx('beam', 500, { x0, y0: y0 - u.h * .6, x1: x, y1: y - t2.h * .5, c: '#ffd23c' }); hit(u, t2, 3.4 * m, { color: '#ffd23c', crit: true, big: 1 }); if (!t2.alive) u.en = 50; break; }
    case 'kuukua': { await impactFrames(F, u); for (const f of F) { fx('rain', 600, { unit: f }); hit(u, f, 1.15 * m, { color: '#e6edf5', big: 1 }); addSt(f, 'defDown', 2); } break; }
    case 'kome': { await impactFrames(F, u); for (const t of team()) heal(t, t.max * .25 * m); for (const f of F) { fx('boom', 800, { unit: f }); hit(u, f, 1.0 * m, { color: '#ffb43c', big: 1 }); addSt(f, 'burn', 2, { burnPow: u.atk * .6 }); } SFX.heal(); break; }
    case 'afrakoma': { await impactFrames(F, u); let tot = 0; for (const f of F) { const [x, y] = pos(f); fx('slash', 420, { x, y: y - f.h * .5, r: f.h * .55, c: '#ff8a3c', dir: 1, big: 1 }); tot += hit(u, f, 1.45 * m, { color: '#ff8a3c', big: 1 }); } heal(u, tot * .5, true); break; }
    case 'dufie': { await impactFrames(F.slice(0, 3), u); for (let k = 0; k < 6; k++) { const l = foes(); if (!l.length) break; const t2 = pick(l), [x, y] = pos(t2); fx('x', 240, { x, y: y - t2.h * .5, r: t2.h * .4, c: '#c58bff' }); hit(u, t2, .6 * m, { color: '#c58bff' }); await wait(110); } break; }
  }
  await wait(650); endUlt(); await wait(250);
}

function cutIn(src, big, small, color, foe = false, flip = 0) {
  if (!B) return; const w = $('.cutwrap', B.s); if (!w) return;
  const c = h(`<div class="cutin ${foe ? 'foe' : ''}" style="--rc:${color}"><div class="band"></div><img src="${src}" alt="" class="${flip ? 'flip' : ''}"><div class="t"><b>${big}</b><span>${small}</span></div></div>`);
  w.append(c); setTimeout(() => c.remove(), 950);
}

// ---------- end ----------
function finish(win) {
  if (B.over) return; B.over = true; renderAct(null);
  const left = alive(B.heroes).length, total = B.heroes.length, t = B.stage, idx = B.stageIdx, dId = B.D.id;
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
  const b = B;
  setTimeout(() => {
    if (B !== b) return;
    const heroesRow = B.heroes.map((u) => `<div class="rh ${u.alive ? '' : 'ko'}"><img src="${faceSrc(u.id)}" alt=""><b>${ups[u.id] ? 'Lv ' + ups[u.id] + ' ▲' : 'Lv ' + SAVE.heroes[u.id].lvl}</b></div>`).join('');
    const v = h(`<div class="veil"><div class="result ${win ? 'win' : 'lose'}"><span class="sub">Stage ${idx + 1} · ${t.name} · ${B.D.name}</span>
      <div class="rtitle">${adinkraSvg(win ? 'fawohodie' : 'hyeWonhye')}<h2>${win ? 'Victory' : 'Defeat'}</h2></div>
      ${win ? `<div class="stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${.15 + i * .18}s">★</i>`).join('')}</div>
        <div class="chips">${chips.map(([ic, n, l]) => `<div class="chip">${ic}<b>${n}</b><span>${l}</span></div>`).join('')}</div>`
        : `<p>Hye won hye: what does not burn comes back stronger. Use skills on cooldown, stun the big hitters before their move, level up at Heroes, or try Easy.</p>`}
      <div class="rheroes">${heroesRow}</div>
      <div class="row2"><button class="btn ghost" type="button">${win ? 'Replay' : 'Retry'}</button>${win ? '' : '<button class="btn ghost" type="button" data-go="heroes">Heroes</button>'}<button class="btn" type="button">${win && idx < STAGES.length - 1 ? 'Next stage' : 'Journey'}</button></div></div></div>`);
    const btns = v.querySelectorAll('.btn'), retry = btns[0], next = btns[btns.length - 1];
    retry.onclick = () => battle(idx, dId);
    next.onclick = () => { stopBattle(); if (win && idx < STAGES.length - 1) sel = idx + 1; tab = 'map'; mapScreen(); };
    const hb = v.querySelector('[data-go]'); if (hb) hb.onclick = () => { tab = 'heroes'; heroSel = null; route(); };
    app.append(v);
  }, 900);
}

// ---------- render loop ----------
function loop(now) {
  if (!B) return;
  const real = Math.min(.05, (now - B.last) / 1000); B.last = now;
  let dt = real * B.speed;
  if (B.freeze > 0) { B.freeze -= real; dt = 0; }
  if (B.slowT > 0) { B.slowT -= real; dt *= .35; }
  B.t += dt;
  // resolve waits on the battle clock
  if (B.waits.length) { const due = B.waits.filter((w) => w.t <= B.t); if (due.length) { B.waits = B.waits.filter((w) => w.t > B.t); due.forEach((w) => w.res()); } }
  const cv = B.cv, r = cv.getBoundingClientRect(), dpr = Math.min(2.5, devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  B.w = r.width; B.hh = r.height;
  { const port = r.height > r.width * .9, rz = port ? 1.12 : 1, ry = port ? .66 : .6; if (B.rest.z !== rz || B.rest.y !== ry) { B.rest = { z: rz, y: ry }; if (B.dimTo === 0) { B.cam.tz = rz; B.cam.ty = ry; } } }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingQuality = 'high';
  // camera
  const C = B.cam, ease = 1 - Math.pow(.002, real); C.z += (C.tz - C.z) * ease; C.x += (C.tx - C.x) * ease; C.y += (C.ty - C.y) * ease;
  { const mx = (1 - 1 / C.z) / 2; C.x = clamp(C.x, .5 - mx, .5 + mx); C.y = clamp(C.y, .6 - .6 * (1 - 1 / C.z), .6 + .4 * (1 - 1 / C.z)); } // never show past the painted background
  B.dim += (B.dimTo - B.dim) * ease;
  const sh = B.shake; B.shake = Math.max(0, sh - 40 * real);
  g.save();
  g.translate(r.width * .5, r.height * .6); g.scale(C.z, C.z); g.translate(-r.width * C.x, -r.height * C.y);
  g.translate(rnd(-1, 1) * sh, rnd(-1, 1) * sh);
  // background, anchored to the bottom so the painted floor stays under the fighters
  let bgTop = 0, bgH = r.height;
  if (B.bg.ok) { const im = B.bg.el, k = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight) * 1.08; const w = im.naturalWidth * k; bgH = im.naturalHeight * k; bgTop = r.height - bgH + bgH * .04; g.drawImage(im, (r.width - w) / 2, bgTop, w, bgH); }
  else { g.fillStyle = '#1a1216'; g.fillRect(-50, -50, r.width + 100, r.height + 100); }
  B.gy0 = bgTop + B.ground[0] * bgH; B.gy1 = Math.min(r.height - 8, bgTop + B.ground[1] * bgH);
  if (B.dim > .01) { g.fillStyle = `rgba(6,3,8,${B.dim})`; g.fillRect(-r.width, -r.height, r.width * 3, r.height * 3); }
  B.fx = B.fx.filter((f) => f.type !== 'ink' || drawFx(g, f)); // ink symbols sit behind the fighters
  const units = [...B.heroes, ...B.foes].filter((u) => u.alive || u.dieT > 0).sort((a, b) => a.fy - b.fy);
  const portrait = r.height > r.width * .9, baseH = portrait ? Math.min(r.height * .3, r.width * .34) : Math.min(r.height * .4, r.width * .2);
  for (const u of units) {
    u.h = baseH * u.size * u.depth;
    if (u.enter) u.enter = Math.max(0, u.enter - dt * 2.2);
    if (u.poseT > 0) { u.poseT -= dt; if (u.poseT <= 0) u.pose = 0; }
    u.dash += ((u.dashTo || 0) - u.dash) * Math.min(1, dt * 14);
    u.hurt = Math.max(0, u.hurt - dt * 4); u.shFlash = Math.max(0, u.shFlash - dt * 1.4);
    const e0 = img(poseSrc(u.id, 0)), e = img(poseSrc(u.id, u.pose));
    if (!e0.ok || !e.ok) { u.w = u.h * .6; continue; }
    const k = u.h / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k;
    u.w = e0.el.naturalWidth * k;
    const [x, y] = pos(u), bob = Math.sin(B.t * 2.4 + (u.slot || 0)) * u.h * .006;
    const flip = u.flip[u.pose], isCur = u === B.cur && !B.over;
    g.save();
    if (!u.alive) { u.dieT = Math.max(0, u.dieT - dt * 1.4); g.globalAlpha = u.dieT; }
    const shg = g.createRadialGradient(x, y, 1, x, y, u.w * .5); shg.addColorStop(0, 'rgba(0,0,0,.6)'); shg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shg; g.save(); g.translate(x, y); g.scale(1, .14); g.beginPath(); g.arc(0, 0, u.w * .5, 0, 6.28); g.restore(); g.fill();
    if (isCur) { g.strokeStyle = u.side ? 'rgba(255,90,74,.9)' : 'rgba(227,180,72,.95)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, u.w * .5, u.h * .07, 0, 0, 6.28); g.stroke(); }
    if (u.st.taunt) { g.strokeStyle = 'rgba(111,182,255,.8)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.ellipse(x, y, u.w * .6, u.h * .09, 0, 0, 6.28); g.stroke(); g.setLineDash([]); }
    g.translate(x, y + bob); if (flip) g.scale(-1, 1); if (u.hurt > .5) g.translate(rnd(-3, 3), 0);
    const th = ph * dpr * C.z;
    const targetable = B.choice && actionNeeds(B.cur, B.armed) === 'enemy' && u.side === 1 && u.alive;
    const ring = targetable && (u === defaultTarget(B.cur)) ? '#ff3b2a' : null;
    if (ring) { const sil = silhouette(e, th, ring); if (sil) { g.save(); g.globalAlpha *= .85; for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) g.drawImage(sil, -pw / 2 + ox, -ph + oy, pw, ph); g.restore(); } }
    const sc = scaled(e, th); if (sc) g.drawImage(sc, -pw / 2, -ph, pw, ph);
    if (u.hurt > .45) { const sil = silhouette(e, th, '#ffffff'); if (sil) { g.globalAlpha = (u.hurt - .45) * 1.4; g.drawImage(sil, -pw / 2, -ph, pw, ph); } }
    g.restore();
    if (u.alive) drawOverlay(g, u, x, y);
  }
  B.fx = B.fx.filter((f) => f.type === 'ink' || drawFx(g, f));
  for (const p of B.parts) { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vy += p.g * dt * 60; p.life -= dt * 1.8; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
  g.globalAlpha = 1; B.parts = B.parts.filter((p) => p.life > 0);
  g.textAlign = 'center';
  for (const f of B.floats) { f.y -= 34 * dt; f.life -= dt * .8; g.globalAlpha = Math.max(0, Math.min(1, f.life * 2)); g.font = `${Math.round(19 * f.size)}px Bangers, Impact, sans-serif`; g.lineWidth = 4; g.strokeStyle = '#120c10'; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.c; g.fillText(f.t, f.x, f.y); }
  g.globalAlpha = 1; B.floats = B.floats.filter((f) => f.life > 0);
  g.restore();
  // impact frames are drawn flat over everything
  if (B.impact) drawImpact(g, r, dpr);
  B.raf = requestAnimationFrame(loop);
}
function drawOverlay(g, u, x, y) {
  // shield: brief full dome when cast or hit, a faint shell otherwise; stretched to cover the whole fighter
  if (u.st.shield) {
    const S = FXS.shield, f = u.shFlash > 0 ? (1 - u.shFlash) * 9 : S.loop[0] + (Math.floor(B.t * 8) % (S.loop[1] - S.loop[0] + 1));
    if (!sprite(g, 'shield', f, x, y + u.h * .02, u.h * 1.16, u.shFlash > 0 ? .75 : .22, Math.max(u.w * 1.25, u.h * .78))) { g.strokeStyle = 'rgba(111,182,255,.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - u.h * .5, u.w * .6, u.h * .58, 0, 0, 6.28); g.stroke(); }
  }
  const bw = Math.max(40, Math.min(90, u.w * .75)), by = y - u.h * 1.02 - 10;
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 7);
  g.fillStyle = u.side ? (u.boss ? '#ff3b2a' : '#d23b31') : '#5fd07a'; g.fillRect(x - bw / 2, by, bw * u.hp / u.max, 5);
  if (u.st.shield && u.shieldAmt) { g.fillStyle = 'rgba(160,210,255,.9)'; g.fillRect(x - bw / 2, by, Math.min(bw, bw * u.shieldAmt / u.max), 2); }
  if (!u.side || u.d.ult) { g.fillStyle = '#e3b448'; g.fillRect(x - bw / 2, by + 6, bw * u.en / 100, 2); }
  // statuses as small labelled chips with turns left
  const keys = Object.keys(u.st); let cx = x - bw / 2;
  g.font = '700 9px Karla, system-ui, sans-serif'; g.textAlign = 'left';
  for (const k of keys) { const [lab, col] = ST_LABEL[k] || [k, '#fff'], txt = `${lab} ${u.st[k]}`, w = g.measureText(txt).width + 6; g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(cx, by - 13, w, 11); g.fillStyle = col; g.fillText(txt, cx + 3, by - 4.5); cx += w + 2; }
  // enemy intent badge
  if (u.side && u.intent && !B.over) {
    const it = u.intent, txt = it.k === 'heal' ? '✚ Heal all' : it.k === 'aoe' ? '✦ Hits all' : `${it.k === 'smash' ? '✸' : '⚔'} ${it.target ? it.target.name : ''}`;
    g.font = '700 11px Karla, system-ui, sans-serif'; const w = g.measureText(txt).width + 10, iy = by - (keys.length ? 28 : 16);
    g.fillStyle = it.k === 'atk' ? 'rgba(20,10,14,.85)' : 'rgba(120,18,14,.92)'; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, iy - 10, w, 15, 7) : g.rect(x - w / 2, iy - 10, w, 15); g.fill();
    g.fillStyle = it.k === 'atk' ? '#ffcfbf' : '#fff'; g.textAlign = 'center'; g.fillText(txt, x, iy + 1);
  }
  g.textAlign = 'center';
}
function drawImpact(g, r, dpr) {
  const I = B.impact, dark = I.k === 0;
  g.save(); g.fillStyle = dark ? '#000' : '#fff'; g.fillRect(0, 0, r.width, r.height);
  const C = B.cam; g.translate(r.width * .5, r.height * .6); g.scale(C.z, C.z); g.translate(-r.width * C.x, -r.height * C.y);
  for (const u of [...I.list, I.src].filter(Boolean)) {
    const e0 = img(poseSrc(u.id, 0)), e = img(poseSrc(u.id, u.pose)); if (!e.ok || !e0.ok) continue;
    const k = u.h / e0.el.naturalHeight, ph = e.el.naturalHeight * k, pw = e.el.naturalWidth * k, [x, y] = pos(u);
    const sil = silhouette(e, ph * dpr * C.z, u === I.src ? (dark ? '#e3b448' : '#000') : (dark ? '#fff' : '#000')); if (!sil) continue;
    g.save(); g.translate(x, y); if (u.flip[u.pose]) g.scale(-1, 1); g.drawImage(sil, -pw / 2, -ph, pw, ph); g.restore();
  }
  // speed lines toward the impact point
  g.restore(); g.save(); g.strokeStyle = dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.45)'; g.lineWidth = 2;
  const cx = r.width / 2, cy = r.height * .55; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28 + rnd(-.05, .05), r0 = Math.max(r.width, r.height) * rnd(.3, .45); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r0 * 2, cy + Math.sin(a) * r0 * 2); g.stroke(); }
  g.restore();
}
function drawFx(g, f) {
  const p = Math.min(1, (B.t - f.t0) / f.dur);
  g.save(); g.lineCap = 'round';
  switch (f.type) {
    case 'slash': { const e = 1 - (1 - Math.min(1, p * 1.6)) ** 3, a0 = f.dir < 0 ? -0.6 : -2.5, sw = 2.9 * (f.dir < 0 ? -1 : 1); g.globalAlpha = (p < .6 ? 1 : 1 - (p - .6) / .4) * .85; g.strokeStyle = f.c; g.lineWidth = (f.big ? 8 : 4) * (1 - p * .5);
      g.beginPath(); g.arc(f.x, f.y, f.r, a0 + sw * Math.max(0, e - .5), a0 + sw * e, sw < 0); g.stroke(); break; }
    case 'x': { const [x, y] = f.unit ? [pos(f.unit)[0], pos(f.unit)[1] - f.unit.h * .5] : [f.x, f.y], R = f.unit ? f.unit.h * .45 : f.r, L = R * Math.min(1, p * 2.2); g.globalAlpha = 1 - p; g.strokeStyle = f.c; g.lineWidth = 5; g.beginPath(); g.moveTo(x - L, y - L); g.lineTo(x + L, y + L); g.moveTo(x + L, y - L); g.lineTo(x - L, y + L); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); break; }
    case 'shot': {
      const x = f.x0 + (f.x1 - f.x0) * p, arc = f.kind === 'arrow' || f.kind === 'axe' ? Math.sin(p * Math.PI) * 26 : 0, y = f.y0 + (f.y1 - f.y0) * p - arc, a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      g.translate(x, y);
      if (f.kind === 'arrow' || f.kind === 'spear') { g.rotate(a); g.strokeStyle = '#6b4424'; g.lineWidth = f.kind === 'spear' ? 4 : 2.5; g.beginPath(); g.moveTo(-26, 0); g.lineTo(6, 0); g.stroke(); g.fillStyle = '#e6edf5'; g.beginPath(); g.moveTo(14, 0); g.lineTo(2, -4); g.lineTo(2, 4); g.fill(); }
      else if (f.kind === 'axe') { g.rotate(p * 14); g.strokeStyle = '#6b4424'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.stroke(); g.fillStyle = '#cfd6e0'; g.beginPath(); g.moveTo(6, -2); g.quadraticCurveTo(16, -10, 14, 6); g.lineTo(6, 3); g.fill(); }
      else if (f.kind === 'thorn') { g.rotate(a); g.fillStyle = '#d8c25a'; g.strokeStyle = '#3a2a10'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, 0); g.lineTo(-10, -4); g.lineTo(-6, 0); g.lineTo(-10, 4); g.closePath(); g.fill(); g.stroke(); }
      else { const col = f.kind === 'fire' ? ['#fff8d0', '#ffb43c', 'rgba(255,90,30,0)'] : ['#f6ecff', '#c58bff', 'rgba(110,50,200,0)']; const rg = g.createRadialGradient(0, 0, 1, 0, 0, 11); rg.addColorStop(0, col[0]); rg.addColorStop(.45, col[1]); rg.addColorStop(1, col[2]); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 11, 0, 6.28); g.fill(); }
      break;
    }
    case 'beam': { g.globalAlpha = (1 - p) * .9; g.strokeStyle = f.c; g.lineWidth = 8 * (1 - p) + 2; g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x1, f.y1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); break; }
    case 'boom': { if (!f.unit) break; const S = FXS[f.hex ? 'hex' : 'fire'], [a, b] = S.peak, [x, y] = pos(f.unit); sprite(g, f.hex ? 'hex' : 'fire', a + p * (b - a + 1), x, y, f.unit.h * .95, (p > .7 ? (1 - p) / .3 : 1) * .78); break; }
    case 'spr': { const S = FXS[f.k], [a, b] = S.peak || [0, S.n - 1], [x, y] = pos(f.unit); sprite(g, f.k, a + p * (b - a + 1), x, y, f.unit.h * f.hs, (p > .75 ? (1 - p) / .25 : 1) * (f.a || 1)); break; }
    case 'rain': { const [x, y0] = pos(f.unit), H = f.unit.h; g.strokeStyle = '#e6edf5'; g.lineWidth = 3; g.globalAlpha = 1 - p * .6; for (let i = 0; i < 3; i++) { const yy = y0 - H * 1.4 + (p * 1.6 - i * .2) * H; g.beginPath(); g.moveTo(x + (i - 1) * 10, yy - 22); g.lineTo(x + (i - 1) * 10, yy); g.stroke(); } break; }
    case 'ink': {
      // brush-reveal of the glowing ink Adinkra: a diagonal wipe paints it in, it breathes, then fades
      const ink = inkSymbol(f.sym, f.c), S = f.s * 1.35, x = f.follow ? pos(f.follow)[0] + (f.follow.side ? -1 : 1) * f.follow.w * .15 : f.x, y = f.follow ? pos(f.follow)[1] - f.follow.h * .62 : f.y;
      const rev = Math.min(1, p / .35), a = p < .75 ? 1 : 1 - (p - .75) / .25, sc = 1 + p * .06;
      g.translate(x, y); g.scale(sc, sc); g.globalAlpha = a * (f.small ? .8 : .95);
      g.beginPath(); g.moveTo(-S, -S * .6); g.lineTo(-S + S * 2.6 * rev, -S * .6 - S * .5); g.lineTo(-S + S * 2.6 * rev - S * .4, S * .9); g.lineTo(-S, S * .9); g.closePath(); g.clip();
      g.drawImage(ink, -S / 2, -S / 2, S, S);
      break;
    }
  }
  g.restore(); return p < 1;
}

// ---------------- boot ----------------
route();
window.__sq = { get B() { return B; }, get SAVE() { return SAVE; }, battle, route, MM, renderAct: () => B && B.cur && renderAct(B.cur), ratio: (i, d) => squadPower() / enemyPower(STAGES[i], DIFF.find((x) => x.id === d)) };
