// ============================================================
// game.js — Main Game class: state machine, player physics,
// quiz flow, level progression, win/lose. Orchestrates all systems.
// ============================================================

import { CONFIG, BOX_TYPES, GEMS, POWERS, SKINS, TRAILS } from '../data/config.js';
import { I18N } from '../data/i18n.js';
import { rand, clamp, lerp, angLerp, T, pick, Easing, hexA } from '../core/utils.js';
import { device } from '../core/device.js';
import { audio } from '../core/audio.js';
import { store } from '../core/storage.js';
import { Input } from '../core/input.js';
import { Renderer } from '../engine/renderer.js';
import { Background } from '../engine/background.js';
import { Effects } from '../engine/effects.js';
import { ParticleSystem } from '../engine/particles.js';
import { ThemeManager } from '../engine/themes.js';
import { FactsEngine } from './facts.js';
import { scoring } from './scoring.js';
import { levels } from './levels.js';
import { achievements } from './achievements.js';
import { spawnBox, spawnGem, updateGems, updateBoxes } from './entities.js';

// State machine states
const S = { MENU: 'menu', PLAY: 'play', QUIZ: 'quiz', LEVEL: 'level', OVER: 'over', PAUSED: 'paused' };

class Game {
  constructor(canvas, hud, callbacks = {}) {
    this.canvas = canvas;
    this.hud = hud;           // HUD controller
    this.cb = callbacks;      // { onToast, onAch, onScreen, onMpScore, onMpState }
    this.renderer = new Renderer(canvas);
    this.background = new Background(this.renderer.W, this.renderer.H);
    this.effects = new Effects(store.get('settings').reduceMotion);
    this.particles = new ParticleSystem(device.particleCap());
    this.facts = new FactsEngine();
    this.themes = new ThemeManager();
    this.input = new Input(canvas);
    this.reduce = store.get('settings').reduceMotion || device.isMobile && false;

    // Player + state
    this.state = S.MENU;
    this.level = 1; this.score = 0; this.hearts = 3; this.maxHearts = 3;
    this.combo = 0; this.bestCombo = 0; this.goal = 5; this.goalDone = 0;
    this.answered = 0; this.correct = 0; this.levelStartScore = 0; this.flawless = true;
    this.levelTime = 90; this.levelTimeMax = 90;
    this.qTimeLimit = 6; this.qDeadline = 0; this.qStartT = 0; this.qClosing = false;
    this.invuln = 0; this.score2xT = 0; this.magnetT = 0; this.freezeT = 0; this.slowmoT = 0;
    this.shieldCharge = 0; this.turboUses = 0; this.comboDecayT = 0;
    this.turbo = 1; this.dash = 1; this.turboOn = false;
    this.hue = 200; this.skin = SKINS[0]; this.trail = null;
    this.boxes = []; this.gems = []; this.remotePlayers = new Map();
    this.cur = null; this.curBox = null; this.curType = 'normal';
    this.spawnT = 0; this.gemT = 0; this.bgTime = 0; this.last = 0;
    this.mpMode = false; this.mpRole = null; this.mpNet = null;
    this.paused = false; this._prePause = null; this._pauseLeft = 0;
    this.scoreDisp = 0;
  }

  // ---------- Arena bounds ----------
  bounds() {
    const c = CONFIG.ARENA;
    return { l: c.PADDING_L, t: c.PADDING_T, r: this.renderer.W - c.PADDING_R, b: this.renderer.H - c.PADDING_B };
  }

  // ---------- Lifecycle ----------
  resetGame() {
    this.facts.reset();
    this.level = 1; this.score = 0; this.hearts = 3; this.combo = 0; this.bestCombo = 0;
    this.answered = 0; this.correct = 0; this.turboUses = 0; this.hue = 200;
    this.skin = SKINS.find(s => store.hasSkin(s.id)) || SKINS[0];
    this.trail = TRAILS.find(t => store.get('unlocks').trails.includes(t.id) && t.color) || TRAILS[0];
    this.effects.clear(); this.particles.clear();
    this.startLevel(1, true);
  }

