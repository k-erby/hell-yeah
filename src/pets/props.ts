/* ============================================================
   Yard props (bed, ball), drawn as pixel art at the same scale as the pets.
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
