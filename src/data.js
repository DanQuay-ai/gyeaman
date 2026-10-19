// Gyeaman RPG — game data. All numbers here are the balance knobs.

// ---------- heroes ----------
// body: drawing proportions for placeholder art (h = height mult, w = width mult).
export const HEROES = [
  { id: 'kwame',    name: 'Kwame',    sex: 'm', day: 'Saturday-born', skin: '#3b2316', hair: 'locs',    body: { h: 1.12, w: 0.92 }, title: 'Tall locs swordsman',
    base: { hp: 92, atk: 13, mag: 6, def: 6, spd: 7, move: 4 }, weapon: 'afena', bio: 'A tall, quiet Asafo scout. Long reach, fast blade.' },
  { id: 'yaw',      name: 'Yaw',      sex: 'm', day: 'Thursday-born', skin: '#7a4a2a', hair: 'shaved',  body: { h: 0.88, w: 1.08 }, title: 'Short stocky axeman',
    base: { hp: 110, atk: 15, mag: 3, def: 9, spd: 4, move: 3 }, weapon: 'akuma', bio: 'Built like a tree stump. Hits like a falling one.' },
  { id: 'kofi',     name: 'Kofi',     sex: 'm', day: 'Friday-born',   skin: '#2a1810', hair: 'bald',    body: { h: 1.0, w: 1.3 },  title: 'Heavy spear warden',
    base: { hp: 125, atk: 12, mag: 4, def: 11, spd: 3, move: 3 }, weapon: 'pea', bio: 'Big, patient and nearly impossible to move.' },
  { id: 'kwabena',  name: 'Kwabena',  sex: 'm', day: 'Tuesday-born',  skin: '#a8714a', hair: 'cornrows',body: { h: 1.0, w: 0.95 }, title: 'Light-skinned archer',
    base: { hp: 84, atk: 12, mag: 7, def: 5, spd: 8, move: 4 }, weapon: 'agyan', bio: 'A hunter from the coast. Never misses twice.' },
  { id: 'akosua',   name: 'Akosua',   sex: 'f', day: 'Sunday-born',   skin: '#2e1a10', hair: 'braids',  body: { h: 1.1, w: 0.88 }, title: 'Tall braided spearwoman',
    base: { hp: 90, atk: 13, mag: 7, def: 6, spd: 7, move: 4 }, weapon: 'pea', bio: 'Royal guard of the Golden Stool, long-limbed and precise.' },
  { id: 'ama',      name: 'Ama',      sex: 'f', day: 'Saturday-born', skin: '#9c6640', hair: 'puffs',   body: { h: 0.86, w: 0.9 },  title: 'Small priestess',
    base: { hp: 78, atk: 7, mag: 15, def: 5, spd: 7, move: 4 }, weapon: 'poma', bio: 'Ɔkɔmfoɔ apprentice. Tiny, fierce, speaks to the abosom.' },
  { id: 'abena',    name: 'Abena',    sex: 'f', day: 'Tuesday-born',  skin: '#5c3520', hair: 'knots',   body: { h: 0.98, w: 1.2 },  title: 'Curvy axe matriarch',
    base: { hp: 112, atk: 14, mag: 6, def: 8, spd: 4, move: 3 }, weapon: 'akuma', bio: 'Market queen turned monster hunter. Nobody owes her twice.' },
  { id: 'adwoa',    name: 'Adwoa',    sex: 'f', day: 'Monday-born',   skin: '#1f120a', hair: 'buzz',    body: { h: 1.02, w: 0.92 }, title: 'Athletic dagger dancer',
    base: { hp: 82, atk: 12, mag: 8, def: 5, spd: 10, move: 5 }, weapon: 'sekan', bio: 'Fast as Anansi on a thread. Strikes twice.' },
];

