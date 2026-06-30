// ============================================================
// mobile.js — Touch controls UI (virtual turbo + dash buttons)
// Shows only on touch devices. Wires into Input.
// ============================================================

import { device } from '../core/device.js';
import { audio } from '../core/audio.js';

class MobileControls {
  constructor(input) {
    this.input = input;
    this.turboBtn = document.getElementById('mob-turbo');
    this.dashBtn = document.getElementById('mob-dash');
    this.container = document.getElementById('mobile');
    if (!device.showTouchControls()) { this.container.style.display = 'none'; return; }
    this._wire();
  }

  _wire() {
    // turbo = hold
    this.turboBtn.addEventListener('touchstart', e => { e.preventDefault(); audio.unlock(); this.input.setTurboButton(true); }, { passive: false });
    this.turboBtn.addEventListener('touchend', e => { e.preventDefault(); this.input.setTurboButton(false); }, { passive: false });
    this.turboBtn.addEventListener('touchcancel', e => { this.input.setTurboButton(false); }, { passive: true });
    // dash = tap
    this.dashBtn.addEventListener('touchstart', e => { e.preventDefault(); audio.unlock(); this.input.triggerDash(); this._flash(this.dashBtn); }, { passive: false });
  }

  _flash(btn) {
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => { btn.style.transform = ''; }, 100);
  }

  show() { if (device.showTouchControls()) this.container.style.display = 'block'; }
  hide() { this.container.style.display = 'none'; }
}

export { MobileControls };
