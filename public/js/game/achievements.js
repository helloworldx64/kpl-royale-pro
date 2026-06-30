// ============================================================
// achievements.js — Check & unlock achievements, show toasts
// ============================================================

import { ACHIEVEMENTS } from '../data/config.js';
import { store } from '../core/storage.js';
import { audio } from '../core/audio.js';

class AchievementManager {
  constructor() { this._onUnlock = null; }

  onUnlock(fn) { this._onUnlock = fn; }

  // Evaluate all achievements against current stats; fire newly-earned ones
  checkAll(stats) {
    for (const ach of ACHIEVEMENTS) {
      if (store.hasAch(ach.id)) continue;
      try {
        if (ach.cond(stats)) {
          if (store.ach(ach.id)) {
            audio.ach();
            if (this._onUnlock) this._onUnlock(ach);
          }
        }
      } catch (e) { /* skip malformed */ }
    }
  }

  // Manually trigger one (for event-based like bomb_survivor)
  trigger(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach || store.hasAch(id)) return;
    if (store.ach(id)) { audio.ach(); if (this._onUnlock) this._onUnlock(ach); }
  }
}

export const achievements = new AchievementManager();
