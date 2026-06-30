// ============================================================
// input.js — Unified input (keyboard + touch joystick + mobile buttons)
// Produces a normalized {dir, turbo, dash} each frame.
// ============================================================

import { device } from './device.js';

class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.vec = { x: 0, y: 0 };
    this.turboHeld = false;
    this.dashQueued = false;
    this.skipQueued = false;
    this.pauseQueued = false;
    this.answerKey = null;       // 1..4 when pressed

    // touch joystick state
    this._tId = null;
    this._tStart = null;
    this._tVec = { x: 0, y: 0 };

    this._setup();
  }

  _setup() {
    // Keyboard
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys[e.key] = true;
      if (e.key === ' ') this.dashQueued = true;
      if ((e.key === 's' || e.key === 'S') && !e.repeat) this.skipQueued = true;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') this.pauseQueued = true;
      if (/^[1-4]$/.test(e.key)) this.answerKey = +e.key;
      this.turboHeld = !!(this.keys['Shift'] || this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    });
    window.addEventListener('keyup', e => {
      this.keys[e.key] = false;
      this.turboHeld = !!(this.keys['Shift'] || this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    });
    window.addEventListener('blur', () => { this.keys = {}; this.turboHeld = false; this._tId = null; this._tVec = { x: 0, y: 0 }; });

    // Touch on canvas → joystick
    if (device.isTouch) {
      this.canvas.addEventListener('touchstart', e => {
        if (this._tId === null && e.touches[0]) {
          this._tId = e.touches[0].identifier;
          this._tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }, { passive: true });
      this.canvas.addEventListener('touchmove', e => {
        for (const t of e.touches) {
          if (t.identifier === this._tId) {
            this._tVec.x = t.clientX - this._tStart.x;
            this._tVec.y = t.clientY - this._tStart.y;
          }
        }
        e.preventDefault();
      }, { passive: false });
      this.canvas.addEventListener('touchend', e => {
        let still = false;
        for (const t of e.touches) if (t.identifier === this._tId) still = true;
        if (!still) { this._tId = null; this._tVec = { x: 0, y: 0 }; }
      }, { passive: true });
    }
  }

  // Mobile button hooks (called by MobileControls UI)
  setTurboButton(active) { this._mobTurbo = active; this.turboHeld = active || !!(this.keys['Shift']); }
  triggerDash() { this.dashQueued = true; }

  // Read movement vector for this frame
  dir() {
    let x = 0, y = 0;
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) x -= 1;
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) x += 1;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) y -= 1;
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) y += 1;
    if (this._tVec.x || this._tVec.y) {
      const m = Math.hypot(this._tVec.x, this._tVec.y);
      if (m > 10) { x = this._tVec.x / m; y = this._tVec.y / m; }
    }
    return { x, y };
  }

  // Consume one-shot events
  consumeDash() { const d = this.dashQueued; this.dashQueued = false; return d; }
  consumeSkip() { const s = this.skipQueued; this.skipQueued = false; return s; }
  consumePause() { const p = this.pauseQueued; this.pauseQueued = false; return p; }
  consumeAnswerKey() { const a = this.answerKey; this.answerKey = null; return a; }

  reset() { this.keys = {}; this._tVec = { x: 0, y: 0 }; this._tId = null; this.turboHeld = false; }
}

export { Input };
