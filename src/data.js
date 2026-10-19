// Gyeaman RPG — game data (Monster Clearer model). All numbers are balance knobs.

// ---------- heroes ----------
export const HEROES = [
  { id: 'kwame',   name: 'Kwame',   sex: 'm', day: 'Saturday-born', skin: '#3b2316', hair: 'locs',     body: { h: 1.12, w: 0.92 }, title: 'Tall locs swordsman',   base: { hp: 100, atk: 12, def: 5, mag: 5 }, bio: 'A tall, quiet Asafo scout. Long reach, fast blade.' },
  { id: 'yaw',     name: 'Yaw',     sex: 'm', day: 'Thursday-born', skin: '#7a4a2a', hair: 'shaved',   body: { h: 0.88, w: 1.08 }, title: 'Short stocky axeman',   base: { hp: 115, atk: 13, def: 7, mag: 2 }, bio: 'Built like a tree stump. Hits like a falling one.' },
  { id: 'kofi',    name: 'Kofi',    sex: 'm', day: 'Friday-born',   skin: '#2a1810', hair: 'bald',     body: { h: 1.0, w: 1.3 },   title: 'Heavy spear warden',    base: { hp: 130, atk: 10, def: 9, mag: 3 }, bio: 'Big, patient and nearly impossible to move.' },
  { id: 'kwabena', name: 'Kwabena', sex: 'm', day: 'Tuesday-born',  skin: '#a8714a', hair: 'cornrows', body: { h: 1.0, w: 0.95 },  title: 'Light-skinned hunter',  base: { hp: 95,  atk: 11, def: 5, mag: 7 }, bio: 'A hunter from the coast. Never misses twice.' },
  { id: 'akosua',  name: 'Akosua',  sex: 'f', day: 'Sunday-born',   skin: '#2e1a10', hair: 'braids',   body: { h: 1.1, w: 0.88 },  title: 'Tall braided spearwoman', base: { hp: 98, atk: 12, def: 6, mag: 6 }, bio: 'Royal guard of the Golden Stool, long-limbed and precise.' },
  { id: 'ama',     name: 'Ama',     sex: 'f', day: 'Saturday-born', skin: '#9c6640', hair: 'puffs',    body: { h: 0.86, w: 0.9 },  title: 'Small priestess',       base: { hp: 85,  atk: 7,  def: 4, mag: 14 }, bio: 'Ɔkɔmfoɔ apprentice. Tiny, fierce, speaks to the abosom.' },
  { id: 'abena',   name: 'Abena',   sex: 'f', day: 'Tuesday-born',  skin: '#5c3520', hair: 'knots',    body: { h: 0.98, w: 1.2 },  title: 'Curvy axe matriarch',   base: { hp: 120, atk: 12, def: 7, mag: 4 }, bio: 'Market queen turned monster hunter. Nobody owes her twice.' },
  { id: 'adwoa',   name: 'Adwoa',   sex: 'f', day: 'Monday-born',   skin: '#1f120a', hair: 'buzz',     body: { h: 1.02, w: 0.92 }, title: 'Athletic blade dancer', base: { hp: 92,  atk: 14, def: 4, mag: 6 }, bio: 'Fast as Anansi on a thread. First to strike.' },
];

// ---------- equipment ----------
// Each slot feeds one stat, like Monster Clearer: sword ATK, shield DEF, helmet MAG, armour HP, rings any.
export const SLOTS = ['sword', 'shield', 'helmet', 'armour', 'ring1', 'ring2'];
export const SLOT_INFO = {
  sword:  { name: 'Afena',    en: 'Sword',  stat: 'atk', base: 4,  art: 'afena' },
  shield: { name: 'Ekyɛm',    en: 'Shield', stat: 'def', base: 3,  art: 'ekyem' },
  helmet: { name: 'Abotire',  en: 'Helm',   stat: 'mag', base: 3,  art: 'abotire' },
  armour: { name: 'Batakari', en: 'Armour', stat: 'hp',  base: 22, art: 'batakari' },
  ring:   { name: 'Kawa',     en: 'Ring',   stat: null,  base: 3,  art: 'kawa' }, // stat rolled: atk, def or mag
};
export const QUALITY = [
  { id: 'regular',   name: 'Regular',   color: '#b9ad99', mult: 1.0 },
  { id: 'fine',      name: 'Fine',      color: '#7ee08a', mult: 1.3 },
  { id: 'rare',      name: 'Rare',      color: '#4fa3ff', mult: 1.7 },
  { id: 'legendary', name: 'Legendary', color: '#e3a72f', mult: 2.3, bonus: true },
];
// material tier per world (names shown in item titles)
export const MATERIALS = ['Odum wood', 'Bronze', 'Iron', 'Kente-woven', 'Gold-leaf', 'Abosom'];

