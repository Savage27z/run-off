// Post stack: scene -> GTAO (contact shadows) -> bloom -> colour grade -> output (tone map + sRGB).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1.1 }, uContrast: { value: 1.05 }, uVig: { value: 0.25 },
    uLift: { value: new THREE.Vector3(0, 0, 0) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uSat, uContrast, uVig; uniform vec3 uLift, uGain;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb * uGain + uLift;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18);
      float d = distance(vUv, vec2(0.5));
      col *= mix(1.0, 1.0 - uVig, smoothstep(0.3, 0.9, d));
      gl_FragColor = vec4(col, c.a);
    }`,
};

export const GRADES = {
  haze: { bloom: [0.5, 0.65, 0.78], sat: 1.02, contrast: 0.97, vig: 0.3, lift: [0.03, 0.02, 0.022], gain: [1.03, 0.99, 0.96] },
  hall: { bloom: [0.32, 0.5, 0.92], sat: 1.08, contrast: 1.05, vig: 0.28, lift: [0.01, 0.008, 0.004], gain: [1.04, 1.0, 0.95] },
  dusk: { bloom: [0.55, 0.55, 0.82], sat: 1.12, contrast: 1.06, vig: 0.3, lift: [0.01, 0.0, 0.02], gain: [1.04, 0.98, 1.0] },
  night: { bloom: [0.85, 0.6, 0.75], sat: 1.22, contrast: 1.08, vig: 0.36, lift: [0.004, 0.002, 0.012], gain: [1.02, 1.0, 1.0] },
  day: { bloom: [0.28, 0.4, 0.95], sat: 1.14, contrast: 1.04, vig: 0.2, lift: [0.0, 0.0, 0.01], gain: [1.02, 1.0, 0.98] },
};

export class Post {
  constructor(renderer, scene, camera) {
    this.r = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.gtao = new GTAOPass(scene, camera, size.x, size.y);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.9;
    this.gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
    this.composer.addPass(this.gtao);
    this.bloom = new UnrealBloomPass(size.clone(), 0.5, 0.5, 0.85);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.enabled = true;
  }

  setTheme(theme) {
    const g = GRADES[theme] || GRADES.day;
    [this.bloom.strength, this.bloom.radius, this.bloom.threshold] = g.bloom;
    const u = this.grade.uniforms;
    u.uSat.value = g.sat; u.uContrast.value = g.contrast; u.uVig.value = g.vig;
    u.uLift.value.set(...g.lift); u.uGain.value.set(...g.gain);
  }

  setQuality(q) {
    this.gtao.enabled = q !== 'low';
    this.bloom.enabled = true;
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.r.getPixelRatio());
    this.composer.setSize(w, h);
  }

  render() { this.composer.render(); }
}
