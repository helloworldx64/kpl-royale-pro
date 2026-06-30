// ============================================================
// particles.js — Pooled particle system (sparks, stars, confetti,
// rings, smoke). O(1) spawn via rolling cursor, blend-grouped draw.
// ============================================================

import { rand, clamp, Easing } from '../core/utils.js';

class ParticleSystem {
  constructor(max) {
    this.max = max;
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push(this._blank());
    this.cursor = 0;
  }

  _blank() {
    return { a: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, size0: 1,
      color: '#fff', type: 'spark', rot: 0, vrot: 0, gravity: 0, drag: 0.96, blend: 'lighter' };
  }

  spawn(opts) {
    for (let n = 0; n < this.max; n++) {
      const i = (this.cursor + n) % this.max;
      const p = this.pool[i];
      if (!p.a) {
        this.cursor = (i + 1) % this.max;
        Object.assign(p, this._blank(), opts);
        p.a = true; p.size0 = p.size;
        return p;
      }
    }
    return null; // pool full
  }

  burst(x, y, color, n = 14, spd = 4, life = 0.6, type = 'spark', extra = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(spd * 0.4, spd);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * rand(0.7, 1.1), max: life, color, size: rand(3, 7),
        type, ...extra });
    }
  }

  confetti(x, y, n = 24, colors) {
    const cols = colors || ['#22D3EE', '#A78BFA', '#F472B6', '#FBBF24', '#34D399', '#F87171'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(3, 7);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
        life: rand(0.9, 1.5), max: 1.5, color: cols[(Math.random() * cols.length) | 0],
        size: rand(4, 9), type: 'confetti', rot: Math.random() * 6.28,
        vrot: rand(-9, 9), gravity: 20, drag: 0.985, blend: 'source-over' });
    }
  }

  star(x, y, color, n = 6, spd = 3, life = 0.7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(spd * 0.5, spd);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * rand(0.7, 1.2), max: life, color, size: rand(5, 10), type: 'star' });
    }
  }

  smoke(x, y, n = 6, life = 0.8) {
    for (let i = 0; i < n; i++) {
      this.spawn({ x: x + rand(-8, 8), y: y + rand(-8, 8),
        vx: rand(-1, 1), vy: rand(-2, -0.5),
        life: life * rand(0.7, 1.2), max: life, color: 'rgba(40,46,70,1)',
        size: rand(14, 28), type: 'smoke', drag: 0.95, blend: 'source-over' });
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.a) continue;
      p.life -= dt;
      if (p.life <= 0) { p.a = false; continue; }
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= p.drag; p.vy *= p.drag;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.vrot) p.rot += p.vrot * dt;
    }
  }

  render(ctx) {
    // Pass 1: source-over (smoke, confetti)
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.pool) {
      if (!p.a || p.blend !== 'source-over') continue;
      const n = clamp(p.life / p.max, 0, 1);
      if (p.type === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = n; ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        ctx.restore();
      } else if (p.type === 'smoke') {
        const grow = 1 + (1 - n) * 1.5;
        ctx.globalAlpha = n * 0.5; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * grow, 0, 6.28); ctx.fill();
      }
    }
    // Pass 2: additive (spark, star)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.pool) {
      if (!p.a || p.blend === 'source-over') continue;
      const n = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = n;
      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        this._starShape(ctx, p.x, p.y, p.size * 2, p.size, 5);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _starShape(ctx, cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * 6.28 - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }

  clear() { for (const p of this.pool) p.a = false; }
  count() { let c = 0; for (const p of this.pool) if (p.a) c++; return c; }
}

export { ParticleSystem };
