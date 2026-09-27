// Builds a complete skinned runner from a costume: skeleton, sculpted head, eyes, clothes, sneakers, hair.
import * as THREE from 'three';
import { PartBuilder, sweep, loft, sphereGrid, superEllipsoid, V3, sstep, mix } from './geo.js';
import { makeBodyMaterial, makeHairMaterial, makeEyeMaterial } from './mats.js';
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, colorDef } from '../costumes.js';

export const PIVOT = 0.75;
const HC = V3(0, 1.495, 0.012);
const HR = { x: 0.215, y: 0.208, z: 0.2 };

const BONE_DEFS = [
  ['root', null, [0, 0, 0]],
  ['hips', 'root', [0, 0.8, 0]],
  ['spine', 'hips', [0, 0.92, -0.005]],
  ['chest', 'spine', [0, 1.06, -0.01]],
  ['neck', 'chest', [0, 1.22, -0.005]],
  ['head', 'neck', [0, 1.285, 0]],
];
for (const [s, k] of [['L', 1], ['R', -1]]) {
  BONE_DEFS.push(
    ['upperArm' + s, 'chest', [0.165 * k, 1.185, -0.01]],
    ['foreArm' + s, 'upperArm' + s, [0.19 * k, 0.955, -0.005]],
    ['hand' + s, 'foreArm' + s, [0.205 * k, 0.755, 0]],
    ['thigh' + s, 'hips', [0.09 * k, 0.77, 0]],
    ['shin' + s, 'thigh' + s, [0.09 * k, 0.44, 0.012]],
    ['foot' + s, 'shin' + s, [0.09 * k, 0.105, -0.01]],
  );
}
const BI = Object.fromEntries(BONE_DEFS.map((b, i) => [b[0], i]));
const REST = Object.fromEntries(BONE_DEFS.map((b) => [b[0], V3(...b[2])]));

const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const lerpC = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// piecewise-linear table lookup [[t, v], ...]
function table(tab) {
  return (t) => {
    if (t <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) {
      if (t <= tab[i][0]) { const [t0, v0] = tab[i - 1], [t1, v1] = tab[i]; return mix(v0, v1, (t - t0) / (t1 - t0)); }
    }
    return tab[tab.length - 1][1];
  };
}

// linear refinement of loft rows so stripes / smooth shading have enough rings
function refine(rows, per = 3) {
  const out = [];
  for (let i = 0; i < rows.length - 1; i++) {
    for (let k = 0; k < per; k++) {
      const t = k / per, a = rows[i], b = rows[i + 1];
      const r = {};
      for (const key of Object.keys(a)) r[key] = typeof a[key] === 'number' ? mix(a[key], b[key] ?? a[key], t) : a[key];
      out.push(r);
    }
  }
  out.push(rows[rows.length - 1]);
  return out;
}

export function headSurf(az, el, inflate = 0) {
  const ce = Math.cos(el);
  const x = Math.sin(az) * ce, y = Math.sin(el), z = Math.cos(az) * ce;
  const low = sstep(0.05, -0.95, el);
  let rx = HR.x * (1 - 0.09 * low), ry = HR.y * (1 - 0.1 * low), rz = HR.z * (1 - 0.03 * low);
  const cheek = Math.exp(-(((Math.abs(az) - 0.6) / 0.33) ** 2) - (((el + 0.22) / 0.24) ** 2));
  const nose = Math.exp(-((az / 0.085) ** 2) - (((el + 0.12) / 0.075) ** 2));
  const back = Math.max(0, -Math.cos(az)) * sstep(-0.3, 0.5, el);
  const r = 1 + 0.06 * cheek + 0.05 * nose + 0.035 * back + inflate;
  return V3(HC.x + x * rx * r, HC.y + y * ry * r, HC.z + z * rz * r);
}

function hairline(az) {
  const c = Math.cos(az);
  return c > 0 ? mix(0.06, 0.4, Math.pow(c, 1.4)) : mix(0.06, -0.52, Math.pow(-c, 0.9));
}

