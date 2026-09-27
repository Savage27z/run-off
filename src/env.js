// Scenery that lives beyond the playable area: puffy clouds, hazy hills, animated sea, gulls.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const Vc = new THREE.Vector3();

// weld a non-indexed geometry so clusters share smooth normals and fewer verts
function mergeVerts(g) {
  const p = g.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    let j = map.get(k);
    if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
    idx.push(j);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}

// Clouds: clusters of blobs, vertex-coloured from the sun direction for a painted look.
export function makeClouds(T, sunDir, seed = 7, count = 26) {
  const rng = mulberry32(seed);
  const lit = new THREE.Color(T.cloudLit), shade = new THREE.Color(T.cloudShade);
  const pos = [], col = [], idx = [];
  const blob = mergeVerts(new THREE.IcosahedronGeometry(1, 3));
  const bp = blob.attributes.position, bi = blob.index;
  for (let c = 0; c < count; c++) {
    const ang = rng() * Math.PI * 2, rad = 520 + rng() * 380;
    const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad, cy = 90 + rng() * 150;
    const size = 26 + rng() * 40;
    const puffs = 5 + ((rng() * 6) | 0);
    for (let k = 0; k < puffs; k++) {
      const px = cx + (rng() - 0.5) * size * 2.4, pz = cz + (rng() - 0.5) * size * 0.9, py = cy + rng() * size * 0.35;
      const r = size * (0.45 + rng() * 0.55) * (k === 0 ? 1.2 : 1);
      const base = pos.length / 3;
      for (let i = 0; i < bp.count; i++) {
        Vc.fromBufferAttribute(bp, i);
        const n = Vc.clone();
        let y = Vc.y * r * 0.75;
        if (y < -r * 0.22) y = -r * 0.22 + (y + r * 0.22) * 0.15; // flat-ish bottoms
        pos.push(px + Vc.x * r, py + y, pz + Vc.z * r);
        const l = Math.max(0, n.dot(sunDir)) * 0.75 + (n.y * 0.5 + 0.5) * 0.35;
        const cc = shade.clone().lerp(lit, Math.min(1, l));
        col.push(cc.r, cc.g, cc.b);
      }
      for (let i = 0; i < bi.count; i++) idx.push(base + bi.getX(i));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  m.renderOrder = -5;
  m.frustumCulled = false;
  return m;
}

// A ring of soft hills/mountains near the horizon.
export function makeHills(T, seed = 3, { radius = 1250, count = 16, height = [50, 140], skip = null } = {}) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const near = new THREE.Color(T.hillNear), far = new THREE.Color(T.hillFar), haze = new THREE.Color(T.skyHorizon);
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rng() * 0.3;
    if (skip && skip(ang)) continue;
    const h = height[0] + rng() * (height[1] - height[0]);
    const w = h * (2.2 + rng() * 1.6);
    const geo = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = geo.attributes.position;
    const cols = [];
    const tint = near.clone().lerp(far, rng());
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      const n = Math.sin(p.getX(k) * 7 + i) * 0.04 + Math.sin(p.getZ(k) * 5) * 0.03;
      p.setY(k, Math.pow(y, 0.8) + n * y);
      const c = tint.clone().lerp(haze, 0.35 + 0.45 * (1 - y));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    const r = radius + rng() * 250;
    m.position.set(Math.cos(ang) * r, -4, Math.sin(ang) * r);
    m.scale.set(w, h, w * (0.6 + rng() * 0.5));
    m.rotation.y = rng() * Math.PI;
    m.renderOrder = -4;
    group.add(m);
  }
  return group;
}

const waterVert = /* glsl */`
varying vec3 vWorld;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const waterFrag = /* glsl */`
uniform float uTime; uniform vec3 uDeep, uShallow, uSky, uHorizon, uSunDir, uSunCol, uFog; uniform float uFogNear, uFogFar, uGlint;
varying vec3 vWorld;
float h(vec2 p) {
  return sin(p.x * 0.35 + uTime * 1.1) * 0.5 + sin(p.y * 0.27 - uTime * 0.9) * 0.5
       + sin((p.x + p.y) * 0.8 + uTime * 1.7) * 0.25 + sin((p.x * 1.7 - p.y * 1.3) + uTime * 2.3) * 0.15
       + sin((p.x * 3.1 + p.y * 2.3) - uTime * 3.1) * 0.07 * (1.0 - smoothstep(20.0, 120.0, length(vWorld - cameraPosition)));
}
void main() {
  vec2 p = vWorld.xz; float e = 0.12;
  float dx = (h(p + vec2(e, 0.0)) - h(p - vec2(e, 0.0))) / (2.0 * e);
  float dz = (h(p + vec2(0.0, e)) - h(p - vec2(0.0, e))) / (2.0 * e);
  float dist0 = length(vWorld - cameraPosition);
  float calm = 1.0 - smoothstep(60.0, 420.0, dist0);
  vec3 n = normalize(vec3(-dx * 0.32 * calm, 1.0, -dz * 0.32 * calm));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
  vec3 R = reflect(-V, n);
  vec3 sky = mix(uHorizon, uSky, clamp(R.y * 2.5, 0.0, 1.0));
  vec3 col = mix(uDeep, uShallow, 0.35 + 0.25 * h(p * 0.4));
  col = mix(col, sky, 0.2 + 0.7 * fres);
  float spec = pow(max(dot(R, normalize(uSunDir)), 0.0), 220.0) * uGlint;
  col += uSunCol * spec;
  float dist = length(vWorld - cameraPosition);
  col = mix(col, uFog, smoothstep(uFogNear, uFogFar * 1.6, dist) * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeWater(T, sunDir, y = 0, size = 4000) {
  const c = (s) => new THREE.Color(s);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uDeep: { value: c(T.waterDeep) }, uShallow: { value: c(T.waterShallow) },
      uSky: { value: c(T.skyMid) }, uHorizon: { value: c(T.skyHorizon) }, uSunDir: { value: sunDir.clone() },
      uSunCol: { value: c(T.sunColor) }, uFog: { value: c(T.fog) }, uFogNear: { value: T.fogNear }, uFogFar: { value: T.fogFar },
      uGlint: { value: T.moon ? 1.5 : 3 },
    },
    vertexShader: waterVert, fragmentShader: waterFrag,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.userData.update = (t) => { mat.uniforms.uTime.value = t; };
  return m;
}

// Gulls: tiny flapping V shapes circling lazily.
export function makeBirds(center, count = 9, seed = 5, color = '#f4f4f4') {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0.05, -0.25, 0.2, 0, -0.45], 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true });
  const birds = [];
  for (let i = 0; i < count; i++) {
    const b = new THREE.Group();
    const L = new THREE.Mesh(wing, mat), R = new THREE.Mesh(wing, mat);
    R.scale.x = -1;
    b.add(L, R);
    b.scale.setScalar(1.2 + rng());
    group.add(b);
    birds.push({ b, L, R, r: 25 + rng() * 70, h: 35 + rng() * 40, sp: 0.12 + rng() * 0.15, ph: rng() * 6.28, fl: 5 + rng() * 3 });
  }
  group.userData.update = (t) => {
    for (const q of birds) {
      const a = q.ph + t * q.sp;
      q.b.position.set(center.x + Math.cos(a) * q.r, center.y + q.h + Math.sin(t * 0.7 + q.ph) * 3, center.z + Math.sin(a) * q.r);
      q.b.rotation.y = -a;
      const f = Math.sin(t * q.fl + q.ph) * 0.6;
      q.L.rotation.z = f; q.R.rotation.z = -f;
    }
  };
  return group;
}
