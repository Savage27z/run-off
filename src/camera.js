import * as THREE from 'three';
import { clamp, damp, dampAngle } from './util.js';

export class FollowCam {
  constructor(cam, col) {
    this.cam = cam;
    this.col = col;
    this.yaw = 0;
    this.pitch = 0.2;
    this.dist = 4.3;
    this.curDist = 4.3;
    this.ty = 0;
    this.baseFov = 72;
    this.fov = 72;
    this.shake = 0;
    this.roll = 0;
    this.target = new THREE.Vector3();
  }

  look(dx, dy, sens, invert) {
    this.yaw -= dx * 0.0022 * sens;
    this.pitch = clamp(this.pitch + dy * 0.0022 * sens * (invert ? -1 : 1), -0.75, 1.15);
  }

  snap(x, y, z, yaw) {
    this.yaw = yaw;
    this.pitch = 0.2;
    this.ty = y + 1.5;
    this.curDist = this.dist;
    this.roll = 0;
  }

  update(dt, px, py, pz, anim, crouched) {
    const headH = crouched ? 1.0 : 1.5;
    if (Math.abs(this.ty - (py + headH)) > 6) this.ty = py + headH;
    this.ty = damp(this.ty, py + headH, 12, dt);
    const t = this.target.set(px, this.ty, pz);

    // gentle auto-follow while wall-running so the line stays readable
    if (anim.state === 'wallrun') this.yaw = dampAngle(this.yaw, anim.facing, 1.6, dt);

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const fx = Math.sin(this.yaw) * cp, fy = -sp, fz = Math.cos(this.yaw) * cp;
    const speedK = clamp((anim.speed - 8) / 9, 0, 1);
    const want = this.dist + speedK * 0.9;
    const hit = this.col.raycast(t.x, t.y, t.z, -fx, -fy, -fz, want + 0.3);
    const d = Math.max(0.7, Math.min(want, hit - 0.3));
    this.curDist = d < this.curDist ? d : damp(this.curDist, d, 3.5, dt);

    const c = this.cam;
    c.position.set(t.x - fx * this.curDist, t.y - fy * this.curDist, t.z - fz * this.curDist);
    if (this.shake > 0) {
      const s = this.shake * this.shake * 0.25;
      c.position.x += (Math.random() - 0.5) * s;
      c.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 3);
    }
    c.lookAt(t);

    let rollT = 0;
    if (anim.state === 'wallrun') {
      const rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      rollT = (anim.nx * rx + anim.nz * rz) * 0.07;
    }
    this.roll = damp(this.roll, rollT, 6, dt);
    c.rotateZ(this.roll);

    const fovT = this.baseFov + speedK * 16 + (anim.state === 'slide' ? 4 : 0);
    this.fov = damp(this.fov, fovT, 5, dt);
    if (Math.abs(c.fov - this.fov) > 0.01) { c.fov = this.fov; c.updateProjectionMatrix(); }
  }
}
