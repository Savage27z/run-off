// Route bot: drives the real controller headlessly through each course to prove it's finishable.
// In the browser console:  await RUNOFF.test()          -> all maps
//                          await RUNOFF.test('docks')   -> one map (all its routes)

const STEP = 1 / 120;

// Waypoint fields: x,z target; r arrive radius; jumpAt/slideAt/slideHeld(pos) triggers; roll: tap slide while falling.
export const ROUTES = {
  rooftops: {
    main: [
      { x: 0, z: 11, r: 0.8 },
      { x: 0, z: 26, slideAt: (p) => p.z > 11 && p.z < 12, slideHeld: (p) => p.z < 16, jumpAt: (p) => p.z > 23.3 && p.z < 24 },
      { x: 0, z: 36 },
      { x: 5.5, z: 48.8, r: 0.8 },
      { x: 5.5, z: 64, jumpAt: (p) => p.z > 48.6 && p.z < 50 },
      { x: 0, z: 80.6 },
      { x: 0, z: 90, jumpAt: (p) => p.z > 80.3 && p.z < 81.5 },
      { x: 0, z: 112, jumpAt: (p) => p.z > 99.3 && p.z < 100, roll: true },
      { x: 0, z: 124.5 },
      { x: 0, z: 140, slideAt: (p) => p.z > 124.4 && p.z < 125, slideHeld: (p) => p.z < 128, jumpAt: (p) => p.z > 127.5 && p.z < 128 },
      { x: 0, z: 156 },
      { x: 0, z: 180, jumpAt: (p) => p.z > 155.8 && p.z < 157 },
      { x: 0, z: 192, jumpAt: (p) => p.z > 183.2 && p.z < 183.9 },
      { x: 0, z: 199, slideAt: (p) => p.z > 192.6 && p.z < 193.3, slideHeld: (p) => p.z < 196.5 },
      { x: -5.4, z: 204.2, r: 0.7 },
      { x: -5.4, z: 219, jumpAt: (p) => p.z > 205.2 && p.z < 205.9 },
      { x: 0, z: 230 },
      { x: 0, z: 246, jumpAt: (p) => p.z > 236.5 && p.z < 237.2 },
      { x: 0, z: 270, slideAt: (p) => p.z > 253.6 && p.z < 254.3, slideHeld: (p) => p.z < 256, jumpAt: (p) => p.z > 255.4 && p.z < 256 },
      { x: 0, z: 295, jumpAt: (p) => p.z > 281.2 && p.z < 281.9, roll: true },
      { x: 0, z: 325, jumpAt: (p) => p.z > 303.9 && p.z < 304.7 },
    ],
  },
  docks: {
    high: [
      { x: 0, z: 8, jumpAt: (p) => p.z > 5.3 && p.z < 6 },
      { x: 0, z: 26, jumpAt: (p) => p.z > 20.4 && p.z < 21.1 },
      { x: -1.75, z: 50.5, jumpAt: (p) => p.z > 35.6 && p.z < 36.2 },
      { x: -2.0, z: 61, jumpAt: (p) => p.z > 51.2 && p.z < 52 },
      { x: 3.66, z: 73 },
      { x: 3.66, z: 136.3, r: 0.6, jumpAt: (p) => p.z > 74.1 && p.z < 74.4 },
      { x: 2, z: 142, jumpAt: (p) => p.z > 136.2 && p.z < 137 },
      { x: 0, z: 148 },
      { x: 0, z: 156, jumpAt: (p) => p.z > 149.7 && p.z < 150.5 },
      { x: 0, z: 172, jumpAt: (p) => p.z > 163.9 && p.z < 164.6 },
      { x: 0, z: 190 },
      { x: 0, z: 204, jumpAt: (p) => p.z > 193.2 && p.z < 193.9, roll: true },
      { x: 0, z: 218, jumpAt: (p) => p.z > 209.2 && p.z < 209.9 },
      { x: 0, z: 234, jumpAt: (p) => p.z > 224.2 && p.z < 224.9 },
      { x: 0, z: 246, jumpAt: (p) => p.z > 233.8 && p.z < 234.5 },
      { x: 0, z: 254, jumpAt: (p) => p.z > 245.9 && p.z < 246.6 },
      { x: 4.4, z: 258.5, r: 0.7 },
      { x: 4.4, z: 280, jumpAt: (p) => p.z > 259.8 && p.z < 260.4 },
      { x: 0, z: 294, roll: true },
      { x: 0, z: 301, slideAt: (p) => p.z > 294.6 && p.z < 295.3, slideHeld: (p) => p.z < 298.5 },
      { x: 0, z: 313 },
      { x: 0, z: 326, jumpAt: (p) => p.z > 312.5 && p.z < 313.2 },
      { x: 0, z: 338, jumpAt: (p) => p.z > 324.7 && p.z < 325.4 },
      { x: 0, z: 350, jumpAt: (p) => p.z > 336.9 && p.z < 337.6 },
      { x: 0, z: 360, jumpAt: (p) => p.z > 349.1 && p.z < 349.8 },
    ],
    low: [
      { x: 0, z: 8, jumpAt: (p) => p.z > 5.3 && p.z < 6 },
      { x: 0, z: 26, jumpAt: (p) => p.z > 20.4 && p.z < 21.1 },
      { x: -1.75, z: 50.5, jumpAt: (p) => p.z > 35.6 && p.z < 36.2 },
      { x: -2.0, z: 61, jumpAt: (p) => p.z > 51.2 && p.z < 52 },
      { x: -2, z: 80, roll: true },
      { x: -2, z: 96 },
      { x: -2, z: 104, jumpAt: (p) => p.z > 98 && p.z < 98.8, roll: true },
      { x: -3.5, z: 112, jumpAt: (p) => p.z > 104.4 && p.z < 105.1 },
      { x: -3.5, z: 117, slideAt: (p) => p.z > 111.8 && p.z < 112.6, slideHeld: (p) => p.z < 115.5 },
      { x: -1.5, z: 125 },
      { x: 0, z: 134, jumpAt: (p) => p.z > 125.6 && p.z < 126.4 },
      { x: 0, z: 146, jumpAt: (p) => p.z > 137.6 && p.z < 138.4 },
      { x: 0, z: 156, jumpAt: (p) => p.z > 149.7 && p.z < 150.5 },
      { x: 0, z: 172, jumpAt: (p) => p.z > 163.9 && p.z < 164.6 },
      { x: 0, z: 190 },
      { x: 0, z: 204, jumpAt: (p) => p.z > 193.2 && p.z < 193.9, roll: true },
      { x: 0, z: 218, jumpAt: (p) => p.z > 209.2 && p.z < 209.9 },
      { x: 0, z: 234, jumpAt: (p) => p.z > 224.2 && p.z < 224.9 },
      { x: -7, z: 262 },
      { x: -7, z: 290 },
      { x: 0, z: 301, slideAt: (p) => p.z > 294.6 && p.z < 295.3, slideHeld: (p) => p.z < 298.5 },
      { x: 0, z: 313 },
      { x: 0, z: 326, jumpAt: (p) => p.z > 312.5 && p.z < 313.2 },
      { x: 0, z: 338, jumpAt: (p) => p.z > 324.7 && p.z < 325.4 },
      { x: 0, z: 350, jumpAt: (p) => p.z > 336.9 && p.z < 337.6 },
      { x: 0, z: 360, jumpAt: (p) => p.z > 349.1 && p.z < 349.8 },
    ],
  },
  skeleton: {
    main: [
      { x: 0, z: 6.5, jumpAt: (p) => p.z > 0.2 && p.z < 1.0 },
      { x: 0, z: 26, jumpAt: (p) => p.z > 7.4 && p.z < 8 },
      { x: 0, z: 33, slideAt: (p) => p.z > 27.2 && p.z < 28, slideHeld: (p) => p.z < 31 },
      { x: 5.4, z: 37, r: 0.8 },
      { x: 5.5, z: 56, jumpAt: (p) => p.z > 39.2 && p.z < 40 },
      { x: 0, z: 66, jumpAt: (p) => p.z > 58.7 && p.z < 59.5 },
      { x: 0, z: 78, jumpAt: (p) => p.z > 70.7 && p.z < 71.5 },
      { x: 0, z: 92, jumpAt: (p) => p.z > 84.3 && p.z < 85 },
      { x: 0, z: 113 },
      { x: 0, z: 130, jumpAt: (p) => p.z > 122.3 && p.z < 123 },
      { x: 0, z: 150, slideAt: (p) => p.z > 134.4 && p.z < 135.2, slideHeld: (p) => p.z < 137, jumpAt: (p) => p.z > 136.3 && p.z < 137 },
      { x: 0, z: 178 },
      { x: 5.5, z: 186, r: 0.7 },
      { x: 5.5, z: 200, jumpAt: (p) => p.z > 187.3 && p.z < 187.9 },
      { x: 0, z: 215, jumpAt: (p) => p.z > 208.3 && p.z < 209 },
      { x: 0, z: 228, jumpAt: (p) => p.z > 221.6 && p.z < 222.3 },
      { x: 0, z: 244, jumpAt: (p) => p.z > 235.3 && p.z < 235.9 },
      { x: 0, z: 281 },
    ],
  },
};

