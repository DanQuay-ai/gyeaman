// Gyeaman Squads: game data. All numbers are balance knobs.

// Sprite sheets: assets/sq/<id>_0 (idle) _1 (attack) _2 (ultimate). flip = pose drawn mirrored so heroes face right, monsters left.
export const RARITY = {
  R:   { name: 'Rare',      color: '#6fb6ff', stars: 1, shards: 5 },
  SR:  { name: 'Epic',      color: '#c58bff', stars: 2, shards: 10 },
  SSR: { name: 'Legendary', color: '#e3b448', stars: 3, shards: 20 },
};

// row 0 = front line, 1 = back line. size = height relative to an average adult. spd = speed (turn order: higher acts sooner).
// kit = [basic, skill, ultimate]. cd = skill cooldown in own turns. Ultimates need 100 energy.
// role/kr: Twi role in Kɔradin-convention Latin spelling (CrV clusters take a vowel: Ɔbrafo -> Ɔberafo, Toprefo -> Toperefo).
export const HEROES = {
  blay:     { name: 'Blay',     role: 'Asafo',        en: 'Sword fighter', rarity: 'R',   row: 0, size: 1.06, hp: 420, atk: 46, def: 22, spd: 100, range: 0, cd: 2, flip: [0, 0, 0],
    kit: ['Slash', 'Twin Cut', 'Gyawu Atiko'], notes: ['One afena cut.', 'Two cuts on one enemy and lowers its defence for 2 turns.', 'Valour of Gyawu: a huge cut through the three front enemies, then Blay hits harder for 2 turns.'], sym: 'gyawuAtiko' },
  owureku:  { name: 'Owureku',  role: 'Ɔberafo',      en: 'Twin-axe bruiser', rarity: 'R', row: 0, size: 0.94, hp: 480, atk: 42, def: 28, spd: 92, range: 0, cd: 3, flip: [0, 0, 0],
    kit: ['Axe Chop', 'Axe Toss', 'Ese Ne Tekerema'], notes: ['Heavy axe chop.', 'Hurls an axe at a back-row enemy and stuns it for 1 turn.', 'Teeth and tongue: a heavy blow, then the whole squad hits harder for 2 turns and moves 25% up the turn order.'], sym: 'eseNeTekrema' },
  gyakari:  { name: 'Gyakari',  role: 'Banbɔfo',      en: 'Shield tank', rarity: 'R',     row: 0, size: 1.14, hp: 600, atk: 30, def: 44, spd: 84, range: 0, cd: 3, flip: [0, 0, 0],
    kit: ['Spear Jab', 'Shield Bash', 'Eban'], notes: ['Spear jab that taunts the target for 1 turn.', 'Bashes one enemy and stuns it for 1 turn.', 'The fence: shields the squad for 2 turns and taunts every enemy.'], sym: 'eban' },
  obiri:    { name: 'Obiri',    role: 'Toperefo',     en: 'Marksman', rarity: 'SR',       row: 1, size: 1.0,  hp: 320, atk: 54, def: 14, spd: 112, range: 1, cd: 3, flip: [0, 0, 0],
    kit: ['Arrow', 'Volley', 'Hwemuduia'], notes: ['An arrow at any enemy.', 'Arrows on every enemy.', 'The measuring stick: one exact shot on the weakest enemy. A kill refunds half the energy.'], sym: 'hwemuDua' },
  kuukua:   { name: 'Kuukua',   role: 'Asafo',        en: 'Spear lancer', rarity: 'SR',   row: 1, size: 1.08, hp: 360, atk: 48, def: 18, spd: 104, range: 1, cd: 2, flip: [0, 0, 0],
    kit: ['Thrust', 'Pierce', 'Epa'], notes: ['Spear thrust that reaches any enemy.', 'Pierces one enemy and slows it for 2 turns.', 'No one escapes justice: spears fall on every enemy and lower their defence for 2 turns.'], sym: 'epa' },
  kome:     { name: 'Kome',     role: 'Ɔkɔmfo',       en: 'Spirit priestess', rarity: 'SR', row: 1, size: 0.92, hp: 310, atk: 36, def: 14, spd: 108, range: 1, cd: 3, flip: [0, 0, 0],
    kit: ['Spirit Bolt', 'Nyame Duia', 'Hye Won Hye'], notes: ['Fire bolt that burns for 2 turns.', 'Heals the weakest ally for 35% and clears stun and burn.', 'That which does not burn: heals the squad for 25% and burns every enemy.'], sym: 'hyeWonhye', sym2: 'nyameDua' },
  afrakoma: { name: 'Afrakoma', role: 'Ɔberafo',      en: 'Axe berserker', rarity: 'SSR', row: 0, size: 1.0,  hp: 470, atk: 54, def: 24, spd: 98, range: 0, cd: 3, flip: [0, 0, 1],
    kit: ['Cleave', 'Wide Cleave', 'Dwannimmen'], notes: ['Big cleave that splashes the next enemy.', 'Cleaves the two front enemies and heals for half the damage.', 'Ram\'s horns: cleaves every enemy and heals for half the damage.'], sym: 'dwannimen' },
  dufie:    { name: 'Dufie',    role: 'Anadwo Sekan', en: 'Night blade', rarity: 'SSR',   row: 1, size: 0.98, hp: 340, atk: 58, def: 16, spd: 128, range: 0, dive: 1, cd: 2, flip: [0, 0, 0],
    kit: ['Night Cut', 'Shadow Step', 'Ɛnkyinkyim'], notes: ['Hunts the weakest enemy.', 'A certain critical strike, then Dufie moves 50% up the turn order.', 'The twisting path: six cuts across random enemies.'], sym: 'nkyimkyim' },
};
export const STARTERS = ['blay', 'gyakari', 'kome'];
export const SKILL_MAX = 10;
export const skillCost = (lvl) => Math.round(120 * Math.pow(lvl, 1.6));
export const xpNeed = (l) => 60 + l * 45;
export const STAR_SHARDS = [0, 0, 10, 20, 40, 80]; // shards needed to reach star n

