// Every texture in the game is painted on a canvas at startup.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const cache = new Map();

function make(key, w, h, draw, { srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

function grain(g, w, h, amt, seed) {
  const rng = mulberry32(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function speckle(g, w, h, count, colors, seed, size = 2) {
  const rng = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[(rng() * colors.length) | 0];
    const s = 1 + rng() * size;
    g.fillRect(rng() * w, rng() * h, s, s);
  }
}

// Facade tile: 16m x 12m (4 bays x 4 floors), 32 px per metre.
// style: 'panel' | 'brick' | 'office' | 'ribbon'
export function facade(style, wall, seed) {
  const key = `fac:${style}:${wall}:${seed}`;
  const W = 512, H = 384, bay = 128, fl = 96;
  const rng = mulberry32(seed);
  const lit = [];
  const color = make(key, W, H, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    if (style === 'brick') {
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
      for (let y = 0; y < H; y += 8) {
        g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
        const off = (y / 8) % 2 ? 8 : 0;
        for (let x = off; x < W; x += 16) { g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 0.5, y + 8); g.stroke(); }
      }
    }
    grain(g, W, H, 22, seed);
    for (let r = 0; r < 4; r++) {
      const y0 = r * fl;
      g.fillStyle = 'rgba(0,0,0,0.13)';
      g.fillRect(0, y0 + fl - 6, W, 6);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(0, y0 + fl - 8, W, 2);
      if (style === 'shoji') {
        g.fillStyle = '#3a2a20';
        g.fillRect(0, y0 + fl - 12, W, 12);
        g.fillRect(0, y0, W, 5);
        for (let c = 0; c < 4; c++) {
          const x0 = c * bay;
          g.fillStyle = '#3a2a20'; g.fillRect(x0, y0, 9, fl);
          const wx = x0 + 18, wy = y0 + 12, ww = 94, wh = fl - 30;
          g.fillStyle = '#efe6d0'; g.fillRect(wx, wy, ww, wh);
          g.fillStyle = 'rgba(160,130,90,0.25)'; g.fillRect(wx, wy + wh * 0.6, ww, wh * 0.4);
          g.fillStyle = '#4a3526';
          for (let k = 1; k < 4; k++) g.fillRect(wx + (ww * k) / 4 - 1, wy, 2, wh);
          for (let k = 1; k < 3; k++) g.fillRect(wx, wy + (wh * k) / 3 - 1, ww, 2);
          g.strokeStyle = '#3a2a20'; g.lineWidth = 4; g.strokeRect(wx, wy, ww, wh);
          lit.push([wx, wy, ww, wh, r]);
        }
        continue;
      }
      if (style === 'office') {
        g.fillStyle = '#e8eef4'; g.fillRect(0, y0 + 10, W, fl - 22);
        for (let x = 0; x < W; x += 48) {
          const grd = g.createLinearGradient(0, y0 + 10, 0, y0 + fl - 12);
          grd.addColorStop(0, '#9fd0f2'); grd.addColorStop(0.5, '#4f86b8'); grd.addColorStop(1, '#27456a');
          g.fillStyle = grd; g.fillRect(x + 2, y0 + 12, 44, fl - 26);
          g.fillStyle = '#f0f4f8'; g.fillRect(x, y0 + 10, 3, fl - 22);
          lit.push([x + 2, y0 + 12, 44, fl - 26, r]);
        }
        continue;
      }
      for (let c = 0; c < 4; c++) {
        const x0 = c * bay;
        let wx, wy, ww, wh;
        if (style === 'ribbon') { wx = x0; ww = bay; wy = y0 + 22; wh = 38; }
        else if (style === 'modern') { wx = x0 + 10; ww = 108; wy = y0 + 10; wh = 66; }
        else { wx = x0 + 22; ww = 84; wy = y0 + 18; wh = 54; }
        if (style === 'brick') {
          g.fillStyle = 'rgba(245,238,225,0.9)'; g.fillRect(wx - 5, wy - 8, ww + 10, 7);
        }
        const frame = style === 'modern' ? '#1e2126' : '#f4f2ec';
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        g.fillStyle = frame; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
        const grd = g.createLinearGradient(0, wy, 0, wy + wh);
        grd.addColorStop(0, '#a9d2ee'); grd.addColorStop(0.45, '#5a82a6'); grd.addColorStop(1, '#2c4058');
        g.fillStyle = grd; g.fillRect(wx, wy, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.beginPath(); g.moveTo(wx + ww * 0.1, wy + wh); g.lineTo(wx + ww * 0.45, wy); g.lineTo(wx + ww * 0.6, wy); g.lineTo(wx + ww * 0.25, wy + wh); g.fill();
        if (style !== 'modern') { g.fillStyle = '#f4f2ec'; g.fillRect(wx - 6, wy + wh + 2, ww + 12, 5); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(wx - 6, wy + wh + 7, ww + 12, 2); }
        g.fillStyle = frame;
        if (style !== 'ribbon') {
          g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
          g.fillRect(wx, wy + wh * 0.38, ww, 2);
        } else {
          for (let m = 0; m < ww; m += 32) g.fillRect(wx + m, wy, 2, wh);
        }
        lit.push([wx, wy, ww, wh, r]);
      }
    }
  });
  const emissive = make(key + ':e', W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const warm = ['#ffd49a', '#ffc27a', '#ffe7c2', '#fff1d8'];
    const cool = ['#bfe0ff', '#9ec9ff', '#d9f0ff'];
    for (const [x, y, w, h] of lit) {
      if (rng() > 0.42) continue;
      const pal = rng() < 0.75 ? warm : cool;
      g.fillStyle = pal[(rng() * pal.length) | 0];
      g.globalAlpha = 0.55 + rng() * 0.45;
      g.fillRect(x, y, w, h);
      if (rng() < 0.35) { g.fillStyle = '#000'; g.globalAlpha = 0.6; g.fillRect(x, y, w, h * (0.2 + rng() * 0.5)); }
    }
    g.globalAlpha = 1;
  }, { srgb: true });
  return { color, emissive };
}

export const roof = () => make('roof', 256, 256, (g, w, h) => {
  g.fillStyle = '#a39d93'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, ['#958f86', '#b2aca2', '#8a847b', '#bdb7ad'], 11, 2);
  g.strokeStyle = 'rgba(20,20,20,0.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 128); g.lineTo(w, 128); g.moveTo(128, 0); g.lineTo(128, h); g.stroke();
  grain(g, w, h, 18, 12);
});

