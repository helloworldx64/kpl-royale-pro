// ============================================================
// stats.js — Runtime statistics tracker (session + lifetime)
// Feeds the achievements system and the dashboard.
// ============================================================

import { store } from '../core/storage.js';

class StatsTracker {
  constructor() {
    this.session = this._fresh();
  }

  _fresh() {
    return {
      startTime: performance.now(),
      boxesOpened: 0,
      boxesCorrect: 0,
      gemsCollected: 0,
      turboUses: 0,
      dashes: 0,
      bestCombo: 0,
      fastestAnswer: Infinity,
      slowestAnswer: 0,
      totalAnswerTime: 0,
      levelReached: 1,
      bombsDefused: 0,
      bombsExploded: 0,
      mysteryOpened: 0,
      powerupsUsed: 0,
      flawless: true,
    };
  }

  reset() { this.session = this._fresh(); }

  answer(ok, rt) {
    this.session.boxesOpened++;
    if (ok) {
      this.session.boxesCorrect++;
      this.session.fastestAnswer = Math.min(this.session.fastestAnswer, rt);
      this.session.slowestAnswer = Math.max(this.session.slowestAnswer, rt);
      this.session.totalAnswerTime += rt;
    } else {
      this.session.flawless = false;
    }
  }

  gem() { this.session.gemsCollected++; }
  turbo() { this.session.turboUses++; store.inc('turboUses'); }
  dash() { this.session.dashes++; }
  combo(c) { this.session.bestCombo = Math.max(this.session.bestCombo, c); }
  bombDefused() { this.session.bombsDefused++; store.inc('bombsDefused'); }
  bombExploded() { this.session.bombsExploded++; }
  mystery() { this.session.mysteryOpened++; store.inc('mysteryOpened'); }
  powerup() { this.session.powerupsUsed++; }
  level(l) { this.session.levelReached = Math.max(this.session.levelReached, l); }

  // Commit session stats to persistent storage
  commit() {
    const s = this.session;
    store.set('bestComboEver', Math.max(store.get('bestComboEver') || 0, s.bestCombo));
    store.set('maxLevel', Math.max(store.get('maxLevel') || 1, s.levelReached));
    const playTime = (performance.now() - s.startTime) / 1000;
    store.set('totalPlayTime', (store.get('totalPlayTime') || 0) + playTime);
    store.set('totalScore', (store.get('totalScore') || 0) + 0); // score handled separately
  }

  // Average response time this session (seconds)
  avgRT() {
    const s = this.session;
    return s.boxesCorrect ? s.totalAnswerTime / s.boxesCorrect / 1000 : 0;
  }

  sessionAccuracy() {
    const s = this.session;
    return s.boxesOpened ? s.boxesCorrect / s.boxesOpened : 0;
  }

  summary() {
    const s = this.session;
    return {
      boxesOpened: s.boxesOpened,
      accuracy: this.sessionAccuracy(),
      bestCombo: s.bestCombo,
      gems: s.gemsCollected,
      level: s.levelReached,
      avgRT: this.avgRT(),
      fastestRT: s.fastestAnswer === Infinity ? 0 : s.fastestAnswer / 1000,
      flawless: s.flawless,
      playTime: (performance.now() - s.startTime) / 1000,
    };
  }
}

export const stats = new StatsTracker();