export function buildCharacter(costume, { ghost = false } = {}) {
  const C = costume;
  const skin = rgb(SKIN_TONES[C.skin] || SKIN_TONES[1]);
  const hair = rgb(HAIR_COLORS[C.hairColor] || HAIR_COLORS[1]);
  const cdef = (id) => colorDef(id);
  const cc = (id) => rgb(cdef(id).hex);
  const matOf = (id, rough = 0.85) => { const d = cdef(id); return [d.glow ? 1 : 0, d.metal ? 0.9 : 0, d.metal ? 0.25 : rough]; };
  const top = cc(C.topColor), bottom = cc(C.bottomColor), shoe = cc(C.shoeColor);
  const topM = matOf(C.topColor, 0.86), botM = matOf(C.bottomColor, 0.82), shoeM = matOf(C.shoeColor, 0.5);
  const SKIN = [0, 0, 0.52];
  const W = (name, w = 1) => [BI[name], w];

  // ---------- skeleton ----------
  const bones = {};
  for (const [name, parent, p] of BONE_DEFS) {
    const b = new THREE.Bone();
    b.name = name;
    const pp = parent ? REST[parent] : V3();
    b.position.set(p[0] - pp.x, p[1] - pp.y, p[2] - pp.z);
    bones[name] = b;
    if (parent) bones[parent].add(b);
  }
  const boneList = BONE_DEFS.map((b) => bones[b[0]]);
  bones.root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(boneList);

  const pb = new PartBuilder();

  // ---------- head ----------
  sphereGrid(pb, 34, 44, (az, el) => headSurf(az, el), (az, el) => ({ c: skin, w: [W('head')], face: [az, el], mat: SKIN }));
  for (const s of [-1, 1]) {
    const ec = headSurf(s * Math.PI / 2 * 0.97, 0.02);
    superEllipsoid(pb, V3(ec.x + s * 0.004, ec.y, ec.z - 0.01), 0.022, 0.052, 0.036, 0.8, () => ({ c: shade(skin, 0.96), w: [W('head')], mat: SKIN }), 10, 12);
  }
  // neck
  loft(pb, [0.15, 0.2, 0.26, 0.32, 0.37].map((y, i) => ({ y: 1.17 + y * 0.58, a: [0.07, 0.067, 0.064, 0.066, 0.07][i], b: [0.066, 0.063, 0.06, 0.063, 0.068][i], n: 2, zc: -0.004 })), {
    segs: 18,
    vertex: (t, th, p) => ({ c: skin, w: [W('chest', 1 - sstep(1.2, 1.28, p.y)), W('neck', sstep(1.2, 1.28, p.y) * (1 - sstep(1.33, 1.38, p.y))), W('head', sstep(1.33, 1.38, p.y))], mat: SKIN }),
  });

  // ---------- torso / top ----------
  const style = C.top;
  const bulk = style === 'hoodie' || style === 'jacket' ? 0.012 : style === 'tank' ? -0.004 : 0;
  const trows = refine([
    { y: 0.695, a: 0.136, b: 0.097, n: 2.8, zc: 0 },
    { y: 0.7, a: 0.143, b: 0.104, n: 2.8, zc: 0 },
    { y: 0.76, a: 0.14, b: 0.1, n: 2.8, zc: 0 },
    { y: 0.84, a: 0.135, b: 0.097, n: 2.8, zc: 0.004 },
    { y: 0.92, a: 0.137, b: 0.099, n: 2.8, zc: 0.008 },
    { y: 1.0, a: 0.148, b: 0.104, n: 2.9, zc: 0.012 },
    { y: 1.07, a: 0.16, b: 0.106, n: 3.0, zc: 0.01 },
    { y: 1.13, a: style === 'tank' ? 0.15 : 0.166, b: 0.1, n: 2.7, zc: 0 },
    { y: 1.175, a: style === 'tank' ? 0.135 : 0.152, b: 0.092, n: 2.5, zc: -0.005 },
    { y: 1.21, a: 0.118, b: 0.082, n: 2.3, zc: -0.008 },
    { y: 1.24, a: 0.088, b: 0.076, n: 2.1, zc: -0.008 },
    { y: 1.262, a: 0.074, b: 0.07, n: 2.0, zc: -0.006 },
  ], 4).map((r, i) => (i === 0 ? r : { ...r, a: r.a + bulk, b: r.b + bulk * 0.8 }));
  const hemTop = style === 'hoodie' ? 0.76 : style === 'jacket' || style === 'track' ? 0.74 : 0.715;
  loft(pb, trows, {
    segs: 32,
    vertex: (t, th, p) => {
      const y = p.y;
      const wH = 1 - sstep(0.8, 0.92, y), wC = sstep(0.98, 1.1, y), wS = Math.max(0, 1 - wH - wC);
      const side = Math.sign(p.x) || 1;
      const arm = sstep(0.1, 0.16, Math.abs(p.x)) * sstep(1.08, 1.17, y) * 0.35;
      let c = top;
      if (y < hemTop && (style === 'hoodie' || style === 'jacket' || style === 'track')) c = shade(top, 0.78);
      if (style === 'stripes' && y > 0.74 && y < 1.2 && Math.floor((y - 0.74) / 0.045) % 2 === 1) c = [0.95, 0.94, 0.9];
      if ((style === 'jacket' || style === 'track') && Math.abs(p.x) < 0.007 && p.z > 0) c = style === 'track' ? [0.95, 0.95, 0.95] : [0.75, 0.75, 0.78];
      if (style === 'track' && Math.abs(Math.abs(p.x) - 0.03) < 0.006 && p.z > 0 && y > 0.95) c = [0.95, 0.95, 0.95];
      if (y > 1.245) c = shade(c, 0.88);
      return { c, w: [W('hips', wH), W('spine', wS), W('chest', wC * (1 - arm)), W(side > 0 ? 'upperArmL' : 'upperArmR', wC * arm)], mat: topM };
    },
  });
  if (style === 'hoodie') {
    // hood bunched behind the neck
    sphereGrid(pb, 10, 20, (az, el) => {
      const s = Math.sin(az), c = Math.cos(az);
      return V3(0.13 * s * Math.cos(el), 1.255 + 0.06 * Math.sin(el), -0.075 + 0.07 * c * Math.cos(el) - 0.02);
    }, () => ({ c: shade(top, 0.92), w: [W('chest')], mat: topM }));
    // kangaroo pocket
    loft(pb, [{ y: 0.78, a: 0.1, b: 0.012, n: 4, zc: 0.1 }, { y: 0.86, a: 0.09, b: 0.012, n: 4, zc: 0.104 }], {
      segs: 16, closeTop: true, closeBottom: true, vertex: () => ({ c: shade(top, 0.9), w: [W('spine')], mat: topM }),
    });
    for (const s of [-1, 1]) {
      sweep(pb, [V3(0.035 * s, 1.235, 0.066), V3(0.038 * s, 1.17, 0.1), V3(0.042 * s, 1.1, 0.115)], {
        rings: 6, segs: 6, radius: () => 0.005, vertex: () => ({ c: [0.95, 0.95, 0.95], w: [W('chest')], mat: [0, 0, 0.6] }),
      });
    }
  }
  if (style === 'jacket' || style === 'track') {
    sweep(pb, [V3(-0.075, 1.245, -0.01), V3(0, 1.265, -0.07), V3(0.075, 1.245, -0.01)], {
      rings: 10, segs: 8, radius: () => 0.022, section: () => [1, 0.5], up: V3(0, 1, 0),
      vertex: () => ({ c: shade(top, 0.9), w: [W('chest')], mat: topM }),
    });
  }

  // ---------- pelvis / bottoms ----------
  loft(pb, [
    { y: 0.62, a: 0.07, b: 0.06, n: 2.2 }, { y: 0.655, a: 0.15, b: 0.1, n: 2.4 }, { y: 0.7, a: 0.152, b: 0.104, n: 2.6 },
    { y: 0.745, a: 0.137, b: 0.097, n: 2.7 }, { y: 0.8, a: 0.128, b: 0.092, n: 2.8 },
  ], { segs: 28, closeBottom: true, vertex: () => ({ c: bottom, w: [W('hips')], mat: botM }) });

  // ---------- legs ----------
  const pantsEnd = { pants: 0.975, joggers: 0.93, shorts: 0.43, cargo: 0.975 }[C.bottom] ?? 0.975;
  const pantsBulk = C.bottom === 'cargo' ? 0.022 : C.bottom === 'shorts' ? 0.02 : 0.015;
  const legR = table([[0, 0.08], [0.08, 0.083], [0.3, 0.072], [0.5, 0.056], [0.54, 0.054], [0.62, 0.058], [0.72, 0.057], [0.9, 0.043], [1, 0.038]]);
  for (const [s, k] of [['L', 1], ['R', -1]]) {
    const pts = [V3(0.088 * k, 0.83, 0), REST['thigh' + s], REST['shin' + s], REST['foot' + s]];
    const tT = 0.083, tK = 0.538;
    sweep(pb, pts, {
      rings: 30, segs: 16, cap0: false,
      radius: (t) => {
        let r = legR(t);
        if (t < pantsEnd) r += pantsBulk * (C.bottom === 'joggers' ? 1 - 0.7 * sstep(pantsEnd - 0.08, pantsEnd, t) : 1);
        r += 0.006 * Math.exp(-(((t - pantsEnd) / 0.012) ** 2));
        return r;
      },
      up: V3(0, 0, 1),
      vertex: (t, th, p) => {
        let c = skin, mat = SKIN;
        if (t < pantsEnd + 0.004) { c = bottom; mat = botM; if (C.bottom === 'joggers' && t > pantsEnd - 0.05) c = shade(bottom, 0.8); }
        else if (t > 0.86) { c = [0.95, 0.95, 0.93]; mat = [0, 0, 0.9]; }
        if (C.bottom === 'cargo' && t > 0.25 && t < 0.38 && Math.cos(th) * k > 0.6 && Math.abs(Math.sin(th)) < 0.6) c = shade(bottom, 0.85);
        const wh = 1 - sstep(0.02, 0.13, t), wk = sstep(tK - 0.05, tK + 0.05, t), wf = sstep(0.97, 1.0, t);
        return { c, mat, w: [W('hips', wh), W('thigh' + s, (1 - wh) * (1 - wk)), W('shin' + s, wk * (1 - wf)), W('foot' + s, wf)] };
      },
    });
    void tT;
  }

  // ---------- arms + hands ----------
  const sleeveEnd = { tee: 0.33, stripes: 0.33, tank: -1 }[style] ?? 0.955;
  const armR = table([[0, 0.05], [0.1, 0.052], [0.3, 0.047], [0.55, 0.04], [0.6, 0.039], [0.7, 0.04], [0.9, 0.031], [1, 0.028]]);
  for (const [s, k] of [['L', 1], ['R', -1]]) {
    const pts = [V3(0.12 * k, 1.18, -0.01), REST['upperArm' + s], REST['foreArm' + s], V3(0.205 * k, 0.77, 0)];
    const tE = 0.597;
    sweep(pb, pts, {
      rings: 26, segs: 14, cap0: false,
      radius: (t) => {
        let r = armR(t);
        if (t < sleeveEnd) r += 0.013;
        r += 0.005 * Math.exp(-(((t - sleeveEnd) / 0.012) ** 2));
        return r;
      },
      section: (t) => [1, 1 - 0.18 * sstep(0.6, 1, t)],
      up: V3(0, 0, 1),
      vertex: (t, th, p) => {
        let c = skin, mat = SKIN;
        if (t < sleeveEnd + 0.004) { c = t > sleeveEnd - 0.04 && sleeveEnd > 0.9 ? shade(top, 0.8) : top; mat = topM; }
        if (style === 'track' && t < sleeveEnd && Math.abs(Math.cos(th)) < 0.2 && Math.sin(th) * k < 0) c = [0.95, 0.95, 0.95];
        if (style === 'stripes' && t < sleeveEnd && Math.floor(t / 0.08) % 2 === 1) c = [0.95, 0.94, 0.9];
        const wc = 1 - sstep(0.0, 0.14, t), we = sstep(tE - 0.05, tE + 0.05, t), wh = sstep(0.96, 1.0, t);
        return { c, mat, w: [W('chest', wc), W('upperArm' + s, (1 - wc) * (1 - we)), W('foreArm' + s, we * (1 - wh)), W('hand' + s, wh)] };
      },
    });
    // hand: palm faces the thigh, fingers curl inward, thumb points forward
    const h = REST['hand' + s];
    const hv = () => ({ c: skin, w: [W('hand' + s)], mat: SKIN });
    const IN = V3(-k, 0, 0), FW = V3(0, 0, 1), DN = V3(0, -1, 0);
    const at = (d, i, f) => V3(h.x, h.y, h.z).addScaledVector(DN, d).addScaledVector(IN, i).addScaledVector(FW, f);
    superEllipsoid(pb, at(0.042, -0.002, 0.004), 0.02, 0.045, 0.04, 0.72, hv, 10, 14);
    for (let f = 0; f < 4; f++) {
      const fo = (1.5 - f) * 0.0155 + 0.004;
      const len = [0.95, 1, 0.97, 0.85][f];
      sweep(pb, [at(0.07, 0.008, fo), at(0.072 + 0.028 * len, 0.02, fo), at(0.075 + 0.032 * len, 0.042 * len, fo * 0.95)], {
        rings: 7, segs: 8, radius: (t) => mix(0.0118, 0.0098, t), vertex: hv,
      });
    }
    sweep(pb, [at(0.026, 0.012, 0.022), at(0.048, 0.024, 0.036), at(0.064, 0.03, 0.04)], {
      rings: 7, segs: 8, radius: (t) => mix(0.0135, 0.011, t), vertex: hv,
    });
  }

  // ---------- sneakers ----------
  const boots = C.shoes === 'boots', high = C.shoes === 'hightops' || boots;
  const soleCol = boots ? [0.16, 0.12, 0.1] : [0.96, 0.95, 0.92];
  const outCol = boots ? [0.1, 0.08, 0.07] : [0.14, 0.14, 0.15];
  const accent = boots ? shade(shoe, 0.7) : lerpC(shoe, [1, 1, 1], 0.55);
  for (const [s, k] of [['L', 1], ['R', -1]]) {
    const f = REST['foot' + s];
    const fx = f.x, fw = [W('foot' + s)];
    const off = (r) => ({ ...r, xc: fx, zc: (r.zc ?? 0.062) + f.z });
    loft(pb, [{ y: 0, a: 0.053, b: 0.133, n: 3.2 }, { y: 0.02, a: 0.054, b: 0.134, n: 3.2 }].map(off), {
      segs: 30, closeBottom: true, vertex: () => ({ c: outCol, w: fw, mat: [0, 0, 0.92] }),
    });
    loft(pb, [{ y: 0.018, a: 0.057, b: 0.137, n: 3.2 }, { y: boots ? 0.04 : 0.048, a: 0.057, b: 0.137, n: 3.2 }].map(off), {
      segs: 30, vertex: (t, th, p) => ({ c: !boots && Math.abs(p.x - fx) > 0.05 && p.z > 0 && Math.abs(p.z - 0.06) < 0.03 ? shoe : soleCol, w: fw, mat: [0, 0, 0.7] }),
    });
    const up = [
      { y: 0.045, a: 0.054, b: 0.131, zc: 0.062, n: 3 }, { y: 0.07, a: 0.052, b: 0.126, zc: 0.058, n: 3 },
      { y: 0.095, a: 0.049, b: 0.108, zc: 0.045, n: 2.8 }, { y: 0.118, a: 0.045, b: 0.08, zc: 0.022, n: 2.6 },
      { y: 0.135, a: 0.043, b: 0.062, zc: 0.0, n: 2.4 },
    ];
    if (high) up.push({ y: 0.17, a: 0.046, b: 0.057, zc: -0.006, n: 2.2 }, { y: boots ? 0.23 : 0.2, a: 0.047, b: 0.056, zc: -0.008, n: 2.2 });
    loft(pb, refine(up, 2).map(off), {
      segs: 30,
      vertex: (t, th, p) => {
        let c = shoe;
        const lz = p.z - f.z;
        if (!boots && lz > 0.13 && p.y < 0.085) c = accent;
        if (!boots && lz < -0.05 && p.y > 0.07) c = accent;
        if (t > 0.93) c = shade(shoe, 0.8);
        if (!boots && Math.abs(p.x - fx) > 0.045 && lz > -0.02 && lz < 0.1 && Math.abs(p.y - 0.075 - lz * 0.15) < 0.007) c = accent;
        return { c, w: fw, mat: shoeM };
      },
    });
    superEllipsoid(pb, V3(fx, high ? 0.14 : 0.128, f.z + 0.05), 0.031, 0.022, 0.028, 0.8, () => ({ c: shade(shoe, 0.92), w: fw, mat: shoeM }), 8, 10);
    for (let l = 0; l < 3; l++) {
      superEllipsoid(pb, V3(fx, 0.121 - l * 0.011, f.z + 0.03 + l * 0.028), 0.029, 0.005, 0.008, 0.9, () => ({ c: boots ? [0.3, 0.2, 0.12] : [0.97, 0.97, 0.95], w: fw, mat: [0, 0, 0.7] }), 6, 8);
    }
  }

  const body = new THREE.SkinnedMesh(pb.geometry(), makeBodyMaterial());
  body.castShadow = true;
  body.frustumCulled = false;
  body.add(bones.root);
  body.bind(skeleton);
  body.material.userData.u.uBrowCol.value.setRGB(...shade(hair, C.hair === 'none' || C.hair === 'buzz' ? 0.45 : 0.7));

  // ---------- hair ----------
  const hpb = new PartBuilder();
  const HW = [W('head')];
  const hairCol = (t) => lerpC(shade(hair, 0.7), hair, t);
  const cap = (off, rows = 14) => {
    hpb.grid(rows, 48, (i, j) => {
      const az = -Math.PI + (j / 48) * Math.PI * 2;
      const u = i / (rows - 1);
      const el = mix(hairline(az), Math.PI / 2, Math.pow(u, 0.85));
      const o = off * sstep(0, 0.3, u);
      return { p: headSurf(az, el, o / 0.21), c: hairCol(0.4 + 0.6 * u), w: HW, mat: [0, 0, 0.4] };
    });
  };
  const strand = (pts, r0, r1, flat = 0.5, colT = 1) => sweep(hpb, pts, {
    rings: 12, segs: 10, radius: (t) => mix(r0, r1, t), section: () => [1, flat], up: V3(0, 1, 0),
    vertex: (t) => ({ c: hairCol(mix(0.6, colT, t)), w: HW, mat: [0, 0, 0.4] }),
  });
  const S = (az, el, o = 0.0) => headSurf(az, el, o);
  const hs = C.hair;
  let pony = null;
  if (hs === 'afro') {
    sphereGrid(hpb, 18, 26, (az, el) => {
      const n = 0.012 * Math.sin(az * 7) * Math.sin(el * 6) + 0.008 * Math.sin(az * 13 + el * 9);
      const r = 0.265 + n;
      return V3(HC.x + Math.sin(az) * Math.cos(el) * r * 1.02, HC.y + 0.06 + Math.sin(el) * r * 0.92, HC.z - 0.03 + Math.cos(az) * Math.cos(el) * r);
    }, (az, el) => ({ c: hairCol(0.7 + 0.3 * Math.sin(el)), w: HW, mat: [0, 0, 0.7] }), -0.35, Math.PI / 2);
  } else if (hs !== 'none') {
    cap(hs === 'buzz' || hs === 'mohawk' ? 0.005 : 0.024);
    if (hs === 'short' || hs === 'swoop') {
      const n = hs === 'swoop' ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = -0.62 + i * (hs === 'swoop' ? 0.17 : 0.22);
        const sw = hs === 'swoop' ? 0.45 : 0.12;
        strand([S(a - 0.12, 1.1, 0.03), S(a + sw * 0.4, 0.66, 0.11), S(a + sw, 0.4, 0.08)], 0.062, 0.01, 0.62);
      }
      for (let i = 0; i < 5; i++) {
        const a = Math.PI - 0.8 + i * 0.4;
        strand([S(a, 0.2, 0.05), S(a + 0.05, -0.25, 0.1), S(a + 0.08, -0.45, 0.08)], 0.045, 0.006, 0.4);
      }
    } else if (hs === 'spiky') {
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI + (i / 13) * Math.PI * 2 + 0.2, el = 0.65 + 0.25 * Math.cos(i * 1.7);
        const base = S(a, el, 0.03), n = base.clone().sub(HC).normalize();
        strand([base, base.clone().addScaledVector(n, 0.07).add(V3(0, 0.03, -0.02)), base.clone().addScaledVector(n, 0.13).add(V3(0, 0.07, -0.05))], 0.045, 0.004, 0.7);
      }
    } else if (hs === 'bun') {
      superEllipsoid(hpb, V3(0, HC.y + 0.2, HC.z - 0.12), 0.075, 0.07, 0.07, 1, () => ({ c: hairCol(0.9), w: HW, mat: [0, 0, 0.4] }), 12, 16);
    } else if (hs === 'mohawk') {
      for (let i = 0; i < 8; i++) {
        const el = 0.2 + i * 0.19, az = el > Math.PI / 2 ? Math.PI : 0, e2 = el > Math.PI / 2 ? Math.PI - el : el;
        const base = S(az, e2, 0.01), n = base.clone().sub(HC).normalize();
        strand([base, base.clone().addScaledVector(n, 0.06), base.clone().addScaledVector(n, 0.12).add(V3(0, 0.02, -0.03))], 0.03, 0.006, 0.25);
      }
    }
    if (hs === 'ponytail') {
      pony = new PartBuilder();
      sweep(pony, [V3(0, 0, 0), V3(0, -0.08, -0.05), V3(0, -0.2, -0.07), V3(0, -0.3, -0.05)], {
        rings: 14, segs: 12, radius: table([[0, 0.05], [0.2, 0.06], [0.7, 0.045], [1, 0.012]]),
        vertex: (t) => ({ c: hairCol(0.7 + 0.3 * t), w: [[0, 1]], mat: [0, 0, 0.4] }),
      });
      superEllipsoid(hpb, V3(0, HC.y + 0.08, HC.z - 0.205), 0.045, 0.035, 0.03, 1, () => ({ c: cc(C.hatColor), w: HW, mat: [0, 0, 0.6] }), 8, 10);
    }
  }
  let hairMesh = null;
  if (hpb.pos.length) {
    hairMesh = new THREE.SkinnedMesh(hpb.geometry(), makeHairMaterial());
    hairMesh.castShadow = true;
    hairMesh.frustumCulled = false;
    hairMesh.bind(skeleton);
  }

  // ---------- eyes (rigid on head bone) ----------
  const eyes = [];
  const headRest = REST.head;
  const eyeCol = EYE_COLORS[C.eyes ?? 0] || EYE_COLORS[0];
  for (const s of [-1, 1]) {
    const az0 = s * 0.355, el0 = 0.12, daz = 0.19, del = 0.235;
    const g = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    const R = 10;
    for (let i = 0; i <= R; i++) for (let j = 0; j <= R; j++) {
      const u = -1 + (2 * j) / R, v = -1 + (2 * i) / R;
      const p = headSurf(az0 + u * daz * s, el0 + v * del, 0.006).sub(headRest);
      pos.push(p.x, p.y, p.z); uv.push(u * s, v);
    }
    for (let i = 0; i < R; i++) for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j, b = a + 1, c = a + R + 2, d = a + R + 1;
      if (s > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, makeEyeMaterial(1));
    m.material.uniforms.uIris.value.set(eyeCol[0]);
    m.material.uniforms.uIris2.value.set(eyeCol[1]);
    bones.head.add(m);
    eyes.push(m);
  }

  // ---------- attachment anchors ----------
  // legacy accessory space: old head centre (0,0.1,0), radius 0.14 -> scaled onto the new head
  const headGear = new THREE.Group();
  const hk = 1.52;
  headGear.position.set(0, HC.y - headRest.y - 0.1 * hk, HC.z);
  headGear.scale.setScalar(hk);
  bones.head.add(headGear);
  const backGear = new THREE.Group();
  backGear.position.set(0, 0.07, -0.1);
  backGear.scale.setScalar(0.92);
  bones.chest.add(backGear);
  const neckGear = new THREE.Group();
  neckGear.position.set(0, REST.neck.y - REST.chest.y + 0.01, 0);
  bones.chest.add(neckGear);
  let ponyPivot = null;
  if (pony) {
    const pm = new THREE.Mesh(pony.geometry(), makeHairMaterial());
    pm.geometry.deleteAttribute('skinIndex'); pm.geometry.deleteAttribute('skinWeight');
    pm.castShadow = true;
    ponyPivot = new THREE.Group();
    ponyPivot.position.set(0, HC.y - headRest.y + 0.08, HC.z - 0.215);
    ponyPivot.add(pm);
    bones.head.add(ponyPivot);
  }

  if (ghost) {
    for (const e of eyes) e.visible = false;
  }

  return { body, hair: hairMesh, bones, skeleton, eyes, headGear, backGear, neckGear, ponyPivot, rest: REST };
}
