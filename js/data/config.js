// ============================================================
// config.js — Global game configuration & tuning constants
// ============================================================

export const CONFIG = {
  // Arena
  ARENA: {
    PADDING_L: 32, PADDING_R: 32, PADDING_T: 104, PADDING_B: 32,
    GRID_SIZE: 46,
    MAX_DPR: 2,
    TARGET_FPS: 60,
    MAX_DT: 1 / 30,
  },

  // Player physics
  PLAYER: {
    RADIUS: 21,
    BASE_SPEED: 275,
    TURBO_SPEED_MULT: 2.15,
    ACCEL: 0.18,
    FRICTION: 0.86,
    WALL_BOUNCE: -0.4,
    TRAIL_LEN: 16,
    DASH_BURST: 980,
    DASH_RECHARGE: 0.5,   // per second
    TURBO_DRAIN: 0.42,    // per second
    TURBO_REGEN: 0.1,
    TURBO_ON_CORRECT: 0.16,
    DASH_GHOSTS: 4,
  },

  // Scoring
  SCORE: {
    BASE: 100,
    SPEED_BONUS_MAX: 50,
    COMBO_MULT_MAX: 5.0,
    COMBO_STEP: 5,         // every 5 combo → +0.5x
    GEM_RAW: true,         // gem pts not multiplied by combo
    LEVEL_CLEAR_BASE: 500,
    LEVEL_CLEAR_PER_LEVEL: 100,
    LEVEL_CLEAR_PER_STAR: 200,
    LEVEL_CLEAR_FLAWLESS: 300,
    BOMB_SURVIVE_BONUS: 50,
  },

  // Lives
  HEARTS: { START: 3, MAX: 5, INVULN_AFTER_HIT: 1.0 },

  // Level progression
  LEVEL: {
    GOAL_BASE: 5,
    GOAL_PER_LEVEL: 1,
    TIME_BASE: 80,
    TIME_PER_LEVEL: 5,
    TIME_BOX_BONUS: 6,
    HEAL_BETWEEN_LEVELS: 1,
    STAR_2_THRESHOLD: 1.3,
    STAR_3_THRESHOLD: 1.6,
    SCORE_GOAL_BASE: 1000,
    SCORE_GOAL_PER_LEVEL: 400,
    FMAX_GROWTH: 2,        // factor ceiling grows every N levels
    FMAX_MIN: 2, FMAX_MAX: 12,
  },

  // Question timing
  QUESTION: {
    TIME_BASE: 6.0,
    TIME_DECAY_PER_LEVEL: 0.2,
    TIME_FLOOR: 3.0,
    TIME_FACTOR_BONUS: 0.04, // extra seconds for big factors
  },

  // Box spawn / despawn
  SPAWN: {
    CONCURRENT_MIN: 2,
    CONCURRENT_MAX: 6,
    INTERVAL_BASE: 3000,
    INTERVAL_DECAY: 120,
    INTERVAL_MIN: 1000,
    BOX_DESPAWN_BASE: 9.0,
    BOX_DESPAWN_DECAY: 0.35,
    BOX_DESPAWN_MIN: 4.0,
    MOVE_START_LEVEL: 5,
    MOVE_CHANCE: 0.4,
    MOVE_SPEED: 30,
  },

  // Combo
  COMBO: {
    DECAY_DELAY: 8.0,
    DECAY_RATE: 1.0,
    BANNER_EVERY: 3,
  },

  // Particles
  PARTICLES: {
    MAX_DESKTOP: 600,
    MAX_MOBILE: 300,
  },

  // Multiplayer
  MP: {
    PROTOCOL: 2,
    SYNC_HZ: 20,           // position sync rate
    HOST_IS_AUTHORITATIVE: true,
    ROOM_CODE_LEN: 5,
    RECONNECT_MS: 4000,
  },

  // Persistence
  SAVE_KEY: 'kpl_royale_pro_v3',
  SAVE_SCHEMA: 3,
};

