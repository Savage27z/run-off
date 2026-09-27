// Kinematic parkour controller. Fixed timestep, swept AABB against the static box world.
// Momentum is the hero system: speed above run pace decays slowly and is fed by clean chains.

import { clamp, lerp, dampAngle, easeOut, smooth } from './util.js';

export const P = {
  hw: 0.3, h: 1.8, hc: 0.9,
  run: 8.5, maxSpeed: 19, groundAccel: 42, friction: 36, overDecay: 2.0, turnRate: 11, sharpTurnLoss: 14,
  airAccel: 16, gravity: 28, jumpV: 10, coyote: 0.12, jumpBuffer: 0.14, jumpCutMul: 0.55,
  stepUp: 0.45, vaultMax: 1.3, ledgeMax: 1.6,
  wallRunMin: 5.0, wallRunTime: 1.35, wallRunFlat: 0.7, wallJumpOut: 6.5, wallJumpUp: 9.5, wallJumpBonus: 1.0,
  wallClimbV: 8, kickOut: 7, kickUp: 9,
  slideMin: 5, slideBoost: 2.6, slideMaxBoost: 15, slideFriction: 3.2, slideExit: 3.5, slideCooldown: 1.1,
  rollWindow: 0.35, rollImpact: 17, rollBonus: 0.8, rollTime: 0.5, splatImpact: 34,
  flipRate: { front: (Math.PI * 2) / 0.52, back: (Math.PI * 2) / 0.58, side: (Math.PI * 2) / 0.5 },
  flipLandTol: 0.95, flipBoost: 0.9, bounceV: 15.5, flipJumpV: 11, diveBoost: 1.6, diveMinHeight: 2.0, crashTime: 1.15,
};

const EPS = 1e-4;
const TINY = 1e-5;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const STATE_CODES = ['ground', 'air', 'wallrun', 'wallclimb', 'slide', 'roll', 'stumble', 'climb', 'vault', 'flip', 'dive', 'crash'];

export class Player {
  constructor(col) {
    this.col = col;
    this.pos = { x: 0, y: 0, z: 0 };
    this.prev = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.events = [];
    this.reset(0, 0, 0, 0);
  }

  reset(x, y, z, yaw) {
    Object.assign(this.pos, { x, y, z });
    Object.assign(this.prev, { x, y, z });
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.facing = yaw;
    this.state = 'ground';
    this.stateT = 0;
    this.grounded = true;
    this.crouched = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.rollBuf = 0;
    this.slideCd = 0;
    this.airT = 0;
    this.lastWallKey = null;
    this.climbUsed = false;
    this.wall = null;
    this.jumpCut = false;
    this.script = null;
    this.dead = false;
    this.surface = 'concrete';
    this.flip = null;
    this.flipsDone = 0;
    this.pendingBoost = 0;
  }

  get h() { return this.crouched ? P.hc : P.h; }
  get hsp() { return Math.hypot(this.vel.x, this.vel.z); }

  emit(type, data) { this.events.push(data ? { type, ...data } : { type }); }

  setState(s) {
    if (this.state !== s) { this.state = s; this.stateT = 0; }
  }

  fits(x, y, z, h) {
    return !this.col.any(x - P.hw, y, z - P.hw, x + P.hw, y + h, z + P.hw);
  }

  tryStand() {
    if (!this.crouched) return true;
    if (this.fits(this.pos.x, this.pos.y, this.pos.z, P.h)) { this.crouched = false; return true; }
    return false;
  }

  // ---------- collision sweeps ----------

  sweepH(axis, d, allowStep) {
    if (d === 0) return null;
    const p = this.pos, hw = P.hw, h = this.h;
    const a0 = p[axis], target = a0 + d;
    let lo, hi;
    if (d > 0) { lo = a0 + hw; hi = target + hw; } else { lo = target - hw; hi = a0 - hw; }
    const q = axis === 'x'
      ? this.col.query(lo, p.y, p.z - hw, hi, p.y + h, p.z + hw)
      : this.col.query(p.x - hw, p.y, lo, p.x + hw, p.y + h, hi);
    const k0 = axis === 'x' ? 'x0' : 'z0', k1 = axis === 'x' ? 'x1' : 'z1';
    let best = target, hit = null;
    for (let i = 0; i < q.length; i++) {
      const b = q[i];
      if (d > 0) {
        if (b[k0] >= a0 + hw - EPS) { const lim = b[k0] - hw - TINY; if (lim < best) { best = lim; hit = b; } }
      } else if (b[k1] <= a0 - hw + EPS) {
        const lim = b[k1] + hw + TINY; if (lim > best) { best = lim; hit = b; }
      }
    }
    if (hit && allowStep) {
      const rise = hit.y1 - p.y;
      if (rise > 0 && rise <= P.stepUp) {
        const nx = axis === 'x' ? target : p.x, nz = axis === 'z' ? target : p.z;
        if (this.fits(nx, hit.y1 + TINY, nz, h)) {
          p[axis] = target; p.y = hit.y1 + TINY;
          return null;
        }
      }
    }
    p[axis] = best;
    return hit;
  }

