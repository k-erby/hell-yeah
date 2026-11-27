/* ============================================================
   House props (bed, ball), drawn as pixel art at the same scale as the pets.
   Each letter is one sprite pixel; '.' is empty. Colours come from CSS
   classes (.n, .m, ...) so the bed follows the theme. See styles.css → "props".
   ============================================================ */

/** Turn a pixel grid into SVG rects, merging runs of the same colour. */
function pixels(rows: string[]): string {
  let out = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let len = 1;
      while (row[x + len] === c) len++;
      if (c !== '.') out += `<rect class="${c}" x="${x}" y="${y}" width="${len}" height="1"/>`;
      x += len;
    }
  });
  return out;
}

function svg(rows: string[], px: number, cls: string): string {
  const w = rows[0].length;
  const h = rows.length;
  return `<svg class="prop ${cls}" viewBox="0 0 ${w} ${h}" width="${w * px}" height="${h * px}" shape-rendering="crispEdges">${pixels(rows)}</svg>`;
}

/*
  Bed: a round dog bed seen from the side.
  n outline · h rim highlight · m rim · s rim shade · c cushion · d cushion shade
*/
const BED = [
  '...nnnnnnnnnnnnnnnnnnnnnnnnnnnn...',
  '.nnhhhhhhhhhhhhhhhhhhhhhhhhhhhhnn.',
  'nhmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmsn',
  'nmmnccccccccccccccccccccccccccnmsn',
  'nmncddddddddddddddddddddddddddcnsn',
];
/** The front lip. Also drawn on its own over the pet when it's lying in the bed. */
const BED_FRONT = [
  'nhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhsn',
  'nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmsn',
  'nsmmmmmmmmmmmmmmmmmmmmmmmmmmmmmssn',
  '.nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn.',
];

export const BED_W = BED[0].length;
/** Bed rows above the front lip (the lip starts at this row). */
export const BED_LIP = BED.length;

export const bedSvg = (px: number) => svg([...BED, ...BED_FRONT], px, 'bed');
/** Just the front lip, padded so it lines up with bedSvg(). */
export const bedFrontSvg = (px: number) => svg([...BED.map((r) => '.'.repeat(r.length)), ...BED_FRONT], px, 'bed bed-front');

/*
  Food bowl on the floor: empty when the pet's hungry, kibble once fed today.
  n outline · h rim · m bowl · s shade · k kibble · K kibble shade
*/
const BOWL = [
  '..........',
  '..........',
  'nnnnnnnnnn',
  'nhhhhhhhhn',
  '.nmmmmmmn.',
  '.nssssssn.',
  '..nnnnnn..',
];
const BOWL_KIBBLE = [
  '...kKk....',
  '.kKkkKkKk.',
];
export const bowlSvg = (px: number, full: boolean) =>
  svg(full ? BOWL.map((r, y) => (y < BOWL_KIBBLE.length ? BOWL_KIBBLE[y] : r)) : BOWL, px, 'bowl');

/*
  Ball: n outline · w shine · r red · d shade
*/
const BALL = [
  '.nnn.',
  'nwrrn',
  'nrrrn',
  'nrrdn',
  '.nnn.',
];
export const BALL_W = BALL[0].length;
export const ballSvg = (px: number) => svg(BALL, px, 'ball');

/* ============================================================
   Composing several pixel grids into one picture.
   ============================================================ */

type Grid = string[][];
const blank = (w: number, h: number): Grid => Array.from({ length: h }, () => Array(w).fill('.'));
/** Draw `art` onto `g` with its top-left at (x, y). '.' is see-through. */
function stamp(g: Grid, art: string[], x: number, y: number) {
  art.forEach((row, dy) =>
    [...row].forEach((c, dx) => {
      if (c !== '.' && g[y + dy]?.[x + dx] !== undefined) g[y + dy][x + dx] = c;
    }),
  );
}
const rows = (g: Grid) => g.map((r) => r.join(''));
const mirror = (art: string[]) => art.map((r) => [...r].reverse().join(''));

/* ============================================================
   Toy trunk: the longer the streak, the fuller it gets.
   n outline · h highlight · m wood · s shade · b band · g latch · k latch hole
   Each toy has its own colour letters (see styles.css → "trunk").
   ============================================================ */

