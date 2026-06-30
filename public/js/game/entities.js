// ============================================================
// entities.js — Box & Gem entity factories + lifecycle helpers
// ============================================================

import { BOX_TYPES, GEMS } from '../data/config.js';
import { rand, irand, weightedPick, T } from '../core/utils.js';
import { levels } from './levels.js';

function spawnBox(type, bounds, level, playerPos) {
  const def = BOX_TYPES[type];
  let x, y, tries = 0;
  do {
    x = rand(bounds.l + 44, bounds.r - 44);
    y = rand(bounds.t + 44, bounds.b - 44);
    tries++;
  } while (Math.hypot(x - playerPos.x, y - playerPos.y) < 170 && tries < 20);

  const moveChance = level >= 5 ? 0.4 : 0;
  const life = levels.boxDespawn(level);
  return {
    x, y, r: type === 'mega' ? 36 : 30, type, def,
    phase: Math.random() * 6.28, born: T(),
    life,
    vx: moveChance && Math.random() < moveChance ? rand(-30, 30) : 0,
    vy: moveChance && Math.random() < moveChance ? rand(-30, 30) : 0,
    open: false, openT: 0, lockedUntil: 0, dead: false,
    fuseT: 0, fuseMax: life,
  };
}

function spawnGem(bounds) {
  const weights = {};
  for (const [k, g] of Object.entries(GEMS)) weights[k] = g.weight;
  const key = weightedPick(weights);
  const def = GEMS[key];
  return {
    x: rand(bounds.l + 30, bounds.r - 30),
    y: rand(bounds.t + 30, bounds.b - 30),
    r: 13, key, def,
    phase: Math.random() * 6.28, born: T(),
    life: 12, spin: 0, dead: false, dying: 0, _collected: false,
  };
}

// Update gem state: magnet pull, pickup detection, dying animation
function updateGems(gems, player, dt, magnetActive, onCollect) {
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.phase += dt * 3; g.spin += dt * 1.2;
    const age = (T() - g.born) / 1000;
    if (!g.dying && age > g.life) { gems.splice(i, 1); continue; }

    // magnet or proximity pull
    if (magnetActive || Math.hypot(player.x - g.x, player.y - g.y) < 70) {
      const dx = player.x - g.x, dy = player.y - g.y, d = Math.hypot(dx, dy) || 1;
      g.x += dx / d * 240 * dt; g.y += dy / d * 240 * dt;
    }
    // pickup
    if (!g.dying && Math.hypot(player.x - g.x, player.y - g.y) < player.r + g.r) {
      g.dying = 0.001;
    }
    if (g.dying) {
      if (!g._collected) { g._collected = true; onCollect(g); }
      g.dying += dt; g.spin += dt * 6;
      if (g.dying >= 1) { gems.splice(i, 1); continue; }
    }
  }
}

// Update boxes: movement, fuse, despawn
function updateBoxes(boxes, dt, bounds, frozen, slow, onFuseExplode) {
  for (const box of boxes) {
    if (box.open) continue;
    box.phase += dt * 2;
    if (box.vx || box.vy) {
      if (!frozen) {
        box.x += box.vx * dt * slow; box.y += box.vy * dt * slow;
        if (box.x < bounds.l + box.r || box.x > bounds.r - box.r) box.vx *= -1;
        if (box.y < bounds.t + box.r || box.y > bounds.b - box.r) box.vy *= -1;
      }
    }
    if (box.def.fuse) {
      box.fuseT += dt;
      if (box.fuseT >= box.fuseMax && !box.dead) {
        box.dead = true;
        onFuseExplode(box);
      }
    }
  }
  // remove dead
  for (let i = boxes.length - 1; i >= 0; i--) if (boxes[i].dead) boxes.splice(i, 1);
}

export { spawnBox, spawnGem, updateGems, updateBoxes };
