// Persistent player state, stat math, loot generation, save/load.
import { HEROES, WEAPON_TYPES, SPELLS, GEAR_BASES, RARITY, AFFIXES, GROWTH, xpForLevel, MAX_LEVEL } from './data.js';

const SAVE_KEY = 'gyeaman.save.v1';
export const rnd = (n) => Math.floor(Math.random() * n);
export const pick = (a) => a[rnd(a.length)];
let uid = Date.now() % 100000;

export function makeGear(base, rarityIdx, ilvl) {
  const r = RARITY[rarityIdx];
  const stats = {};
  const scale = r.mult * (1 + (ilvl - 1) * 0.12);
  for (const [k, v] of Object.entries(base.stats)) stats[k] = Math.max(1, Math.round(v * scale));
  const affixes = [];
  const pool = [...AFFIXES];
  for (let i = 0; i < r.affixes; i++) {
    const a = pool.splice(rnd(pool.length), 1)[0];
    const v = Math.round((a.v[0] + Math.random() * (a.v[1] - a.v[0])) * (1 + (ilvl - 1) * 0.08));
    stats[a.stat] = (stats[a.stat] || 0) + v;
    affixes.push(a.name);
  }
  const name = base.name + (affixes[0] ? ' ' + affixes[0] : '');
  return { uid: ++uid, slot: base.slot, type: base.type, name, base: base.name, art: base.art, rarity: rarityIdx, ilvl, stats, value: Math.round(12 * scale * (1 + affixes.length)) };
}

export function rollLoot(ilvl, luck = 0) {
  const roll = Math.random() + luck;
  const rarity = roll > 1.12 ? 3 : roll > 0.9 ? 2 : roll > 0.6 ? 1 : 0;
  return makeGear(pick(GEAR_BASES), rarity, ilvl);
}

export function newPlayer(heroId) {
  const h = HEROES.find((x) => x.id === heroId);
  const wBase = GEAR_BASES.find((g) => g.slot === 'weapon' && g.type === h.weapon);
  const weapon = makeGear(wBase, 0, 1);
  const p = {
    hero: h.id, name: h.name, level: 1, xp: 0, gold: 40, potions: 2, ethers: 1,
    equip: { weapon, head: null, body: null, charm: null },
    bag: [],
    spells: ['ogya', 'nkwa'],
    unlocked: ['forest'], cleared: [],
    run: null,
    stats: { kills: 0, runs: 0, bosses: 0 },
  };
  p.hp = maxStats(p).hp; p.mp = maxStats(p).mp;
  return p;
}

export function heroOf(p) { return HEROES.find((x) => x.id === p.hero); }

export function maxStats(p) {
  const b = heroOf(p).base;
  const L = p.level - 1;
  const s = {
    hp: Math.round(b.hp + GROWTH.hp * L), mp: Math.round(20 + b.mag + GROWTH.mp * L),
    atk: Math.round(b.atk + GROWTH.atk * L), mag: Math.round(b.mag + GROWTH.mag * L),
    def: Math.round(b.def + GROWTH.def * L), spd: Math.round(b.spd + GROWTH.spd * L),
    move: b.move, crit: 5,
  };
  for (const g of Object.values(p.equip)) if (g) for (const [k, v] of Object.entries(g.stats)) s[k] = (s[k] || 0) + v;
  return s;
}

export function weaponType(p) { return WEAPON_TYPES[p.equip.weapon ? p.equip.weapon.type : 'afena']; }

export function availableSpells(p) { return Object.entries(SPELLS).filter(([, s]) => s.lvl <= p.level).map(([id]) => id); }

/** Adds XP, returns list of messages for level-ups. */
export function gainXp(p, xp) {
  const msgs = [];
  p.xp += xp;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    const m = maxStats(p);
    p.hp = m.hp; p.mp = m.mp;
    msgs.push('Level ' + p.level + '!');
    for (const [id, s] of Object.entries(SPELLS)) if (s.lvl === p.level) {
      msgs.push('New spell: ' + s.name + ' (' + s.en + ')');
      if (p.spells.length < 4) p.spells.push(id);
    }
  }
  return msgs;
}

export function save(p) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ } }
export function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
export function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
