// ============================================================
// facts.js — Adaptive multiplication engine
// Tracks per-fact mastery (accuracy + speed + recency), weights
// selection toward weak/recently-wrong facts, grows/shrinks the
// factor ceiling based on performance. Spaced-repetition aware.
// ============================================================

import { clamp, weightedPick } from '../core/utils.js';
import { store } from '../core/storage.js';

class FactsEngine {
  constructor() {
    this.maxA = 3; this.maxB = 3;
    this._localStats = {};  // session-only (fast access)
  }

  reset() { this._localStats = {}; this.maxA = 3; this.maxB = 3; }

  // Record an answer; updates both session stats and persistent mastery
  record(a, b, ok, rt) {
    const k = a + 'x' + b;
    let s = this._localStats[k] || { n: 0, c: 0, sumRT: 0, last: 0, recent: [] };
    s.n++; if (ok) s.c++; s.sumRT += rt; s.last = performance.now();
    s.recent = [ok ? 1 : 0, ...s.recent].slice(0, 5);
    this._localStats[k] = s;
    store.recordMastery(a, b, ok, rt);
    this.adapt();
  }

  // Session accuracy for a fact
  acc(a, b) {
    const s = this._localStats[a + 'x' + b];
    return s ? s.c / s.n : 0.5;
  }

  avgRT(a, b) {
    const s = this._localStats[a + 'x' + b];
    return s && s.n ? s.sumRT / s.n : 3000;
  }

  // Mastery score M(f) ∈ [0,1]: accuracy + speed + recency
  mastery(a, b) {
    const s = this._localStats[a + 'x' + b];
    if (!s || s.n < 3) return 0.5;
    const A = s.c / s.n;
    const R = s.sumRT / s.n / 1000;
    const E = Math.min(6, 3 + 0.15 * (a + b - 2));
    const S = clamp(E / Math.max(R, 0.1), 0, 1);
    const Rc = Math.exp(-(performance.now() - s.last) / 300000);
    return 0.5 * A + 0.3 * S + 0.2 * Rc;
  }

  overall() {
    let n = 0, c = 0;
    for (const k in this._localStats) { n += this._localStats[k].n; c += this._localStats[k].c; }
    return n ? c / n : 0.5;
  }

  // Adapt factor ceiling: promote when accurate, demote when struggling
  adapt() {
    const a = this.overall();
    if (a > 0.85 && this.maxA < 12) { this.maxA = Math.min(12, this.maxA + 1); this.maxB = Math.min(12, this.maxB + 1); }
    else if (a < 0.5 && this.maxA > 3) { this.maxA = Math.max(3, this.maxA - 1); this.maxB = Math.max(3, this.maxB - 1); }
  }

  // Set ceiling by level (deterministic growth)
  setCeilingForLevel(L) {
    const fmax = clamp(2 + Math.floor((L - 1) / 2), 2, 12);
    this.maxA = Math.max(this.maxA, fmax);
    this.maxB = Math.max(this.maxB, fmax);
  }

  _zeros(recent) { return recent.filter(x => x === 0).length; }

  // Pick a fact, weighted toward weak/recently-wrong ones.
  // `hard` boosts large factors (for mega/golden/combo boxes).
  pick(hard = false) {
    const cands = [];
    for (let a = 2; a <= this.maxA; a++) for (let b = 2; b <= this.maxB; b++) cands.push([a, b]);
    const weights = {};
    for (const [a, b] of cands) {
      const m = this.mastery(a, b);
      const s = this._localStats[a + 'x' + b];
      const wb = s ? 1 + 2 * this._zeros(s.recent) : 1.5;
      const wt = (hard && a + b > this.maxA + this.maxB - 2) ? 2 : 1;
      weights[a + 'x' + b] = (0.15 + (1 - m) * (1 - m)) * wb * wt;
    }
    const key = weightedPick(weights);
    const [a, b] = key.split('x').map(Number);
    return [a, b];
  }

  // Build a question: 4 plausible choices (1 correct + 3 near-miss distractors)
  question(type) {
    const hard = type === 'mega' || type === 'golden' || type === 'combo';
    const [a, b] = this.pick(hard);
    const ans = a * b;
    const set = new Set([ans]);
    const ds = [-1, 1, -a, a, 2, -2, -b, b, a - 1, b + 1, -10, 10, a + 1, b - 1];
    for (const d of ds) {
      if (set.size >= 4) break;
      const v = ans + d;
      if (v >= 0 && v !== ans) set.add(v);
    }
    while (set.size < 4) set.add(Math.max(0, ans + (Math.floor(Math.random() * 15) - 7)));
    const arr = [...set].slice(0, 4);
    // shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return { a, b, answer: ans, choices: arr };
  }

  // Weakest facts for the mastery dashboard
  weakest(n = 5) {
    const arr = [];
    for (const k in this._localStats) {
      const [a, b] = k.split('x').map(Number);
      arr.push({ a, b, m: this.mastery(a, b) });
    }
    arr.sort((x, y) => x.m - y.m);
    return arr.slice(0, n);
  }
}

export { FactsEngine };