const TRUNK_LID_SHUT = [
  '.nnnnnnnnnnnnnnnnnn.',
  'nhhhhhhhhhhhhhhhhhhn',
  'nmmmmmmmmmmmmmmmmmmn',
];
/** Lid propped open behind the toys: you see its inside. */
const TRUNK_LID_OPEN = [
  '.nnnnnnnnnnnnnnnnnn.',
  '.nhhhhhhhhhhhhhhhhn.',
  '.nssssssssssssssssn.',
  '.nssssssssssssssssn.',
  '.nssssssssssssssssn.',
  '.nssssssssssssssssn.',
  '.nssssssssssssssssn.',
];
const TRUNK = [
  'nnnnnnnnnnnnnnnnnnnn',
  'nhhhhhhhhhhhhhhhhhhn',
  'nmmmmmmmmmmmmmmmmmmn',
  'nbbbbbbbbbbbbbbbbbbn',
  'nmmmmmmmmggmmmmmmmmn',
  'nmmmmmmmmkkmmmmmmmmn',
  'nssssssssssssssssssn',
  'nnnnnnnnnnnnnnnnnnnn',
];

/**
 * Toys, in the order they show up. `days` = streak needed; x = column in the trunk;
 * y = how far the toy's bottom sits below the trunk's top edge (bigger = sunk deeper).
 * Listed back-to-front: later toys are drawn over earlier ones.
 */
const TOYS: { days: number; x: number; y: number; art: string[] }[] = [
  // rope · U outline · u rope · v stripe
  { days: 14, x: 13, y: -1, art: ['.UUU.', 'UuvuU', 'UvuvU', '.UUU.', '.UvU.', '.UuU.', '.UvU.'] },
  // frisbee standing on its edge · F outline · f disc
  { days: 21, x: 5, y: -2, art: ['.FFFFF.', 'FfffffF', 'FfFFFfF', 'FfffffF', '.FFFFF.'] },
  // bone · O outline · o bone
  { days: 3, x: 1, y: 1, art: ['.OO.OO.', 'OooOooO', '.OoooO.', '..OoO..', '..OoO..', '..OoO..'] },
  // rubber duck · Y outline · y duck · q beak · K eye
  { days: 7, x: 8, y: 1, art: ['.YYY..', 'YyyyY.', 'YyKyYY', 'YyyyqY', 'YyyyYY', 'YyyyY.'] },
  // tennis ball · E outline · e felt · v seam
  { days: 1, x: 14, y: 1, art: ['.EEE.', 'EevvE', 'EeeeE', 'EvveE', '.EEE.'] },
];
/** At this streak a bone has spilled out onto the floor. */
const OVERFLOW_DAYS = 30;
const FLOOR_BONE = ['.O.....O.', 'OoOOOOOoO', 'OoooooooO', 'OoOOOOOoO', '.O.....O.'];

export const TRUNK_W = TRUNK[0].length + 1 + FLOOR_BONE[0].length;

export function trunkSvg(px: number, streakDays: number): string {
  const top = TRUNK_LID_OPEN.length; // row where the trunk's front starts
  const g = blank(TRUNK_W, top + TRUNK.length);
  if (streakDays < 1) stamp(g, TRUNK_LID_SHUT, 0, top - TRUNK_LID_SHUT.length);
  else {
    stamp(g, TRUNK_LID_OPEN, 0, 0);
    for (const t of TOYS) if (streakDays >= t.days) stamp(g, t.art, t.x, top + t.y - t.art.length + 1);
  }
  stamp(g, TRUNK, 0, top);
  if (streakDays >= OVERFLOW_DAYS) stamp(g, FLOOR_BONE, TRUNK[0].length + 1, g.length - FLOOR_BONE.length);
  return svg(rows(g), px, 'trunk');
}

/* ============================================================
   Shelf with a flower pot. The plant grows with this month's skill level,
   and the flower is different every month.
   Shelf/pot: n wood outline · h · m · s wood · P pot outline · p pot · l pot rim
   Plant: G stem/leaf outline · g leaf · L leaf shine · A petal outline · a petal · c centre
   ============================================================ */

const SHELF = [
  'nnnnnnnnnnnnnnnnnn',
  'nhhhhhhhhhhhhhhhhn',
  'nssssssssssssssssn',
  'nnnnnnnnnnnnnnnnnn',
  '..nmn........nmn..',
  '...nn........nn...',
];
const POT = [
  'PPPPPPPP',
  'PllllllP',
  'PPPPPPPP',
  '.PppppP.',
  '.PppppP.',
  '..PPPP..',
];
const LEAF = ['.GG.', 'GLgG', '.GGG'];