// Box type definitions — visual + behavior + reward multipliers
export const BOX_TYPES = {
  normal:  { label: 'כפל',       mult: 1.0, color: '#3B82F6', glow: '#60A5FA', icon: '×',  weight: { base: 70, decay: 2 } },
  golden:  { label: 'תיבת זהב',  mult: 2.0, color: '#FBBF24', glow: '#FDE047', icon: '★',  weight: { base: 12, grow: 0.6 }, hard: true, gems: 2 },
  bomb:    { label: 'פצצה',       mult: 1.5, color: '#374151', glow: '#F87171', icon: '☼',  weight: { base: 4, grow: 1.2, cap: 25 }, fuse: true },
  time:    { label: 'זמן',        mult: 1.0, color: '#22D3EE', glow: '#67E8F9', icon: '⏱',  weight: { base: 8, grow: 0.2 }, addTime: 6 },
  mega:    { label: 'מגה',        mult: 3.0, color: '#A78BFA', glow: '#C4B5FD', icon: '♛',  weight: { base: 2, grow: 0.7 }, hard: true, powerup: true },
  mystery: { label: 'תעלומה',     mult: 2.0, color: '#F472B6', glow: '#F9A8D4', icon: '?',  weight: { base: 6 }, mystery: true },
  heart:   { label: 'לב',         mult: 1.0, color: '#F87171', glow: '#FCA5A5', icon: '♥',  weight: { base: 6, cond: 'hurt' }, heal: true, easy: true },
  combo:   { label: 'רצף',        mult: 2.5, color: '#FB923C', glow: '#FDBA74', icon: '☄',  weight: { base: 4, grow: 0.3, cond: 'combo5' }, hard: true, comboBoost: 3, needCombo: 5 },
};

// Gem type definitions
export const GEMS = {
  ruby:     { color: '#F87171', hi: '#FCA5A5', pts: 10,  name: 'אודם',    weight: 22 },
  sapphire: { color: '#3B82F6', hi: '#60A5FA', pts: 25,  name: 'ספיר',   weight: 16 },
  emerald:  { color: '#34D399', hi: '#6EE7B7', pts: 5,   name: 'ברקת',   weight: 20, combo: 1 },
  topaz:    { color: '#FBBF24', hi: '#FDE047', pts: 30,  name: 'טופז',   weight: 14 },
  amethyst: { color: '#A78BFA', hi: '#C4B5FD', pts: 15,  name: 'אחלמה',  weight: 18, turbo: 0.4 },
  rainbow:  { color: '#F472B6', hi: '#FDE047', pts: 100, name: 'קשת',    weight: 2,  rare: true, invuln: 5, score2x: 5 },
};

// Power-up definitions
export const POWERS = {
  shield:  { icon: '🛡', color: '#3B82F6', dur: 0,  charge: true,   name: 'מגן' },
  score2x: { icon: '×2', color: '#FBBF24', dur: 8,                 name: 'ניקוד כפול' },
  magnet:  { icon: '🧲', color: '#34D399', dur: 6,                 name: 'מגנט' },
  hint:    { icon: '💡', color: '#FDE047', dur: 0,  instant: true,  name: 'רמז' },
  freeze:  { icon: '❄',  color: '#67E8F9', dur: 4,                 name: 'הקפאה' },
  slowmo:  { icon: '⏳', color: '#A78BFA', dur: 5,                 name: 'הילוך איטי' },
};

