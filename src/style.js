// Style scoring: every move feeds a combo. Keep moving to keep the chain alive; bail and you lose it.

const MOVES = {
  front: { name: 'Front Flip', pts: 100, flip: true },
  back: { name: 'Backflip', pts: 150, flip: true },
  left: { name: 'Side Flip', pts: 120, flip: true },
  right: { name: 'Side Flip', pts: 120, flip: true },
  wall: { name: 'Wall Flip', pts: 220, flip: true },
  dive: { name: 'Dive', pts: 80 },
  diveroll: { name: 'Dive Roll', pts: 60 },
  wallrun: { name: 'Wall Run', pts: 50 },
  walljump: { name: 'Wall Jump', pts: 75 },
  wallclimb: { name: 'Wall Climb', pts: 40 },
  vault: { name: 'Vault', pts: 40 },
  climb: { name: 'Climb', pts: 20 },
  roll: { name: 'Roll', pts: 60 },
  slide: { name: 'Slide', pts: 15 },
  bounce: { name: 'Bounce', pts: 30 },
};
const MULT_NAMES = ['', '', 'Double ', 'Triple ', 'Quad '];
const WINDOW = 2.2;

export class Style {
  constructor() { this.reset(); }

  reset() {
    this.total = 0;
    this.combo = null;
    this.bestCombo = 0;
    this.feed = [];
  }

  add(key, rots = 0) {
    const m = MOVES[key];
    if (!m) return null;
    let name = m.name, pts = m.pts;
    if (m.flip && rots > 1) { name = (MULT_NAMES[rots] || rots + 'x ') + name.replace('Backflip', 'Back Flip'); pts = Math.round(m.pts * rots * (1 + 0.35 * (rots - 1))); }
    if (!this.combo) this.combo = { pts: 0, moves: 0, seen: new Set(), timer: WINDOW };
    const C = this.combo;
    // repeats are worth less; variety is worth more
    const fresh = !C.seen.has(name);
    if (!fresh) pts = Math.round(pts * 0.5);
    C.seen.add(name);
    C.pts += pts;
    C.moves++;
    C.timer = WINDOW;
    const item = { name, pts, fresh, t: 0, big: !!m.flip };
    this.feed.unshift(item);
    if (this.feed.length > 5) this.feed.pop();
    return item;
  }

  get mult() { return this.combo ? Math.min(10, 1 + Math.floor((this.combo.seen.size - 1) * 0.5 + (this.combo.moves - 1) * 0.25)) : 1; }

  // returns banked points when a combo ends naturally
  update(dt) {
    for (const f of this.feed) f.t += dt;
    this.feed = this.feed.filter((f) => f.t < 2.4);
    if (!this.combo) return 0;
    this.combo.timer -= dt;
    if (this.combo.timer <= 0) return this.bank();
    return 0;
  }

  bank() {
    if (!this.combo) return 0;
    const v = this.combo.pts * this.mult;
    this.total += v;
    this.bestCombo = Math.max(this.bestCombo, v);
    this.combo = null;
    return v;
  }

  bail() {
    const lost = this.combo ? this.combo.pts * this.mult : 0;
    this.combo = null;
    return lost;
  }
}
