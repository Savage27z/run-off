// Procedural surface primitives for the character. Each part is a grid of vertices with per-vertex
// color, skin weights and face/material attributes; parts are merged into one skinned geometry.
import * as THREE from 'three';

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

// Collects parts. Vertex payload: p (Vector3), c ([r,g,b]), w ([[bone, weight], ...]),
// face ([az, el] or null), mat ([glow, metal, roughness]).
export class PartBuilder {
  constructor() {
    this.pos = []; this.col = []; this.si = []; this.sw = []; this.face = []; this.mat = []; this.idx = [];
    this.nrm = [];
  }

  // grid: rows x cols vertices from fn(i, j) -> vertex payload. wrap joins last col to first.
  grid(rows, cols, fn, { wrap = true, flip = false } = {}) {
    const base = this.pos.length / 3;
    const P = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const v = fn(i, j);
      P.push(v.p);
      this.push(v);
    }
    const idx = [];
    const cc = wrap ? cols : cols - 1;
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cc; j++) {
        const a = i * cols + j, b = i * cols + ((j + 1) % cols), c = (i + 1) * cols + ((j + 1) % cols), d = (i + 1) * cols + j;
        if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
      }
    }
    // smooth normals for this part only
    const n = P.map(() => V3());
    const e1 = V3(), e2 = V3(), fn2 = V3();
    for (let k = 0; k < idx.length; k += 3) {
      const A = P[idx[k]], B = P[idx[k + 1]], C = P[idx[k + 2]];
      e1.subVectors(B, A); e2.subVectors(C, A); fn2.crossVectors(e1, e2);
      n[idx[k]].add(fn2); n[idx[k + 1]].add(fn2); n[idx[k + 2]].add(fn2);
    }
    for (const v of n) { if (v.lengthSq() < 1e-14) v.set(0, 1, 0); v.normalize(); this.nrm.push(v.x, v.y, v.z); }
    for (const k of idx) this.idx.push(base + k);
  }

  push(v) {
    this.pos.push(v.p.x, v.p.y, v.p.z);
    const c = v.c || [1, 1, 1];
    this.col.push(c[0], c[1], c[2]);
    const w = (v.w || [[0, 1]]).slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const [, x] of w) s += x;
    for (let k = 0; k < 4; k++) { this.si.push(w[k] ? w[k][0] : 0); this.sw.push(w[k] ? w[k][1] / s : 0); }
    const f = v.face || [9, 9];
    this.face.push(f[0], f[1]);
    const m = v.mat || [0, 0, 0.8];
    this.mat.push(m[0], m[1], m[2]);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setAttribute('aFace', new THREE.Float32BufferAttribute(this.face, 2));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

// Catmull-Rom path through points; returns {at(t) -> {p, T}, length}
export function path(points) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return {
    curve,
    at: (t) => ({ p: curve.getPointAt(t), T: curve.getTangentAt(t) }),
    length: curve.getLength(),
  };
}

// Swept tube with rounded caps. radius(t) -> r; section(t, th) -> [sx, sy] scale; up hints frame orientation.
// Callback vertex(t, th, p, n) -> payload extras (c, w, mat...). t in [0,1] along the tube (caps extend slightly).
export function sweep(pb, pts, { rings = 20, segs = 14, radius, section = null, up = V3(0, 0, 1), cap0 = true, cap1 = true, vertex }) {
  const P = path(pts);
  const frames = [];
  let N = up.clone();
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const { p, T } = P.at(t);
    N = N.clone().sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    const B = V3().crossVectors(T, N).normalize();
    frames.push({ t, p, T, N: N.clone(), B });
  }
  const capRings = 4;
  const all = [];
  if (cap0) {
    const f = frames[0], r0 = radius(0);
    for (let k = capRings; k >= 1; k--) {
      const a = (k / capRings) * Math.PI / 2;
      all.push({ ...f, p: f.p.clone().addScaledVector(f.T, -Math.sin(a) * r0 * 0.9), rs: Math.cos(a), t: 0 });
    }
  }
  for (const f of frames) all.push({ ...f, rs: 1 });
  if (cap1) {
    const f = frames[frames.length - 1], r1 = radius(1);
    for (let k = 1; k <= capRings; k++) {
      const a = (k / capRings) * Math.PI / 2;
      all.push({ ...f, p: f.p.clone().addScaledVector(f.T, Math.sin(a) * r1 * 0.9), rs: Math.cos(a), t: 1 });
    }
  }
  pb.grid(all.length, segs, (i, j) => {
    const f = all[i];
    const th = (j / segs) * Math.PI * 2;
    const r = radius(f.t) * Math.max(0.001, f.rs);
    let sx = 1, sy = 1;
    if (section) [sx, sy] = section(f.t, th);
    const n = V3().addScaledVector(f.N, Math.cos(th) * sx).addScaledVector(f.B, Math.sin(th) * sy);
    const p = f.p.clone().addScaledVector(n, r);
    return { p, ...(vertex ? vertex(f.t, th, p, n) : {}) };
  });
}

// Lofted superellipse rings stacked along y. rows: [{y, a (half-width x), b (half-depth z), n, zc, xc}]
export function loft(pb, rows, { segs = 28, vertex, closeTop = false, closeBottom = false }) {
  const R = rows.slice();
  if (closeBottom) R.unshift({ ...R[0], a: 0.001, b: 0.001, y: R[0].y - 0.002 });
  if (closeTop) R.push({ ...R[R.length - 1], a: 0.001, b: 0.001, y: R[R.length - 1].y + 0.002 });
  pb.grid(R.length, segs, (i, j) => {
    const r = R[i];
    const th = (j / segs) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    const e = 2 / (r.n || 2);
    const x = (r.xc || 0) + r.a * Math.sign(s) * Math.pow(Math.abs(s), e);
    const z = (r.zc || 0) + r.b * Math.sign(c) * Math.pow(Math.abs(c), e);
    const p = V3(x, r.y, z);
    return { p, ...(vertex ? vertex(i / (R.length - 1), th, p, r) : {}) };
  });
}

// Ellipsoid-ish closed surface: fn(az, el) -> Vector3 point; az wraps, el from -pi/2..pi/2
export function sphereGrid(pb, rows, cols, surf, vertex, elMin = -Math.PI / 2, elMax = Math.PI / 2) {
  pb.grid(rows, cols, (i, j) => {
    const el = mix(elMin, elMax, i / (rows - 1));
    const az = -Math.PI + (j / cols) * Math.PI * 2;
    const p = surf(az, el);
    return { p, ...(vertex ? vertex(az, el, p) : {}) };
  });
}

export function superEllipsoid(pb, c, rx, ry, rz, e = 0.7, vertex, rows = 12, cols = 16) {
  const sp = (w, m) => Math.sign(w) * Math.pow(Math.abs(w), m);
  sphereGrid(pb, rows, cols, (az, el) => V3(
    c.x + rx * sp(Math.cos(el), e) * sp(Math.sin(az), e),
    c.y + ry * sp(Math.sin(el), e),
    c.z + rz * sp(Math.cos(el), e) * sp(Math.cos(az), e),
  ), vertex);
}