  startLevel(lv, wipe) {
    this.level = lv;
    this.levelStartScore = this.score; this.goalDone = 0; this.flawless = true;
    this.goal = levels.goal(lv);
    this.levelTimeMax = levels.timeLimit(lv); this.levelTime = this.levelTimeMax;
    this.boxes = []; this.gems = []; this.particles.clear();
    this.turbo = 1; this.dash = 1; this.turboOn = false;
    this.invuln = 0; this.score2xT = 0; this.magnetT = 0; this.freezeT = 0; this.slowmoT = 0; this.shieldCharge = 0;
    this.hue = 200 + ((lv * 40) % 160);
    this.facts.setCeilingForLevel(lv);
    this.themes.setForLevel(lv);
    this.themes.clear();
    this.background.setHue(this.themes.hue());
    if (this._lastTheme !== this.themes.id() && lv > 1) {
      this._lastTheme = this.themes.id();
      if (this.cb.onTheme) this.cb.onTheme(this.themes.label());
    } else this._lastTheme = this.themes.id();
    const b = this.bounds();
    this.p = { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2, r: 21, vx: 0, vy: 0, angle: 0, facing: 0, trail: [], squash: 1, dashGhost: [], shield: 0 };
    for (let i = 0; i < 4; i++) this.boxes.push(spawnBox(levels.pickType(lv, this.combo, this.hearts, this.maxHearts), b, lv, this.p));
    this.gems.push(spawnGem(b));
    this.spawnT = T(); this.gemT = T();
    this.state = S.PLAY; this.paused = false; this.qClosing = false;
    if (this.cb.onState) this.cb.onState('play');
    if (this.hud) this.hud.show();
    if (wipe) this.effects.startWipe(this.p.x, this.p.y);
    if (levels.isChallenge(lv)) {
      const m = I18N['challenge_' + lv] || levels.challengeMod(lv);
      if (m) setTimeout(() => this.toast(m, '#FB923C'), 600);
    }
    this.toast(I18N.levelStart + ' ' + lv, '#22D3EE');
    audio.setMoodForLevel(lv);
    audio.setIntensity(0);
    this.updateHUD();
  }

  endLevel() {
    this.clearQuizUI(); this.qClosing = false; this.state = S.LEVEL;
    if (this.cb.onState) this.cb.onState('level');
    const acc = this.answered ? this.correct / this.answered : 0;
    const gained = this.score - this.levelStartScore;
    const lvBonus = scoring.levelClear(this.level, 1, this.flawless);
    this.score += lvBonus;
    const sGoal = levels.scoreGoal(this.level);
    const stars = this.computeStars(gained, sGoal);
    store.set('stars', (store.get('stars') || 0) + stars);
    if (this.flawless) { store.inc('flawlessLevels'); achievements.trigger('flawless'); }
    // unlock skins
    const starTotal = store.get('stars');
    let unlockTxt = '';
    for (const s of SKINS) {
      if (starTotal >= s.stars && !store.hasSkin(s.id)) { store.unlockSkin(s.id); unlockTxt = I18N.unlocked + ': ' + s.name; }
    }
    this.updateMetaStats();
    store.set('highScore', Math.max(store.get('highScore'), this.score));
    store.set('bestScore', Math.max(store.get('bestScore'), this.score));
    store.set('bestCombo', Math.max(store.get('bestCombo'), this.bestCombo));
    if (this.cb.onLevelClear) this.cb.onLevelClear({ level: this.level + 1, acc, gained, stars, lvBonus, bestCombo: this.bestCombo, unlockTxt, scoreGoal: sGoal, flawless: this.flawless });
    audio.levelup(); audio.setIntensity(0);
    this.particles.confetti(this.renderer.W / 2, this.renderer.H / 3, 40);
    store.save();
  }

  computeStars(gained, sGoal) {
    let s = 1;
    if (gained >= CONFIG.LEVEL.STAR_2_THRESHOLD * sGoal) s = 2;
    if (gained >= CONFIG.LEVEL.STAR_3_THRESHOLD * sGoal && this.flawless) s = 3;
    return s;
  }

  gameOver() {
    this.clearQuizUI(); this.qClosing = false; this.state = S.OVER;
    if (this.cb.onState) this.cb.onState('over');
    this.updateMetaStats();
    const isBest = this.score > store.get('highScore');
    if (isBest) store.set('highScore', this.score);
    store.set('bestScore', Math.max(store.get('bestScore'), this.score));
    store.set('bestCombo', Math.max(store.get('bestCombo'), this.bestCombo));
    store.set('maxLevel', Math.max(store.get('maxLevel'), this.level));
    const acc = this.answered ? this.correct / this.answered : 0;
    if (this.cb.onGameOver) this.cb.onGameOver({ score: this.score, level: this.level, correct: this.correct, answered: this.answered, acc, bestCombo: this.bestCombo, isBest, gems: store.get('totalGems') });
    audio.over(); audio.setIntensity(0);
  }

