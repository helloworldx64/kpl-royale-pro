// ============================================================
// storage.js — localStorage persistence (schema-versioned, safe)
// ============================================================

import { CONFIG } from '../data/config.js';

const DEFAULTS = {
  schema: CONFIG.SAVE_SCHEMA,
  highScore: 0,
  bestCombo: 0,
  bestScore: 0,
  maxLevel: 1,
  totalScore: 0,
  totalCorrect: 0,
  totalGems: 0,
  totalPlayTime: 0,
  turboUses: 0,
  bombsDefused: 0,
  mysteryOpened: 0,
  rainbowGems: 0,
  sub2sAnswers: 0,
  flawlessLevels: 0,
  bestComboEver: 0,
  stars: 0,
  unlocks: { skins: ['rocket'], trails: ['default'], themes: ['grid'] },
  achievements: {},
  settings: { sound: true, music: true, reduceMotion: false },
  mastery: {},
  stats: { mpGames: 0, mpWins: 0 },
};

class Store {
  constructor() { this.d = structuredClone(DEFAULTS); this._load(); }

  _load() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.schema !== CONFIG.SAVE_SCHEMA) {
        parsed = this._migrate(parsed);
      }
      this.d = { ...structuredClone(DEFAULTS), ...parsed };
      // deep-merge nested
      this.d.unlocks = { ...DEFAULTS.unlocks, ...(parsed.unlocks || {}) };
      this.d.settings = { ...DEFAULTS.settings, ...(parsed.settings || {}) };
      this.d.stats = { ...DEFAULTS.stats, ...(parsed.stats || {}) };
    } catch (e) { console.warn('Save load failed, using defaults', e); }
  }

  _migrate(old) {
    // v2 → v3 example: carry over what we can, reset mastery
    return { ...old, schema: CONFIG.SAVE_SCHEMA, mastery: {} };
  }

  save() {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(this.d)); }
    catch (e) { console.warn('Save failed', e); }
  }

  get(k) { return this.d[k]; }
  set(k, v) { this.d[k] = v; this.save(); }

  // Increment a numeric stat
  inc(k, by = 1) { this.d[k] = (this.d[k] || 0) + by; this.save(); }

  // Update mastery for a fact
  recordMastery(a, b, ok, rt) {
    const key = a + 'x' + b;
    const m = this.d.mastery[key] || { n: 0, c: 0, sumRT: 0, last: 0, recent: [] };
    m.n++; if (ok) m.c++; m.sumRT += rt; m.last = performance.now();
    m.recent = (ok ? 1 : 0) ? [1, ...m.recent] : [0, ...m.recent];
    m.recent = m.recent.slice(0, 5);
    this.d.mastery[key] = m;
    this.save();
  }

  getMastery(a, b) { return this.d.mastery[a + 'x' + b]; }

  // Check & mark an achievement earned (returns true if newly earned)
  ach(id) {
    if (this.d.achievements[id]) return false;
    this.d.achievements[id] = { t: Date.now() };
    this.save();
    return true;
  }

  hasSkin(id) { return this.d.unlocks.skins.includes(id); }
  unlockSkin(id) { if (!this.hasSkin(id)) { this.d.unlocks.skins.push(id); this.save(); } }

  hasAch(id) { return !!this.d.achievements[id]; }

  reset() { this.d = structuredClone(DEFAULTS); this.save(); }
}

export const store = new Store();