// Monsters: ult = 'heal' | 'aoe' | 'smash' (needs 100 energy, +34 per turn). on = basic-attack side effect.
export const MONS = {
  mmoatia:    { name: 'Ɛmmoatia',   size: 0.66, hp: 260, atk: 26, def: 10, spd: 104, range: 0, flip: [1, 1, 1] },
  kakai:      { name: 'Kakai',      size: 0.92, hp: 230, atk: 30, def: 10, spd: 96, range: 1, shot: 'thorn', on: 'defDown', flip: [1, 1, 1] },
  asanbosam:  { name: 'Asanbosam',  size: 1.12, hp: 420, atk: 40, def: 20, spd: 88, range: 0, on: 'drain', flip: [0, 1, 0] },
  bayie:      { name: 'Bayie',      size: 1.0,  hp: 300, atk: 42, def: 12, spd: 94, range: 1, shot: 'hex', ult: 'aoe', flip: [0, 0, 0] },
  saman:      { name: 'Saman',      size: 1.02, hp: 340, atk: 22, def: 16, spd: 86, range: 1, shot: 'hex', ult: 'heal', flip: [0, 0, 0] },
  sasabonsam: { name: 'Sasabonsam', size: 1.32, hp: 620, atk: 52, def: 28, spd: 90, range: 0, ult: 'smash', flip: [1, 1, 1] },
  sika:       { name: 'Sika Kwaku', size: 0.6,  hp: 300, atk: 12, def: 30, spd: 70, range: 0, gold: 1, flip: [1, 1, 0] },
  mmoatiaHene:{ name: 'Ɛmmoatia Hene', size: 1.2, hp: 1500, atk: 48, def: 26, spd: 92, range: 0, boss: 1, ult: 'smash', flip: [1, 0, 0] },
  bayieQueen: { name: 'Bayie Ɔhemmaa', size: 1.3, hp: 2000, atk: 60, def: 24, spd: 96, range: 1, shot: 'hex', boss: 1, ult: 'aoe', flip: [0, 1, 0] },
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
  forest: { name: 'Ɛmmoatia Forest', bg: 'forest', ground: [.8, .97] },
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
export const STAGE_POW = [2.15, 1.26, 1.1, 1.13, 1.06, 0.93, 1.08, 0.84, 0.98, 0.96, 0.85, 0.75, 0.89, 0.88, 0.73, 0.58, 0.64, 0.69, 0.67, 0.52];
STAGES.forEach((t, i) => { t.pow = STAGE_POW[i]; });

export const LOCKED_CHAPTERS = ['Yoruba', 'Edo', 'Igbo', 'Haitian', 'Japan'];

// Gacha (beta: currency is earned in play only, nothing is sold)
export const PULL_COST = 100, PULL10_COST = 900, PITY = 40;
export const PULL_RATES = [['SSR', 0.04], ['SR', 0.18], ['R', 0.38], ['gold', 0.4]];
