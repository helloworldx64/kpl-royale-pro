// ============================================================
// hud.js — HUD controller: manages DOM HUD elements, quiz panel,
// toasts, combo banner, achievement toasts, power-up dock.
// ============================================================

import { I18N } from '../data/i18n.js';
import { POWERS } from '../data/config.js';
import { audio } from '../core/audio.js';
import { clamp } from '../core/utils.js';

const heartFull = '<svg class="heart" viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3 7C19 16.5 12 21 12 21z" fill="#F87171" stroke="#7F1D1D" stroke-width="1.2"/><path d="M7 9l1.5-2 2 .5z" fill="#FCA5A5" opacity=".6"/></svg>';
const heartEmpty = '<svg class="heart" viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3 7C19 16.5 12 21 12 21z" fill="none" stroke="#334155" stroke-width="1.6"/></svg>';

class HUD {
  constructor(root, onAnswer, onSkip) {
    this.root = root;
    this.onAnswer = onAnswer;
    this.onSkip = onSkip;
    this._toastT = null; this._bannerT = null; this._achT = null;
    this._cacheEls();
  }

  _cacheEls() {
    const $ = id => document.getElementById(id);
    this.score = $('hScore'); this.level = $('hLevel'); this.combo = $('hCombo'); this.comboPill = $('hComboPill');
    this.time = $('hTime'); this.turbo = $('hTurbo'); this.dash = $('hDash');
    this.hearts = $('hHearts'); this.pips = $('hPips'); this.pudock = $('pudock');
    this.toast = $('toast'); this.banner = $('comboBanner');
    this.quiz = $('quiz'); this.qText = $('qText'); this.qTag = $('qTag'); this.choices = $('choices');
    this.skipBtn = $('skipBtn'); this.achToast = $('achToast'); this.achIc = $('achIc'); this.achTx = $('achTx');
    this.hudDim = $('hud');
    this.skipBtn.addEventListener('click', () => { audio.click(); this.onSkip && this.onSkip(); });
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  update(d) {
    this.score.textContent = d.score;
    this.level.textContent = d.level;
    this.combo.textContent = 'x' + d.combo;
    const tier = d.combo >= 10 ? 'rgba(251,191,36,0.55)' : d.combo >= 7 ? 'rgba(244,114,182,0.55)' : d.combo >= 4 ? 'rgba(167,139,250,0.55)' : 'rgba(244,114,182,0.55)';
    this.comboPill.style.borderColor = tier;
    this.time.textContent = d.time;
    if (d.time <= 10 && this.time.style.color !== 'var(--red)') {
      this.time.style.color = d.time <= 10 ? 'var(--red)' : '#fff';
    } else if (d.time > 10) this.time.style.color = '#fff';
    this.turbo.style.width = (d.turbo * 100) + '%';
    this.dash.style.width = (d.dash * 100) + '%';
    // hearts
    let hh = '';
    for (let i = 0; i < d.maxHearts; i++) hh += i < d.hearts ? heartFull : heartEmpty;
    this.hearts.innerHTML = hh;
    this.hearts.style.boxShadow = d.hearts === 1 ? '0 0 14px rgba(248,113,113,0.35)' : 'none';
    // goal pips
    let pp = '';
    for (let i = 0; i < d.goal; i++) pp += `<div class="pip${i < d.goalDone ? ' on' : ''}"></div>`;
    this.pips.innerHTML = pp;
    // power-up dock
    this.updatePUDock(d);
    // MP score panel
    if (d.mp) this.updateMpScore(d.mp);
    else if (this.mpScore) this.mpScore.classList.add('hidden');
  }

  updateMpScore(mp) {
    if (!this.mpScore) {
      this.mpScore = document.getElementById('mpScore');
      if (!this.mpScore) return;
    }
    this.mpScore.classList.remove('hidden');
    this.mpScore.innerHTML = `
      <div class="side me"><div class="n">${mp.meName || 'אתה'}</div><div class="v">${mp.me}</div></div>
      <div class="side opp"><div class="n">${mp.oppName || 'יריב'}</div><div class="v">${mp.opp}</div></div>`;
  }

  updatePUDock(d) {
    const list = [];
    if (d.shield > 0) list.push({ ic: POWERS.shield.icon, t: 'on', c: POWERS.shield.color });
    if (d.score2x > 0) list.push({ ic: POWERS.score2x.icon, t: Math.ceil(d.score2x) + 's', c: POWERS.score2x.color });
    if (d.magnet > 0) list.push({ ic: POWERS.magnet.icon, t: Math.ceil(d.magnet) + 's', c: POWERS.magnet.color });
    if (d.freeze > 0) list.push({ ic: POWERS.freeze.icon, t: Math.ceil(d.freeze) + 's', c: POWERS.freeze.color });
    if (d.slowmo > 0) list.push({ ic: POWERS.slowmo.icon, t: Math.ceil(d.slowmo) + 's', c: POWERS.slowmo.color });
    let h = '';
    for (const p of list) h += `<div class="pu" style="border-color:${p.c};box-shadow:0 0 16px ${p.c}">${p.ic}<div class="t">${p.t}</div></div>`;
    this.pudock.innerHTML = h;
  }

  // ---------- Quiz panel ----------
  showQuiz(cur, def, type) {
    this.qText.innerHTML = `<b class="op1">${cur.a}</b><span class="op"> × </span><b class="op2">${cur.b}</b><span class="op"> = </span><span class="qm">?</span>`;
    const op1 = this.qText.querySelector('.op1'), op2 = this.qText.querySelector('.op2');
    op1.style.animation = 'spop .4s cubic-bezier(.34,1.56,.64,1)';
    op2.style.animation = 'spop .4s cubic-bezier(.34,1.56,.64,1) .08s';
    this.qTag.textContent = def.label;
    this.choices.innerHTML = '';
    cur.choices.forEach((v, i) => {
      const d = document.createElement('div');
      d.className = 'choice'; d.dataset.v = v;
      d.innerHTML = `<span class="k">${i + 1}</span>${v}`;
      d.addEventListener('click', () => { audio.click(); this.onAnswer(v, d); });
      d.style.animation = `chent .3s ease-out ${0.15 + i * 0.05}s both`;
      this.choices.appendChild(d);
    });
    this.quiz.classList.add('show');
    this.hudDim.classList.add('dim');
  }

  hideQuiz() { this.quiz.classList.remove('show'); this.hudDim.classList.remove('dim'); }
  getChoice(i) { return this.choices.children[i]; }

  markAnswer(correctIdx, chosenIdx, correctVal) {
    const els = [...this.choices.children];
    els.forEach((c, i) => {
      if (+c.dataset.v === correctVal) c.classList.add('right');
      else if (i === chosenIdx) c.classList.add('wrong');
      else c.classList.add('dim');
    });
  }

  markWrongOnly(chosenIdx, correctVal) {
    const els = [...this.choices.children];
    els.forEach((c, i) => {
      if (+c.dataset.v === correctVal) c.classList.add('right');
      else if (i === chosenIdx) c.classList.add('wrong');
      else c.classList.add('dim');
    });
  }

  applyHint(removeVal) {
    [...this.choices.children].forEach(c => {
      if (+c.dataset.v === removeVal) { c.style.opacity = '.2'; c.style.pointerEvents = 'none'; }
    });
  }

  // ---------- Toast / banner / achievement ----------
  showToast(text, color) {
    this.toast.textContent = text; this.toast.style.color = color || '#fff';
    this.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toast.classList.remove('show'), 950);
  }

  showBanner(text, color) {
    this.banner.textContent = text; this.banner.style.color = color || '#22D3EE';
    this.banner.style.transition = 'none';
    this.banner.style.opacity = '0';
    this.banner.style.transform = 'translate(-50%,-50%) scale(0)';
    requestAnimationFrame(() => {
      this.banner.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1),opacity .3s';
      this.banner.style.opacity = '1';
      this.banner.style.transform = 'translate(-50%,-50%) scale(1)';
    });
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => {
      this.banner.style.transition = 'transform .3s,opacity .3s';
      this.banner.style.opacity = '0';
      this.banner.style.transform = 'translate(-50%,-50%) scale(.7)';
    }, 600);
  }

  showAch(name, icon) {
    this.achIc.textContent = icon; this.achTx.textContent = name;
    this.achToast.classList.add('show');
    clearTimeout(this._achT);
    this._achT = setTimeout(() => this.achToast.classList.remove('show'), 2600);
  }
}

export { HUD };
