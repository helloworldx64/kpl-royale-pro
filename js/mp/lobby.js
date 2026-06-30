// ============================================================
// lobby.js — Multiplayer lobby orchestration
// Hosts/joins via MpClient, then launches a versus match.
// ============================================================

import { I18N } from '../data/i18n.js';
import { store } from '../core/storage.js';
import { audio } from '../core/audio.js';
import { MpClient } from './net.js';
import { SKINS } from '../data/config.js';

class Lobby {
  constructor(screens, onStartMatch, onEndMatch) {
    this.screens = screens;
    this.onStartMatch = onStartMatch;   // (role, net, opponentName) => {}
    this.onEndMatch = onEndMatch;       // () => {}
    this.net = new MpClient();
    this.opponentName = I18N.mpOpponent;
    this._wireNet();
  }

  _wireNet() {
    this.net.onOpen = () => {
      this.screens.setMpStatus(I18N.mpConnected, 'var(--green)');
      setTimeout(() => this.startMatch(), 800);
    };
    this.net.onData = (msg) => this._handle(msg);
    this.net.onClose = () => {
      this.screens.setMpStatus(I18N.mpDisconnected, 'var(--red)');
      this.onEndMatch();
    };
    this.net.onError = (e) => {
      this.screens.setMpStatus('שגיאה: ' + (e.type || e.message), 'var(--red)');
    };
  }

  _handle(msg) {
    if (!msg) return;
    switch (msg.t) {
      case 'hello':
        this.opponentName = msg.name || I18N.mpOpponent;
        this.opponentSkin = msg.skin || SKINS[0];
        break;
      case 'start':
        // host triggered match start with a level
        if (this.net.role === 'guest') this._launch(msg.level);
        break;
      case 'win':
        // opponent declared win
        this._opponentWon = true;
        break;
    }
  }

  async host(name) {
    this.net.setName(name);
    try {
      const code = await this.net.host(name);
      this.screens.setMpCode(code);
      this.screens.setMpStatus(I18N.mpShareCode, 'var(--cyan)');
      this.screens.showMpConnected();
    } catch (e) {
      this.screens.setMpStatus('לא הצלחתי ליצור חדר: ' + (e.type || ''), 'var(--red)');
    }
  }

  async join(code, name) {
    this.net.setName(name);
    try {
      await this.net.join(code.toUpperCase(), name);
      this.screens.setMpStatus('מתחבר...', 'var(--cyan)');
    } catch (e) {
      this.screens.setMpStatus('חדר לא נמצא: ' + (e.type || ''), 'var(--red)');
    }
  }

  // Called when connection opens (host decides to start)
  startMatch() {
    const level = 1;
    if (this.net.role === 'host') {
      this.net.sendStart(level);
      this._launch(level);
    }
  }

  _launch(level) {
    store.inc('stats'); // no-op safe
    const stats = store.get('stats'); stats.mpGames = (stats.mpGames || 0) + 1; store.save();
    audio.go();
    this.onStartMatch(this.net.role, this.net, this.opponentName, this.opponentSkin);
  }

  reportWin() {
    if (this.net.connected) this.net.sendWin();
    const stats = store.get('stats'); stats.mpWins = (stats.mpWins || 0) + 1; store.save();
  }

  disconnect() { this.net.disconnect(); }
}

export { Lobby };
