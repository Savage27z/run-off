// Local progress. Every storage access is guarded: private windows and blocked storage just mean no persistence.
import { DEFAULT_COSTUME } from './costumes.js';

const KEY = 'runoff.save.v1';

function read(k) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch {} }

export const Save = {
  data: null,

  load() {
    let d = null;
    try { d = JSON.parse(read(KEY) || 'null'); } catch {}
    this.data = {
      costume: { ...DEFAULT_COSTUME, ...(d && d.costume) },
      settings: { sens: 1, invertY: false, fov: 72, volume: 0.8, ghost: true, quality: 'high', ...(d && d.settings) },
      maps: (d && d.maps) || {},
      lastMap: (d && d.lastMap) || 'rooftops',
      seenUnlocks: (d && d.seenUnlocks) || 0,
    };
    return this.data;
  },

  persist() { write(KEY, JSON.stringify(this.data)); },

  map(id) {
    if (!this.data.maps[id]) this.data.maps[id] = { best: null, medal: -1, splits: null, runs: 0 };
    return this.data.maps[id];
  },

  stars() {
    let s = 0;
    for (const m of Object.values(this.data.maps)) s += Math.max(0, (m.medal ?? -1) + 1);
    return s;
  },

  ghost(id) {
    try { return JSON.parse(read('runoff.ghost.' + id) || 'null'); } catch { return null; }
  },
  setGhost(id, g) { write('runoff.ghost.' + id, JSON.stringify(g)); },
};
