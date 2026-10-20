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
export const HEROES = {
  blay:     { name: 'Blay',     role: 'Asafo',        kr: 'asafo',        en: 'Sword fighter', rarity: 'R',   size: 1.06, hp: 1050, atk: 66, def: 26, spd: 100, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Slash', 'Twin Cut', 'Parry', 'Gyawu Atiko'], notes: ['One afena cut.', 'Two cuts and the enemy\'s defence drops for 2 turns.', 'Guard: the next hit is halved and Blay strikes back.', 'Valour of Gyawu: a huge cut. Kills outright below 30% health.'], sym: 'gyawuAtiko' },
  owureku:  { name: 'Owureku',  role: 'Ɔbrafo',       kr: 'ɔberafo',      en: 'Twin-axe bruiser', rarity: 'R', size: 0.94, hp: 1080, atk: 60, def: 30, spd: 92, cd: [3, 3], flip: [0, 0, 0],
    kit: ['Axe Chop', 'Axe Toss', 'War Cry', 'Ese Ne Tekrema'], notes: ['Heavy axe chop.', 'Hurls an axe: damage and a 1-turn stun that cancels a charged attack.', 'Hits 30% harder for 3 turns and heals 10%.', 'Teeth and tongue: three heavy blows in a row.'], sym: 'eseNeTekrema' },
  gyakari:  { name: 'Gyakari',  role: 'Banbɔfo',      kr: 'banbɔfo',      en: 'Shield tank', rarity: 'R',     size: 1.14, hp: 1250, atk: 42, def: 46, spd: 84, cd: [3, 3], flip: [0, 0, 0],
    kit: ['Spear Jab', 'Shield Bash', 'Brace', 'Eban'], notes: ['Spear jab.', 'Bash: damage and a 1-turn stun that cancels a charged attack.', 'Raises his shield: absorbs 30% of his health for 2 turns.', 'The fence: a huge shield, then a counter-thrust that grows with the shield.'], sym: 'eban' },
  obiri:    { name: 'Obiri',    role: 'Toprefo',      kr: 'toperefo',     en: 'Marksman', rarity: 'SR',       size: 1.0,  hp: 760, atk: 70, def: 16, spd: 112, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Arrow', 'Pinning Shot', 'Steady Aim', 'Hwemudua'], notes: ['An arrow.', 'Pins the enemy: damage and slowed for 2 turns.', 'The next attack is a critical hit that ignores defence.', 'The measuring stick: one exact shot for massive damage. Always critical.'], sym: 'hwemuDua' },
  kuukua:   { name: 'Kuukua',   role: 'Asafo',        kr: 'asafo',        en: 'Spear lancer', rarity: 'SR',   size: 1.08, hp: 820, atk: 64, def: 20, spd: 104, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Thrust', 'Pierce', 'Sweep', 'Epa'], notes: ['Spear thrust.', 'Pierces armour: lowers defence for 2 turns.', 'Sweeps the legs: the enemy loses 40% of its turn meter.', 'No one escapes justice: a rain of spears, double damage on a slowed or weakened enemy.'], sym: 'epa' },
  kome:     { name: 'Kome',     role: 'Ɔkɔmfo',       kr: 'ɔkɔmfo',       en: 'Spirit priestess', rarity: 'SR', size: 0.92, hp: 760, atk: 52, def: 16, spd: 108, cd: [3, 2], flip: [0, 0, 0],
    kit: ['Spirit Bolt', 'Nyame Dua', 'Spirit Fire', 'Hye Won Hye'], notes: ['Fire bolt.', 'Heals 22% and clears stun and burn.', 'Sets the enemy burning for 3 turns.', 'That which does not burn: heals 20% and a blast that doubles on a burning enemy.'], sym: 'hyeWonhye', sym2: 'nyameDua' },
  afrakoma: { name: 'Afrakoma', role: 'Ɔbrafo',       kr: 'ɔberafo',      en: 'Axe berserker', rarity: 'SSR', size: 1.0,  hp: 980, atk: 72, def: 24, spd: 98, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Cleave', 'Bloodletting', 'Fury', 'Dwannimmen'], notes: ['Big cleave.', 'A cleave that heals for half the damage.', 'Hits 40% harder for 3 turns but costs 10% health.', 'Ram\'s horns: a crushing cleave that heals for half the damage.'], sym: 'dwannimen' },
  dufie:    { name: 'Dufie',    role: 'Anadwo Sekan', kr: 'anadwo sekan', en: 'Night blade', rarity: 'SSR',   size: 0.98, hp: 800, atk: 74, def: 18, spd: 128, cd: [2, 3], flip: [0, 0, 0],
    kit: ['Night Cut', 'Shadow Step', 'Vanish', 'Nkyinkyim'], notes: ['Quick cut.', 'A certain critical strike, then Dufie moves 50% up the turn order.', 'Dodges the next attack completely.', 'The twisting path: six cuts in a row.'], sym: 'nkyimkyim' },
};
export const STARTERS = ['blay', 'gyakari', 'kome', 'dufie']; // beta: Dufie (animated) is free
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
