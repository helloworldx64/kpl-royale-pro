// ============================================================
// themes.js — Per-theme visual palette & background decoration.
// Each theme swaps the arena hue, nebula colors, grid tint, and
// adds themed ambient particles (stars, leaves, bubbles, embers).
// Themes unlock by level tier (see config THEMES).
// ============================================================

import { THEMES } from '../data/config.js';
import { rand, pick } from '../core/utils.js';

const THEME_DECO = {
  grid:    { ambient: 'dot',    ambientColors: ['#22D3EE', '#A78BFA'], ambientRate: 0.3, label: 'רשת ניאון' },
  space:   { ambient: 'star',   ambientColors: ['#67E8F9', '#FDE047', '#A78BFA'], ambientRate: 0.5, label: 'חלל עמוק' },
  jungle:  { ambient: 'leaf',   ambientColors: ['#34D399', '#A7F3D0'], ambientRate: 0.4, label: 'ג\'ונגל' },
  candy:   { ambient: 'dot',    ambientColors: ['#F472B6', '#FDE047', '#A78BFA'], ambientRate: 0.6, label: 'ממתקים' },
  ocean:   { ambient: 'bubble', ambientColors: ['#22D3EE', '#67E8F9'], ambientRate: 0.5, label: 'אוקיינוס' },
  volcano: { ambient: 'ember',  ambientColors: ['#F87171', '#FB923C', '#FBBF24'], ambientRate: 0.7, label: 'הר געש' },
};

class ThemeManager {
  constructor() {
    this.current = THEMES[0];
    this.deco = THEME_DECO.grid;
    this.ambient = [];          // ambient particle list
    this._spawnT = 0;
  }

  // Pick the theme for a given level
  setForLevel(L) {
    let chosen = THEMES[0];
    for (const t of THEMES) if (L >= t.minLevel) chosen = t;
    this.current = chosen;
    this.deco = THEME_DECO[chosen.id] || THEME_DECO.grid;
  }

  hue() { return this.current.hue; }
  id() { return this.current.id; }
  label() { return this.deco.label; }

  // Spawn an ambient decoration particle (called periodically)
  spawnAmbient(bounds, dt) {
    this._spawnT += dt;
    const interval = 1 / this.deco.ambientRate;
    if (this._spawnT < interval) return;
    this._spawnT = 0;
    const kind = this.deco.ambient;
    const color = pick(this.deco.ambientColors);
    const x = rand(bounds.l, bounds.r);
    const y = bounds.b + 10;
    if (kind === 'star') {
      this.ambient.push({ x, y, vx: rand(-5, 5), vy: rand(-25, -50), size: rand(1.5, 3), color, life: 6, max: 6, kind: 'star', tw: rand(0, 6.28) });
    } else if (kind === 'leaf') {
      this.ambient.push({ x, y, vx: rand(-15, 15), vy: rand(-20, -35), size: rand(6, 11), color, life: 7, max: 7, kind: 'leaf', rot: rand(0, 6.28), vrot: rand(-2, 2) });
    } else if (kind === 'bubble') {
      this.ambient.push({ x, y, vx: rand(-4, 4), vy: rand(-30, -55), size: rand(4, 12), color, life: 6, max: 6, kind: 'bubble' });
    } else if (kind === 'ember') {
      this.ambient.push({ x, y, vx: rand(-10, 10), vy: rand(-40, -70), size: rand(2, 5), color, life: 4, max: 4, kind: 'ember' });
    } else { // dot
      this.ambient.push({ x, y, vx: rand(-6, 6), vy: rand(-20, -40), size: rand(2, 5), color, life: 5, max: 5, kind: 'dot' });
    }
  }

  // Update + cull ambient particles
  update(dt, bounds) {
    for (let i = this.ambient.length - 1; i >= 0; i--) {
      const a = this.ambient[i];
      a.life -= dt;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.vrot) a.rot += a.vrot * dt;
      if (a.kind === 'leaf') a.vx += Math.sin(a.life * 2) * 8 * dt; // sway
      if (a.kind === 'ember') a.vy *= 0.99;
      if (a.life <= 0 || a.y < bounds.t - 20) this.ambient.splice(i, 1);
    }
    this.spawnAmbient(bounds, dt);
  }

  // Render ambient particles (additive for glow kinds)
  render(ctx) {
    for (const a of this.ambient) {
      const n = Math.max(0, a.life / a.max);
      ctx.globalAlpha = n * 0.7;
      if (a.kind === 'star' || a.kind === 'ember') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = a.color;
        if (a.kind === 'star') {
          const tw = 0.5 + 0.5 * Math.abs(Math.sin(a.tw + a.life * 4));
          ctx.globalAlpha = n * tw;
          ctx.beginPath(); ctx.arc(a.x, a.y, a.size, 0, 6.28); ctx.fill();
          // cross sparkle
          ctx.strokeStyle = a.color; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(a.x - a.size * 2, a.y); ctx.lineTo(a.x + a.size * 2, a.y);
          ctx.moveTo(a.x, a.y - a.size * 2); ctx.lineTo(a.x, a.y + a.size * 2); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(a.x, a.y, a.size, 0, 6.28); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      } else if (a.kind === 'bubble') {
        ctx.strokeStyle = a.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.size, 0, 6.28); ctx.stroke();
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(a.x - a.size * 0.3, a.y - a.size * 0.3, a.size * 0.25, 0, 6.28); ctx.fill();
      } else if (a.kind === 'leaf') {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.ellipse(0, 0, a.size * 0.5, a.size, 0, 0, 6.28); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, -a.size); ctx.lineTo(0, a.size); ctx.stroke();
        ctx.restore();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.size, 0, 6.28); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() { this.ambient = []; }
}

export { ThemeManager };
