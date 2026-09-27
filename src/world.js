// Map geometry: every box face goes into a per-material bucket, then buckets merge into one mesh each.
import * as THREE from 'three';
import { Collision } from './physics.js';
import * as TX from './textures.js';
import { makeClouds, makeHills, makeWater, makeBirds } from './env.js';

const FACES = [
  { key: 'px', n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { key: 'nx', n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { key: 'py', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { key: 'ny', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { key: 'pz', n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { key: 'nz', n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];

export const THEMES = {
  hall: {
    skyTop: '#3a7ad8', skyMid: '#7ab4ee', skyHorizon: '#dcecf8', skyBottom: '#a6c0d4',
    sunDir: [0.35, 0.86, 0.3], sunColor: '#fff2dc', sunIntensity: 3.4, sunSize: 0.03,
    hemiSky: '#f0ece4', hemiGround: '#8a8278', hemiIntensity: 1.9,
    fog: '#d8e4ee', fogNear: 160, fogFar: 900, windows: 0, exposure: 1.0, stars: 0,
    cloudLit: '#ffffff', cloudShade: '#b6c8e2', hillNear: '#6a9a6a', hillFar: '#9ab8a8',
    waterDeep: '#1a5ab0', waterShallow: '#3aa0d8', eyeLit: 1.0,
  },
  haze: {
    skyTop: '#8c8fb4', skyMid: '#d2a6a4', skyHorizon: '#f1c9a8', skyBottom: '#a88a84',
    sunDir: [0.6, 0.2, 0.75], sunColor: '#ffc893', sunIntensity: 2.7, sunSize: 0.05,
    hemiSky: '#e6ccd2', hemiGround: '#86624e', hemiIntensity: 1.55,
    fog: '#dcb4a4', fogNear: 70, fogFar: 560, windows: 0.9, exposure: 1.0, stars: 0,
    cloudLit: '#ffe4cc', cloudShade: '#b48c96', hillNear: '#9c8494', hillFar: '#c8a8ac',
    waterDeep: '#5a4a6a', waterShallow: '#9a7a8a', eyeLit: 0.95,
  },
  dusk: {
    skyTop: '#3a3f9e', skyMid: '#c86aa0', skyHorizon: '#ffb07e', skyBottom: '#5a3450',
    sunDir: [-0.55, 0.26, 0.8], sunColor: '#ffb27a', sunIntensity: 3.0, sunSize: 0.04,
    hemiSky: '#b4b0f4', hemiGround: '#7a4a48', hemiIntensity: 1.7,
    fog: '#e098a0', fogNear: 90, fogFar: 700, windows: 1.0, exposure: 1.0, stars: 0.15,
    cloudLit: '#ffd2b0', cloudShade: '#a86a9c', hillNear: '#8a5a8e', hillFar: '#c88aa8',
    waterDeep: '#3a2f6a', waterShallow: '#7a5a9a', eyeLit: 0.95,
  },
  night: {
    skyTop: '#050918', skyMid: '#121a48', skyHorizon: '#34407a', skyBottom: '#07080f',
    sunDir: [0.4, 0.55, -0.6], sunColor: '#cdd6ff', sunIntensity: 1.5, sunSize: 0.022, moon: true,
    hemiSky: '#7482c4', hemiGround: '#5a3c3a', hemiIntensity: 1.3,
    fog: '#18204a', fogNear: 70, fogFar: 520, windows: 1.7, exposure: 1.3, stars: 1,
    cloudLit: '#7a86c0', cloudShade: '#1c2250', hillNear: '#141a3a', hillFar: '#28305e',
    waterDeep: '#08102a', waterShallow: '#1a2a55', eyeLit: 0.75,
  },
  day: {
    skyTop: '#2a6fe0', skyMid: '#62a8f0', skyHorizon: '#cfe8fb', skyBottom: '#a6c4d8',
    sunDir: [0.45, 0.72, 0.4], sunColor: '#fff4e2', sunIntensity: 3.3, sunSize: 0.03,
    hemiSky: '#c4defc', hemiGround: '#9a8a70', hemiIntensity: 1.35,
    fog: '#c9e1f5', fogNear: 120, fogFar: 900, windows: 0, exposure: 1.0, stars: 0,
    cloudLit: '#ffffff', cloudShade: '#b6c8e2', hillNear: '#5aa05a', hillFar: '#8ab8a0',
    waterDeep: '#1a5ab0', waterShallow: '#3aa0d8', eyeLit: 1.0,
  },
};

function std(opts) { return new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }); }

function buildMaterials(theme) {
  const T = THEMES[theme];
  const win = T.windows;
  const facadeMat = (style, wall, seed) => {
    const f = TX.facade(style, wall, seed);
    return { mat: std({ map: f.color, emissiveMap: f.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: win, roughness: 0.82 }), tile: [16, 12], surface: 'concrete' };
  };
  const ribbedMat = (color, surface = 'metal') => ({ mat: std({ map: TX.ribbed(), color, roughness: 0.55, metalness: 0.25 }), tile: [2, 2.6], surface });
  const flat = (color, rough = 0.8, extra = {}) => ({ mat: std({ color, roughness: rough, ...extra }), tile: [4, 4], surface: 'concrete' });
  const glow = (color) => ({ mat: new THREE.MeshBasicMaterial({ color, toneMapped: false }), tile: [4, 4], surface: 'metal', noShadow: true });

  return {
    roof: { mat: std({ map: TX.roof(), roughness: 0.95 }), tile: [4, 4], surface: 'gravel' },
    concrete: { mat: std({ map: TX.concrete(), roughness: 0.9 }), tile: [4, 4], surface: 'concrete' },
    parapet: { mat: std({ map: TX.concrete(), color: '#d8d3ca', roughness: 0.9 }), tile: [4, 4], surface: 'concrete' },
    fac_beige: facadeMat('panel', '#ecd9b8', 1),
    fac_grey: facadeMat('panel', '#bccbd8', 2),
    fac_brick: facadeMat('brick', '#c46a4c', 3),
    fac_brick2: facadeMat('brick', '#a4705c', 4),
    fac_office: facadeMat('office', '#9aa8b8', 5),
    fac_ribbon: facadeMat('ribbon', '#f2eee4', 6),
    fac_dark: facadeMat('panel', '#6a7282', 7),
    fac_mint: facadeMat('panel', '#a6dcc4', 8),
    fac_conc: facadeMat('modern', '#b4b2ac', 14),
    fac_shoji: facadeMat('shoji', '#e6dcc4', 17),
    fac_shoji2: facadeMat('shoji', '#d2c2a0', 18),
    fac_shoji3: facadeMat('shoji', '#c9b28c', 19),
    tile_roof: { mat: std({ map: TX.roofTiles('teal', '#3e6a64', '#1c302e'), roughness: 0.55 }), tile: [2, 2], surface: 'concrete' },
    tile_roof2: { mat: std({ map: TX.roofTiles('slate', '#4a5260', '#20242c'), roughness: 0.55 }), tile: [2, 2], surface: 'concrete' },
    tile_roof3: { mat: std({ map: TX.roofTiles('rust', '#8a4a32', '#3a1c14'), roughness: 0.6 }), tile: [2, 2], surface: 'concrete' },
    timber: { mat: std({ color: '#4a3424', roughness: 0.8 }), tile: [4, 4], surface: 'wood' },
    plaster: { mat: std({ color: '#ece4d2', roughness: 0.9 }), tile: [4, 4], surface: 'concrete' },
    stone: { mat: std({ map: TX.stoneWall(), roughness: 0.95 }), tile: [3, 3], surface: 'concrete' },
    clay: { mat: std({ map: TX.clay(), roughness: 1 }), tile: [4, 4], surface: 'gravel' },
    trim_green: { mat: std({ color: '#2e5a46', roughness: 0.5, metalness: 0.3 }), tile: [4, 4], surface: 'metal' },
    plywood: { mat: std({ map: TX.plywood(), roughness: 0.75 }), tile: [2.4, 2.4], surface: 'wood' },
    red_panel: { mat: std({ map: TX.concBoard(), color: '#c0544a', roughness: 0.7 }), tile: [4, 4], surface: 'concrete' },
    gym_floor: { mat: std({ map: TX.pavers('gym', '#a2a19e', '#86857f', 8), roughness: 0.6, metalness: 0.05 }), tile: [4, 4], surface: 'concrete' },
    mat_dark: { mat: std({ color: '#3a3b40', roughness: 0.95 }), tile: [4, 4], surface: 'concrete' },
    mat_red: { mat: std({ color: '#a4463c', roughness: 0.95 }), tile: [4, 4], surface: 'concrete' },
    factory_win: { mat: new THREE.MeshBasicMaterial({ map: TX.factoryWindow(), toneMapped: true, color: '#e8eef4' }), tile: [4, 4], surface: 'concrete', noShadow: true },
    skylight: { mat: new THREE.MeshBasicMaterial({ color: '#dfeefa', transparent: true, opacity: 0.35, depthWrite: false }), tile: [4, 4], surface: 'metal', noShadow: true },
    foam_b: { mat: std({ map: TX.foam('#3a78d8'), roughness: 1 }), tile: [0.6, 0.6], surface: 'gravel' },
    foam_y: { mat: std({ map: TX.foam('#f0c030'), roughness: 1 }), tile: [0.6, 0.6], surface: 'gravel' },
    foam_r: { mat: std({ map: TX.foam('#d8483a'), roughness: 1 }), tile: [0.6, 0.6], surface: 'gravel' },
    rollup: { mat: std({ map: TX.ribbed(), color: '#5a5e66', roughness: 0.5, metalness: 0.4 }), tile: [2, 2], surface: 'metal' },
    paint_green: { mat: std({ map: TX.concBoard(), color: '#5f9a78', roughness: 0.75 }), tile: [4, 4], surface: 'concrete' },
    trim_yellow: { mat: std({ color: '#f0c020', roughness: 0.5 }), tile: [4, 4], surface: 'concrete' },
    pipe: { mat: std({ color: '#8c9096', roughness: 0.35, metalness: 0.7 }), tile: [4, 4], surface: 'metal' },
    torii: { mat: std({ color: '#d8402c', roughness: 0.5 }), tile: [4, 4], surface: 'wood' },
    poster_0: { mat: std({ map: TX.poster(0), roughness: 0.7 }), tile: [1, 1], surface: 'concrete', noShadow: true },
    poster_1: { mat: std({ map: TX.poster(1), roughness: 0.7 }), tile: [1, 1], surface: 'concrete', noShadow: true },
    poster_2: { mat: std({ map: TX.poster(2), roughness: 0.7 }), tile: [1, 1], surface: 'concrete', noShadow: true },
    poster_3: { mat: std({ map: TX.poster(3), roughness: 0.7 }), tile: [1, 1], surface: 'concrete', noShadow: true },
    lantern_red: { mat: new THREE.MeshBasicMaterial({ color: '#ff6a3a', toneMapped: false }), tile: [4, 4], surface: 'metal', noShadow: true },
    lantern_warm: { mat: new THREE.MeshBasicMaterial({ color: '#ffc070', toneMapped: false }), tile: [4, 4], surface: 'metal', noShadow: true },
    noren: { mat: std({ color: '#2a3c6a', roughness: 0.9, side: THREE.DoubleSide }), tile: [4, 4], surface: 'metal', noShadow: true },
    fac_conc2: facadeMat('modern', '#c8c5be', 15),
    fac_redbrick: facadeMat('brick', '#8e4a38', 16),
    fac_peach: facadeMat('panel', '#f6b996', 9),
    fac_sky: facadeMat('panel', '#9acbec', 10),
    fac_coral: facadeMat('brick', '#e8806c', 11),
    fac_lemon: facadeMat('ribbon', '#f4dc8a', 12),
    fac_lilac: facadeMat('panel', '#c4b4ec', 13),
    pav_light: { mat: std({ map: TX.pavers('light', '#d8d2c6', '#a8a298'), roughness: 0.9 }), tile: [4, 4], surface: 'concrete' },
    pav_lav: { mat: std({ map: TX.pavers('lav', '#b8b0e6', '#8e86c0', 8), roughness: 0.85 }), tile: [4, 4], surface: 'concrete' },
    pav_mint: { mat: std({ map: TX.pavers('mint', '#b4e2cc', '#86b8a0', 8), roughness: 0.85 }), tile: [4, 4], surface: 'concrete' },
    pav_warm: { mat: std({ map: TX.pavers('warm', '#e6c8a8', '#b89a7c', 10), roughness: 0.9 }), tile: [4, 4], surface: 'concrete' },
    grass: { mat: std({ map: TX.grass(), roughness: 1 }), tile: [3, 3], surface: 'gravel' },
    conc: { mat: std({ map: TX.concBoard(), roughness: 0.92 }), tile: [4, 4], surface: 'concrete' },
    rail_dark: { mat: std({ color: '#2a2d33', roughness: 0.45, metalness: 0.6 }), tile: [4, 4], surface: 'metal' },
    vine: { mat: std({ color: '#3d7a34', roughness: 0.85 }), tile: [4, 4], surface: 'wood' },
    vine2: { mat: std({ color: '#5a9a3e', roughness: 0.85 }), tile: [4, 4], surface: 'wood' },
    fence: { mat: std({ map: TX.fenceMesh(), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 }), tile: [1.2, 1.2], surface: 'metal' },
    dumpster: { mat: std({ color: '#2f5a44', roughness: 0.6, metalness: 0.3 }), tile: [4, 4], surface: 'metal' },
    sand: { mat: std({ map: TX.sand(), roughness: 1 }), tile: [3, 3], surface: 'gravel' },
    leaf: { mat: std({ color: '#5aa84a', roughness: 0.8 }), tile: [4, 4], surface: 'wood' },
    leaf2: { mat: std({ color: '#3f8a45', roughness: 0.8 }), tile: [4, 4], surface: 'wood' },
    trunk: { mat: std({ color: '#8a6440', roughness: 0.9 }), tile: [4, 4], surface: 'wood' },
    soil: { mat: std({ color: '#5a4030', roughness: 1 }), tile: [4, 4], surface: 'gravel' },
    rail: { mat: std({ color: '#eef0f2', roughness: 0.35, metalness: 0.4 }), tile: [4, 4], surface: 'metal' },
    canvas_red: { mat: std({ map: TX.stripes('#e84a3a', '#f6efe2'), roughness: 0.8, side: THREE.DoubleSide }), tile: [1.6, 1.6], surface: 'bounce' },
    canvas_blue: { mat: std({ map: TX.stripes('#2f7ad8', '#f6efe2'), roughness: 0.8, side: THREE.DoubleSide }), tile: [1.6, 1.6], surface: 'bounce' },
    canvas_green: { mat: std({ map: TX.stripes('#2fa878', '#f6efe2'), roughness: 0.8, side: THREE.DoubleSide }), tile: [1.6, 1.6], surface: 'bounce' },
    canvas_yellow: { mat: std({ map: TX.stripes('#f2b82a', '#f6efe2'), roughness: 0.8, side: THREE.DoubleSide }), tile: [1.6, 1.6], surface: 'bounce' },
    solar: { mat: std({ map: TX.solar(), roughness: 0.3, metalness: 0.4 }), tile: [2, 2], surface: 'metal' },
    car_red: { mat: std({ color: '#d8403a', roughness: 0.35, metalness: 0.3 }), tile: [4, 4], surface: 'metal' },
    car_blue: { mat: std({ color: '#3a70d0', roughness: 0.35, metalness: 0.3 }), tile: [4, 4], surface: 'metal' },
    car_yellow: { mat: std({ color: '#f0c030', roughness: 0.35, metalness: 0.3 }), tile: [4, 4], surface: 'metal' },
    car_white: { mat: std({ color: '#eceae4', roughness: 0.35, metalness: 0.3 }), tile: [4, 4], surface: 'metal' },
    glass_dark: { mat: std({ color: '#2a3a4a', roughness: 0.1, metalness: 0.7 }), tile: [4, 4], surface: 'metal' },
    bulb: { mat: new THREE.MeshBasicMaterial({ color: '#ffe0a0', toneMapped: false }), tile: [4, 4], surface: 'metal', noShadow: true },
    pennant_a: { mat: new THREE.MeshStandardMaterial({ color: '#ff5a1f', side: THREE.DoubleSide, roughness: 0.8 }), tile: [4, 4], surface: 'metal', noShadow: true },
    pennant_b: { mat: new THREE.MeshStandardMaterial({ color: '#2fb8e8', side: THREE.DoubleSide, roughness: 0.8 }), tile: [4, 4], surface: 'metal', noShadow: true },
    pennant_c: { mat: new THREE.MeshStandardMaterial({ color: '#ffd23f', side: THREE.DoubleSide, roughness: 0.8 }), tile: [4, 4], surface: 'metal', noShadow: true },
    pennant_d: { mat: new THREE.MeshStandardMaterial({ color: '#8ee05a', side: THREE.DoubleSide, roughness: 0.8 }), tile: [4, 4], surface: 'metal', noShadow: true },
    metal: ribbedMat('#8d949c'),
    duct: { mat: std({ map: TX.ribbed(), color: '#b9bec4', roughness: 0.4, metalness: 0.5 }), tile: [1.2, 1.2], surface: 'metal' },
    steel: flat('#3a3f47', 0.5, { metalness: 0.6 }),
    beam: { ...flat('#c8462c', 0.6, { metalness: 0.3 }), surface: 'metal' },
    beam_yellow: { ...flat('#e2a91b', 0.55, { metalness: 0.3 }), surface: 'metal' },
    wood: { mat: std({ map: TX.planks(), roughness: 0.85 }), tile: [2, 2], surface: 'wood' },
    hazard: { mat: std({ map: TX.hazard(), roughness: 0.7 }), tile: [1, 1], surface: 'concrete' },
    asphalt: { mat: std({ map: TX.asphalt(), roughness: 0.95 }), tile: [16, 16], surface: 'concrete' },
    dirt: flat('#8a7355', 1),
    glass: { mat: std({ color: '#7fb0cc', roughness: 0.15, metalness: 0.6, emissive: new THREE.Color('#2a4a60'), emissiveIntensity: win * 0.4 }), tile: [4, 4], surface: 'metal' },
    dark: flat('#1c1e22', 0.7),
    white: flat('#e9e9e6', 0.7),
    c_red: ribbedMat('#b8392b'), c_blue: ribbedMat('#2d5fa0'), c_green: ribbedMat('#3f7d4a'),
    c_orange: ribbedMat('#d9772a'), c_white: ribbedMat('#d8d8d2'), c_yellow: ribbedMat('#d9b12a'),
    c_teal: ribbedMat('#2d8a8a'), c_grey: ribbedMat('#707880'),
    hull: { ...flat('#2a3b52', 0.6, { metalness: 0.3 }), surface: 'metal' },
    hull_red: { ...flat('#8e2a22', 0.6), surface: 'metal' },
    deck: { ...flat('#6e5b4a', 0.85), surface: 'metal' },
    water: { mat: std({ map: TX.water(), color: '#1c3446', roughness: 0.08, metalness: 0.5 }), tile: [30, 30], surface: 'water', noShadow: true },
    neon_pink: glow('#ff2e88'), neon_cyan: glow('#27e8ff'), neon_amber: glow('#ffb020'), neon_lime: glow('#b6ff3b'),
    lamp: glow('#ffd28a'),
  };
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.col = new Collision();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buckets = new Map();
    this.updaters = [];
    this.mats = null;
    this.theme = null;
    this.lights = null;
    this.sky = null;
  }

  setTheme(theme) {
    this.theme = theme;
    this.mats = buildMaterials(theme);
  }

  bucket(key) {
    let b = this.buckets.get(key);
    if (!b) { b = { pos: [], nrm: [], uv: [], col: [], idx: [] }; this.buckets.set(key, b); }
    return b;
  }

  // Solid box. mat: key or {top, side, bottom, px, nx, pz, nz}. Faces with no material are skipped.
  box(x0, y0, z0, x1, y1, z1, mat, opts = {}) {
    const m = typeof mat === 'string' ? { side: mat, top: mat, bottom: mat } : mat;
    const primary = m.side || m.top;
    if (opts.collide !== false) {
      const surf = opts.surface || this.mats[m.top || primary]?.surface || 'concrete';
      this.col.add(x0, y0, z0, x1, y1, z1, surf);
    }
    if (opts.invisible) return;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2;
    const shade = opts.shade || null;
    const uo = opts.uvo || [0, 0];
    for (const f of FACES) {
      let key = m[f.key];
      if (key === undefined) key = f.key === 'py' ? m.top : f.key === 'ny' ? (m.bottom === undefined ? null : m.bottom) : m.side;
      if (!key) continue;
      if (f.key === 'ny' && y0 <= 0.01 && !opts.keepBottom) continue;
      const def = this.mats[key];
      const B = this.bucket(key);
      const base = B.pos.length / 3;
      const n = f.n, u = f.u, v = f.v;
      const ccx = cx + n[0] * hx, ccy = cy + n[1] * hy, ccz = cz + n[2] * hz;
      const hu = Math.abs(u[0]) * hx + Math.abs(u[1]) * hy + Math.abs(u[2]) * hz;
      const hv = Math.abs(v[0]) * hx + Math.abs(v[1]) * hy + Math.abs(v[2]) * hz;
      const tile = def.tile;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const px = ccx + u[0] * hu * su + v[0] * hv * sv;
        const py = ccy + u[1] * hu * su + v[1] * hv * sv;
        const pz = ccz + u[2] * hu * su + v[2] * hv * sv;
        B.pos.push(px, py, pz);
        B.nrm.push(n[0], n[1], n[2]);
        B.uv.push((px * u[0] + py * u[1] + pz * u[2]) / tile[0] + uo[0], (px * v[0] + py * v[1] + pz * v[2]) / tile[1] + uo[1]);
        let c = 1;
        if (shade) c = shade[0] + (shade[1] - shade[0]) * ((py - y0) / Math.max(0.001, y1 - y0));
        B.col.push(c, c, c);
      }
      B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  // Append an arbitrary BufferGeometry, transformed, into a material bucket.
  geo(geometry, matKey, matrix, tint = 1) {
    const g = geometry.index ? geometry : geometry;
    const B = this.bucket(matKey);
    const base = B.pos.length / 3;
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
    const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix);
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(matrix);
      B.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      B.nrm.push(v.x, v.y, v.z);
      B.uv.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
      B.col.push(tint, tint, tint);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) B.idx.push(base + g.index.getX(i));
    else for (let i = 0; i < pa.count; i++) B.idx.push(base + i);
  }

  add(obj) { this.group.add(obj); return obj; }

  finalize() {
    for (const [key, B] of this.buckets) {
      if (!B.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
      g.setIndex(B.idx);
      g.computeBoundingSphere();
      const def = this.mats[key];
      const mesh = new THREE.Mesh(g, def.mat);
      mesh.castShadow = !def.noShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    this.buckets.clear();
  }

  clear() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.col.clear();
    this.buckets.clear();
    this.updaters.length = 0;
  }

  update(t, dt) {
    for (const u of this.updaters) u(t, dt);
  }
}

// ---------- sky + lights ----------

const skyVert = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const skyFrag = /* glsl */`
uniform vec3 top, mid, horizon, bottom, sunColor, sunDir;
uniform float sunSize, stars, moon;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0
    ? mix(mix(horizon, mid, smoothstep(0.0, 0.18, h)), top, smoothstep(0.15, 0.7, h))
    : mix(horizon, bottom, smoothstep(0.0, 0.12, -h));
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  float disc = smoothstep(1.0 - sunSize * 0.02, 1.0 - sunSize * 0.012, sd);
  col += sunColor * (pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 0.6);
  col = mix(col, sunColor * (moon > 0.5 ? 1.4 : 2.2), disc);
  if (stars > 0.0 && h > 0.05) {
    vec3 c = floor(d * 280.0);
    float s = hash(c);
    col += vec3(step(0.996, s) * stars * smoothstep(0.05, 0.4, h) * (0.5 + 0.5 * hash(c + 3.1)));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function setupEnvironment(scene, theme, opts = {}) {
  const T = THEMES[theme];
  const c = (s) => new THREE.Color(s);
  const sunDir = new THREE.Vector3(...T.sunDir).normalize();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: c(T.skyTop) }, mid: { value: c(T.skyMid) }, horizon: { value: c(T.skyHorizon) },
        bottom: { value: c(T.skyBottom) }, sunColor: { value: c(T.sunColor) }, sunDir: { value: sunDir },
        sunSize: { value: T.sunSize }, stars: { value: T.stars }, moon: { value: T.moon ? 1 : 0 },
      },
      vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -10;

  const hemi = new THREE.HemisphereLight(c(T.hemiSky), c(T.hemiGround), T.hemiIntensity);
  const sun = new THREE.DirectionalLight(c(T.sunColor), T.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = opts.shadow || 38;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 260 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const group = new THREE.Group();
  group.add(sky, hemi, sun, sun.target);
  const updaters = [];
  const far = new THREE.Group();
  const clouds = makeClouds(T, sunDir, opts.seed || 7, opts.clouds ?? 26);
  far.add(clouds);
  updaters.push((t) => { clouds.rotation.y = t * 0.002; });
  if (opts.hills !== false) far.add(makeHills(T, (opts.seed || 3) + 1, opts.hills || {}));
  group.add(far);
  let water = null;
  if (opts.water) {
    water = makeWater(T, sunDir, opts.water.y ?? 0);
    group.add(water);
    updaters.push(water.userData.update);
  }
  if (opts.birds) {
    const b = makeBirds(new THREE.Vector3(...opts.birds), 9, 5, T.moon ? '#9aa4c8' : '#f4f4f4');
    group.add(b);
    updaters.push(b.userData.update);
  }

  scene.fog = new THREE.Fog(c(T.fog), T.fogNear, T.fogFar);
  return {
    group, sun, sunDir, hemi, sky, exposure: T.exposure, far, water, theme: T,
    update(t) { for (const u of updaters) u(t); },
    follow(x, y, z) {
      sun.target.position.set(x, y, z);
      sun.position.set(x + sunDir.x * 120, y + sunDir.y * 120, z + sunDir.z * 120);
    },
    center(x, z) { far.position.set(x, 0, z); },
  };
}
