// ============================================================
// audio.js — Procedural Web Audio engine (no sound files)
// Synthesizes all SFX + adaptive background music.
// ============================================================

import { clamp } from './utils.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.musicOn = true;
    this._musicNodes = [];
    this._musicTimer = null;
    this._musicIntensity = 0;   // 0..1, rises with combo
    this._unlocked = false;
  }

  // Must be called from a user gesture (click/touch/keydown)
  unlock() {
    if (this._unlocked) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.0;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.master);
      this._unlocked = true;
    } catch (e) { console.warn('Audio unavailable', e); }
  }

  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.value = on ? 0.9 : 0; }
  setMusic(on) { this.musicOn = on; if (this.musicGain) this.musicGain.gain.value = on ? 0.32 : 0; }
  setIntensity(v) { this._musicIntensity = clamp(v, 0, 1); }

  // ---- Low-level tone ----
  _tone(freq, dur, type = 'sine', vol = 0.16, delay = 0, target = null) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(target || this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // Pitch-bent tone (sweep)
  _sweep(f0, f1, dur, type = 'sine', vol = 0.16, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // Noise burst (for explosions, whoosh)
  _noise(dur, vol = 0.18, delay = 0, filterFreq = 1000, filterType = 'lowpass') {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType; filt.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  _chord(freqs, dur, type = 'triangle', vol = 0.14, stagger = 0.05) {
    freqs.forEach((f, i) => this._tone(f, dur, type, vol, i * stagger));
  }

  // ============ SFX library ============
  open() { this._tone(520, 0.08, 'square', 0.12); this._tone(780, 0.1, 'square', 0.1, 0.06); }
  right(combo) {
    const b = 600 + combo * 45;
    this._tone(b, 0.09, 'triangle', 0.18);
    this._tone(b * 1.5, 0.12, 'triangle', 0.16, 0.08);
    this._tone(b * 2, 0.14, 'triangle', 0.12, 0.17);
  }
  wrong() { this._sweep(220, 110, 0.3, 'sawtooth', 0.16); }
  hurt() { this._tone(180, 0.25, 'sawtooth', 0.18); this._noise(0.15, 0.1, 0.02, 400, 'lowpass'); }
  gem(pitch = 0) {
    const p = pitch * 60;
    this._tone(880 + p, 0.07, 'sine', 0.14);
    this._tone(1320 + p, 0.09, 'sine', 0.1, 0.05);
  }
  turbo() { this._sweep(200, 500, 0.3, 'sawtooth', 0.07); }
  dash() { this._sweep(700, 200, 0.12, 'square', 0.1); this._noise(0.08, 0.06, 0, 2000, 'highpass'); }
  levelup() { this._chord([523, 659, 784, 1047], 0.16, 'triangle', 0.18); }
  over() { [400, 330, 260, 200].forEach((f, i) => this._tone(f, 0.25, 'sawtooth', 0.16, i * 0.16)); }
  bomb() {
    this._noise(0.5, 0.22, 0, 200, 'lowpass');
    this._tone(90, 0.4, 'sawtooth', 0.2);
    this._tone(60, 0.5, 'sawtooth', 0.16, 0.05);
  }
  tick(high) { this._tone(high ? 1600 : 1100, 0.03, 'square', 0.06); }
  ach() { this._chord([784, 988, 1318], 0.18, 'triangle', 0.16); }
  star() {
    this._tone(880, 0.1, 'triangle', 0.16);
    this._tone(1320, 0.12, 'triangle', 0.14, 0.08);
    this._tone(1760, 0.14, 'triangle', 0.1, 0.16);
  }
  shield() { this._tone(500, 0.2, 'sine', 0.12); this._tone(700, 0.2, 'sine', 0.1, 0.06); }
  power() { this._chord([440, 660, 990], 0.14, 'square', 0.12); }
  click() { this._tone(600, 0.04, 'square', 0.08); }
  hover() { this._tone(900, 0.02, 'sine', 0.04); }
  wipe() { this._sweep(100, 800, 0.4, 'sine', 0.1); }
  countdown() { this._tone(440, 0.1, 'triangle', 0.14); }
  go() { this._tone(880, 0.2, 'triangle', 0.18); }
  mpConnect() { this._chord([523, 784], 0.18, 'sine', 0.14); }
  mpDisconnect() { this._sweep(440, 110, 0.4, 'sine', 0.12); }
  // additional SFX
  coin() { this._tone(988, 0.06, 'square', 0.1); this._tone(1318, 0.08, 'square', 0.08, 0.04); }
  whoosh() { this._noise(0.18, 0.07, 0, 1200, 'bandpass'); }
  sparkle() { this._tone(1760, 0.06, 'sine', 0.06); this._tone(2349, 0.05, 'sine', 0.04, 0.03); }
  levelStart() { this._chord([392, 523, 659], 0.14, 'triangle', 0.12, 0.06); }
  uiTap() { this._tone(700, 0.03, 'sine', 0.05); }
  uiBack() { this._tone(440, 0.04, 'sine', 0.05); }
  comboBreak() { this._sweep(440, 160, 0.2, 'sawtooth', 0.1); }
  heartLoss() { this._sweep(330, 180, 0.18, 'triangle', 0.12); this._noise(0.1, 0.06, 0.02, 300, 'lowpass'); }
  themeUnlock() { this._chord([523, 659, 784, 1047, 1318], 0.2, 'sine', 0.13, 0.07); }
  victory() { [523, 659, 784, 1047, 1318, 1568].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.16, i * 0.09)); }
  mpWin() { this._chord([523, 659, 784, 1047, 1318], 0.2, 'triangle', 0.18, 0.08); }
  mpLose() { this._chord([392, 330, 262], 0.25, 'sawtooth', 0.14, 0.1); }

  // ============ Adaptive background music ============
  // Generative loop with melody, bass, pad, and a soft drum layer.
  // Intensifies with combo. Scales shift by level for variety.
  _scales() {
    const sets = [
      { name: 'A-minor pent', mel: [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33], bass: [110, 130.81, 146.83, 164.81, 196] },
      { name: 'C-major',      mel: [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25], bass: [130.81, 196, 174.61, 164.81, 220] },
      { name: 'D-dorian',     mel: [293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33], bass: [146.83, 196, 220, 246.94, 293.66] },
      { name: 'E-phrygian',   mel: [329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25], bass: [164.81, 174.61, 220, 246.94, 329.63] },
    ];
    return sets;
  }
  setMoodForLevel(L) { this._moodIdx = (L >> 2) % this._scales().length; }

  startMusic() {
    if (!this.ctx || !this.musicOn || this._musicTimer) return;
    this.musicGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.5);
    this._scheduleMusic();
  }

  stopMusic() {
    if (this.musicGain && this.ctx) this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
  }

  _scheduleMusic() {
    const sets = this._scales();
    let moodIdx = this._moodIdx || 0;
    let step = 0;
    const tick = () => {
      if (!this.ctx) return;
      const set = sets[moodIdx];
      const intensity = this._musicIntensity;
      const tempo = 0.34 - intensity * 0.10;
      // melody — arpeggiated walk
      const note = set.mel[(step * 3 + (step % 5)) % set.mel.length];
      this._tone(note, tempo * 0.9, 'triangle', 0.05 + intensity * 0.04, 0, this.musicGain);
      // bass on the beat
      if (step % 4 === 0) {
        const bn = set.bass[((step / 4) | 0) % set.bass.length];
        this._tone(bn, tempo * 2.2, 'sine', 0.07, 0, this.musicGain);
      }
      // pad shimmer at high intensity
      if (intensity > 0.5 && step % 2 === 0) {
        this._tone(note * 2, tempo * 0.5, 'sine', 0.03, 0, this.musicGain);
      }
      // soft kick drum every 4 steps at high intensity
      if (intensity > 0.3 && step % 4 === 0) {
        this._tone(60, 0.08, 'sine', 0.05 + intensity * 0.05, 0, this.musicGain);
      }
      // hi-hat tick every 2 steps at very high intensity
      if (intensity > 0.7 && step % 2 === 0) {
        this._noise(0.02, 0.02, 0, 6000, 'highpass');
      }
      step++;
      // change mood every 32 steps for variety
      if (step % 32 === 0) moodIdx = (moodIdx + 1) % sets.length;
      this._musicTimer = setTimeout(tick, tempo * 1000);
    };
    tick();
  }

  // Suspend (mobile battery save)
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}

export const audio = new AudioEngine();
