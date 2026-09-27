import * as THREE from 'three';
import { World, setupEnvironment } from './world.js';
import { Builder } from './builder.js';
import { Player } from './player.js';
import { Runner } from './rig.js';
import { FollowCam } from './camera.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Save } from './save.js';
import { UI } from './ui.js';
import { Trial } from './trial.js';
import { Style } from './style.js';
import { Post } from './post.js';
import { THEMES } from './world.js';
import { MAPS, mapById } from './maps.js';
import { ITEMS, COLORS } from './costumes.js';
import { clamp, lerp } from './util.js';

const STEP = 1 / 120;

function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

class Game {
  constructor() {
    this.save = Save;
    Save.load();
    const S = Save.data.settings;

    this.canvas = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 2500);

    this.world = new World(this.scene);
    this.player = new Player(this.world.col);
    this.runner = new Runner();
    this.ghost = new Runner({ ghost: true });
    this.runner.applyCostume(Save.data.costume);
    this.ghost.applyCostume(Save.data.costume);
    this.ghost.root.visible = false;
    this.scene.add(this.runner.root, this.runner.extras, this.ghost.root);

    this.cam = new FollowCam(this.camera, this.world.col);
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.input = new Input();
    this.sfx = new Sfx();
    this.style = new Style();
    this.ui = new UI(this);

    this.fx = document.getElementById('fx');
    this.fxg = this.fx.getContext('2d');
    this.fxDirty = false;

    this.mode = 'title';
    this.acc = 0;
    this.time = 0;
    this.orbitA = 0;
    this.map = null;