// ---------- actions ----------
// Weapon actions: sword is free and provokes; axe and spear cost stamina and calm the target one step.
export const WEAPON_ACTIONS = [
  { id: 'afena', name: 'Afena',  en: 'Sword slash',  pat: 'single', power: 1.0, st: 0, provoke: true, lvl: 1, note: 'Free. Enrages the target and wakes its neighbours.' },
  { id: 'akuma', name: 'Akuma',  en: 'Axe sweep',    pat: 'row3',   power: 0.7, st: 1, calm: 1, lvl: 2, note: 'Hits 3 in a row. Calms targets one step.' },
  { id: 'pea',   name: 'Pea',    en: 'Spear thrust', pat: 'single', power: 1.9, st: 2, calm: 1, lvl: 4, note: 'Heavy single hit. Calms the target one step.' },
];
// Spells: cooldown-based, magic damage. Unlocked by clearing worlds.
export const SPELLS = {
  ogya:     { name: 'Ogya',     en: 'Fireball',        pat: 'cross',   power: 1.1, cd: 3, color: '#ff6a2a', burn: 2, unlock: 0, note: 'Cross pattern, burns.' },
  nsuo:     { name: 'Nsuo',     en: 'River Sweep',     pat: 'row',     power: 0.9, cd: 3, color: '#4fa3ff', unlock: 1, note: 'Hits a whole row.' },
  awow:     { name: 'Awɔw',     en: 'Frost Pulse',     pat: 'box',     power: 0.5, cd: 4, color: '#bfe8ff', calmTo: 1, unlock: 1, note: '3×3, calms everything hit to sleepy.' },
  aprannaa: { name: 'Aprannaa', en: 'Chain Lightning', pat: 'random4', power: 1.0, cd: 4, color: '#ffe066', stun: 1, unlock: 2, note: '4 random monsters, stuns.' },
  nkyinkyim:{ name: 'Nkyinkyim',en: 'Twisting Cross',  pat: 'xcross',  power: 1.2, cd: 4, color: '#c58bff', unlock: 2, note: 'Diagonal cross.' },
  asase:    { name: 'Asase Yaa',en: 'Earth Mother',    pat: 'col',     power: 1.3, cd: 5, color: '#b5652b', unlock: 3, note: 'Hits a whole column.' },
};

// ---------- skills: 3 trees, one point every 4 levels, free respec ----------
export const SKILLS = {
  attack: [
    { id: 'offence',   name: 'Offence',     lvl: 4,  note: '+15% attack' },
    { id: 'enrage',    name: 'Enrage',      lvl: 8,  note: '+25% attack below 40% health' },
    { id: 'execute',   name: 'Executioner', lvl: 16, note: 'Sword deals double damage to monsters below 25% health' },
  ],
  defence: [
    { id: 'stoneskin', name: 'Stone Skin',  lvl: 4,  note: 'Take 12% less damage' },
    { id: 'calm',      name: 'Calm Hand',   lvl: 8,  note: 'Sword no longer wakes neighbours' },
    { id: 'bloodthirst', name: 'Bloodthirst', lvl: 16, note: 'Drinking a tonic refills stamina' },
  ],
  magic: [
    { id: 'potency',   name: 'Potency',     lvl: 4,  note: 'Tonics heal 50% more' },
    { id: 'meditation',name: 'Meditation',  lvl: 8,  note: 'Spell cooldowns 1 shorter' },
    { id: 'sankofa',   name: 'Sankofa',     lvl: 16, note: 'Start each world with full stamina' },
  ],
};

