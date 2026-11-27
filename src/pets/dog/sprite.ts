import { BOW, HEAD, LIE, SIT, TORSO, type Part } from './parts';
import type { Mood } from '../../app/types';
import { KIND, type PetKind } from '../kinds';
import { buildPose } from '../poses';
import type { DogLook } from './looks';

/* ============================================================
   The pet's pixel art. Dogs are built leg by leg from parts.ts and dressed
   in a look (looks.ts: colours, head, tail). Other pets are drawn from
   whole poses (poses.ts).
   Everything faces right on a 48x32 canvas, feet on row 31.
   ============================================================ */

export const SPRITE_W = 48;
export const SPRITE_H = 32;

type Pt = [number, number];
type Layer = string[][];
const blank = (): Layer => Array.from({ length: SPRITE_H }, () => Array(SPRITE_W).fill('.'));

/** Draw rows with their top-left at (x, y). */
function draw(layer: Layer, rows: string[], x: number, y: number, recolor?: Record<string, string>) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '.') continue;
      const X = x + i;
      const Y = y + j;
      if (X < 0 || X >= SPRITE_W || Y < 0 || Y >= SPRITE_H) continue;
      layer[Y][X] = recolor?.[c] ?? c;
    }
  });
}
const drawPart = (layer: Layer, p: Part, dx = 0, dy = 0) => draw(layer, p.rows, p.x + dx, p.y + dy);

/** Lean rows sideways, most at the far end: used for tail wags. */
function lean(rows: string[], dir: number, fromTop = true): string[] {
  const h = rows.length;
  return rows.map((r, i) => {
    const k = fromTop ? 1 - i / Math.max(1, h - 1) : i / Math.max(1, h - 1);
    const s = Math.round(k * dir);
    return s > 0 ? '.'.repeat(s) + r.slice(0, r.length - s) : s < 0 ? r.slice(-s) + '.'.repeat(-s) : r;
  });
}

// ---------- legs: rows + anchor column. Drawn from row 24 (just under the body) down to the ground. ----------

type Leg = { rows: string[]; ax: number };
const L = (ax: number, rows: string[]): Leg => ({ ax, rows });

const F_STRAIGHT = L(1, ['ttl', 'ttl', 'ttl', 'tl.', 'tl.', 'tl.', 'tt.', '.tt']);
const F_FWD = L(1, ['ttl...', '.ttl..', '.ttl..', '..tl..', '..dtl.', '...tl.', '...tt.', '....tt']);
const F_BACK = L(3, ['..ttl', '..ttl', '.ttl.', '.tl..', 'tl...', 'tl...', 'tt...', 'tt...']);
const F_TUCK = L(1, ['ttl..', 'ttl..', 'dttl.', '.dtll', '..dtt']);
const F_REACH = L(1, ['ttl......', 'tttll....', '..tttll..', '....dtttl', '.......tt']);
const F_FOLD = L(1, ['ttl..', 'ttl..', 'dtl..', '.dtl.', '.dtt.', '..ll.']);

const H_STAND = L(1, ['dttl', 'dttl', 'dtt.', 'dtt.', '.dt.', '.dt.', '.dt.', '.tt.']);
const H_BACK = L(5, ['....dttl', '...dttl.', '..dtt...', '.dtt....', '.dt.....', 'dt......', 'dt......', 'tt......']);
const H_FWD = L(1, ['dttl..', '.dttl.', '.dttl.', '..dtt.', '..dtt.', '...dt.', '...dt.', '...tt.']);
const H_PUSH = L(7, ['......dttl', '...ddttl..', '.ddttl....', 'dtl.......', 'tt........']);
const H_GATHER = L(1, ['dttl....', '.dttl...', '..dttl..', '...dtl..', '....dtt.', '.....tt.']);

const FAR = { t: 'b', l: 'b', d: 'd' };

const drawLeg = (layer: Layer, leg: Leg, x: number, y: number, far = false) =>
  draw(layer, leg.rows, x - leg.ax, y, far ? FAR : undefined);

// Hind leg raised to scratch behind the ear while sitting.
const SCRATCH = ['......tt', '.....dtl', '....dtl.', '...dtl..', '..dtl...', '.dtl....', 'dtl.....'];

// ---------- head ----------

const HEAD_MOUTH: Pt = [11, 7]; // nose tip / where a ball gets carried

// ---------- frame specs ----------

