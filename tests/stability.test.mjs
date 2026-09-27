import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Player, P } from '../src/player.js';
import { Collision } from '../src/physics.js';
import { Input } from '../src/input.js';

// Use the exact Three.js build shipped by the game, without npm dependencies.
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('../vendor/three.module.js', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const THREE = await import('../vendor/three.module.js');
const { setupEnvironment } = await import('../src/world.js');

test('slides boost normal running without cutting earned momentum', () => {
  for (const [speed, expected] of [[8.5, 11.1], [14, 15], [18, 18]]) {
    const p = new Player(new Collision());
    p.vel.x = speed * 0.6; p.vel.z = speed * 0.8;
    p.enterSlide();
    assert.ok(Math.abs(p.hsp - expected) < 1e-9);
    assert.ok(Math.abs(p.vel.x / p.vel.z - 0.75) < 1e-9);
    assert.equal(p.state, 'slide');
    assert.equal(p.crouched, true);
    const boosted = p.hsp;
    p.enterSlide();
    assert.equal(p.hsp, boosted, 'cooldown prevents a second boost');
  }
});

test('slide-jump carries earned speed into the air', () => {
  const col = new Collision();
  col.add(-100, -1, -100, 100, 0, 100);
  const p = new Player(col);
  p.vel.z = 18;
  p.step(1 / 120, { mx: 0, mz: 1, camYaw: 0, slide: true, slideHeld: true });
  const speed = p.hsp;
  assert.ok(speed > 17.9);
  p.step(1 / 120, { mx: 0, mz: 1, camYaw: 0, jump: true, jumpHeld: true });
  assert.equal(p.state, 'air');
  assert.ok(Math.abs(p.hsp - speed) < 1e-9);
  assert.ok(p.vel.y > 0 && p.vel.y < P.jumpV);
});

test('focus loss clears held input, pending actions, and mouse deltas', (t) => {
  const events = new EventTarget();
  t.mock.method(globalThis, 'addEventListener', events.addEventListener.bind(events));
  const input = new Input();
  let blurred = false;
  input.onBlur = () => { blurred = true; };
  const key = new Event('keydown');
  Object.assign(key, { code: 'Space', repeat: false });
  events.dispatchEvent(key);
  input.dragging = input.mouseTrick = true;
  input.dx = 30; input.dy = 20;
  events.dispatchEvent(new Event('blur'));
  assert.equal(input.isDown('jump'), false);
  assert.equal(input.take('jump'), false);
  assert.deepEqual(input.consumeLook(), { dx: 0, dy: 0 });
  assert.equal(input.dragging, false);
  assert.equal(input.mouseTrick, false);
  assert.equal(blurred, true);
});

test('gamepad buttons register again after disconnection', (t) => {
  let pads = [{ connected: true, axes: [0, 0, 0, 0], buttons: [{ pressed: true }] }];
  t.mock.method(navigator, 'getGamepads', () => pads);
  const input = new Input();
  input.poll();
  assert.equal(input.take('jump'), true);
  pads = []; input.poll();
  assert.equal(input.isDown('jump'), false);
  pads = [{ connected: true, axes: [0, 0, 0, 0], buttons: [{ pressed: true }] }];
  input.poll();
  assert.equal(input.take('jump'), true);
});

test('unloading scenery disposes shared geometry/materials and shadow targets', () => {
  const scene = new THREE.Scene();
  const env = setupEnvironment(scene, 'day', { clouds: 1, hills: { count: 1 }, water: { y: 0 }, birds: [0, 0, 0] });
  scene.add(env.group);
  const resources = new Map();
  env.group.traverse((o) => {
    for (const resource of [o.geometry, o.material]) {
      if (!resource || resources.has(resource)) continue;
      resources.set(resource, 0);
      resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
    }
  });
  let shadows = 0;
  env.sun.shadow.map = { dispose() { shadows++; } };
  env.sun.shadow.mapPass = { dispose() { shadows++; } };
  env.dispose();
  assert.equal(env.group.parent, null);
  assert.equal(scene.children.length, 0);
  for (const count of resources.values()) assert.equal(count, 1);
  assert.equal(shadows, 2);
});

// Minimal browser event surface for input tests; no renderer is mocked.
globalThis.addEventListener = () => {};
globalThis.document = { addEventListener() {} };
navigator.getGamepads = () => [];
