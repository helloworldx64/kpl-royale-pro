// ============================================================
// screens.js — Menu / level-up / game-over / pause screen controller
// Manages DOM screens and their transitions.
// ============================================================

import { I18N } from '../data/i18n.js';
import { store } from '../core/storage.js';
import { SKINS, ACHIEVEMENTS } from '../data/config.js';
import { audio } from '../core/audio.js';
import { fmtNum } from '../core/utils.js';

class Screens {
  constructor(onStartSolo, onStartDuel, onNext, onRetry, onResume, onQuit, onHost, onJoin) {
    this._cache();
    this._wire(onStartSolo, onStartDuel, onNext, onRetry, onResume, onQuit, onHost, onJoin);
    this._decorateStart();
    this._populateSkins();
    this.renderLifetimeStats();
  }

  _cache() {
    const $ = id => document.getElementById(id);
    this.start = $('startScreen'); this.level = $('levelScreen'); this.over = $('overScreen'); this.pause = $('pauseScreen');
    this.mp = $('mpScreen');
    this.bestLabel = $('bestLabel'); this.startBest = $('startBest');
  }

  _wire(solo, duel, next, retry, resume, quit, host, join) {
    document.getElementById('btnStartSolo').addEventListener('click', () => { audio.click(); solo(); });
    document.getElementById('btnStartDuel').addEventListener('click', () => { audio.click(); duel(); });
    document.getElementById('btnNext').addEventListener('click', () => { audio.click(); next(); });
    document.getElementById('btnRetry').addEventListener('click', () => { audio.click(); retry(); });
    document.getElementById('btnResume').addEventListener('click', () => { audio.click(); resume(); });
    document.getElementById('btnQuit').addEventListener('click', () => { audio.click(); quit(); });
    document.getElementById('btnHost').addEventListener('click', () => { audio.click(); host(); });
    document.getElementById('btnJoin').addEventListener('click', () => { audio.click(); join(); });
    document.getElementById('btnMpBack').addEventListener('click', () => { audio.click(); this.showStart(); this.mp.classList.add('hidden'); });
  }

  _decorateStart() {
    this.bestLabel.textContent = fmtNum(store.get('highScore'));
    this.startBest.textContent = store.get('bestCombo') > 0 ? I18N.bestCombo + ': x' + store.get('bestCombo') : '';
    // floaters
    const cols = ['#22D3EE', '#A78BFA', '#F472B6', '#FBBF24', '#34D399'];
    for (let i = 0; i < 14; i++) {
      const f = document.createElement('div'); f.className = 'floater';
      f.style.left = Math.random() * 100 + '%';
      f.style.background = cols[i % cols.length];
      f.style.animationDuration = (12 + Math.random() * 18) + 's';
      f.style.animationDelay = (-Math.random() * 20) + 's';
      f.style.width = f.style.height = (4 + Math.random() * 8) + 'px';
      this.start.appendChild(f);
    }
  }

  _populateSkins() {
    const grid = document.getElementById('skinGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const s of SKINS) {
      const unlocked = store.hasSkin(s.id);
      const d = document.createElement('div');
      d.className = 'skin-card' + (unlocked ? '' : ' locked');
      d.innerHTML = `<div class="skin-swatch" style="--sc:${s.body};--ac:${s.accent}"></div><div class="skin-name">${s.name}</div><div class="skin-stars">${unlocked ? '★ ' + s.stars : '🔒 ' + s.stars + '★'}</div>`;
      grid.appendChild(d);
    }
  }

