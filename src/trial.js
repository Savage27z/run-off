// Time trial: gates, splits, medals, ghost record + playback.
import * as THREE from 'three';
import { STATE_CODES } from './player.js';
import { lerp, wrapAngle } from './util.js';
import { checker } from './textures.js';

export const MEDALS = [
  { id: 'bronze', name: 'Bronze', color: '#d98a4a' },
  { id: 'silver', name: 'Silver', color: '#c9d2dc' },
  { id: 'gold', name: 'Gold', color: '#ffcf40' },
  { id: 'ace', name: 'Ace', color: '#c6ff3d' },
];

export function medalFor(map, t) {
  let m = -1;
  for (let i = 0; i < map.medals.length; i++) if (t <= map.medals[i]) m = i;
  return m;
}

const GHOST_HZ = 30;

const curtainVert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const curtainFrag = /* glsl */`
uniform vec3 color; uniform float time, opacity, width;
varying vec2 vUv;
void main() {
  float x = vUv.x * width;
  float chev = fract(x * 0.5 - abs(vUv.y - 0.5) * 1.2 + time * 1.4);
  float band = smoothstep(0.0, 0.1, chev) * (1.0 - smoothstep(0.35, 0.45, chev));
  float edge = pow(abs(vUv.y - 0.5) * 2.0, 6.0);
  float a = (0.08 + band * 0.22 + edge * 0.4) * opacity * (1.0 - smoothstep(0.85, 1.0, vUv.y));
  gl_FragColor = vec4(color * (1.0 + band), a);
}`;

export class Trial {
  constructor(game, map) {
    this.game = game;
    this.map = map;
    this.group = new THREE.Group();
    game.world.add(this.group);
    this.gates = map.checkpoints.map((cp, i) => this.buildGate(cp, i === map.checkpoints.length - 1));
    this.ghostData = null;
    this.t = 0; this.started = false; this.done = false; this.next = 0;
    this.splits = []; this.rec = []; this.recAcc = 0; this.respawns = 0;
    this.lastSpawn = { ...map.spawn };
  }

