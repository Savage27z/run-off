import { clamp, damp, wrapAngle } from '../util.js';

// Secondary body motion only: this never changes the controller or its hitbox.
const AIRBORNE = new Set(['air', 'flip', 'dive', 'wallrun', 'wallclimb']);

export class RunnerMotion {
  constructor() { this.reset(); }

  reset() {
    this.previous = null;
    this.bank = 0;
    this.lean = 0;
    this.landing = 0;
  }

  update(dt, pose) {
    if (dt <= 0) return;
    const prev = this.previous;
    const running = pose.state === 'ground';
    let turn = 0, accel = 0;
    if (prev) {
      if (running && prev.state === 'ground') {
        turn = wrapAngle(pose.facing - prev.facing) / dt;
        accel = (pose.speed - prev.speed) / dt;
      }
      if (running && AIRBORNE.has(prev.state) && prev.vy < -2) {
        this.landing = clamp((-prev.vy - 2) / 22, 0, 1);
      } else this.landing = damp(this.landing, 0, 12, dt);
    }
    const speed = clamp(pose.speed / 8.5, 0, 1);
    this.bank = damp(this.bank, running ? clamp(-turn * 0.045 * speed, -0.18, 0.18) : 0, 10, dt);
    this.lean = damp(this.lean, running ? clamp(accel * 0.004, -0.1, 0.12) : 0, 10, dt);
    this.previous = { state: pose.state, speed: pose.speed, facing: pose.facing, vy: pose.vy };
  }
}
