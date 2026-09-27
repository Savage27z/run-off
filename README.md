# RUNOFF

Rooftop parkour time-trials in the browser. three.js, no build step, and everything is procedural: the characters, costumes, buildings, textures and sound are all generated in code. There are no asset files.

## Run it

```bash
python serve.py
```

Then open http://localhost:5173. Use `serve.py` rather than opening the file directly, because ES modules need a server. It also disables caching, so your edits show up on refresh.

## Controls

| | Keyboard / mouse | Gamepad |
|---|---|---|
| Run | WASD | Left stick |
| Look | Mouse (click to capture) | Right stick |
| Jump | Space | A |
| Slide / roll / dive | Shift or C | B / triggers |
| Flip (trick) | E, F or left click | X / RB |
| Restart | R | Y |
| Last checkpoint | Q | LB |
| Pause | Esc | Start |

## Moves

Momentum is the core system. Speed above run pace (8.5 m/s) decays slowly, so clean chains keep you fast.

- **Slide**: Shift while running. It gives a +2.6 m/s boost (1.1s cooldown) and gets you under low obstacles.
- **Slide-jump**: jump out of a slide and you keep the boosted speed. This is how you clear long gaps.
- **Vault**: run straight into a waist-high wall and you vault it without losing speed.
- **Climb**: jump into a ledge up to about 1.6m above your feet.
- **Wall-run**: jump at a wall at an angle while holding forward. Jump again to wall-jump (+1 m/s).
- **Wall-climb**: jump *into* a tall wall head-on to run up it, then grab the ledge. Jump during it to kick off backwards.
- **Roll**: tap Shift just before a big landing. You keep your speed plus a little extra, where a missed roll means a stumble.

## Stunts

- **Flip**: press E in the air. Hold back for a backflip and left or right for a side flip. Press it again mid-flip to go for a double or triple.
- **Flip-jump**: press E on the ground. Standing still gives a backflip; moving gives a front flip.
- **Wall flip**: jump during a wall-climb to kick off with a backflip.
- **Dive**: press Shift high in the air. You go superman with a speed boost and land in a dive roll. Your hitbox shrinks, so you fit through gaps.
- **Land it clean** for +0.9 m/s per rotation, and a big drop auto-rolls. **Land mid-rotation and you bail**: you crash and lose your combo.
- **Bounce pads** (striped awnings, tarps, safety nets) launch you high for flip chains.
- **Style score**: every move feeds a combo. Variety raises the multiplier, repeats are worth half, and the chain ends if you stop for 2.2s. Your best style is saved per course.

## Courses

Every course is roughly 40–50 seconds on a clean run.

1. **Rooftops** (dusk): a coastal city that teaches every move, then tests it with wall-runs on both sides, a slide-jump gap and a big drop.
2. **Docks** (night): a container yard with a high line and a ground route, the ship, pontoons, a second terminal and a container-pyramid finish.
3. **Skeleton** (day): a vertical construction site, with beam walks over a safety net and the crane jib 25m up.
4. **Concrete Park** (day): brutalist terraces, a skate bowl, bridge walkways and a footbridge over the river to the far bank.
5. **Old Town** (haze): a lantern quarter. The tiled roofs are ramps you run up and over; then a clay courtyard, shrine, canal bridge, market and the temple roof.
6. **Training Yard** (haze): a parkour yard with a vault garden, balance beams over a pit, wall-run lanes, a scaffold stair tower, pillar jumps, a climbing wall, a hurdle deck and two launches into clay courtyards.
7. **The Depot** (indoor): an indoor parkour gym in an old rail depot, with box stairs, a truss bridge over a foam pit, a wall maze, the mezzanine and block hops up to the tower.

Open `http://localhost:5173/?all` to unlock every course without earning stars.

## Progression

Each course has **Bronze / Silver / Gold / Ace** times, worth 1–4 ★. Stars unlock courses (Docks 1★, Skeleton 3★, Concrete Park 5★, Old Town 7★, Training Yard 9★, The Depot 11★) and gear in the Locker: 6 tops, 4 bottoms, 3 shoes, 8 hairstyles, 11 hats, 5 face items, 6 back items (the scarf and cape use cloth physics), 7 speed trails and 17 colours. Your best run is saved as a **ghost** that you race next time.

## Project layout

```
src/
  main.js      game loop, state machine (title/maps/locker/play/results)
  player.js    parkour controller: fixed 120Hz step, swept-AABB collision, all moves
  rig.js       runner: pose-blended animation (incl. flips/dives/bails), face animation, accessories, cloth, trail
  char/        sculpted skinned character: geo.js (sweeps, lofts), build.js (skeleton, head, clothes, sneakers, hair), mats.js (face + eye shaders)
  style.js     trick/combo scoring
  post.js      GTAO + bloom + colour grade
  env.js       clouds, hills, animated sea, gulls
  costumes.js  item + colour catalog and unlock thresholds
  maps.js      the seven courses (+ checkpoints, hints, medal times)
  builder.js   level vocabulary: buildings, containers, I-beams, scaffolds, signs, skylines
  world.js     merges all geometry per material; sky shader; themes (dusk/night/day)
  trial.js     timer, splits, medals, ghost record/playback
  textures.js  canvas-painted textures (facades with lit windows, gravel, corrugated metal…)
  audio.js     WebAudio synth sfx (footsteps per surface, wind, whooshes, chimes)
  camera.js    third-person follow cam with collision, speed FOV, wall-run tilt
  input.js     keyboard, mouse (pointer lock with drag fallback), gamepad
  save.js      localStorage progress + ghosts
  dev/routes.js  route bot that proves every course is finishable
```

## Testing courses

Controller/input/resource regression checks (Node.js 24+, no npm install):

```bash
node --test tests/stability.test.mjs
```

These cover slide momentum, slide-jump speed, focus loss, gamepad reconnection,
and scenery/shadow disposal. Browser playtesting is still needed for camera,
animation, pointer-lock behavior, and frame rate.

After editing a map, open the browser console and run:

```js
await RUNOFF.test()           // every course, every route
await RUNOFF.test('docks')    // one course
```

A bot drives the real controller through each course and reports its checkpoint splits and finish time, or where it got stuck.

## Adding a map

Add an entry to `MAPS` in `src/maps.js`. It needs `spawn`, `checkpoints` (made with `gate(...)`), `medals`, `killY`, a `theme` and a `build(b)` function that uses the `Builder` helpers. Courses run toward +z. Note that with the camera facing +z, **+x is on the player's left**. Then add a route to `src/dev/routes.js` and run the test.
