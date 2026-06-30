// ============================================================
// background.js — Multi-layer parallax background
// Gradient mesh, nebula wells, dual starfields, perspective grid,
// vignette, scanlines. All pure Canvas2D. Responds to INTENSITY.
// ============================================================

import { rand, clamp, hexA } from '../core/utils.js';

class Background {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.starsFar = []; this.starsNear = []; this.nebula = [];
    this.intensity = 0;
    this.hue = 200;
    this._rebuild();
  }

  resize(w, h) { this.w = w; this.h = h; this._rebuild(); }
  setHue(h) { this.hue = h; }
  setIntensity(v) { this.intensity = clamp(v, 0, 1); }

  _rebuild() {
    const { w, h } = this;
    this.starsFar = [];
    for (let i = 0; i < 140; i++) this.starsFar.push({ x: Math.random() * w, y: Math.random() * h, s: rand(0.5, 1.2), ph: Math.random() * 6.28 });
    this.starsNear = [];
    for (let i = 0; i < 50; i++) this.starsNear.push({ x: Math.random() * w, y: Math.random() * h, s: rand(1, 2), ph: Math.random() * 6.28 });
    this.nebula = [];
    const cols = ['#22D3EE', '#A78BFA', '#F472B6', '#3B82F6'];
    for (let i = 0; i < 6; i++) this.nebula.push({ x: Math.random() * w, y: Math.random() * h, r: rand(120, 260), c: cols[i % cols.length], ph: Math.random() * 6.28, sp: rand(0.05, 0.2) });
  }

  render(ctx, t, px, py, bounds, lowHealth) {
    const { w, h, hue, intensity } = this;
    // base gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `hsl(${hue} 55% 9%)`);
    g.addColorStop(1, `hsl(${(hue + 30) % 360} 60% 5%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // nebula wells (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const n of this.nebula) {
      const nx = n.x + Math.sin(t * n.sp + n.ph) * 40 - px * 0.03;
      const ny = n.y + Math.cos(t * n.sp * 0.8 + n.ph) * 40 - py * 0.03;
      const rg = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
      const a = 0.18 + intensity * 0.1;
      rg.addColorStop(0, hexA(n.c, a));
      rg.addColorStop(1, hexA(n.c, 0));
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(nx, ny, n.r, 0, 6.28); ctx.fill();
    }

    // stars (parallax)
    for (const s of this.starsFar) {
      const a = 0.3 + 0.3 * Math.abs(Math.sin(t * 1.2 + s.ph));
      ctx.fillStyle = `rgba(200,220,255,${a})`;
      const sx = (s.x - px * 0.05 + w) % w;
      ctx.fillRect(sx, s.y, s.s, s.s);
    }
    for (const s of this.starsNear) {
      const a = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + s.ph));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      const sx = (s.x - px * 0.12 + w) % w;
      ctx.fillRect(sx, s.y, s.s, s.s);
    }
    ctx.globalCompositeOperation = 'source-over';

    // perspective grid
    if (bounds) {
      const gs = 46;
      ctx.save();
      ctx.strokeStyle = `hsla(${hue} 80% 60% / ${0.08 + intensity * 0.04})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = bounds.l; x <= bounds.r; x += gs) { ctx.moveTo(x, bounds.t); ctx.lineTo(x, bounds.b); }
      for (let y = bounds.t; y <= bounds.b; y += gs) { ctx.moveTo(bounds.l, y); ctx.lineTo(bounds.r, y); }
      ctx.stroke();

      // border glow breathing
      const bp = 18 + Math.sin(t * 2) * 6 + intensity * 8;
      ctx.strokeStyle = `hsla(${hue} 90% 65% / 0.5)`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = bp; ctx.shadowColor = `hsla(${hue} 90% 65% / 0.6)`;
      ctx.strokeRect(bounds.l, bounds.t, bounds.r - bounds.l, bounds.b - bounds.t);
      ctx.shadowBlur = 0;

      // low health red border
      if (lowHealth) {
        const p = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.strokeStyle = `rgba(248,113,113,${0.3 + p * 0.3})`;
        ctx.shadowBlur = 30; ctx.shadowColor = '#F87171';
        ctx.strokeRect(bounds.l, bounds.t, bounds.r - bounds.l, bounds.b - bounds.t);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    // player light orb on floor
    if (px != null) {
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(px, py, 0, px, py, 130);
      rg.addColorStop(0, 'rgba(34,211,238,0.15)');
      rg.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(px, py, 130, 0, 6.28); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

export { Background };
