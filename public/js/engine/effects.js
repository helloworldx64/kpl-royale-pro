// ============================================================
// effects.js — Screen-space effects: shake, flashes, rings,
// popups, slow-mo, zoom, radial wipe.
// ============================================================

import { rand, clamp, Easing } from '../core/utils.js';

class Effects {
  constructor(reduceMotion = false) {
    this.shake = 0;
    this.flashes = [];     // {color, a, life, max}
    this.rings = [];       // {x, y, r, spd, color, life, max}
    this.popups = [];      // {x, y, text, color, life, max, vy, size}
    this.timeScale = 1;
    this.zoom = 1;
    this.wipe = 0; this.wipeDir = 0; this.wipeX = 0; this.wipeY = 0;
    this.reduceMotion = reduceMotion;
  }

  setReduceMotion(v) { this.reduceMotion = v; }

  addShake(v) { if (!this.reduceMotion) this.shake = Math.min(16, this.shake + v); }
  flash(color, a = 0.4, life = 0.3) { this.flashes.push({ color, a, life, max: life }); }
  ring(x, y, color, spd = 280, life = 0.5) { this.rings.push({ x, y, r: 6, spd, color, life, max: life }); }
  popup(x, y, text, color, size = 22) { this.popups.push({ x, y, text, color, life: 1, max: 1, vy: -50, size, sc: 0 }); }

  startWipe(x, y) { this.wipe = 0.001; this.wipeDir = 1; this.wipeX = x; this.wipeY = y; }

  // Slow-mo + zoom for hero moments
  heroMoment(dur = 0.5) {
    if (this.reduceMotion) return;
    this._heroT = 0; this._heroDur = dur;
  }

  update(dt) {
    // shake decay
    this.shake *= Math.pow(0.0001, dt);
    if (this.shake < 0.1) this.shake = 0;

    // rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt; r.r += r.spd * dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    // popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt; p.y += p.vy * dt; p.vy *= 0.92;
      const age = 1 - p.life / p.max;
      p.sc = age < 0.18 ? Easing.outBack(age / 0.18) : 1;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
    // flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) this.flashes.splice(i, 1);
    }
    // wipe
    if (this.wipe > 0) {
      this.wipe += dt * this.wipeDir * 2.2;
      if (this.wipeDir > 0 && this.wipe >= 1) { this.wipeDir = -1; this.wipe = 1; }
      else if (this.wipeDir < 0 && this.wipe <= 0) { this.wipe = 0; this.wipeDir = 0; }
    }
    // hero slow-mo
    if (this._heroT != null) {
      this._heroT += dt;
      const n = this._heroT / this._heroDur;
      if (n < 0.4) { this.timeScale = lerp3(1, 0.35, n / 0.4); this.zoom = lerp3(1, 1.06, n / 0.4); }
      else if (n < 1) { this.timeScale = lerp3(0.35, 1, (n - 0.4) / 0.6); this.zoom = lerp3(1.06, 1, (n - 0.4) / 0.6); }
      else { this.timeScale = 1; this.zoom = 1; this._heroT = null; }
    } else { this.timeScale = 1; this.zoom = 1; }
  }

  // Apply shake + zoom transform to ctx (call after setTransform)
  applyTransform(ctx, cx, cy) {
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = rand(-1, 1) * this.shake; sy = rand(-1, 1) * this.shake; }
    ctx.translate(sx, sy);
    if (this.zoom !== 1) {
      ctx.translate(cx, cy); ctx.scale(this.zoom, this.zoom); ctx.translate(-cx, -cy);
    }
    return { sx, sy };
  }

  renderRings(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const a = clamp(r.life / r.max, 0, 1);
      ctx.strokeStyle = r.color; ctx.globalAlpha = a;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.28); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  renderPopups(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `900 ${p.size}px Heebo, sans-serif`;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
      ctx.shadowColor = p.color; ctx.shadowBlur = 12;
      ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  renderFlashes(ctx, w, h) {
    for (const f of this.flashes) {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = a * f.a; ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }

  renderWipe(ctx, w, h) {
    if (this.wipe <= 0) return;
    const diag = Math.hypot(w, h);
    const rad = Easing.inOutCubic(clamp(this.wipe, 0, 1)) * diag;
    ctx.fillStyle = `hsla(${200 + 40 * (this.wipe % 1)} 80% 8% / 1)`;
    ctx.beginPath(); ctx.rect(0, 0, w, h);
    ctx.arc(this.wipeX, this.wipeY, rad, 0, 6.28, true);
    ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(34,211,238,0.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(this.wipeX, this.wipeY, rad, 0, 6.28); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  clear() { this.shake = 0; this.flashes = []; this.rings = []; this.popups = []; this.wipe = 0; }
}

function lerp3(a, b, t) { return a + (b - a) * t; }

export { Effects };
