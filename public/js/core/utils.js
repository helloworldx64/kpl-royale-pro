// ============================================================
// utils.js — Math, easing, random helpers
// ============================================================

export const rand = (a, b) => a + Math.random() * (b - a);
export const irand = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export const T = () => performance.now();
export const nowS = () => performance.now() / 1000;
export const deg = r => r * 180 / Math.PI;
export const rad = d => d * Math.PI / 180;
export const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
export const mod = (n, m) => ((n % m) + m) % m;

// Shortest-angle lerp — never spins wildly
export function angLerp(a, b, t) {
  let d = mod(b - a + Math.PI, Math.PI * 2) - Math.PI;
  return a + d * t;
}

// ---- Easing functions ----
export const Easing = {
  linear: t => t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  inOutQuad: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

// Tween runner — fire-and-forget eased value tweens with onComplete
export class Tween {
  constructor(from, to, dur, ease = Easing.outCubic, onUpdate, onComplete) {
    this.from = from; this.to = to; this.dur = dur; this.ease = ease;
    this.onUpdate = onUpdate; this.onComplete = onComplete;
    this.t = 0; this.done = false; this.val = from;
  }
  step(dt) {
    if (this.done) return;
    this.t += dt;
    const n = clamp(this.t / this.dur, 0, 1);
    this.val = this.from + (this.to - this.from) * this.ease(n);
    if (this.onUpdate) this.onUpdate(this.val);
    if (n >= 1) { this.done = true; if (this.onComplete) this.onComplete(); }
  }
}

// Color helpers
export function shade(hex, amt) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const n = parseInt(full, 16);
  let r = clamp((n >> 16) + amt, 0, 255);
  let g = clamp(((n >> 8) & 255) + amt, 0, 255);
  let b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function hexA(hex, a) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const n = parseInt(full, 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Weighted pick from {key: weight} map
export function weightedPick(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
  return Object.keys(weights)[0];
}

// Generate a random room code (no ambiguous chars)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function roomCode(len = 5) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return s;
}

// Format number with thousands sep (Hebrew uses ',')
export function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }

// Debounce
export function debounce(fn, ms) {
  let h = null;
  return (...args) => { clearTimeout(h); h = setTimeout(() => fn(...args), ms); };
}

// Detect prefers-reduced-motion
export function prefersReducedMotion() {
  return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
