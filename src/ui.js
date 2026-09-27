import { MAPS } from './maps.js';
import { MEDALS } from './trial.js';
import { ITEMS, COLORS, SKIN_TONES, HAIR_COLORS, EYE_COLORS, randomCostume } from './costumes.js';
import { fmtTime, fmtDiff, mulberry32 } from './util.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const THEME_ART = {
  dusk: 'linear-gradient(160deg, #262b6b 0%, #b0507a 55%, #ff9a62 100%)',
  night: 'linear-gradient(160deg, #03050d 0%, #13204a 60%, #ff2e88 140%)',
  day: 'linear-gradient(160deg, #2f6fd0 0%, #9cc8f0 70%, #f5c518 140%)',
  park: 'linear-gradient(160deg, #62a8f0 0%, #cfe8fb 55%, #b9b7b1 100%)',
};

const TABS = [
  { id: 'body', label: 'Body' },
  { id: 'hair', label: 'Hair', color: 'hairColor', palette: 'hair' },
  { id: 'hat', label: 'Hat', color: 'hatColor' },
  { id: 'face', label: 'Face' },
  { id: 'top', label: 'Top', color: 'topColor' },
  { id: 'bottom', label: 'Bottom', color: 'bottomColor' },
  { id: 'shoes', label: 'Shoes', color: 'shoeColor' },
  { id: 'back', label: 'Back', color: 'backColor' },
  { id: 'trail', label: 'Trail' },
];

