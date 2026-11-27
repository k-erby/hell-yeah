import type { Mood } from '../app/types';
import type { Built, Spec } from './dog/sprite';

/* ============================================================
   Pets drawn as a handful of whole poses (cats, the rat, the pigeon).
   They don't have the dog's leg-by-leg animation: they glide with a little
   bob when they walk, and pick the closest pose for everything else.

   A pose is a list of pieces, painted in order (later ones on top).
   Pieces marked 'head' are the head: that's what the close-up zooms in on.
   ============================================================ */

export type Piece = [rows: string[], x: number, y: number, layer?: 'head'];

export interface PoseArt {
  pal: Record<string, string>;
  /** Letters that mark the eye, tried in order (shine first, then pupil). */
  eye: string;
  /** Letters for the nose or beak; the front-most one is where a ball gets carried. */
  nose: string;
  /** Recolours near the eye to shut it. */
  shut: Record<string, string>;
  stand: Piece[];
  sit: Piece[];
  /** Lying down, awake. */
  lie: Piece[];
  sleep: Piece[];
  /** Head down (sniffing, digging). Falls back to stand. */
  peck?: Piece[];
}

type Layer = string[][];

function pick(spec: Spec, art: PoseArt): Piece[] {
  switch (spec.fam) {
    case 'sit': return art.sit;
    case 'lie': return spec.head === 'rest' ? art.sleep : art.lie;
    default: return spec.head === 'down' && art.peck ? art.peck : art.stand;
  }
}

/** Draw a pose on a W×H canvas: centred, feet on the bottom row. */
export function buildPose(spec: Spec, _mood: Mood, art: PoseArt, W: number, H: number): Built {
  const blank = (): Layer => Array.from({ length: H }, () => Array(W).fill('.'));
  // Where every pixel lands before centring (later pieces win).
  const cells = new Map<string, [number, number, string, boolean]>();
  for (const [rows, x, y, layer] of pick(spec, art))
    rows.forEach((r, j) => [...r].forEach((c, i) => {
      if (c !== '.') cells.set(`${x + i},${y + j}`, [x + i, y + j, c, layer === 'head']);
    }));
  let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of cells.values()) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  // A bounce only ever lifts them off the floor.
  const lift = Math.min(0, (spec.dy ?? 0) + (spec.fam === 'stand' ? spec.hdy ?? 0 : 0));
  const ox = Math.round(W / 2 - (x0 + x1 + 1) / 2);
  const oy = H - 1 - y1 + lift;

  const body = blank();
  const head = blank();
  for (const [x, y, c, isHead] of cells.values()) {
    const X = x + ox, Y = y + oy;
    if (X >= 0 && X < W && Y >= 0 && Y < H) (isHead ? head : body)[Y][X] = c;
  }

  const find = (g: Layer, ch: string): [number, number] | null => {
    for (let y = 0; y < H; y++) {
      const x = g[y].indexOf(ch);
      if (x >= 0) return [x, y];
    }
    return null;
  };
  let eye: [number, number] | null = null;
  for (const ch of art.eye) eye ??= find(head, ch) ?? find(body, ch);

  const closed = spec.eyes === 'closed' || spec.head === 'rest' || spec.head === 'yawn';
  if (closed && eye) {
    const [ex, ey] = eye;
    for (let y = ey - 1; y <= ey + 1; y++)
      for (let x = ex - 2; x <= ex + 1; x++) {
        for (const g of [head, body]) {
          const c = g[y]?.[x];
          if (c && art.shut[c]) g[y][x] = art.shut[c];
        }
      }
  }

  // Front-most bit of nose: where a ball gets carried. (Front-most anything if there's no nose.)
  let mouth: [number, number] | null = null;
  for (const want of [(c: string) => art.nose.includes(c), (c: string) => c !== '.']) {
    for (const g of [head, body])
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (want(g[y][x]) && (!mouth || x > mouth[0])) mouth = [x, y];
    if (mouth) break;
  }
  mouth ??= [W / 2, H / 2];

  return { layers: { far: blank(), tail: blank(), body, near: blank(), head }, eye, mouth, closedEyes: closed, pal: art.pal, blink: false };
}