export const concrete = () => make('concrete', 256, 256, (g, w, h) => {
  g.fillStyle = '#a19e98'; g.fillRect(0, 0, w, h);
  grain(g, w, h, 26, 21);
  speckle(g, w, h, 700, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.1)'], 22, 3);
  g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (const [x, y] of [[32, 32], [224, 32], [32, 224], [224, 224]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
});

export const ribbed = () => make('ribbed', 256, 256, (g, w, h) => {
  for (let x = 0; x < w; x += 16) {
    const grd = g.createLinearGradient(x, 0, x + 16, 0);
    grd.addColorStop(0, '#9a9a9a'); grd.addColorStop(0.3, '#e6e6e6'); grd.addColorStop(0.6, '#c4c4c4'); grd.addColorStop(1, '#7c7c7c');
    g.fillStyle = grd; g.fillRect(x, 0, 16, h);
  }
  grain(g, w, h, 16, 31);
  speckle(g, w, h, 160, ['rgba(110,60,30,0.35)', 'rgba(80,40,20,0.3)'], 32, 5);
});

export const asphalt = () => make('asphalt', 512, 512, (g, w, h) => {
  g.fillStyle = '#45474e'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 9000, ['#4c4e55', '#3e4046', '#55575e'], 41, 2);
  g.fillStyle = 'rgba(230,220,180,0.55)';
  for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 3, y, 6, 34);
});

export const hazard = () => make('hazard', 128, 128, (g, w, h) => {
  g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f5c518';
  for (let i = -2; i < 4; i++) {
    g.beginPath();
    g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 32 + h, h); g.lineTo(i * 64 + h, h);
    g.fill();
  }
  grain(g, w, h, 20, 51);
});

export const planks = () => make('planks', 256, 256, (g, w, h) => {
  g.fillStyle = '#9b7447'; g.fillRect(0, 0, w, h);
  const rng = mulberry32(61);
  for (let y = 0; y < h; y += 32) {
    g.fillStyle = `hsl(30, ${35 + rng() * 15}%, ${34 + rng() * 10}%)`;
    g.fillRect(0, y + 1, w, 30);
    g.strokeStyle = 'rgba(40,20,5,0.25)';
    for (let k = 0; k < 6; k++) { g.beginPath(); const yy = y + 4 + rng() * 24; g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + 3, w * 0.6, yy - 3, w, yy); g.stroke(); }
  }
  grain(g, w, h, 16, 62);
});

export const checker = () => make('checker', 128, 128, (g) => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4';
    g.fillRect(x * 16, y * 16, 16, 16);
  }
});

