// ============================================================
// scoring.js — Scoring & combo logic
// ============================================================

import { CONFIG, BOX_TYPES } from '../data/config.js';
import { clamp } from '../core/utils.js';

const C = CONFIG.SCORE;

class Scoring {
  // Points for a correct answer
  correct(combo, boxType, rt, qTimeLimit, score2xActive) {
    const speedBonus = Math.floor(C.SPEED_BONUS_MAX * clamp(1 - rt / 1000 / qTimeLimit, 0, 1));
    const comboMult = Math.min(C.COMBO_MULT_MAX, 1 + 0.5 * Math.floor(combo / C.COMBO_STEP));
    const def = BOX_TYPES[boxType] || BOX_TYPES.normal;
    const globalMult = score2xActive ? 2 : 1;
    return Math.floor((C.BASE + speedBonus) * comboMult * def.mult * globalMult);
  }

  comboMult(combo) {
    return Math.min(C.COMBO_MULT_MAX, 1 + 0.5 * Math.floor(combo / C.COMBO_STEP));
  }

  // Level clear bonus
  levelClear(level, stars, flawless) {
    return C.LEVEL_CLEAR_BASE + C.LEVEL_CLEAR_PER_LEVEL * level
      + C.LEVEL_CLEAR_PER_STAR * stars + (flawless ? C.LEVEL_CLEAR_FLAWLESS : 0);
  }

  // Gem points (raw, but doubled by global 2×)
  gem(def, score2xActive) {
    return def.pts * (score2xActive ? 2 : 1);
  }

  // Star rating for a level
  stars(gained, scoreGoal, flawless) {
    let s = 1;
    if (gained >= C.LEVEL_CLEAR_FLAWLESS * scoreGoal) s = 2;
    if (gained >= CONFIG.LEVEL.STAR_3_THRESHOLD * scoreGoal && flawless) s = 3;
    return s;
  }
}

export const scoring = new Scoring();