  sweepY(d) {
    if (d === 0) return null;
    const p = this.pos, hw = P.hw, h = this.h, y0 = p.y, target = y0 + d;
    let best = target, hit = null;
    if (d < 0) {
      const q = this.col.query(p.x - hw, target, p.z - hw, p.x + hw, y0 + EPS, p.z + hw);
      for (let i = 0; i < q.length; i++) {
        const b = q[i];
        if (b.y1 <= y0 + EPS && b.y1 > best) { best = b.y1; hit = b; }
      }
    } else {
      const q = this.col.query(p.x - hw, y0 + h - EPS, p.z - hw, p.x + hw, target + h, p.z + hw);
      for (let i = 0; i < q.length; i++) {
        const b = q[i];
        if (b.y0 >= y0 + h - EPS && b.y0 - h - TINY < best) { best = b.y0 - h - TINY; hit = b; }
      }
    }
    p.y = best;
    return hit;
  }

  // Top of the contiguous wall column directly in front (dir is an axis unit vector), or null.
  ledgeTop(dx, dz) {
    const p = this.pos, hw = P.hw;
    const fx = p.x + dx * (hw + 0.12), fz = p.z + dz * (hw + 0.12);
    const q = this.col.query(
      Math.min(p.x, fx) - (dz ? hw : 0), p.y, Math.min(p.z, fz) - (dx ? hw : 0),
      Math.max(p.x, fx) + (dz ? hw : 0), p.y + P.h + P.ledgeMax, Math.max(p.z, fz) + (dx ? hw : 0),
    ).slice();
    let top = -Infinity;
    for (const b of q) if (b.y0 <= p.y + 0.6 && b.y1 > top) top = b.y1;
    if (top === -Infinity) {
      for (const b of q) if (b.y0 <= p.y + this.h && b.y1 > top) top = b.y1;
      if (top === -Infinity) return null;
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const b of q) if (b.y0 <= top + 0.02 && b.y1 > top + 0.001) { top = b.y1; grew = true; }
    }
    return top;
  }

  // Wall covering the torso on the side opposite normal (nx,nz), or null.
  probeWall(nx, nz, r = 0.16) {
    const p = this.pos, hw = P.hw;
    let x0, x1, z0, z1;
    if (nx === 1) { x0 = p.x - hw - r; x1 = p.x - hw + 0.02; z0 = p.z - hw * 0.6; z1 = p.z + hw * 0.6; }
    else if (nx === -1) { x0 = p.x + hw - 0.02; x1 = p.x + hw + r; z0 = p.z - hw * 0.6; z1 = p.z + hw * 0.6; }
    else if (nz === 1) { z0 = p.z - hw - r; z1 = p.z - hw + 0.02; x0 = p.x - hw * 0.6; x1 = p.x + hw * 0.6; }
    else { z0 = p.z + hw - 0.02; z1 = p.z + hw + r; x0 = p.x - hw * 0.6; x1 = p.x + hw * 0.6; }
    const q = this.col.query(x0, p.y + 0.3, z0, x1, p.y + 1.2, z1);
    if (!q.length) return null;
    let lo = Infinity, hi = -Infinity, pick = null;
    for (const b of q) {
      if (b.y0 < lo) lo = b.y0;
      if (b.y1 > hi) { hi = b.y1; pick = b; }
    }
    if (lo > p.y + 0.45 || hi < p.y + 1.0) return null;
    return pick;
  }

  // ---------- main step ----------

  step(dt, inp) {
    this.prev.x = this.pos.x; this.prev.y = this.pos.y; this.prev.z = this.pos.z;

    const sy = Math.sin(inp.camYaw), cy = Math.cos(inp.camYaw);
    let wx = sy * inp.mz - cy * inp.mx;
    let wz = cy * inp.mz + sy * inp.mx;
    const wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    const w = { x: wx, z: wz, mag: Math.min(1, wl) };

    this.jumpBuf = inp.jump ? P.jumpBuffer : Math.max(0, this.jumpBuf - dt);
    if (inp.slide && !this.grounded) this.rollBuf = P.rollWindow;
    else this.rollBuf = Math.max(0, this.rollBuf - dt);
    this.slideCd = Math.max(0, this.slideCd - dt);
    this.stateT += dt;

    switch (this.state) {
      case 'ground': case 'slide': case 'roll': case 'stumble': case 'crash': this.groundStep(dt, w, inp); break;
      case 'wallrun': this.wallrunStep(dt, w, inp); break;
      case 'wallclimb': this.wallclimbStep(dt, w, inp); break;
      case 'climb': case 'vault': this.scriptStep(dt); break;
      default: this.airStep(dt, w, inp);
    }

    // facing
    const st = this.state;
    if (st === 'wallrun') this.facing = dampAngle(this.facing, Math.atan2(this.wall.tx, this.wall.tz), 18, dt);
    else if (st === 'wallclimb') this.facing = dampAngle(this.facing, Math.atan2(-this.wall.nx, -this.wall.nz), 20, dt);
    else if (st === 'climb' || st === 'vault') this.facing = dampAngle(this.facing, Math.atan2(this.script.dx, this.script.dz), 20, dt);
    else if (st === 'flip' || st === 'crash') { /* hold facing through the rotation */ }
    else if (this.hsp > 0.6) this.facing = dampAngle(this.facing, Math.atan2(this.vel.x, this.vel.z), st === 'air' || st === 'dive' ? 6 : 14, dt);
  }

  groundMove(dt, w, accelMul = 1, speedMul = 1) {
    let vx = this.vel.x, vz = this.vel.z;
    const sp = Math.hypot(vx, vz);
    const runT = P.run * speedMul;
    if (w.mag > 0.1) {
      if (sp > runT * w.mag + 0.05 && sp > 0.5) {
        const dx = vx / sp, dz = vz / sp;
        const t = 1 - Math.exp(-P.turnRate * dt);
        let nx = dx + (w.x / w.mag - dx) * t, nz = dz + (w.z / w.mag - dz) * t;
        const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        const dot = (dx * w.x + dz * w.z) / w.mag;
        let nsp = sp - P.overDecay * dt - (dot < 0.6 ? (0.6 - dot) * P.sharpTurnLoss * dt : 0);
        nsp = Math.max(nsp, runT * w.mag);
        vx = nx * nsp; vz = nz * nsp;
      } else {
        const tx = w.x * runT, tz = w.z * runT;
        const ax = tx - vx, az = tz - vz, al = Math.hypot(ax, az);
        const stp = P.groundAccel * accelMul * dt;
        if (al <= stp) { vx = tx; vz = tz; } else { vx += (ax / al) * stp; vz += (az / al) * stp; }
      }
    } else {
      const nsp = Math.max(0, sp - P.friction * accelMul * dt);
      if (sp > 0) { vx *= nsp / sp; vz *= nsp / sp; }
    }
    this.vel.x = vx; this.vel.z = vz;
  }

  groundStep(dt, w, inp) {
    const st = this.state;
    if (st === 'ground' && inp.slide && this.hsp >= P.slideMin) this.enterSlide();

    const canJump = this.state === 'ground' || this.state === 'slide' ||
      (this.state === 'roll' && this.stateT > 0.16) || (this.state === 'stumble' && this.stateT > 0.25);
    if (inp.trick && canJump) {
      this.doJump(P.flipJumpV);
      const fwd = w.x * Math.sin(this.facing) + w.z * Math.cos(this.facing);
      const kind = this.hsp < 2 || fwd < -0.4 ? 'back' : 'front';
      if (kind === 'back' && this.hsp < 2) { this.vel.x -= Math.sin(this.facing) * 1.6; this.vel.z -= Math.cos(this.facing) * 1.6; }
      this.startFlip(kind);
      this.airStep(dt, w, inp);
      return;
    }
    if (this.jumpBuf > 0 && canJump) {
      this.doJump();
      this.airStep(dt, w, inp);
      return;
    }

    switch (this.state) {
      case 'ground': this.groundMove(dt, w); break;
      case 'slide': {
        const sp = this.hsp;
        if (sp > 0.01) {
          let dx = this.vel.x / sp, dz = this.vel.z / sp;
          if (w.mag > 0.1) {
            const t = 1 - Math.exp(-2.5 * dt);
            dx += (w.x / w.mag - dx) * t; dz += (w.z / w.mag - dz) * t;
            const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
          }
          let nsp = sp - P.slideFriction * dt;
          if (nsp < P.slideExit || (!inp.slideHeld && this.stateT > 0.3)) {
            if (this.tryStand()) this.setState('ground');
            else nsp = Math.max(nsp, 3);
          }
          this.vel.x = dx * nsp; this.vel.z = dz * nsp;
        } else if (this.tryStand()) this.setState('ground');
        break;
      }
      case 'roll': {
        const sp = this.hsp;
        if (sp > 0.01 && w.mag > 0.1) {
          let dx = this.vel.x / sp, dz = this.vel.z / sp;
          const t = 1 - Math.exp(-3 * dt);
          dx += (w.x / w.mag - dx) * t; dz += (w.z / w.mag - dz) * t;
          const l = Math.hypot(dx, dz) || 1;
          this.vel.x = (dx / l) * sp; this.vel.z = (dz / l) * sp;
        }
        if (this.stateT > P.rollTime) {
          if (this.tryStand()) this.setState('ground'); else this.setState('slide');
        }
        break;
      }
      case 'stumble':
        this.groundMove(dt, w, 0.25, 0.6);
        if (this.stateT > 0.42) this.setState('ground');
        break;
      case 'crash': {
        const sp = this.hsp, nsp = Math.max(0, sp - 18 * dt);
        if (sp > 0) { this.vel.x *= nsp / sp; this.vel.z *= nsp / sp; }
        if (this.stateT > P.crashTime && this.tryStand()) this.setState('ground');
        break;
      }
    }

    this.vel.y -= P.gravity * dt;
    const vx0 = this.vel.x, vz0 = this.vel.z;
    const hx = this.sweepH('x', this.vel.x * dt, true);
    if (hx) {
      if (this.state === 'ground' && this.tryVault(hx, 'x', vx0, vz0, w)) return;
      this.vel.x = 0;
    }
    const hz = this.sweepH('z', this.vel.z * dt, true);
    if (hz) {
      if (this.state === 'ground' && this.tryVault(hz, 'z', vx0, vz0, w)) return;
      this.vel.z = 0;
    }

    const hy = this.sweepY(this.vel.y * dt);
    if (hy && this.vel.y <= 0 && hy.surface === 'bounce' && this.state !== 'crash') {
      // trampolines launch you even when you just run onto them
      this.vel.y = P.bounceV * 0.9;
      this.grounded = false;
      this.airT = 0.06;
      this.tryStand();
      this.setState('air');
      this.emit('bounce', { impact: 0 });
    } else if (hy && this.vel.y <= 0) {
      this.vel.y = 0; this.grounded = true; this.surface = hy.surface;
    } else if (hy) {
      this.vel.y = 0;
    } else {
      // stick to stairs / small drops
      const y0 = this.pos.y;
      const snap = this.sweepY(-P.stepUp);
      if (snap) {
        this.vel.y = 0; this.grounded = true; this.surface = snap.surface;
      } else {
        this.pos.y = y0;
        this.grounded = false;
        this.coyote = P.coyote;
        this.airT = 0;
        this.tryStand();
        this.setState('air');
      }
    }
  }

  doJump(v = P.jumpV) {
    this.jumpBuf = 0;
    this.coyote = 0;
    this.vel.y = v;
    this.grounded = false;
    this.jumpCut = true;
    this.airT = 0;
    if (this.crouched) this.tryStand();
    this.setState('air');
    this.emit('jump', { speed: this.hsp });
  }

  enterSlide() {
    this.crouched = true;
    this.setState('slide');
    if (this.slideCd <= 0) {
      const sp = this.hsp;
      if (sp > 0.01) {
        const nsp = Math.min(P.slideMaxBoost, Math.max(sp, sp + P.slideBoost));
        this.vel.x *= nsp / sp; this.vel.z *= nsp / sp;
      }
      this.slideCd = P.slideCooldown;
      this.emit('slide', { boost: true });
    } else this.emit('slide', { boost: false });
  }

  groundDist() {
    const p = this.pos;
    return this.col.raycast(p.x, p.y + 0.05, p.z, 0, -1, 0, 40) - 0.05;
  }

  startFlip(kind) {
    const side = kind === 'left' || kind === 'right';
    const rateKey = side ? 'side' : kind === 'wall' ? 'back' : kind;
    this.flip = {
      kind, axis: side ? 'z' : 'x',
      dir: kind === 'back' || kind === 'wall' || kind === 'left' ? -1 : 1,
      rate: P.flipRate[rateKey], angle: 0, target: Math.PI * 2,
    };
    this.setState('flip');
    this.emit('flipstart', { kind });
  }

  // Award completed rotations.
  finishFlip(completed) {
    const F = this.flip;
    const rots = Math.max(1, Math.round(completed / (Math.PI * 2)));
    this.flipsDone += rots;
    this.pendingBoost += P.flipBoost * rots;
    this.emit('trick', { trick: F.kind, rots });
    this.flip = null;
    return rots;
  }

  airStep(dt, w, inp) {
    this.airT += dt;
    this.coyote = Math.max(0, this.coyote - dt);
    if (this.jumpBuf > 0 && this.coyote > 0 && this.state === 'air') this.doJump();

    // tricks
    if (inp.trick) {
      if (this.state === 'air' && this.airT > 0.05) {
        const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
        const fwd = w.x * fx + w.z * fz, side = w.x * -fz + w.z * fx;
        const kind = fwd < -0.4 ? 'back' : Math.abs(side) > 0.6 && Math.abs(side) > Math.abs(fwd) ? (side > 0 ? 'right' : 'left') : 'front';
        this.startFlip(kind);
      } else if (this.state === 'flip' && this.flip.target - Math.abs(this.flip.angle) < Math.PI * 2 * 0.9 && this.flip.target < Math.PI * 6) {
        this.flip.target += Math.PI * 2;
        this.emit('flipchain');
      }
    }
    if (this.state === 'air' && inp.slide && this.hsp > 5 && this.airT > 0.08 && this.groundDist() > P.diveMinHeight) {
      const sp = this.hsp, nsp = Math.min(P.maxSpeed, sp + P.diveBoost);
      this.vel.x *= nsp / sp; this.vel.z *= nsp / sp;
      this.vel.y = Math.max(this.vel.y, 1.5);
      this.crouched = true;
      this.rollBuf = 0;
      this.setState('dive');
      this.emit('trick', { trick: 'dive', rots: 0 });
    }
    if (this.state === 'flip') {
      const F = this.flip;
      F.angle += F.rate * F.dir * dt;
      if (Math.abs(F.angle) >= F.target) {
        this.finishFlip(F.target);
        this.setState('air');
      }
    }

    // air control: redirect freely, but never gain speed beyond what you brought
    const sp0 = this.hsp;
    this.vel.x += w.x * P.airAccel * dt;
    this.vel.z += w.z * P.airAccel * dt;
    const sp1 = this.hsp, cap = Math.max(sp0, P.run * 0.75);
    if (sp1 > cap) { this.vel.x *= cap / sp1; this.vel.z *= cap / sp1; }

    this.vel.y -= P.gravity * dt;
    if (this.jumpCut) {
      if (!inp.jumpHeld && this.vel.y > 2) { this.vel.y *= P.jumpCutMul; this.jumpCut = false; }
      else if (this.vel.y <= 0) this.jumpCut = false;
    }
    if (this.vel.y < -50) this.vel.y = -50;

    const vx0 = this.vel.x, vz0 = this.vel.z, vy0 = this.vel.y;
    const plain = this.state === 'air';
    const hx = this.sweepH('x', this.vel.x * dt, this.vel.y < 4);
    if (hx) {
      if (plain && this.airHit(hx, 'x', vx0, vz0, w)) return;
      this.vel.x = 0;
    }
    const hz = this.sweepH('z', this.vel.z * dt, this.vel.y < 4);
    if (hz) {
      if (plain && this.airHit(hz, 'z', vx0, vz0, w)) return;
      this.vel.z = 0;
    }
    const hy = this.sweepY(this.vel.y * dt);
    if (hy) {
      if (vy0 < 0) { this.land(-vy0, inp, hy); return; }
      this.vel.y = 0;
      this.jumpCut = false;
    }
    if (this.airT > 0.05) this.tryWallrun(w);
  }

  airHit(hit, axis, vx0, vz0, w) {
    const s = axis === 'x' ? Math.sign(vx0) : Math.sign(vz0);
    if (!s) return false;
    const dx = axis === 'x' ? s : 0, dz = axis === 'z' ? s : 0;
    const into = axis === 'x' ? vx0 * s : vz0 * s;
    const wishInto = w.x * dx + w.z * dz;
    const tangent = axis === 'x' ? Math.abs(vz0) : Math.abs(vx0);

    if ((into > 0.5 || wishInto > 0.5) && this.vel.y < 7.5) {
      const top = this.ledgeTop(dx, dz);
      if (top !== null) {
        const rise = top - this.pos.y;
        if (rise > 0 && rise <= P.ledgeMax && this.startClimb(dx, dz, top, Math.hypot(vx0, vz0), 'climb')) return true;
      }
    }
    if (!this.climbUsed && wishInto > 0.6 && into > 2.5 && tangent < into && this.vel.y > -4 && hit.y1 - this.pos.y > 2.0) {
      this.climbUsed = true;
      this.wall = { nx: -dx, nz: -dz, tx: 0, tz: 0, key: hit.id + ':' + -dx + ',' + -dz, speed: 0 };
      this.vel.y = Math.max(this.vel.y, P.wallClimbV);
      this.vel.x = dx * 0.5; this.vel.z = dz * 0.5;
      this.setState('wallclimb');
      this.emit('wallclimb');
      return true;
    }
    return false;
  }

  tryVault(hit, axis, vx0, vz0, w) {
    const s = axis === 'x' ? Math.sign(vx0) : Math.sign(vz0);
    if (!s) return false;
    const dx = axis === 'x' ? s : 0, dz = axis === 'z' ? s : 0;
    const sp = Math.hypot(vx0, vz0);
    if (sp < 3.5 || w.x * dx + w.z * dz < 0.4) return false;
    const top = this.ledgeTop(dx, dz);
    if (top === null) return false;
    const rise = top - this.pos.y;
    if (rise <= P.stepUp || rise > P.vaultMax) return false;
    return this.startClimb(dx, dz, top, sp, 'vault', vx0, vz0);
  }

  startClimb(dx, dz, top, speed, type, vx0 = dx, vz0 = dz) {
    const p = this.pos, y = top + TINY;
    const near = { x: p.x + dx * (2 * P.hw + 0.15), z: p.z + dz * (2 * P.hw + 0.15) };
    const far = { x: p.x + dx * (2 * P.hw + 0.75), z: p.z + dz * (2 * P.hw + 0.75) };
    const order = type === 'vault' ? [far, near] : [near, far];
    let to = null;
    for (const c of order) if (this.fits(c.x, y, c.z, P.h)) { to = c; break; }
    if (!to) return false;
    const rise = top - p.y;
    const dur = type === 'vault' ? 0.2 + rise * 0.07 : 0.16 + rise * 0.14;
    let ex, ez, esp;
    if (type === 'vault') {
      const l = Math.hypot(vx0, vz0) || 1;
      ex = vx0 / l; ez = vz0 / l;
      esp = Math.min(P.maxSpeed, Math.max(speed, P.run) + 0.3);
    } else { ex = dx; ez = dz; esp = Math.max(4.5, speed * 0.8); }
    this.script = { type, t: 0, dur, from: { x: p.x, y: p.y, z: p.z }, to: { x: to.x, y, z: to.z }, dx, dz, ex, ez, esp };
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.crouched = false;
    this.setState(type);
    this.emit(type, { rise });
    return true;
  }

  scriptStep(dt) {
    const S = this.script, p = this.pos;
    S.t += dt;
    const u = Math.min(1, S.t / S.dur);
    let ay, ah;
    if (S.type === 'climb') {
      ay = easeOut(Math.min(1, u / 0.62));
      ah = u < 0.55 ? 0 : smooth((u - 0.55) / 0.45);
    } else {
      ay = easeOut(Math.min(1, u / 0.5));
      ah = u;
    }
    p.x = lerp(S.from.x, S.to.x, ah);
    p.z = lerp(S.from.z, S.to.z, ah);
    p.y = lerp(S.from.y, S.to.y, ay) + (S.type === 'vault' ? Math.sin(u * Math.PI) * 0.12 : 0);
    this.climbP = u;
    if (u >= 1) {
      p.x = S.to.x; p.y = S.to.y; p.z = S.to.z;
      this.vel.x = S.ex * S.esp; this.vel.z = S.ez * S.esp; this.vel.y = 0;
      this.grounded = true;
      this.lastWallKey = null;
      this.climbUsed = false;
      this.setState('ground');
    }
  }

  tryWallrun(w) {
    if (this.state !== 'air') return;
    if (this.hsp < P.wallRunMin * 0.8) return;
    let best = null, bestT = 0;
    for (const [nx, nz] of SIDES) {
      const b = this.probeWall(nx, nz, 0.45);
      if (!b) continue;
      const key = b.id + ':' + nx + ',' + nz;
      if (key === this.lastWallKey) continue;
      const vn = this.vel.x * nx + this.vel.z * nz;
      if (vn > 1.0) continue;
      const tx = this.vel.x - vn * nx, tz = this.vel.z - vn * nz;
      const tsp = Math.hypot(tx, tz);
      if (tsp < P.wallRunMin || tsp < Math.abs(vn) * 1.1) continue;
      const tdx = tx / tsp, tdz = tz / tsp;
      if (w.mag < 0.3 || (w.x * tdx + w.z * tdz) / w.mag < 0.25) continue;
      if (tsp > bestT) { bestT = tsp; best = { nx, nz, tx: tdx, tz: tdz, key, speed: tsp }; }
    }
    if (!best) return;
    // magnetize onto the wall
    if (best.nx) this.sweepH('x', -best.nx * 0.5, false); else this.sweepH('z', -best.nz * 0.5, false);
    this.wall = best;
    this.vel.y = clamp(this.vel.y + 4, 0.5, 2.2);
    this.setState('wallrun');
    this.emit('wallrun');
  }

  wallrunStep(dt, w, inp) {
    const W = this.wall;
    if (this.jumpBuf > 0) {
      const sp = Math.min(P.maxSpeed, W.speed + P.wallJumpBonus);
      this.vel.x = W.tx * sp + W.nx * P.wallJumpOut;
      this.vel.z = W.tz * sp + W.nz * P.wallJumpOut;
      this.vel.y = P.wallJumpUp;
      this.lastWallKey = W.key;
      this.jumpBuf = 0;
      this.jumpCut = false;
      this.climbUsed = false;
      this.airT = 0.06;
      this.setState('air');
      this.emit('walljump');
      return;
    }
    if (inp.slide) { this.leaveWall(2.5); return; }

    W.speed = Math.max(P.run * 0.9, W.speed - 0.6 * dt);
    const gs = this.stateT < P.wallRunFlat ? 0.1 : 0.5;
    this.vel.y = Math.max(this.vel.y - P.gravity * gs * dt, -5);
    this.vel.x = W.tx * W.speed - W.nx * 0.6;
    this.vel.z = W.tz * W.speed - W.nz * 0.6;

    const hx = this.sweepH('x', this.vel.x * dt, false);
    const hz = this.sweepH('z', this.vel.z * dt, false);
    const blockedAhead = (hx && W.nx === 0) || (hz && W.nz === 0);
    const vy0 = this.vel.y;
    const hy = this.sweepY(this.vel.y * dt);
    if (hy) {
      if (vy0 < 0) { this.land(-vy0, inp, hy); return; }
      this.vel.y = 0;
    }
    if (blockedAhead || !this.probeWall(W.nx, W.nz)) { this.leaveWall(0.4); return; }
    if (this.stateT > P.wallRunTime) this.leaveWall(2);
  }

  leaveWall(push) {
    const W = this.wall;
    this.vel.x = W.tx * W.speed + W.nx * push;
    this.vel.z = W.tz * W.speed + W.nz * push;
    this.lastWallKey = W.key;
    this.jumpCut = false;
    this.setState('air');
  }

  wallclimbStep(dt, w, inp) {
    const W = this.wall;
    if (this.jumpBuf > 0) {
      this.vel.x = W.nx * P.kickOut;
      this.vel.z = W.nz * P.kickOut;
      this.vel.y = P.kickUp;
      this.facing = Math.atan2(-W.nx, -W.nz);
      this.lastWallKey = W.key;
      this.jumpBuf = 0;
      this.jumpCut = false;
      this.airT = 0.06;
      this.emit('walljump', { kick: true });
      this.startFlip('wall');
      return;
    }
    const dx = -W.nx, dz = -W.nz;
    const top = this.ledgeTop(dx, dz);
    if (top !== null) {
      const rise = top - this.pos.y;
      if (rise > 0 && rise <= P.ledgeMax && this.startClimb(dx, dz, top, 6, 'climb')) return;
    }
    this.vel.y -= P.gravity * 0.55 * dt;
    this.vel.x = dx * 0.5; this.vel.z = dz * 0.5;
    this.sweepH('x', this.vel.x * dt, false);
    this.sweepH('z', this.vel.z * dt, false);
    const vy0 = this.vel.y;
    const hy = this.sweepY(this.vel.y * dt);
    if (hy) {
      if (vy0 < 0) { this.land(-vy0, inp, hy); return; }
      this.vel.y = 0;
    }
    if (this.vel.y < -1.5 || this.stateT > 0.9 || !this.probeWall(W.nx, W.nz)) {
      this.lastWallKey = W.key;
      this.vel.x = W.nx * 0.8; this.vel.z = W.nz * 0.8;
      this.setState('air');
    }
  }

  land(impact, inp, box) {
    const was = this.state;
    if (box.surface === 'bounce' && impact > 3 && was !== 'crash') {
      this.vel.y = Math.max(P.bounceV, impact * 0.8);
      this.grounded = false;
      this.airT = 0.06;
      this.lastWallKey = null;
      this.climbUsed = false;
      this.jumpCut = false;
      if (was !== 'flip') this.setState('air');
      this.emit('bounce', { impact });
      return;
    }
    this.grounded = true;
    this.vel.y = 0;
    this.airT = 0;
    this.lastWallKey = null;
    this.climbUsed = false;
    this.jumpCut = false;
    this.surface = box.surface;
    this.emit('land', { impact });
    if (was === 'flip') {
      const F = this.flip;
      const rem = F.target - Math.abs(F.angle);
      if (rem > P.flipLandTol) {
        this.flip = null;
        this.pendingBoost = 0;
        this.vel.x *= 0.15; this.vel.z *= 0.15;
        this.crouched = true;
        this.setState('crash');
        this.emit('bail');
        return;
      }
      this.finishFlip(F.target);
    }
    if (this.pendingBoost > 0 && impact <= P.splatImpact) {
      if (impact > P.rollImpact) this.rollBuf = 1; // a clean flip rolls out of big landings
      const sp = this.hsp, add = this.pendingBoost;
      if (sp > 0.5) { const nsp = Math.min(P.maxSpeed, sp + add); this.vel.x *= nsp / sp; this.vel.z *= nsp / sp; }
      else { this.vel.x += Math.sin(this.facing) * add; this.vel.z += Math.cos(this.facing) * add; }
      this.emit('stuck', { boost: add });
      this.pendingBoost = 0;
    }
    if (was === 'dive' && impact <= P.splatImpact) {
      this.crouched = true;
      const sp = this.hsp;
      if (sp > 0.01) { const nsp = Math.min(P.maxSpeed, sp + P.rollBonus); this.vel.x *= nsp / sp; this.vel.z *= nsp / sp; }
      this.setState('roll');
      this.emit('roll', { dive: true });
      this.emit('trick', { trick: 'diveroll', rots: 0 });
      return;
    }
    if (impact > P.splatImpact) {
      this.dead = true;
      this.emit('splat');
      this.setState('stumble');
      return;
    }
    if (impact > P.rollImpact) {
      if (this.rollBuf > 0) {
        this.rollBuf = 0;
        this.crouched = true;
        const sp = this.hsp;
        if (sp > 0.01) {
          const nsp = Math.min(P.maxSpeed, sp + P.rollBonus);
          this.vel.x *= nsp / sp; this.vel.z *= nsp / sp;
        }
        this.setState('roll');
        this.emit('roll');
      } else {
        this.vel.x *= 0.3; this.vel.z *= 0.3;
        this.tryStand();
        this.setState('stumble');
        this.emit('stumble', { impact });
      }
    } else if (inp.slideHeld && this.hsp >= P.slideMin) {
      this.enterSlide();
    } else {
      this.tryStand();
      this.setState(this.crouched ? 'slide' : 'ground');
    }
  }

  // Snapshot used by the rig and ghost recorder.
  anim() {
    const W = this.wall;
    return {
      state: this.state,
      stateT: this.stateT,
      speed: this.hsp,
      vy: this.vel.y,
      facing: this.facing,
      nx: W ? W.nx : 0,
      nz: W ? W.nz : 0,
      climbP: this.script ? Math.min(1, this.script.t / this.script.dur) : 0,
      rise: this.script ? this.script.to.y - this.script.from.y : 0,
      flip: this.flip ? {
        axis: this.flip.axis, angle: this.flip.angle,
        open: Math.max(0, 1 - (this.flip.target - Math.abs(this.flip.angle)) / 1.3),
      } : null,
    };
  }
}
