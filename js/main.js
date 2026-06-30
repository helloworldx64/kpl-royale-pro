// ============================================================
// main.js — Entry point. Wires Game + HUD + Screens + Multiplayer.
// Runs the requestAnimationFrame loop.
// ============================================================

import { CONFIG, SKINS, ACHIEVEMENTS } from './data/config.js';
import { I18N } from './data/i18n.js';
import { audio } from './core/audio.js';
import { store } from './core/storage.js';
import { device } from './core/device.js';
import { Game, S } from './game/game.js';
import { HUD } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { MobileControls } from './ui/mobile.js';
import { Lobby } from './mp/lobby.js';
import { achievements } from './game/achievements.js';
import { Tutorial } from './game/tutorial.js';
import { stats } from './game/stats.js';
import { Dashboard } from './ui/dashboard.js';
import { T } from './core/utils.js';

class App {
  constructor() {
    this.canvas = document.getElementById('c');
    this.hudRoot = document.getElementById('hud');

    // Build controllers
    this.hud = new HUD(this.hudRoot,
      (v, el) => this.game && this.game.answer(v),
      () => this.game && this.game.doSkip());

    this.screens = new Screens(
      () => this.startSolo(),
      () => this.startDuel(),
      () => this.nextLevel(),
      () => this.retry(),
      () => this.resume(),
      () => this.quit(),
      () => this.hostMatch(),
      () => this.joinMatch()
    );

    // Build game (state = MENU initially)
    this.game = this.makeGame();
    this.mobile = new MobileControls(this.game.input);

    // Lobby for multiplayer
    this.lobby = new Lobby(this.screens,
      (role, net, oppName, oppSkin) => this.startMatch(role, net, oppName, oppSkin),
      () => this.endMatch());

    achievements.onUnlock((ach) => this.hud.showAch(ach.name, ach.icon));

    // Tutorial (first-run onboarding)
    this.tutorial = new Tutorial();
    this.tutorial.onStep = (s) => this.hud.showToast(s.title + ' — ' + s.text, '#22D3EE');
    this.tutorial.onDone = () => this.hud.showToast('אתה מוכן! בהצלחה!', '#34D399');

    // Mastery dashboard (lazy-built when drawer opens)
    this.dashboard = null;

    // Apply saved settings
    const settings = store.get('settings');
    audio.setEnabled(settings.sound);
    audio.setMusic(settings.music);

    // Settings UI
    this._wireSettings();

    // Resize handling
    window.addEventListener('resize', () => this._onResize());
    device.onChange(() => this._onResize());

    // Start at menu
    this.screens.showStart();
    this.hud.hide();

    // Loop
    this._loopBound = (t) => this.loop(t);
    requestAnimationFrame(this._loopBound);
  }

  makeGame() {
    const g = new Game(this.canvas, this.hud, {
      onToast: (t, c) => this.hud.showToast(t, c),
      onAch: (a) => this.hud.showAch(a.name, a.icon),
      onState: (st) => this._onState(st),
      onQuiz: (cur, def, type) => this.hud.showQuiz(cur, def, type),
      onQuizClose: () => this.hud.hideQuiz(),
      onAnswer: (ok, pts, combo, x, y, shielded, correctVal, timeout) => {
        if (!ok) {
          // mark the chosen/wrong + correct
          const els = [...this.hud.choices.children];
          // we don't know chosen idx here; the click handler already added classes via answer()
          // correct highlight done in answer() path through markWrongOnly
        }
      },
      onComboBanner: (text) => this.hud.showBanner(text),
      onLevelClear: (data) => this.screens.showLevel(data),
      onGameOver: (data) => this.screens.showOver(data),
      onPause: (paused) => { if (paused) this.screens.showPause(); else this.screens.hidePause(); },
      onPower: (k, p) => {},
      onHint: (rem) => this.hud.applyHint(rem),
      onTheme: (label) => this.showThemeBadge(label),
    });
    return g;
  }

  // ---------- Game flow ----------
  startSolo() {
    audio.unlock(); audio.startMusic();
    this.screens._hideAll(); this.hud.show();
    this.game.clearMp(); this.game.resetGame();
    stats.reset();
    this.mobile.show();
    // tutorial on first ever play
    if (this.tutorial.maybeStart()) {
      this._tutorialActive = true;
    }
  }

  startDuel() {
    audio.unlock();
    this.screens.showMp();
  }

