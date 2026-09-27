// Costume catalog. `stars` = medal stars needed to unlock (bronze 1, silver 2, gold 3, author 4 per map).

export const SKIN_TONES = ['#f6d5b8', '#e8b48f', '#c98e62', '#a86b43', '#7a4a2b', '#4f2f1c'];

export const COLORS = [
  { id: 'ember', hex: '#ff5a1f', stars: 0 },
  { id: 'cream', hex: '#f1ead8', stars: 0 },
  { id: 'ink', hex: '#1b1f2a', stars: 0 },
  { id: 'slate', hex: '#5b6573', stars: 0 },
  { id: 'cobalt', hex: '#2f5fd8', stars: 0 },
  { id: 'forest', hex: '#2f6e45', stars: 0 },
  { id: 'sun', hex: '#ffc629', stars: 0 },
  { id: 'rose', hex: '#e94a7a', stars: 0 },
  { id: 'sky', hex: '#6ec6ff', stars: 1 },
  { id: 'lilac', hex: '#9b7bff', stars: 2 },
  { id: 'mint', hex: '#56e0b0', stars: 3 },
  { id: 'blood', hex: '#9e1b24', stars: 4 },
  { id: 'volt', hex: '#c6ff3d', stars: 6, glow: true },
  { id: 'hotpink', hex: '#ff2e88', stars: 7, glow: true },
  { id: 'cyber', hex: '#27e8ff', stars: 8, glow: true },
  { id: 'gold', hex: '#e8b640', stars: 10, metal: true },
  { id: 'chrome', hex: '#d9dde3', stars: 12, metal: true },
];

// [inner, outer] iris colours
export const EYE_COLORS = [
  ['#ffb21c', '#ff6a00'], ['#6fd3ff', '#1f6fe0'], ['#8ef07a', '#1f9a4a'], ['#c9a2ff', '#6a3ae0'],
  ['#c98a4a', '#5a3218'], ['#ff8ac8', '#e0307a'], ['#f4f4f4', '#8a8f9a'], ['#ff5a5a', '#a01020'],
];

export const HAIR_COLORS = ['#1b1512', '#3b2518', '#6b4226', '#b07a3c', '#e3c27a', '#d8d8d8', '#c8402b', '#3f7df0', '#ff5fa2', '#7cf05a'];

