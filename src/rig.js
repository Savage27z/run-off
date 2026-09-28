// Runner: skinned procedural character (src/char), pose-blended animation incl. stunts,
// facial animation, costume accessories, cloth ribbons and speed trail.
import * as THREE from 'three';
import { clamp, damp, lerp, smooth } from './util.js';
import { colorDef, ITEMS } from './costumes.js';
import { buildCharacter, PIVOT } from './char/build.js';
import { RunnerMotion } from './char/motion.js';

const TAU = Math.PI * 2;
const V = new THREE.Vector3(), V2 = new THREE.Vector3();

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ---------- cloth ribbon (scarf / cape) ----------
class Ribbon {
  constructor(n, seg, width, mat, taper = 0.4) {
    this.n = n; this.seg = seg; this.width = width; this.taper = taper;
    this.pts = []; this.prev = [];
    for (let i = 0; i < n; i++) { this.pts.push(new THREE.Vector3()); this.prev.push(new THREE.Vector3()); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.ready = false;
  }
  reset(anchor, back) {
    for (let i = 0; i < this.n; i++) {
      this.pts[i].copy(anchor).addScaledVector(back, i * this.seg * 0.7).y -= i * this.seg * 0.7;
      this.prev[i].copy(this.pts[i]);
    }
    this.ready = true;
  }
  update(dt, anchor, right, back, drag = 0.9) {
    if (!this.ready || this.pts[0].distanceToSquared(anchor) > 4) this.reset(anchor, back);
    const g = -9.8 * dt * dt;
    this.pts[0].copy(anchor);
    for (let i = 1; i < this.n; i++) {
      const p = this.pts[i], q = this.prev[i];
      V.subVectors(p, q).multiplyScalar(drag);
      q.copy(p);
      p.add(V); p.y += g;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < this.n; i++) {
        const a = this.pts[i - 1], b = this.pts[i];
        V.subVectors(b, a);
        const l = V.length() || 1e-6;
        b.copy(a).addScaledVector(V, this.seg / l);
        V2.subVectors(b, anchor);
        const d = V2.dot(back);
        if (d < 0.03) b.addScaledVector(back, 0.03 - d);
      }
    }
    const arr = this.mesh.geometry.attributes.position.array;
    for (let i = 0; i < this.n; i++) {
      const w = this.width * (1 - (i / (this.n - 1)) * this.taper) * 0.5;
      const p = this.pts[i];
      arr[i * 6] = p.x + right.x * w; arr[i * 6 + 1] = p.y + right.y * w; arr[i * 6 + 2] = p.z + right.z * w;
      arr[i * 6 + 3] = p.x - right.x * w; arr[i * 6 + 4] = p.y - right.y * w; arr[i * 6 + 5] = p.z - right.z * w;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

// ---------- speed trail ----------
class Trail {
  constructor(n = 28) {
    this.n = n;
    this.hist = [];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 2 * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.alpha = 0;
    this.color = new THREE.Color('#ff6a2b');
    this.rainbow = false;
    this.c = new THREE.Color();
  }
  update(dt, p, speed, t, boost = 0) {
    const target = Math.max(clamp((speed - 10) / 4, 0, 1), boost);
    this.alpha = damp(this.alpha, target, 6, dt);
    this.hist.unshift(p.clone());
    if (this.hist.length > this.n) this.hist.pop();
    const pos = this.mesh.geometry.attributes.position.array;
    const col = this.mesh.geometry.attributes.color.array;
    const c = this.c;
    for (let i = 0; i < this.n; i++) {
      const h = this.hist[Math.min(i, this.hist.length - 1)];
      const w = 0.3 * (1 - i / this.n);
      pos[i * 6] = h.x; pos[i * 6 + 1] = h.y + w; pos[i * 6 + 2] = h.z;
      pos[i * 6 + 3] = h.x; pos[i * 6 + 4] = h.y - w; pos[i * 6 + 5] = h.z;
      if (this.rainbow) c.setHSL((t * 0.5 + i / this.n) % 1, 1, 0.6); else c.copy(this.color);
      const a = this.alpha * (1 - i / this.n) * 0.8;
      for (const o of [0, 4]) { col[i * 8 + o] = c.r; col[i * 8 + o + 1] = c.g; col[i * 8 + o + 2] = c.b; col[i * 8 + o + 3] = a; }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
    this.mesh.visible = this.alpha > 0.01;
  }
  reset() { this.hist.length = 0; this.alpha = 0; }
}

const JOINTS = ['spinX', 'spinZ', 'spinY', 'bodyX', 'bodyY', 'spineX', 'spineY', 'neckX',
  'shLX', 'shLZ', 'elLX', 'shRX', 'shRZ', 'elRX', 'hipLX', 'hipLZ', 'knLX', 'anLX', 'hipRX', 'hipRZ', 'knRX', 'anRX'];
const REST = {
  spinX: 0, spinZ: 0, spinY: 0, bodyX: 0, bodyY: 0, spineX: 0, spineY: 0, neckX: 0,
  shLX: 0, shLZ: 0.1, elLX: -0.15, shRX: 0, shRZ: -0.1, elRX: -0.15,
  hipLX: 0, hipLZ: 0.03, knLX: 0.05, anLX: 0, hipRX: 0, hipRZ: -0.03, knRX: 0.05, anRX: 0,
};

const wrapPi = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };

export class Runner {
  constructor({ ghost = false } = {}) {
    this.ghost = ghost;
    this.root = new THREE.Group();
    this.spin = new THREE.Group();
    this.spin.position.y = PIVOT;
    this.inner = new THREE.Group();
    this.inner.position.y = -PIVOT;
    this.root.add(this.spin);
    this.spin.add(this.inner);
    this.extras = new THREE.Group();
    this.phase = 0;
    this.time = 0;
    this.cur = { ...REST };
    this.tgt = { ...REST };
    this.motion = new RunnerMotion();
    this.costume = null;
    this.face = { blink: 0, blinkT: 2, look: new THREE.Vector2(), lookT: 0, lookGoal: new THREE.Vector2(), mouth: new THREE.Vector4(0.6, 0.11, 0, 0), brow: new THREE.Vector2() };
    this.pony = { a: 0, v: 0, b: 0, w: 0 };
    this.lit = 1;
    this.S = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
    this.m = {
      hat: this.S('#ff5a1f'), back: this.S('#ffc629'), accent: this.S('#f4f4f4'), dark: this.S('#23262d'),
      glow: new THREE.MeshBasicMaterial({ color: '#27e8ff', toneMapped: false }),
      metal: new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.25, metalness: 0.9 }),
    };
    this.ghostMat = new THREE.MeshBasicMaterial({ color: '#8fe8ff', transparent: true, opacity: 0.32, depthWrite: false });
    if (!ghost) {
      this.trail = new Trail();
      this.extras.add(this.trail.mesh);
    }
  }

  disposeBuilt() {
    for (const c of [...this.inner.children]) {
      this.inner.remove(c);
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material !== this.ghostMat && !Object.values(this.m).includes(o.material)) o.material.dispose?.();
      });
    }
  }

  applyCostume(c) {
    this.costume = { ...c };
    this.disposeBuilt();
    const B = buildCharacter(c, { ghost: this.ghost });
    this.B = B;
    this.inner.add(B.body);
    if (B.hair) this.inner.add(B.hair);
    this.j = B.bones;
    this.bodyU = B.body.material.userData.u;

    const setCol = (mat, id) => {
      const d = colorDef(id);
      mat.color.set(d.hex);
      mat.metalness = d.metal ? 0.85 : 0;
      mat.roughness = d.metal ? 0.25 : 0.55;
      mat.emissive = new THREE.Color(d.glow ? d.hex : '#000000');
      mat.emissiveIntensity = d.glow ? 0.35 : 0;
    };
    setCol(this.m.hat, c.hatColor);
    setCol(this.m.back, c.backColor);
    this.m.glow.color.set(colorDef(c.topColor).glow ? colorDef(c.topColor).hex : '#27e8ff');

    if (this.trail) this.extras.remove(this.trail.mesh);
    for (const ch of [...this.extras.children]) { this.extras.remove(ch); ch.geometry?.dispose(); }
    if (this.trail) this.extras.add(this.trail.mesh);
    this.scarf = this.cape = null; this.flame = null; this.wings = null; this.halo = null;

    this.buildHat(c.hat);
    this.buildFace(c.face);
    this.buildBack(c.back);

    if (this.trail) {
      const t = ITEMS.trail.find((i) => i.id === c.trail);
      this.trail.enabled = !!(t && t.color);
      this.trail.rainbow = t && t.color === 'rainbow';
      if (t && t.color && t.color !== 'rainbow') this.trail.color.set(t.color);
    }
    if (this.ghost) this.ghostify();
    this.root.traverse((o) => { if (o.isMesh) o.castShadow = !this.ghost && o.castShadow !== false; });
  }

  // Accessories live in the "legacy" head space: centre (0,0.1,0), radius ~0.14, scaled onto the head.
  buildHat(style) {
    const H = this.B.headGear, m = this.m.hat, a = this.m.accent;
    const TAUx = TAU;
    if (style === 'none') return;
    if (style === 'cap' || style === 'backcap') {
      const g = new THREE.Group();
      g.add(mesh(new THREE.SphereGeometry(0.152, 20, 10, 0, TAUx, 0, Math.PI / 2), m, 0, 0.125, -0.005));
      const brim = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20), m, 0, 0.135, 0.125); brim.scale.set(1, 1, 1.15); brim.rotation.x = 0.12; g.add(brim);
      g.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), m, 0, 0.278, 0));
      if (style === 'backcap') g.rotation.y = Math.PI;
      H.add(g);
    } else if (style === 'beanie') {
      H.add(mesh(new THREE.SphereGeometry(0.155, 20, 12, 0, TAUx, 0, Math.PI * 0.56), m, 0, 0.11, -0.005));
      H.add(mesh(new THREE.CylinderGeometry(0.157, 0.16, 0.05, 20, 1, true), m, 0, 0.1, -0.005));
      H.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), a, 0, 0.28, -0.01));
    } else if (style === 'headband') {
      const t = mesh(new THREE.TorusGeometry(0.143, 0.02, 8, 28), m, 0, 0.16, -0.005); t.rotation.x = Math.PI / 2 - 0.2; H.add(t);
    } else if (style === 'headphones') {
      H.add(mesh(new THREE.TorusGeometry(0.155, 0.015, 8, 20, Math.PI), this.m.dark, 0, 0.11, -0.01));
      for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 16), m, s * 0.148, 0.1, -0.01); cup.rotation.z = Math.PI / 2; H.add(cup); }
    } else if (style === 'helmet') {
      H.add(mesh(new THREE.SphereGeometry(0.168, 20, 12, 0, TAUx, 0, Math.PI * 0.5), m, 0, 0.115, -0.01));
      const visor = mesh(new THREE.BoxGeometry(0.2, 0.018, 0.07), this.m.dark, 0, 0.16, 0.155); visor.rotation.x = -0.25; H.add(visor);
      for (const x of [-0.06, 0, 0.06]) H.add(mesh(new THREE.BoxGeometry(0.02, 0.012, 0.16), this.m.dark, x, 0.28, 0));
    } else if (style === 'cat') {
      for (const s of [-1, 1]) {
        const e = mesh(new THREE.ConeGeometry(0.05, 0.1, 4), m, s * 0.085, 0.245, -0.01); e.rotation.z = -s * 0.35; H.add(e);
        const inner = mesh(new THREE.ConeGeometry(0.028, 0.06, 4), a, s * 0.085, 0.24, 0.003); inner.rotation.z = -s * 0.35; H.add(inner);
      }
    } else if (style === 'horns') {
      for (const s of [-1, 1]) {
        const h = mesh(new THREE.ConeGeometry(0.03, 0.14, 10), this.m.accent, s * 0.1, 0.25, 0.01); h.rotation.z = -s * 0.6; h.rotation.x = -0.3; H.add(h);
      }
    } else if (style === 'crown') {
      const gold = this.m.metal.clone(); gold.color.set('#e8b640');
      H.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.055, 18, 1, true), gold, 0, 0.245, -0.01));
      for (let i = 0; i < 6; i++) { const a2 = (i / 6) * TAUx; H.add(mesh(new THREE.ConeGeometry(0.022, 0.065, 4), gold, Math.sin(a2) * 0.105, 0.3, Math.cos(a2) * 0.105 - 0.01)); }
    } else if (style === 'halo') {
      const t = mesh(new THREE.TorusGeometry(0.11, 0.013, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffe9a0', toneMapped: false }), 0, 0.34, 0);
      t.rotation.x = Math.PI / 2; t.castShadow = false; H.add(t); this.halo = t;
    }
  }

  buildFace(style) {
    const H = this.B.headGear;
    if (style === 'shades') {
      const lensMat = new THREE.MeshStandardMaterial({ color: '#0b0c10', roughness: 0.08, metalness: 0.6 });
      for (const s of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(0.068, 0.046, 0.016), lensMat, s * 0.05, 0.115, 0.136); l.rotation.y = s * 0.25; H.add(l); }
      H.add(mesh(new THREE.BoxGeometry(0.2, 0.01, 0.01), this.m.dark, 0, 0.134, 0.132));
    } else if (style === 'mask') {
      H.add(mesh(new THREE.SphereGeometry(0.146, 18, 8, -1.25, 2.5, Math.PI * 0.53, Math.PI * 0.3), this.m.back, 0, 0.1, 0.006));
    } else if (style === 'goggles') {
      const band = mesh(new THREE.TorusGeometry(0.144, 0.013, 6, 28), this.m.dark, 0, 0.17, -0.005); band.rotation.x = Math.PI / 2 - 0.12; H.add(band);
      for (const s of [-1, 1]) {
        const l = mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.028, 16), this.m.glow, s * 0.05, 0.19, 0.12); l.rotation.x = Math.PI / 2 - 0.5; H.add(l);
      }
    } else if (style === 'visor') {
      const g = new THREE.Group(); g.position.y = 0.118; g.rotation.y = -Math.PI * 0.1;
      const v = mesh(new THREE.TorusGeometry(0.15, 0.022, 6, 24, Math.PI * 0.8), this.m.glow);
      v.rotation.x = Math.PI / 2; v.castShadow = false; g.add(v); H.add(g);
    }
  }

  buildBack(style) {
    const B = this.B.backGear, m = this.m.back, N = this.B.neckGear;
    const chest = this.j.chest;
    if (style === 'backpack') {
      B.add(mesh(new THREE.BoxGeometry(0.24, 0.27, 0.11), m, 0, -0.04, -0.04));
      B.add(mesh(new THREE.BoxGeometry(0.19, 0.09, 0.04), this.m.dark, 0, -0.12, -0.1));
      for (const s of [-1, 1]) chest.add(mesh(new THREE.BoxGeometry(0.028, 0.2, 0.22), this.m.dark, s * 0.085, 0.07, 0.0));
    } else if (style === 'scarf') {
      const wrap = mesh(new THREE.TorusGeometry(0.068, 0.03, 8, 20), m); wrap.rotation.x = Math.PI / 2 - 0.1; N.add(wrap);
      if (!this.ghost) { this.scarf = new Ribbon(9, 0.09, 0.1, new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.8, side: THREE.DoubleSide }), 0.2); this.extras.add(this.scarf.mesh); }
    } else if (style === 'cape') {
      if (!this.ghost) { this.cape = new Ribbon(8, 0.12, 0.38, new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.7, side: THREE.DoubleSide }), -0.3); this.extras.add(this.cape.mesh); }
      chest.add(mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), m, 0, 0.14, -0.08));
    } else if (style === 'wings') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.bezierCurveTo(0.2, 0.25, 0.5, 0.3, 0.62, 0.2); shape.bezierCurveTo(0.5, 0.1, 0.45, 0.02, 0.5, -0.1);
      shape.bezierCurveTo(0.35, -0.05, 0.3, -0.15, 0.28, -0.25); shape.bezierCurveTo(0.15, -0.12, 0.05, -0.06, 0, 0);
      const geo = new THREE.ShapeGeometry(shape, 10);
      const wm = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.5, side: THREE.DoubleSide, emissive: m.emissive, emissiveIntensity: m.emissiveIntensity });
      this.wings = [];
      for (const s of [-1, 1]) {
        const piv = new THREE.Group(); piv.position.set(s * 0.05, 0, -0.04);
        const w = mesh(geo, wm); w.scale.set(s * 0.7, 0.7, 0.7); piv.add(w); B.add(piv); this.wings.push({ piv, s });
      }
    } else if (style === 'jetpack') {
      for (const s of [-1, 1]) {
        B.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.27, 14), this.m.metal, s * 0.065, -0.04, -0.05));
        B.add(mesh(new THREE.ConeGeometry(0.045, 0.06, 12), this.m.dark, s * 0.065, -0.2, -0.05)).rotation.x = Math.PI;
      }
      B.add(mesh(new THREE.BoxGeometry(0.09, 0.2, 0.05), m, 0, -0.03, -0.02));
      const fm = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.flame = new THREE.Group();
      for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(0.036, 0.2, 10), fm, s * 0.065, -0.33, -0.05); f.rotation.x = Math.PI; f.castShadow = false; this.flame.add(f); }
      B.add(this.flame);
    }
  }

  ghostify() {
    this.root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { o.material = this.ghostMat; o.castShadow = false; } });
    for (const e of this.B.eyes) e.visible = false;
  }

  setLight(l) {
    this.lit = l;
    if (this.B) for (const e of this.B.eyes) if (e.material.uniforms) e.material.uniforms.uLit.value = l;
  }

  // ---------- animation ----------

  pose(a) {
    const T = this.tgt;
    Object.assign(T, REST);
    const sp = a.speed, t = this.time;
    const cyc = (k, el = -1.35) => {
      const s = Math.sin(this.phase * TAU), c = Math.cos(this.phase * TAU);
      T.hipLX = -0.95 * s * k - 0.08; T.hipRX = 0.95 * s * k - 0.08;
      T.knLX = 0.2 + 1.35 * Math.max(0, c) * k; T.knRX = 0.2 + 1.35 * Math.max(0, -c) * k;
      T.anLX = 0.25 * Math.max(0, -c) * k; T.anRX = 0.25 * Math.max(0, c) * k;
      T.shLX = 0.85 * s * k; T.shRX = -0.85 * s * k;
      T.elLX = el; T.elRX = el;
      T.shLZ = 0.18; T.shRZ = -0.18;
      T.spineY = 0.16 * s * k;
      T.bodyY = -0.03 + 0.045 * Math.abs(s) * k;
      return s;
    };
    const tuck = (amt) => {
      T.hipLX = T.hipRX = lerp(-0.3, -1.75, amt); T.knLX = T.knRX = lerp(0.4, 2.3, amt);
      T.shLX = T.shRX = lerp(-0.4, -1.1, amt); T.elLX = T.elRX = lerp(-0.5, -1.7, amt);
      T.shLZ = lerp(0.6, 0.25, amt); T.shRZ = -T.shLZ;
      T.spineX = 0.55 * amt; T.neckX = 0.45 * amt;
      T.hipLZ = 0.1; T.hipRZ = -0.1;
    };
    switch (a.state) {
      case 'ground': {
        if (sp < 0.4) {
          T.spineX = 0.03 * Math.sin(t * 2.1);
          T.shLZ = 0.12 + 0.02 * Math.sin(t * 2.1); T.shRZ = -T.shLZ;
          T.elLX = T.elRX = -0.25; T.knLX = T.knRX = 0.08; T.hipLX = T.hipRX = -0.04;
          T.hipLZ = 0.06; T.hipRZ = -0.06;
          T.neckX = 0.04 * Math.sin(t * 0.7);
        } else {
          const k = clamp(sp / 8.5, 0.3, 1.25);
          cyc(k, lerp(-0.35, -1.4, clamp((sp - 2) / 5, 0, 1)));
          T.bodyX = 0.06 + 0.022 * Math.min(sp, 16);
          T.neckX = -T.bodyX * 0.6;
        }
        break;
      }
      case 'air': {
        const up = clamp((a.vy + 2) / 8, 0, 1);
        T.hipLX = lerp(-0.45, -1.05, up); T.knLX = lerp(0.6, 1.5, up);
        T.hipRX = lerp(-0.15, 0.4, up); T.knRX = lerp(0.35, 0.55, up);
        T.shLX = lerp(-0.5, 0.6, up); T.shRX = lerp(-0.5, -1.0, up);
        T.shLZ = lerp(1.0, 0.3, up); T.shRZ = -lerp(1.0, 0.3, up);
        T.elLX = lerp(-0.4, -0.7, up); T.elRX = lerp(-0.4, -1.0, up);
        T.bodyX = lerp(0.05, 0.18, up);
        break;
      }
      case 'flip': {
        const f = a.flip || {};
        if (f.axis === 'z') {
          // aerial: straight body, limbs spread
          const o = f.open || 0;
          T.shLZ = lerp(1.5, 0.5, o); T.shRZ = -T.shLZ; T.elLX = T.elRX = -0.2;
          T.hipLZ = lerp(0.45, 0.1, o); T.hipRZ = -T.hipLZ; T.knLX = T.knRX = 0.2;
          T.spinZ = f.angle || 0;
        } else {
          tuck(1 - (f.open || 0));
          T.spinX = f.angle || 0;
        }
        break;
      }
      case 'dive': {
        const k = clamp(a.stateT / 0.18, 0, 1);
        T.spinX = 1.3 * k;
        T.shLX = T.shRX = -2.9 * k; T.shLZ = 0.15; T.shRZ = -0.15; T.elLX = T.elRX = -0.1;
        T.hipLX = 0.15; T.hipRX = 0.25; T.knLX = 0.25; T.knRX = 0.45;
        T.neckX = -0.8 * k; T.spineX = -0.15;
        break;
      }
      case 'crash': {
        const u = a.stateT;
        const fall = clamp(u / 0.3, 0, 1), up = clamp((u - 0.75) / 0.35, 0, 1);
        const lie = fall * (1 - up);
        T.spinX = 1.45 * lie; T.spinY = -0.52 * lie;
        T.shLZ = lerp(0.1, 1.2, lie); T.shRZ = -T.shLZ; T.shLX = T.shRX = -0.6 * lie; T.elLX = T.elRX = -0.4;
        T.hipLX = -0.2 * lie; T.hipRX = 0.1; T.knLX = 0.5 * lie; T.knRX = 0.2;
        T.neckX = -0.6 * lie;
        if (up > 0) { T.spinY -= 0.25 * Math.sin(up * Math.PI); T.knLX = T.knRX = 1.2 * Math.sin(up * Math.PI); T.hipLX = T.hipRX = -0.9 * Math.sin(up * Math.PI); }
        break;
      }
      case 'wallrun': {
        cyc(1.15);
        const f = a.facing, nlx = a.nx * Math.cos(f) - a.nz * Math.sin(f);
        T.spinZ = -nlx * 0.5;
        T.bodyX = 0.18;
        if (nlx > 0) { T.shRZ = -1.3; T.elRX = -0.3; } else { T.shLZ = 1.3; T.elLX = -0.3; }
        break;
      }
      case 'wallclimb': {
        const s = cyc(1.1);
        T.bodyX = -0.12;
        T.shLX = -2.5 + 0.5 * s; T.shRX = -2.5 - 0.5 * s; T.elLX = T.elRX = -0.3;
        T.neckX = -0.4;
        break;
      }
      case 'slide': {
        T.spinY = -0.46; T.bodyX = -1.15; T.spineX = 0.45; T.neckX = 0.55;
        T.hipLX = -0.35; T.knLX = 0.1; T.hipRX = 0.35; T.knRX = 1.7;
        T.shLX = -0.9; T.elLX = -0.8; T.shRX = 0.5; T.shRZ = -0.55; T.elRX = -0.2;
        break;
      }
      case 'roll': {
        const u = clamp(a.stateT / 0.5, 0, 1);
        T.spinY = -0.22;
        tuck(1);
        T.spinX = TAU * smooth(u);
        break;
      }
      case 'stumble': {
        T.spinY = -0.12; T.bodyX = 0.7; T.spineX = 0.3; T.hipLX = T.hipRX = -0.6; T.knLX = T.knRX = 0.95;
        T.shLX = T.shRX = -1.0; T.elLX = T.elRX = -0.5; T.neckX = -0.4;
        break;
      }
      case 'climb': {
        const p = a.climbP, sn = Math.sin(p * Math.PI);
        T.shLX = T.shRX = lerp(-2.9, -0.3, smooth(p)); T.elLX = T.elRX = lerp(-0.2, -1.5, p);
        T.shLZ = 0.3; T.shRZ = -0.3;
        T.hipLX = -1.4 * sn; T.knLX = 1.7 * sn; T.hipRX = -0.6 * sn; T.knRX = 1.2 * sn;
        T.bodyX = 0.35 * sn;
        break;
      }
      case 'vault': {
        const p = a.climbP, sn = Math.sin(p * Math.PI);
        T.spinZ = 0.35 * sn;
        T.hipLX = T.hipRX = -1.2 * sn; T.knLX = T.knRX = 1.5 * sn;
        T.shLX = -0.6; T.shLZ = 0.35; T.shRZ = -1.1; T.elRX = -0.3;
        T.bodyX = 0.25;
        break;
      }
    }
  }

  animateFace(dt, a) {
    const F = this.face;
    // blinking
    F.blinkT -= dt;
    let blink = 0;
    if (F.blinkT < 0.13) blink = Math.sin(clamp(1 - F.blinkT / 0.13, 0, 1) * Math.PI);
    if (F.blinkT <= 0) F.blinkT = 1.8 + Math.random() * 3.2;
    const st = a.state;
    if (st === 'roll' || st === 'crash' || st === 'stumble') blink = Math.max(blink, 0.75);
    // gaze
    F.lookT -= dt;
    if (F.lookT <= 0) {
      F.lookT = 0.6 + Math.random() * 2.2;
      if (a.speed < 0.5 && st === 'ground') F.lookGoal.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.4) * 0.6);
      else F.lookGoal.set((Math.random() - 0.5) * 0.25, 0.12);
    }
    F.look.x = damp(F.look.x, F.lookGoal.x, 18, dt); F.look.y = damp(F.look.y, F.lookGoal.y, 18, dt);
    // expression targets: mouth (curve, width, open, tilt), brow (raise, angle)
    let mc = 0.65, mw = 0.1, mo = 0, br = 0, ba = 0;
    const fast = clamp((a.speed - 6) / 8, 0, 1);
    switch (st) {
      case 'ground': if (a.speed > 0.5) { mc = 0.25; mo = 0.12 * fast; ba = 0.5; } break;
      case 'air': mc = 0.7; mo = a.vy > 0 ? 0.35 : 0.2; br = 0.5; break;
      case 'flip': case 'dive': mc = 1; mo = 0.62; br = 0.8; mw = 0.12; break;
      case 'wallrun': case 'wallclimb': mc = 0.35; mo = 0.28; ba = 0.7; break;
      case 'slide': mc = 0.6; mo = 0.3; br = 0.3; break;
      case 'roll': mc = 0.2; mo = 0.1; break;
      case 'stumble': case 'crash': mc = -0.9; mo = 0.35; br = 0.2; ba = -1; mw = 0.12; break;
      case 'climb': case 'vault': mc = 0.1; mo = 0.2; ba = 0.6; break;
    }
    const M = F.mouth;
    M.x = damp(M.x, mc, 10, dt); M.y = damp(M.y, mw, 10, dt); M.z = damp(M.z, mo, 12, dt);
    F.brow.x = damp(F.brow.x, br, 8, dt); F.brow.y = damp(F.brow.y, ba, 8, dt);
    if (this.bodyU) {
      this.bodyU.uMouth.value.copy(M);
      this.bodyU.uBrow.value.set(F.brow.x, F.brow.y, 0);
    }
    if (this.B) for (const e of this.B.eyes) {
      const u = e.material.uniforms; if (!u) continue;
      u.uBlink.value = blink;
      u.uLook.value.copy(F.look);
      u.uPupil.value = st === 'flip' || st === 'dive' ? 0.85 : 1;
    }
  }

  // anim: {state, stateT, speed, vy, facing, nx, nz, climbP, flip}
  update(dt, a, pos) {
    if (!this.j) return false;
    this.time += dt;
    const st = a.state;
    let step = false;
    if (st === 'ground' || st === 'wallrun' || st === 'wallclimb') {
      const sp = st === 'wallclimb' ? 7 : a.speed;
      const stride = lerp(1.3, 3.2, clamp(sp / 9, 0, 1));
      const before = Math.floor(this.phase * 2);
      this.phase += (sp * dt) / stride;
      if (Math.floor(this.phase * 2) !== before && sp > 0.5) step = true;
      if (this.phase > 1000) this.phase -= 1000;
    }
    this.pose(a);
    this.motion.update(dt, a);
    if (st === 'ground') {
      const m = this.motion, T = this.tgt;
      T.spinZ += m.bank;
      T.bodyX += m.lean;
      T.neckX -= m.lean * 0.5;
      // Absorb the landing through hips and knees, then settle back into the stride.
      T.bodyY -= m.landing * 0.08;
      T.hipLX -= m.landing * 0.16; T.hipRX -= m.landing * 0.16;
      T.knLX += m.landing * 0.32; T.knRX += m.landing * 0.32;
      T.spineX += m.landing * 0.12;
    }
    const direct = st === 'roll' || st === 'flip';
    const fast = st === 'roll' || st === 'climb' || st === 'vault' || st === 'flip' || st === 'crash';
    const rate = fast ? 26 : st === 'air' || st === 'dive' ? 11 : 16;
    const C = this.cur, T = this.tgt;
    for (const k of JOINTS) {
      if (k === 'spinX' || k === 'spinZ') continue;
      C[k] = damp(C[k], T[k], rate, dt);
    }
    for (const k of ['spinX', 'spinZ']) {
      if (direct && T[k] !== 0) C[k] = T[k];
      else { C[k] = damp(wrapPi(C[k]), T[k], st === 'dive' || st === 'crash' ? 9 : 16, dt); }
    }

    const j = this.j;
    this.spin.rotation.set(C.spinX, 0, C.spinZ);
    this.spin.position.y = PIVOT + C.spinY;
    j.hips.position.y = 0.8 + C.bodyY;
    j.hips.rotation.x = C.bodyX;
    j.spine.rotation.set(C.spineX * 0.5, C.spineY * 0.5, 0);
    j.chest.rotation.set(C.spineX * 0.5, C.spineY * 0.5, 0);
    j.neck.rotation.x = C.neckX * 0.5;
    j.head.rotation.x = C.neckX * 0.5;
    j.upperArmL.rotation.set(C.shLX, 0, C.shLZ); j.foreArmL.rotation.x = C.elLX;
    j.upperArmR.rotation.set(C.shRX, 0, C.shRZ); j.foreArmR.rotation.x = C.elRX;
    j.thighL.rotation.set(C.hipLX, 0, C.hipLZ); j.shinL.rotation.x = C.knLX; j.footL.rotation.x = C.anLX;
    j.thighR.rotation.set(C.hipRX, 0, C.hipRZ); j.shinR.rotation.x = C.knRX; j.footR.rotation.x = C.anRX;

    if (pos) this.root.position.set(pos.x, pos.y, pos.z);
    this.root.rotation.y = a.facing;

    if (!this.ghost) this.animateFace(dt, a);

    // ponytail spring: swings back with speed, bounces with vertical motion
    if (this.B && this.B.ponyPivot) {
      const P = this.pony;
      const goal = 0.25 + clamp(a.speed / 10, 0, 1) * 1.0 - clamp(a.vy / 10, -1, 1) * 0.4;
      P.v += ((goal - P.a) * 90 - P.v * 9) * dt; P.a += P.v * dt;
      const sway = Math.sin(this.phase * TAU) * 0.15 * clamp(a.speed / 8, 0, 1);
      P.w += ((sway - P.b) * 60 - P.w * 7) * dt; P.b += P.w * dt;
      this.B.ponyPivot.rotation.set(-P.a, 0, P.b);
    }

    if (this.wings) {
      const open = st === 'air' || st === 'wallrun' || st === 'flip' || st === 'dive' ? 1 : 0.2;
      const flap = st === 'air' || st === 'dive' ? Math.sin(this.time * 14) * 0.25 : Math.sin(this.time * 2) * 0.05;
      for (const w of this.wings) w.piv.rotation.y = w.s * (0.5 - open * 0.5 + flap);
    }
    if (this.flame) {
      const on = ((st === 'air' || st === 'flip' || st === 'dive') && a.vy > -2) || st === 'wallrun' || st === 'wallclimb';
      this.flame.visible = on;
      this.flame.scale.y = 0.7 + Math.random() * 0.6;
    }
    if (this.halo) this.halo.position.y = 0.34 + Math.sin(this.time * 2) * 0.012;
    return step;
  }

  updateExtras(dt, speed, boost = 0) {
    if (!this.j) return;
    this.root.updateMatrixWorld(true);
    const right = V2.set(-1, 0, 0).applyQuaternion(this.root.quaternion).clone();
    const back = new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion);
    const chestM = this.j.chest.matrixWorld;
    if (this.scarf) this.scarf.update(dt, new THREE.Vector3(0, 0.185, -0.065).applyMatrix4(chestM), right, back, 0.9);
    if (this.cape) this.cape.update(dt, new THREE.Vector3(0, 0.15, -0.1).applyMatrix4(chestM), right, back, 0.88);
    if (this.trail) {
      const hips = new THREE.Vector3().setFromMatrixPosition(this.j.hips.matrixWorld);
      if (this.trail.enabled) this.trail.update(dt, hips, speed, this.time, boost);
      else this.trail.mesh.visible = false;
    }
  }

  resetExtras() {
    this.motion.reset();
    if (this.scarf) this.scarf.ready = false;
    if (this.cape) this.cape.ready = false;
    if (this.trail) this.trail.reset();
  }
}
