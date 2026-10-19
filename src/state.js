// Persistent player state, stat math, loot, shrine offerings, save/load.
import { HEROES, SLOT_INFO, QUALITY, MATERIALS, SKILLS, xpForLevel, MAX_LEVEL } from './data.js';

const SAVE_KEY = 'gyeaman.save.v2';
export const rnd = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rnd(a.length)];
let uid = Date.now() % 100000;

/** Make an item for a slot type ('sword' | 'shield' | 'helmet' | 'armour' | 'ring') at a world tier. */
export function makeItem(kind, tier, q) {
  const info = SLOT_INFO[kind];
  const stat = info.stat || pick(['atk', 'def', 'mag']);
  const scale = QUALITY[q].mult * (1 + tier * 0.9);
  const stats = { [stat]: Math.max(1, Math.round((stat === 'hp' ? SLOT_INFO.armour.base : info.base) * scale * (0.9 + Math.random() * 0.2))) };
  if (QUALITY[q].bonus) { const extra = pick(['atk', 'def', 'mag', 'hp'].filter((s) => s !== stat)); stats[extra] = Math.round((extra === 'hp' ? 10 : 2) * (1 + tier)); }
  const mat = MATERIALS[Math.min(tier, MATERIALS.length - 1)];
  const name = `${QUALITY[q].name === 'Regular' ? '' : QUALITY[q].name + ' '}${mat} ${info.name}`;
  return { uid: ++uid, kind, name, en: info.en, art: info.art, q, tier, stats };
}
export function rollQuality(luck = 0) { const r = Math.random() + luck; return r > 1.1 ? 3 : r > 0.88 ? 2 : r > 0.6 ? 1 : 0; }
export function rollItem(tier, luck = 0) { return makeItem(pick(['sword', 'shield', 'helmet', 'armour', 'ring']), tier, rollQuality(luck)); }

export function newPlayer(heroId) {
  const h = HEROES.find((x) => x.id === heroId);
  const p = {
    v: 2, hero: h.id, name: h.name, level: 1, xp: 0,
    attr: { atk: 0, def: 0, mag: 0, hp: 0 }, attrPts: 0,
    skills: [], equip: { sword: makeItem('sword', 0, 0), shield: null, helmet: null, armour: null, ring1: null, ring2: null },
    bag: [], offered: 0, choices: 0,
    unlocked: ['forest'], cleared: [], best: {},
    stats: { kills: 0, bosses: 0 },
  };
  p.hp = maxStats(p).hp;
  return p;
}
export function heroOf(p) { return HEROES.find((x) => x.id === p.hero); }
export const has = (p, id) => p.skills.includes(id);

export function maxStats(p) {
  const b = heroOf(p).base, L = p.level - 1;
  const s = { hp: b.hp + L * 10 + p.attr.hp * 8, atk: b.atk + Math.floor(L * 1.2) + p.attr.atk, def: b.def + Math.floor(L * 0.8) + p.attr.def, mag: b.mag + Math.floor(L * 1.0) + p.attr.mag };
  for (const g of Object.values(p.equip)) if (g) for (const [k, v] of Object.entries(g.stats)) s[k] += v;
  if (has(p, 'offence')) s.atk = Math.round(s.atk * 1.15);
  s.stamina = 3 + Math.floor(p.level / 4);
  s.potionSlots = p.level >= 2 ? 2 : 1;
  return s;
}
export const skillPoints = (p) => Math.floor(p.level / 4) - p.skills.length;
export function canLearn(p, sk) { return p.level >= sk.lvl && skillPoints(p) > 0 && !has(p, sk.id); }
export const allSkills = () => Object.values(SKILLS).flat();

/** Adds XP, returns messages. Attribute points: 3 per level, 4 every third level. */
export function gainXp(p, xp) {
  const msgs = [];
  p.xp += xp;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level); p.level++;
    const pts = p.level % 3 === 0 ? 4 : 3; p.attrPts += pts;
    p.hp = maxStats(p).hp;
    msgs.push('Level ' + p.level + '! +' + pts + ' attribute points');
    if (p.level % 4 === 0) msgs.push('+1 skill point');
    if (p.level === 2) msgs.push('Second tonic slot and axe unlocked');
    if (p.level === 4) msgs.push('Spear unlocked');
  }
  return msgs;
}

/** Shrine: every 5 offered items earn one pick of 5 random items. */
export function offer(p, item) { p.bag = p.bag.filter((x) => x !== item); p.offered++; if (p.offered >= 5) { p.offered -= 5; p.choices++; } }
export function shrineChoices(p) { const tier = Math.max(0, p.cleared.length); return Array.from({ length: 5 }, () => rollItem(tier, 0.2)); }

export function save(p) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ } }
export function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
export function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
