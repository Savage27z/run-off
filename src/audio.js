// All sound is synthesized with WebAudio: footsteps, wind, whooshes, chimes.
import { clamp } from './util.js';

export class Sfx {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.wind = this.loop(1200, 'bandpass', 0.7);
    this.scrape = this.loop(2600, 'highpass', 0.5);
    this.rumble = this.loop(260, 'lowpass', 1);
  }

  loop(freq, type, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return { f, g };
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  burst({ freq = 1500, type = 'bandpass', q = 1, dur = 0.06, gain = 0.3, attack = 0.002, slide = 0 }) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  tone({ freq = 440, type = 'sine', dur = 0.15, gain = 0.2, delay = 0, slide = 0 }) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  step(surface = 'concrete', speed = 8) {
    const k = clamp(speed / 10, 0.4, 1.2);
    if (surface === 'metal') {
      this.burst({ freq: 900 + Math.random() * 300, q: 2, dur: 0.07, gain: 0.22 * k });
      this.tone({ freq: 380 + Math.random() * 120, type: 'triangle', dur: 0.09, gain: 0.05 * k });
    } else if (surface === 'wood') {
      this.burst({ freq: 600 + Math.random() * 200, q: 1.5, dur: 0.07, gain: 0.25 * k });
      this.tone({ freq: 180 + Math.random() * 40, type: 'sine', dur: 0.06, gain: 0.06 * k });
    } else if (surface === 'gravel') {
      this.burst({ freq: 2200 + Math.random() * 800, q: 0.6, dur: 0.08, gain: 0.2 * k });
    } else {
      this.burst({ freq: 1400 + Math.random() * 500, q: 1.1, dur: 0.05, gain: 0.2 * k });
    }
  }

  jump() { this.burst({ freq: 700, type: 'bandpass', q: 0.8, dur: 0.16, gain: 0.18, slide: 2.5, attack: 0.02 }); }
  land(impact) {
    const k = clamp(impact / 20, 0.2, 1.3);
    this.burst({ freq: 380, type: 'lowpass', q: 0.7, dur: 0.14 + k * 0.08, gain: 0.35 * k });
    if (impact > 12) this.tone({ freq: 70, type: 'sine', dur: 0.18, gain: 0.25 * k, slide: 0.6 });
  }
  roll() { this.burst({ freq: 500, type: 'lowpass', q: 0.5, dur: 0.35, gain: 0.3, attack: 0.03 }); }
  vault() { this.burst({ freq: 1100, q: 0.8, dur: 0.18, gain: 0.2, slide: 0.5, attack: 0.02 }); }
  walljump() {
    this.burst({ freq: 900, q: 1, dur: 0.2, gain: 0.25, slide: 2.2, attack: 0.01 });
    this.tone({ freq: 220, type: 'triangle', dur: 0.08, gain: 0.08 });
  }
  slide() { this.burst({ freq: 1800, type: 'highpass', q: 0.5, dur: 0.25, gain: 0.15, attack: 0.02 }); }
  splat() {
    this.burst({ freq: 200, type: 'lowpass', q: 0.8, dur: 0.5, gain: 0.6 });
    this.tone({ freq: 90, type: 'sawtooth', dur: 0.4, gain: 0.15, slide: 0.4 });
  }
  checkpoint(good = true) {
    const base = good ? 880 : 740;
    this.tone({ freq: base, type: 'triangle', dur: 0.18, gain: 0.16 });
    this.tone({ freq: base * 1.5, type: 'triangle', dur: 0.3, gain: 0.14, delay: 0.07 });
  }
  finish(medal) {
    const notes = [523, 659, 784, 1047, 1319];
    notes.slice(0, 3 + Math.max(0, medal)).forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.4, gain: 0.16, delay: i * 0.09 }));
  }
  click() { this.tone({ freq: 1200, type: 'square', dur: 0.03, gain: 0.04 }); }
  hover() { this.tone({ freq: 1800, type: 'sine', dur: 0.02, gain: 0.02 }); }
  unlock() { [784, 988, 1175, 1568].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.3, gain: 0.12, delay: i * 0.06 })); }
  flip() { this.burst({ freq: 600, type: 'bandpass', q: 0.6, dur: 0.3, gain: 0.2, slide: 3, attack: 0.05 }); }
  stuck() {
    this.tone({ freq: 660, type: 'triangle', dur: 0.12, gain: 0.12 });
    this.tone({ freq: 990, type: 'triangle', dur: 0.2, gain: 0.12, delay: 0.06 });
  }
  bail() {
    this.burst({ freq: 180, type: 'lowpass', q: 0.8, dur: 0.45, gain: 0.55 });
    this.tone({ freq: 220, type: 'sawtooth', dur: 0.35, gain: 0.08, slide: 0.35 });
  }
  bounce() { this.tone({ freq: 180, type: 'sine', dur: 0.35, gain: 0.25, slide: 3.2 }); this.burst({ freq: 400, type: 'lowpass', dur: 0.15, gain: 0.2 }); }
  respawn() { this.tone({ freq: 300, type: 'sine', dur: 0.2, gain: 0.12, slide: 2 }); }

  update(dt, speed, state) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const w = clamp((speed - 5) / 12, 0, 1);
    this.wind.g.gain.setTargetAtTime(w * w * 0.28 + (state === 'air' ? 0.03 : 0), t, 0.15);
    this.wind.f.frequency.setTargetAtTime(500 + speed * 70, t, 0.2);
    this.scrape.g.gain.setTargetAtTime(state === 'wallrun' ? 0.05 : 0, t, 0.05);
    this.rumble.g.gain.setTargetAtTime(state === 'slide' ? 0.35 : 0, t, 0.05);
  }

  silence() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const l of [this.wind, this.scrape, this.rumble]) l.g.gain.setTargetAtTime(0, t, 0.05);
  }
}
