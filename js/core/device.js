// ============================================================
// device.js — Device/platform detection & responsive sizing
// ============================================================

import { debounce } from './utils.js';

class Device {
  constructor() {
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.isMobile = this._detectMobile();
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    this.isAndroid = /Android/.test(navigator.userAgent);
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.orientation = this._orient();
    this._listeners = [];
    this._setup();
  }

  _detectMobile() {
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || this.isTouch && Math.min(window.innerWidth, window.innerHeight) < 600;
  }

  _orient() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  _setup() {
    const onChange = debounce(() => {
      this.orientation = this._orient();
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      this._listeners.forEach(fn => fn(this));
    }, 150);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
  }

  onChange(fn) { this._listeners.push(fn); }

  // Get optimal particle cap for this device
  particleCap() {
    return this.isMobile ? 300 : 600;
  }

  // Get max DPR accounting for screen size (fill-rate protection)
  maxDPR() {
    const mp = window.innerWidth * window.innerHeight;
    if (mp > 2_000_000) return 1.5;       // huge screen, cap DPR
    if (this.isMobile) return 2;
    return 2;
  }

  // Should we show touch controls?
  showTouchControls() { return this.isTouch && this.isMobile; }

  // Vibrate (mobile haptics, no-op on desktop)
  vibrate(ms) { if (this.isMobile && navigator.vibrate) try { navigator.vibrate(ms); } catch {} }
}

export const device = new Device();