// ---------- weapons (equipped in the weapon slot; type decides the basic attack) ----------
export const WEAPON_TYPES = {
  afena: { name: 'Afena',  kind: 'Sword',   range: [1, 1], hits: 1, stat: 'atk', power: 1.0, note: 'Reliable single strike' },
  akuma: { name: 'Akuma',  kind: 'Axe',     range: [1, 1], hits: 1, stat: 'atk', power: 1.25, cleave: true, note: 'Cleaves enemies beside the target' },
  pea:   { name: 'Pea',    kind: 'Spear',   range: [1, 2], hits: 1, stat: 'atk', power: 0.95, pierce: true, note: 'Reach 2, pierces a line' },
  agyan: { name: 'Agyan',  kind: 'Bow',     range: [2, 4], hits: 1, stat: 'atk', power: 0.9, note: 'Range 2 to 4, cannot hit adjacent' },
  poma:  { name: 'Poma',   kind: 'Staff',   range: [1, 2], hits: 1, stat: 'mag', power: 0.8, magBoost: 0.25, note: 'Spells deal 25% more' },
  sekan: { name: 'Sekan',  kind: 'Daggers', range: [1, 1], hits: 2, stat: 'atk', power: 0.6, note: 'Strikes twice' },
};

// ---------- spells (learned by level; up to 4 equipped) ----------
// target: 'enemy' | 'self' | 'tile'; area: radius around target; cd: turns
export const SPELLS = {
  ogya:     { name: 'Ogya',      en: 'Fire Lance',   lvl: 1, mp: 4, range: [1, 4], target: 'enemy', area: 0, power: 1.4, el: 'fire', status: { burn: 2 }, color: '#ff6a2a' },
  nkwa:     { name: 'Nkwa',      en: 'Life Breath',  lvl: 1, mp: 5, range: [0, 0], target: 'self',  heal: 0.35, color: '#7ee08a' },
  aprannaa: { name: 'Aprannaa',  en: 'Thunder Call', lvl: 3, mp: 7, range: [2, 5], target: 'tile',  area: 1, power: 1.2, el: 'storm', status: { stun: 1 }, color: '#ffe066' },
  nsuo:     { name: 'Nsuo',      en: 'River Wave',   lvl: 4, mp: 6, range: [1, 3], target: 'enemy', area: 0, power: 1.1, push: 2, el: 'water', color: '#4fa3ff' },
  sunsum:   { name: 'Sunsum',    en: 'Spirit Step',  lvl: 5, mp: 4, range: [1, 5], target: 'tile',  teleport: true, color: '#c58bff' },
  aduto:    { name: 'Aduto',     en: 'Witch Poison', lvl: 6, mp: 5, range: [1, 4], target: 'enemy', area: 0, power: 0.5, status: { poison: 3 }, color: '#9ccf3a' },
  nkabom:   { name: 'Nkabom',    en: 'Unity Ward',   lvl: 7, mp: 6, range: [0, 0], target: 'self',  status: { ward: 3 }, color: '#e3a72f' },
  asase:    { name: 'Asase Yaa', en: 'Earth Mother', lvl: 9, mp: 10, range: [0, 0], target: 'self', area: 2, power: 1.6, el: 'earth', color: '#b5652b' },
};

