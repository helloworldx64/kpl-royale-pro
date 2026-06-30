// ============================================================
// tutorial.js — First-run interactive onboarding
// Walks the player through movement, opening a box, answering,
// turbo, and dash with coach-mark tooltips. Runs once (saved).
// ============================================================

import { I18N } from '../data/i18n.js';
import { store } from '../core/storage.js';

const STEPS = [
  {
    id: 'move',
    title: 'זוזי עם החצים!',
    text: 'השתמשי בחצים או ב-WASD כדי לנוע בזירה. במובייל — גררי על המסך.',
    target: 'player',
    waitFor: (game) => { const v = game.input.dir(); return v.x !== 0 || v.y !== 0; },
    timeout: null,
  },
  {
    id: 'box',
    title: 'פתחי תיבת כפל!',
    text: 'נסעי אל התיבה הקרובה כדי לפתוח אותה ולקבל שאלת כפל.',
    target: 'box',
    waitFor: (game) => game.state === 'quiz',
    timeout: null,
  },
  {
    id: 'answer',
    title: 'עני נכוחה!',
    text: 'לחצי על התשובה הנכונה או הקלידי 1-4. תשובה נכונה = ניקוד + רצץ!',
    target: 'quiz',
    waitFor: (game) => game.state === 'play' && game.answered >= 1,
    timeout: null,
  },
  {
    id: 'turbo',
    title: 'טורבו!',
    text: 'לחיצה על Shift (או כפתור טורבו) מזרזת אותך — אבל מרוקנת את מד האנרגיה.',
    target: 'turbo',
    waitFor: (game) => game.turboUses >= 1 || game.turbo < 0.9,
    timeout: 8000,
  },
  {
    id: 'dash',
    title: 'דש!',
    text: 'רווח (או כפתור דש) נותן זריקה מהירה להתחמקות. מתמלא כל שנייה.',
    target: 'dash',
    waitFor: (game) => game.dash < 0.95,
    timeout: 8000,
  },
];

class Tutorial {
  constructor() {
    this.active = false;
    this.step = 0;
    this._timeoutT = null;
    this.onStep = null;     // (stepData) => {}
    this.onDone = null;
  }

  maybeStart() {
    // Run tutorial on first ever play (no achievements, level 1)
    if (!store.get('onboardingDone')) {
      this.start();
      return true;
    }
    return false;
  }

  start() {
    this.active = true; this.step = 0;
    this._show();
  }

  _show() {
    if (this.step >= STEPS.length) { this.finish(); return; }
    const s = STEPS[this.step];
    if (this.onStep) this.onStep(s);
    if (s.timeout) {
      clearTimeout(this._timeoutT);
      this._timeoutT = setTimeout(() => this.next(), s.timeout);
    }
  }

  // Called each frame from the game loop
  tick(game) {
    if (!this.active) return;
    const s = STEPS[this.step];
    if (s && s.waitFor && s.waitFor(game)) this.next();
  }

  next() {
    clearTimeout(this._timeoutT);
    this.step++;
    if (this.step >= STEPS.length) this.finish();
    else this._show();
  }

  finish() {
    this.active = false;
    store.set('onboardingDone', true);
    if (this.onDone) this.onDone();
  }

  skip() { this.finish(); }
}

export { Tutorial };