  updateMetaStats() {
    // achievements eval
    const stats = {
      totalCorrect: store.get('totalCorrect'),
      totalGems: store.get('totalGems'),
      bestComboEver: Math.max(store.get('bestComboEver') || 0, this.bestCombo),
      maxLevel: Math.max(store.get('maxLevel') || 1, this.level),
      bombsDefused: store.get('bombsDefused'),
      mysteryOpened: store.get('mysteryOpened'),
      turboUses: store.get('turboUses'),
      bestScore: Math.max(store.get('bestScore'), this.score),
      flawlessLevels: store.get('flawlessLevels'),
      sub2sAnswers: store.get('sub2sAnswers'),
      rainbowGems: store.get('rainbowGems'),
      mpGames: store.get('stats').mpGames,
      mpWins: store.get('stats').mpWins,
    };
    store.set('bestComboEver', stats.bestComboEver);
    achievements.checkAll(stats);
  }

  // ---------- Quiz ----------
  openQuiz(box) {
    const type = box.type, def = box.def;
    this.cur = this.facts.question(type);
    this.curBox = box; this.curType = type;
    this.qTimeLimit = levels.questionTime(this.level, this.cur.a, this.cur.b);
    this.qDeadline = T() + this.qTimeLimit * 1000; this.qStartT = T();
    box.open = true; box.openT = T(); box.fuseT = 0;
    this.state = S.QUIZ; this.qClosing = false;
    if (this.cb.onQuiz) this.cb.onQuiz(this.cur, def, type);
    audio.open();
    this.effects.ring(box.x, box.y, def.glow, 300, 0.5);
    this.particles.burst(box.x, box.y, def.glow, 16, 5, 0.6);
  }

  answer(v) {
    if (this.state !== S.QUIZ || this.qClosing) return;
    this.qClosing = true;
    const ok = v === this.cur.answer;
    const rt = T() - this.qStartT;
    this.facts.record(this.cur.a, this.cur.b, ok, rt);
    this.answered++;
    const box = this.curBox, type = this.curType, def = box.def;

    if (ok) {
      this.correct++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.flawless = this.flawless;
      this._checkComboMilestone();
      const pts = scoring.correct(this.combo, type, rt, this.qTimeLimit, this.score2xT > 0);
      this.score += pts; this.goalDone++;
      store.inc('totalCorrect');
      if (def.comboBoost) this.combo += def.comboBoost - 1;
      if (this.cb.onAnswer) this.cb.onAnswer(true, pts, this.combo, box.x, box.y);
      this.particles.burst(box.x, box.y, '#34D399', 24, 6, 0.7);
      this.particles.star(box.x, box.y, '#FBBF24', 8, 4, 0.7);
      this.effects.ring(box.x, box.y, '#34D399', 320, 0.55);
      this.effects.popup(box.x, box.y - 34, '+' + pts, '#FBBF24', 26);
      this.effects.flash(hexA('#FBBF24', 0.18), 0.5, 0.25);
      this.effects.addShake(4);
      this.turbo = clamp(this.turbo + CONFIG.PLAYER.TURBO_ON_CORRECT, 0, 1);
      audio.right(this.combo);
      audio.setIntensity(clamp(this.combo / 20, 0, 1));
      this.toast(pick(I18N.great) + '  x' + this.combo, '#34D399');
      if (rt < 2000) { store.inc('sub2sAnswers'); achievements.trigger('sub2s'); }
      if (this.combo >= 10) achievements.trigger('combo_10');
      if (this.combo >= 25) achievements.trigger('combo_25');
      if (this.combo >= 50) achievements.trigger('combo_50');
      achievements.trigger('first_correct');
      if (def.gems) for (let i = 0; i < def.gems; i++) this.gems.push(spawnGem(this.bounds()));
      if (def.addTime) { this.levelTime = Math.min(this.levelTimeMax + 30, this.levelTime + def.addTime); this.toast('+' + def.addTime + ' ' + I18N.timeUnit, '#22D3EE'); }
      if (def.heal) { this.hearts = Math.min(this.maxHearts, this.hearts + 1); this.toast('+1 ' + I18N.gems, '#F87171'); }
      if (def.powerup) this.dropPowerup(box.x, box.y);
      if (type === 'bomb') { store.inc('bombsDefused'); achievements.trigger('bomb_survivor'); this.score += CONFIG.SCORE.BOMB_SURVIVE_BONUS; this.effects.popup(box.x, box.y - 58, '+' + CONFIG.SCORE.BOMB_SURVIVE_BONUS, '#F87171', 20); }
      if (type === 'mystery') { store.inc('mysteryOpened'); achievements.trigger('mystery_open'); }
      if (this.combo > 0 && this.combo % CONFIG.COMBO.BANNER_EVERY === 0) this.cb.onComboBanner && this.cb.onComboBanner('x' + this.combo + '!');
      this.boxes = this.boxes.filter(x => x !== box);
      if (this.mpMode && this.mpNet) this.mpNet.sendSolve({ pts, combo: this.combo, correct: true });
      if (this.goalDone >= this.goal) setTimeout(() => this.endLevel(), 440);
    } else {
      if (this.shieldCharge > 0) {
        this.shieldCharge = 0; this.toast(I18N.shieldBlock, '#3B82F6'); audio.shield();
        this.particles.burst(box.x, box.y, '#3B82F6', 16, 5, 0.5);
        box.open = false; box.lockedUntil = T() + 600;
        if (this.cb.onAnswer) this.cb.onAnswer(false, 0, this.combo, box.x, box.y, true);
        setTimeout(() => this.closeQuiz(), 500);
        this.updateHUD(); return;
      }
      this.combo = 0; this.hearts--; this.flawless = false;
      if (this.cb.onAnswer) this.cb.onAnswer(false, 0, 0, box.x, box.y, false, this.cur.answer);
      this.particles.burst(box.x, box.y, '#F87171', 18, 5, 0.6);
      this.effects.ring(box.x, box.y, '#F87171', 300, 0.5);
      this.effects.flash('rgba(248,113,113,0.35)', 0.6, 0.3);
      this.effects.addShake(10); audio.wrong(); audio.hurt();
      this.toast(I18N.tryAgain + ' ' + I18N.correctAnswer + ' ' + this.cur.answer, '#F87171');
      if (type === 'bomb') { audio.bomb(); this.effects.addShake(16); this.effects.flash('rgba(248,113,113,0.5)', 0.7, 0.4); this.particles.burst(box.x, box.y, '#F87171', 40, 9, 0.8); this.boxes = this.boxes.filter(x => x !== box); }
      else { box.open = false; box.lockedUntil = T() + 900; }
      this.invuln = CONFIG.HEARTS.INVULN_AFTER_HIT;
      device.vibrate(60);
      if (this.mpMode && this.mpNet) this.mpNet.sendSolve({ pts: 0, combo: 0, correct: false });
      if (this.hearts <= 0) setTimeout(() => this.gameOver(), 800);
    }
    setTimeout(() => this.closeQuiz(), ok ? 480 : 1150);
    this.updateHUD();
  }

