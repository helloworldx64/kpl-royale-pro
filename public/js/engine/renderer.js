// ============================================================
// renderer.js — Canvas setup, DPR handling, and entity drawing
// (player, boxes, gems). Draw helpers used by the Game.
// ============================================================

import { CONFIG } from '../data/config.js';
import { rand, clamp, lerp, angLerp, Easing, shade, hexA } from '../core/utils.js';
import { device } from '../core/device.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.W = 0; this.H = 0; this.dpr = 1;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, device.maxDPR());
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = Math.floor(this.W * this.dpr);
    this.canvas.height = Math.floor(this.H * this.dpr);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  beginFrame() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear(intensityColor) {
    this.ctx.fillStyle = intensityColor || '#050811';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  // ---------- Player ----------
  drawPlayer(ctx, p, skin, turboOn, t, comboTier) {
    // dash ghosts
    ctx.globalCompositeOperation = 'lighter';
    for (const gh of p.dashGhost) {
      const a = gh.life / gh.max;
      ctx.save(); ctx.translate(gh.x, gh.y); ctx.rotate(gh.angle);
      ctx.fillStyle = `rgba(244,114,182,${a * 0.4})`;
      roundRect(ctx, -p.r, -p.r, p.r * 2, p.r * 2, 6); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    // trail
    ctx.globalCompositeOperation = 'lighter';
    const tierCol = comboTier >= 3 ? '251,191,36' : comboTier >= 2 ? '244,114,182' : comboTier >= 1 ? '167,139,250' : '34,211,238';
    for (let i = 0; i < p.trail.length; i++) {
      const a = i / p.trail.length;
      ctx.fillStyle = `rgba(${tierCol},${a * 0.35})`;
      ctx.beginPath(); ctx.arc(p.trail[i].x, p.trail[i].y, p.r * a * 0.8, 0, 6.28); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    const r = p.r; const sq = p.squash;
    ctx.scale(2 - sq, sq);

    // shield ring
    if (p.shield > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(59,130,246,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, 6.28); ctx.stroke();
      ctx.strokeStyle = 'rgba(96,165,250,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.7, t * 3, t * 3 + 1.5); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    // thrusters
    const throttle = (Math.abs(p.vx) + Math.abs(p.vy)) / 400;
    if (throttle > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      const fl = r * (0.8 + throttle * 0.6) * (turboOn ? 2 : 1) * (0.85 + 0.15 * Math.sin(t * 40));
      for (const yy of [-6, 6]) {
        const fg = ctx.createLinearGradient(-r, 0, -r - fl, 0);
        fg.addColorStop(0, turboOn ? '#FDE047' : '#fff');
        fg.addColorStop(0.4, turboOn ? '#F472B6' : '#22D3EE');
        fg.addColorStop(1, turboOn ? hexA('#A78BFA', 0) : hexA('#22D3EE', 0));
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(-r, yy - 3); ctx.lineTo(-r - fl, yy); ctx.lineTo(-r, yy + 3);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // glow (focal)
    ctx.shadowBlur = turboOn ? 28 : 16;
    ctx.shadowColor = turboOn ? skin.accent : skin.body;

    // chassis
    const bg = ctx.createLinearGradient(-r, -r, r, r);
    bg.addColorStop(0, shade(skin.body, 30)); bg.addColorStop(1, shade(skin.body, -40));
    ctx.fillStyle = bg; roundRect(ctx, -r, -r, r * 2, r * 2, 6); ctx.fill();
    ctx.shadowBlur = 0;

    // bevel
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r, -r + 2); ctx.lineTo(r - 2, -r); ctx.moveTo(-r, -r); ctx.lineTo(-r, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.moveTo(r, -r); ctx.lineTo(r, r); ctx.moveTo(-r, r); ctx.lineTo(r, r); ctx.stroke();

    // inner panel
    ctx.fillStyle = hexA(skin.accent, 0.18);
    roundRect(ctx, -r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 4); ctx.fill();
    ctx.strokeStyle = hexA(skin.accent, 0.6); ctx.lineWidth = 1;
    roundRect(ctx, -r * 0.6, -r * 0.6, r * 1.2, r * 1.2, 4); ctx.stroke();

    // eyes (counter-rotate to stay upright)
    ctx.save(); ctx.rotate(-p.angle);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(-r * 0.35, -r * 0.4, r * 0.3, r * 0.25);
    ctx.fillRect(r * 0.05, -r * 0.4, r * 0.3, r * 0.25);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-r * 0.3, -r * 0.36, r * 0.15, r * 0.18);
    ctx.fillRect(r * 0.1, -r * 0.36, r * 0.15, r * 0.18);
    ctx.restore();

    // core glow
    ctx.globalCompositeOperation = 'lighter';
    const cp = 0.6 + 0.4 * Math.sin(t * 6);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
    cg.addColorStop(0, hexA(skin.accent, cp));
    cg.addColorStop(1, hexA(skin.accent, 0));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }

  // ---------- Box ----------
  drawBox(ctx, box, t, px, py) {
    if (box.open) return;
    const def = box.def;
    const bob = Math.sin(t * 2 + box.phase) * 4;
    const x = box.x, y = box.y + bob;
    const r = box.r;

    // floor pool
    ctx.globalCompositeOperation = 'lighter';
    const pg = ctx.createRadialGradient(box.x, box.y + r * 0.8, 0, box.x, box.y + r * 0.8, r * 1.6);
    pg.addColorStop(0, hexA(def.glow, 0.25)); pg.addColorStop(1, hexA(def.glow, 0));
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(box.x, box.y + r * 0.8, r * 1.6, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const prox = clamp(1 - Math.hypot(px - box.x, py - box.y) / 120, 0, 1);
    ctx.save(); ctx.translate(x, y);
    const w = r * 2, h = r * 1.7;

    // body
    const bodyG = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    bodyG.addColorStop(0, def.color); bodyG.addColorStop(1, shade(def.color, -40));
    ctx.fillStyle = bodyG; roundRect(ctx, -w / 2, -h / 2 * 0.3, w, h * 0.7, 6); ctx.fill();

    // lid
    const lidG = ctx.createLinearGradient(0, -h / 2, 0, 0);
    lidG.addColorStop(0, shade(def.color, 30)); lidG.addColorStop(1, def.color);
    ctx.fillStyle = lidG; roundRect(ctx, -w / 2 - 3, -h / 2, w + 6, h * 0.4, 5); ctx.fill();

    // bevel
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
    roundRect(ctx, -w / 2 - 3, -h / 2, w + 6, h * 0.4, 5); ctx.stroke();

    // ribbon vertical + horizontal
    ctx.fillStyle = def.glow; ctx.fillRect(-w * 0.08, -h / 2, w * 0.16, h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-w * 0.02, -h / 2, w * 0.04, h);
    ctx.fillStyle = def.glow; ctx.fillRect(-w / 2 - 3, -h / 2 + h * 0.15, w + 6, h * 0.12);

    // bow
    ctx.fillStyle = def.glow;
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -h / 2 - 2, r * 0.3, r * 0.2, 0.3, 0, 6.28);
    ctx.ellipse(r * 0.3, -h / 2 - 2, r * 0.3, r * 0.2, -0.3, 0, 6.28);
    ctx.fill();

    // icon
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 14px Heebo, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, 0, h * 0.15);

    // glow border (layered)
    ctx.globalCompositeOperation = 'lighter';
    const ga = 0.3 + 0.3 * Math.sin(t * 3 + box.phase) + prox * 0.3;
    ctx.strokeStyle = hexA(def.glow, 0.18); ctx.lineWidth = 8;
    roundRect(ctx, -w / 2 - 3, -h / 2, w + 6, h, 6); ctx.stroke();
    ctx.strokeStyle = hexA(def.glow, 0.4); ctx.lineWidth = 3;
    roundRect(ctx, -w / 2 - 3, -h / 2, w + 6, h, 6); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // fuse for bomb
    if (def.fuse) {
      const fp = box.fuseT / box.fuseMax;
      ctx.strokeStyle = '#F87171'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -h / 2 - 2);
      ctx.lineTo(r * 0.4 + 8, -h / 2 - 10 - Math.sin(t * 8) * 2);
      ctx.stroke();
      ctx.fillStyle = Math.sin(t * 12) > 0 ? '#FDE047' : '#F87171';
      ctx.beginPath(); ctx.arc(r * 0.4 + 8, -h / 2 - 10, 3, 0, 6.28); ctx.fill();
      if (fp > 0.7) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(248,113,113,${0.2 + 0.2 * Math.sin(t * 10)})`;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, 6.28); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  }

  // ---------- Gem ----------
  drawGem(ctx, g, t) {
    const def = g.def;
    const bob = Math.sin(t * 3 + g.phase) * 5;
    let x = g.x, y = g.y + bob;
    if (g.dying) { const d = g.dying; y = g.y - 30 * Easing.outCubic(d) + bob; }
    const sc = g.dying ? 1 + 0.4 * Easing.outBack(g.dying) : 1;
    const alpha = g.dying ? 1 - Easing.inCubic(g.dying) : 1;

    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(x, y); ctx.rotate(g.spin); ctx.scale(sc, sc);
    const r = g.r;

    // floor shadow
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(0, r * 1.4, r * 0.8, r * 0.25, 0, 0, 6.28); ctx.fill();
    ctx.globalAlpha = alpha;

    // glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(def.color, 0.18); ctx.lineWidth = 8;
    this._gemPath(ctx, r); ctx.stroke();
    ctx.strokeStyle = hexA(def.color, 0.4); ctx.lineWidth = 3;
    this._gemPath(ctx, r); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // facets
    const top = ctx.createLinearGradient(0, -r, 0, 0);
    top.addColorStop(0, shade(def.color, 40)); top.addColorStop(1, def.color);
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, -r * 0.2); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.7, -r * 0.2); ctx.closePath(); ctx.fill();
    const bot = ctx.createLinearGradient(0, 0, 0, r);
    bot.addColorStop(0, def.color); bot.addColorStop(1, shade(def.color, -50));
    ctx.fillStyle = bot;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.7, -r * 0.2); ctx.lineTo(0, r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(def.color, -20);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.7, -r * 0.2); ctx.lineTo(0, r); ctx.closePath(); ctx.fill();

    // specular
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.7); ctx.lineTo(r * 0.1, -r * 0.3); ctx.lineTo(-r * 0.1, -r * 0.2); ctx.closePath(); ctx.fill();
    const tw = 0.6 + 0.4 * Math.abs(Math.sin(t * 5 + g.phase));
    ctx.strokeStyle = `rgba(255,255,255,${tw})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.5); ctx.lineTo(r * 0.2, -r * 0.5);
    ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, -r * 0.3); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // life warning blink
    const age = (performance.now() - g.born) / 1000;
    if (!g.dying && age > g.life - 2 && Math.sin(t * 10) > 0) {
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(g.x, g.y, r * 1.2, 0, 6.28); ctx.fill();
      ctx.restore();
    }
  }

  _gemPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, -r * 0.2);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, -r * 0.2); ctx.closePath();
  }

  // ---------- Remote player (multiplayer ghost) ----------
  drawRemote(ctx, p, skin, t) {
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    const r = p.r;
    ctx.shadowBlur = 14; ctx.shadowColor = skin.body;
    const bg = ctx.createLinearGradient(-r, -r, r, r);
    bg.addColorStop(0, shade(skin.body, 30)); bg.addColorStop(1, shade(skin.body, -40));
    ctx.fillStyle = bg; roundRect(ctx, -r, -r, r * 2, r * 2, 6); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hexA(skin.accent, 0.7); ctx.lineWidth = 2;
    roundRect(ctx, -r, -r, r * 2, r * 2, 6); ctx.stroke();
    ctx.restore();
    // name tag
    if (p.name) {
      ctx.save(); ctx.globalAlpha = 0.85;
      ctx.font = '800 12px Heebo, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,16,34,.8)';
      const tw = ctx.measureText(p.name).width + 12;
      roundRect(ctx, p.x - tw / 2, p.y - r - 22, tw, 16, 8); ctx.fill();
      ctx.fillStyle = skin.accent; ctx.fillText(p.name, p.x, p.y - r - 10);
      ctx.restore();
    }
  }
}

export { Renderer, roundRect };
