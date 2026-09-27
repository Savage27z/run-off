// Character materials. The body is one physical material; per-vertex attributes pick roughness,
// metal and glow, and the head's (az, el) coordinates drive a painted mouth, brows and blush.
import * as THREE from 'three';

export function makeBodyMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.8, metalness: 0,
    sheen: 0.6, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffffff'),
    clearcoat: 0.04, clearcoatRoughness: 0.5,
  });
  const u = {
    uMouth: { value: new THREE.Vector4(0.6, 0.11, 0, 0) },
    uBrow: { value: new THREE.Vector3(0, 0, 0) },
    uBlush: { value: 0.6 },
    uBrowCol: { value: new THREE.Color('#2a1a12') },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aFace;\nattribute vec3 aMat;\nvarying vec2 vFace;\nvarying vec3 vMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFace = aFace;\nvMat = aMat;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec4 uMouth; uniform vec3 uBrow; uniform float uBlush; uniform vec3 uBrowCol;
varying vec2 vFace; varying vec3 vMat;
float aaBand(float d, float w) { float fw = fwidth(d) * 0.9 + 1e-5; return 1.0 - smoothstep(w - fw, w + fw, d); }
`)
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vFace.x < 8.0) {
  vec2 f = vFace;
  // blush
  vec2 bq = (vec2(abs(f.x), f.y) - vec2(0.52, -0.16)) / vec2(0.12, 0.075);
  float bl = exp(-dot(bq, bq) * 1.4) * uBlush;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 0.72, 0.72), bl * 0.55);
  // brows
  float bx = abs(f.x) - 0.36;
  float yb = 0.475 + uBrow.x * 0.07 - 1.5 * bx * bx + uBrow.y * bx * 0.45;
  float bth = 0.024 * (1.0 - smoothstep(0.06, 0.15, abs(bx + 0.02)));
  float brow = aaBand(abs(f.y - yb), bth) * step(abs(bx + 0.02), 0.15);
  diffuseColor.rgb = mix(diffuseColor.rgb, uBrowCol, brow);
  // mouth
  float w = uMouth.y * (1.0 + uMouth.z * 0.15);
  float mu = clamp(f.x / w, -1.0, 1.0);
  float yc = -0.345 + uMouth.x * 0.05 * (mu * mu - 0.35) + uMouth.w * f.x;
  float inX = step(abs(f.x), w);
  vec3 lineCol = vec3(0.17, 0.05, 0.06);
  if (uMouth.z < 0.06) {
    float th = 0.0105 * (1.0 - 0.55 * pow(abs(mu), 4.0));
    float ln = aaBand(abs(f.y - yc), th) * (1.0 - smoothstep(0.9, 1.0, abs(mu)));
    diffuseColor.rgb = mix(diffuseColor.rgb, lineCol, ln);
  } else {
    float top = yc + 0.006;
    float bot = yc - uMouth.z * 0.095 * (1.0 - mu * mu);
    float dIn = max(max(f.y - top, bot - f.y), abs(f.x) - w);
    float inside = 1.0 - smoothstep(-0.002, 0.002, dIn);
    vec3 c = mix(vec3(0.3, 0.04, 0.07), vec3(0.14, 0.02, 0.05), smoothstep(bot, top, f.y));
    float tongue = smoothstep(bot + 0.035 * uMouth.z, bot + 0.01, f.y);
    c = mix(c, vec3(0.93, 0.42, 0.47), tongue * 0.9);
    float teeth = smoothstep(top - 0.02, top - 0.014, f.y) * step(0.25, uMouth.z);
    c = mix(c, vec3(0.97, 0.96, 0.94), teeth);
    diffuseColor.rgb = mix(diffuseColor.rgb, c, inside);
    float edge = aaBand(abs(dIn), 0.006);
    diffuseColor.rgb = mix(diffuseColor.rgb, lineCol, edge * 0.85);
  }
}
`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vMat.z;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMat.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vMat.x * 0.55;');
  };
  m.customProgramCacheKey = () => 'runoff-body';
  return m;
}

export function makeHairMaterial() {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.25,
    sheen: 0.9, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ffffff'),
  });
}

const eyeVert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const eyeFrag = /* glsl */`
uniform vec3 uIris, uIris2; uniform vec2 uLook; uniform float uBlink, uSide, uPupil, uLit;
varying vec2 vUv;
void main() {
  vec2 p = vUv; p.x *= uSide;
  // almond-ish outline: a touch flatter on the lower inner corner
  float sy = p.y > 0.0 ? 2.3 : 2.0;
  float shape = pow(abs(p.x), 2.2) + pow(abs(p.y), sy);
  if (shape > 1.0) discard;
  float lid = 1.0 - 2.05 * uBlink + 0.06 * p.x;
  float lw = 0.13;
  if (p.y > lid + lw * 0.2) discard;
  vec3 col = mix(vec3(0.86, 0.87, 0.92), vec3(1.0), smoothstep(-1.0, 0.3, p.y));
  vec2 q = (p - uLook * vec2(0.32, 0.26)) / vec2(0.66, 0.74);
  float r = length(q);
  float ang = atan(q.y, q.x);
  vec3 iris = mix(uIris2, uIris, smoothstep(0.55, -0.75, q.y));
  iris *= 0.86 + 0.14 * sin(ang * 23.0 + 3.0 * sin(ang * 5.0));
  iris = mix(iris, iris * 0.3, smoothstep(0.72, 1.0, r));
  col = mix(col, iris, 1.0 - smoothstep(0.96, 1.0, r));
  vec2 pq = (q - vec2(0.0, 0.03)) * vec2(1.0, 0.8);
  float pd = length(vec2(pq.x, max(abs(pq.y) - 0.08, 0.0))) - 0.3 * uPupil;
  col = mix(col, vec3(0.015, 0.015, 0.03), 1.0 - smoothstep(-0.02, 0.02, pd));
  float c1 = 1.0 - smoothstep(0.15, 0.19, length((q - vec2(-0.3, 0.38)) * vec2(1.0, 0.82)));
  float c2 = 1.0 - smoothstep(0.06, 0.09, length(q - vec2(0.32, -0.34)));
  col = mix(col, vec3(1.0), max(c1, c2 * 0.8));
  // upper shadow from the lid, lash line, lower rim
  col *= mix(0.72, 1.0, smoothstep(lid - 0.55, lid - 0.1, lid - p.y + 0.0) );
  float lash = smoothstep(0.66, 0.8, shape) * smoothstep(-0.25, 0.25, p.y);
  lash = max(lash, 1.0 - smoothstep(lw * 0.5, lw, lid - p.y));
  float flick = 1.0 - smoothstep(0.08, 0.12, length((p - vec2(0.93, 0.28)) * vec2(1.0, 1.6)));
  lash = max(lash, flick);
  col = mix(col, vec3(0.018, 0.018, 0.03), lash);
  col = mix(col, col * 0.75, smoothstep(0.75, 0.95, shape) * (1.0 - step(0.0, p.y)));
  gl_FragColor = vec4(col * uLit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeEyeMaterial(side) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uIris: { value: new THREE.Color('#ffb21c') }, uIris2: { value: new THREE.Color('#ff6a00') },
      uLook: { value: new THREE.Vector2() }, uBlink: { value: 0 }, uSide: { value: side },
      uPupil: { value: 1 }, uLit: { value: 1 },
    },
    vertexShader: eyeVert, fragmentShader: eyeFrag,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