  timeoutAnswer() {
    if (this.state !== S.QUIZ || this.qClosing) return;
    this.qClosing = true;
    if (this.shieldCharge > 0) { this.shieldCharge = 0; this.toast(I18N.shieldBlock, '#3B82F6'); setTimeout(() => this.closeQuiz(), 500); this.updateHUD(); return; }
    this.combo = 0; this.hearts--; this.flawless = false;
    this.particles.burst(this.curBox.x, this.curBox.y, '#F87171', 18, 5, 0.6);
    this.effects.flash('rgba(248,113,113,0.3)', 0.5, 0.3); this.effects.addShake(8); audio.wrong(); audio.hurt();
    this.toast(I18N.timesUp + ' ' + this.cur.answer, '#F87171');
    this.curBox.open = false; this.curBox.lockedUntil = T() + 900; this.invuln = 1;
    if (this.cb.onAnswer) this.cb.onAnswer(false, 0, 0, this.curBox.x, this.curBox.y, false, this.cur.answer, true);
    if (this.hearts <= 0) setTimeout(() => this.gameOver(), 800);
    setTimeout(() => this.closeQuiz(), 1150);
    this.updateHUD();
  }

  closeQuiz() {
    this.clearQuizUI();
    if (this.state === S.QUIZ) { this.state = S.PLAY; this.cur = null; this.curBox = null; }
    this.qClosing = false;
    if (this.cb.onQuizClose) this.cb.onQuizClose();
    this.updateHUD();
  }

  clearQuizUI() { if (this.cb.onQuizClose) this.cb.onQuizClose(); }

  doSkip() {
    if (this.state !== S.QUIZ || this.qClosing) return;
    this.combo = Math.max(0, this.combo - 3);
    this.toast(I18N.skipMsg, '#8AA0C4');
    if (this.curBox) { this.curBox.open = false; this.curBox.lockedUntil = T() + 600; }
    this.closeQuiz(); this.updateHUD();
  }

  dropPowerup(x, y) {
    const keys = Object.keys(POWERS);
    this.activatePower(pick(keys), x, y);
  }