// Skins unlockable by total stars
export const SKINS = [
  { id: 'rocket',    name: 'רקטה',     stars: 0,  body: '#A78BFA', accent: '#22D3EE' },
  { id: 'robot',     name: 'רובוט',    stars: 5,  body: '#64748B', accent: '#22D3EE' },
  { id: 'unicorn',   name: 'חד-קרן',   stars: 10, body: '#F472B6', accent: '#FDE047' },
  { id: 'dragon',    name: 'דרקון',    stars: 15, body: '#34D399', accent: '#F87171' },
  { id: 'submarine', name: 'צוללת',    stars: 20, body: '#3B82F6', accent: '#67E8F9' },
  { id: 'skate',     name: 'סקייט',    stars: 30, body: '#FB923C', accent: '#FDE047' },
  { id: 'spaceship', name: 'חללית',    stars: 45, body: '#22D3EE', accent: '#A78BFA' },
  { id: 'dino',      name: 'דינוזאור', stars: 60, body: '#34D399', accent: '#FBBF24' },
];

// Trail effects (unlockable)
export const TRAILS = [
  { id: 'default',  name: 'רגיל',     stars: 0,  color: null },           // null = use combo-tier color
  { id: 'flames',   name: 'להבות',    stars: 5,  color: '#FB923C' },
  { id: 'stars',    name: 'כוכבים',   stars: 10, color: '#FDE047' },
  { id: 'bubbles',  name: 'בועות',    stars: 15, color: '#67E8F9' },
  { id: 'rainbow',  name: 'קשת',      stars: 20, color: 'rainbow' },
  { id: 'lightning',name: 'ברק',      stars: 30, color: '#FDE047' },
];

// Arena themes (visual palette swaps by level tier)
export const THEMES = [
  { id: 'grid',    name: 'רשת',     minLevel: 1,  hue: 200 },
  { id: 'space',   name: 'חלל',     minLevel: 6,  hue: 260 },
  { id: 'jungle',  name: 'ג\'ונגל', minLevel: 12, hue: 140 },
  { id: 'candy',   name: 'ממתקים',  minLevel: 18, hue: 320 },
  { id: 'ocean',   name: 'אוקיינוס', minLevel: 24, hue: 190 },
  { id: 'volcano', name: 'הר געש',  minLevel: 30, hue: 10 },
];

// Achievements
export const ACHIEVEMENTS = [
  { id: 'first_correct', name: 'התשובה הראשונה',  icon: '🎯', cond: g => g.totalCorrect >= 1 },
  { id: 'combo_10',      name: 'רצף 10',          icon: '🔥', cond: g => g.bestComboEver >= 10 },
  { id: 'combo_25',      name: 'רצף 25',          icon: '⚡', cond: g => g.bestComboEver >= 25 },
  { id: 'combo_50',      name: 'רצף 50',          icon: '🌟', cond: g => g.bestComboEver >= 50 },
  { id: 'gems_100',      name: 'אספן האבנים',     icon: '💎', cond: g => g.totalGems >= 100 },
  { id: 'gems_500',      name: 'מלך האבנים',      icon: '👑', cond: g => g.totalGems >= 500 },
  { id: 'level_10',      name: 'חצי דרך',         icon: '🏔', cond: g => g.maxLevel >= 10 },
  { id: 'level_20',      name: 'מסע מתקדם',       icon: '🌋', cond: g => g.maxLevel >= 20 },
  { id: 'bomb_survivor', name: 'ניצול פצצה',      icon: '💣', cond: g => g.bombsDefused >= 1 },
  { id: 'mystery_open',  name: 'תעלומה',          icon: '❓', cond: g => g.mysteryOpened >= 1 },
  { id: 'turbo_50',      name: 'טורבו מכור',      icon: '🚀', cond: g => g.turboUses >= 50 },
  { id: 'score_1000',    name: 'אלף נקודות',      icon: '⭐', cond: g => g.bestScore >= 1000 },
  { id: 'score_5000',    name: 'אלוף הזירה',      icon: '🏆', cond: g => g.bestScore >= 5000 },
  { id: 'flawless',      name: 'שלב מושלם',       icon: '✨', cond: g => g.flawlessLevels >= 1 },
  { id: 'sub2s',         name: 'מהיר כברק',       icon: '⚡', cond: g => g.sub2sAnswers >= 1 },
  { id: 'rainbow',       name: 'אבן הקשת',        icon: '🌈', cond: g => g.rainbowGems >= 1 },
  { id: 'mp_play',       name: 'אתגר חברים',      icon: '🤝', cond: g => g.mpGames >= 1 },
  { id: 'mp_win',        name: 'אלוף רב-שחקנים',  icon: '🥇', cond: g => g.mpWins >= 1 },
];

