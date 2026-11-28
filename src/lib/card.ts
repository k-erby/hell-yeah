/**
 * The share card: a 1080×1350 image in the current theme's colours, with your pet on it.
 * Drawing waits for the fonts first, then paints in one go, so the
 * preview never flashes blank when you tap a toggle.
 */

export interface CardData {
  name: string;
  date: string;
  /** Each line on the card: a small label, then one value (or a few, bulleted). */
  items: { label: string; values: string[] }[];
  /** The pet as a standalone SVG (petSvg). */
  pet: string;
  footer: string;
}

export const CARD_W = 1080;
export const CARD_H = 1350;
const PAD = 90;

/** The pet's pixels, read back out of its SVG (the blink lid left out). */
function petPixels(svg: string) {
  const body = svg.replace(/<g class="bo-eye-lid">.*?<\/g>/g, '');
  const vb = /viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/.exec(body);
  const [x0, y0, w, h] = vb ? vb.slice(1).map(Number) : [0, 0, 48, 32];
  const rects = [...body.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g)].map((m) => ({
    x: Number(m[1]) - x0, y: Number(m[2]) - y0, w: Number(m[3]), h: Number(m[4]), fill: m[5],
  }));
  return { w, h, rects };
}

/** Split text into lines that fit, at most `max` lines (the last gets an ellipsis if cut). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= width || !cur) {
      cur = next;
      continue;
    }
    out.push(cur);
    cur = words[i];
    if (out.length === max) {
      cur = '';
      out[max - 1] = fit(ctx, `${out[max - 1]}…`, width);
      break;
    }
  }
  if (cur) out.push(fit(ctx, cur, width));
  return out;
}

/** Trim one too-long word so it fits. */
function fit(ctx: CanvasRenderingContext2D, s: string, width: number): string {
  if (ctx.measureText(s).width <= width) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > width) s = s.slice(0, -1);
  return `${s}…`;
}

let drawing = 0;
let lastDraw: Promise<void> = Promise.resolve();

/** Draw the card. If another draw starts before this one is ready, this one gives up. */
export function drawCard(canvas: HTMLCanvasElement, d: CardData): Promise<void> {
  const id = ++drawing;
  lastDraw = (async () => {
    const css = getComputedStyle(document.documentElement);
    const c = (name: string) => css.getPropertyValue(name).trim();
    await Promise.all([
      document.fonts?.load('110px Anton').catch(() => null),
      document.fonts?.load('800 52px Inter').catch(() => null),
      document.fonts?.load('600 30px Inter').catch(() => null),
    ]);
    if (id !== drawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background: the app's dark base with a glow in the top corner.
    ctx.fillStyle = c('--bg');
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    const glow = ctx.createRadialGradient(CARD_W * 0.85, -80, 0, CARD_W * 0.85, -80, CARD_W);
    glow.addColorStop(0, c('--bg2'));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Frame.
    ctx.strokeStyle = c('--accent');
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(36, 36, CARD_W - 72, CARD_H - 72, 44);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // The pet, top right, pixel-sharp.
    {
      const px = petPixels(d.pet);
      const scale = Math.max(1, Math.floor(Math.min(280 / px.w, 280 / px.h)));
      const ox = CARD_W - PAD - px.w * scale, oy = 90 + 280 - px.h * scale;
      for (const r of px.rects) {
        ctx.fillStyle = r.fill;
        ctx.fillRect(ox + r.x * scale, oy + r.y * scale, r.w * scale, r.h * scale);
      }
    }

    // Name and date.
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = c('--accent');
    ctx.font = '110px Anton, Impact, sans-serif';
    const nameW = CARD_W - PAD * 2 - 300;
    ctx.fillText(fit(ctx, d.name.toLocaleUpperCase(), nameW), PAD, 250);
    ctx.fillStyle = c('--muted');
    ctx.font = '600 32px Inter, system-ui, sans-serif';
    ctx.fillText(d.date, PAD, 310);

    // The lines you picked: the biggest text size that fits them all.
    // An item can have a few values (learnings): those get a bullet each and fewer lines apiece.
    const top = 450, bottom = 1190, width = CARD_W - PAD * 2, indent = 40;
    const font = (size: number) => `800 ${size}px Inter, system-ui, sans-serif`;
    const plan = (size: number) => {
      ctx.font = font(size);
      const rows = d.items.map((it) =>
        it.values.map((v) => (it.values.length > 1 ? wrap(ctx, v, width - indent, 2) : wrap(ctx, v, width, 3))),
      );
      const gap = Math.round(size * 1.3);
      const label = Math.max(22, Math.round(size * 0.44));
      const paraGap = Math.round(size * 0.35);
      const line = size + 10;
      // From the first label's baseline to the last value's baseline.
      const itemH = (paras: string[][]) => size + 12 + paras.reduce((h, r) => h + r.length * line, 0) - line + (paras.length - 1) * paraGap;
      const height = rows.reduce((h, r) => h + itemH(r) + gap + label, 0) - gap - label;
      return { size, rows, gap, label, paraGap, line, height };
    };
    let p = plan(64);
    for (let size = 60; p.height > bottom - top && size >= 28; size -= 4) p = plan(size);
    // Few lines: sit them a bit lower so the card doesn't look top-heavy.
    let y = top + Math.max(0, Math.min(60, (bottom - top - p.height) / 3));
    for (const [i, it] of d.items.entries()) {
      if (i > 0) {
        ctx.fillStyle = c('--line');
        ctx.fillRect(PAD, y - Math.round(p.gap / 2) - p.label, width, 2);
      }
      ctx.fillStyle = c('--accent');
      ctx.font = `800 ${p.label}px Inter, system-ui, sans-serif`;
      ctx.fillText(it.label.toLocaleUpperCase(), PAD, y);
      y += p.size + 12 - p.line;
      const bullets = it.values.length > 1;
      for (const [k, para] of p.rows[i].entries()) {
        if (k > 0) y += p.paraGap;
        for (const [r, row] of para.entries()) {
          y += p.line;
          if (bullets && r === 0) {
            const dot = Math.round(p.size * 0.22);
            ctx.fillStyle = c('--accent');
            ctx.fillRect(PAD, y - Math.round(p.size * 0.36) - dot / 2, dot, dot);
          }
          ctx.fillStyle = c('--text');
          ctx.font = font(p.size);
          ctx.fillText(row, PAD + (bullets ? indent : 0), y);
        }
      }
      y += p.gap + p.label;
    }

    // Footer.
    ctx.fillStyle = c('--accent');
    ctx.globalAlpha = 0.8;
    ctx.font = '44px Anton, Impact, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(d.footer, CARD_W - PAD, CARD_H - 90);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  })();
  return lastDraw;
}

/** The card as a PNG, once the latest draw has finished. */
export async function cardFile(canvas: HTMLCanvasElement): Promise<File | null> {
  await lastDraw;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  return blob ? new File([blob], 'hell-yeah.png', { type: 'image/png' }) : null;
}