export const water = () => make('water', 256, 256, (g, w, h) => {
  g.fillStyle = '#0d1b26'; g.fillRect(0, 0, w, h);
  const rng = mulberry32(71);
  g.strokeStyle = 'rgba(120,170,200,0.12)';
  for (let i = 0; i < 90; i++) {
    const x = rng() * w, y = rng() * h, l = 8 + rng() * 30;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
  }
});


// Board-formed concrete: horizontal plank imprints, panel seams, tie holes, soft water stains.
export const concBoard = () => make('concboard', 512, 512, (g, w, h) => {
  const rng = mulberry32(501);
  g.fillStyle = '#b9b7b1'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    g.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rng() * 0.05})`;
    g.fillRect(0, y, w, 16);
    g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, y + 15, w, 1);
  }
  grain(g, w, h, 20, 502);
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
  g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.3)';
  for (const x of [64, 192, 320, 448]) for (const y of [64, 192, 320, 448]) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) {
    const x = rng() * w, len = 60 + rng() * 200;
    const grd = g.createLinearGradient(0, 0, 0, len);
    grd.addColorStop(0, 'rgba(60,55,50,0.14)'); grd.addColorStop(1, 'rgba(60,55,50,0)');
    g.fillStyle = grd; g.fillRect(x, 0, 6 + rng() * 14, len);
  }
});

// Welded-mesh fence panel (alpha-tested).
export const fenceMesh = () => make('fence', 128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#26292e';
  for (let i = 0; i <= 16; i++) { g.fillRect(i * 8 - 1, 0, 2, h); g.fillRect(0, i * 8 - 1, w, 2); }
  g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
});


// Curved clay roof tiles seen along the slope (u across, v down the slope). 1 texture = 2m x 2m.
export function roofTiles(key, base, dark) {
  return make('rtile:' + key, 256, 256, (g, w, h) => {
    g.fillStyle = dark; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      const grd = g.createLinearGradient(x, 0, x + 32, 0);
      grd.addColorStop(0, dark); grd.addColorStop(0.25, base); grd.addColorStop(0.5, '#ffffff22'); grd.addColorStop(0.75, base); grd.addColorStop(1, dark);
      g.fillStyle = grd; g.fillRect(x + 2, 0, 28, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < h; y += 38) g.fillRect(0, y, w, 4);
    grain(g, w, h, 14, key.length * 7);
  });
}

// Rough stone wall blocks. 1 texture = 3m.
export const stoneWall = () => make('stone', 256, 256, (g, w, h) => {
  const rng = mulberry32(611);
  g.fillStyle = '#4e4a44'; g.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const rh = 22 + rng() * 22;
    let x = -rng() * 30;
    while (x < w) {
      const rw = 30 + rng() * 44;
      const t = 120 + rng() * 50;
      g.fillStyle = `rgb(${t + 10},${t + 4},${t - 6})`;
      g.beginPath();
      g.roundRect ? g.roundRect(x + 2, y + 2, rw - 4, rh - 4, 6) : g.rect(x + 2, y + 2, rw - 4, rh - 4);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 4, y + 3, rw - 8, 3);
      x += rw;
    }
    y += rh;
  }
  grain(g, w, h, 22, 612);
});

export const clay = () => make('clay', 256, 256, (g, w, h) => {
  g.fillStyle = '#c0663e'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, ['#b15a34', '#cd7448', '#a44f2e', '#d8845a'], 621, 2.5);
  const rng = mulberry32(622);
  g.strokeStyle = 'rgba(80,30,15,0.25)'; g.lineWidth = 1.5;
  for (let i = 0; i < 18; i++) {
    let x = rng() * w, y = rng() * h;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 40; y += (rng() - 0.5) * 40; g.lineTo(x, y); }
    g.stroke();
  }
});

export function poster(variant) {
  const pal = [['#f24d8c', '#2fd0c0', '#1b1b24'], ['#ffd23f', '#3a5cf0', '#1b1b24'], ['#7ae04a', '#ff5a1f', '#1b1b24'], ['#e8e4d8', '#e8412a', '#222']][variant % 4];
  return make('poster:' + variant, 256, 384, (g, w, h) => {
    const rng = mulberry32(700 + variant);
    g.fillStyle = pal[0]; g.fillRect(0, 0, w, h);
    g.fillStyle = pal[1];
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(rng() * w, rng() * h, 20 + rng() * 70, 0, 7); g.fill(); }
    g.fillStyle = pal[2];
    g.beginPath(); g.ellipse(w / 2, h * 0.42, 70, 90, 0, 0, 7); g.fill();
    g.fillStyle = pal[0];
    g.beginPath(); g.arc(w / 2 - 26, h * 0.4, 16, 0, 7); g.arc(w / 2 + 26, h * 0.4, 16, 0, 7); g.fill();
    g.fillStyle = pal[2];
    g.font = 'bold 54px Anton, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText(['RUNOFF', 'FRESH', 'LEAP', 'NO BRAKES'][variant % 4], w / 2, h * 0.86);
    grain(g, w, h, 18, 710 + variant);
  });
}


// Birch plywood: pale sheet with long grain and faint sheet seams. 1 texture = 2.4m.
export const plywood = () => make('plywood', 256, 256, (g, w, h) => {
  const rng = mulberry32(801);
  g.fillStyle = '#d6b27a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y = rng() * h, a = 0.05 + rng() * 0.1;
    g.strokeStyle = rng() < 0.5 ? `rgba(150,100,50,${a})` : `rgba(255,235,200,${a})`;
    g.lineWidth = 1 + rng() * 2.5;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * (2 + rng() * 5));
    g.stroke();
  }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(120,80,40,0.25)'; g.beginPath(); g.ellipse(rng() * w, rng() * h, 3 + rng() * 5, 2 + rng() * 2, 0, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(90,60,30,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  grain(g, w, h, 12, 802);
});

// Tall steel factory window: bright daylight panes in a black grid.
export const factoryWindow = () => make('factorywin', 256, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#f4f8fc'); grd.addColorStop(1, '#c8d8e6');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 70, h); g.lineTo(i * 70 + 40, 0); g.lineTo(i * 70 + 60, 0); g.lineTo(i * 70 + 20, h); g.fill(); }
  g.fillStyle = '#1e2024';
  for (let i = 0; i <= 8; i++) g.fillRect(i * 32 - 2, 0, 4, h);
  for (let i = 0; i <= 4; i++) g.fillRect(0, i * 64 - 3, w, 6);
});

// Coloured foam cube faces.
export function foam(color) {
  return make('foam:' + color, 64, 64, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 400, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.15)'], color.length * 11, 1.5);
  });
}

export function textTexture(text, { color = '#ff3b6b', bg = null, font = 'bold 120px Anton, Impact, sans-serif', w = 1024, h = 256, glow = true } = {}) {
  const key = `txt:${text}:${color}:${bg}:${w}x${h}`;
  return make(key, w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = color; g.shadowBlur = 24; }
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 6);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillText(text, w / 2, h / 2 + 6);
  });
}

export function arrowTexture(color = '#ffb020') {
  return make('arrow:' + color, 512, 128, (g, w, h) => {
    g.shadowColor = color; g.shadowBlur = 18;
    g.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 110;
      g.beginPath(); g.moveTo(x, 24); g.lineTo(x + 60, 64); g.lineTo(x, 104); g.lineTo(x + 26, 64); g.fill();
    }
  });
}

export function glowSprite() {
  return make('glow', 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}

// Light roof pavers with grout, per-tile tone variation (1 tile = 1m, texture = 4m).
export function pavers(key, base, grout, jitter = 10) {
  return make('pav:' + key, 256, 256, (g, w, h) => {
    const rng = mulberry32(key.length * 97 + 13);
    g.fillStyle = grout; g.fillRect(0, 0, w, h);
    const c = parseInt(base.slice(1), 16);
    const r0 = (c >> 16) & 255, g0 = (c >> 8) & 255, b0 = c & 255;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const d = (rng() - 0.5) * jitter;
      g.fillStyle = `rgb(${r0 + d},${g0 + d},${b0 + d})`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 3);
    }
    grain(g, w, h, 10, key.length);
  });
}

export function stripes(a, b, n = 8) {
  return make(`str:${a}:${b}:${n}`, 128, 128, (g, w, h) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / n, 0, w / n + 1, h); }
    grain(g, w, h, 8, 3);
  });
}

export const grass = () => make('grass', 128, 128, (g, w, h) => {
  g.fillStyle = '#5da84a'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1400, ['#4f9640', '#6cba55', '#7cc860', '#468a3a'], 81, 2);
});

export const sand = () => make('sand', 128, 128, (g, w, h) => {
  g.fillStyle = '#e9d6a8'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1600, ['#dcc696', '#f2e2b8', '#d4bd8a'], 91, 1.5);
});

export const solar = () => make('solar', 128, 128, (g, w, h) => {
  g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const grd = g.createLinearGradient(0, y * 32, 0, y * 32 + 30);
    grd.addColorStop(0, '#3a66b8'); grd.addColorStop(1, '#1a2f6a');
    g.fillStyle = grd; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
  }
});
