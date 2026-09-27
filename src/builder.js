// Level-building vocabulary on top of World: buildings, roof clutter, containers, scaffolds, signs.
import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { textTexture, arrowTexture, glowSprite } from './textures.js';

const M4 = new THREE.Matrix4();
const CONT = { L: 12.2, H: 2.6, W: 2.44 };
const CONTAINER_COLORS = ['c_red', 'c_blue', 'c_green', 'c_orange', 'c_white', 'c_yellow', 'c_teal', 'c_grey'];
const FACADES = ['fac_beige', 'fac_grey', 'fac_brick', 'fac_brick2', 'fac_office', 'fac_ribbon', 'fac_mint', 'fac_peach', 'fac_sky', 'fac_coral', 'fac_lemon', 'fac_lilac'];
const Q = new THREE.Quaternion(), E = new THREE.Euler(), S1 = new THREE.Vector3(1, 1, 1), P0 = new THREE.Vector3();
const GEO = {
  blob: new THREE.IcosahedronGeometry(1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  cone: new THREE.ConeGeometry(1, 1, 16, 1, true),
};

export class Builder {
  constructor(world, seed = 1) {
    this.w = world;
    this.rng = mulberry32(seed);
  }

  r(a = 0, b = 1) { return a + (b - a) * this.rng(); }
  pick(arr) { return arr[(this.rng() * arr.length) | 0]; }

  box(x0, y0, z0, x1, y1, z1, mat, opts) { this.w.box(x0, y0, z0, x1, y1, z1, mat, opts); }

  // Building from street level to roof height h. parapet: string of edges 'n'(+z) 's'(-z) 'e'(+x) 'w'(-x).
  building(x0, z0, x1, z1, h, fac = 'fac_beige', parapet = '', { roof = 'roof', lip = 0.35, base = 0, cornice = true, trim = 'parapet' } = {}) {
    this.w.box(x0, base, z0, x1, h, z1, { side: fac, top: roof }, { shade: [0.3, 1], uvo: [this.r(0, 16), 0], surface: roof === 'roof' ? 'gravel' : undefined });
    if (cornice) {
      // protruding band under the roofline + a plinth band at street level (visual only)
      const o = 0.22, y0 = h - 0.45;
      this.w.box(x0 - o, y0, z0 - o, x1 + o, h - 0.02, z1 + o, { side: trim, top: null, bottom: trim }, { collide: false, keepBottom: true });
      if (base === 0 && h > 8) this.w.box(x0 - 0.12, 0, z0 - 0.12, x1 + 0.12, 3.2, z1 + 0.12, { side: trim, top: trim }, { collide: false, shade: [0.5, 0.9] });
    }
    const t = 0.3, y = h, y1 = h + lip;
    const P = 'parapet';
    if (parapet.includes('s')) this.w.box(x0, y, z0, x1, y1, z0 + t, P);
    if (parapet.includes('n')) this.w.box(x0, y, z1 - t, x1, y1, z1, P);
    if (parapet.includes('w')) this.w.box(x0, y, z0, x0 + t, y1, z1, P);
    if (parapet.includes('e')) this.w.box(x1 - t, y, z0, x1, y1, z1, P);
  }

  ac(x, y, z, rot = 0) {
    const [w, d] = rot ? [1.0, 1.4] : [1.4, 1.0];
    this.w.box(x - w / 2, y, z - d / 2, x + w / 2, y + 1.05, z + d / 2, 'metal', { shade: [0.6, 1] });
    M4.makeTranslation(x, y + 1.07, z);
    this.w.geo(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 16), 'dark', M4);
  }

  vent(x, y, z) {
    this.w.box(x - 0.25, y, z - 0.25, x + 0.25, y + 0.7, z + 0.25, 'duct', { collide: true });
    M4.makeTranslation(x, y + 0.8, z);
    this.w.geo(new THREE.ConeGeometry(0.38, 0.25, 12), 'steel', M4);
  }

  housing(x0, z0, x1, z1, y, h = 2.6, fac = 'parapet') {
    this.w.box(x0, y, z0, x1, y + h, z1, { side: fac, top: 'roof' }, { shade: [0.7, 1] });
  }

  antenna(x, y, z, h = 6) {
    M4.makeTranslation(x, y + h / 2, z);
    this.w.geo(new THREE.CylinderGeometry(0.04, 0.07, h, 6), 'steel', M4);
    for (let i = 1; i < 4; i++) {
      M4.makeTranslation(x, y + h * (0.4 + i * 0.15), z);
      this.w.geo(new THREE.BoxGeometry(0.9 - i * 0.2, 0.03, 0.03), 'steel', M4);
    }
    this.light(x, y + h + 0.1, z, '#ff3030', 0.5, true);
  }

  waterTower(x, y, z) {
    const legH = 3;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      M4.makeTranslation(x + dx * 1.1, y + legH / 2, z + dz * 1.1);
      this.w.geo(new THREE.CylinderGeometry(0.08, 0.1, legH, 6), 'steel', M4);
    }
    M4.makeTranslation(x, y + legH + 1.5, z);
    this.w.geo(new THREE.CylinderGeometry(1.6, 1.6, 3, 20, 1), 'wood', M4);
    M4.makeTranslation(x, y + legH + 3.5, z);
    this.w.geo(new THREE.ConeGeometry(1.8, 1.2, 20), 'steel', M4);
    this.w.col.add(x - 1.4, y + legH, z - 1.4, x + 1.4, y + legH + 3, z + 1.4, 'wood');
  }

  duct(x0, y0, z0, x1, y1, z1) {
    this.w.box(x0, y0, z0, x1, y1, z1, 'duct', { shade: [0.7, 1] });
  }

  container(x0, y0, z0, alongZ = true, color = null, open = false) {
    const c = color || this.pick(CONTAINER_COLORS);
    const x1 = x0 + (alongZ ? CONT.W : CONT.L), z1 = z0 + (alongZ ? CONT.L : CONT.W);
    this.w.box(x0, y0, z0, x1, y0 + CONT.H, z1, c, { shade: [0.75, 1], surface: 'metal' });
    // door bars on one end
    if (!open) {
      const ex = alongZ ? null : x1 + 0.01, ez = alongZ ? z1 + 0.01 : null;
      for (let i = 0; i < 4; i++) {
        const o = 0.35 + i * 0.58;
        if (alongZ) M4.makeTranslation(x0 + o, y0 + CONT.H / 2, ez);
        else M4.makeTranslation(ex, y0 + CONT.H / 2, z0 + o);
        this.w.geo(new THREE.BoxGeometry(alongZ ? 0.04 : 0.04, CONT.H * 0.92, 0.04), 'steel', M4);
      }
    }
    return { x1, z1, y1: y0 + CONT.H };
  }

  // Grid of containers: cols side-by-side, levels high, starting at (x0,z0).
  stack(x0, z0, alongZ, cols, levels, colors = null, rows = 1) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let l = 0; l < levels; l++) {
          const col = colors ? colors[(c + l + r) % colors.length] : null;
          const x = alongZ ? x0 + c * CONT.W : x0 + r * CONT.L;
          const z = alongZ ? z0 + r * CONT.L : z0 + c * CONT.W;
          this.container(x, l * CONT.H, z, alongZ, col);
        }
      }
    }
  }

  plankDeck(x0, z0, x1, z1, y, t = 0.2) {
    this.w.box(x0, y - t, z0, x1, y, z1, { top: 'wood', side: 'wood', bottom: 'steel' }, { surface: 'wood' });
  }

  slab(x0, z0, x1, z1, y, t = 0.35, cols = true) {
    this.w.box(x0, y - t, z0, x1, y, z1, { top: 'concrete', side: 'concrete', bottom: 'concrete' }, { keepBottom: true });
    if (cols) {
      for (const cx of [x0 + 0.2, x1 - 0.2]) for (const cz of [z0 + 0.2, z1 - 0.2]) this.column(cx, cz, 0, y - t);
    }
  }

  column(x, z, y0, y1, s = 0.2, mat = 'beam') {
    this.w.box(x - s, y0, z - s, x + s, y1, z + s, mat);
  }

  // I-beam lying along an axis, top at y.
  ibeam(x0, z0, x1, z1, y, mat = 'beam') {
    const alongX = x1 - x0 > z1 - z0;
    const h = 0.45, fl = 0.06;
    this.w.box(x0, y - h, z0, x1, y, z1, mat, { invisible: true });
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = alongX ? x1 - x0 : z1 - z0, W = alongX ? z1 - z0 : x1 - x0;
    const put = (w, hh, yy) => {
      M4.makeTranslation(cx, yy, cz);
      this.w.geo(alongX ? new THREE.BoxGeometry(L, hh, w) : new THREE.BoxGeometry(w, hh, L), mat, M4);
    };
    put(W, fl, y - fl / 2);
    put(W, fl, y - h + fl / 2);
    put(W * 0.18, h - fl * 2, y - h / 2);
  }

  // Thin-member lattice box (crane mast / jib), decoration only.
  lattice(x0, y0, z0, x1, y1, z1, mat = 'beam_yellow', axis = 'y', seg = 2) {
    const t = 0.12;
    const put = (x, y, z, sx, sy, sz, rx = 0, rz = 0, ry = 0) => {
      M4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
      this.w.geo(new THREE.BoxGeometry(sx, sy, sz), mat, M4);
    };
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    if (axis === 'y') {
      for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) put(cx, y0 + dy / 2, cz, t, dy, t);
      const n = Math.max(1, Math.round(dy / seg)), h = dy / n;
      for (let i = 0; i < n; i++) {
        const yy = y0 + i * h;
        put(x0 + dx / 2, yy, z0, dx, t, t); put(x0 + dx / 2, yy, z1, dx, t, t);
        put(x0, yy, z0 + dz / 2, t, t, dz); put(x1, yy, z0 + dz / 2, t, t, dz);
        const a = Math.atan2(h, dx), l = Math.hypot(h, dx);
        put(x0 + dx / 2, yy + h / 2, z0, l, t * 0.7, t * 0.7, 0, (i % 2 ? 1 : -1) * a);
        put(x0 + dx / 2, yy + h / 2, z1, l, t * 0.7, t * 0.7, 0, (i % 2 ? -1 : 1) * a);
      }
    } else {
      const L = axis === 'x' ? dx : dz;
      for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        if (axis === 'x') put(x0 + dx / 2, a ? y1 : y0, b ? z1 : z0, dx, t, t);
        else put(a ? x1 : x0, b ? y1 : y0, z0 + dz / 2, t, t, dz);
      }
      const n = Math.max(1, Math.round(L / seg)), s = L / n;
      for (let i = 0; i <= n; i++) {
        if (axis === 'x') { const x = x0 + i * s; put(x, y0 + dy / 2, z0, t, dy, t); put(x, y0 + dy / 2, z1, t, dy, t); }
        else { const z = z0 + i * s; put(x0, y0 + dy / 2, z, t, dy, t); put(x1, y0 + dy / 2, z, t, dy, t); }
      }
    }
  }

  scaffold(x0, z0, x1, z1, y0, y1) {
    const mat = 'steel';
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      M4.makeTranslation(cx, (y0 + y1) / 2, cz);
      this.w.geo(new THREE.CylinderGeometry(0.05, 0.05, y1 - y0, 6), mat, M4);
    }
    for (let y = y0 + 1.5; y < y1; y += 2) {
      M4.makeTranslation((x0 + x1) / 2, y, z0); this.w.geo(new THREE.BoxGeometry(x1 - x0, 0.06, 0.06), mat, M4);
      M4.makeTranslation((x0 + x1) / 2, y, z1); this.w.geo(new THREE.BoxGeometry(x1 - x0, 0.06, 0.06), mat, M4);
    }
  }


  // ---------- props ----------

  put(geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    E.set(rx, ry, rz);
    M4.compose(P0.set(x, y, z), Q.setFromEuler(E), new THREE.Vector3(sx, sy, sz));
    this.w.geo(geo, mat, M4);
  }

  // Railing along an axis-aligned line at height y. Collides as a thin vaultable wall.
  railing(x0, z0, x1, z1, y, h = 1.0, { collide = true, mat = 'rail' } = {}) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const L = alongX ? x1 - x0 : z1 - z0;
    const n = Math.max(1, Math.round(Math.abs(L) / 1.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.put(GEO.cyl6, mat, x0 + (x1 - x0) * t, y + h / 2, z0 + (z1 - z0) * t, 0.035, h, 0.035);
    }
    for (const hy of [h, h * 0.5]) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      this.put(GEO.cyl6, mat, cx, y + hy, cz, 0.035, Math.abs(L), 0.035, alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0);
    }
    if (collide) {
      const t = 0.06;
      this.w.col.add(Math.min(x0, x1) - t, y, Math.min(z0, z1) - t, Math.max(x0, x1) + t, y + h, Math.max(z0, z1) + t, 'metal');
    }
  }

  bush(x, y, z, r = 0.6, mat = 'leaf') {
    const k = this.r(0.85, 1.15);
    this.put(GEO.blob, mat, x, y + r * 0.7, z, r * k, r * 0.85, r * k, 0, this.r(0, 6), 0);
    this.put(GEO.blob, mat === 'leaf' ? 'leaf2' : 'leaf', x + r * 0.45, y + r * 0.5, z + r * 0.2, r * 0.6, r * 0.55, r * 0.6);
  }

  planter(x0, z0, x1, z1, y, h = 0.55, mat = 'wood') {
    this.w.box(x0, y, z0, x1, y + h, z1, { side: mat, top: 'soil' }, { shade: [0.7, 1] });
    const w = x1 - x0, d = z1 - z0, n = Math.max(1, Math.round(Math.max(w, d) / 1.1));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bx = w > d ? x0 + w * t : (x0 + x1) / 2, bz = w > d ? (z0 + z1) / 2 : z0 + d * t;
      this.bush(bx, y + h, bz, Math.min(w, d) * 0.45 + this.r(0, 0.15));
    }
  }

  tree(x, y, z, s = 1) {
    this.put(GEO.cyl, 'trunk', x, y + 1.3 * s, z, 0.13 * s, 2.6 * s, 0.13 * s);
    this.w.col.add(x - 0.18 * s, y, z - 0.18 * s, x + 0.18 * s, y + 2.4 * s, z + 0.18 * s, 'wood');
    this.put(GEO.blob, 'leaf', x, y + 3.2 * s, z, 1.3 * s, 1.1 * s, 1.3 * s, 0, this.r(0, 6), 0);
    this.put(GEO.blob, 'leaf2', x + 0.6 * s, y + 2.7 * s, z + 0.3 * s, 0.9 * s, 0.8 * s, 0.9 * s);
    this.put(GEO.blob, 'leaf', x - 0.5 * s, y + 2.8 * s, z - 0.4 * s, 0.85 * s, 0.75 * s, 0.85 * s);
  }

  palm(x, y, z, h = 6) {
    const lean = this.r(-0.25, 0.25), dir = this.r(0, Math.PI * 2);
    const segs = 7;
    let px = x, pz = z, py = y;
    for (let i = 0; i < segs; i++) {
      const t = i / segs, l = h / segs;
      const a = lean * (0.3 + t);
      const nx = px + Math.cos(dir) * Math.sin(a) * l, nz = pz + Math.sin(dir) * Math.sin(a) * l, ny = py + Math.cos(a) * l;
      const r = 0.2 - t * 0.07;
      this.put(GEO.cyl6, 'trunk', (px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, r, l * 1.05, r, Math.sin(dir) * a, 0, -Math.cos(dir) * a);
      px = nx; py = ny; pz = nz;
    }
    this.w.col.add(x - 0.2, y, z - 0.2, x + 0.2, y + h * 0.9, z + 0.2, 'wood');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.r(0, 0.3);
      for (let k = 0; k < 3; k++) {
        const d = 0.5 + k * 0.75, drop = k * k * 0.22;
        this.put(GEO.blob, i % 2 ? 'leaf' : 'leaf2', px + Math.cos(a) * d, py - drop, pz + Math.sin(a) * d, 0.55 - k * 0.1, 0.07, 0.22, 0, -a, -0.2 - k * 0.25);
      }
    }
    this.put(GEO.sphere, 'trunk', px, py - 0.1, pz, 0.28, 0.22, 0.28);
  }

  bench(x, y, z, rot = 0) {
    const along = rot ? [0.5, 1.6] : [1.6, 0.5];
    this.w.box(x - along[0] / 2, y + 0.42, z - along[1] / 2, x + along[0] / 2, y + 0.5, z + along[1] / 2, 'wood', { collide: false });
    for (const s of [-1, 1]) {
      const lx = rot ? x : x + s * 0.65, lz = rot ? z + s * 0.65 : z;
      this.put(GEO.box, 'steel', lx, y + 0.21, lz, rot ? 0.45 : 0.06, 0.42, rot ? 0.06 : 0.45);
    }
    this.w.col.add(x - along[0] / 2, y, z - along[1] / 2, x + along[0] / 2, y + 0.5, z + along[1] / 2, 'wood');
  }

  parasol(x, y, z, mat = 'canvas_red') {
    this.put(GEO.cyl6, 'rail', x, y + 1.2, z, 0.04, 2.4, 0.04);
    this.put(GEO.cone, mat, x, y + 2.35, z, 1.4, 0.45, 1.4);
    this.w.col.add(x - 0.06, y, z - 0.06, x + 0.06, y + 2.2, z + 0.06, 'metal');
    this.put(GEO.cyl, 'wood', x + 0.9, y + 0.36, z, 0.35, 0.05, 0.35);
    this.put(GEO.cyl6, 'steel', x + 0.9, y + 0.18, z, 0.03, 0.36, 0.03);
  }

  // Striped canvas bounce pad (awning / tarp). Top surface at y.
  awning(x0, z0, x1, z1, y, mat = 'canvas_red', frame = true) {
    this.w.box(x0, y - 0.12, z0, x1, y, z1, { top: mat, side: mat, bottom: mat }, { keepBottom: true });
    if (frame) {
      for (const [cx, cz] of [[x0 + 0.1, z0 + 0.1], [x1 - 0.1, z0 + 0.1], [x0 + 0.1, z1 - 0.1], [x1 - 0.1, z1 - 0.1]]) {
        this.put(GEO.cyl6, 'rail', cx, y - 0.4, cz, 0.04, 0.6, 0.04);
      }
      // scalloped valance on the long edges
      const alongX = x1 - x0 >= z1 - z0;
      const L = alongX ? x1 - x0 : z1 - z0, n = Math.max(2, Math.round(L / 0.5));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        for (const e of [0, 1]) {
          const px = alongX ? x0 + L * t : (e ? x1 : x0), pz = alongX ? (e ? z1 : z0) : z0 + L * t;
          this.put(GEO.sphere, mat, px, y - 0.14, pz, 0.24, 0.12, 0.24);
        }
      }
    }
  }

  // Catenary of glowing bulbs between two points.
  stringLights(x0, y0, z0, x1, y1, z1, { n = 14, sag = 0.8, color = '#ffd88a', glow = true } = {}) {
    const P = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      P.push(new THREE.Vector3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag, z0 + (z1 - z0) * t));
    }
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[i + 1], m = a.clone().add(b).multiplyScalar(0.5), d = b.clone().sub(a);
      Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      M4.compose(m, Q, new THREE.Vector3(0.012, d.length(), 0.012));
      this.w.geo(GEO.cyl6, 'dark', M4);
    }
    for (let i = 1; i < n; i++) {
      this.put(GEO.sphere, 'bulb', P[i].x, P[i].y - 0.08, P[i].z, 0.06, 0.08, 0.06);
      if (glow && i % 2 === 0) this.light(P[i].x, P[i].y - 0.08, P[i].z, color, 0.9);
    }
  }

  bunting(x0, y0, z0, x1, y1, z1, { n = 12, sag = 0.7 } = {}) {
    const cols = ['pennant_a', 'pennant_b', 'pennant_c', 'pennant_d'];
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.34, 0], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    const ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag, z = z0 + (z1 - z0) * t;
      if (i < n) {
        const t2 = (i + 1) / n;
        const x2 = x0 + (x1 - x0) * t2, y2 = y0 + (y1 - y0) * t2 - Math.sin(t2 * Math.PI) * sag, z2 = z0 + (z1 - z0) * t2;
        const a = new THREE.Vector3(x, y, z), b = new THREE.Vector3(x2, y2, z2), d = b.clone().sub(a);
        Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        M4.compose(a.clone().add(b).multiplyScalar(0.5), Q, new THREE.Vector3(0.01, d.length(), 0.01));
        this.w.geo(GEO.cyl6, 'dark', M4);
      }
      if (i > 0 && i < n) this.put(tri, cols[i % 4], x, y, z, 1, 1, 1, 0, ang + Math.PI / 2, 0);
    }
  }

  solarPanels(x0, z0, x1, z1, y) {
    for (let z = z0; z + 1.2 <= z1; z += 1.6) {
      this.put(GEO.box, 'solar', (x0 + x1) / 2, y + 0.5, z + 0.6, x1 - x0, 0.06, 1.2, -0.45, 0, 0);
      this.put(GEO.box, 'steel', (x0 + x1) / 2, y + 0.25, z + 0.95, x1 - x0 - 0.2, 0.5, 0.05);
    }
    this.w.col.add(x0, y, z0, x1, y + 0.8, z1, 'metal');
  }

  dish(x, y, z, ry = 0) {
    this.put(GEO.cyl6, 'steel', x, y + 0.5, z, 0.05, 1, 0.05);
    this.put(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.35), 'white', x, y + 1.1, z, 1, 1, 1, -1.1, ry, 0);
  }

  crates(x, y, z, n = 3) {
    for (let i = 0; i < n; i++) {
      const s = this.r(0.6, 0.9), ox = this.r(-0.5, 0.5), oz = this.r(-0.5, 0.5);
      const yy = i === n - 1 && n > 2 ? y + 0.8 : y;
      this.w.box(x + ox - s / 2, yy, z + oz - s / 2, x + ox + s / 2, yy + s, z + oz + s / 2, 'wood', { shade: [0.75, 1] });
    }
  }

  cone(x, y, z) {
    this.put(new THREE.ConeGeometry(0.18, 0.55, 12), 'c_orange', x, y + 0.3, z, 1, 1, 1);
    this.put(GEO.box, 'c_orange', x, y + 0.02, z, 0.42, 0.04, 0.42);
  }

  barrier(x0, z0, x1, z1, y = 0) {
    this.w.box(x0, y, z0, x1, y + 0.9, z1, { side: 'hazard', top: 'concrete' }, { shade: [0.6, 1] });
  }

  car(x, z, rot = 0, mat = null) {
    const m = mat || this.pick(['car_red', 'car_blue', 'car_yellow', 'car_white']);
    const along = rot ? [1.8, 4.2] : [4.2, 1.8];
    this.w.box(x - along[0] / 2, 0.3, z - along[1] / 2, x + along[0] / 2, 1.0, z + along[1] / 2, m, { collide: false });
    const cab = rot ? [1.6, 2.2] : [2.2, 1.6];
    this.w.box(x - cab[0] / 2, 1.0, z - cab[1] / 2, x + cab[0] / 2, 1.55, z + cab[1] / 2, 'glass_dark', { collide: false });
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const wx = rot ? x + a * 0.85 : x + a * 1.35, wz = rot ? z + b * 1.35 : z + b * 0.85;
      this.put(GEO.cyl, 'dark', wx, 0.34, wz, 0.34, 0.25, 0.34, rot ? 0 : Math.PI / 2, 0, rot ? Math.PI / 2 : 0);
    }
  }

  // Street furniture along a straight street centred on x=sx running in z (or z=sz running in x)
  streetLife({ x = null, z = null, from, to, cars = 6, trees = true }) {
    for (let i = 0; i < cars; i++) {
      const t = from + (to - from) * this.rng();
      if (x !== null) this.car(x + (this.rng() < 0.5 ? -2 : 2), t, 1);
      else this.car(t, z + (this.rng() < 0.5 ? -2 : 2), 0);
    }
    if (trees) for (let t = from; t < to; t += 14) {
      if (x !== null) { this.tree(x - 6, 0, t, 0.9); this.tree(x + 6, 0, t + 7, 0.9); }
      else { this.tree(t, 0, z - 6, 0.9); this.tree(t + 7, 0, z + 6, 0.9); }
    }
  }


  // ---------- concrete park kit ----------

  // Concrete terrace block with paved top.
  terrace(x0, z0, x1, z1, h, top = 'pav_light', base = 0) {
    this.w.box(x0, base, z0, x1, h, z1, { side: 'conc', top }, { shade: [0.55, 1] });
  }

  // Straight stair run along z. From (y0 at z0) rising by `rise` per step toward dir (+1/-1 in z).
  // Each step is a solid box down to `base` so it reads as poured concrete. Cheek walls + dark handrails.
  stairs(x0, x1, z0, y0, steps, { rise = 0.3, run = 0.42, dir = 1, base = null, cheeks = true, rails = true, top = 'pav_light' } = {}) {
    const b = base ?? Math.min(y0, y0 + rise * steps * 0) ;
    for (let i = 0; i < steps; i++) {
      const za = z0 + dir * i * run, zb = za + dir * run;
      const y = y0 + (i + 1) * rise;
      this.w.box(x0, b, Math.min(za, zb), x1, y, Math.max(za, zb), { side: 'conc', top }, { shade: [0.6, 1] });
    }
    const zEnd = z0 + dir * steps * run, yEnd = y0 + steps * rise;
    if (cheeks) {
      for (const [cx0, cx1] of [[x0 - 0.35, x0], [x1, x1 + 0.35]]) {
        // stepped collision so the cheek follows the slope, one visual slab
        for (let i = 0; i < steps; i += 2) {
          const za = z0 + dir * i * run, zb = z0 + dir * Math.min(steps, i + 2) * run;
          this.w.box(cx0, b, Math.min(za, zb), cx1, y0 + Math.min(steps, i + 2) * rise + 0.25, Math.max(za, zb), 'conc', { invisible: true });
        }
        const L = Math.hypot(steps * run, steps * rise), ang = Math.atan2(steps * rise, steps * run) * dir;
        this.put(GEO.box, 'conc', (cx0 + cx1) / 2, (y0 + yEnd) / 2 + 0.25 - 0.35, (z0 + zEnd) / 2, 0.35, 0.95, L, -ang, 0, 0);
        this.w.box(cx0, b, Math.min(z0, zEnd), cx1, y0 + 0.05, Math.max(z0, zEnd), 'conc', { collide: false });
      }
    }
    if (rails) for (const x of [x0 - 0.18, x1 + 0.18]) this.slopeRail(x, z0, y0 + 0.35, zEnd, yEnd + 0.35);
  }

  // Dark handrail following a slope in z, with posts.
  slopeRail(x, z0, y0, z1, y1, h = 0.95) {
    const L = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y1 - y0, z1 - z0);
    this.put(GEO.cyl6, 'rail_dark', x, (y0 + y1) / 2 + h, (z0 + z1) / 2, 0.028, L, 0.028, Math.PI / 2 - ang, 0, 0);
    const n = Math.max(2, Math.round(L / 1.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.put(GEO.cyl6, 'rail_dark', x, y0 + (y1 - y0) * t + h / 2, z0 + (z1 - z0) * t, 0.025, h, 0.025);
    }
  }

  // Dark mesh-panel railing (collidable, vaultable).
  meshRail(x0, z0, x1, z1, y, h = 1.05, collide = true) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const L = alongX ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.put(GEO.box, 'fence', cx, y + h * 0.5, cz, alongX ? Math.abs(L) : 0.02, h * 0.82, alongX ? 0.02 : Math.abs(L));
    this.put(GEO.box, 'rail_dark', cx, y + h, cz, alongX ? Math.abs(L) : 0.06, 0.06, alongX ? 0.06 : Math.abs(L));
    const n = Math.max(1, Math.round(Math.abs(L) / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.put(GEO.box, 'rail_dark', x0 + (x1 - x0) * t, y + h / 2, z0 + (z1 - z0) * t, 0.06, h, 0.06);
    }
    if (collide) this.w.col.add(Math.min(x0, x1) - 0.05, y, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, y + h, Math.max(z0, z1) + 0.05, 'metal');
  }

  // Hanging vines from an edge line (visual).
  vines(x0, z0, x1, z1, y, { density = 1.2, len = [0.8, 2.4], out = [0, 0] } = {}) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L * density));
    for (let i = 0; i < n; i++) {
      const t = (i + this.r(0, 1)) / n;
      let x = x0 + (x1 - x0) * t + out[0] * 0.15, z = z0 + (z1 - z0) * t + out[1] * 0.15;
      const segs = Math.round(this.r(len[0], len[1]) / 0.22);
      for (let k = 0; k < segs; k++) {
        const r = 0.2 * (1 - (k / segs) * 0.55);
        x += this.r(-0.05, 0.05) + out[0] * 0.02; z += this.r(-0.05, 0.05) + out[1] * 0.02;
        this.put(GEO.blob, k % 3 ? 'vine' : 'vine2', x, y - k * 0.22, z, r * 1.2, r, r * 1.2, 0, this.r(0, 6), 0);
      }
    }
  }

  // Concrete planter with a tree/shrubs and vines spilling over the sides.
  concPlanter(x0, z0, x1, z1, y, h = 0.9, { tree = true, vines = true } = {}) {
    this.w.box(x0, y, z0, x1, y + h, z1, { side: 'conc', top: 'grass' }, { shade: [0.6, 1] });
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (tree) this.tree(cx, y + h, cz, 1.05 + this.r(0, 0.35));
    const w = x1 - x0, d = z1 - z0;
    const n = Math.max(3, Math.round((w * d) / 0.9));
    for (let i = 0; i < n; i++) {
      this.bush(x0 + 0.25 + this.r(0, w - 0.5), y + h - 0.1, z0 + 0.25 + this.r(0, d - 0.5), this.r(0.4, 0.75), this.rng() < 0.5 ? 'leaf' : 'leaf2');
    }
    if (vines) {
      const v = { density: 1.3, len: [0.6, h + 0.9] };
      this.vines(x0, z0 - 0.02, x1, z0 - 0.02, y + h, { ...v, out: [0, -1] });
      this.vines(x0, z1 + 0.02, x1, z1 + 0.02, y + h, { ...v, out: [0, 1] });
      if (this.rng() < 0.8) this.vines(x0 - 0.02, z0, x0 - 0.02, z1, y + h, { ...v, out: [-1, 0] });
      if (this.rng() < 0.8) this.vines(x1 + 0.02, z0, x1 + 0.02, z1, y + h, { ...v, out: [1, 0] });
    }
  }

  // Skate bowl sunk into a terrace: pit collision + smooth rounded-rectangle concrete bowl mesh.
  bowl(x0, z0, x1, z1, topY, depth = 1.8) {
    const floorY = topY - depth;
    this.w.box(x0, topY - 4, z0, x1, floorY, z1, { top: 'conc', side: 'conc' }, { collide: true });
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ax = (x1 - x0) / 2, az = (z1 - z0) / 2;
    const rows = 12, cols = 48, pos = [], idx = [], uv = [];
    const R = Math.min(ax, az) * 0.45;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, curve = 1 - Math.cos(t * Math.PI / 2);
      const inset = R * Math.sin(t * Math.PI / 2) * 0.9, y = topY - depth * curve;
      for (let j = 0; j < cols; j++) {
        const th = (j / cols) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
        const e = 2 / 4.5;
        const px = cx + (ax - inset) * Math.sign(c) * Math.pow(Math.abs(c), e);
        const pz = cz + (az - inset) * Math.sign(sn) * Math.pow(Math.abs(sn), e);
        pos.push(px, y, pz); uv.push(px / 4, pz / 4 + y / 4);
      }
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const a = i * cols + j, b = i * cols + ((j + 1) % cols), c2 = (i + 1) * cols + ((j + 1) % cols), d = (i + 1) * cols + j;
      idx.push(a, c2, b, a, d, c2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.w.geo(g, 'conc', new THREE.Matrix4());
    // coping rim
    for (const [a0, a1, b0, b1] of [[x0, x1, z0 - 0.12, z0 + 0.12], [x0, x1, z1 - 0.12, z1 + 0.12], [x0 - 0.12, x0 + 0.12, z0, z1], [x1 - 0.12, x1 + 0.12, z0, z1]]) {
      this.w.box(a0, topY - 0.02, b0, a1, topY + 0.06, b1, 'rail', { collide: false });
    }
  }

  // Elevated walkway slab on columns with mesh rails. Runs along z.
  walkway(x0, x1, z0, z1, y, { rails = 'both', columns = 8 } = {}) {
    this.w.box(x0, y - 0.45, z0, x1, y, z1, { top: 'pav_light', side: 'conc', bottom: 'conc' }, { keepBottom: true });
    for (let z = z0 + 1; z < z1; z += columns) {
      this.w.box((x0 + x1) / 2 - 0.35, 0, z, (x0 + x1) / 2 + 0.35, y - 0.45, z + 0.7, 'conc');
    }
    if (rails === 'both' || rails === 'w') this.meshRail(x0 + 0.08, z0, x0 + 0.08, z1, y);
    if (rails === 'both' || rails === 'e') this.meshRail(x1 - 0.08, z0, x1 - 0.08, z1, y);
  }

  // Zig-zag fire escape against a wall facing -x or +x (visual; landings collide).
  fireEscape(x, z0, y0, y1, face = -1) {
    const floors = Math.floor((y1 - y0) / 3);
    const ox = x + face * 1.1;
    for (let f = 1; f <= floors; f++) {
      const y = y0 + f * 3;
      this.w.box(Math.min(x, ox), y - 0.08, z0, Math.max(x, ox), y, z0 + 4.5, 'rail_dark');
      this.meshRail(ox, z0, ox, z0 + 4.5, y, 1.0, false);
      const up = f % 2 ? 1 : -1;
      const L = Math.hypot(4, 3);
      this.put(GEO.box, 'rail_dark', (x + ox) / 2, y - 1.5, z0 + 2.25, 0.9, 0.06, L, (up > 0 ? 1 : -1) * Math.atan2(3, 4), 0, 0);
    }
  }

  dumpster(x, z, rot = 0) {
    const [w, d] = rot ? [1.2, 2] : [2, 1.2];
    this.w.box(x - w / 2, 0, z - d / 2, x + w / 2, 1.3, z + d / 2, 'dumpster', { shade: [0.7, 1] });
    this.w.box(x - w / 2 - 0.05, 1.3, z - d / 2 - 0.05, x + w / 2 + 0.05, 1.38, z + d / 2 + 0.05, 'dark', { collide: false });
  }


  // ---------- old town kit ----------

  // Grid surface from fn(i, j) -> [x, y, z, u, v]; oriented so its normal agrees with `up`.
  surface(rows, cols, fn, mat, up = [0, 1, 0]) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const v = fn(i, j); pos.push(v[0], v[1], v[2]); uv.push(v[3], v[4]); }
    const P = (k) => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
    let flip = false;
    {
      const a = P(0), b = P(1), c = P(cols + 1);
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      flip = n.x * up[0] + n.y * up[1] + n.z * up[2] < 0;
    }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols + 1, d = a + cols;
      if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.w.geo(g, mat, new THREE.Matrix4());
  }

  // Concave tiled gable roof over a footprint, eave at y, ridge `rise` higher, ridge along 'x' or 'z'.
  // The walkable collision follows the slope as 0.28m steps, so you can run up and over it.
  gableRoof(x0, z0, x1, z1, y, rise, ridge = 'x', { mat = 'tile_roof', over = 0.7, walk = true, curl = 0.18 } = {}) {
    const alongX = ridge === 'x';
    const A0 = alongX ? x0 : z0, A1 = alongX ? x1 : z1;   // along the ridge
    const B0 = alongX ? z0 : x0, B1 = alongX ? z1 : x1;   // across (slope direction)
    const D = (B1 - B0) / 2, Bc = (B0 + B1) / 2, K = 1.35;
    const prof = (d) => d >= 0 ? rise * Math.pow(Math.min(1, d / D), K) : curl * Math.pow(-d / over, 2);
    const P3 = (a, b, h) => alongX ? [a, h, b] : [b, h, a];
    const N = 9;
    for (const sd of [-1, 1]) {
      const edge = sd < 0 ? B0 : B1;
      const rowsD = [];
      for (let i = 0; i <= N; i++) rowsD.push(-over + (i / N) * (D + over));
      let arc = 0; const arcs = [0];
      for (let i = 1; i < rowsD.length; i++) arc += Math.hypot(rowsD[i] - rowsD[i - 1], prof(rowsD[i]) - prof(rowsD[i - 1])), arcs.push(arc);
      const at = (i, j, lift) => {
        const d = rowsD[i], b = edge - sd * d, a = j ? A1 + over * 0.6 : A0 - over * 0.6;
        const p = P3(a, b, y + prof(d) + lift);
        return [...p, a / 2, arcs[i] / 2];
      };
      const upv = alongX ? [0, 1, -sd * 0.3] : [-sd * 0.3, 1, 0];
      this.surface(N + 1, 2, (i, j) => at(i, j, 0.1), mat, upv);
      this.surface(N + 1, 2, (i, j) => at(i, j, 0), 'timber', [-upv[0], -1, -upv[2]]);
    }
    // gable ends (plaster triangle with timber frame line)
    for (const ae of [A0, A1]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const b = B0 + (i / 12) * (B1 - B0), d = D - Math.abs(b - Bc);
        pts.push(P3(ae, b, y + prof(d)));
      }
      const pos = [], idx = [];
      const base = P3(ae, Bc, y);
      pos.push(...base);
      for (const q of pts) pos.push(...q);
      for (let i = 1; i < pts.length; i++) idx.push(0, i, i + 1);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pts.length + 1) * 2).fill(0), 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const outward = alongX ? (ae === A0 ? -1 : 1) : 0;
      const nrm = g.attributes.normal;
      const wrong = alongX ? nrm.getX(0) * outward < 0 : nrm.getZ(0) * (ae === A0 ? -1 : 1) < 0;
      if (wrong) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.computeVertexNormals(); }
      this.w.geo(g, 'plaster', new THREE.Matrix4());
    }
    // ridge cap
    const L = A1 - A0 + over * 1.2, cA = (A0 + A1) / 2;
    const [rx, ry, rz] = P3(cA, Bc, y + rise + 0.12);
    this.put(GEO.cyl, 'timber', rx, ry, rz, 0.16, L, 0.16, alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0);
    // stepped walkable collision
    if (walk) {
      const n = Math.max(1, Math.ceil(rise / 0.28));
      let dPrev = 0;
      for (let k = 0; k < n; k++) {
        const hk = (rise * (k + 1)) / n, dk = D * Math.pow(hk / rise, 1 / K);
        const top = y + (rise * (k + 0.5)) / n;
        for (const sd of [-1, 1]) {
          const bA = sd < 0 ? B0 + dPrev : B1 - dk, bB = sd < 0 ? B0 + dk : B1 - dPrev;
          if (alongX) this.w.col.add(A0, y, bA, A1, top, bB, 'concrete');
          else this.w.col.add(bA, y, A0, bB, top, A1, 'concrete');
        }
        dPrev = dk;
      }
    }
  }

  // Timber townhouse: shoji facade body + tiled gable roof.
  house(x0, z0, x1, z1, eave, rise, ridge = 'x', fac = 'fac_shoji', roof = 'tile_roof', opts = {}) {
    this.w.box(x0, opts.base || 0, z0, x1, eave, z1, { side: fac, top: null }, { shade: [0.4, 1], uvo: [this.r(0, 16), 0] });
    this.w.box(x0 - 0.12, eave - 0.35, z0 - 0.12, x1 + 0.12, eave, z1 + 0.12, 'timber', { collide: false });
    this.gableRoof(x0, z0, x1, z1, eave, rise, ridge, { mat: roof, walk: opts.walk !== false });
  }

  lantern(x, y, z, mat = 'lantern_red', size = 1) {
    this.put(GEO.sphere, mat, x, y, z, 0.22 * size, 0.3 * size, 0.22 * size);
    this.put(GEO.cyl, 'dark', x, y + 0.3 * size, z, 0.13 * size, 0.06, 0.13 * size);
    this.put(GEO.cyl, 'dark', x, y - 0.3 * size, z, 0.12 * size, 0.05, 0.12 * size);
    this.light(x, y, z, mat === 'lantern_red' ? '#ff7a4a' : '#ffc070', 1.6 * size);
  }

  lanternLine(x0, y0, z0, x1, y1, z1, { n = 8, sag = 0.9, mat = 'lantern_red' } = {}) {
    const P = [];
    for (let i = 0; i <= n * 2; i++) {
      const t = i / (n * 2);
      P.push(new THREE.Vector3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag, z0 + (z1 - z0) * t));
    }
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], d = b.clone().sub(a);
      Q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      M4.compose(a.clone().add(b).multiplyScalar(0.5), Q, new THREE.Vector3(0.012, d.length(), 0.012));
      this.w.geo(GEO.cyl6, 'dark', M4);
    }
    for (let i = 1; i < n * 2; i += 2) this.lantern(P[i].x, P[i].y - 0.42, P[i].z, i % 4 === 1 ? mat : 'lantern_warm', 0.8);
  }

  torii(x, y, z, w = 8, h = 6, rotY = 0) {
    const g = (dx, dy, dz, sx, sy, sz, mat, rz = 0) => {
      const c = Math.cos(rotY), sn = Math.sin(rotY);
      this.put(GEO.box, mat, x + dx * c + dz * sn, y + dy, z - dx * sn + dz * c, sx, sy, sz, 0, rotY, rz);
    };
    for (const sd of [-1, 1]) {
      const c = Math.cos(rotY), sn = Math.sin(rotY);
      this.put(GEO.cyl, 'torii', x + sd * (w / 2) * c, y + h / 2, z - sd * (w / 2) * sn, 0.28, h, 0.28);
      this.put(GEO.cyl, 'dark', x + sd * (w / 2) * c, y + 0.2, z - sd * (w / 2) * sn, 0.34, 0.4, 0.34);
      this.w.col.add(x + sd * (w / 2) * c - 0.3, y, z - sd * (w / 2) * sn - 0.3, x + sd * (w / 2) * c + 0.3, y + h, z - sd * (w / 2) * sn + 0.3, 'wood');
      g(sd * (w / 2 + 0.9), h + 0.62, 0, 1.8, 0.36, 0.55, 'torii', sd * 0.12);
    }
    g(0, h - 0.8, 0, w + 1.0, 0.3, 0.3, 'torii');
    g(0, h + 0.45, 0, w + 0.4, 0.42, 0.55, 'torii');
    g(0, h + 0.75, 0, w + 0.6, 0.2, 0.62, 'dark');
    g(0, h - 0.15, 0, 0.3, 0.9, 0.25, 'torii');
  }

  rock(x, y, z, s = 1) {
    this.put(GEO.blob, 'stone', x, y + s * 0.55, z, s * 1.25, s * 0.95, s * 1.05, 0, this.r(0, 6), 0);
    this.put(GEO.blob, 'stone', x + s * 0.5, y + s * 0.3, z + s * 0.3, s * 0.6, s * 0.5, s * 0.6);
    this.w.col.add(x - s * 1.0, y, z - s * 0.85, x + s * 1.0, y + s * 1.3, z + s * 0.85, 'concrete');
  }

  poster(x, y, z, w, h, rotY = 0, v = 0) {
    this.put(GEO.box, 'poster_' + (v % 4), x, y, z, w, h, 0.04, 0, rotY, 0);
  }

  stoneLantern(x, y, z) {
    this.w.box(x - 0.3, y, z - 0.3, x + 0.3, y + 0.25, z + 0.3, 'stone');
    this.put(GEO.cyl6, 'stone', x, y + 0.8, z, 0.14, 1.1, 0.14);
    this.w.box(x - 0.35, y + 1.35, z - 0.35, x + 0.35, y + 1.85, z + 0.35, 'stone', { collide: false });
    this.put(GEO.box, 'lantern_warm', x, y + 1.6, z, 0.4, 0.3, 0.4);
    this.put(new THREE.ConeGeometry(0.62, 0.45, 4), 'stone', x, y + 2.08, z, 1, 1, 1, 0, Math.PI / 4, 0);
    this.light(x, y + 1.6, z, '#ffb060', 1.6);
    this.w.col.add(x - 0.35, y, z - 0.35, x + 0.35, y + 2.2, z + 0.35, 'concrete');
  }


  // ---------- training yard kit ----------

  // Concrete block with yellow safety edging on top; `green` lists faces painted green: 'nsew'.
  yardBlock(x0, z0, x1, z1, y0, y1, green = '') {
    const m = { side: 'conc', top: 'conc' };
    if (green.includes('n')) m.pz = 'paint_green';
    if (green.includes('s')) m.nz = 'paint_green';
    if (green.includes('e')) m.px = 'paint_green';
    if (green.includes('w')) m.nx = 'paint_green';
    this.w.box(x0, y0, z0, x1, y1, z1, m, { shade: [0.65, 1], keepBottom: y0 > 0.01 });
    const t = 0.07, y = y1 + 0.005;
    const tb = (a0, b0, a1, b1) => this.w.box(a0, y1 - 0.01, b0, a1, y + 0.01, b1, 'trim_yellow', { collide: false });
    tb(x0, z0, x1, z0 + t); tb(x0, z1 - t, x1, z1); tb(x0, z0, x0 + t, z1); tb(x1 - t, z0, x1, z1);
  }

  // Thin green wall panel (wall-run surface) with concrete end caps and yellow top edge.
  wallPanel(x0, z0, x1, z1, y0, y1) {
    const alongZ = z1 - z0 > x1 - x0;
    this.w.box(x0, y0, z0, x1, y1, z1, { side: 'paint_green', top: 'conc', [alongZ ? 'pz' : 'px']: 'conc', [alongZ ? 'nz' : 'nx']: 'conc' }, { shade: [0.7, 1], keepBottom: y0 > 0.01 });
    this.w.box(x0 - 0.01, y1 - 0.01, z0 - 0.01, x1 + 0.01, y1 + 0.04, z1 + 0.01, 'trim_yellow', { collide: false });
  }

  // Green ramp rising from y0 at z0 to y1 at z1 (z1 > z0 rises forward, else backward). Walkable (stepped collision).
  ramp(x0, x1, z0, z1, y0, y1, base = null) {
    const bse = base ?? Math.min(y0, y1) - 0.01;
    this.surface(2, 2, (i, j) => { const z = i ? z1 : z0, y = i ? y1 : y0, x = j ? x1 : x0; return [x, y + 0.02, z, x / 2, z / 2]; }, 'paint_green', [0, 1, 0]);
    for (const x of [x0, x1]) {
      const pos = [x, bse, z0, x, bse, z1, x, y1, z1, x, y0, z0];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      const flip = (x === x0) === (z1 > z0);
      g.setIndex(flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      this.w.geo(g, 'conc', new THREE.Matrix4());
    }
    this.w.box(x0, y1 - 0.01, Math.min(z1, z1 - 0.07 * Math.sign(z1 - z0)), x1, y1 + 0.03, Math.max(z1, z1 - 0.07 * Math.sign(z1 - z0)), 'trim_yellow', { collide: false });
    const n = Math.max(1, Math.ceil(Math.abs(y1 - y0) / 0.28));
    for (let k = 0; k < n; k++) {
      const za = z0 + ((z1 - z0) * k) / n, zb = z0 + ((z1 - z0) * (k + 1)) / n;
      const top = y0 + ((y1 - y0) * (k + (y1 > y0 ? 0.5 : 0.5))) / n + (y1 > y0 ? (y1 - y0) / n / 2 : 0);
      this.w.col.add(x0, bse, Math.min(za, zb), x1, Math.max(bse + 0.01, y0 + ((y1 - y0) * (k + 0.5)) / n), Math.max(za, zb), 'concrete');
      void top;
    }
  }

  // Concrete balance beam on posts (top at y) across a gap, running along z.
  beam(x, z0, z1, y, w = 0.55, postTo = 0) {
    this.w.box(x - w / 2, y - 0.4, z0, x + w / 2, y, z1, { side: 'conc', top: 'conc', bottom: 'conc' }, { keepBottom: true });
    this.w.box(x - w / 2 - 0.005, y - 0.01, z0, x + w / 2 + 0.005, y + 0.02, z1, 'trim_yellow', { collide: false });
    for (const z of [z0 + 0.5, z1 - 0.5]) this.w.box(x - 0.25, postTo, z - 0.25, x + 0.25, y - 0.4, z + 0.25, 'conc');
  }

  // Grey pipe railing (collidable, vaultable).
  pipeRail(x0, z0, x1, z1, y, h = 1.0, collide = true) {
    this.railing(x0, z0, x1, z1, y, h, { collide, mat: 'pipe' });
  }

  lampPost(x, y, z, h = 5) {
    this.put(GEO.cyl6, 'rail_dark', x, y + h / 2, z, 0.09, h, 0.09);
    this.put(GEO.box, 'rail_dark', x, y + h, z, 0.5, 0.18, 0.5);
    this.put(GEO.box, 'lantern_warm', x, y + h - 0.12, z, 0.36, 0.05, 0.36);
    this.w.box(x - 0.3, y, z - 0.3, x + 0.3, y + 0.35, z + 0.3, 'conc');
    this.w.col.add(x - 0.1, y, z - 0.1, x + 0.1, y + h, z + 0.1, 'metal');
  }


  // ---------- depot (indoor gym) kit ----------

  // Plywood box; `red` lists faces painted red ('nsew'); `conc` makes the sides concrete.
  plyBox(x0, z0, x1, z1, y0, y1, red = '', conc = false) {
    const side = conc ? 'conc' : 'plywood';
    const m = { side, top: conc ? 'conc' : 'plywood' };
    if (red.includes('n')) m.pz = 'red_panel';
    if (red.includes('s')) m.nz = 'red_panel';
    if (red.includes('e')) m.px = 'red_panel';
    if (red.includes('w')) m.nx = 'red_panel';
    this.w.box(x0, y0, z0, x1, y1, z1, m, { shade: [0.7, 1], keepBottom: y0 > 0.01 });
  }

  // Foam pit: sunken floor filled with loose coloured foam cubes (visual). Falling in means a respawn.
  foamPit(x0, z0, x1, z1, depth = 2.5) {
    this.w.box(x0, -depth - 1, z0, x1, -depth, z1, { top: 'mat_dark', side: 'conc' });
    for (const [a0, b0, a1, b1] of [[x0, z0, x1, z0 + 0.3], [x0, z1 - 0.3, x1, z1], [x0, z0, x0 + 0.3, z1], [x1 - 0.3, z0, x1, z1]]) {
      this.w.box(a0, -depth, b0, a1, 0.02, b1, { side: 'mat_dark', top: 'mat_dark' }, { collide: false });
    }
    const cols = ['foam_b', 'foam_y', 'foam_r'];
    const area = (x1 - x0) * (z1 - z0), n = Math.min(900, Math.round(area * 1.1));
    for (let i = 0; i < n; i++) {
      const x = this.r(x0 + 0.5, x1 - 0.5), z = this.r(z0 + 0.5, z1 - 0.5), y = -depth + this.r(1.4, depth - 0.3);
      this.put(GEO.box, this.pick(cols), x, y, z, 0.55, 0.55, 0.55, this.r(0, 1.2), this.r(0, 3), this.r(0, 1.2));
    }
  }

  // Warehouse shell: walls with a band of factory windows, a roof with skylight strips, steel trusses.
  hall(x0, z0, x1, z1, h = 17, { roll = [] } = {}) {
    const t = 0.6, win0 = 7, win1 = 13.5;
    const wallRun = (a0, b0, a1, b1, alongX) => {
      this.w.box(a0, 0, b0, a1, win0, b1, 'conc', { shade: [0.6, 1] });
      this.w.box(a0, win1, b0, a1, h, b1, 'conc', { collide: false });
      const L = alongX ? a1 - a0 : b1 - b0;
      for (let k = 0; k <= L; k += 6) {
        const c = (alongX ? a0 : b0) + k;
        if (alongX) this.w.box(c - 0.35, win0, b0, c + 0.35, win1, b1, 'conc', { collide: false });
        else this.w.box(a0, win0, c - 0.35, a1, win1, c + 0.35, 'conc', { collide: false });
      }
      const inset = 0.05;
      if (alongX) this.w.box(a0, win0, b0 + inset, a1, win1, b1 - inset, 'factory_win', { collide: false });
      else this.w.box(a0 + inset, win0, b0, a1 - inset, win1, b1, 'factory_win', { collide: false });
      this.w.col.add(Math.min(a0, a1), win0, Math.min(b0, b1), Math.max(a0, a1), h, Math.max(b0, b1), 'concrete');
    };
    wallRun(x0 - t, z0, x0, z1, false);
    wallRun(x1, z0, x1 + t, z1, false);
    wallRun(x0 - t, z0 - t, x1 + t, z0, true);
    wallRun(x0 - t, z1, x1 + t, z1 + t, true);
    for (const [rx0, rx1, rz] of roll) {
      this.w.box(rx0, 0, rz - 0.05, rx1, 6, rz + 0.05, 'rollup', { collide: false });
    }
    // roof: solid bays with skylight strips
    for (let z = z0; z < z1; z += 12) {
      const za = z, zb = Math.min(z1, z + 12);
      this.w.box(x0, h, za, x1, h + 0.4, zb - 3.5, { top: 'metal', side: 'dark', bottom: 'dark' }, { keepBottom: true, collide: false });
      this.w.box(x0, h + 0.1, zb - 3.5, x1, h + 0.2, zb, 'skylight', { collide: false, keepBottom: true });
      this.lattice(x0, h - 3, zb - 0.2, x1, h, zb + 0.2, 'rail_dark', 'x', 3);
      for (let x = x0 + 8; x < x1 - 4; x += 16) this.hangLamp(x, h - 3, (za + zb) / 2 - 2);
    }
    for (let x = x0; x <= x1; x += (x1 - x0) / 4) this.w.box(x - 0.2, h - 0.6, z0, x + 0.2, h, z1, 'rail_dark', { collide: false });
  }

  hangLamp(x, y, z) {
    this.put(GEO.cyl6, 'dark', x, y - 1.2, z, 0.012, 2.4, 0.012);
    this.put(new THREE.ConeGeometry(0.45, 0.4, 16, 1, true), 'dark', x, y - 2.5, z, 1, 1, 1);
    this.put(GEO.sphere, 'bulb', x, y - 2.7, z, 0.16, 0.12, 0.16);
    this.light(x, y - 2.8, z, '#fff0d0', 2.2);
  }

  // Black steel truss bridge along z, deck top at y, on lattice towers.
  trussBridge(x, z0, z1, y, w = 2) {
    this.w.box(x - w / 2, y - 0.25, z0, x + w / 2, y, z1, { top: 'metal', side: 'rail_dark', bottom: 'rail_dark' }, { keepBottom: true });
    this.lattice(x - w / 2, y, z0, x - w / 2 + 0.1, y + 1.0, z1, 'rail_dark', 'z', 2);
    this.lattice(x + w / 2 - 0.1, y, z0, x + w / 2, y + 1.0, z1, 'rail_dark', 'z', 2);
    for (const z of [z0 + 0.8, z1 - 0.8]) this.lattice(x - 0.8, -2.5, z - 0.8, x + 0.8, y - 0.25, z + 0.8, 'rail_dark', 'y', 1.6);
  }

  light(x, y, z, color = '#ffd28a', size = 1.4, blink = false) {
    const mat = new THREE.SpriteMaterial({ map: glowSprite(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z); s.scale.setScalar(size);
    this.w.add(s);
    if (blink) this.w.updaters.push((t) => { mat.opacity = Math.sin(t * 3 + x) > 0 ? 1 : 0.15; });
    return s;
  }

  lamp(x, y, z, h = 7, color = '#ffc978') {
    M4.makeTranslation(x, y + h / 2, z);
    this.w.geo(new THREE.CylinderGeometry(0.08, 0.12, h, 8), 'steel', M4);
    this.w.col.add(x - 0.12, y, z - 0.12, x + 0.12, y + h, z + 0.12, 'metal');
    M4.makeTranslation(x, y + h, z);
    this.w.geo(new THREE.BoxGeometry(0.5, 0.18, 0.9), 'steel', M4);
    M4.makeTranslation(x, y + h - 0.1, z);
    this.w.geo(new THREE.BoxGeometry(0.35, 0.04, 0.7), 'lamp', M4);
    this.light(x, y + h - 0.3, z, color, 5);
    if (this.w.theme !== 'day') {
      const pl = new THREE.PointLight(color, 140, 34, 1.6);
      pl.position.set(x, y + h - 0.6, z);
      this.w.add(pl);
    }
  }

  sign(x, y, z, w, h, text, color = '#ff2e88', rotY = 0, opts = {}) {
    const tex = textTexture(text, { color, ...opts });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.y = rotY;
    this.w.add(m);
    return m;
  }

  arrow(x, y, z, w, h, rotY = 0, color = '#ffb020') {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: arrowTexture(color), transparent: true, toneMapped: false, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.y = rotY;
    this.w.add(m);
    const mat = m.material;
    this.w.updaters.push((t) => { mat.opacity = 0.6 + 0.4 * Math.sin(t * 5); });
    return m;
  }

  street(y = 0, size = 1400, bounds = null) {
    const [x0, x1, z0, z1] = bounds || [-size / 2, size / 2, -size / 2, size / 2];
    this.w.box(x0, y - 1, z0, x1, y, z1, { top: 'asphalt', side: null, bottom: null }, { collide: false });
  }

  // Filler skyline, placed on a jittered grid; skip anything intersecting the keep-out rects.
  backdrop({ x0, x1, z0, z1, hMin = 12, hMax = 50, avoid = [], cell = 22, fill = 0.8, base = 0, facades = FACADES, roofDeco = true }) {
    for (let x = x0; x < x1; x += cell) {
      for (let z = z0; z < z1; z += cell) {
        if (this.rng() > fill) continue;
        const w = this.r(cell * 0.45, cell * 0.85), d = this.r(cell * 0.45, cell * 0.85);
        const bx = x + this.r(0, cell - w), bz = z + this.r(0, cell - d);
        const hit = avoid.some(([ax0, az0, ax1, az1]) => bx < ax1 && bx + w > ax0 && bz < az1 && bz + d > az0);
        if (hit) continue;
        const h = this.r(hMin, hMax) * (this.rng() < 0.12 ? 1.8 : 1);
        this.w.box(bx, base, bz, bx + w, base + h, bz + d, { side: this.pick(facades), top: 'roof' }, { collide: false, shade: [0.3, 1], uvo: [this.r(0, 16), 0] });
        if (roofDeco && this.rng() < 0.5) {
          const hw = this.r(2, w * 0.35), hd = this.r(2, d * 0.35);
          this.w.box(bx + w / 2 - hw / 2, base + h, bz + d / 2 - hd / 2, bx + w / 2 + hw / 2, base + h + this.r(1.5, 4), bz + d / 2 + hd / 2, 'parapet', { collide: false });
        }
        if (this.rng() < 0.08) this.light(bx + w / 2, base + h + 0.5, bz + d / 2, '#ff3030', 1.2, true);
      }
    }
  }
}

export { CONT };
