// Map definitions. Courses run toward +z. Checkpoints are listed in order; the last one is the finish.
import * as THREE from 'three';
import { CONT } from './builder.js';
import { hillside } from './maps/hillside.js';

// z-facing gate across x0..x1 at z, floor y
const gate = (x0, x1, y, z, { h = 4.5, yaw = 0, y0 = y, spawnX = (x0 + x1) / 2, vis = [x0, x1] } = {}) => ({
  x0, x1, y0, y1: y + h, z0: z - 0.5, z1: z + 0.5, visY: y, visX0: vis[0], visX1: vis[1], spawn: { x: spawnX, y, z: z + 1, yaw },
});
const hint = (z0, z1, text, y0 = -100, y1 = 1000, x0 = -1000, x1 = 1000) => ({ x0, x1, y0, y1, z0, z1, text });


// Background old-town fill: rows of timber houses with the odd modern poster block.
function townFill(b, keep, { x0 = -90, x1 = 90, z0 = -60, z1 = 400, skip = null } = {}) {
  const fac = ['fac_shoji', 'fac_shoji2', 'fac_shoji3'], roofs = ['tile_roof', 'tile_roof2', 'tile_roof3'];
  for (let x = x0; x < x1; x += 13) {
    for (let z = z0; z < z1; z += 12) {
      const w = b.r(8, 11), d = b.r(8, 10.5), bx = x + b.r(0, 12 - w), bz = z + b.r(0, 11 - d);
      if (keep.some(([a0, c0, a1, c1]) => bx < a1 && bx + w > a0 && bz < c1 && bz + d > c0)) continue;
      if (skip && skip(bx, bz, w, d)) continue;
      if (b.rng() < 0.13) {
        b.building(bx, bz, bx + w, bz + d, b.r(14, 30), b.pick(['fac_conc', 'fac_conc2', 'fac_grey']), '', { roof: 'pav_light', trim: 'trim_green' });
        b.poster(bx + w / 2, b.r(5, 9), bz - 0.03, 3, 4, Math.PI, (b.rng() * 4) | 0);
      } else {
        b.house(bx, bz, bx + w, bz + d, b.r(4, 9), b.r(1.6, 3), b.rng() < 0.5 ? 'x' : 'z', b.pick(fac), b.pick(roofs), { walk: false });
      }
    }
  }
}