// ---------- gear ----------
export const SLOTS = ['weapon', 'head', 'body', 'charm'];
export const RARITY = [
  { id: 'common',    name: 'Common',    color: '#b9ad99', mult: 1.0, affixes: 0 },
  { id: 'rare',      name: 'Rare',      color: '#4fa3ff', mult: 1.25, affixes: 1 },
  { id: 'epic',      name: 'Epic',      color: '#c58bff', mult: 1.55, affixes: 2 },
  { id: 'legendary', name: 'Legendary', color: '#e3a72f', mult: 1.95, affixes: 3 },
];
// art: key into the image asset map (assets/gear/<art>.png); missing images fall back to drawn icons.
export const GEAR_BASES = [
  // weapons
  { slot: 'weapon', type: 'afena', name: 'Iron Afena',       stats: { atk: 4 }, art: 'afena' },
  { slot: 'weapon', type: 'akuma', name: 'Woodcutter Akuma', stats: { atk: 5 }, art: 'akuma' },
  { slot: 'weapon', type: 'pea',   name: 'Asafo Pea',        stats: { atk: 4, def: 1 }, art: 'pea' },
  { slot: 'weapon', type: 'agyan', name: 'Hunter Agyan',     stats: { atk: 4, spd: 1 }, art: 'agyan' },
  { slot: 'weapon', type: 'poma',  name: 'Okyeame Poma',     stats: { mag: 5 }, art: 'poma' },
  { slot: 'weapon', type: 'sekan', name: 'Twin Sekan',       stats: { atk: 3, spd: 1 }, art: 'sekan' },
  // head
  { slot: 'head', name: 'Kente Headwrap',   stats: { def: 2, mag: 1 }, art: 'headwrap' },
  { slot: 'head', name: 'Asafo Helm',        stats: { def: 3, hp: 6 }, art: 'helm' },
  { slot: 'head', name: 'Priest Beads',      stats: { mag: 3 }, art: 'beads' },
  // body
  { slot: 'body', name: 'Batakari Smock',   stats: { def: 3, hp: 10 }, art: 'batakari' },
  { slot: 'body', name: 'Kente Mantle',      stats: { def: 2, mag: 2, hp: 6 }, art: 'mantle' },
  { slot: 'body', name: 'Hunter Leathers',   stats: { def: 2, spd: 1, hp: 8 }, art: 'leathers' },
  // charms (Adinkra)
  { slot: 'charm', name: 'Gye Nyame Charm',  stats: { mag: 2, def: 1 }, art: 'gyenyame' },
  { slot: 'charm', name: 'Sankofa Charm',    stats: { hp: 12 }, art: 'sankofa' },
  { slot: 'charm', name: 'Dwennimmen Charm', stats: { atk: 2, def: 1 }, art: 'dwennimmen' },
  { slot: 'charm', name: 'Nkyinkyim Charm',  stats: { spd: 2 }, art: 'nkyinkyim' },
];
export const AFFIXES = [
  { stat: 'atk', name: 'of the Leopard', v: [1, 3] },
  { stat: 'mag', name: 'of the Abosom', v: [1, 3] },
  { stat: 'def', name: 'of the Tortoise', v: [1, 3] },
  { stat: 'hp',  name: 'of Sankofa', v: [5, 14] },
  { stat: 'spd', name: 'of Anansi', v: [1, 2] },
  { stat: 'crit', name: 'of the Hawk', v: [4, 10] },
  { stat: 'mp',  name: 'of Nyame', v: [3, 8] },
];

