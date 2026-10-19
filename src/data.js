// Gyeaman RPG — game data (Monster Clearer model). All numbers are balance knobs.

// ---------- heroes ----------
export const HEROES = [
  { id: 'kwame',   name: 'Kwame',   sex: 'm', age: 24, day: 'Saturday-born', skin: '#3b2316', hair: 'locs',     body: { h: 1.12, w: 0.92 }, title: 'Locs swordsman',      weapon: 'Afena',      base: { hp: 100, atk: 12, def: 5, mag: 5 },  bio: 'Asafo scout. Long reach, quiet feet, one clean cut.' },
  { id: 'yaw',     name: 'Yaw',     sex: 'm', age: 30, day: 'Thursday-born', skin: '#7a4a2a', hair: 'shaved',   body: { h: 0.9, w: 1.12 },  title: 'Twin-axe bruiser',    weapon: 'Twin akuma', base: { hp: 115, atk: 13, def: 7, mag: 2 },  bio: 'Built like a tree stump. Hits like a falling one.' },
  { id: 'kofi',    name: 'Kofi',    sex: 'm', age: 35, day: 'Friday-born',   skin: '#2a1810', hair: 'bald',     body: { h: 1.05, w: 1.3 },  title: 'Spear warden',        weapon: 'Pea',        base: { hp: 130, atk: 10, def: 9, mag: 3 },  bio: 'Big, patient and nearly impossible to move.' },
  { id: 'kwabena', name: 'Kwabena', sex: 'm', age: 17, teen: true, day: 'Tuesday-born',  skin: '#a8714a', hair: 'cornrows', body: { h: 0.98, w: 0.9 },  title: 'Coast hunter',        weapon: 'Short afena', base: { hp: 95, atk: 11, def: 5, mag: 7 },  bio: 'Seventeen, cocky, and never misses twice.' },
  { id: 'akosua',  name: 'Akosua',  sex: 'f', age: 25, day: 'Sunday-born',   skin: '#2e1a10', hair: 'braids',   body: { h: 1.1, w: 0.88 },  title: 'Asafo spearwoman',    weapon: 'Pea',        base: { hp: 98, atk: 12, def: 6, mag: 6 },   bio: 'First in the company line. Long-limbed and precise.' },
  { id: 'ama',     name: 'Ama',     sex: 'f', age: 15, teen: true, day: 'Saturday-born', skin: '#9c6640', hair: 'puffs',    body: { h: 0.86, w: 0.9 },  title: 'Spirit-fire apprentice', weapon: 'Brass bell', base: { hp: 85, atk: 7, def: 4, mag: 14 }, bio: 'Ɔkɔmfoɔ apprentice. Small, fierce, talks back to the abosom.' },
  { id: 'abena',   name: 'Abena',   sex: 'f', age: 32, day: 'Tuesday-born',  skin: '#5c3520', hair: 'knots',    body: { h: 0.98, w: 1.2 },  title: 'Axe matriarch',       weapon: 'Akuma',      base: { hp: 120, atk: 12, def: 7, mag: 4 },  bio: 'Market woman turned monster hunter. Nobody owes her twice.' },
  { id: 'adwoa',   name: 'Adwoa',   sex: 'f', age: 20, day: 'Monday-born',   skin: '#1f120a', hair: 'buzz',     body: { h: 1.02, w: 0.92 }, title: 'Twin-blade dancer',   weapon: 'Twin afena', base: { hp: 92, atk: 14, def: 4, mag: 6 },   bio: 'Fast as Anansi on a thread. First to strike.' },
];
// Akan day names, offered as name suggestions on the naming step
export const DAY_NAMES = { m: ['Kwadwo', 'Kwabena', 'Kwaku', 'Yaw', 'Kofi', 'Kwame', 'Kwasi', 'Ekow', 'Kojo', 'Fiifi'], f: ['Adwoa', 'Abena', 'Akua', 'Yaa', 'Afua', 'Ama', 'Akosua', 'Efua', 'Esi', 'Araba'] };

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
export const MATERIALS = ['Odum wood', 'Bronze', 'Iron', 'Brass-bound', 'Gold-leaf', 'Abosom'];

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
  mmoatia:    { name: 'Mmoatia',    lore: 'Forest dwarf with backward feet and a stolen club', hp: 20, atk: 5,  def: 1, xp: 6,  color: '#6b7a2e', eye: '#ffe066', shape: 'dwarf' },
  kakai:      { name: 'Kakai',      lore: 'A bound power figure full of nails and thorns',            hp: 18, atk: 5,  def: 0, xp: 6,  color: '#4a6b3a', eye: '#ff9d3c', shape: 'thorn', role: 'ranger' },
  asanbosam:  { name: 'Asanbosam',  lore: 'Drops from the trees on iron hooks',  hp: 40, atk: 10, def: 3, xp: 14, color: '#6b3a2a', eye: '#ff5a3c', shape: 'hook' },
  bayie:      { name: 'Bayie',      lore: 'Night witch with owl wings and a beaded crown', hp: 28, atk: 14, def: 2, xp: 12, color: '#2b3a5a', eye: '#9cf0ff', shape: 'owl', role: 'caster' },
  saman:      { name: 'Saman',      lore: 'An ancestor that refused the clay head\'s rest',                  hp: 26, atk: 0,  def: 2, xp: 11, color: '#5a6a7a', eye: '#d8f6ff', shape: 'ghost', role: 'buffer' },
  sasabonsam: { name: 'Sasabonsam', lore: 'Winged ogre of the deep forest', hp: 60, atk: 13, def: 5, xp: 22, color: '#3d2a4f', eye: '#ff3b3b', shape: 'wings' },
  sika:       { name: 'Sika Kwaku', lore: 'Brass imp hung with stolen gold-weights',      hp: 30, atk: 0,  def: 4, xp: 10, color: '#a8862a', eye: '#fff2a8', shape: 'dwarf', role: 'treasure' },
  // bosses
  mmoatiaHene:{ name: 'Mmoatia Hene',    lore: 'War chief of the forest dwarves', hp: 160, atk: 14, def: 4, xp: 80,  color: '#3f4a1a', eye: '#ffd23c', shape: 'dwarf', boss: true },
  bayieQueen: { name: 'Bayie Ɔhemmaa',  lore: 'Matriarch of the witch owls',     hp: 260, atk: 20, def: 6, xp: 140, color: '#1b2a4a', eye: '#7cf7ff', shape: 'owl', boss: true },
  sasaKing:   { name: 'Sasabonsam Hene', lore: 'Ancient ogre armoured in bronze plaques', hp: 420, atk: 26, def: 9, xp: 220, color: '#2a1838', eye: '#ff2a2a', shape: 'wings', boss: true },
  abonsam:    { name: 'Abonsam',         lore: 'Lord of the wicked spirits', hp: 700, atk: 34, def: 12, xp: 400, color: '#4a1414', eye: '#ffd23c', shape: 'lord', boss: true },
};