// ---------- monsters ----------
// role: normal | buffer (blue, triples one aggressive ally's damage) | caster (purple, charges 3 rounds then a big hit)
//       | ranger (yellow, also attacks while alert) | treasure (gold, harmless, always drops an item)
export const MONSTERS = {
  mmoatia:    { name: 'Mmoatia',    lore: 'Forest dwarf with backward feet', hp: 20, atk: 5,  def: 1, xp: 6,  color: '#6b7a2e', eye: '#ffe066', shape: 'dwarf' },
  kakai:      { name: 'Kakai',      lore: 'Thorny forest spirit',            hp: 18, atk: 5,  def: 0, xp: 6,  color: '#4a6b3a', eye: '#ff9d3c', shape: 'thorn', role: 'ranger' },
  asanbosam:  { name: 'Asanbosam',  lore: 'Hangs from trees on iron hooks',  hp: 40, atk: 10, def: 3, xp: 14, color: '#6b3a2a', eye: '#ff5a3c', shape: 'hook' },
  bayie:      { name: 'Bayie',      lore: 'Night witch who walks as an owl', hp: 28, atk: 14, def: 2, xp: 12, color: '#2b3a5a', eye: '#9cf0ff', shape: 'owl', role: 'caster' },
  saman:      { name: 'Saman',      lore: 'Restless ghost',                  hp: 26, atk: 0,  def: 2, xp: 11, color: '#5a6a7a', eye: '#d8f6ff', shape: 'ghost', role: 'buffer' },
  sasabonsam: { name: 'Sasabonsam', lore: 'Winged giant of the deep forest', hp: 60, atk: 13, def: 5, xp: 22, color: '#3d2a4f', eye: '#ff3b3b', shape: 'wings' },
  sika:       { name: 'Sika Kwaku', lore: 'A gold-hoarding forest imp',      hp: 30, atk: 0,  def: 4, xp: 10, color: '#a8862a', eye: '#fff2a8', shape: 'dwarf', role: 'treasure' },
  // bosses
  mmoatiaHene:{ name: 'Mmoatia Hene',    lore: 'King of the forest dwarves', hp: 160, atk: 14, def: 4, xp: 80,  color: '#3f4a1a', eye: '#ffd23c', shape: 'dwarf', boss: true },
  bayieQueen: { name: 'Bayie Ɔhemmaa',  lore: 'Queen of the witch owls',     hp: 260, atk: 20, def: 6, xp: 140, color: '#1b2a4a', eye: '#7cf7ff', shape: 'owl', boss: true },
  sasaKing:   { name: 'Sasabonsam Hene', lore: 'Elder of the winged giants', hp: 420, atk: 26, def: 9, xp: 220, color: '#2a1838', eye: '#ff2a2a', shape: 'wings', boss: true },
  abonsam:    { name: 'Abonsam',         lore: 'Lord of the wicked spirits', hp: 700, atk: 34, def: 12, xp: 400, color: '#4a1414', eye: '#ffd23c', shape: 'lord', boss: true },
};

// ---------- worlds (each is one board that stays full until its enemy count runs out) ----------
export const WORLDS = [
  { id: 'forest', name: 'Mmoatia Forest',   cols: 5, rows: 3, count: 28, lvl: 1,  pool: ['mmoatia', 'mmoatia', 'kakai', 'sika'], boss: 'mmoatiaHene', pos: [0.22, 0.32],
    desc: 'The dwarves have been stealing from the villages. Start here.' },
  { id: 'marsh',  name: 'Bayie Marsh',      cols: 6, rows: 4, count: 45, lvl: 4,  pool: ['mmoatia', 'bayie', 'saman', 'kakai', 'sika'], boss: 'bayieQueen', pos: [0.18, 0.74],
    desc: 'Owls watch from dead trees. The witch queen hunts at night.' },
  { id: 'grove',  name: 'Sasabonsam Grove', cols: 6, rows: 5, count: 65, lvl: 8,  pool: ['asanbosam', 'kakai', 'saman', 'sasabonsam', 'bayie', 'sika'], boss: 'sasaKing', pos: [0.5, 0.66],
    desc: 'The winged giants nest in the tallest odum trees.' },
  { id: 'gate',   name: 'Abonsam Gate',     cols: 6, rows: 6, count: 90, lvl: 12, pool: ['sasabonsam', 'bayie', 'saman', 'asanbosam', 'kakai', 'sika'], boss: 'abonsam', pos: [0.84, 0.72],
    desc: 'Where the wicked spirits cross into the world.' },
];

export const xpForLevel = (lvl) => Math.round(25 * Math.pow(lvl, 1.6));
export const MAX_LEVEL = 99;