// ---------- monsters ----------
// ai: 'melee' | 'ranged' | 'caster' | 'boss'; skills are special attacks used on cooldown.
export const MONSTERS = {
  mmoatia:    { name: 'Mmoatia',    lore: 'Forest dwarf with backward feet', hp: 26, atk: 7, mag: 2, def: 2, spd: 9, move: 4, range: [1, 1], ai: 'melee', xp: 8,  color: '#6b7a2e', eye: '#ffe066', shape: 'dwarf' },
  kakai:      { name: 'Kakai',      lore: 'Thorny forest spirit, throws barbs', hp: 22, atk: 6, mag: 4, def: 1, spd: 6, move: 3, range: [2, 4], ai: 'ranged', xp: 9, color: '#4a6b3a', eye: '#ff9d3c', shape: 'thorn' },
  asanbosam:  { name: 'Asanbosam',  lore: 'Hangs from trees on iron hooks', hp: 48, atk: 11, mag: 2, def: 5, spd: 5, move: 3, range: [1, 2], ai: 'melee', xp: 18, color: '#6b3a2a', eye: '#ff5a3c', shape: 'hook', skill: { name: 'Iron Hook', pull: true, cd: 3, power: 1.1 } },
  bayie:      { name: 'Bayie',      lore: 'Night witch who walks as an owl', hp: 34, atk: 5, mag: 11, def: 3, spd: 7, move: 3, range: [2, 4], ai: 'caster', xp: 16, color: '#2b3a5a', eye: '#9cf0ff', shape: 'owl', skill: { name: 'Curse', status: { curse: 2 }, cd: 3, power: 0.9 } },
  sasabonsam: { name: 'Sasabonsam', lore: 'Winged giant of the deep forest', hp: 70, atk: 14, mag: 4, def: 6, spd: 6, move: 5, range: [1, 1], ai: 'melee', fly: true, xp: 30, color: '#3d2a4f', eye: '#ff3b3b', shape: 'wings', skill: { name: 'Swoop', cd: 3, power: 1.5 } },
  sumsum:     { name: 'Saman',      lore: 'Restless ghost, slips through walls', hp: 30, atk: 9, mag: 8, def: 2, spd: 8, move: 4, range: [1, 2], ai: 'melee', fly: true, xp: 14, color: '#5a6a7a', eye: '#d8f6ff', shape: 'ghost' },
  abonsam:    { name: 'Abonsam',    lore: 'Lord of the wicked spirits', hp: 220, atk: 17, mag: 15, def: 8, spd: 7, move: 3, range: [1, 3], ai: 'boss', xp: 150, color: '#4a1414', eye: '#ffd23c', shape: 'lord', skill: { name: 'Hell Flame', area: 1, cd: 2, power: 1.3, status: { burn: 2 } } },
  sasaKing:   { name: 'Sasabonsam Hene', lore: 'Elder of the winged giants', hp: 160, atk: 16, mag: 6, def: 7, spd: 7, move: 5, range: [1, 1], ai: 'boss', fly: true, xp: 110, color: '#2a1838', eye: '#ff2a2a', shape: 'wings', skill: { name: 'Crushing Swoop', cd: 2, power: 1.7 } },
  bayieQueen: { name: 'Bayie Ɔhemmaa', lore: 'Queen of the witch owls', hp: 130, atk: 7, mag: 16, def: 5, spd: 8, move: 3, range: [2, 5], ai: 'boss', xp: 90, color: '#1b2a4a', eye: '#7cf7ff', shape: 'owl', skill: { name: 'Night Hex', area: 1, cd: 2, power: 1.2, status: { curse: 2 } } },
};

// ---------- regions (hybrid: persistent hero, randomized dungeon runs) ----------
export const REGIONS = [
  { id: 'forest', name: 'Mmoatia Forest', lvl: 1, floors: 4, pool: ['mmoatia', 'kakai'], elite: ['asanbosam'], boss: 'asanbosam', bossCount: 1, tiles: 'forest',
    desc: 'The dwarves have been stealing from the villages. Start here.' },
  { id: 'marsh', name: 'Bayie Marsh', lvl: 4, floors: 5, pool: ['bayie', 'mmoatia', 'sumsum'], elite: ['asanbosam', 'bayie'], boss: 'bayieQueen', tiles: 'marsh',
    desc: 'Owls watch from dead trees. The witch queen hunts at night.' },
  { id: 'grove', name: 'Sasabonsam Grove', lvl: 7, floors: 5, pool: ['sasabonsam', 'kakai', 'sumsum'], elite: ['sasabonsam', 'asanbosam'], boss: 'sasaKing', tiles: 'grove',
    desc: 'The winged giants nest in the tallest odum trees.' },
  { id: 'gate', name: 'Abonsam Gate', lvl: 10, floors: 6, pool: ['sasabonsam', 'bayie', 'sumsum', 'asanbosam'], elite: ['sasabonsam', 'bayie'], boss: 'abonsam', tiles: 'gate',
    desc: 'Where the wicked spirits cross into the world.' },
];

// ---------- progression ----------
export const xpForLevel = (lvl) => Math.round(30 * Math.pow(lvl, 1.55));
export const GROWTH = { hp: 9, atk: 1.6, mag: 1.6, def: 1.0, spd: 0.4, mp: 2 };
export const MAX_LEVEL = 30;