  activatePower(k, x, y) {
    const p = POWERS[k]; audio.power();
    this.toast(p.name, p.color);
    this.particles.star(x || this.p.x, y || this.p.y, p.color, 18, 5, 0.6);
    if (k === 'shield') { this.shieldCharge = 1; this.p.shield = 1; }
    else if (k === 'hint') {
      if (this.cur) {
        const wrongs = this.cur.choices.filter(v => v !== this.cur.answer);
        const rem = pick(wrongs);
        if (this.cb.onHint) this.cb.onHint(rem);
      }
    }
    else if (k === 'score2x') this.score2xT = p.dur;
    else if (k === 'magnet') this.magnetT = p.dur;
    else if (k === 'freeze') this.freezeT = p.dur;
    else if (k === 'slowmo') this.slowmoT = p.dur;
    if (this.cb.onPower) this.cb.onPower(k, p);
  }

  // ---------- Pause ----------
  togglePause() {
    if (this.state === S.PLAY || this.state === S.QUIZ) {
      const was = this.state;
      if (was === S.QUIZ) this._pauseLeft = (this.qDeadline - T()) / 1000;
      this.paused = true; this.state = S.PAUSED; this._prePause = was;
      if (this.cb.onPause) this.cb.onPause(true);
    } else if (this.state === S.PAUSED) {
      this.paused = false;
      if (this._prePause === S.QUIZ) this.qDeadline = T() + (this._pauseLeft || 0) * 1000;
      this.state = this._prePause || S.PLAY; this._prePause = null;
      this.last = T();
      if (this.cb.onPause) this.cb.onPause(false);
    }
  }

  // ---------- Player abilities ----------
  tryDash() {
    if (this.state !== S.PLAY) return;
    if (this.dash < 1) return;
    let v = this.input.dir();
    if (v.x === 0 && v.y === 0) { v = { x: Math.cos(this.p.facing), y: Math.sin(this.p.facing) }; }
    const m = Math.hypot(v.x, v.y) || 1;
    this.p.vx += (v.x / m) * CONFIG.PLAYER.DASH_BURST;
    this.p.vy += (v.y / m) * CONFIG.PLAYER.DASH_BURST;
    this.dash = 0; audio.dash();
    this.particles.burst(this.p.x, this.p.y, '#F472B6', 18, 6, 0.5);
    this.effects.ring(this.p.x, this.p.y, '#F472B6', 360, 0.5);
    this.effects.flash('rgba(244,114,182,0.15)', 0.3, 0.2);
    this.effects.addShake(4);
    for (let i = 0; i < CONFIG.PLAYER.DASH_GHOSTS; i++) {
      this.p.dashGhost.push({ x: this.p.x, y: this.p.y, life: 0.4 - i * 0.06, max: 0.4, angle: this.p.facing });
    }
    device.vibrate(30);
  }