export type Family = 'stand' | 'sit' | 'lie' | 'bow';
export type HeadV = 'up' | 'pant' | 'pant2' | 'bark' | 'yawn' | 'chew' | 'tilt' | 'down' | 'rest';
export type TailV = 'hang' | 'hangL' | 'hangR' | 'out' | 'up' | 'upL' | 'upR' | 'flat' | 'flatUp';
export type Legs = 'stand' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'run0' | 'run1' | 'run2' | 'dig0' | 'dig1';

export interface Spec {
  fam: Family;
  head: HeadV;
  tail: TailV;
  legs?: Legs;
  eyes?: 'open' | 'closed';
  ears?: 'up' | 'back';
  scratch?: 0 | 1 | 2;
  /** Whole-body vertical offset (bounce). */
  dy?: number;
  /** Extra head offset (nods, sniffing, looking up). */
  hdy?: number;
}

type LegPose = [front: Leg, frontFar: Leg, hind: Leg, hindFar: Leg];
const LEGS: Record<Legs, LegPose> = {
  stand: [F_STRAIGHT, F_STRAIGHT, H_STAND, H_STAND],
  walk0: [F_FWD, F_BACK, H_BACK, H_FWD],
  walk1: [F_STRAIGHT, F_TUCK, H_STAND, H_STAND],
  walk2: [F_BACK, F_FWD, H_FWD, H_BACK],
  walk3: [F_TUCK, F_STRAIGHT, H_STAND, H_STAND],
  run0: [F_REACH, F_REACH, H_PUSH, H_PUSH],
  run1: [F_STRAIGHT, F_BACK, H_STAND, H_FWD],
  run2: [F_FOLD, F_FOLD, H_GATHER, H_GATHER],
  dig0: [F_TUCK, F_STRAIGHT, H_STAND, H_STAND],
  dig1: [F_BACK, F_STRAIGHT, H_STAND, H_STAND],
};

export interface Built {
  layers: { far: Layer; tail: Layer; body: Layer; near: Layer; head: Layer };
  eye: Pt | null;
  mouth: Pt;
  closedEyes: boolean;
  pal: Record<string, string>;
  /** Draw a blinking eyelid over the eye. */
  blink: boolean;
}

function tailRows(t: TailV, look: DogLook): { part: Part; rows: string[] } {
  const T = look.tails;
  switch (t) {
    case 'hang': return { part: T.hang, rows: T.hang.rows };
    case 'hangL': return { part: T.hang, rows: lean(T.hang.rows, -1, false) };
    case 'hangR': return { part: T.hang, rows: lean(T.hang.rows, 1, false) };
    case 'out': return { part: T.out, rows: T.out.rows };
    case 'up': return { part: T.up, rows: T.up.rows };
    case 'upL': return { part: T.up, rows: lean(T.up.rows, -2) };
    case 'upR': return { part: T.up, rows: lean(T.up.rows, 1) };
    case 'flat': return { part: T.sit, rows: T.sit.rows };
    case 'flatUp': return { part: T.sit, rows: lean(T.sit.rows, -1) };
  }
}

/** A frame of the pet. `_stage` is kept for later (accessories per animal); nothing is drawn from it yet. */
export function build(spec: Spec, _stage: number, mood: Mood, kind: PetKind = 'bo'): Built {
  const k = KIND[kind];
  return 'dog' in k ? buildDog(spec, mood, k.dog) : buildPose(spec, mood, k.poses, SPRITE_W, SPRITE_H);
}