ROUTES.park = {
  bridge: [
    { x: 0, z: 9 },
    { x: 0, z: 22 },
    { x: 0, z: 30 },
    { x: 0, z: 40, jumpAt: (p) => p.z > 33.3 && p.z < 34 },
    { x: 6, z: 43.5, r: 0.8 },
    { x: 6, z: 80 },
    { x: 6, z: 101.5 },
    { x: 5, z: 112 },
    { x: 0, z: 141 },
    { x: 0, z: 158 },
    { x: 0, z: 208 },
    { x: 0, z: 240, jumpAt: (p) => p.z > 231.3 && p.z < 231.9 },
    { x: 0, z: 262 },
    { x: 0, z: 289 },
    { x: 0, z: 316 },
    { x: 0, z: 333 },
  ],
  alley: [
    { x: 0, z: 9 },
    { x: 0, z: 22 },
    { x: 0, z: 30 },
    { x: -1, z: 40, jumpAt: (p) => p.z > 33.3 && p.z < 34 },
    { x: -1, z: 70, roll: true },
    { x: -1, z: 93 },
    { x: -7.5, z: 100.5, r: 0.8 },
    { x: -6, z: 110 },
    { x: 0, z: 141 },
    { x: 0, z: 158 },
    { x: 0, z: 208 },
    { x: 0, z: 240, jumpAt: (p) => p.z > 231.3 && p.z < 231.9 },
    { x: 0, z: 262 },
    { x: 0, z: 289 },
    { x: 0, z: 316 },
    { x: 0, z: 333 },
  ],
};

