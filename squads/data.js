// Gyeaman Squads: game data. All numbers are balance knobs.

// Sprite sheets: assets/sq/<id>_0 (idle) _1 (attack) _2 (ultimate). flip = pose drawn mirrored so heroes face right, monsters left.
export const RARITY = {
  R:   { name: 'Rare',      color: '#6fb6ff', stars: 1, shards: 5 },
  SR:  { name: 'Epic',      color: '#c58bff', stars: 2, shards: 10 },
  SSR: { name: 'Legendary', color: '#e3b448', stars: 3, shards: 20 },
};

// row 0 = front line, 1 = back line. size = height relative to an average adult.
export const HEROES = {
  blay:     { name: 'Blay',     role: 'Asafo',        en: 'Sword fighter', rarity: 'R',   row: 0, size: 1.06, hp: 400, atk: 46, def: 22, spd: 1.0,  range: 0, flip: [0, 0, 0],
    kit: ['Slash', 'Twin Cut', 'Gyawu Atiko'], notes: ['Single sword cut.', 'Every 6s: two quick cuts on the target.', 'Valour of Gyawu: a huge cut through the three nearest enemies.'], sym: 'gyawuAtiko' },
  owureku:  { name: 'Owureku',  role: 'Ɔbrafo',       en: 'Twin-axe bruiser', rarity: 'R', row: 0, size: 0.94, hp: 460, atk: 42, def: 28, spd: 1.1, range: 0, flip: [0, 0, 0],
    kit: ['Axe Chop', 'Axe Toss', 'Ese Ne Tekrema'], notes: ['Heavy axe chop.', 'Every 7s: hurls an axe at a back-row enemy.', 'Teeth and tongue: three heavy blows, then the squad hits 20% harder for 6s.'], sym: 'eseNeTekrema' },
  gyakari:  { name: 'Gyakari',  role: 'Banbɔfo',      en: 'Shield tank', rarity: 'R',     row: 0, size: 1.14, hp: 560, atk: 28, def: 42, spd: 1.25, range: 0, flip: [0, 0, 0],
    kit: ['Spear Jab', 'Shield Bash', 'Eban'], notes: ['Spear jab.', 'Every 8s: bashes the target, stunning it for 1.5s.', 'The fence: taunts every enemy for 5s and shields the squad.'], sym: 'eban' },
  obiri:    { name: 'Obiri',    role: 'Toprefo',      en: 'Marksman', rarity: 'SR',       row: 1, size: 1.0,  hp: 300, atk: 52, def: 14, spd: 0.85, range: 1, flip: [0, 0, 0],
    kit: ['Arrow', 'Volley', 'Hwemudua'], notes: ['Arrow at any enemy.', 'Every 7s: three arrows on random enemies.', 'The measuring stick: one exact shot on the weakest enemy for massive damage.'], sym: 'hwemuDua' },
  kuukua:   { name: 'Kuukua',   role: 'Asafo',        en: 'Spear lancer', rarity: 'SR',   row: 1, size: 1.08, hp: 340, atk: 48, def: 18, spd: 1.0,  range: 1, flip: [0, 0, 0],
    kit: ['Thrust', 'Pierce', 'Epa'], notes: ['Long spear thrust that reaches the back.', 'Every 7s: pierces the two nearest enemies.', 'No one escapes justice: spears fall on every enemy.'], sym: 'epa' },
  kome:     { name: 'Kome',     role: 'Ɔkɔmfo',       en: 'Spirit priestess', rarity: 'SR', row: 1, size: 0.92, hp: 290, atk: 34, def: 14, spd: 1.1, range: 1, flip: [0, 0, 0],
    kit: ['Spirit Bolt', 'Nyame Dua', 'Hye Won Hye'], notes: ['Fire bolt.', 'Every 6s: heals the weakest ally for 25% of their health.', 'That which does not burn: heals the squad for 30% and burns every enemy.'], sym: 'hyeWonhye', sym2: 'nyameDua' },
  afrakoma: { name: 'Afrakoma', role: 'Ɔbrafo',       en: 'Axe berserker', rarity: 'SSR', row: 0, size: 1.0,  hp: 440, atk: 52, def: 24, spd: 1.05, range: 0, flip: [0, 0, 1],
    kit: ['Cleave', 'Wide Cleave', 'Dwannimmen'], notes: ['Big axe cleave.', 'Every 7s: cleaves the two nearest enemies.', 'Ram\'s horns: cleaves every enemy and heals for half the damage.'], sym: 'dwannimen' },
  dufie:    { name: 'Dufie',    role: 'Anadwo Sekan', en: 'Night blade', rarity: 'SSR',   row: 1, size: 0.98, hp: 320, atk: 56, def: 16, spd: 0.7,  range: 0, dive: 1, flip: [0, 0, 0],
    kit: ['Night Cut', 'Shadow Step', 'Nkyinkyim'], notes: ['Hunts the weakest enemy.', 'Every 6s: a guaranteed critical strike.', 'The twisting path: six slashes across random enemies.'], sym: 'nkyinkyim' },
};
export const STARTERS = ['blay', 'gyakari', 'kome'];
export const SKILL_MAX = 10;
export const skillCost = (lvl) => Math.round(120 * Math.pow(lvl, 1.6));
export const xpNeed = (l) => 60 + l * 45;
export const STAR_SHARDS = [0, 0, 10, 20, 40, 80]; // shards needed to reach star n