function buildDog(spec: Spec, mood: Mood, look: DogLook): Built {
  const Ly = { far: blank(), tail: blank(), body: blank(), near: blank(), head: blank() };
  const dy = spec.dy ?? 0;
  let head: Pt; // top-left of the head
  let tail = tailRows(spec.tail, look);

  switch (spec.fam) {
    case 'stand': {
      const legs = LEGS[spec.legs ?? 'stand'];
      drawLeg(Ly.far, legs[1], 31, 24 + dy, true);
      drawLeg(Ly.far, legs[3], 16, 24 + dy, true);
      drawPart(Ly.body, TORSO, 0, dy);
      drawLeg(Ly.near, legs[0], 28, 24 + dy);
      drawLeg(Ly.near, legs[2], 18, 24 + dy);
      head = spec.head === 'down' ? [31, 15 + dy] : [HEAD.x, HEAD.y + dy];
      if (spec.tail === 'flat' || spec.tail === 'flatUp') tail = tailRows('hang', look);
      break;
    }
    case 'sit': {
      drawPart(Ly.body, SIT);
      if (spec.scratch) draw(Ly.near, SCRATCH, 14, spec.scratch === 1 ? 21 : 22);
      head = [22, 9];
      if (!spec.tail.startsWith('flat')) tail = tailRows('flat', look);
      break;
    }
    case 'lie': {
      drawPart(Ly.body, LIE);
      head = spec.head === 'rest' ? [30, 18] : [30, 16];
      tail = { part: look.tails.lie, rows: spec.tail === 'flatUp' ? lean(look.tails.lie.rows, -1) : look.tails.lie.rows };
      break;
    }
    case 'bow': {
      drawPart(Ly.body, BOW);
      head = [30, 17];
      if (!spec.tail.startsWith('up')) tail = tailRows('up', look);
      break;
    }
  }

  draw(Ly.tail, tail.rows, tail.part.x, tail.part.y + (spec.fam === 'stand' ? dy : 0));

  // Head
  const rows = [...look.head];
  const variant = spec.head === 'down' || spec.head === 'rest' || spec.head === 'up' ? null : spec.head;
  const patch = { ...(spec.ears === 'back' ? look.patch.earsBack : {}), ...(variant ? look.patch[variant] : {}) };
  for (const [i, r] of Object.entries(patch)) rows[Number(i)] = r;
  const hx = head[0];
  const hy = head[1] + (spec.hdy ?? 0) + (spec.head === 'tilt' ? 1 : 0);
  draw(Ly.head, rows, hx, hy);
  const G = (p: Pt): Pt => [hx + p[0], hy + p[1]];


  // Eyes
  let eye: Pt | null = null;
  for (let y = 0; y < SPRITE_H && !eye; y++) {
    const x = Ly.head[y].indexOf('w');
    if (x >= 0) eye = [x, y];
  }
  const closed = spec.eyes === 'closed' || spec.head === 'rest' || spec.head === 'yawn';
  if (eye) {
    const [wx, wy] = eye;
    const g = Ly.head;
    if (closed) {
      g[wy - 1][wx] = 't';
      g[wy - 1][wx + 1] = 't';
      g[wy][wx - 1] = g[wy][wx] = g[wy][wx + 1] = 'n';
    } else if (mood === 'side-eye') {
      g[wy][wx] = 'n';
      g[wy][wx - 1] = 'w';
    } else if (mood === 'sulking') {
      g[wy][wx] = 'n';
    }
  }

  return { layers: Ly, eye, mouth: G(HEAD_MOUTH), closedEyes: closed, pal: look.pal, blink: true };
}

function rects(g: Layer, pal: Record<string, string>): string {
  let out = '';
  for (let y = 0; y < SPRITE_H; y++) {
    let x = 0;
    while (x < SPRITE_W) {
      const c = g[y][x];
      if (c === '.') {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < SPRITE_W && g[y][x + len] === c) len++;
      out += `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${pal[c]}"/>`;
      x += len;
    }
  }
  return out;
}

/** SVG groups for a frame. */
export function frameInner(b: Built): string {
  const Ly = b.layers;
  let lid = '';
  if (b.blink && b.eye && !b.closedEyes) {
    const [wx, wy] = b.eye;
    lid = `<g class="bo-eye-lid"><rect x="${wx - 1}" y="${wy - 1}" width="3" height="1" fill="${b.pal.t}"/><rect x="${wx - 1}" y="${wy}" width="3" height="1" fill="${b.pal.n}"/></g>`;
  }
  return `<g class="bo-far">${rects(Ly.far, b.pal)}</g><g class="bo-tail">${rects(Ly.tail, b.pal)}</g><g class="bo-body">${rects(Ly.body, b.pal)}</g><g class="bo-near">${rects(Ly.near, b.pal)}</g><g class="bo-head">${rects(Ly.head, b.pal)}${lid}</g>`;
}

export function bbox(b: Built, only?: keyof Built['layers']): [number, number, number, number] {
  let x0 = SPRITE_W, y0 = SPRITE_H, x1 = 0, y1 = 0;
  for (const layer of only ? [b.layers[only]] : Object.values(b.layers))
    layer.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === '.') return;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }),
    );
  return [x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 2];
}

/** Common resting poses for thumbnails. */
export const SITTING: Spec = { fam: 'sit', head: 'up', tail: 'flat' };
export const SLEEPING: Spec = { fam: 'lie', head: 'rest', tail: 'flat' };

/** Standalone SVG cropped to the pet (thumbnails on Today, the pet picker). */
export function boSvg(stage: number, mood: Mood, cls = '', spec: Spec = SITTING, kind: PetKind = 'bo'): string {
  const b = build(spec, stage, mood, kind);
  const [x, y, w, h] = bbox(b);
  return `<svg class="bo ${cls}" viewBox="${x} ${y} ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${frameInner(b)}</svg>`;
}