  // ---------- Update ----------
  update(dt) {
    if (this.state !== S.PLAY && this.state !== S.QUIZ) return;
    const slow = this.slowmoT > 0 ? 0.4 : 1;
    const frozen = this.freezeT > 0;
    const b = this.bounds();
    const C = CONFIG.PLAYER;

    if (this.state === S.PLAY) {
      const v = this.input.dir(); const m = Math.hypot(v.x, v.y) || 1;
      this.turboOn = this.input.turboHeld && this.turbo > 0.02;
      let speed = C.BASE_SPEED;
      if (this.turboOn) {
        speed = C.BASE_SPEED * C.TURBO_SPEED_MULT;
        this.turbo = clamp(this.turbo - dt * C.TURBO_DRAIN, 0, 1);
        if (!this._turboSfx) { audio.turbo(); this._turboSfx = true; store.inc('turboUses'); if (store.get('turboUses') >= 50) achievements.trigger('turbo_50'); }
      } else { this.turbo = clamp(this.turbo + dt * C.TURBO_REGEN, 0, 1); this._turboSfx = false; }
      this.dash = clamp(this.dash + dt * C.DASH_RECHARGE, 0, 1);

      if (this.input.consumeDash()) this.tryDash();

      if (v.x || v.y) {
        this.p.vx = lerp(this.p.vx, (v.x / m) * speed, C.ACCEL);
        this.p.vy = lerp(this.p.vy, (v.y / m) * speed, C.ACCEL);
        const tgt = Math.atan2(v.y, v.x);
        this.p.facing = tgt; this.p.angle = angLerp(this.p.angle, tgt, 0.3);
      } else { this.p.vx *= C.FRICTION; this.p.vy *= C.FRICTION; }

      this.p.x += this.p.vx * dt; this.p.y += this.p.vy * dt;
      let hit = false;
      if (this.p.x < b.l + this.p.r) { this.p.x = b.l + this.p.r; this.p.vx *= C.WALL_BOUNCE; hit = true; }
      if (this.p.x > b.r - this.p.r) { this.p.x = b.r - this.p.r; this.p.vx *= C.WALL_BOUNCE; hit = true; }
      if (this.p.y < b.t + this.p.r) { this.p.y = b.t + this.p.r; this.p.vy *= C.WALL_BOUNCE; hit = true; }
      if (this.p.y > b.b - this.p.r) { this.p.y = b.b - this.p.r; this.p.vy *= C.WALL_BOUNCE; hit = true; }
      if (hit) this.p.squash = 0.85;
      this.p.squash = lerp(this.p.squash, 1, 0.18);
      this.p.shield = this.shieldCharge;

      this.p.trail.push({ x: this.p.x, y: this.p.y, t: T() });
      if (this.p.trail.length > C.TRAIL_LEN) this.p.trail.shift();
      this.p.dashGhost = this.p.dashGhost.filter(g => { g.life -= dt; return g.life > 0; });

      // boxes
      updateBoxes(this.boxes, dt, b, frozen, slow, (box) => this.onFuseExplode(box));
      for (const box of this.boxes) {
        if (box.open || (box.lockedUntil && T() < box.lockedUntil)) continue;
        if (Math.hypot(this.p.x - box.x, this.p.y - box.y) < this.p.r + box.r) {
          if (box.type === 'combo' && this.combo < 5) { this.toast(I18N.needCombo5, '#FB923C'); box.lockedUntil = T() + 400; continue; }
          if (box.type === 'mystery') {
            const r = Math.random();
            if (r < 0.6) { this.openQuiz(box); return; }
            else if (r < 0.85) {
              for (let i = 0; i < 4; i++) this.gems.push(spawnGem(b));
              this.particles.burst(box.x, box.y, '#F472B6', 24, 6, 0.7);
              this.particles.confetti(box.x, box.y, 16); audio.gem(3);
              this.boxes = this.boxes.filter(x => x !== box);
              this.toast(I18N.gemShower, '#F472B6'); return;
            } else { this.boxes.push(spawnBox('bomb', b, this.level, this.p)); this.boxes = this.boxes.filter(x => x !== box); this.toast(I18N.bombDrop, '#F87171'); return; }
          }
          this.openQuiz(box); return;
        }
      }

      // gems
      updateGems(this.gems, this.p, dt, this.magnetT > 0, (g) => this.onGemCollect(g));
    }

    // quiz timer
    if (this.state === S.QUIZ && !this.qClosing && !frozen) {
      if (T() >= this.qDeadline) this.timeoutAnswer();
    }

    // timers
    if (this.score2xT > 0) this.score2xT -= dt;
    if (this.magnetT > 0) this.magnetT -= dt;
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.slowmoT > 0) this.slowmoT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.p) this.p.shield = this.shieldCharge;

    // level timer
    if (this.state === S.PLAY && !frozen) {
      this.levelTime -= dt;
      // low-time heartbeat
      const tWhole = Math.ceil(this.levelTime);
      if (tWhole <= 10 && tWhole > 0 && tWhole !== this._lastTWhole) {
        this._lastTWhole = tWhole;
        audio.countdown();
        if (tWhole <= 5) { this.effects.flash('rgba(248,113,113,0.18)', 0.4, 0.25); device.vibrate(30); }
      }
      if (this.levelTime <= 0) { this.levelTime = 0; this.gameOver(); return; }
    }

    // low-hearts warning pulse
    if (this.hearts === 1 && this.state === S.PLAY && !this._lowHWarn) {
      this._lowHWarn = true;
      this.toast(I18N.lowHearts || 'לב אחרון!', '#F87171');
    } else if (this.hearts > 1) this._lowHWarn = false;

    // combo decay
    if (this.state === S.PLAY) {
      this.comboDecayT += dt;
      if (this.comboDecayT > CONFIG.COMBO.DECAY_DELAY && this.combo > 0) { this.combo = Math.max(0, this.combo - 1); this.comboDecayT = CONFIG.COMBO.DECAY_DELAY - 1; }
      const v = this.input.dir(); if (v.x || v.y) this.comboDecayT = 0;
    }

    // spawn
    if (this.state === S.PLAY) {
      const avail = this.boxes.filter(x => !x.open && !x.dead).length;
      const target = levels.concurrent(this.level);
      if (avail < target && T() - this.spawnT > levels.spawnInterval(this.level)) {
        this.boxes.push(spawnBox(levels.pickType(this.level, this.combo, this.hearts, this.maxHearts), b, this.level, this.p));
        this.spawnT = T();
      }
      if (this.gems.length < 2 && T() - this.gemT > 6000) { this.gems.push(spawnGem(b)); this.gemT = T(); }
    }

    // particles + effects
    this.particles.update(dt);
    this.effects.update(dt);
    this.themes.update(dt, b);
    this.background.setIntensity(clamp(this.combo / 20, 0, 1));
    this.background.setHue(this.themes.hue());
    this.bgTime += dt;
    this.updateHUD();
  }

  _checkComboMilestone() {
    const c = this.combo;
    const milestones = [5, 10, 15, 20, 25, 50];
    if (milestones.includes(c)) {
      const key = 'combo_milestone_' + c;
      const txt = I18N[key] || ('x' + c + '!');
      if (this.cb.onComboBanner) this.cb.onComboBanner(txt);
      this.effects.heroMoment(0.4);
      this.effects.addShake(8);
      this.effects.flash('rgba(251,191,36,0.25)', 0.6, 0.35);
      this.particles.confetti(this.p.x, this.p.y - 40, 30);
      this.particles.star(this.p.x, this.p.y, '#FBBF24', 16, 6, 1.0);
      this.effects.ring(this.p.x, this.p.y, '#FBBF24', 420, 0.6);
      audio.star();
      device.vibrate([40, 30, 40]);
    }
  }

  onFuseExplode(box) {
    if (this.invuln > 0) return;
    if (this.shieldCharge > 0) { this.shieldCharge = 0; this.toast(I18N.shieldBomb, '#3B82F6'); audio.shield(); }
    else { this.hearts--; this.combo = 0; this.flawless = false; this.toast(I18N.bombExplode, '#F87171'); audio.hurt(); }
    this.particles.burst(box.x, box.y, '#F87171', 40, 9, 0.8);
    this.effects.ring(box.x, box.y, '#F87171', 360, 0.5);
    this.effects.flash('rgba(248,113,113,0.5)', 0.7, 0.4);
    this.effects.addShake(16); audio.bomb();
    this.invuln = 1; device.vibrate(100);
    if (this.hearts <= 0) setTimeout(() => this.gameOver(), 600);
    this.updateHUD();
  }

  onGemCollect(g) {
    const def = g.def;
    const pts = scoring.gem(def, this.score2xT > 0);
    this.score += pts; store.inc('totalGems');
    if (def.combo) { this.combo++; if (this.combo % 3 === 0) this.cb.onComboBanner && this.cb.onComboBanner('x' + this.combo + '!'); }
    if (def.turbo) this.turbo = clamp(this.turbo + def.turbo, 0, 1);
    if (def.invuln) this.invuln = Math.max(this.invuln, def.invuln);
    if (def.score2x) { this.score2xT = Math.max(this.score2xT, def.score2x); if (g.key === 'rainbow') { store.inc('rainbowGems'); achievements.trigger('rainbow'); } }
    this.particles.burst(g.x, g.y, def.color, 16, 5, 0.6, 'star');
    this.effects.ring(g.x, g.y, def.hi, 300, 0.45);
    this.effects.popup(g.x, g.y - 26, '+' + pts, def.color, 22);
    this.effects.flash('rgba(251,191,36,0.08)', 0.4, 0.2);
    audio.gem(Math.min(5, Math.floor(this.combo / 2)));
    this.toast(def.name + ' +' + pts, def.color);
    if (store.get('totalGems') >= 100) achievements.trigger('gems_100');
    if (store.get('totalGems') >= 500) achievements.trigger('gems_500');
    if (this.mpMode && this.mpNet) this.mpNet.sendGem({ pts, key: g.key });
  }

  // ---------- HUD update ----------
  updateHUD() {
    if (!this.hud) return;
    this.scoreDisp = lerp(this.scoreDisp, this.score, 0.2);
    const data = {
      score: Math.round(this.scoreDisp), level: this.level, combo: Math.max(1, this.combo),
      time: Math.max(0, Math.ceil(this.levelTime)), turbo: this.turbo, dash: this.dash,
      hearts: this.hearts, maxHearts: this.maxHearts, goalDone: this.goalDone, goal: this.goal,
      shield: this.shieldCharge, score2x: this.score2xT, magnet: this.magnetT, freeze: this.freezeT, slowmo: this.slowmoT,
    };
    if (this.mpMode) {
      let oppScore = 0;
      for (const rp of this.remotePlayers.values()) oppScore = Math.max(oppScore, rp.score || 0);
      data.mp = { me: this.score, opp: oppScore, meName: this.mpNet ? this.mpNet._myName() : 'אתה', oppName: this.opponentName || 'יריב' };
    }
    this.hud.update(data);
  }

  toast(text, color) { if (this.cb.onToast) this.cb.onToast(text, color); }

  // ---------- Multiplayer ----------
  setMp(net, role, lobby) { this.mpMode = true; this.mpNet = net; this.mpRole = role; this.lobby = lobby; }
  clearMp() { this.mpMode = false; this.mpNet = null; this.mpRole = null; this.remotePlayers.clear(); }

  applyRemoteState(state) {
    // state: { x, y, angle, score, combo, name, skin }
    this.remotePlayers.set(state.id, state);
  }

  // ---------- Render ----------
  render() {
    const r = this.renderer; const ctx = r.ctx;
    r.beginFrame();
    r.clear('#050811');
    const b = this.bounds();
    const lowHealth = this.hearts === 1 && this.state === S.PLAY;
    this.background.render(ctx, this.bgTime, this.p ? this.p.x : r.W / 2, this.p ? this.p.y : r.H / 2, b, lowHealth);

    ctx.save();
    this.effects.applyTransform(ctx, r.W / 2, r.H / 2);

    if (this.state !== S.MENU) {
      for (const g of this.gems) r.drawGem(ctx, g, this.bgTime);
      for (const box of this.boxes) { r.drawBox(ctx, box, this.bgTime, this.p.x, this.p.y); r.drawBoxOpening(ctx, box, this.bgTime); }
      this.themes.render(ctx);
      this.effects.renderRings(ctx);
      // remote players (ghosts)
      for (const rp of this.remotePlayers.values()) {
        r.drawRemote(ctx, { ...rp, r: 21 }, rp.skin || SKINS[0], this.bgTime);
      }
      if (this.p) {
        const tier = this.combo >= 10 ? 3 : this.combo >= 7 ? 2 : this.combo >= 4 ? 1 : 0;
        r.drawComboAura(ctx, this.p, this.combo, this.bgTime);
        r.drawPlayer(ctx, this.p, this.skin, this.turboOn, this.bgTime, tier, this.trail);
        r.drawTimerRing(ctx, this.p, this.levelTime, this.levelTimeMax, this.bgTime);
      }
      this.particles.render(ctx);
      this.effects.renderPopups(ctx);
    }
    ctx.restore();

    this.effects.renderFlashes(ctx, r.W, r.H);
    this.effects.renderWipe(ctx, r.W, r.H);
  }

  // ---------- Main loop step ----------
  step(t) {
    if (!this.last) this.last = t;
    let dt = (t - this.last) / 1000; this.last = t;
    dt = Math.min(dt, CONFIG.ARENA.MAX_DT);
    // one-shot input events
    if (this.input.consumePause()) this.togglePause();
    if (this.state === S.QUIZ && !this.qClosing) {
      if (this.input.consumeSkip()) this.doSkip();
      const ak = this.input.consumeAnswerKey();
      if (ak) { const el = this.hud && this.hud.getChoice(ak - 1); if (el) this.answer(+el.dataset.v); }
    }
    const effDt = dt * this.effects.timeScale;
    this.update(effDt);
    this.render();

    // MP win check — first to reach goal wins
    if (this.mpMode && this.state === S.PLAY && this.goalDone >= this.goal && !this._mpResolved) {
      this._mpResolved = true;
      this._mpWin();
    }
  }

  // ---------- Multiplayer win/lose ----------
  _mpWin() {
    if (this.lobby && this.lobby.reportWin) this.lobby.reportWin();
    if (this.mpNet) this.mpNet.sendWin();
    audio.mpWin();
    if (this.cb.onToast) this.cb.onToast(I18N.mpWon + ' 🏆', '#FBBF24');
    this.effects.heroMoment(0.6);
    this.particles.confetti(this.renderer.W / 2, this.renderer.H / 2, 50);
    setTimeout(() => this.quitToMenu(), 2500);
  }

  quitToMenu() {
    if (this.mpNet) this.mpNet.stopSync();
    this.clearMp();
    this._mpResolved = false;
    if (this.cb.onState) this.cb.onState('menu');
  }

  // ---------- Invulnerability flash (visual on player) ----------
  // Handled in drawPlayer via shield ring; here we add a periodic
  // blink when invuln is active so the kid sees they're safe.
  _invulnBlink() {
    return this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0;
  }
}

export { Game, S };