export const ITEMS = {
  top: [
    { id: 'hoodie', name: 'Hoodie', stars: 0 },
    { id: 'tee', name: 'Tee', stars: 0 },
    { id: 'long', name: 'Long Sleeve', stars: 0 },
    { id: 'stripes', name: 'Breton Tee', stars: 0 },
    { id: 'tank', name: 'Tank', stars: 1 },
    { id: 'track', name: 'Track Jacket', stars: 3 },
    { id: 'jacket', name: 'Bomber', stars: 5 },
  ],
  bottom: [
    { id: 'joggers', name: 'Joggers', stars: 0 },
    { id: 'pants', name: 'Pants', stars: 0 },
    { id: 'shorts', name: 'Shorts', stars: 0 },
    { id: 'cargo', name: 'Cargos', stars: 2 },
  ],
  shoes: [
    { id: 'runners', name: 'Runners', stars: 0 },
    { id: 'hightops', name: 'High-tops', stars: 1 },
    { id: 'boots', name: 'Boots', stars: 4 },
  ],
  hair: [
    { id: 'short', name: 'Short', stars: 0 },
    { id: 'buzz', name: 'Buzz', stars: 0 },
    { id: 'none', name: 'Bald', stars: 0 },
    { id: 'bun', name: 'Bun', stars: 0 },
    { id: 'swoop', name: 'Swoop', stars: 0 },
    { id: 'spiky', name: 'Spiky', stars: 1 },
    { id: 'ponytail', name: 'Ponytail', stars: 2 },
    { id: 'afro', name: 'Afro', stars: 3 },
    { id: 'mohawk', name: 'Mohawk', stars: 5 },
  ],
  hat: [
    { id: 'none', name: 'None', stars: 0 },
    { id: 'cap', name: 'Cap', stars: 0 },
    { id: 'backcap', name: 'Backwards Cap', stars: 0 },
    { id: 'beanie', name: 'Beanie', stars: 1 },
    { id: 'headband', name: 'Headband', stars: 2 },
    { id: 'headphones', name: 'Headphones', stars: 3 },
    { id: 'cat', name: 'Cat Ears', stars: 4 },
    { id: 'helmet', name: 'Helmet', stars: 6 },
    { id: 'horns', name: 'Horns', stars: 8 },
    { id: 'crown', name: 'Crown', stars: 10 },
    { id: 'halo', name: 'Halo', stars: 12 },
  ],
  face: [
    { id: 'none', name: 'None', stars: 0 },
    { id: 'shades', name: 'Shades', stars: 1 },
    { id: 'mask', name: 'Bandana Mask', stars: 2 },
    { id: 'goggles', name: 'Goggles', stars: 4 },
    { id: 'visor', name: 'Cyber Visor', stars: 7 },
  ],
  back: [
    { id: 'none', name: 'None', stars: 0 },
    { id: 'scarf', name: 'Scarf', stars: 0 },
    { id: 'backpack', name: 'Backpack', stars: 1 },
    { id: 'cape', name: 'Cape', stars: 5 },
    { id: 'wings', name: 'Wings', stars: 9 },
    { id: 'jetpack', name: 'Jetpack', stars: 11 },
  ],
  trail: [
    { id: 'none', name: 'None', stars: 0 },
    { id: 'ember', name: 'Ember', stars: 0, color: '#ff6a2b' },
    { id: 'volt', name: 'Volt', stars: 2, color: '#c6ff3d' },
    { id: 'ice', name: 'Ice', stars: 4, color: '#7fe3ff' },
    { id: 'pink', name: 'Neon Pink', stars: 6, color: '#ff2e88' },
    { id: 'gold', name: 'Gold Rush', stars: 9, color: '#ffd24a' },
    { id: 'rainbow', name: 'Rainbow', stars: 12, color: 'rainbow' },
  ],
};

export const DEFAULT_COSTUME = {
  skin: 1, eyes: 0,
  hair: 'swoop', hairColor: 1,
  hat: 'none', hatColor: 'ember',
  face: 'none',
  top: 'hoodie', topColor: 'ember',
  bottom: 'joggers', bottomColor: 'ink',
  shoes: 'runners', shoeColor: 'cream',
  back: 'scarf', backColor: 'sun',
  trail: 'ember',
};

export const colorHex = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).hex;
export const colorDef = (id) => COLORS.find((c) => c.id === id) || COLORS[0];
export const itemDef = (slot, id) => ITEMS[slot].find((i) => i.id === id);

export function randomCostume(rng, stars = 99) {
  const pick = (arr) => arr[(rng() * arr.length) | 0];
  const okItems = (slot) => ITEMS[slot].filter((i) => i.stars <= stars);
  const okColors = COLORS.filter((c) => c.stars <= stars);
  return {
    skin: (rng() * SKIN_TONES.length) | 0, eyes: (rng() * EYE_COLORS.length) | 0,
    hair: pick(okItems('hair')).id, hairColor: (rng() * HAIR_COLORS.length) | 0,
    hat: rng() < 0.5 ? 'none' : pick(okItems('hat')).id, hatColor: pick(okColors).id,
    face: rng() < 0.6 ? 'none' : pick(okItems('face')).id,
    top: pick(okItems('top')).id, topColor: pick(okColors).id,
    bottom: pick(okItems('bottom')).id, bottomColor: pick(okColors).id,
    shoes: pick(okItems('shoes')).id, shoeColor: pick(okColors).id,
    back: pick(okItems('back')).id, backColor: pick(okColors).id,
    trail: pick(okItems('trail')).id,
  };
}