export const MONS = {
  mmoatia:    { name: 'Mmoatia',    size: 0.66, hp: 260, atk: 26, def: 10, spd: 1.0, range: 0, flip: [1, 1, 1] },
  kakai:      { name: 'Kakai',      size: 0.92, hp: 230, atk: 30, def: 10, spd: 1.1, range: 1, shot: 'thorn', flip: [1, 1, 1] },
  asanbosam:  { name: 'Asanbosam',  size: 1.12, hp: 420, atk: 40, def: 20, spd: 1.2, range: 0, flip: [0, 1, 0] },
  bayie:      { name: 'Bayie',      size: 1.0,  hp: 300, atk: 42, def: 12, spd: 1.3, range: 1, shot: 'hex', ult: 'aoe', flip: [0, 0, 0] },
  saman:      { name: 'Saman',      size: 1.02, hp: 340, atk: 22, def: 16, spd: 1.4, range: 1, shot: 'hex', ult: 'heal', flip: [0, 0, 0] },
  sasabonsam: { name: 'Sasabonsam', size: 1.32, hp: 620, atk: 52, def: 28, spd: 1.3, range: 0, ult: 'smash', flip: [1, 1, 1] },
  sika:       { name: 'Sika Kwaku', size: 0.6,  hp: 300, atk: 12, def: 30, spd: 1.6, range: 0, gold: 1, flip: [1, 1, 1] },
  mmoatiaHene:{ name: 'Mmoatia Hene', size: 1.2, hp: 1500, atk: 48, def: 26, spd: 1.2, range: 0, boss: 1, ult: 'smash', flip: [1, 0, 0] },
  bayieQueen: { name: 'Bayie Ɔhemmaa', size: 1.3, hp: 2000, atk: 60, def: 24, spd: 1.2, range: 1, shot: 'hex', boss: 1, ult: 'aoe', flip: [0, 1, 0] },
  sasaKing:   { name: 'Sasabonsam Elder', size: 1.55, hp: 2800, atk: 70, def: 34, spd: 1.3, range: 0, boss: 1, ult: 'smash', flip: [1, 1, 1] },
  abonsam:    { name: 'Abonsam', size: 1.6, hp: 3800, atk: 80, def: 38, spd: 1.2, range: 1, shot: 'hex', boss: 1, ult: 'aoe', flip: [1, 1, 0] },
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

// Stage strength multipliers, tuned with the headless sim so a player who clears each stage once
// (levels from that XP, a few skill upgrades, 1-2 summoned heroes) sits near an even fight from stage 4 on.
export const STAGE_POW = [1.79, 1.16, 1.29, 1.37, 1.39, 1.06, 1.53, 1.33, 1.49, 1.47, 1.37, 0.98, 1.24, 1.23, 1.02, 0.75, 0.93, 1.02, 0.86, 0.66];
STAGES.forEach((t, i) => { t.pow = STAGE_POW[i]; });

export const LOCKED_CHAPTERS = ['Yoruba', 'Edo', 'Igbo', 'Haitian', 'Japan'];

// Gacha (beta: currency is earned in play only, nothing is sold)
export const PULL_COST = 100, PULL10_COST = 900, PITY = 40;
export const PULL_RATES = [['SSR', 0.04], ['SR', 0.18], ['R', 0.38], ['gold', 0.4]];
