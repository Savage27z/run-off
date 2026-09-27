// Static axis-aligned box world with a uniform XZ grid broadphase.
// Everything solid in a map is an AABB; that keeps the controller exact and cheap.

const CELL = 8;
const key = (i, k) => (i + 4096) * 8192 + (k + 4096);

export class Collision {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.stamp = 0;
    this.out = [];
  }

  clear() {
    this.boxes.length = 0;
    this.grid.clear();
  }

  add(x0, y0, z0, x1, y1, z1, surface = 'concrete') {
    const b = { x0, y0, z0, x1, y1, z1, surface, id: this.boxes.length, mark: 0 };
    this.boxes.push(b);
    const i0 = Math.floor(x0 / CELL), i1 = Math.floor(x1 / CELL);
    const k0 = Math.floor(z0 / CELL), k1 = Math.floor(z1 / CELL);
    for (let i = i0; i <= i1; i++) {
      for (let k = k0; k <= k1; k++) {
        const kk = key(i, k);
        let cell = this.grid.get(kk);
        if (!cell) this.grid.set(kk, (cell = []));
        cell.push(b);
      }
    }
    return b;
  }

  // Boxes strictly overlapping the query volume. Returned array is reused.
  query(x0, y0, z0, x1, y1, z1) {
    const out = this.out;
    out.length = 0;
    const st = ++this.stamp;
    const i0 = Math.floor(x0 / CELL), i1 = Math.floor(x1 / CELL);
    const k0 = Math.floor(z0 / CELL), k1 = Math.floor(z1 / CELL);
    for (let i = i0; i <= i1; i++) {
      for (let k = k0; k <= k1; k++) {
        const cell = this.grid.get(key(i, k));
        if (!cell) continue;
        for (let n = 0; n < cell.length; n++) {
          const b = cell[n];
          if (b.mark === st) continue;
          b.mark = st;
          if (b.x1 > x0 && b.x0 < x1 && b.y1 > y0 && b.y0 < y1 && b.z1 > z0 && b.z0 < z1) out.push(b);
        }
      }
    }
    return out;
  }

  any(x0, y0, z0, x1, y1, z1) {
    return this.query(x0, y0, z0, x1, y1, z1).length > 0;
  }

  // Distance along a normalized ray to the first box, or maxT.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    const ex = ox + dx * maxT, ey = oy + dy * maxT, ez = oz + dz * maxT;
    const q = this.query(
      Math.min(ox, ex) - 0.01, Math.min(oy, ey) - 0.01, Math.min(oz, ez) - 0.01,
      Math.max(ox, ex) + 0.01, Math.max(oy, ey) + 0.01, Math.max(oz, ez) + 0.01,
    );
    let best = maxT;
    const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
    for (let n = 0; n < q.length; n++) {
      const b = q[n];
      let t1 = (b.x0 - ox) * ix, t2 = (b.x1 - ox) * ix;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      t1 = (b.y0 - oy) * iy; t2 = (b.y1 - oy) * iy;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (b.z0 - oz) * iz; t2 = (b.z1 - oz) * iz;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= tmin && tmin > 0 && tmin < best) best = tmin;
    }
    return best;
  }
}