  nextLevel() {
    this.screens._hideAll(); this.hud.show();
    this.game.hearts = Math.min(this.game.maxHearts, this.game.hearts + CONFIG.LEVEL.HEAL_BETWEEN_LEVELS);
    this.game.startLevel(this.game.level + 1, true);
  }

  retry() {
    this.screens._hideAll(); this.hud.show();
    this.game.resetGame();
  }

  resume() { this.game.togglePause(); }
  quit() {
    this.screens.hidePause(); this.screens.showStart(); this.hud.hide();
    this.game.state = S.MENU; this.game.paused = false;
  }

  // ---------- Multiplayer ----------
  hostMatch() {
    audio.unlock();
    const name = (document.getElementById('mpNameInput') || {}).value || I18N.mpYou;
    this.lobby.host(name);
  }
  joinMatch() {
    audio.unlock();
    const name = (document.getElementById('mpNameInput') || {}).value || I18N.mpYou;
    const code = this.screens.getJoinCode();
    if (code) this.lobby.join(code, name);
  }

  startMatch(role, net, oppName, oppSkin) {
    this.screens._hideAll(); this.hud.show();
    this.game.setMp(net, role, this.lobby);
    this.game.opponentName = oppName; this.game.opponentSkin = oppSkin;
    this.game.resetGame();
    this.mobile.show();
    // sync player position
    net.startSync(() => ({
      id: net.role, x: this.game.p.x, y: this.game.p.y, angle: this.game.p.angle,
      score: this.game.score, combo: this.game.combo, name: net._myName(), skin: this.game.skin,
    }));
    // handle incoming data
    net.onData = (msg) => this._handleMp(msg);
  }

  _handleMp(msg) {
    if (!msg) return;
    if (msg.t === 'state') {
      this.game.applyRemoteState(msg);
    } else if (msg.t === 'solve') {
      if (msg.correct) {
        this.hud.showToast(`${this.game.opponentName}: +${msg.pts}`, '#A78BFA');
      }
    } else if (msg.t === 'win') {
      // opponent finished first
      this._mpLost = true;
      this.lobby.reportWin = () => {}; // prevent double
      this._endMatchLost();
    }
  }

  endMatch() {
    // opponent disconnected
    this.hud.showToast(I18N.mpDisconnected, '#F87171');
    setTimeout(() => this.quitToMenu(), 1500);
  }
  _endMatchLost() {
    audio.mpLose();
    this.hud.showToast(I18N.mpLost, '#F87171');
    this.lobby.net.stopSync();
    setTimeout(() => this.quitToMenu(), 2000);
  }
  quitToMenu() {
    if (this.lobby) this.lobby.disconnect();
    this.game.clearMp();
    this.screens.showStart(); this.hud.hide();
    this.game.state = S.MENU;
  }

  // ---------- State changes ----------
  _onState(st) {
    if (st === 'over' && this.game.mpMode && !this._mpLost) {
      this._mpLost = true;
      this._endMatchLost();
    }
  }

  showThemeBadge(label) {
    const b = document.getElementById('themeBadge');
    if (!b) return;
    b.textContent = 'נושא חדש: ' + label;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 1800);
  }

  // ---------- Settings ----------
  _wireSettings() {
    const s = store.get('settings');
    const sg = document.getElementById('setSound'); const mg = document.getElementById('setMusic'); const rm = document.getElementById('setReduce');
    if (sg) { sg.checked = s.sound; sg.addEventListener('change', () => { s.sound = sg.checked; store.save(); audio.setEnabled(s.sound); }); }
    if (mg) { mg.checked = s.music; mg.addEventListener('change', () => { s.music = mg.checked; store.save(); audio.setMusic(s.music); if (s.music && this.game.state !== S.MENU) audio.startMusic(); else audio.stopMusic(); }); }
    if (rm) { rm.checked = s.reduceMotion; rm.addEventListener('change', () => { s.reduceMotion = rm.checked; store.save(); this.game.effects.setReduceMotion(s.reduceMotion); }); }
  }

  _onResize() {
    this.game.renderer.resize();
    this.game.background.resize(this.game.renderer.W, this.game.renderer.H);
  }

  // ---------- Loop ----------
  loop(t) {
    this.game.step(t);
    if (this._tutorialActive) {
      this.tutorial.tick(this.game);
      if (!this.tutorial.active) this._tutorialActive = false;
    }
    requestAnimationFrame(this._loopBound);
  }
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