ROUTES.oldtown = {
  main: [
    { x: 0, z: 10, jumpAt: (p) => p.z > 11.2 && p.z < 11.9 },
    { x: 0, z: 27, jumpAt: (p) => p.z > 11.2 && p.z < 11.9 },
    { x: 0, z: 40, jumpAt: (p) => p.z > 28.2 && p.z < 28.9 },
    { x: 0, z: 56, jumpAt: (p) => p.z > 43.2 && p.z < 43.9, roll: true },
    { x: -1.5, z: 74 },
    { x: 0, z: 90 },
    { x: 0, z: 104, jumpAt: (p) => p.z > 94.6 && p.z < 95.4 },
    { x: 0, z: 124, jumpAt: (p) => p.z > 106.2 && p.z < 106.9 },
    { x: 0, z: 136, jumpAt: (p) => p.z > 125.2 && p.z < 125.9 },
    { x: 0, z: 149, jumpAt: (p) => p.z > 138.2 && p.z < 138.9 },
    { x: 0, z: 157, jumpAt: (p) => p.z > 151.2 && p.z < 151.9 },
    { x: 3.8, z: 161.5, r: 0.7 },
    { x: 3.9, z: 176, jumpAt: (p) => p.z > 162.3 && p.z < 162.9 },
    { x: 0, z: 183 },
    { x: 0, z: 196, jumpAt: (p) => p.z > 184.2 && p.z < 184.9 },
    { x: 0, z: 246 },
    { x: 0, z: 250, jumpAt: (p) => p.z > 247.4 && p.z < 248.2 },
    { x: 0, z: 253, jumpAt: (p) => p.z > 250.4 && p.z < 251.2 },
    { x: 0, z: 262, jumpAt: (p) => p.z > 253.4 && p.z < 254.2 },
    { x: 0, z: 290, jumpAt: (p) => p.z > 276.2 && p.z < 276.9 },
    { x: 0, z: 325, roll: true },
  ],
};