type Shape = 'round' | 'cup' | 'spike';
/** One flower per month, in rotation. Colours are set in styles.css (.flower-<name>). */
export const FLOWERS: { name: string; shape: Shape }[] = [
  { name: 'daisy', shape: 'round' },
  { name: 'tulip', shape: 'cup' },
  { name: 'lavender', shape: 'spike' },
  { name: 'sunflower', shape: 'round' },
  { name: 'rose', shape: 'cup' },
  { name: 'violet', shape: 'round' },
];

const BUD = ['.A.', 'AaA', 'AaA'];
const HEADS: Record<Shape, { open: string[]; bloom: string[] }> = {
  round: {
    open: ['.AA.AA.', 'AaaAaaA', 'AacccaA', 'AacccaA', 'AacccaA', 'AaaAaaA', '.AA.AA.'],
    bloom: ['..AA.AA..', '.AaaAaaA.', 'AaaccccaA', 'AaaccccaA', 'AaaccccaA', '.AaaAaaA.', '..AA.AA..'],
  },
  cup: {
    open: ['A.A.A', 'AaAaA', 'AaaaA', 'AaaaA', '.AaA.'],
    bloom: ['A..A..A', 'AaAaAaA', 'AaaaaaA', 'AaacaaA', '.AaaaA.', '..AaA..'],
  },
  spike: {
    open: ['.A.', 'AaA', 'AaA', 'AaA', 'AaA', '.A.'],
    bloom: ['.AAA.', 'AaaaA', 'AaAaA', 'AaaaA', 'AaAaA', 'AaaaA', '.AAA.'],
  },
};

/** How tall the stem is and how many leaves, for skill levels 0 to 4. */
const GROWTH = [
  { stem: 2, leaves: 1 },
  { stem: 5, leaves: 2 },
  { stem: 7, leaves: 2 },
  { stem: 9, leaves: 3 },
  { stem: 10, leaves: 4 },
];

export const SHELF_W = SHELF[0].length;

/** Which flower a month gets ("2026-11" → one of FLOWERS). */
export function flowerFor(month: string) {
  const [y, m] = month.split('-').map(Number);
  return FLOWERS[(y * 12 + m) % FLOWERS.length];
}

/** `plant` is null when there's no skill this month (empty pot). */
export function shelfSvg(px: number, plant: { month: string; level: number } | null): string {
  const H = 32;
  const g = blank(SHELF_W, H);
  const shelfY = H - SHELF.length;
  const potX = (SHELF_W - POT[0].length) / 2;
  const potY = shelfY - POT.length;
  const stemX = potX + 3;
  let cls = 'shelf';
  if (plant) {
    const f = flowerFor(plant.month);
    cls += ` flower-${f.name}`;
    const grow = GROWTH[Math.max(0, Math.min(plant.level, GROWTH.length - 1))];
    const topY = potY - grow.stem;
    for (let y = topY; y < potY; y++) stamp(g, ['G'], stemX, y);
    for (let i = 0; i < grow.leaves; i++) {
      const y = potY - 2 - i * 2 - (i > 1 ? 1 : 0);
      if (i % 2 === 0) stamp(g, LEAF, stemX + 1, y - 1);
      else stamp(g, mirror(LEAF), stemX - LEAF[0].length, y - 1);
    }
    const head = plant.level >= 4 ? HEADS[f.shape].bloom : plant.level >= 3 ? HEADS[f.shape].open : plant.level >= 2 ? BUD : null;
    if (head) stamp(g, head, stemX - Math.floor(head[0].length / 2), topY - head.length + (head === BUD ? 1 : 0));
  }
  stamp(g, POT, potX, potY);
  stamp(g, SHELF, 0, shelfY);
  return svg(rows(g), px, cls);
}

/* ============================================================
   Bubble icons for the pet's reminders (src/pets/needs.ts).
   Each outlined in a dark version of its own colour (styles.css → "bubble icons").
   ============================================================ */

const ICONS = {
  // empty food bowl · n outline · h rim · m bowl
  bowl: ['.......', 'n.....n', 'nhhhhhn', 'nmmmmmn', '.nmmmn.', '..nnn..'],
  // grumpy rain cloud · n outline · w cloud · r rain
  cloud: ['..nnn..', '.nwwwnn', 'nwwwwwn', 'nwwwwwn', '.nnnnn.', '.r.r.r.'],
  // ball
  ball: ['.nnn.', 'nwrrn', 'nrrrn', 'nrrdn', '.nnn.'],
  // sparkle star for tips · n outline · y star
  star: ['...n...', '..nyn..', 'nnyyynn', '.nyyyn.', '.nynyn.', '.n...n.'],
} as const;

export const iconSvg = (name: keyof typeof ICONS, px = 3) => svg([...ICONS[name]], px, `icon icon-${name}`);
