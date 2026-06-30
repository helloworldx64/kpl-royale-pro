// ============================================================
// levels.js — Level configuration, box-type weighting, progression
// ============================================================

import { CONFIG, BOX_TYPES } from '../data/config.js';
import { clamp } from '../core/utils.js';

class Levels {
  // Goal (boxes to solve) for a level
  goal(L) { return CONFIG.LEVEL.GOAL_BASE + CONFIG.LEVEL.GOAL_PER_LEVEL * L; }

  // Level time limit
  timeLimit(L) { return CONFIG.LEVEL.TIME_BASE + CONFIG.LEVEL.TIME_PER_LEVEL * L; }

  // Score goal for star thresholds
  scoreGoal(L) { return CONFIG.LEVEL.SCORE_GOAL_BASE + CONFIG.LEVEL.SCORE_GOAL_PER_LEVEL * L; }

  // Factor ceiling for level
  fmax(L) { return clamp(2 + Math.floor((L - 1) / 2), CONFIG.LEVEL.FMAX_MIN, CONFIG.LEVEL.FMAX_MAX); }

  // Concurrent boxes target
  concurrent(L) { return clamp(2 + Math.floor(L / 5), CONFIG.SPAWN.CONCURRENT_MIN, CONFIG.SPAWN.CONCURRENT_MAX); }

  // Spawn interval (ms)
  spawnInterval(L) { return Math.max(CONFIG.SPAWN.INTERVAL_MIN, CONFIG.SPAWN.INTERVAL_BASE - CONFIG.SPAWN.INTERVAL_DECAY * L); }

  // Box despawn time (s)
  boxDespawn(L) { return Math.max(CONFIG.SPAWN.BOX_DESPAWN_MIN, CONFIG.SPAWN.BOX_DESPAWN_BASE - CONFIG.SPAWN.BOX_DESPAWN_DECAY * L); }

  // Question time limit
  questionTime(L, a, b) {
    return Math.max(CONFIG.QUESTION.TIME_FLOOR, CONFIG.QUESTION.TIME_BASE - CONFIG.QUESTION.TIME_DECAY_PER_LEVEL * L)
      * (1 + CONFIG.QUESTION.TIME_FACTOR_BONUS * (a + b - 4));
  }

  // Build weighted box-type map for a given level + state
  boxWeights(L, combo, hearts, maxHearts) {
    const w = {};
    for (const [k, def] of Object.entries(BOX_TYPES)) {
      const weight = def.weight;
      let v = weight.base;
      if (weight.decay) v = Math.max(20, weight.base - weight.decay * L);
      if (weight.grow) v = weight.base + weight.grow * L;
      if (weight.cap) v = Math.min(weight.cap, v);
      if (weight.cond === 'hurt' && hearts >= maxHearts) v = 0;
      if (weight.cond === 'combo5' && combo < 5) v = 0;
      w[k] = Math.max(0, v);
    }
    return w;
  }

  // Pick a box type for spawning
  pickType(L, combo, hearts, maxHearts) {
    const w = this.boxWeights(L, combo, hearts, maxHearts);
    let total = 0; for (const k in w) total += w[k];
    if (total <= 0) return 'normal';
    let r = Math.random() * total;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'normal';
  }

  // Challenge level modifiers (every 5th)
  isChallenge(L) { return L % 5 === 0 && L > 0; }

  challengeMod(L) {
    const mods = {
      5: 'בומבל — המון פצצות',
      10: 'מהירות כפולה — תיבות זזות',
      15: 'לבה עולה',
      20: 'ללא ויתורים',
      25: 'מגה-מטור — מגה תיבות',
      30: 'כל האתגרים',
    };
    return mods[L] || null;
  }
}

export const levels = new Levels();