  buildGate(cp, finish) {
    const g = new THREE.Group();
    const w = cp.visX1 - cp.visX0, h = Math.min(cp.y1 - cp.visY, 6);
    const cx = (cp.visX0 + cp.visX1) / 2, cz = (cp.z0 + cp.z1) / 2;
    const color = new THREE.Color(finish ? '#ffffff' : '#ff5a1f');
    const mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: color }, time: { value: 0 }, opacity: { value: 1 }, width: { value: w } },
      vertexShader: curtainVert, fragmentShader: curtainFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    curtain.position.set(cx, cp.visY + h / 2, cz);
    g.add(curtain);
    const postMat = new THREE.MeshStandardMaterial({ color: finish ? '#f4f4f4' : '#1b1f2a', roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
    for (const x of [cp.visX0 + 0.12, cp.visX1 - 0.12]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, h + 0.4, 10), postMat);
      p.position.set(x, cp.visY + (h + 0.4) / 2, cz); p.castShadow = true; g.add(p);
    }
    if (finish) {
      const tex = checker().clone(); tex.needsUpdate = true;
      tex.repeat.set(Math.max(2, Math.round(w / 1.2)), 1);
      const banner = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
      banner.position.set(cx, cp.visY + h + 0.2, cz); banner.castShadow = true; g.add(banner);
    } else {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), postMat);
      bar.position.set(cx, cp.visY + h + 0.35, cz); g.add(bar);
    }
    this.group.add(g);
    return { g, mat, cp, finish };
  }

  start() {
    const s = this.map.spawn;
    this.game.player.reset(s.x, s.y, s.z, s.yaw);
    this.game.cam.snap(s.x, s.y, s.z, s.yaw);
    this.game.runner.resetExtras();
    this.t = 0;
    this.started = false;
    this.done = false;
    this.next = 0;
    this.splits = [];
    this.lastSpawn = { ...s };
    this.rec = [];
    this.recAcc = 0;
    this.respawns = 0;
    const best = this.game.save.map(this.map.id);
    this.bestSplits = best.splits;
    this.ghostData = this.game.save.data.settings.ghost ? this.game.save.ghost(this.map.id) : null;
    this.game.ghost.root.visible = false;
    this.refreshGates();
  }

  refreshGates() {
    this.gates.forEach((G, i) => {
      G.g.visible = i >= this.next;
      G.mat.uniforms.opacity.value = i === this.next ? 1 : 0.25;
    });
  }

  respawn() {
    const s = this.lastSpawn;
    this.game.player.reset(s.x, s.y, s.z, s.yaw);
    this.game.cam.snap(s.x, s.y, s.z, s.yaw);
    this.game.runner.resetExtras();
    this.respawns++;
    this.game.sfx.respawn();
  }

  // returns true if the player should be simulated this step
  fixed(dt, inp) {
    if (this.done) return true;
    if (!this.started) {
      if (inp.mx || inp.mz || inp.jump) { this.started = true; this.game.ui.hidePrompt(); }
      else return false;
    }
    this.t += dt;
    return true;
  }

  afterStep(dt) {
    if (this.done || !this.started) return;
    const p = this.game.player;
    const pos = p.pos;
    const G = this.gates[this.next];
    if (G) {
      const c = G.cp;
      if (pos.x + 0.3 > c.x0 && pos.x - 0.3 < c.x1 && pos.y + 1.8 > c.y0 && pos.y < c.y1 && pos.z + 0.3 > c.z0 && pos.z - 0.3 < c.z1) this.pass(this.next);
    }
    const dead = p.dead || pos.y < this.map.killY || (this.map.isDead && this.map.isDead(pos, this.next));
    if (dead && !this.done) this.respawn();

    this.recAcc += dt;
    while (this.recAcc >= 1 / GHOST_HZ) {
      this.recAcc -= 1 / GHOST_HZ;
      const a = p.anim();
      this.rec.push(
        +pos.x.toFixed(3), +pos.y.toFixed(3), +pos.z.toFixed(3), +a.facing.toFixed(3),
        STATE_CODES.indexOf(a.state), +a.speed.toFixed(2), +a.vy.toFixed(2), a.nx, a.nz, +a.stateT.toFixed(3), +a.climbP.toFixed(3),
        a.flip ? (a.flip.axis === 'x' ? 1 : 2) : 0, a.flip ? +a.flip.angle.toFixed(3) : 0,
      );
    }
  }

  pass(i) {
    const cp = this.map.checkpoints[i];
    this.splits.push(this.t);
    const finish = i === this.map.checkpoints.length - 1;
    const bestSplit = this.bestSplits && this.bestSplits[i];
    const diff = bestSplit != null ? this.t - bestSplit : null;
    this.game.ui.split(this.t, diff, i + 1, this.map.checkpoints.length);
    this.game.sfx.checkpoint(diff == null || diff <= 0);
    this.lastSpawn = { ...cp.spawn };
    this.next = i + 1;
    this.refreshGates();
    if (finish) this.finish();
  }

  finish() {
    this.done = true;
    const save = this.game.save;
    const rec = save.map(this.map.id);
    const starsBefore = save.stars();
    const t = this.t;
    const medal = medalFor(this.map, t);
    const pb = rec.best == null || t < rec.best;
    const prevBest = rec.best;
    rec.runs = (rec.runs || 0) + 1;
    if (pb) {
      rec.best = t;
      rec.splits = this.splits.slice();
      save.setGhost(this.map.id, { v: 2, hz: GHOST_HZ, f: this.rec, t });
    }
    if (medal > rec.medal) rec.medal = medal;
    save.persist();
    const starsAfter = save.stars();
    this.game.onFinish({ t, medal, pb, prevBest, starsBefore, starsAfter, respawns: this.respawns });
  }

  // Ghost pose at the current run time.
  ghostSample() {
    const g = this.ghostData;
    if (!g || !g.f || !this.started || g.v !== 2) return null;
    const N = 13, frames = g.f.length / N;
    const f = this.t * g.hz;
    if (f >= frames - 1) return null;
    const i = Math.floor(f), u = f - i, a = i * N, b = (i + 1) * N, F = g.f;
    return {
      pos: { x: lerp(F[a], F[b], u), y: lerp(F[a + 1], F[b + 1], u), z: lerp(F[a + 2], F[b + 2], u) },
      anim: {
        facing: F[a + 3] + wrapAngle(F[b + 3] - F[a + 3]) * u,
        state: STATE_CODES[F[a + 4]] || 'ground', speed: F[a + 5], vy: F[a + 6], nx: F[a + 7], nz: F[a + 8],
        stateT: F[a + 9], climbP: lerp(F[a + 10], F[b + 10], u),
        flip: F[a + 11] ? { axis: F[a + 11] === 1 ? 'x' : 'z', angle: F[a + 12], open: 0 } : null,
      },
    };
  }

  update(dt, time) {
    for (const G of this.gates) G.mat.uniforms.time.value = time;
    const gs = this.ghostSample();
    const ghost = this.game.ghost;
    if (gs) {
      ghost.root.visible = true;
      ghost.update(dt, gs.anim, gs.pos);
      const d = Math.hypot(gs.pos.x - this.game.player.pos.x, gs.pos.z - this.game.player.pos.z);
      ghost.ghostMat.opacity = Math.min(0.32, d * 0.12);
    } else ghost.root.visible = false;
  }

  hintAt(p) {
    for (const h of this.map.hints) {
      if (p.x >= h.x0 && p.x <= h.x1 && p.z >= h.z0 && p.z <= h.z1 && p.y >= h.y0 && p.y <= h.y1) return h.text;
    }
    return null;
  }

  dispose() {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); });
    this.group.parent && this.group.parent.remove(this.group);
  }
}
