const BINDS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  slide: ['ShiftLeft', 'ShiftRight', 'KeyC'],
  trick: ['KeyE', 'KeyF'],
  restart: ['KeyR'],
  respawn: ['KeyQ', 'Backspace'],
  pause: ['Escape', 'KeyP'],
};

// Standard gamepad mapping
const PAD = { jump: [0], slide: [1, 7, 6], trick: [2, 5], restart: [3], respawn: [4], pause: [9] };

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Map();
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.padPrev = [];
    this.padLook = { x: 0, y: 0 };
    this.padMove = { x: 0, y: 0 };
    this.onPause = null;
    this.onAnyKey = null;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backspace' || e.code === 'Tab') e.preventDefault();
      this.down.add(e.code);
      for (const [a, keys] of Object.entries(BINDS)) if (keys.includes(e.code)) this.pressed.set(a, (this.pressed.get(a) || 0) + 1);
      if (this.onAnyKey) this.onAnyKey(e);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => {
      this.reset();
      if (this.onBlur) this.onBlur();
    });
    // drag-to-look fallback for when pointer lock is unavailable
    addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) { this.pressed.set('trick', (this.pressed.get('trick') || 0) + 1); this.mouseTrick = true; return; }
      if (e.target.tagName === 'CANVAS') this.dragging = true;
    });
    addEventListener('mouseup', () => { this.dragging = false; this.mouseTrick = false; });
    addEventListener('mousemove', (e) => {
      if (!this.locked && !this.dragging) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = !!document.pointerLockElement;
      if (was && !this.locked && this.onUnlock) this.onUnlock();
    });
  }

  lock(el) {
    if (document.pointerLockElement) return;
    const plain = () => {
      try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch {}
    };
    try {
      const p = el.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(plain);
    } catch { plain(); }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  isDown(a) { return BINDS[a].some((k) => this.down.has(k)) || this.padDown(a); }

  take(a) {
    const n = this.pressed.get(a) || 0;
    if (n) { this.pressed.set(a, 0); return true; }
    return false;
  }
  clearPressed() { this.pressed.clear(); }

  reset() {
    this.down.clear();
    this.clearPressed();
    this.dx = this.dy = 0;
    this.dragging = this.mouseTrick = false;
  }

  padDown(a) {
    const p = this.pad;
    if (!p || !PAD[a]) return false;
    return PAD[a].some((i) => p.buttons[i] && p.buttons[i].pressed);
  }

  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;
    for (const p of pads) if (p && p.connected) { this.pad = p; break; }
    this.padMove.x = this.padMove.y = this.padLook.x = this.padLook.y = 0;
    if (!this.pad) { this.padPrev = []; return; }
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    const ax = this.pad.axes;
    this.padMove.x = dz(ax[0] || 0); this.padMove.y = dz(ax[1] || 0);
    this.padLook.x = dz(ax[2] || 0); this.padLook.y = dz(ax[3] || 0);
    for (const [a, idx] of Object.entries(PAD)) {
      for (const i of idx) {
        const now = !!(this.pad.buttons[i] && this.pad.buttons[i].pressed);
        if (now && !this.padPrev[i]) this.pressed.set(a, (this.pressed.get(a) || 0) + 1);
      }
    }
    this.padPrev = this.pad.buttons.map((b) => b.pressed);
  }

  move() {
    let mx = 0, mz = 0;
    if (this.isDown('forward')) mz += 1;
    if (this.isDown('back')) mz -= 1;
    if (this.isDown('right')) mx += 1;
    if (this.isDown('left')) mx -= 1;
    if (this.padMove.x || this.padMove.y) { mx = this.padMove.x; mz = -this.padMove.y; }
    return { mx, mz };
  }

  consumeLook() {
    const r = { dx: this.dx, dy: this.dy };
    this.dx = this.dy = 0;
    return r;
  }
}
