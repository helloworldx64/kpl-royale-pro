// ============================================================
// net.js — Multiplayer client over WebRTC (PeerJS P2P).
// Host creates a room (peer id = room code); guest joins by code.
// Uses the free public PeerJS cloud broker — no server, no login.
// ============================================================

import { CONFIG, SKINS } from '../data/config.js';
import { I18N } from '../data/i18n.js';
import { roomCode } from '../core/utils.js';
import { store } from '../core/storage.js';
import { audio } from '../core/audio.js';

// Load PeerJS from CDN (exposed as window.Peer)
const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('peerjs load fail'));
    document.head.appendChild(s);
  });
}

class MpClient {
  constructor() {
    this.peer = null;
    this.conn = null;       // DataConnection
    this.role = null;       // 'host' | 'guest'
    this.code = null;
    this.connected = false;
    this.onOpen = null;     // when connection established
    this.onData = null;     // (msg) => {}
    this.onClose = null;
    this.onError = null;
    this._syncTimer = null;
  }

  async _ensurePeer() { await loadScript(PEERJS_CDN); }

  // Host: create room
  async host(name) {
    await this._ensurePeer();
    this.code = roomCode(CONFIG.MP.ROOM_CODE_LEN);
    this.role = 'host';
    this.peer = new window.Peer(this.code, { debug: 1 });
    return new Promise((resolve, reject) => {
      this.peer.on('open', () => resolve(this.code));
      this.peer.on('error', e => { reject(e); if (this.onError) this.onError(e); });
      this.peer.on('connection', conn => {
        this.conn = conn; this._wireConn();
      });
    });
  }

  // Guest: join by code
  async join(code, name) {
    await this._ensurePeer();
    this.code = code; this.role = 'guest';
    this.peer = new window.Peer({ debug: 1 });
    return new Promise((resolve, reject) => {
      this.peer.on('open', () => {
        this.conn = this.peer.connect(code, { reliable: false, metadata: { name } });
        this._wireConn();
        this.conn.on('open', () => resolve());
        this.conn.on('error', e => reject(e));
      });
      this.peer.on('error', e => { reject(e); if (this.onError) this.onError(e); });
    });
  }

  _wireConn() {
    this.conn.on('open', () => {
      this.connected = true;
      audio.mpConnect();
      // exchange hello
      this.send({ t: 'hello', name: this._myName(), skin: this._mySkin(), score: 0 });
      if (this.onOpen) this.onOpen();
    });
    this.conn.on('data', msg => { if (this.onData) this.onData(msg); });
    this.conn.on('close', () => {
      this.connected = false; audio.mpDisconnect();
      if (this.onClose) this.onClose();
    });
    this.conn.on('error', e => { if (this.onError) this.onError(e); });
  }

  _myName() { return this._name || (I18N.mpYou); }
  _mySkin() { return SKINS.find(s => store.hasSkin(s.id)) || SKINS[0]; }
  setName(n) { this._name = n; }

  send(msg) {
    if (this.conn && this.connected) {
      try { this.conn.send(msg); } catch (e) { /* peer disconnected */ }
    }
  }

  // Periodic position sync (host/guest both send)
  startSync(getState, hz) {
    const interval = 1000 / (hz || CONFIG.MP.SYNC_HZ);
    this._syncTimer = setInterval(() => {
      this.send({ t: 'state', ...getState() });
    }, interval);
  }
  stopSync() { if (this._syncTimer) { clearInterval(this._syncTimer); this._syncTimer = null; } }

  // Typed messages
  sendSolve(d) { this.send({ t: 'solve', ...d }); }
  sendGem(d) { this.send({ t: 'gem', ...d }); }
  sendWin() { this.send({ t: 'win' }); }
  sendStart(level) { this.send({ t: 'start', level }); }

  disconnect() {
    this.stopSync();
    if (this.conn) try { this.conn.close(); } catch {}
    if (this.peer) try { this.peer.destroy(); } catch {}
    this.conn = null; this.peer = null; this.connected = false; this.role = null; this.code = null;
  }
}

export { MpClient };