export class UI {
  constructor(game) {
    this.g = game;
    this.tab = 'top';
    this.hintText = null;
    this.splitTimer = 0;
    this.toastTimer = 0;
    this.el = {
      time: $('#time'), split: $('#split'), cps: $('#cps'), target: $('#target'), pb: $('#pb'),
      speed: $('#speed'), speedFill: $('#speed-fill'), hint: $('#hint'), prompt: $('#prompt'), toast: $('#toast'),
    };
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => { game.sfx.init(); game.sfx.click(); game.goto(b.dataset.go); }));
    $$('button').forEach((b) => b.addEventListener('mouseenter', () => game.sfx.hover()));
    $('#resume').addEventListener('click', () => game.resume());
    $('#restart').addEventListener('click', () => game.restart());
    $('#quit').addEventListener('click', () => game.goto('title'));
    $('#res-retry').addEventListener('click', () => game.restart());
    $('#res-menu').addEventListener('click', () => game.goto('maps'));
    $('#res-next').addEventListener('click', () => game.nextMap());
    $('#randomize').addEventListener('click', () => {
      game.sfx.click();
      const c = randomCostume(mulberry32((Math.random() * 1e9) | 0), game.save.stars());
      this.setCostume(c);
    });
    this.bindSettings();
  }

  show(name) {
    for (const s of ['title', 'maps', 'locker', 'settings', 'pause', 'results']) $('#' + s).classList.toggle('hidden', s !== name);
    $('#hud').classList.toggle('hidden', !(name === 'hud' || name === 'pause' || name === 'results'));
    if (name === 'maps') this.buildMaps();
    if (name === 'locker') this.buildLocker();
    if (name === 'settings') this.syncSettings();
    this.refreshStars();
  }

  refreshStars() {
    const s = this.g.save.stars();
    $('#star-count').textContent = s;
    $$('.star-count').forEach((e) => (e.textContent = s));
  }

  // ---------- maps ----------
  buildMaps() {
    const stars = this.g.save.stars();
    const list = $('#map-list');
    list.innerHTML = '';
    MAPS.forEach((m, i) => {
      const rec = this.g.save.map(m.id);
      const locked = stars < m.unlock && !new URLSearchParams(location.search).has('all');
      const card = document.createElement('button');
      card.className = 'map-card' + (locked ? ' locked' : '');
      const dots = MEDALS.map((md, k) => `<span class="medal-dot ${rec.medal >= k ? 'on' : ''}" title="${md.name} ${fmtTime(m.medals[k])}" style="${rec.medal >= k ? `background:${md.color}` : ''}"></span>`).join('');
      card.innerHTML = `
        <div class="art" style="background:${THEME_ART[m.id] || THEME_ART[m.theme]}"><span class="theme">${m.theme}</span><span class="num">0${i + 1}</span></div>
        <div class="info">
          <h3>${m.name}</h3>
          <div class="tagline">${m.tagline}</div>
          <div class="blurb">${m.blurb}</div>
          ${locked ? `<div class="lock">🔒 Earn ${m.unlock} ★ to unlock</div>` : `<div class="medals">${dots}<span class="best">${rec.best != null ? fmtTime(rec.best) : '—'}</span></div>`}
        </div>`;
      card.addEventListener('mouseenter', () => { if (!locked) this.g.previewMap(m.id); });
      card.addEventListener('click', () => {
        if (locked) { this.toast(`Earn ${m.unlock} ★ to unlock ${m.name}`); return; }
        this.g.sfx.click();
        this.g.startRun(m.id);
      });
      list.appendChild(card);
    });
  }

  // ---------- locker ----------
  setCostume(c) {
    this.g.save.data.costume = c;
    this.g.save.persist();
    this.g.runner.applyCostume(c);
    this.g.ghost.applyCostume(c);
    this.buildLocker();
  }

  buildLocker() {
    const stars = this.g.save.stars();
    const c = this.g.save.data.costume;
    const tabs = $('#locker-tabs');
    tabs.innerHTML = '';
    for (const t of TABS) {
      const b = document.createElement('button');
      b.textContent = t.label;
      if (t.id === this.tab) b.className = 'on';
      b.addEventListener('click', () => { this.tab = t.id; this.g.sfx.click(); this.buildLocker(); });
      tabs.appendChild(b);
    }
    const items = $('#locker-items');
    const colors = $('#locker-colors');
    items.innerHTML = ''; colors.innerHTML = '';
    const tab = TABS.find((t) => t.id === this.tab);

    if (tab.id === 'body') {
      colors.innerHTML = '<div class="label">Skin tone</div>';
      SKIN_TONES.forEach((hex, i) => colors.appendChild(this.swatch(hex, c.skin === i, false, () => this.setCostume({ ...c, skin: i }))));
      const el = document.createElement('div'); el.className = 'label'; el.textContent = 'Eyes'; colors.appendChild(el);
      EYE_COLORS.forEach(([a, b], i) => {
        const sw = this.swatch(a, (c.eyes ?? 0) === i, false, () => this.setCostume({ ...c, eyes: i }));
        sw.style.background = `radial-gradient(circle, #111 22%, ${a} 26%, ${b} 70%)`;
        colors.appendChild(sw);
      });
      items.innerHTML = '<div style="color:var(--muted);font-size:14px;grid-column:1/-1">Earn ★ from medals to unlock more gear. Bronze = 1, Silver = 2, Gold = 3, Ace = 4 per course.</div>';
      return;
    }
    for (const it of ITEMS[tab.id]) {
      const locked = it.stars > stars;
      const b = document.createElement('button');
      b.className = 'item' + (c[tab.id] === it.id ? ' on' : '') + (locked ? ' locked' : '');
      b.innerHTML = `${it.name}${locked ? `<span class="req">★ ${it.stars}</span>` : ''}`;
      if (it.color && it.color !== 'rainbow') b.style.borderLeft = `4px solid ${it.color}`;
      b.addEventListener('click', () => {
        if (locked) { this.toast(`Needs ${it.stars} ★`); return; }
        this.g.sfx.click();
        this.setCostume({ ...c, [tab.id]: it.id });
      });
      items.appendChild(b);
    }
    if (tab.color) {
      colors.innerHTML = '<div class="label">Color</div>';
      if (tab.palette === 'hair') {
        HAIR_COLORS.forEach((hex, i) => colors.appendChild(this.swatch(hex, c.hairColor === i, false, () => this.setCostume({ ...c, hairColor: i }))));
      } else {
        for (const col of COLORS) {
          const locked = col.stars > stars;
          colors.appendChild(this.swatch(col.hex, c[tab.color] === col.id, locked, () => {
            if (locked) { this.toast(`Needs ${col.stars} ★`); return; }
            this.setCostume({ ...c, [tab.color]: col.id });
          }, col));
        }
      }
    }
  }

  swatch(hex, on, locked, fn, def) {
    const b = document.createElement('button');
    b.className = 'swatch' + (on ? ' on' : '') + (locked ? ' locked' : '');
    b.style.background = def && def.metal ? `linear-gradient(135deg, #fff, ${hex} 45%, #555)` : hex;
    if (def && def.glow) b.style.boxShadow = `0 0 12px ${hex}`;
    if (def) b.title = def.id + (locked ? ` (★ ${def.stars})` : '');
    b.addEventListener('click', () => { this.g.sfx.click(); fn(); });
    return b;
  }

  // ---------- settings ----------
  bindSettings() {
    const S = () => this.g.save.data.settings;
    const bind = (id, key, fmt = (v) => v) => {
      const el = $('#set-' + id), out = $('#out-' + id);
      el.addEventListener('input', () => {
        S()[key] = +el.value;
        if (out) out.textContent = fmt(+el.value);
        this.g.applySettings();
      });
    };
    bind('sens', 'sens', (v) => v.toFixed(2));
    bind('fov', 'fov', (v) => v + '°');
    bind('volume', 'volume', (v) => Math.round(v * 100) + '%');
    $('#set-invert').addEventListener('change', (e) => { S().invertY = e.target.checked; this.g.applySettings(); });
    $('#set-ghost').addEventListener('change', (e) => { S().ghost = e.target.checked; this.g.applySettings(); });
    $('#set-quality').addEventListener('change', (e) => { S().quality = e.target.value; this.g.applySettings(); });
    $('#reset-progress').addEventListener('click', () => {
      if (!confirm('Reset all times, medals and ghosts?')) return;
      this.g.resetProgress();
      this.toast('Progress reset');
    });
  }

  syncSettings() {
    const s = this.g.save.data.settings;
    $('#set-sens').value = s.sens; $('#out-sens').textContent = (+s.sens).toFixed(2);
    $('#set-fov').value = s.fov; $('#out-fov').textContent = s.fov + '°';
    $('#set-volume').value = s.volume; $('#out-volume').textContent = Math.round(s.volume * 100) + '%';
    $('#set-invert').checked = s.invertY;
    $('#set-ghost').checked = s.ghost;
    $('#set-quality').value = s.quality;
  }

  // ---------- HUD ----------
  hud(map, trial, speed) {
    const e = this.el;
    e.time.textContent = fmtTime(trial.t);
    e.speed.textContent = speed.toFixed(1);
    e.speedFill.style.width = Math.min(100, (speed / 19) * 100) + '%';
    e.cps.textContent = `${Math.min(trial.next, map.checkpoints.length)}/${map.checkpoints.length}`;
    const rec = this.g.save.map(map.id);
    const nextMedal = Math.min(MEDALS.length - 1, rec.medal + 1);
    const md = MEDALS[nextMedal];
    const tt = map.medals[nextMedal];
    const html = `<span style="color:${md.color}">● ${md.name}</span> ${fmtTime(tt)}`;
    if (e.target._h !== html) { e.target.innerHTML = html; e.target._h = html; }
    const pb = rec.best != null ? `PB ${fmtTime(rec.best)}` : '';
    if (e.pb.textContent !== pb) e.pb.textContent = pb;
  }

  trickPop(it) {
    this.feedItem(`${it.name}<small>+${it.pts}</small>`, (it.big ? 'big' : '') + (it.fresh ? '' : ' rep'));
  }
  boostPop(b) { this.feedItem(`CLEAN +${b.toFixed(1)} m/s`, 'boost'); }
  bail(lost) { this.feedItem(lost ? `BAIL  −${lost}` : 'BAIL', 'bail'); }
  feedItem(html, cls) {
    const feed = document.getElementById('feed');
    const d = document.createElement('div');
    d.className = 't ' + cls;
    d.innerHTML = html;
    feed.prepend(d);
    while (feed.children.length > 5) feed.lastChild.remove();
    setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 1800);
  }
  styleHud(S) {
    const combo = document.getElementById('combo');
    if (S.combo) {
      combo.classList.add('on');
      document.getElementById('combo-pts').textContent = S.combo.pts.toLocaleString();
      document.getElementById('combo-mult').textContent = '×' + S.mult;
      document.getElementById('combo-bar').style.transform = `scaleX(${Math.max(0, S.combo.timer / 2.2)})`;
    } else combo.classList.remove('on');
    const t = `STYLE ${S.total.toLocaleString()}`;
    const el = document.getElementById('style-total');
    if (el.textContent !== t) el.textContent = t;
  }

  hint(text) {
    if (text === this.hintText) return;
    this.hintText = text;
    if (text) { this.el.hint.innerHTML = text; this.el.hint.classList.add('show'); }
    else this.el.hint.classList.remove('show');
  }

  prompt(html) { this.el.prompt.innerHTML = html; this.el.prompt.classList.remove('hidden'); }
  hidePrompt() { this.el.prompt.classList.add('hidden'); }

  split(t, diff, i, n) {
    const e = this.el.split;
    e.className = 'mono show ' + (diff == null ? 'neutral' : diff <= 0 ? 'good' : 'bad');
    e.textContent = diff == null ? `CP ${i}/${n}  ${fmtTime(t)}` : `${fmtDiff(diff)}`;
    clearTimeout(this.splitTimer);
    this.splitTimer = setTimeout(() => e.classList.remove('show'), 1800);
  }

  results(map, r, unlocked) {
    $('#res-map').textContent = map.name;
    const md = r.medal >= 0 ? MEDALS[r.medal] : null;
    $('#res-medal').innerHTML = md ? `<span style="color:${md.color}">${md.name.toUpperCase()}</span>` : '<span style="color:var(--muted)">NO MEDAL</span>';
    $('#res-time').textContent = fmtTime(r.t);
    let sub = '';
    if (r.pb && r.prevBest != null) sub = `<span class="pb">NEW BEST ${fmtDiff(r.t - r.prevBest)}</span>`;
    else if (r.pb) sub = '<span class="pb">FIRST CLEAR</span>';
    else if (r.prevBest != null) sub = `PB ${fmtTime(r.prevBest)} · ${fmtDiff(r.t - r.prevBest)}`;
    if (r.respawns) sub += ` · ${r.respawns} respawn${r.respawns > 1 ? 's' : ''}`;
    $('#res-sub').innerHTML = sub;
    $('#res-style').innerHTML = r.style != null ? `STYLE ${r.style.toLocaleString()}${r.style > r.prevStyle ? ' · NEW BEST' : r.prevStyle ? ` · best ${r.prevStyle.toLocaleString()}` : ''}` : '';
    $('#res-ladder').innerHTML = MEDALS.map((m, i) => `<div class="${r.t <= map.medals[i] ? 'got' : ''}" style="${r.t <= map.medals[i] ? `border-color:${m.color}` : ''}"><span style="color:${m.color}">●</span> ${m.name}<b>${fmtTime(map.medals[i])}</b></div>`).join('');
    $('#res-unlocks').innerHTML = unlocked.length ? `<div class="u head">🔓 ${unlocked.length} new unlock${unlocked.length > 1 ? 's' : ''}</div>` + unlocked.map((u) => `<span class="u">${u}</span>`).join('') : '';
    const idx = MAPS.indexOf(map);
    const next = MAPS[idx + 1];
    const nb = $('#res-next');
    nb.disabled = !next || this.g.save.stars() < next.unlock;
    nb.textContent = next ? (this.g.save.stars() < next.unlock ? `🔒 ${next.name} (${next.unlock}★)` : `Next: ${next.name}`) : 'Last course';
  }

  toast(text, ms = 2200) {
    const e = this.el.toast;
    e.textContent = text;
    e.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => e.classList.remove('show'), ms);
  }
}