  showStart() { this._hideAll(); this.start.classList.remove('hidden'); }
  showLevel(data) {
    this._hideAll(); this.level.classList.remove('hidden');
    document.getElementById('lvTitle').textContent = I18N.levelUp + ' ' + data.level;
    const sub = data.acc > 0.8 ? I18N.praise_high : data.acc > 0.5 ? I18N.praise_mid : I18N.praise_low;
    const subEl = document.getElementById('lvSub');
    subEl.textContent = sub;
    subEl.style.color = data.acc > 0.8 ? 'var(--green)' : data.acc > 0.5 ? 'var(--gold)' : 'var(--cyan-hi)';
    document.getElementById('lvSummary').innerHTML = `
      <div>${I18N.boxesSolved}<b>${data.goalDone || data.gained}</b></div>
      <div>${I18N.levelScore}<b>+${data.gained}</b></div>
      <div>${I18N.accuracy}<b>${Math.round(data.acc * 100)}%</b></div>
      <div>${I18N.bestComboLbl}<b>x${data.bestCombo}</b></div>
      <div>${I18N.levelBonus}<b>+${data.lvBonus}</b></div>
      <div>${I18N.stars}<b>${'★'.repeat(data.stars)}${'☆'.repeat(3 - data.stars)}</b></div>`;
    document.getElementById('lvUnlock').textContent = data.unlockTxt || '';
    // stars animation
    const st = document.getElementById('lvStars'); st.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div'); d.className = 's';
      d.innerHTML = `<svg viewBox="0 0 24 24" fill="${i < data.stars ? '#FBBF24' : 'none'}" stroke="${i < data.stars ? '#F59E0B' : '#334155'}" stroke-width="1.5"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>`;
      st.appendChild(d);
    }
    setTimeout(() => {
      [...st.children].forEach((c, i) => {
        if (i < data.stars) { c.classList.add('on', 'pop'); if (i === data.stars - 1 || data.stars === 3) setTimeout(() => { audio.star(); }, i * 140); }
      });
    }, 200);
  }
  showOver(data) {
    this._hideAll(); this.over.classList.remove('hidden');
    document.getElementById('ovTitle').textContent = data.score >= 5000 ? I18N.champion : data.score >= 800 ? I18N.wellDone : I18N.gameOver;
    document.getElementById('ovBest').innerHTML = data.isBest
      ? `<div class="bestbadge">🏆 ${I18N.newBest} ${fmtNum(data.score)}</div>`
      : `<div style="color:var(--dim);font-weight:800;">${I18N.best}: ${fmtNum(store.get('highScore'))}</div>`;
    document.getElementById('ovSummary').innerHTML = `
      <div>${I18N.finalScore}<b>${fmtNum(data.score)}</b></div>
      <div>${I18N.level}<b>${data.level}</b></div>
      <div>${I18N.problemsSolved}<b>${data.correct}/${data.answered}</b></div>
      <div>${I18N.accuracy}<b>${Math.round(data.acc * 100)}%</b></div>
      <div>${I18N.bestComboLbl}<b>x${data.bestCombo}</b></div>
      <div>${I18N.gems}<b>${data.gems}</b></div>`;
  }
  showPause() { this.pause.classList.remove('hidden'); }
  hidePause() { this.pause.classList.add('hidden'); }
  showMp() { this._hideAll(); this.mp.classList.remove('hidden'); }

  _hideAll() {
    [this.start, this.level, this.over, this.pause, this.mp].forEach(s => s && s.classList.add('hidden'));
  }

  // MP lobby UI updates
  setMpStatus(text, color) {
    const el = document.getElementById('mpStatus');
    if (el) { el.textContent = text; el.style.color = color || 'var(--dim)'; }
  }
  setMpCode(code) {
    const el = document.getElementById('mpCodeDisplay');
    if (el) el.textContent = code;
    const box = document.getElementById('mpCodeBox');
    if (box) box.style.display = 'block';
  }
  getJoinCode() { return (document.getElementById('mpJoinInput') || {}).value || ''; }
  showMpConnected() {
    const l = document.getElementById('mpLobby'); if (l) l.classList.add('hidden');
    const w = document.getElementById('mpWaiting'); if (w) w.classList.remove('hidden');
  }

  // Show a small stats footer on the start screen (lifetime stats)
  renderLifetimeStats() {
    const el = document.getElementById('lifetimeStats');
    if (!el) return;
    const s = store.d;
    el.innerHTML = `
      <div class="lstat"><span class="n">${fmtNum(s.totalCorrect)}</span><span class="l">תרגילים פתורים</span></div>
      <div class="lstat"><span class="n">${fmtNum(s.totalGems)}</span><span class="l">אבנים</span></div>
      <div class="lstat"><span class="n">${s.maxLevel || 1}</span><span class="l">שלב מקסימלי</span></div>
      <div class="lstat"><span class="n">x${s.bestCombo || 0}</span><span class="l">רצץ שיא</span></div>`;
  }

  // Highlight newly unlocked achievements on level-up screen
  showNewAchs(list) {
    const el = document.getElementById('lvUnlock');
    if (!el || !list || !list.length) return;
    const cur = el.textContent;
    const more = list.map(a => a.icon + ' ' + a.name).join(' • ');
    el.textContent = (cur ? cur + ' | ' : '') + 'הישגים: ' + more;
  }
}

export { Screens };
