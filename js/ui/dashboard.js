// ============================================================
// dashboard.js — Mastery heatmap & stats dashboard (canvas-rendered)
// Shows a 12×12 grid of multiplication fact mastery, color-coded
// red→green. Click a cell for details. Used in the drawer.
// ============================================================

import { store } from '../core/storage.js';
import { clamp } from '../core/utils.js';

class Dashboard {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hover = null;
    this._setup();
  }

  _setup() {
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      this.hover = this._cellAt(x, y);
      this.render();
    });
    this.canvas.addEventListener('mouseleave', () => { this.hover = null; this.render(); });
  }

  _cellAt(x, y) {
    const n = 12, cell = this.canvas.width / n;
    const i = Math.floor(x / cell), j = Math.floor(y / cell);
    if (i < 0 || i >= n || j < 0 || j >= n) return null;
    return { a: i + 1, b: j + 1 };
  }

  render() {
    const ctx = this.ctx;
    const n = 12;
    const w = this.canvas.width, h = this.canvas.height;
    const cell = w / n;
    ctx.clearRect(0, 0, w, h);
    // background
    ctx.fillStyle = 'rgba(10,16,34,0.6)';
    ctx.fillRect(0, 0, w, h);

    for (let a = 1; a <= n; a++) {
      for (let b = 1; b <= n; b++) {
        const m = this._mastery(a, b);
        const x = (a - 1) * cell, y = (b - 1) * cell;
        // color: red (low) → yellow (mid) → green (high)
        const col = this._color(m);
        ctx.fillStyle = col;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        // label
        ctx.fillStyle = m > 0.6 ? '#0b1020' : '#fff';
        ctx.font = `700 ${Math.floor(cell * 0.35)}px Heebo, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a * b, x + cell / 2, y + cell / 2);
        // hover highlight
        if (this.hover && this.hover.a === a && this.hover.b === b) {
          ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
    }
    // axis labels
    ctx.fillStyle = 'var(--dim)';
    ctx.font = '700 10px Heebo, sans-serif';
    for (let i = 1; i <= n; i++) {
      ctx.fillStyle = '#8AA0C4';
      ctx.textAlign = 'center';
      ctx.fillText(i, (i - 0.5) * cell, 8);
      ctx.fillText(i, 8, (i - 0.5) * cell);
    }
  }

  _mastery(a, b) {
    const s = store.getMastery(a, b);
    if (!s || s.n < 1) return 0; // unseen = red
    const acc = s.c / s.n;
    return acc;
  }

  _color(m) {
    // m ∈ [0,1]: 0 = red, 0.5 = yellow/orange, 1 = green
    if (m === 0) return 'rgba(248,113,113,0.18)'; // unseen
    const r = clamp(255 - m * 255 * 1.3, 0, 255);
    const g = clamp(m * 255, 0, 255);
    return `rgba(${r | 0},${g | 0},60,0.85)`;
  }

  // Hovered cell detail string
  detail() {
    if (!this.hover) return null;
    const { a, b } = this.hover;
    const s = store.getMastery(a, b);
    if (!s) return `${a}×${b}: טרם תורגל`;
    const acc = Math.round((s.c / s.n) * 100);
    const avg = (s.sumRT / s.n / 1000).toFixed(1);
    return `${a}×${b}=${a * b} · דיוק ${acc}% · מהירות ${avg}s · ${s.n} ניסיונות`;
  }
}

export { Dashboard };