// ---------- worlds (each is one board that stays full until its enemy count runs out) ----------
export const WORLDS = [
  { id: 'forest', name: 'Mmoatia Forest',   cols: 5, rows: 3, count: 28, lvl: 1,  pool: ['mmoatia', 'mmoatia', 'kakai', 'sika'], boss: 'mmoatiaHene', pos: [0.3, 0.2],
    desc: 'The dwarves have been stealing from the villages. Start here.' },
  { id: 'marsh',  name: 'Bayie Marsh',      cols: 6, rows: 4, count: 45, lvl: 4,  pool: ['mmoatia', 'bayie', 'saman', 'kakai', 'sika'], boss: 'bayieQueen', pos: [0.26, 0.56],
    desc: 'Owls watch from dead trees. The witch queen hunts at night.' },
  { id: 'grove',  name: 'Sasabonsam Grove', cols: 6, rows: 5, count: 65, lvl: 8,  pool: ['asanbosam', 'kakai', 'saman', 'sasabonsam', 'bayie', 'sika'], boss: 'sasaKing', pos: [0.72, 0.36],
    desc: 'The winged giants nest in the tallest odum trees.' },
  { id: 'gate',   name: 'Abonsam Gate',     cols: 6, rows: 6, count: 90, lvl: 12, pool: ['sasabonsam', 'bayie', 'saman', 'asanbosam', 'kakai', 'sika'], boss: 'abonsam', pos: [0.8, 0.72],
    desc: 'Where the wicked spirits cross into the world.' },
];

export const xpForLevel = (lvl) => Math.round(25 * Math.pow(lvl, 1.6));
export const MAX_LEVEL = 99;