    this.applySettings();
    this.loadMap(Save.data.lastMap);
    this.resize();
    addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('click', () => {
      this.sfx.init();
      if (this.mode === 'play' && !this.input.locked) this.input.lock(this.canvas);
    });
    this.input.onUnlock = () => { if (this.mode === 'play') this.pause(); };
    this.input.onAnyKey = () => this.sfx.init();

    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => { if (this.mode === 'locker') drag = e.clientX; });
    addEventListener('pointermove', (e) => { if (drag != null) { this.orbitA -= (e.clientX - drag) * 0.01; drag = e.clientX; } });
    addEventListener('pointerup', () => (drag = null));

    this.goto('title');
    this.checkGpu();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // Laptops with hybrid graphics often hand the browser the integrated GPU. Say so once.
  checkGpu() {
    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      this.gpuName = name;
      if (/intel|uhd|iris|microsoft basic|swiftshader|llvmpipe/i.test(name)) {
        setTimeout(() => this.ui.toast('Running on integrated graphics — set your browser to "High performance" in Windows graphics settings to use your dedicated GPU', 7000), 1200);
      }
    } catch {}
  }

  applySettings() {
    const s = Save.data.settings;
    this.sfx.setVolume(s.volume);
    this.cam.baseFov = s.fov;
    const pr = s.quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.75);
    if (this.renderer.getPixelRatio() !== pr) { this.renderer.setPixelRatio(pr); this.resize(); }
    this.renderer.shadowMap.enabled = true;
    if (this.env) {
      const size = s.quality === 'low' ? 1024 : 2048;
      if (this.env.sun.shadow.mapSize.x !== size) {
        this.env.sun.shadow.mapSize.set(size, size);
        this.env.sun.shadow.map?.dispose(); this.env.sun.shadow.map = null;
      }
    }
    if (this.post) this.post.setQuality(s.quality);
    Save.persist();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const pr = Math.min(devicePixelRatio, 2);
    this.fx.width = w * pr; this.fx.height = h * pr;
    if (this.post) this.post.setSize(w, h);
  }

  loadMap(id) {
    const map = mapById(id);
    if (this.map === map) return;
    if (this.trial) this.trial.dispose();
    if (this.world.mats) for (const d of Object.values(this.world.mats)) d.mat.dispose();
    this.world.clear();
    if (this.env) this.scene.remove(this.env.group);
    this.map = map;
    this.world.setTheme(map.theme);
    map.build(new Builder(this.world, hashStr(map.id)));
    this.world.finalize();
    this.env = setupEnvironment(this.scene, map.theme, map.env || {});
    this.scene.add(this.env.group);
    this.renderer.toneMappingExposure = this.env.exposure;
    this.post.setTheme(map.theme);
    this.runner.setLight(THEMES[map.theme].eyeLit);
    this.applySettings();
    this.trial = new Trial(this, map);
    const s = map.spawn;
    this.player.reset(s.x, s.y, s.z, s.yaw);
    this.runner.resetExtras();
    this.orbitA = s.yaw;
  }

  previewMap(id) {
    clearTimeout(this._pv);
    this._pv = setTimeout(() => { if (this.mode === 'maps') this.loadMap(id); }, 220);
  }

  goto(screen) {
    this.input.unlock();
    this.sfx.silence();
    this.ghost.root.visible = false;
    if (screen === 'title' || screen === 'maps' || screen === 'locker' || screen === 'settings') {
      const s = this.map.spawn;
      this.player.reset(s.x, s.y, s.z, s.yaw);
      this.runner.resetExtras();
      if (this.mode === 'play' || this.mode === 'paused' || this.mode === 'results') this.orbitA = s.yaw;
    }
    this.mode = screen;
    this.ui.show(screen);
  }

  startRun(id) {
    this.loadMap(id);
    Save.data.lastMap = id;
    Save.persist();
    this.restart();
  }

  restart() {
    this.mode = 'play';
    this.ui.show('hud');
    this.trial.start();
    this.style.reset();
    this.input.clearPressed();
    this.acc = 0;
    this.ui.prompt('MOVE TO START<small>timer starts on your first step · click to capture mouse</small>');
    this.input.lock(this.canvas);
    this.sfx.init();
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.ui.show('pause');
    this.sfx.silence();
  }

  resume() {
    this.mode = 'play';
    this.ui.show('hud');
    this.input.clearPressed();
    this.input.lock(this.canvas);
  }

  nextMap() {
    const i = MAPS.indexOf(this.map);
    const next = MAPS[i + 1];
    if (next && Save.stars() >= next.unlock) this.startRun(next.id);
  }

  resetProgress() {
    for (const m of MAPS) { try { localStorage.removeItem('runoff.ghost.' + m.id); } catch {} }
    Save.data.maps = {};
    Save.persist();
    this.ui.refreshStars();
  }

  unlockList(before, after) {
    const out = [];
    for (const m of MAPS) if (m.unlock > before && m.unlock <= after) out.push(`Course — ${m.name}`);
    for (const [slot, list] of Object.entries(ITEMS)) for (const it of list) if (it.stars > before && it.stars <= after) out.push(`${it.name} (${slot})`);
    for (const c of COLORS) if (c.stars > before && c.stars <= after) out.push(`${c.id[0].toUpperCase() + c.id.slice(1)} color`);
    return out;
  }

  onFinish(r) {
    this.style.bank();
    r.style = this.style.total;
    const rec = Save.map(this.map.id);
    r.prevStyle = rec.bestStyle || 0;
    if (r.style > (rec.bestStyle || 0)) rec.bestStyle = r.style;
    Save.persist();
    const unlocked = this.unlockList(r.starsBefore, r.starsAfter);
    this.mode = 'results';
    this.ui.results(this.map, r, unlocked);
    setTimeout(() => {
      if (this.mode !== 'results') return;
      this.ui.show('results');
      this.input.unlock();
      if (unlocked.length) this.sfx.unlock();
    }, 900);
    this.sfx.finish(r.medal);
  }

  // ---------- simulation ----------

  fixedStep(dt) {
    const play = this.mode === 'play';
    const mv = play ? this.input.move() : { mx: 0, mz: 0 };
    const inp = {
      mx: mv.mx, mz: mv.mz, camYaw: this.cam.yaw,
      jump: play && this.input.take('jump'), jumpHeld: play && this.input.isDown('jump'),
      slide: play && this.input.take('slide'), slideHeld: play && this.input.isDown('slide'),
      trick: play && this.input.take('trick'),
    };
    if (this.trial.fixed(dt, inp)) {
      this.player.step(dt, inp);
      this.trial.afterStep(dt);
    }
  }

  handleEvents() {
    const sfx = this.sfx, S = this.style, playing = this.mode === 'play' && this.trial.started;
    const style = (key, rots) => { if (!playing) return; const it = S.add(key, rots); if (it) this.ui.trickPop(it); };
    for (const e of this.player.events) {
      switch (e.type) {
        case 'jump': sfx.jump(); break;
        case 'land': sfx.land(e.impact); if (e.impact > 15) this.cam.shake = Math.min(1, e.impact / 30); break;
        case 'roll': sfx.roll(); if (!e.dive) style('roll'); break;
        case 'stumble': this.cam.shake = 0.8; if (playing) S.bail(); break;
        case 'vault': sfx.vault(); style('vault'); break;
        case 'climb': sfx.vault(); style('climb'); break;
        case 'walljump': sfx.walljump(); if (!e.kick) style('walljump'); break;
        case 'wallclimb': sfx.walljump(); style('wallclimb'); break;
        case 'wallrun': sfx.slide(); style('wallrun'); break;
        case 'slide': sfx.slide(); if (e.boost) style('slide'); break;
        case 'flipstart': case 'flipchain': sfx.flip(); break;
        case 'trick': style(e.trick, e.rots); if (e.trick === 'dive') sfx.flip(); break;
        case 'stuck': sfx.stuck(); this.ui.boostPop(e.boost); break;
        case 'bail': sfx.bail(); this.cam.shake = 1; if (playing) { const lost = S.bail(); this.ui.bail(lost); } break;
        case 'bounce': sfx.bounce(); style('bounce'); break;
        case 'splat': sfx.splat(); this.cam.shake = 1; if (playing) S.bail(); break;
      }
    }
    this.player.events.length = 0;
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.input.poll();
    const S = Save.data.settings;
    const mode = this.mode;

    if (this.input.take('pause')) {
      if (mode === 'play') this.pause();
      else if (mode === 'paused') this.resume();
    }
    if (mode === 'play' || mode === 'results') {
      if (this.input.take('restart')) { this.restart(); }
      if (mode === 'play' && this.input.take('respawn') && this.trial.started) this.trial.respawn();
    } else {
      this.input.take('restart'); this.input.take('respawn');
    }

    const active = this.mode === 'play' || this.mode === 'results';
    if (active) {
      const look = this.input.consumeLook();
      if (this.mode === 'play') {
        this.cam.look(look.dx, look.dy, S.sens, S.invertY);
        const pl = this.input.padLook;
        if (pl.x || pl.y) this.cam.look(pl.x * 900 * dt, pl.y * 600 * dt, S.sens, S.invertY);
      }
      this.acc += dt;
      while (this.acc >= STEP) { this.fixedStep(STEP); this.acc -= STEP; }
      this.handleEvents();
    } else {
      this.input.consumeLook();
      this.input.take('jump'); this.input.take('slide'); this.input.take('trick');
      this.player.events.length = 0;
    }

    // --- render state ---
    const p = this.player;
    const alpha = active ? this.acc / STEP : 1;
    const rp = { x: lerp(p.prev.x, p.pos.x, alpha), y: lerp(p.prev.y, p.pos.y, alpha), z: lerp(p.prev.z, p.pos.z, alpha) };
    const anim = p.anim();
    const stepped = this.runner.update(dt, anim, rp);
    if (stepped && active && (anim.state === 'ground' || anim.state === 'wallrun' || anim.state === 'wallclimb')) this.sfx.step(anim.state === 'ground' ? p.surface : 'concrete', anim.speed);
    this.runner.updateExtras(dt, active ? anim.speed : 0);

    if (active || this.mode === 'paused') {
      if (this.mode !== 'paused') this.cam.update(dt, rp.x, rp.y, rp.z, anim, p.crouched);
      this.trial.update(dt, this.time);
    } else {
      this.orbit(dt, rp);
    }
    if (this.mode === 'play') {
      this.sfx.update(dt, anim.speed, anim.state);
      if (this.trial.started && !this.trial.done) this.style.update(dt);
      this.ui.hud(this.map, this.trial, anim.speed);
      this.ui.styleHud(this.style);
      this.ui.hint(this.trial.hintAt(p.pos));
    } else if (this.mode !== 'results') this.ui.hint(null);

    this.env.follow(rp.x, rp.y, rp.z);
    this.env.sky.position.copy(this.camera.position);
    this.env.center(this.camera.position.x, this.camera.position.z);
    this.env.update(this.time);
    this.world.update(this.time, dt);
    this.speedLines(active ? anim.speed : 0);
    this.post.render();
  }

  // Dev: RUNOFF.inspect({az, el, d, ty, fov, hideUI}) frames the runner; RUNOFF.inspect(null) restores.
  inspect(o) {
    this._inspect = o ? { az: 0.35, el: 0.1, d: 1.1, ty: 1.45, fov: 40, ...o } : null;
    document.getElementById('ui').style.display = o && o.hideUI !== false ? 'none' : '';
  }

  orbit(dt, p) {
    if (this._inspect) {
      const k = this._inspect, c = this.camera;
      c.position.set(p.x + Math.sin(k.az) * Math.cos(k.el) * k.d, p.y + k.ty + Math.sin(k.el) * k.d, p.z + Math.cos(k.az) * Math.cos(k.el) * k.d);
      c.lookAt(p.x, p.y + k.ty, p.z);
      if (c.fov !== k.fov) { c.fov = k.fov; c.updateProjectionMatrix(); }
      return;
    }
    const close = this.mode === 'locker';
    const wide = innerWidth > 760;
    if (!close) this.orbitA += dt * 0.08;
    const d = close ? (wide ? 3.1 : 5.8) : 6.2, h = close ? 1.25 : 2.6;
    const a = this.orbitA;
    const c = this.camera;
    c.position.set(p.x + Math.sin(a) * d, p.y + h, p.z + Math.cos(a) * d);
    const t = new THREE.Vector3(p.x, p.y + (close ? 1.0 : 1.4), p.z);
    c.lookAt(t);
    // frame the runner beside the UI panel
    const right = new THREE.Vector3().setFromMatrixColumn(c.matrix, 0);
    const shift = close ? (wide ? 0.95 : 0) : this.mode === 'title' ? (wide ? -2.4 : 0) : 0;
    t.addScaledVector(right, shift);
    if (close && !wide) t.y -= 1.15;
    c.lookAt(t);
    if (Math.abs(c.fov - 55) > 0.01) { c.fov = 55; c.updateProjectionMatrix(); this.cam.fov = 55; }
  }

  speedLines(speed) {
    const g = this.fxg, w = this.fx.width, h = this.fx.height;
    const k = clamp((speed - 11) / 7, 0, 1);
    if (k <= 0) {
      if (this.fxDirty) { g.clearRect(0, 0, w, h); this.fxDirty = false; }
      return;
    }
    this.fxDirty = true;
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.45, R = Math.hypot(w, h) / 2;
    g.lineCap = 'round';
    const n = Math.round(16 + k * 34);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = R * (0.42 + Math.random() * 0.4), r1 = r0 + R * (0.08 + Math.random() * 0.2) * k;
      g.strokeStyle = `rgba(255,255,255,${(0.05 + Math.random() * 0.14) * k})`;
      g.lineWidth = 1 + Math.random() * 2.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
    }
  }

  async test(only) {
    const { testAll } = await import('./dev/routes.js');
    const prev = this.map.id;
    const report = testAll(this, only);
    this.loadMap(prev);
    this.goto(this.mode === 'play' ? 'title' : this.mode);
    console.log(report);
    return report;
  }

  // Headless run for testing courses: fn(t, player) -> input; returns sampled trace.
  simulate(fn, seconds = 10, every = 0.25) {
    const trace = [];
    let t = 0, next = 0;
    while (t < seconds) {
      const i = fn(t, this.player);
      const inp = { mx: 0, mz: 0, camYaw: 0, jump: false, jumpHeld: false, slide: false, slideHeld: false, ...i };
      this.player.step(STEP, inp);
      for (const e of this.player.events) if (e.type !== 'land' || e.impact > 5) trace.push({ t: +t.toFixed(3), ev: e.type, ...(e.impact ? { impact: +e.impact.toFixed(1) } : {}) });
      this.player.events.length = 0;
      if (t >= next) {
        const q = this.player.pos;
        trace.push({ t: +t.toFixed(2), x: +q.x.toFixed(2), y: +q.y.toFixed(2), z: +q.z.toFixed(2), s: this.player.state, v: +this.player.hsp.toFixed(1) });
        next += every;
      }
      t += STEP;
    }
    return trace;
  }
}

window.RUNOFF = new Game();