ROUTES.yard = {
  main: [
    { x: 0, z: 30 },
    { x: 0, z: 53 },
    { x: 0, z: 73 },
    { x: 0, z: 88 },
    { x: 4.7, z: 97.5, r: 0.6 },
    { x: 4.7, z: 112, jumpAt: (p) => p.z > 99.3 && p.z < 99.9 },
    { x: -4.7, z: 119.5, r: 0.6 },
    { x: -4.7, z: 133, jumpAt: (p) => p.z > 121.3 && p.z < 121.9 },
    { x: 0, z: 133.5, r: 0.8 },
    { x: 0, z: 151 },
    { x: 0, z: 164, jumpAt: (p) => p.z > 151.2 && p.z < 151.9 },
    { x: 0, z: 175, jumpAt: (p) => p.z > 165.2 && p.z < 165.9, roll: true },
    { x: 0, z: 186, jumpAt: (p) => p.z > 177.2 && p.z < 177.9 },
    { x: 0, z: 200, slideAt: (p) => p.z > 193.8 && p.z < 194.5, slideHeld: (p) => p.z < 197.5 },
    { x: 0, z: 220 },
    { x: 0, z: 250, jumpAt: (p) => p.z > 220.2 && p.z < 220.9, roll: true },
    { x: 0, z: 298, jumpAt: (p) => (p.z > 261.2 && p.z < 261.9) || [267.5, 273.5, 279.5, 285.5, 291.5].some((e) => p.z > e - 0.5 && p.z < e - 0.1) },
    { x: 0, z: 310, jumpAt: (p) => p.z > 303.2 && p.z < 303.9 },
    { x: 0, z: 322, jumpAt: (p) => p.z > 313.3 && p.z < 314 },
    { x: 0, z: 348, slideAt: (p) => p.z > 324.3 && p.z < 325, slideHeld: (p) => p.z < 327, jumpAt: (p) => p.z > 326.4 && p.z < 326.9 },
    { x: 0, z: 378, jumpAt: (p) => p.z > 349.3 && p.z < 349.9, roll: true },
  ],
};

ROUTES.depot = {
  main: [
    { x: 0, z: 58 },
    { x: 0, z: 90 },
    { x: 0, z: 128 },
    { x: 0, z: 150, jumpAt: (p) => p.z > 138.4 && p.z < 139 },
    { x: 0, z: 176, jumpAt: (p) => p.z > 176.3 && p.z < 177 },
    { x: 0, z: 212, jumpAt: (p) => p.z > 176.3 && p.z < 177, slideAt: (p) => p.z > 192.2 && p.z < 192.8, slideHeld: (p) => p.z < 195.5 },
    { x: 0, z: 230, slideAt: (p) => p.z > 210.3 && p.z < 211, slideHeld: (p) => p.z < 213.5, jumpAt: (p) => p.z > 213.5 && p.z < 213.95 },
    { x: 0, z: 279, jumpAt: (p) => [231.4, 238.4, 245.4, 252.4, 259.4, 266.4].some((e) => p.z > e && p.z < e + 0.6) },
  ],
};

