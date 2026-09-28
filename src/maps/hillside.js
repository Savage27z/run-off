// A lived-in hillside estate: street entrance -> stairs -> balconies -> garden -> overlook.
// All traversal surfaces use the same collision boxes as the other courses.
export function hillside(gate, hint) {
  return {
    id: 'hillside', name: 'Hillside Estate',
    tagline: 'Courtyards above the city',
    blurb: 'Climb the neighborhood. Take the balcony cut or the garden stairs.',
    theme: 'day', unlock: 0,
    medals: [54, 45, 39, 35],
    spawn: { x: 0, y: 12, z: -6, yaw: 0 },
    killY: 5,
    env: { hills: { count: 12, height: [90, 180] }, clouds: 14, birds: [20, 20, 150] },
    checkpoints: [
      gate(-4, 4, 18, 48),
      gate(-11, 11, 18, 115, { y0: 12, spawnX: 8, vis: [5, 11] }),
      gate(-4, 4, 24, 171),
      gate(-6, 6, 24, 204),
      gate(-7, 7, 19, 237),
      gate(-7, 7, 22, 301),
    ],
    hints: [
      hint(-14, 14, 'Hillside Estate · follow the <b>ochre paint</b> through the neighborhood'),
      hint(22, 37, 'Keep your speed up the steps'),
      hint(52, 76, '<b>Left: balcony cut</b> · right: garden stairs'),
      hint(80, 88, '<k>Space</k> across the broken balcony', 17, 30, 4, 12),
      hint(174, 185, 'Low pergola — <b>slide</b> through, then jump the gap'),
      hint(210, 220, 'Garden below — tap <k>Shift</k> before landing to roll'),
      hint(258, 290, 'Vault the garden walls · the overlook is ahead'),
    ],
    build(b) {
      const paint = (x0, z0, x1, z1, y) => b.box(x0, y + 0.006, z0, x1, y + 0.018, z1, 'trim_yellow', { collide: false });
      const terrace = (x0, z0, x1, z1, y) => b.box(x0, 0, z0, x1, y, z1, { side: 'stone', top: 'pav_warm' });
      const marker = (x, y, z, text) => {
        b.box(x - 1.65, y, z, x + 1.65, y + 2.3, z + 0.25, 'trim_green');
        b.sign(x, y + 1.35, z - 0.015, 3, 0.8, text, '#f1ead8', Math.PI, { glow: false });
      };

      // Street-side arrival and a broad public staircase.
      terrace(-9, -14, 9, 28, 12);
      b.box(-3, 12, 9, 3, 13, 9.45, 'stone');
      b.stairs(-4, 4, 28, 12, 20, { rise: 0.3, run: 0.5, top: 'pav_warm' });
      marker(-6, 12, -8, 'HILLSIDE');
      for (const x of [-7, 7]) {
        b.concPlanter(x - 0.7, 15, x + 0.7, 20, 12, 0.65);
        b.bench(x, 12, 1, x < 0 ? -Math.PI / 2 : Math.PI / 2);
        b.lampPost(x, 12, 25, 4);
      }
      paint(-3.8, 24, 3.8, 24.4, 12);

      // Upper courtyard with a fountain and routes splitting around it.
      terrace(-12, 38, 12, 76, 18);
      b.box(-2.3, 18, 60, 2.3, 18.55, 64.6, 'stone');
      b.box(-1.9, 18.55, 60.4, 1.9, 18.58, 64.2, 'glass_dark', { collide: false });
      b.column(0, 62.3, 18.6, 20, 0.3, 'stone');
      b.planter(-10.8, 44, -8.6, 52, 18, 0.65, 'stone');
      b.planter(8.6, 44, 10.8, 52, 18, 0.65, 'stone');
      marker(0, 18, 72, 'BALCONY / GARDEN');
      paint(5.2, 72, 10.8, 72.4, 18);

      // Elevated balconies: a fast precision jump, with a forgiving garden below.
      terrace(5, 76, 11, 88, 18);
      terrace(5, 92, 11, 128, 18);
      for (const [z0, z1] of [[76, 88], [92, 128]]) {
        b.railing(10.85, z0, 10.85, z1, 18, 0.95, { mat: 'rail_dark' });
        b.railing(5.15, z0, 5.15, z1, 18, 0.95, { mat: 'rail_dark' });
      }
      paint(5.3, 87.3, 10.7, 87.8, 18);
      paint(5.3, 92.1, 10.7, 92.5, 18);
      b.box(5, 18, 103, 11, 19.05, 103.35, 'stone');

      // Slower route descends to a planted courtyard and climbs back up.
      terrace(-12, 76, 5, 128, 12);
      b.stairs(-8, -4, 88, 12, 20, { rise: 0.3, run: 0.6, dir: -1, top: 'pav_warm' });
      b.stairs(-8, -4, 116, 12, 20, { rise: 0.3, run: 0.6, top: 'pav_warm' });
      b.concPlanter(-1, 91, 2.5, 99, 12, 0.75);
      b.planter(-12, 96, -3, 101, 12, 1.4, 'stone');
      b.bench(-10, 12, 100, -Math.PI / 2);
      b.lampPost(-10, 12, 111, 4);

      terrace(-12, 128, 12, 152, 18);
      b.box(-3.5, 18, 139, 3.5, 19.1, 139.45, 'stone');
      b.stairs(-4, 4, 152, 18, 20, { rise: 0.3, run: 0.5, top: 'pav_warm' });

      // Roof garden: a low maintenance pergola sets up the long slide-jump.
      terrace(-10, 162, 10, 188, 24);
      for (const x of [-7, 7]) {
        b.concPlanter(x - 1, 165, x + 1, 172, 24, 0.7);
        b.box(x - 0.15, 24, 180, x + 0.15, 25.55, 180.7, 'timber');
      }
      b.box(-7.15, 24.96, 180, 7.15, 25.55, 180.7, { side: 'timber', top: 'timber', bottom: 'timber' }, { keepBottom: true });
      paint(-6, 186.8, 6, 187.4, 24);
      terrace(-8, 194, 8, 218, 24);
      paint(-6, 194.2, 6, 194.7, 24);
      b.railing(-7.85, 194, -7.85, 218, 24, 1, { mat: 'rail_dark' });
      b.railing(7.85, 194, 7.85, 218, 24, 1, { mat: 'rail_dark' });

      // Drop into the allotments, then the final staircase to the shared overlook.
      terrace(-10, 221, 10, 248, 19);
      for (const x of [-7, 7]) {
        b.planter(x - 1, 224, x + 1, 231, 19, 0.5);
        b.planter(x - 1, 236, x + 1, 242, 19, 0.5);
      }
      b.stairs(-4, 4, 248, 19, 10, { rise: 0.3, run: 1, top: 'pav_warm' });
      terrace(-12, 258, 12, 314, 22);
      for (const z of [273, 285]) b.box(-4, 22, z, 4, 23.1, z + 0.45, 'stone');
      b.railing(-11.85, 258, -11.85, 314, 22, 1, { mat: 'rail_dark' });
      b.railing(11.85, 258, 11.85, 314, 22, 1, { mat: 'rail_dark' });
      b.railing(-12, 313.8, 12, 313.8, 22, 1, { mat: 'rail_dark' });
      b.bench(-7, 22, 305); b.bench(7, 22, 305);
      marker(0, 22, 310, 'THE OVERLOOK');

      // Stepped neighborhood around the playable route, rather than a floating track.
      const bands = [[-28, 38, 12], [38, 128, 18], [128, 221, 24], [221, 330, 22]];
      for (const [z0, z1, y] of bands) {
        for (const side of [-1, 1]) {
          const xa = side < 0 ? -66 : 14, xb = side < 0 ? -14 : 66;
          terrace(xa, z0, xb, z1, y);
          for (let z = z0 + 4; z < z1 - 18; z += 24) {
            const near = side < 0 ? -27 : 18;
            const fac = b.pick(['fac_beige', 'fac_peach', 'fac_brick2', 'fac_mint']);
            b.building(near, z, near + 10, z + 15, y + b.pick([6, 9]), fac, 'new', { base: y, roof: 'pav_light' });
            b.tree(side * 15.5, y, z + 19, 0.8);
            b.building(side < 0 ? -53 : 38, z + 3, side < 0 ? -38 : 53, z + 18, y + 10, 'fac_beige', 'new', { base: y, roof: 'roof' });
            b.stringLights(side * 14, y + 4, z + 16, side * 29, y + 4, z + 16, { n: 7, glow: false });
          }
        }
      }
      b.box(-100, -3, -70, 100, 0, 390, { side: 'stone', top: 'grass' });
      b.backdrop({ x0: -180, x1: 180, z0: -200, z1: -70, cell: 30, hMin: 8, hMax: 25, roofDeco: false });
    },
  };
}
