// Gyeaman Squads: game data. All numbers are balance knobs.

// Sprite sheets: assets/sq/<id>_0 (idle) _1 (attack) _2 (ultimate). flip = pose drawn mirrored so heroes face right, monsters left.
export const RARITY = {
  R:   { name: 'Rare',      color: '#6fb6ff', stars: 1, shards: 5 },
  SR:  { name: 'Epic',      color: '#c58bff', stars: 2, shards: 10 },
  SSR: { name: 'Legendary', color: '#e3b448', stars: 3, shards: 20 },
};

// 1v1 duels. kit = [basic, skill 1, skill 2, ultimate]; cd = cooldowns of the two skills in own turns; ultimate needs 100 energy.
// spd = speed: the turn meter fills at this rate, so a much faster fighter sometimes acts twice in a row.
// role is standard Twi spelling; kr is the same word in Kɔradin spelling (vowel inserted in CrV clusters), used only with the Kɔradin font.
// Locked archetypes: base speed is fixed by class, never by the individual hero.
export const CLASSES = {
  guardian: { name: 'Guardian', spd: 90,  desc: 'Holds the line. Slowest, toughest.' },
  warrior:  { name: 'Warrior',  spd: 100, desc: 'Steady melee damage.' },
  sage:     { name: 'Sage',     spd: 102, desc: 'Heals, cleanses and burns with spirit power.' },
  hunter:   { name: 'Hunter',   spd: 106, desc: 'Strikes from reach.' },
  shadow:   { name: 'Shadow',   spd: 116, desc: 'Fastest class. Acts often, breaks easily.' },
};
// Growth: one point per level. Speed points cost 2 and cap at SPD_CAP points.
export const GROWTH = { hp: 0.05, atk: 0.05, mag: 0.05, tec: 0.05, spd: 2, spdCost: 2, spdCap: 5 };
export const HEROES = {
  blay:     { name: 'Blay',     role: 'Asafo',        kr: 'asafo',        en: 'Sword fighter', rarity: 'R',   size: 1.28, hp: 1100, atk: 66, mag: 40, tec: 14, def: 26, cls: 'warrior', spd: 100, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Slash', 'Twin Cut', 'Parry', 'Gyawu Atiko'], notes: ['One afena cut.', 'Two cuts and the enemy\'s defence drops for 2 turns.', 'Guard: the next hit is halved and Blay strikes back.', 'Valour of Gyawu: a huge cut. Kills outright below 30% health.'], sym: 'gyawuAtiko' },
  owureku:  { name: 'Owureku',  role: 'Ɔbrafo',       kr: 'ɔberafo',      en: 'Twin-axe bruiser', rarity: 'R', size: 0.94, hp: 1080, atk: 60, mag: 30, tec: 12, def: 30, cls: 'warrior', spd: 100, cd: [3, 3], flip: [0, 0, 0],
    kit: ['Axe Chop', 'Axe Toss', 'War Cry', 'Ese Ne Tekrema'], notes: ['Heavy axe chop.', 'Hurls an axe: damage and a 1-turn stun that cancels a charged attack.', 'Hits 30% harder for 3 turns and heals 10%.', 'Teeth and tongue: three heavy blows in a row.'], sym: 'eseNeTekrema' },
  gyakari:  { name: 'Gyakari',  role: 'Banbɔfo',      kr: 'banbɔfo',      en: 'Shield tank', rarity: 'R',     size: 1.14, hp: 940, atk: 42, mag: 42, tec: 10, def: 32, cls: 'guardian', spd: 84, cd: [3, 3], flip: [0, 0, 0],
    kit: ['Spear Jab', 'Shield Bash', 'Brace', 'Eban'], notes: ['Spear jab.', 'Bash: damage and a 1-turn stun that cancels a charged attack.', 'Raises his shield: absorbs 30% of his health for 2 turns.', 'The fence: a huge shield, then a counter-thrust that grows with the shield.'], sym: 'eban' },
  obiri:    { name: 'Obiri',    role: 'Toprefo',      kr: 'toperefo',     en: 'Marksman', rarity: 'SR',       size: 1.0,  hp: 840, atk: 68, mag: 46, tec: 22, def: 20, cls: 'hunter', spd: 108, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Arrow', 'Pinning Shot', 'Steady Aim', 'Hwemudua'], notes: ['An arrow.', 'Pins the enemy: damage and slowed for 2 turns.', 'The next attack is a critical hit that ignores defence.', 'The measuring stick: one exact shot for massive damage. Always critical.'], sym: 'hwemuDua' },
  kuukua:   { name: 'Kuukua',   role: 'Asafo',        kr: 'asafo',        en: 'Spear lancer', rarity: 'SR',   size: 1.08, hp: 1000, atk: 66, mag: 40, tec: 22, def: 28, cls: 'hunter', spd: 108, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Thrust', 'Pierce', 'Sweep', 'Epa'], notes: ['Spear thrust.', 'Pierces armour: lowers defence for 2 turns.', 'Sweeps the legs: the enemy loses 40% of its turn meter.', 'No one escapes justice: a rain of spears, double damage on a slowed or weakened enemy.'], sym: 'epa' },
  kome:     { name: 'Kome',     role: 'Ɔkɔmfo',       kr: 'ɔkɔmfo',       en: 'Spirit priestess', rarity: 'SR', size: 0.92, hp: 800, atk: 40, mag: 80, tec: 10, def: 16, cls: 'sage', spd: 104, cd: [3, 2], flip: [0, 0, 0],
    kit: ['Spirit Bolt', 'Nyame Dua', 'Spirit Fire', 'Hye Won Hye'], notes: ['Fire bolt.', 'Heals 22% and clears stun and burn.', 'Sets the enemy burning for 3 turns.', 'That which does not burn: heals 20% and a blast that doubles on a burning enemy.'], sym: 'hyeWonhye', sym2: 'nyameDua' },
  afrakoma: { name: 'Afrakoma', role: 'Ɔbrafo',       kr: 'ɔberafo',      en: 'Axe berserker', rarity: 'SSR', size: 0.88,  hp: 1020, atk: 74, mag: 30, tec: 10, def: 24, cls: 'warrior', spd: 100, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Cleave', 'Bloodletting', 'Fury', 'Dwannimmen'], notes: ['Big cleave.', 'A cleave that heals for half the damage.', 'Hits 40% harder for 3 turns but costs 10% health.', 'Ram\'s horns: a crushing cleave that heals for half the damage.'], sym: 'dwannimen' },
  dufie:    { name: 'Dufie',    role: 'Anadwo Sekan', kr: 'anadwo sekan', en: 'Night blade', rarity: 'SSR',   size: 0.98, hp: 1000, atk: 62, mag: 50, tec: 34, def: 26, cls: 'shadow', spd: 124, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Night Cut', 'Shadow Step', 'Vanish', 'Nkyinkyim'], notes: ['Quick cut.', 'A certain critical strike, then Dufie moves 50% up the turn order.', 'Dodges the next attack completely.', 'The twisting path: six cuts in a row.'], sym: 'nkyimkyim' },
  sekan:    { name: 'Bediako', role: 'Ɔkofoɔ', kr: 'ɔkofoɔ',      en: 'Kickboxer', rarity: 'SR',      size: 1.0,  hp: 860, atk: 54, mag: 32, tec: 26, def: 20, cls: 'shadow', spd: 116, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Jab Cross Kick', 'Spinning Back Kick', 'Flying Knee', 'Fawohodie'], notes: ['A jab, a cross and a high kick.', 'A spinning heel: damage and the enemy loses 30% of its turn meter.', 'A leaping knee: damage and a 1-turn stun that cancels a charged attack.', 'Freedom: a storm of punches and kicks ending in a falling heel that stuns.'], sym: 'fawohodie' },
  bayi:     { name: 'Agyekum', role: 'Bayibɔnsam', kr: 'bayibɔnsam',    en: 'Life drainer', rarity: 'SSR',  size: 1.04, hp: 860, atk: 46, mag: 64, tec: 16, def: 22, cls: 'sage', spd: 106, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Claw', 'Siphon', 'Hollow Pact', 'Ohene Adwa'], notes: ['A hooked claw cut that heals a little.', 'Drains the enemy: damage, and heals for all of it.', 'Steals 35% of the enemy\'s turn meter.', 'The king\'s stool: drains a huge chunk of health and heals for all of it.'], sym: 'oheneAdwa' },
};
// ultimate damage type per hero
export const ULT_DMG = { kome: 'mag', bayi: 'mag', dufie: 'mix', obiri: 'phys', kuukua: 'phys', blay: 'phys', owureku: 'phys', gyakari: 'phys', afrakoma: 'phys', sekan: 'phys' };
// Arena: CPU hero teams fought 3 v 3 as a tag battle (one duel at a time, the next fighter steps in on a KO). PvP prototype.
export const ARENA = [
  { name: 'Asafo Patrol', lvl: 3, stars: 1, sk: 1, heroes: ['blay', 'gyakari', 'kome'], region: 0 },
  { name: 'Night Court', lvl: 6, stars: 2, sk: 2, heroes: ['dufie', 'bayi', 'sekan'], region: 1 },
  { name: 'Hunters of Bono', lvl: 9, stars: 2, sk: 2, heroes: ['obiri', 'kuukua', 'afrakoma'], region: 2 },
  { name: 'Iron Brothers', lvl: 12, stars: 3, sk: 3, heroes: ['owureku', 'gyakari', 'afrakoma'], region: 3 },
  { name: 'Spirit Circle', lvl: 15, stars: 3, sk: 4, heroes: ['kome', 'bayi', 'obiri'], region: 1 },
  { name: 'Ahenfo Guard', lvl: 20, stars: 4, sk: 5, heroes: ['blay', 'dufie', 'sekan'], region: 0 },
];
// measured per use at spell level 1: [total damage multiplier, hits, note]; feeds the damage breakdown shown to players
export const MOVE_DMG = {"blay":{"blay1":[1.6,2],"ult":[3,5,"Kills outright below 30% health (20% against heroes)"],"basic":[1,1],"blayRush":[1.4,3]},"gyakari":{"gyakari1":[0.9,1],"basic":[1,1],"ult":[4.13,3,"The final thrust grows with his shield"],"gyaSweep":[0.9,2]},"owureku":{"owureku1":[1.1,1],"basic":[1,1],"ult":[3.45,4,"Last hit is the heaviest"],"owuRend":[1.2,1]},"kome":{"kome2":[0.7,1],"basic":[1,2],"ult":[1.7,2,"Doubles on a burning enemy"],"komeHex":[0.9,1]},"obiri":{"obiri1":[1,1],"ult":[3.35,9],"basic":[1,1],"obiVolley":[1.35,3],"obiKnee":[0.9,1]},"kuukua":{"kuukua1":[1.42,7],"kuukua2":[1.1,2],"ult":[2.4,12,"x1.5 on a slowed or weakened enemy"],"basic":[1.01,4],"kuuThrow":[1.3,1]},"afrakoma":{"afrakoma1":[1.25,1],"ult":[3,3],"afrWhirl":[1.6,4],"basic":[1,1]},"dufie":{"dufie1":[1.4,1],"basic":[1,2],"ult":[2.3,7],"dufKick":[1,2],"dufStars":[1.3,5]},"sekan":{"sekan1":[1.15,1],"sekan2":[1,1],"basic":[1.15,3],"ult":[3.14,8],"sekRush":[1.35,3]},"bayi":{"bayi1":[1,1],"bayi2":[0.4,1],"basic":[1,2],"ult":[2.8,5],"bayMist":[0.6,1],"bayCurse":[0.5,1]}};
export const STARTERS = Object.keys(HEROES); // beta: every hero unlocked while spells and animations are built
export const SKILL_MAX = 10;
export const skillCost = (lvl) => Math.round(120 * Math.pow(lvl, 1.6));
export const xpNeed = (l) => 60 + l * 45;
export const STAR_SHARDS = [0, 0, 10, 20, 40, 80]; // shards needed to reach star n

// Monsters: ult = 'heal' | 'aoe' | 'smash' (needs 100 energy, +34 per turn). on = basic-attack side effect.
export const MONS = {
  mmoatia:    { name: 'Mmoatia',   size: 0.66, hp: 260, atk: 26, def: 10, spd: 104, range: 0, flip: [1, 1, 1] },
  kakai:      { name: 'Kakai',      size: 0.92, hp: 230, atk: 30, def: 10, spd: 96, range: 1, shot: 'thorn', on: 'defDown', flip: [1, 1, 1] },
  asanbosam:  { name: 'Asanbosam',  size: 1.12, hp: 420, atk: 40, def: 20, spd: 88, range: 0, on: 'drain', flip: [0, 0, 0] },
  bayie:      { name: 'Bayie',      size: 1.0,  hp: 300, atk: 42, def: 12, spd: 94, range: 1, shot: 'hex', ult: 'aoe', flip: [0, 0, 0] },
  saman:      { name: 'Saman',      size: 1.02, hp: 340, atk: 22, def: 16, spd: 86, range: 1, shot: 'hex', ult: 'heal', flip: [0, 0, 0] },
  sasabonsam: { name: 'Sasabonsam', size: 1.32, hp: 620, atk: 52, def: 28, spd: 90, range: 0, ult: 'smash', flip: [1, 1, 1] },
  sika:       { name: 'Sika Kwaku', size: 0.6,  hp: 300, atk: 12, def: 30, spd: 70, range: 0, gold: 1, flip: [1, 1, 1] },
  mmoatiaHene:{ name: 'Mmoatia Hene', size: 1.2, hp: 1500, atk: 48, def: 26, spd: 92, range: 0, boss: 1, ult: 'smash', flip: [1, 0, 0] },
  bayieQueen: { name: 'Bayie Ɔhemmaa', size: 1.3, hp: 2000, atk: 60, def: 24, spd: 96, range: 1, shot: 'hex', boss: 1, ult: 'aoe', flip: [1, 1, 1] },
  sasaKing:   { name: 'Sasabonsam Elder', size: 1.55, hp: 2800, atk: 70, def: 34, spd: 90, range: 0, boss: 1, ult: 'smash', flip: [1, 1, 1] },
  abonsam:    { name: 'Abonsam', size: 1.6, hp: 3800, atk: 80, def: 38, spd: 96, range: 1, shot: 'hex', boss: 1, ult: 'aoe', flip: [1, 1, 1] },
};

export const DIFF = [
  { id: 'easy', name: 'Easy', mult: 0.72, gold: 0.7, color: '#7ee08a' },
  { id: 'normal', name: 'Normal', mult: 1, gold: 1, color: '#f08a24' },
  { id: 'hard', name: 'Hard', mult: 1.55, gold: 1.8, color: '#d23b31' },
];

// Regions of chapter 1 (Akan). Stage x,y are fractions of the map image.
// ground = top and bottom of the walkable floor in the background image (fractions of its height)
export const REGIONS = {
  forest: { name: 'Mmoatia Forest', bg: 'forest', ground: [.8, .97] },
  marsh:  { name: 'Bayie Marsh',    bg: 'marsh', ground: [.71, .86] },
  grove:  { name: 'Sasabonsam Grove', bg: 'grove', ground: [.8, .97] },
  gate:   { name: 'Abonsam Gate',   bg: 'gate', ground: [.77, .97] },
};
const S = (region, name, x, y, lvl, waves, boss) => ({ region, name, x, y, lvl, waves, boss: !!boss });
export const STAGES = [
  S('forest', 'Village edge', .2, .9, 1, [['mmoatia', 'mmoatia']]),
  S('forest', 'Dwarf trail', .33, .82, 2, [['mmoatia', 'mmoatia', 'mmoatia']]),
  S('forest', 'Thorn hedge', .26, .72, 3, [['mmoatia', 'kakai', 'mmoatia']]),
  S('forest', 'Gold glint', .14, .64, 4, [['kakai', 'sika', 'mmoatia'], ['mmoatia', 'kakai', 'mmoatia']]),
  S('forest', 'Mushroom huts', .32, .17, 5, [['mmoatia', 'kakai', 'kakai'], ['mmoatia', 'mmoatia', 'kakai', 'kakai']]),
  S('forest', 'War chief', .2, .08, 6, [['mmoatia', 'kakai', 'mmoatia'], ['kakai', 'mmoatiaHene', 'mmoatia']], 1),
  S('marsh', 'Fog bank', .14, .38, 7, [['bayie', 'mmoatia', 'kakai']]),
  S('marsh', 'Owl roost', .3, .45, 8, [['bayie', 'bayie', 'mmoatia'], ['saman', 'kakai', 'bayie']]),
  S('marsh', 'Black water', .18, .52, 9, [['saman', 'asanbosam', 'bayie']]),
  S('marsh', 'Hook trees', .38, .56, 10, [['asanbosam', 'asanbosam', 'saman'], ['bayie', 'asanbosam', 'kakai']]),
  S('marsh', 'Cowrie lights', .26, .6, 11, [['sika', 'bayie', 'saman', 'kakai']]),
  S('marsh', 'Witch matriarch', .12, .47, 12, [['saman', 'bayie', 'asanbosam'], ['saman', 'bayieQueen', 'bayie']], 1),
  S('grove', 'Grove gate', .55, .45, 13, [['asanbosam', 'sasabonsam', 'kakai']]),
  S('grove', 'Silk-cotton roots', .68, .52, 14, [['sasabonsam', 'bayie', 'saman'], ['asanbosam', 'sasabonsam', 'kakai']]),
  S('grove', 'Nest canopy', .8, .38, 15, [['sasabonsam', 'sasabonsam', 'bayie']]),
  S('grove', 'The elder', .66, .3, 16, [['sasabonsam', 'saman', 'asanbosam'], ['sasabonsam', 'sasaKing', 'saman']], 1),
  S('gate', 'Ember road', .6, .66, 17, [['asanbosam', 'sasabonsam', 'bayie', 'saman']]),
  S('gate', 'Chain field', .74, .72, 18, [['sasabonsam', 'bayie', 'kakai', 'saman'], ['asanbosam', 'sasabonsam', 'bayie']]),
  S('gate', 'Twin queens', .86, .8, 19, [['bayieQueen', 'saman'], ['sasaKing', 'bayie']]),
  S('gate', 'Abonsam Gate', .78, .9, 20, [['sasabonsam', 'bayie', 'asanbosam', 'saman'], ['bayieQueen', 'sasaKing'], ['saman', 'abonsam', 'bayie']], 1),
];

// Stage strength multipliers, tuned with the headless turn-based sim. A player who clears each stage once
// (levels from that XP, a few skill upgrades, 1-2 summoned heroes) wins normal stages when using skills;
// Auto (basics + ultimates only) can lose from stage 1, and bosses need skills, stuns and heals.
export const STAGE_POW = [2.15, 1.26, 1.1, 1.13, 1.06, 0.56, 0.85, 0.67, 0.77, 0.76, 0.68, 0.59, 0.7, 0.69, 0.58, 0.46, 0.5, 0.55, 0.53, 0.41];
STAGES.forEach((t, i) => { t.pow = STAGE_POW[i]; });

export const LOCKED_CHAPTERS = ['Yoruba', 'Edo', 'Igbo', 'Haitian', 'Japan'];

// Gacha (beta: currency is earned in play only, nothing is sold)
export const PULL_COST = 100, PULL10_COST = 900, PITY = 40;
export const PULL_RATES = [['SSR', 0.04], ['SR', 0.18], ['R', 0.38], ['gold', 0.4]];

// ---------- spells: every hero owns a pool and equips two (basic and ultimate are fixed) ----------
// Legacy spells keep their hand-written battle code (key = hero id + slot). New ones are data-driven:
// t melee|ranged|self · mult per hit · hits · crit · foe/self [[status, turns]] · tmSelf/tmFoe turn meter · heal/shield fraction of max HP · atkUp multiplier · proj projectile kind
const L = (hero, i, cd) => ({ hero, legacy: hero + i, name: HEROES[hero].kit[i], note: HEROES[hero].notes[i], cd });
export const SPELLS = {
  blay1: L('blay', 1, 2), blay2: L('blay', 2, 3),
  blayRush: { hero: 'blay', name: 'Asafo Rush', note: 'A charging cut, then Blay moves 30% up the turn order.', cd: 3, t: 'melee', mult: 1.4, tmSelf: .3, kind: 'melee' },
  blayRally: { hero: 'blay', name: 'Rally', note: 'Clears stun and burn; hits 25% harder for 2 turns.', cd: 4, t: 'self', atkUp: 1.25, turns: 2, cleanse: 1, kind: 'buff' },
  owureku1: L('owureku', 1, 3), owureku2: L('owureku', 2, 3),
  owuRend: { hero: 'owureku', name: 'Rending Chop', note: 'A splitting chop: defence down for 2 turns.', cd: 2, t: 'melee', mult: 1.2, foe: [['defDown', 2]], kind: 'melee' },
  owuHide: { hero: 'owureku', name: 'Iron Hide', note: 'A shield worth 25% of his health for 2 turns.', cd: 4, t: 'self', shield: .25, turns: 2, kind: 'shield' },
  gyakari1: L('gyakari', 1, 3), gyakari2: L('gyakari', 2, 3),
  gyaSweep: { hero: 'gyakari', name: 'Spear Sweep', note: 'Sweeps the legs: slowed for 2 turns and 25% turn meter lost.', cd: 3, t: 'melee', mult: .9, foe: [['slow', 2]], tmFoe: .25, kind: 'melee' },
  gyaFirm: { hero: 'gyakari', name: 'Stand Firm', note: 'Heals 15% and guards: the next hit is halved.', cd: 4, t: 'self', heal: .15, guard: 1, kind: 'heal' },
  obiri1: L('obiri', 1, 2), obiri2: L('obiri', 2, 3),
  obiVolley: { hero: 'obiri', name: 'Volley', note: 'Three quick arrows.', cd: 2, t: 'ranged', mult: .45, hits: 3, proj: 'arrow', kind: 'ranged' },
  obiKnee: { hero: 'obiri', name: 'Knee Shot', note: 'A crippling shot: 1-turn stun that cancels a charged attack.', cd: 4, t: 'ranged', mult: .9, foe: [['stun', 1]], proj: 'arrow', kind: 'ranged' },
  kuukua1: L('kuukua', 1, 2), kuukua2: L('kuukua', 2, 3),
  kuuThrow: { hero: 'kuukua', name: 'Spear Throw', note: 'Hurls her spear: a certain critical hit.', cd: 3, t: 'ranged', mult: 1.3, crit: 1, proj: 'spear', kind: 'ranged' },
  kuuWall: { hero: 'kuukua', name: 'Lance Wall', note: 'Guards the next hit and hits 20% harder for 2 turns.', cd: 4, t: 'self', guard: 1, atkUp: 1.2, turns: 2, kind: 'buff' },
  kome1: L('kome', 1, 3), kome2: L('kome', 2, 2),
  komeVeil: { hero: 'kome', name: 'Spirit Veil', note: 'A shield worth 20% of her health; clears stun and burn.', cd: 3, t: 'self', shield: .2, turns: 2, cleanse: 1, kind: 'shield' },
  komeHex: { hero: 'kome', name: 'Hex Bolt', note: 'A cursed bolt: defence down for 2 turns.', cd: 2, t: 'ranged', mult: .9, foe: [['defDown', 2]], proj: 'hex', kind: 'ranged' },
  afrakoma1: L('afrakoma', 1, 2), afrakoma2: L('afrakoma', 2, 3),
  afrWhirl: { hero: 'afrakoma', name: 'Whirlwind', note: 'Three spinning axe cuts.', cd: 3, t: 'melee', mult: .5, hits: 3, kind: 'melee' },
  afrOath: { hero: 'afrakoma', name: 'Blood Oath', note: 'Heals 20% and hits 20% harder for 2 turns.', cd: 4, t: 'self', heal: .2, atkUp: 1.2, turns: 2, kind: 'heal' },
  sekan1: L('sekan', 1, 2), sekan2: L('sekan', 2, 3),
  sekRush: { hero: 'sekan', name: 'Night Rush', note: 'Three fast strikes, then he moves 30% up the turn order.', cd: 3, t: 'melee', mult: .45, hits: 3, tmSelf: .3, kind: 'melee' },
  sekGuard: { hero: 'sekan', name: 'Breath Guard', note: 'Heals 12% and guards: the next hit is halved.', cd: 4, t: 'self', heal: .12, guard: 1, kind: 'heal' },
  bayi1: L('bayi', 1, 3), bayi2: L('bayi', 2, 3),
  bayMist: { hero: 'bayi', name: 'Blood Mist', note: 'A blood mist: burns for 3 turns and heals 8%.', cd: 3, t: 'ranged', mult: .6, heal: .08, proj: 'hex', kind: 'ranged' },
  bayCurse: { hero: 'bayi', name: 'Red Curse', note: 'Defence down for 2 turns, and he hits 20% harder for 2 turns.', cd: 4, t: 'ranged', mult: .5, foe: [['defDown', 2]], atkUp: 1.2, turns: 2, kind: 'ranged' },
  dufie1: L('dufie', 1, 2), dufie2: L('dufie', 2, 3),
  dufKick: { hero: 'dufie', name: 'Crescent Kick', note: 'A spinning kick and a falling heel: 1-turn stun that cancels a charged attack.', cd: 3, t: 'melee', mult: 1.0, foe: [['stun', 1]], kind: 'melee' },
  dufStars: { hero: 'dufie', name: 'Star Daggers', note: 'Five thrown knives: defence down for 2 turns.', cd: 2, t: 'ranged', mult: .26, hits: 5, foe: [['defDown', 2]], proj: 'dagger', kind: 'ranged' },
};
const MAGIC = ['kome1', 'kome2', 'komeHex', 'komeVeil', 'bayi1', 'bayi2', 'bayMist', 'bayCurse'], MIXED = ['dufie2', 'dufStars', 'obiri2', 'gyaFirm', 'afrOath', 'kuuWall'];
for (const [id, s] of Object.entries(SPELLS)) { s.dmg = MAGIC.includes(id) ? 'mag' : MIXED.includes(id) ? 'mix' : 'phys'; s.id = id; (HEROES[s.hero].pool ||= []).push(id); }