export const MAPS = [
  {
    id: 'rooftops',
    name: 'Rooftops',
    tagline: 'Dusk over the old district',
    blurb: 'Learn to flow: slide, vault, wall-run, climb, roll.',
    theme: 'dusk',
    unlock: 0,
    medals: [56, 46, 40, 35],
    spawn: { x: 0, y: 20, z: -6, yaw: 0 },
    killY: 12,
    checkpoints: [
      gate(-6, 6, 20, 31),
      gate(-6, 6, 20, 62.5),
      gate(-7, 7, 23, 86),
      gate(-6, 6, 15, 110),
      gate(-6, 6, 15, 138.5),
      gate(-7, 7, 19.5, 173),
      gate(-6, 6, 18, 192),
      gate(-6, 6, 17.5, 220),
      gate(-6, 6, 20.5, 268),
      gate(-6, 6, 13, 293, { y0: 12, h: 9 }),
      gate(-7, 7, 17.3, 320, { h: 5 }),
    ],
    hints: [
      hint(-14, 5, '<k>W A S D</k> run · <k>Mouse</k> look'),
      hint(5, 14, 'Hold <k>Shift</k> while running to <b>slide</b> under'),
      hint(15.5, 24, '<k>Space</k> to <b>jump</b> the gap'),
      hint(29, 38, 'Run straight into low walls to <b>vault</b>'),
      hint(40, 50, '← Jump at the wall on your left to <b>wall-run</b>'),
      hint(68, 82, 'Jump into a ledge to <b>climb</b> it'),
      hint(88, 100, 'Big drop — tap <k>Shift</k> just before landing to <b>roll</b>'),
      hint(112, 127.5, '<b>Slide</b>, then <k>Space</k> — carry the speed over the gap'),
      hint(142, 158, 'Jump <b>into</b> the tall wall to run up it'),
      hint(198, 206, 'Wall on your right this time →'),
      hint(248, 256, '<b>Slide</b>, then jump the gap'),
      hint(274, 282, 'Big drop — flip it, or roll it'),
    ],
    env: { water: { y: -0.6 }, birds: [30, 22, 80] },
    build(b) {
      // street grid on the city side, promenade + sea on the left (+x)
      b.street(0, 0, [-700, 56, -700, 700]);
      b.box(56, -3, -400, 63, 0.05, 700, { top: 'pav_light', side: 'concrete' }, { collide: false });
      b.box(63, -3, -400, 64, 0.9, 700, { top: 'parapet', side: 'concrete' }, { collide: false });
      for (let z = -60; z < 380; z += 18) b.palm(59.5, 0.05, z, 6 + b.r(0, 2));
      for (let z = -40; z < 360; z += 36) b.lamp(62.3, 0, z + 9, 6);
      for (let z = -40; z < 350; z += 22) { b.tree(-13.6, 0, z, 0.8); }
      b.streetLife({ x: -11, from: -40, to: 340, cars: 14, trees: false });
      for (const z of [26, 54.5, 103, 131.5]) b.streetLife({ z, from: -60, to: 50, cars: 3, trees: false });

      // A — start roof
      b.building(-7, -12, 7, 24, 20, 'fac_coral', 's', { roof: 'pav_warm' });
      b.railing(-6.85, -12, -6.85, 24, 20); b.railing(6.85, -12, 6.85, 24, 20);
      b.housing(-6.5, -11, -3.5, -8, 20, 2.6, 'fac_peach');
      b.ac(5, 20, -6); b.antenna(5.5, 20, -10, 7); b.vent(4.6, 20, 8); b.vent(-5, 20, 10);
      b.duct(-7, 20.95, 14, 7, 21.7, 14.8);
      b.box(-6.9, 20, 14.2, -6.5, 20.95, 14.6, 'steel'); b.box(6.5, 20, 14.2, 6.9, 20.95, 14.6, 'steel');
      // B
      b.building(-6, 28, 6, 50, 20, 'fac_peach', '', { roof: 'pav_lav' });
      b.railing(-5.85, 28, -5.85, 50, 20); b.railing(5.85, 28, 5.85, 43, 20);
      b.box(-6, 20, 38, 6, 21.0, 38.35, 'parapet');
      b.ac(-4.6, 20, 45);
      // W — wall-run tower
      b.building(6, 44, 12, 66, 34, 'fac_office', '', { roof: 'pav_light' });
      b.arrow(5.94, 21.6, 54, 5, 1.2, -Math.PI / 2, '#ffb020');
      b.sign(5.93, 26, 55, 9, 2.2, 'RUN THE WALL', '#27e8ff', -Math.PI / 2);
      // C — bounce awning shortcut onto D
      b.building(-6, 59, 6, 82, 20, 'fac_sky', '', { roof: 'pav_light' });
      b.railing(-5.85, 59, -5.85, 82, 20); b.railing(5.85, 67, 5.85, 82, 20);
      b.box(-5, 20, 68, -2, 20.4, 74, { top: 'glass', side: 'steel' });
      b.ac(4.6, 20, 72); b.vent(4.4, 20, 66);
      b.awning(-5.4, 75.4, -2.4, 80.4, 20.6, 'canvas_red');
      // D
      b.building(-7, 82, 7, 100, 23, 'fac_brick', '', { roof: 'pav_mint' });
      b.railing(-6.85, 82, -6.85, 100, 23); b.railing(6.85, 82, 6.85, 100, 23);
      b.waterTower(4.6, 23, 93);
      b.antenna(-5.8, 23, 97, 5);
      // E — bounce awning over the gap
      b.building(-6, 106, 6, 128, 15, 'fac_lemon', '', { roof: 'pav_warm' });
      b.railing(-5.85, 106, -5.85, 128, 15); b.railing(5.85, 106, 5.85, 122, 15);
      b.vent(-4.8, 15, 108); b.ac(4.7, 15, 117, 1);
      b.awning(2.6, 123.4, 5.5, 127.2, 15.7, 'canvas_blue');
      // F
      b.building(-6, 135.2, 6, 158, 15, 'fac_mint', '', { roof: 'pav_lav' });
      b.railing(-5.85, 135.2, -5.85, 158, 15); b.railing(5.85, 135.2, 5.85, 158, 15);
      b.ac(-4.7, 15, 146);
      // G
      b.building(-7, 158, 7, 184, 19.5, 'fac_office', '', { roof: 'pav_light' });
      b.railing(-6.85, 158, -6.85, 184, 19.5); b.railing(6.85, 158, 6.85, 184, 19.5);
      b.housing(3.5, 176, 6.6, 182.5, 19.5, 3, 'fac_coral');
      // H — second slide + vault
      b.building(-6, 188, 6, 206, 18, 'fac_peach', '', { roof: 'pav_warm' });
      b.railing(5.85, 188, 5.85, 206, 18);
      b.duct(-6, 18.95, 195, 6, 19.7, 195.8);
      b.box(-6, 18, 201, 6, 19.0, 201.35, 'parapet');
      // wall-run tower on the right (-x), then J
      b.building(-12, 204, -6, 228, 32, 'fac_office', '', { roof: 'pav_light' });
      b.arrow(-5.94, 19.6, 212, 5, 1.2, Math.PI / 2, '#ffb020');
      b.building(-6, 216, 6, 238, 17.5, 'fac_sky', '', { roof: 'pav_light' });
      b.railing(5.85, 216, 5.85, 238, 17.5);
      b.ac(4, 17.5, 224); b.ac(-3.8, 17.5, 231); b.vent(3.6, 17.5, 234);
      // K — climb, L — slide-jump gap
      b.building(-7, 238, 7, 256, 20.5, 'fac_brick', '', { roof: 'pav_mint' });
      b.railing(-6.85, 238, -6.85, 256, 20.5); b.railing(6.85, 238, 6.85, 256, 20.5);
      b.antenna(-5.8, 20.5, 242, 5);
      b.building(-6, 263, 6, 282, 20.5, 'fac_lemon', '', { roof: 'pav_warm' });
      b.railing(-5.85, 263, -5.85, 282, 20.5); b.railing(5.85, 263, 5.85, 282, 20.5);
      // M — the big drop, N — wall-climb to the finish
      b.building(-6, 288, 6, 306, 13, 'fac_mint', '', { roof: 'pav_lav' });
      b.railing(-5.85, 288, -5.85, 306, 13); b.railing(5.85, 288, 5.85, 306, 13);
      b.building(-7, 306, 7, 330, 17.3, 'fac_office', 'n', { roof: 'pav_light' });
      b.railing(-6.85, 306, -6.85, 330, 17.3); b.railing(6.85, 306, 6.85, 330, 17.3);
      b.housing(3.5, 323, 6.6, 329.5, 17.3, 3, 'fac_coral');
      b.sign(0, 22.3, 329.2, 12, 3, 'RUNOFF', '#ff5a1f', Math.PI);
      // city (sea side kept open)
      const avoid = [[-15, -20, 15, 340]];
      b.backdrop({ x0: -140, x1: 50, z0: -120, z1: 440, avoid, hMin: 10, hMax: 42 });
      b.backdrop({ x0: -380, x1: 50, z0: 440, z1: 700, cell: 40, hMin: 20, hMax: 90, roofDeco: false });
      b.backdrop({ x0: -380, x1: 50, z0: -400, z1: -120, cell: 40, hMin: 20, hMax: 90, roofDeco: false });
      b.backdrop({ x0: -380, x1: -140, z0: -120, z1: 440, cell: 40, hMin: 20, hMax: 90, roofDeco: false });
    },
  },

  {
    id: 'docks',
    name: 'Docks',
    tagline: 'Container yard, after midnight',
    blurb: 'Two routes. The high line is faster — if you can hold it.',
    theme: 'night',
    unlock: 1,
    medals: [66, 54, 46.5, 40.5],
    spawn: { x: 0, y: 8, z: -16, yaw: 0 },
    killY: -0.8,
    env: { water: { y: -1.2 }, birds: [0, 16, 90] },
    checkpoints: [
      gate(-2.44, 2.44, 7.8, 27),
      gate(-16, 10, 5.2, 66, { h: 4.5, y0: 0, spawnX: 0, vis: [-2.44, 7.32] }),
      gate(-20, 9.76, 5.2, 143.5, { h: 4.5, y0: 0, spawnX: 0, vis: [-4.88, 9.76] }),
      gate(-7, 7, 7, 177),
      gate(-5, 5, 1.5, 219, { h: 5 }),
      gate(-40, 40, 5.2, 252, { y0: 0, h: 5, spawnX: 0, vis: [-4.88, 4.88] }),
      gate(-40, 40, 0, 300, { h: 10 }),
      gate(-4.88, 4.88, 10.4, 358, { h: 5 }),
    ],
    hints: [
      hint(-22, 6, 'Two routes ahead. The <b>high line</b> is faster.'),
      hint(184, 194, 'Off the ship — hop the pontoons'),
      hint(256, 260, '← Wall-run the stack'),
      hint(306, 316, 'Climb the pyramid to finish'),
    ],
    build(b) {
      const w = b.w, L = CONT.L;
      // dock slab (the sea comes from env)
      b.box(-60, -3, -40, 60, 0, 168, { top: 'pav_light', side: 'concrete' });
      for (let z = -30; z < 165; z += 20) { b.palm(-54, 0, z, 7 + b.r(0, 2)); b.palm(54, 0, z + 10, 7 + b.r(0, 2)); }
      for (let x = -56; x <= 56; x += 8) { b.put(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 12), 'steel', x + 3, 0.4, 166.6, 1, 1, 1); }
      b.crates(-8, 0, 30, 4); b.crates(9, 0, 44, 3); b.crates(-12, 0, 150, 4); b.crates(12, 0, 160, 3);
      for (let z = 92; z < 125; z += 6) b.cone(-7.2, 0, z);
      b.stringLights(-8.44, 6.4, 94, 7.32, 6.8, 94, { color: '#ffb86a' });
      b.stringLights(-8.44, 6.4, 118, 7.32, 6.8, 118, { color: '#ffb86a' });
      b.bunting(-2.44, 9.5, 24.5, -2.44, 9.2, 36, { n: 12, sag: 0.6 });
      b.awning(-1.0, 86, 2.44, 89, 1.0, 'canvas_yellow');
      for (let x = -58; x <= 58; x += 6) b.box(x - 0.3, 0, 167.2, x + 0.3, 0.6, 167.8, 'hazard');
      // start warehouse
      b.building(-12, -22, 12, 6, 8, 'metal', '', { roof: 'metal' });
      b.box(-12, 8, -22, 12, 8.3, -21.7, 'metal');
      b.vent(-8, 8, -18); b.vent(8, 8, -12);
      // S1..S3 container lane
      b.stack(-2.44, 9, true, 2, 2, ['c_red', 'c_blue']);
      b.stack(-2.44, 24, true, 2, 3, ['c_orange', 'c_teal', 'c_white']);
      b.stack(-2.44, 40, true, 2, 2, ['c_green', 'c_grey']);
      // W1 wall-run wall (3 high) and S5 landing
      b.stack(-4.88, 46, true, 1, 3, ['c_blue', 'c_red', 'c_yellow'], 2);
      b.arrow(-2.42, 6.4, 56, 5, 1.2, Math.PI / 2, '#ff2e88');
      b.stack(-2.44, 62.2, true, 3, 2, ['c_white', 'c_orange', 'c_teal']);
      // high line: a 2.44m-wide container row straight to C2
      b.stack(2.44, 76, true, 1, 2, ['c_teal', 'c_grey', 'c_blue', 'c_red'], 5);
      b.stack(4.88, 76, true, 2, 3, ['c_white', 'c_orange', 'c_grey'], 5);
      b.light(3.66, 5.35, 136.9, '#b6ff3b', 1.2);
      b.light(3.66, 5.35, 76.1, '#b6ff3b', 1.2);
      // ground corridor (x -8.44..2.44): drop, climb-over, slide, weave
      b.stack(-8.44, 76, true, 1, 2, ['c_green', 'c_orange'], 5);
      b.box(-6, 0, 90, 2.44, 1.0, 91.2, 'wood');
      b.box(-6, 0, 100, 2.44, 4.2, 102.44, 'wood', { shade: [0.75, 1] });
      b.box(-6, 4.2, 100.3, 2.44, 4.22, 102.1, 'hazard', { collide: false });
      b.box(-6, 0, 106.5, 2.44, 2.6, 108.94, 'c_red', { shade: [0.75, 1] });
      b.duct(-6, 1.0, 114, 2.44, 1.6, 114.8);
      b.box(-6, 0, 121, -2.5, 1.2, 122.2, 'wood'); b.box(-0.5, 0, 121, 2.44, 1.2, 122.2, 'wood');
      b.sign(-1.8, 3.6, 114.9, 6, 1.4, 'LOW CLEARANCE', '#ffb020', Math.PI, { font: 'bold 110px Anton, Impact, sans-serif' });
      // climb out: C1 (1 high), C2 (2 high, wide), C3 (3 high)
      b.stack(-4.88, 128, true, 3, 1, ['c_blue', 'c_red', 'c_white']);
      b.stack(-4.88, 140.2, true, 6, 2, ['c_orange', 'c_teal', 'c_grey']);
      b.stack(-2.44, 152.4, true, 2, 3, ['c_red', 'c_yellow', 'c_blue']);
      // the ship
      b.box(-40, -1.2, 170.6, 40, 7, 194, { side: 'hull', top: 'deck' }, { surface: 'metal' });
      b.box(-40, 0.5, 170.5, 40, 1.2, 194.1, 'hull_red', { collide: false });
      b.building(22, 174, 36, 192, 19, 'fac_dark', '', { base: 7 });
      b.box(26, 19, 180, 32, 22, 186, 'white');
      b.antenna(29, 22, 183, 6);
      b.stack(-36, 173, false, 2, 2, ['c_red', 'c_blue', 'c_white'], 2);
      b.container(-30, 7, 186, false, 'c_orange'); b.container(-14, 7, 187, false, 'c_teal');
      b.sign(0, 12.5, 193.9, 20, 4, 'ORIENT LINE', '#27e8ff', Math.PI);
      // cranes
      for (const cx of [-24, 18]) {
        b.lattice(cx - 1.2, 0, 150, cx + 1.2, 34, 152.4, 'beam_yellow', 'y', 3);
        b.lattice(cx - 1.2, 0, 160, cx + 1.2, 34, 162.4, 'beam_yellow', 'y', 3);
        b.lattice(cx - 1, 34, 140, cx + 1, 36, 200, 'beam_yellow', 'z', 3);
        b.light(cx, 36.5, 200, '#ff3030', 1.5, true);
      }
      // yard dressing
      b.building(-44, 20, -16, 80, 11, 'metal', '', { roof: 'metal' });
      b.sign(-15.9, 8, 50, 16, 4, 'DOCK 9', '#ff2e88', Math.PI / 2);
      b.building(16, 0, 44, 60, 13, 'metal', '', { roof: 'metal' });
      b.sign(15.9, 9, 30, 18, 4, 'NIGHT FREIGHT', '#b6ff3b', -Math.PI / 2);
      // side warehouses seal the yard so the two routes are the only routes
      b.building(10, 62, 44, 140, 12, 'metal', '', { roof: 'metal' });
      b.sign(9.9, 9, 100, 18, 4, 'RUNOFF FREIGHT', '#27e8ff', -Math.PI / 2);
      b.building(-44, 80, -8.44, 127, 10, 'metal', '', { roof: 'metal' });
      const cols = ['c_red', 'c_blue', 'c_green', 'c_orange', 'c_white', 'c_teal', 'c_grey', 'c_yellow'];
      for (let i = 0; i < 6; i++) b.stack(-40 + i * 4.3, 130, true, 1, 1 + (i % 3), [b.pick(cols), b.pick(cols)], 3);
      for (let i = 0; i < 5; i++) b.stack(14 + i * 4.3, 142, true, 1, 1 + ((i * 2) % 3), [b.pick(cols), b.pick(cols)], 2);
      for (const [x, z] of [[-10, 0], [10, 20], [-10, 40], [-10, 150], [12, 150], [8, 70]]) b.lamp(x, 0, z, 8);
      for (const [x, z] of [[-6, 164], [6, 164]]) b.lamp(x, 0, z, 6, '#9fd8ff');
      // pontoons to the second terminal
      for (const [z0, z1] of [[198, 210], [213, 225]]) {
        b.box(-5, -1.2, z0, 5, 1.5, z1, { top: 'deck', side: 'hull_red' }, { surface: 'metal' });
        for (const x of [-4.6, 4.6]) b.put(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 10), 'steel', x, 1.8, (z0 + z1) / 2, 1, 1, 1);
      }
      b.lamp(-5.5, 1.5, 211.5, 5, '#9fd8ff'); b.lamp(5.5, 1.5, 211.5, 5, '#9fd8ff');
      // terminal two
      b.box(-60, -3, 230, 60, 0, 380, { top: 'pav_light', side: 'concrete' });
      for (let x = -58; x <= 58; x += 6) b.box(x - 0.3, 0, 230.2, x + 0.3, 0.6, 230.8, 'hazard');
      b.stack(-4.88, 236, true, 4, 1, ['c_green', 'c_white', 'c_blue', 'c_red']);
      b.stack(-4.88, 248.2, true, 4, 2, ['c_orange', 'c_teal']);
      b.stack(4.88, 256, true, 1, 3, ['c_red', 'c_yellow', 'c_blue'], 2);
      b.arrow(4.86, 6.4, 265, 5, 1.2, -Math.PI / 2, '#ff2e88');
      b.stack(-4.88, 270.4, true, 4, 2, ['c_white', 'c_grey']);
      // slalom on the ground
      b.box(-6, 0, 290, 6, 1.1, 291.2, 'wood');
      b.duct(-8, 1.0, 297, 8, 1.6, 297.8);
      b.box(-8, 0, 303, -1, 1.25, 304.2, 'wood'); b.box(1, 0, 303, 8, 1.25, 304.2, 'wood');
      b.dumpster(-4, 309);
      for (let z = 286; z < 312; z += 5) { b.cone(-7, 0, z); b.cone(7, 0, z + 2.5); }
      b.sign(0, 3.6, 297.9, 6, 1.4, 'LOW CLEARANCE', '#ffb020', Math.PI, { font: 'bold 110px Anton, Impact, sans-serif' });
      // the pyramid
      b.stack(-4.88, 315, true, 4, 1, ['c_blue', 'c_red', 'c_white', 'c_teal']);
      b.stack(-4.88, 327.2, true, 4, 2, ['c_orange', 'c_green']);
      b.stack(-4.88, 339.4, true, 4, 3, ['c_yellow', 'c_red', 'c_blue']);
      b.stack(-4.88, 351.6, true, 4, 4, ['c_white', 'c_teal', 'c_orange', 'c_grey']);
      b.sign(0, 13.5, 363.7, 14, 3, 'LAST STOP', '#ff2e88', Math.PI);
      // terminal dressing
      b.building(16, 236, 50, 330, 14, 'metal', '', { roof: 'metal' });
      b.sign(15.9, 10, 280, 18, 4, 'TERMINAL 2', '#b6ff3b', -Math.PI / 2);
      b.building(-50, 240, -16, 320, 12, 'metal', '', { roof: 'metal' });
      for (const [x, z] of [[-10, 240], [10, 262], [-10, 290], [10, 320], [-10, 345]]) b.lamp(x, 0, z, 8);
      for (const cx of [-26, 22]) {
        b.lattice(cx - 1.2, 0, 250, cx + 1.2, 34, 252.4, 'beam_yellow', 'y', 3);
        b.lattice(cx - 1.2, 0, 262, cx + 1.2, 34, 264.4, 'beam_yellow', 'y', 3);
        b.lattice(cx - 1, 34, 236, cx + 1, 36, 300, 'beam_yellow', 'z', 3);
      }
      // far shores
      b.backdrop({ x0: -500, x1: 500, z0: 440, z1: 640, cell: 36, hMin: 15, hMax: 90, roofDeco: false, fill: 0.7 });
      b.backdrop({ x0: -300, x1: 300, z0: -260, z1: -60, cell: 30, hMin: 10, hMax: 40, fill: 0.6 });
    },
  },

  {
    id: 'skeleton',
    name: 'Skeleton',
    tagline: 'Tower site, high noon',
    blurb: 'A vertical course. Climb, wall-climb, and balance on beams.',
    theme: 'day',
    unlock: 3,
    medals: [54, 44, 38.5, 34],
    spawn: { x: 0, y: 0, z: -14, yaw: 0 },
    killY: -5,
    env: { birds: [0, 30, 80] },
    isDead: (p, cp) => cp >= 1 && p.y < 1,
    checkpoints: [
      gate(-6, 6, 5, 24),
      gate(-6, 6, 5, 55),
      gate(-6, 6, 10, 80),
      gate(-6, 6, 14.2, 116),
      gate(-6, 6, 18.4, 155),
      gate(-6, 6, 18.4, 180),
      gate(-6, 6, 22.2, 216),
      gate(-1.2, 1.2, 24.7, 250),
      gate(-3, 3, 24.7, 279, { h: 5 }),
    ],
    hints: [
      hint(-20, 2, 'Up is the only way. Climb onto the site cabin.'),
      hint(84, 86, 'Jump <b>into</b> the wall and keep holding forward'),
      hint(96, 99, 'Walk the beam. Don\'t look down.'),
      hint(126, 137, '<b>Slide</b> then jump to clear the gap'),
      hint(180, 188, '← Wall-run the core'),
      hint(226, 238, 'Out onto the crane jib. Twenty-five metres. No net.'),
    ],
    build(b) {
      const w = b.w;
      b.box(-80, -2, -60, 80, 0, 320, { top: 'dirt', side: 'dirt' });
      b.street(-0.02);
      // fence
      for (let z = -40; z < 300; z += 4) { b.box(-30, 0, z, -29.9, 2.2, z + 3.9, 'steel', { collide: false }); b.box(29.9, 0, z, 30, 2.2, z + 3.9, 'steel', { collide: false }); }
      // start: pallets, site cabin
      b.box(-3, 0, -3, 3, 1.0, -1.8, 'wood');
      b.box(-4, 0, 2, 4, 2.6, 8, { side: 'c_white', top: 'metal' }, { shade: [0.7, 1] });
      b.sign(0, 2.0, 8.01, 4, 0.8, 'SITE OFFICE', '#1b1f2a', 0, { glow: false, bg: '#f5c518' });
      // scaffold platform + bridge
      b.plankDeck(-4, 10, 4, 20, 5.0);
      b.scaffold(-4, 10, 4, 20, 0, 6.5);
      b.plankDeck(-1.2, 20, 1.2, 22, 5.0);
      // p3 slab with low beam + crates
      b.slab(-6, 22, 6, 40, 5.0);
      b.ibeam(-6, 29.8, 6, 30.2, 6.6);
      b.box(-6, 5.95, 29.8, -5.6, 6.6, 30.2, 'beam'); b.box(5.6, 5.95, 29.8, 6, 6.6, 30.2, 'beam');
      b.box(-6, 6.15, 29.85, 6, 6.2, 30.15, 'beam', { invisible: true });
      b.box(-6, 5, 35, 6, 6.0, 35.6, 'wood');
      for (const s of [-1, 1]) b.box(s * 6 - (s > 0 ? 0.15 : 0), 5, 22, s * 6 + (s > 0 ? 0 : 0.15), 6.0, 40, 'hazard');
      // p4 wall-run core
      b.box(6, 0, 38, 9, 16, 54, 'concrete', { shade: [0.6, 1] });
      b.arrow(5.94, 6.6, 45, 4, 1, -Math.PI / 2, '#ff5a1f');
      // p5
      b.slab(-6, 50, 6, 62, 5.0);
      // p6, p7
      b.slab(-6, 62, 6, 74, 7.5);
      b.box(-6, 5, 62, 6, 7.15, 62.4, 'concrete');
      b.slab(-6, 74, 6, 86, 10);
      b.box(-6, 7.5, 74, 6, 9.65, 74.4, 'concrete');
      // p8 wall-climb
      b.box(-6, 10, 86, 6, 14.2, 88, 'concrete', { shade: [0.8, 1] });
      b.slab(-6, 88, 6, 98, 14.2, 0.35, false);
      for (const cx of [-5.8, 5.8]) b.column(cx, 97.8, 0, 13.85);
      // p9 beams
      b.ibeam(-0.25, 98, 0.25, 112, 14.2);
      b.ibeam(3.25, 98, 3.75, 112, 14.2, 'beam_yellow');
      b.ibeam(-4.25, 98, -3.75, 112, 14.2, 'beam_yellow');
      for (const x of [-4, 0, 3.5]) b.column(x, 105, 0, 13.75, 0.18, 'steel');
      // safety net under the beams: fall in and it throws you back up
      b.awning(-6, 98.6, 6, 111.4, 11.0, 'canvas_green', false);
      for (const [x, z] of [[-6, 98.6], [6, 98.6], [-6, 111.4], [6, 111.4]]) b.put(new THREE.CylinderGeometry(0.05, 0.05, 11, 6), 'steel', x, 5.5, z, 1, 1, 1);
      // p10
      b.slab(-6, 112, 6, 124, 14.2);
      // p11 wall-climb up to 18.4
      b.box(-6, 14.2, 124, 6, 18.4, 126, 'concrete', { shade: [0.8, 1] });
      b.slab(-6, 126, 6, 137, 18.4, 0.35, false);
      for (const cx of [-5.8, 5.8]) b.column(cx, 136.8, 0, 18.05);
      // p12
      b.slab(-6, 143.5, 6, 162, 18.4);
      for (const s of [-1, 1]) b.box(s * 6 - (s > 0 ? 0.15 : 0), 18.4, 143.5, s * 6 + (s > 0 ? 0 : 0.15), 19.4, 162, 'hazard');
      // p13 beams, p14
      b.ibeam(-0.25, 162, 0.25, 176, 18.4);
      b.ibeam(-3.75, 162, -3.25, 176, 18.4, 'beam_yellow');
      for (const x of [-3.5, 0]) b.column(x, 169, 0, 17.95, 0.18, 'steel');
      b.slab(-6, 176, 6, 188, 18.4);
      // core wall for the wall-run, p15
      b.box(6, 0, 186, 9, 30, 204, 'concrete', { shade: [0.6, 1] });
      b.arrow(5.94, 19.6, 193, 4, 1, -Math.PI / 2, '#ff5a1f');
      b.slab(-6, 198, 6, 210, 18.0);
      // p16 wall-climb, p17 climb
      b.box(-6, 18, 210, 6, 22.2, 212, 'concrete', { shade: [0.8, 1] });
      b.slab(-6, 212, 6, 224, 22.2, 0.35, false);
      for (const cx of [-5.8, 5.8]) b.column(cx, 223.8, 0, 21.85);
      b.box(-6, 22.2, 224, 6, 24.35, 224.4, 'concrete');
      b.slab(-6, 224, 6, 236, 24.7);
      // the crane jib out to the cab
      b.lattice(-1, 22.6, 239, 1, 24.3, 275, 'beam_yellow', 'z', 2);
      b.box(-1, 24.3, 239, 1, 24.7, 275, { top: 'metal', side: 'beam_yellow' });
      b.railing(-1.05, 239, -1.05, 275, 24.7, 1.0, { collide: false, mat: 'beam_yellow' });
      b.lattice(8.8, 0, 256, 11.2, 24.3, 258.4, 'beam_yellow', 'y', 2.4);
      b.box(1, 22.6, 255.5, 11.2, 24.3, 259, 'beam_yellow', { collide: false });
      b.box(-3, 20.5, 275, 3, 24.7, 283, { side: 'c_yellow', top: 'metal' });
      b.box(-2.5, 24.7, 279.5, 2.5, 27.2, 282.8, { side: 'glass', top: 'metal' });
      b.sign(0, 29, 282.7, 10, 2.4, 'TOPPED OUT', '#ff5a1f', Math.PI, { glow: false, bg: '#1b1f2a' });
      // tower crane
      b.lattice(12, 0, 120, 14.4, 40, 122.4, 'beam_yellow', 'y', 2.4);
      b.lattice(-30, 40, 120.2, 30, 42, 122.2, 'beam_yellow', 'x', 3);
      b.box(11.6, 38, 118, 14.8, 41, 124.4, { side: 'beam_yellow', top: 'metal' }, { collide: false });
      b.box(-20, 42, 120.4, -12, 44, 122, 'concrete', { collide: false });
      // rebar + clutter
      for (let i = 0; i < 40; i++) {
        const z = b.r(22, 160), x = b.r(-5.5, 5.5);
        const y = z < 40 ? 5 : z < 62 ? 5 : z < 74 ? 7.5 : z < 86 ? 10 : z < 98 ? 14.2 : z < 124 ? 14.2 : 18.4;
        if (z > 98 && z < 112) continue;
        if (z > 137 && z < 144) continue;
        b.box(x - 0.02, y, z - 0.02, x + 0.02, y + b.r(0.3, 0.9), z + 0.02, 'steel', { collide: false });
      }
      // site dressing
      for (const [x, z, c] of [[-14, -8, 'c_blue'], [-12.6, -8, 'c_orange'], [-11.2, -8, 'c_green']]) b.box(x - 0.6, 0, z - 0.6, x + 0.6, 2.3, z + 0.6, c, { shade: [0.8, 1] });
      b.crates(12, 0, 4, 4); b.crates(-12, 0, 30, 3); b.crates(14, 0, 60, 4);
      b.put(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 16), 'c_orange', 16, 1.6, 20, 1, 1, 1, 0.5, 0, 0);
      for (let z = -10; z < 20; z += 4) b.cone(-6, 0, z);
      b.bunting(13.2, 38, 121.2, -6, 18.4, 136, { n: 20, sag: 2 });
      for (const [x, z] of [[-22, -20], [22, -20], [-24, 40], [24, 70], [-26, 110], [26, 150], [-24, 175]]) b.tree(x, 0, z, 1.1);
      // neighbouring finished towers + skyline
      b.building(-40, 30, -22, 70, 46, 'fac_office', '', {});
      b.building(22, -10, 44, 30, 34, 'fac_grey', '', {});
      b.building(24, 150, 50, 190, 58, 'fac_office', '', {});
      b.building(-44, 200, -22, 250, 50, 'fac_grey', '', {});
      b.building(24, 270, 48, 310, 40, 'fac_sky', '', {});
      b.backdrop({ x0: -400, x1: 400, z0: -300, z1: 600, cell: 45, hMin: 18, hMax: 80, fill: 0.55, avoid: [[-80, -60, 80, 320]], roofDeco: false });
    },
  },

  {
    id: 'park',
    name: 'Concrete Park',
    tagline: 'Terraces by the river, golden afternoon',
    blurb: 'Stair sets, a skate bowl, a bridge walkway and a roof you can flip off.',
    theme: 'day',
    unlock: 5,
    medals: [58, 47, 41, 36],
    spawn: { x: 0, y: 6, z: -8, yaw: 0 },
    killY: -1.4,
    env: { water: { y: -1.5 }, birds: [0, 20, 150], hills: { radius: 1400, height: [40, 110] } },
    checkpoints: [
      gate(-12, 12, 3, 18),
      gate(-12, 12, 3, 42),
      gate(-16, 16, 1.5, 108, { y0: 0, h: 9, vis: [-8, 8] }),
      gate(-10, 10, 0, 152),
      gate(-3, 3, 3, 185),
      gate(-14, 14, 3, 245),
      gate(-2, 2, 7.5, 275),
      gate(-12, 12, 1.5, 330, { h: 6 }),
    ],
    hints: [
      hint(-14, 2, 'Concrete Park — there is more than one line'),
      hint(24.5, 33, '<k>Space</k> — jump the alley'),
      hint(39, 44, 'Stairs up to the bridge → or drop to the alley below'),
      hint(84, 101, 'Flip off the roof — <k>E</k> in the air'),
      hint(153, 158, 'Over the river'),
      hint(250, 256, 'Up the big stair set'),
    ],
    build(b) {
      // ground + river edge
      b.box(-70, -3, -45, 70, 0, 158, { top: 'pav_light', side: 'conc' });
      b.meshRail(-70, 157.8, 70, 157.8, 0);
      for (let x = -60; x <= 60; x += 12) if (Math.abs(x) > 5) b.lamp(x, 0, 156.6, 5, '#ffe3b0');

      // T1 — start terrace with the bowl
      b.terrace(-9, -12, 9, 10, 6, 'pav_light');
      b.terrace(-24, -12, -9, -9, 6); b.terrace(-24, 5, -9, 10, 6); b.terrace(-24, -9, -19, 5, 6);
      b.bowl(-19, -9, -9, 5, 6, 1.8);
      b.concPlanter(5, -11, 8.6, -6.5, 6); b.concPlanter(5, 1.5, 8.6, 6, 6);
      b.concPlanter(-23.5, 6, -20, 9.6, 6);
      b.bench(-7.6, 6, -2, 1); b.bench(-7.6, 6, 2.2, 1);
      b.meshRail(3.4, 9.9, 9, 9.9, 6);
      b.meshRail(8.9, -12, 8.9, 10, 6); b.meshRail(-23.9, -12, -23.9, 10, 6);
      b.vines(-24, 10.02, -9, 10.02, 6, { density: 0.8, len: [1, 3.2], out: [0, 1] });
      b.vines(9.02, -12, 9.02, 10, 6, { density: 0.6, len: [1, 3.5], out: [1, 0] });
      // concrete block behind the start + fire escape
      b.building(-12, -28, 8, -12, 15, 'fac_conc', '', { roof: 'pav_light', trim: 'conc' });
      b.fireEscape(8, -24, 0, 15, 1);
      b.housing(-8, -26, -2, -20, 15, 3, 'fac_conc2');

      // stairs T1 -> T2
      b.stairs(-3, 3, 14.5, 3, 10, { rise: 0.3, run: 0.45, dir: -1 });

      // T2 — planted terrace
      b.terrace(-12, 10, 12, 34, 3, 'pav_warm');
      b.concPlanter(-3, 23, 3, 24.2, 3, 0.9, { tree: false });
      b.concPlanter(-11.4, 15, -7, 21, 3); b.concPlanter(7, 25, 11.4, 31, 3);
      b.bench(9.5, 3, 16, 1); b.bench(-9.5, 3, 28, 1);
      b.meshRail(-11.9, 10, -11.9, 34, 3); b.meshRail(11.9, 10, 11.9, 34, 3);
      b.vines(-12, 34.02, 12, 34.02, 3, { density: 0.7, len: [0.6, 2.4], out: [0, 1] });

      // the alley (z 34..39) — fences at each end, dumpsters
      b.meshRail(-40, 34.3, -12.5, 34.3, 0, 2.2); b.meshRail(12.5, 34.3, 40, 34.3, 0, 2.2);
      b.dumpster(-8, 36.5); b.dumpster(8.5, 36.4); b.crates(-3, 0, 36.6, 2);

      // T3 — terrace, concrete block, stair up to the bridge
      b.terrace(-12, 39, 12, 64, 3, 'pav_light');
      b.building(-12, 46, -4, 60, 10, 'fac_conc2', '', { roof: 'pav_light', trim: 'conc' });
      b.concPlanter(-11.4, 61, -6.5, 63.6, 3);
      b.stairs(4.5, 7.5, 44, 3, 15, { rise: 0.3, run: 0.3, dir: 1 });
      b.box(4, 3, 48.5, 8, 7.5, 51.2, { top: 'pav_light', side: 'conc' });
      b.walkway(4, 8, 51.2, 82, 7.5);
      b.meshRail(11.9, 39, 11.9, 64, 3);
      b.vines(4, 51.2, 4, 82, 7.05, { density: 0.35, len: [0.8, 2.5], out: [-1, 0] });

      // low route: alley street between the brick blocks
      b.building(-34, 64, -12, 104, 12, 'fac_redbrick', '', { roof: 'roof' });
      b.fireEscape(-12, 70, 0, 12, 1); b.fireEscape(-12, 88, 0, 12, 1);
      b.meshRail(-12, 74, -4, 74, 0, 1.05);
      b.dumpster(-9.5, 84, 1); b.crates(-8, 0, 91, 3);
      b.meshRail(-2, 96, 2, 96, 0, 1.05);
      for (const z of [70, 80, 90]) b.cone(0.8, 0, z);

      // B2 — brick roof, scaffolding down to the plaza
      b.building(2, 82, 16, 102, 7.5, 'fac_redbrick', '', { roof: 'roof' });
      b.ac(12.5, 7.5, 86); b.ac(12.5, 7.5, 92); b.vent(14.5, 7.5, 97); b.housing(10.5, 97, 15.2, 101.2, 7.5, 2.6, 'fac_conc');
      b.meshRail(2.2, 82, 2.2, 102, 7.5);
      b.plankDeck(2, 102, 16, 104.2, 5.0);
      b.plankDeck(2, 104.2, 16, 106.4, 2.8);
      b.scaffold(2, 102, 16, 106.4, 0, 6.6);

      // plaza
      b.terrace(-16, 104, 16, 142.5, 1.5, 'pav_light');
      b.stairs(-10, -5, 101.5, 0, 5, { rise: 0.3, run: 0.5, dir: 1 });
      b.concPlanter(-15.4, 110, -11, 117, 1.5); b.concPlanter(11, 119, 15.4, 126, 1.5);
      b.concPlanter(-3, 124, 3, 125.4, 1.5, 0.9, { tree: false });
      b.concPlanter(-15.4, 130, -11, 137, 1.5);
      b.bench(9, 1.5, 112, 0); b.bench(-9, 1.5, 128, 0); b.bench(9, 1.5, 134, 0);
      for (const [x, z] of [[-6, 118], [6, 138], [-6, 138]]) b.lamp(x, 1.5, z, 5, '#ffe3b0');
      b.stairs(-8, 8, 145, 0, 5, { rise: 0.3, run: 0.5, dir: -1 });

      // promenade
      for (const x of [-30, -18, 18, 30]) b.tree(x, 0, 150, 1.2);
      b.bench(-14, 0, 155, 0); b.bench(14, 0, 155, 0);
      // footbridge over the river
      b.stairs(-3, 3, 153, 0, 10, { rise: 0.3, run: 0.45, dir: 1 });
      b.walkway(-3, 3, 157.5, 210, 3, { columns: 12 });
      b.bench(0, 3, 170, 0); b.bench(-1.2, 3, 196, 0);
      b.box(-3, 5.35, 183.6, 3, 5.9, 184.4, { side: 'conc', top: 'trim_yellow', bottom: 'conc' }, { keepBottom: true });
      for (const x of [-2.8, 2.8]) b.box(x - 0.2, 3, 183.7, x + 0.2, 5.35, 184.3, 'conc');
      // far bank
      b.box(-70, -3, 208, 70, 0, 360, { top: 'pav_light', side: 'conc' });
      b.terrace(-14, 210, 14, 232, 3, 'pav_warm');
      b.concPlanter(-13, 214, -8.5, 221, 3); b.concPlanter(8.5, 222, 13, 229, 3);
      b.concPlanter(-2.5, 222, 2.5, 223.2, 3, 0.9, { tree: false });
      b.meshRail(-13.9, 210, -13.9, 232, 3); b.meshRail(13.9, 210, 13.9, 232, 3);
      b.vines(-14, 232.02, 14, 232.02, 3, { density: 0.7, len: [0.6, 2.4], out: [0, 1] });
      b.terrace(-14, 237, 14, 256, 3, 'pav_light');
      b.building(-14, 240, -5, 254, 11, 'fac_conc', '', { roof: 'pav_light', trim: 'conc' });
      b.concPlanter(6, 241, 13, 246, 3);
      b.stairs(-2.5, 2.5, 256, 3, 15, { rise: 0.3, run: 0.35, dir: 1 });
      b.walkway(-2.5, 2.5, 261.25, 290, 7.5);
      b.vines(-2.5, 261.25, -2.5, 290, 7.05, { density: 0.35, len: [0.8, 2.5], out: [-1, 0] });
      b.building(-8, 290, 10, 310, 7.5, 'fac_redbrick', '', { roof: 'roof' });
      b.ac(6.5, 7.5, 296); b.ac(6.5, 7.5, 303); b.vent(-6, 7.5, 300);
      b.plankDeck(-8, 310, 10, 312.2, 5.0);
      b.plankDeck(-8, 312.2, 10, 314.4, 2.8);
      b.scaffold(-8, 310, 10, 314.4, 0, 6.6);
      b.terrace(-14, 312, 14, 345, 1.5, 'pav_lav');
      b.concPlanter(-13.4, 318, -9, 325, 1.5); b.concPlanter(9, 330, 13.4, 337, 1.5);
      b.bunting(-10, 6.5, 330, 10, 6.5, 330, { n: 16, sag: 0.7 });
      for (const [x, z] of [[-6, 322], [6, 338]]) b.lamp(x, 1.5, z, 5, '#ffe3b0');
      b.building(-44, 214, -18, 260, 20, 'fac_redbrick', '', {});
      b.building(18, 214, 44, 250, 26, 'fac_conc2', '', { roof: 'pav_light', trim: 'conc' });
      b.building(18, 262, 40, 300, 18, 'fac_brick2', '', {});
      b.fireEscape(18, 268, 0, 15, -1);

      // surrounding blocks
      b.building(18, -30, 40, 20, 22, 'fac_conc', '', { roof: 'pav_light', trim: 'conc' });
      b.building(18, 30, 36, 64, 16, 'fac_redbrick', '', {});
      b.building(22, 104, 44, 140, 26, 'fac_conc2', '', { roof: 'pav_light', trim: 'conc' });
      b.building(-48, 108, -24, 140, 20, 'fac_brick2', '', {});
      b.building(-48, -30, -28, 40, 18, 'fac_redbrick', '', {});
      b.fireEscape(18, 36, 0, 15, -1);
      b.backdrop({ x0: -200, x1: 200, z0: -220, z1: -40, cell: 30, hMin: 14, hMax: 50, fill: 0.7 });
      b.backdrop({ x0: -500, x1: 500, z0: 400, z1: 700, cell: 34, hMin: 20, hMax: 110, fill: 0.75, roofDeco: false, facades: ['fac_conc', 'fac_conc2', 'fac_office', 'fac_grey', 'fac_redbrick', 'fac_brick2'] });
      b.backdrop({ x0: -300, x1: -50, z0: 210, z1: 400, cell: 34, hMin: 14, hMax: 60, fill: 0.7, roofDeco: false });
      b.backdrop({ x0: 50, x1: 300, z0: 210, z1: 400, cell: 34, hMin: 14, hMax: 60, fill: 0.7, roofDeco: false });
      // distant road bridge downriver
      b.box(-900, 16, 150, -300, 17.2, 214, { top: 'asphalt', side: 'conc', bottom: 'conc' }, { collide: false, keepBottom: true });
    },
  },

  {
    id: 'oldtown',
    name: 'Old Town',
    tagline: 'Lantern quarter in the haze',
    blurb: 'A long run over tiled roofs, a canal bridge, a market and the temple.',
    theme: 'haze',
    unlock: 7,
    medals: [60, 49, 42, 37],
    spawn: { x: 0, y: 12, z: -6, yaw: 0 },
    killY: -0.8,
    isDead: (p) => p.y < 1,
    env: { water: { y: -1.2 }, birds: [0, 30, 160], hills: { radius: 650, count: 18, height: [140, 320] }, clouds: 18 },
    checkpoints: [
      gate(-7, 7, 12.6, 22, { y0: 9.5, h: 4 }),
      gate(-15, 15, 2, 52, { h: 12 }),
      gate(-8, 8, 8, 116),
      gate(-6, 6, 10.4, 147, { y0: 7.5, h: 4 }),
      gate(-5, 5, 3, 200),
      gate(-12, 12, 3, 232),
      gate(-6, 6, 10.5, 264),
      gate(-12, 12, 3, 322, { h: 6 }),
    ],
    hints: [
      hint(-12, 12, 'Old Town — roofs are ramps: run up and over the ridges'),
      hint(44, 50, 'Big drop — flip it or roll it'),
      hint(155, 163, '← Wall-run the tall block to cross the lanes'),
      hint(236, 249, 'Climb the scaffold tower'),
    ],
    build(b) {
      // streets (with the canal cut out) — falling into the street means a respawn
      b.box(-90, -3, -60, 90, 0, 186, { top: 'pav_warm', side: 'stone' });
      b.box(-90, -3, 218, 90, 0, 420, { top: 'pav_warm', side: 'stone' });
      for (const z of [186, 218]) b.box(-90, -3, z - 1, 90, 0.6, z + 1, { top: 'stone', side: 'stone' }, { collide: false });

      // S0 — modern block with posters + scaffolding
      b.building(-6, -12, 6, 12, 12, 'fac_conc2', '', { roof: 'pav_light', trim: 'trim_green' });
      b.poster(6.03, 8, -4, 3, 4.2, Math.PI / 2, 0); b.poster(-6.03, 7, 2, 3, 4.2, -Math.PI / 2, 1); b.poster(0, 9, -12.03, 4, 5, Math.PI, 2);
      b.scaffold(-8.4, -10, -6, 10, 0, 13.5);
      b.put(new THREE.CylinderGeometry(1.3, 1.3, 2.6, 18), 'metal', -3.4, 13.9, -8.5, 1, 1, 1);
      b.w.col.add(-4.7, 12, -9.8, -2.1, 15.2, -7.2, 'metal');
      b.meshRail(-5.9, -12, -5.9, 12, 12); b.meshRail(5.9, -12, 5.9, 12, 12);

      // S1, S2 — timber houses, run up and over
      b.house(-7, 15, 7, 29, 10, 2.6, 'x', 'fac_shoji', 'tile_roof');
      b.house(-6, 32, 6, 44, 8.5, 2.4, 'x', 'fac_shoji2', 'tile_roof');
      b.lanternLine(-7, 11.5, 30.5, 6, 11, 30.5, { n: 6 });

      // S3 — clay courtyard behind stone walls, boulders, stone lanterns
      b.box(-15, 0, 48, 15, 2, 77, { top: 'clay', side: 'stone' });
      b.rock(-6, 2, 58, 1.3); b.rock(5.5, 2, 63, 1.0); b.rock(0.5, 2, 67, 0.75); b.rock(-9, 2, 71, 1.1);
      for (const [x, z] of [[-13, 50], [13, 50], [-13, 75], [9, 75]]) b.stoneLantern(x, 2, z);
      b.tree(-12.5, 2, 62, 1.1); b.tree(11.5, 2, 70, 0.9);
      // main hall on the right: stone base, timber body, tiered roofs
      b.box(15, 0, 40, 42, 6, 126, { side: 'stone', top: 'pav_warm' });
      b.house(17, 44, 40, 122, 16, 4, 'z', 'fac_shoji3', 'tile_roof', { base: 6 });
      b.house(22, 60, 35, 106, 24, 3.5, 'z', 'fac_shoji', 'tile_roof', { base: 20, walk: false });
      for (let z = 50; z < 120; z += 8) b.lantern(15.9, 14.2, z, 'lantern_red', 1.2);

      // S4 — stone stairs up to the terrace
      b.stairs(-4, 4, 77, 2, 10, { rise: 0.3, run: 0.3, dir: 1, rails: false });
      b.box(-15, 0, 77, -4.35, 5, 80, { side: 'stone', top: 'pav_warm' }); b.box(4.35, 0, 77, 15, 5, 80, { side: 'stone', top: 'pav_warm' });
      b.box(-15, 0, 80, 15, 5, 96, { top: 'pav_warm', side: 'stone' });
      for (const x of [-12, 9]) { b.lantern(x, 7.8, 88, 'lantern_warm', 1); b.put(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), 'timber', x, 6.3, 88, 1, 1, 1); }
      b.house(-15, 84, -8.5, 94, 8, 1.8, 'z', 'fac_shoji2', 'tile_roof3');
      b.house(8.5, 84, 15, 94, 8, 1.8, 'z', 'fac_shoji', 'tile_roof3');

      // S5 — H3, S6 — shrine platform
      b.house(-7, 96, 5, 107, 7.5, 2.2, 'x', 'fac_shoji3', 'tile_roof2');
      b.box(-8, 0, 110, 8, 8, 126, { top: 'pav_light', side: 'stone' });
      b.torii(0, 8, 118, 6, 4.2);
      b.stoneLantern(-6.5, 8, 113); b.stoneLantern(6.5, 8, 113);

      // S7 — lantern lane: roof roller-coaster, then the wall-run
      b.house(-6, 129, 6, 139, 7, 2, 'x', 'fac_shoji', 'tile_roof');
      b.house(-6, 142, 6, 152, 8, 2.4, 'x', 'fac_shoji2', 'tile_roof3');
      b.house(-6, 155, 4, 163, 6.5, 2, 'x', 'fac_shoji3', 'tile_roof');
      b.building(4.5, 156, 10, 186, 16, 'fac_conc', '', { roof: 'pav_light', trim: 'trim_green' });
      b.poster(4.47, 9, 168, 3, 4, -Math.PI / 2, 3); b.poster(4.47, 9, 176, 3, 4, -Math.PI / 2, 1);
      b.arrow(4.45, 8.6, 168.5, 4.5, 1.1, -Math.PI / 2, '#ffb020');
      b.house(-6, 173, 4, 185, 6.3, 2, 'x', 'fac_shoji', 'tile_roof2');
      b.lanternLine(-6, 10.5, 140.5, 6, 10.5, 140.5, { n: 6 });
      b.lanternLine(-6, 10, 153.5, 4.4, 10, 153.5, { n: 5 });
      b.lanternLine(-6, 9.5, 169, 4.4, 9.8, 169, { n: 5, sag: 1.2 });

      // S8 — stone bridge over the canal
      b.box(-5, 0.6, 186, 5, 3, 218, { top: 'pav_light', side: 'stone', bottom: 'stone' }, { keepBottom: true });
      b.box(-5, -2, 197, 5, 0.6, 207, 'stone', { collide: false });
      b.box(-5.3, 3, 186, -5, 4, 218, 'stone'); b.box(5, 3, 186, 5.3, 4, 218, 'stone');
      for (const z of [190, 202, 214]) { b.stoneLantern(-4.3, 3, z); }

      // S9 — market street with stalls and bouncy canopies
      b.box(-12, 0, 218, 12, 3, 252, { top: 'pav_warm', side: 'stone' });
      for (let z = 222; z < 246; z += 7) {
        b.house(-12, z, -8, z + 5, 5.4, 1.2, 'z', 'fac_shoji2', 'tile_roof3', { base: 3, walk: false });
        b.house(8, z, 12, z + 5, 5.4, 1.2, 'z', 'fac_shoji', 'tile_roof', { base: 3, walk: false });
        b.awning(-8, z + 0.5, -6, z + 4.5, 4.4, z % 2 ? 'canvas_red' : 'canvas_blue');
        b.awning(6, z + 0.5, 8, z + 4.5, 4.4, z % 2 ? 'canvas_green' : 'canvas_yellow');
      }
      b.crates(-3.5, 3, 238, 3); b.crates(3, 3, 226, 2);
      b.lanternLine(-8, 7.5, 229, 8, 7.5, 229, { n: 6 }); b.lanternLine(-8, 7.5, 243, 8, 7.5, 243, { n: 6 });

      // S10 — scaffold tower up to the poster block
      b.plankDeck(-4, 249, 4, 252, 5.5);
      b.plankDeck(-4, 252, 4, 255, 8.0);
      b.scaffold(-4, 249, 4, 255, 3, 9.5);
      b.building(-6, 255, 6, 277, 10.5, 'fac_conc2', '', { roof: 'pav_light', trim: 'trim_green' });
      b.poster(6.03, 6, 262, 3, 4.2, Math.PI / 2, 2); b.poster(-6.03, 6, 270, 3, 4.2, -Math.PI / 2, 0);
      b.ac(4, 10.5, 270); b.vent(-4.4, 10.5, 259);

      // S11 — the temple roof, then the finish plaza
      b.house(-9, 280, 9, 300, 9, 3.5, 'x', 'fac_shoji3', 'tile_roof2');
      b.box(-14, 0, 304, 14, 3, 342, { top: 'pav_light', side: 'stone' });
      b.torii(0, 3, 322, 11, 7);
      for (const z of [310, 330]) { b.stoneLantern(-10, 3, z); b.stoneLantern(10, 3, z); }
      b.tree(-11, 3, 338, 1.2); b.tree(11, 3, 338, 1.2);

      // the rest of the town: rows of houses, a few modern blocks with posters, a lattice tower
      const keep = [[-16, -20, 16, 345], [14, 38, 44, 128]];
      const fac = ['fac_shoji', 'fac_shoji2', 'fac_shoji3'], roofs = ['tile_roof', 'tile_roof2', 'tile_roof3'];
      for (let x = -80; x < 80; x += 13) {
        for (let z = -50; z < 400; z += 12) {
          const w = b.r(8, 11), d = b.r(8, 10.5), bx = x + b.r(0, 12 - w), bz = z + b.r(0, 11 - d);
          if (keep.some(([a0, c0, a1, c1]) => bx < a1 && bx + w > a0 && bz < c1 && bz + d > c0)) continue;
          if (bz < 218 && bz + d > 186) continue;
          if (b.rng() < 0.13) {
            b.building(bx, bz, bx + w, bz + d, b.r(14, 30), b.pick(['fac_conc', 'fac_conc2', 'fac_grey']), '', { roof: 'pav_light', trim: 'trim_green' });
            b.poster(bx + w / 2, b.r(5, 9), bz - 0.03, 3, 4, Math.PI, (b.rng() * 4) | 0);
          } else {
            b.house(bx, bz, bx + w, bz + d, b.r(4, 9), b.r(1.6, 3), b.rng() < 0.5 ? 'x' : 'z', b.pick(fac), b.pick(roofs), { walk: false });
          }
        }
      }
      for (let z = -20; z < 380; z += 36) b.lanternLine(-16, 7, z + 10, -30, 7.5, z + 10, { n: 5 });
      b.lattice(52, 0, 150, 58, 70, 156, 'beam', 'y', 4);
      b.lattice(53.5, 70, 151.5, 56.5, 84, 154.5, 'beam', 'y', 3);
      b.light(55, 85, 153, '#ff3030', 2.2, true);
      b.backdrop({ x0: -400, x1: 400, z0: 430, z1: 700, cell: 40, hMin: 30, hMax: 110, fill: 0.55, roofDeco: false, facades: ['fac_conc', 'fac_conc2', 'fac_grey', 'fac_office'] });
    },
  },

  {
    id: 'yard',
    name: 'Training Yard',
    tagline: 'The parkour yard beside the old hall',
    blurb: 'Vault garden, balance beams, wall-run lanes, the scaffold tower and the big launch.',
    theme: 'haze',
    unlock: 9,
    medals: [66, 54, 47, 41],
    spawn: { x: 0, y: 0, z: -6, yaw: 0 },
    killY: -6,
    isDead: (p) => p.y < -1.5,
    env: { birds: [0, 30, 120], hills: { radius: 650, count: 18, height: [140, 320] }, clouds: 18 },
    checkpoints: [
      gate(-14, 14, 0, 30, { h: 5 }),
      gate(-8, 8, 2.5, 66),
      gate(-8, 8, 2.5, 92),
      gate(-8, 8, 2.5, 116),
      gate(-8, 8, 2.5, 133),
      gate(-6, 6, 7.3, 149),
      gate(-8, 8, 1.5, 200, { h: 5 }),
      gate(-12, 12, 0.5, 248, { h: 6 }),
      gate(-8, 8, 2.5, 299),
      gate(-8, 8, 9.2, 321),
      gate(-8, 8, 8.2, 337),
      gate(-12, 12, 0.5, 375, { h: 6 }),
    ],
    hints: [
      hint(-12, 4, 'Training Yard — vault, run, flip. Keep the flow.'),
      hint(70, 74, 'Walk the beam — don\'t fall in the pit'),
      hint(97, 100, '← Wall-run the green panel'),
      hint(119, 122, 'Now the other side →'),
      hint(190, 195, 'Slide under the bar'),
      hint(209, 221, 'Launch off the deck — flip it!'),
      hint(252, 262, 'Pillar jumps — one full jump each'),
      hint(309, 315, 'Jump <b>into</b> the green wall to run up it'),
      hint(322, 327, '<b>Slide</b>, then jump the gap'),
    ],
    build(b) {
      const G = 'paint_green';
      // ground: the yard floor, a deep pit through the middle section, the street outside
      b.box(-14, -3, -12, 14, 0, 58, { top: 'pav_light', side: 'conc' });
      b.box(-14, -6, 58, 14, -4, 146, { top: 'clay', side: 'conc' });
      b.box(-14, -3, 146, 14, 0, 262, { top: 'pav_light', side: 'conc' });
      b.box(-14, -6, 262, 14, -4, 295, { top: 'clay', side: 'conc' });
      b.box(-14, -3, 295, 14, 0, 396, { top: 'pav_light', side: 'conc' });
      b.box(-90, -3, -60, -14, 0, 400, { top: 'pav_warm', side: 'stone' });
      b.box(14, -3, -60, 90, 0, 400, { top: 'pav_warm', side: 'stone' });
      // perimeter walls
      for (const sd of [-1, 1]) {
        const x = sd * 14;
        b.yardBlock(Math.min(x, x + sd * 0.8), -12, Math.max(x, x + sd * 0.8), 396, -6, 3.2, sd > 0 ? 'w' : 'e');
      }
      for (let z = -8; z < 392; z += 16) { if ((z > 44 && z < 150) || (z > 250 && z < 300)) continue; b.lampPost(-12.8, 0, z, 5); b.lampPost(12.8, 0, z + 8, 5); }

      // Z1 — vault garden
      const blocks = [
        [-1.6, 5, 1.6, 6.2, 1.0, 'n'], [-10, 4, -6, 7, 1.2, ''], [6, 8, 9, 11, 1.6, 'w'],
        [-2, 12, 2, 13.2, 1.1, ''], [-11, 13, -8, 17, 1.8, 'e'], [7, 16, 11, 18, 0.9, ''],
        [-1.4, 20, 1.4, 21.4, 1.2, 'n'], [-8, 24, -4, 26, 1.0, ''], [4, 25, 8, 28, 2.2, 'w'],
        [-1.8, 34, 1.8, 35.2, 0.9, ''], [-11, 36, -7, 40, 2.4, 'e'], [7, 38, 11, 41, 1.2, ''],
        [-1.5, 44, 1.5, 45.3, 1.25, 'n'], [-6, 48, -3, 51, 1.6, ''], [5, 49, 9, 52, 1.0, ''],
      ];
      for (const [x0, z0, x1, z1, h, g] of blocks) b.yardBlock(x0, z0, x1, z1, 0, h, g);
      b.wallPanel(-4.3, 28, -3.7, 33, 0, 3.4); b.wallPanel(3.7, 30, 4.3, 36, 0, 3.4);
      b.pipeRail(-12, 8, -12, 20, 0); b.pipeRail(12, 20, 12, 44, 0);

      // Z2 — ramp up, deck, balance beams over the pit, deck
      b.ramp(-4, 4, 54, 58, 0, 2.5);
      b.box(-4, -3, 54, 4, 0, 58, 'conc', { collide: false });
      b.yardBlock(-8, 58, 8, 74, -4, 2.5, 'n');
      b.pipeRail(-7.8, 58, -7.8, 74, 2.5); b.pipeRail(7.8, 58, 7.8, 74, 2.5);
      b.beam(0, 74, 86, 2.5, 0.6, -4);
      b.beam(4.5, 74, 86, 2.5, 0.45, -4);
      b.beam(-4.5, 76, 84, 2.5, 0.45, -4);
      b.yardBlock(-8, 86, 8, 100, -4, 2.5, 's');
      b.yardBlock(-7, 92, -4, 95, 2.5, 3.5, '');

      // Z3 — wall-run lanes over the pit (left panel, then right panel)
      b.wallPanel(5, 97, 5.7, 113, -4, 6.5);
      b.yardBlock(-8, 110, 8, 122, -4, 2.5, 'ns');
      b.wallPanel(-5.7, 119, -5, 135, -4, 6.5);
      b.yardBlock(-8, 132, 8, 146, -4, 2.5, 's');

      // Z4 — scaffold stair tower
      b.stairs(-2, 2, 134, 2.5, 8, { rise: 0.3, run: 0.4, dir: 1, rails: false, top: 'wood' });
      b.plankDeck(-6, 137.2, 6, 141, 4.9);
      b.stairs(-2, 2, 141, 4.9, 8, { rise: 0.3, run: 0.4, dir: 1, rails: false, top: 'wood', base: 4.7 });
      b.plankDeck(-6, 144.2, 6, 152, 7.3);
      b.scaffold(-6, 134, 6, 152, 0, 8.8);
      b.pipeRail(-6, 144.2, -6, 152, 7.3); b.pipeRail(6, 144.2, 6, 152, 7.3);
      b.yardBlock(-6, 156, 6, 166, 0, 7, 'swe');

      // Z5 — stepped tiers, slide bar, ramp to the launch deck
      b.yardBlock(-7, 170, 7, 178, 0, 4.5, 's');
      b.yardBlock(-7, 181, 7, 189, 0, 3, 'e');
      b.yardBlock(-8, 189, 8, 205, 0, 1.5, '');
      b.box(-8, 2.45, 195.6, 8, 3.0, 196.4, { side: 'conc', top: 'trim_yellow', bottom: 'conc' }, { keepBottom: true });
      for (const x of [-7.7, 7.7]) b.box(x - 0.3, 1.5, 195.7, x + 0.3, 2.45, 196.3, 'conc');
      b.ramp(-4, 4, 205, 209, 1.5, 4);
      b.yardBlock(-8, 209, 8, 221, 0, 4, 'nw');
      b.pipeRail(-7.8, 209, -7.8, 221, 4); b.pipeRail(7.8, 209, 7.8, 221, 4);
      b.wallPanel(-8, 205, -7.4, 209, 0, 5.5);

      // Z6 — clay courtyard finish beside the hall
      b.box(-14, 0, 224, 14, 0.5, 262, { top: 'clay', side: 'conc' });
      b.rock(-6, 0.5, 236, 1.3); b.rock(7, 0.5, 242, 1.0); b.tree(-10, 0.5, 254, 1.2); b.tree(10, 0.5, 230, 1.0);
      b.torii(0, 0.5, 248, 9, 6);

      // Z7 — pillar jumps over the second pit
      [1.3, 1.8, 2.3, 2.0, 2.5].forEach((h, k) => {
        const z0 = 265 + k * 6;
        b.yardBlock(-1.25, z0, 1.25, z0 + 2.5, -4, h, k % 2 ? 'n' : 's');
      });
      b.beam(-5, 266, 290, 2.2, 0.45, -4);
      // Z8 — deck, ledge climb, the green climbing wall
      b.yardBlock(-8, 295, 8, 305, 0, 2.5, 's');
      b.yardBlock(-8, 305, 8, 315, 0, 5, 's');
      b.wallPanel(-8, 315, 8, 317, 0, 9.2);
      b.yardBlock(-8, 317, 8, 327, 0, 9.2, 'e');
      b.pipeRail(-7.8, 317, -7.8, 327, 9.2); b.pipeRail(7.8, 317, 7.8, 327, 9.2);
      b.scaffold(-8, 305, -6, 327, 0, 10.5);
      // Z9 — slide-jump gap to the hurdle deck
      b.yardBlock(-8, 334, 8, 350, 0, 8.2, 'sw');
      b.pipeRail(-6, 339, 6, 339, 8.2); b.pipeRail(-6, 344.5, 6, 344.5, 8.2);
      b.pipeRail(-7.8, 334, -7.8, 350, 8.2); b.pipeRail(7.8, 334, 7.8, 350, 8.2);
      // Z10 — launch into the second courtyard, finish torii
      b.box(-14, 0, 355, 14, 0.5, 396, { top: 'clay', side: 'conc' });
      b.rock(-7, 0.5, 365, 1.2); b.rock(8, 0.5, 384, 1.4); b.tree(10, 0.5, 362, 1.1); b.tree(-10, 0.5, 388, 1.2);
      for (const [x, z] of [[-12, 370], [12, 370]]) b.stoneLantern(x, 0.5, z);
      b.torii(0, 0.5, 375, 11, 7);
      b.lanternLine(-14, 8, 380, 14, 8, 380, { n: 8 });

      // the hall and the town
      b.box(16, 0, 120, 48, 5, 280, { side: 'stone', top: 'pav_warm' });
      b.house(18, 124, 46, 276, 15, 4, 'z', 'fac_shoji3', 'tile_roof', { base: 5, walk: false });
      b.house(24, 150, 40, 250, 23, 3.5, 'z', 'fac_shoji', 'tile_roof', { base: 19, walk: false });
      for (let z = 130; z < 272; z += 9) b.lantern(17.9, 13.2, z, 'lantern_red', 1.3);
      townFill(b, [[-16, -20, 16, 400], [14, 118, 50, 282]], { z1: 460 });
      b.lattice(-52, 0, 150, -46, 70, 156, 'beam', 'y', 4);
      b.light(-49, 71, 153, '#ff3030', 2.2, true);
      b.backdrop({ x0: -400, x1: 400, z0: 480, z1: 750, cell: 40, hMin: 30, hMax: 110, fill: 0.55, roofDeco: false, facades: ['fac_conc', 'fac_conc2', 'fac_grey', 'fac_office'] });
    },
  },

  {
    id: 'depot',
    name: 'The Depot',
    tagline: 'Indoor parkour gym in an old rail depot',
    blurb: 'Box stairs, a truss bridge over the foam pit, the wall maze, the mezzanine and the tower.',
    theme: 'hall',
    unlock: 11,
    medals: [52, 43, 37.5, 33],
    spawn: { x: 0, y: 0, z: -8, yaw: 0 },
    killY: -8,
    isDead: (p) => p.y < -1,
    env: { hills: false, clouds: 14, shadow: 75 },
    checkpoints: [
      gate(-30, 30, 0, 30, { h: 4, vis: [-10, 10] }),
      gate(-6, 6, 4.8, 84),
      gate(-6, 6, 4.8, 123),
      gate(-30, 30, 0, 150, { h: 4, vis: [-10, 10] }),
      gate(-8, 8, 4.2, 190),
      gate(-6, 6, 3, 237),
      gate(-5, 5, 6.6, 276, { h: 5 }),
    ],
    hints: [
      hint(-14, 4, 'The Depot — land in the foam and you start over at the last gate'),
      hint(56, 62, 'Vault up the box stairs'),
      hint(86, 92, 'Truss bridge — or wall-run the red panel ←'),
      hint(170, 178, 'Jump <b>into</b> the red wall to run up it'),
      hint(205, 214, '<b>Slide</b>, then jump the pit'),
      hint(228, 234, 'Block hops to the tower'),
    ],
    build(b) {
      // floor (with pits cut out), mats
      b.box(-30, -1, -14, 30, 0, 92, { top: 'gym_floor', side: 'conc' });
      b.box(-30, -1, 118, 30, 0, 214, { top: 'gym_floor', side: 'conc' });
      b.box(-30, -1, 220.5, 30, 0, 232, { top: 'gym_floor', side: 'conc' });
      b.box(-30, -1, 268, 30, 0, 290, { top: 'gym_floor', side: 'conc' });
      b.box(-14, -3.6, 92, 14, -2.5, 118, 'conc'); // pit floor under the foam (collides -> dead zone)
      b.box(-30, -1, 92, -14, 0, 118, { top: 'gym_floor', side: 'conc' }); b.box(14, -1, 92, 30, 0, 118, { top: 'gym_floor', side: 'conc' });
      b.foamPit(-14, 92, 14, 118);
      b.foamPit(-30, 214, 30, 220.5);
      b.foamPit(-30, 232, 30, 268);
      for (const [x0, z0, x1, z1, m] of [[-4, 2, 4, 58, 'mat_dark'], [-4, 136, 4, 176, 'mat_red'], [-10, 272, 10, 288, 'mat_dark']]) b.box(x0, 0, z0, x1, 0.02, z1, m, { collide: false });

      // the building
      b.hall(-30, -14, 30, 290, 17, { roll: [[-6, 6, -13.95], [-6, 6, 289.95]] });
      // side mezzanines with stairs (walkable, off the racing line)
      for (const sd of [-1, 1]) {
        const xa = sd < 0 ? -30 : 22, xb = sd < 0 ? -22 : 30;
        b.w.box(xa, 4.25, 0, xb, 4.5, 280, { top: 'plywood', side: 'rail_dark', bottom: 'rail_dark' }, { keepBottom: true });
        for (let z = 4; z < 280; z += 12) b.column(sd < 0 ? -22.3 : 22.3, z, 0, 4.25, 0.15, 'rail_dark');
        b.meshRail(sd < 0 ? -22.05 : 22.05, 0, sd < 0 ? -22.05 : 22.05, 280, 4.5);
        b.stairs(sd < 0 ? -25 : 23, sd < 0 ? -23 : 25, 10, 0, 15, { rise: 0.3, run: 0.35, dir: 1, top: 'plywood' });
        for (let z = 20; z < 270; z += 22) b.plyBox(xa + 1, z, xb - 1, z + 4, 4.5, 7.5 + ((z / 22) % 2) * 1.5, (z / 22) % 3 ? '' : 'ew');
      }

      // Z1 — floor flow
      b.plyBox(-2, 6, 2, 7.4, 0, 1.0, 'n');
      b.pipeRail(-3, 12, 3, 12, 0, 1.0);
      b.plyBox(-1.6, 18, 1.6, 20, 0, 1.25, '', true);
      b.plyBox(-10, 24, -9.4, 34, 0, 3.5, 'e', true); b.plyBox(9.4, 24, 10, 34, 0, 3.5, 'w', true);
      b.plyBox(-1.2, 27, 1.2, 36, 0, 0.6);
      b.plyBox(-2, 42, 2, 44, 0, 1.2, 'ns');
      b.plyBox(-1.5, 50, 1.5, 52, 0, 1.0, 'n', true);
      for (const [x0, z0, x1, z1, h, r, c] of [[-16, 8, -12, 12, 1.5, 'e', false], [12, 14, 17, 17, 2.4, '', true], [-18, 30, -13, 33, 1.2, 'n', false], [13, 36, 16, 42, 3.0, 'w', true], [-16, 46, -12, 52, 2.0, '', true], [12, 52, 18, 55, 1.0, 'n', false]]) b.plyBox(x0, z0, x1, z1, 0, h, r, c);
      b.pipeRail(-18, 20, -12, 20, 0, 1.1); b.pipeRail(12, 26, 18, 26, 0, 1.1);

      // Z2 — box stairs up to P1
      b.plyBox(-5, 62, 5, 66, 0, 1.2, 's');
      b.plyBox(-5, 66, 5, 70, 0, 2.4, 's', true);
      b.plyBox(-5, 70, 5, 74, 0, 3.6, 's');
      b.plyBox(-5, 74, 5, 78, 0, 4.8, 's', true);
      b.plyBox(-6, 78, 6, 92, 0, 4.8, 'ew');
      b.pipeRail(-5.9, 78, -5.9, 92, 4.8);

      // Z3 — the foam pit: truss bridge, or wall-run the red panel
      b.trussBridge(0, 92, 118, 4.8, 2);
      b.plyBox(6, 93, 6.6, 117, -2.5, 8, 'ew', true);
      b.plyBox(-6, 118, 6, 130, 0, 4.8, 'n');
      b.pipeRail(-5.9, 118, -5.9, 130, 4.8); b.pipeRail(5.9, 118, 5.9, 130, 4.8);

      // Z4 — the wall maze on the floor
      b.plyBox(-14, 140, 14, 140.6, 0, 3.2, 'ns', true);
      b.plyBox(-14, 156, 14, 156.5, 0, 1.2, 'n');
      for (const sd of [-1, 1]) b.plyBox(sd * 8 - 0.3, 144, sd * 8 + 0.3, 170, 0, 3.5, sd < 0 ? 'e' : 'w', true);
      b.plyBox(-1, 162, 1, 166, 0, 1.0);
      b.plyBox(-8, 178, 8, 178.6, 0, 4.2, 's', true);

      // Z5 — mezzanine run
      b.plyBox(-8, 178.6, 8, 214, 0, 4.2, 'ew');
      b.meshRail(-7.95, 178.6, -7.95, 214, 4.2); b.meshRail(7.95, 178.6, 7.95, 214, 4.2);
      b.pipeRail(-6, 186, 6, 186, 4.2, 1.0);
      b.box(-8, 5.15, 193.6, 8, 5.7, 194.4, { side: 'rail_dark', top: 'rail_dark', bottom: 'rail_dark' }, { keepBottom: true });
      b.pipeRail(-6, 202, 6, 202, 4.2, 1.0);
      b.plyBox(-6, 220.5, 6, 232, 0, 4.2, 's', true);

      // Z6 — block hops over the long pit, the finish tower
      const hops = [[235, 3.0], [242, 1.8], [249, 3.0], [256, 4.2], [263, 5.4]];
      hops.forEach(([z, h], i) => b.plyBox(-2.5, z, 2.5, z + 4, -2.5, h, i % 2 ? 'ns' : '', i % 2 === 0));
      b.plyBox(-5, 270, 5, 282, 0, 6.6, 'sew', true);
      b.pipeRail(-4.9, 270, -4.9, 282, 6.6); b.pipeRail(4.9, 270, 4.9, 282, 6.6);
      b.sign(0, 11, 289.3, 14, 3, 'THE DEPOT', '#ff5a1f', Math.PI);

      // outside: a few buildings seen through the windows
      b.backdrop({ x0: -300, x1: 300, z0: -200, z1: 500, cell: 40, hMin: 14, hMax: 60, fill: 0.6, avoid: [[-40, -30, 40, 300]], roofDeco: false });
      b.street(-0.05);
    },
  },
];

MAPS.push(hillside(gate, hint));

export const mapById = (id) => MAPS.find((m) => m.id === id) || MAPS[0];