const hillsideFinish = [
  { x: 0, z: 145 },
  { x: 0, z: 174 },
  { x: 0, z: 205, slideAt: (p) => p.z > 177 && p.z < 178, slideHeld: (p) => p.z < 186, jumpAt: (p) => p.z > 186.8 && p.z < 187.5 },
  { x: 0, z: 240, jumpAt: (p) => p.z > 216.5 && p.z < 217.2, roll: true },
  { x: 0, z: 305 },
];
ROUTES.hillside = {
  balcony: [
    { x: 0, z: 51 },
    { x: 8, z: 57 },
    { x: 8, z: 84 },
    { x: 8, z: 132, jumpAt: (p) => p.z > 86.5 && p.z < 87.2 },
    ...hillsideFinish,
  ],
  garden: [
    { x: 0, z: 51 },
    { x: -6, z: 57 },
    { x: -6, z: 91, r: 0.6 },
    { x: -1.9, z: 94, r: 0.5 },
    { x: -1.9, z: 105, r: 0.5 },
    { x: -6, z: 110, r: 0.6 },
    { x: -6, z: 132 },
    ...hillsideFinish,
  ],
};

export function runRoute(game, mapId, wps, secs = 90) {
  const P = game.player;
  game.loadMap(mapId);
  const m = game.map, s = m.spawn;
  P.reset(s.x, s.y, s.z, s.yaw);
  const log = [];
  let w = 0, cp = 0, finish = null;
  for (let k = 0; k < secs * 120; k++) {
    const t = k / 120;
    const W = wps[Math.min(w, wps.length - 1)];
    const dx = W.x - P.pos.x, dz = W.z - P.pos.z;
    if (w < wps.length - 1 && Math.hypot(dx, dz) < (W.r || 1.0)) w++;
    const i = { mz: 1, mx: 0, camYaw: Math.atan2(dx, dz), jumpHeld: true, jump: false, slide: false, slideHeld: false };
    const g = P.state === 'ground' || P.state === 'slide';
    if (W.jumpAt && g && W.jumpAt(P.pos)) i.jump = true;
    if (W.slideAt && P.state === 'ground' && W.slideAt(P.pos)) i.slide = true;
    if (W.slideHeld && W.slideHeld(P.pos)) i.slideHeld = true;
    if (W.roll && P.state === 'air' && P.vel.y < -5) i.slide = true;
    P.step(STEP, i);
    const c = m.checkpoints[cp];
    const p = P.pos;
    if (c && p.x + 0.3 > c.x0 && p.x - 0.3 < c.x1 && p.y + 1.8 > c.y0 && p.y < c.y1 && p.z + 0.3 > c.z0 && p.z - 0.3 < c.z1) {
      log.push(`  CP${cp + 1}  ${t.toFixed(2)}s`);
      if (++cp === m.checkpoints.length) { finish = t; break; }
    }
    for (const e of P.events) {
      if (['wallrun', 'wallclimb', 'climb', 'vault', 'roll', 'stumble', 'walljump', 'splat'].includes(e.type)) log.push(`    ${t.toFixed(2)} ${e.type} @ ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`);
    }
    P.events.length = 0;
    if (p.y < m.killY || P.dead || (m.isDead && m.isDead(p, cp))) { log.push(`  DEAD @ ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} t=${t.toFixed(2)}`); break; }
  }
  if (finish == null) log.push(`  DID NOT FINISH — stuck @ ${P.pos.x.toFixed(1)},${P.pos.y.toFixed(1)},${P.pos.z.toFixed(1)} (${P.state}), waypoint ${w + 1}/${wps.length}`);
  return { finish, log };
}

export function testAll(game, only) {
  const out = [];
  for (const [id, routes] of Object.entries(ROUTES)) {
    if (only && id !== only) continue;
    for (const [name, wps] of Object.entries(routes)) {
      const r = runRoute(game, id, wps);
      out.push(`${id}/${name}: ${r.finish != null ? 'FINISH ' + r.finish.toFixed(2) + 's' : 'FAIL'}`);
      out.push(...r.log);
    }
  }
  return out.join('\n');
}