// Difficulty tier descriptors (used for UI badges + adapt messaging)
export const DIFFICULTY_TIERS = [
  { id: 'rookie',    name: 'טירון',       maxF: 3,  color: '#34D399', minLevel: 1 },
  { id: 'cadet',     name: ' debí',      maxF: 4,  color: '#22D3EE', minLevel: 3 },
  { id: 'pilot',     name: 'טייס',        maxF: 6,  color: '#3B82F6', minLevel: 6 },
  { id: 'ace',       name: 'אלוף טייס',   maxF: 8,  color: '#A78BFA', minLevel: 10 },
  { id: 'master',    name: 'מאסטר',       maxF: 10, color: '#F472B6', minLevel: 15 },
  { id: 'legend',    name: 'אגדה',        maxF: 12, color: '#FBBF24', minLevel: 21 },
];

// Per-level hand-tuned spawn tweaks (optional overrides)
export const LEVEL_TWEAKS = {
  1:  { bombChance: 0,    desc: 'התחלה — רק תיבות רגילות' },
  2:  { desc: 'טורבו ודש מתאפשרים' },
  3:  { desc: 'תיבות זהב מופיעות' },
  4:  { desc: 'פצצות מופיעות — זהירות!' },
  5:  { challenge: true, bombBoost: true, desc: 'אתגר: בומבל' },
  6:  { desc: 'תיבות זזות, נושא חלל' },
  7:  { desc: 'תיבות מגה ופאוור-אפים' },
  8:  { desc: 'תיבות תעלומה' },
  10: { challenge: true, moveBoost: true, desc: 'אתגר: מהירות כפולה' },
  12: { desc: 'נושא ג\'ונגל' },
  15: { challenge: true, desc: 'אתגר: לבה עולה' },
  18: { desc: 'נושא ממתקים' },
  20: { challenge: true, noSkip: true, desc: 'אתגר: ללא ויתורים' },
  24: { desc: 'נושא אוקיינוס' },
  25: { challenge: true, megaBoost: true, desc: 'אתגר: מגה-מטור' },
  30: { challenge: true, allBoost: true, desc: 'אתגר: כל האתגרים' },
};

// Help / FAQ strings (shown in a help dialog)
export const HELP = {
  goal: 'פתחי תיבות כפל על ידי נגיעה בהן עם הבלוק שלך, עני נכוחה, ואסוף אבנים. הגיעי למטרת השלב כדי לעלות.',
  boxTypes: 'תיבות זהב = ×2 ניקוד. פצצות = עני לפני שהפתיל נגמר! מגה = ×3 + פאוור-אפ. תעלומה = הפתעה.',
  combo: 'כל תשובה נכונה ברצף מעלה את המכפיל. טעות מאפסת את הרצץ. ב-x5 נפתחות תיבות רצץ מיוחדות.',
  adaptive: 'המשחק זוכר אילו תרגילים קשים לך ומתרגל אותם יותר. ככל שמשתפרת — הרמה עולה.',
  multiplayer: 'בדו-קרב: צרי חדר, שתפי את הקוד עם חבר, והראשון שפותר את מטרת השלב מנצח.',
  powerups: 'מגן בולם טעות אחת. ×2 מכפיל ניקוד. מגנט מושך אבנים. הקפאה עוצרת זמן. הילוך איטי מאט הכל.',
  controls: 'חצים/WASD = תנועה. Shift = טורבו. רווח = דש. 1-4 או עכבר = תשובות. S = דילוג. Esc/P = השהיה.',
};

