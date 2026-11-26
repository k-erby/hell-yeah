import type { FxLevel } from './types';

/* ============================================================
   Explosions. Canvas overlay, particles, word pops, shockwaves.
   ============================================================ */

type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
  shape: 0 | 1 | 2; rot: number; vr: number; g: number;
};
type Word = { text: string; x: number; y: number; life: number; max: number; size: number; rot: number };
type Ring = { x: number; y: number; r: number; vr: number; life: number; max: number; w: number };

let cvs: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D;
let parts: Particle[] = [];
let words: Word[] = [];
let rings: Ring[] = [];
let flash = 0;
let running = false;
let last = 0;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickOne = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function ensure() {
  if (cvs) return;
  cvs = document.createElement('canvas');
  cvs.className = 'fx-canvas';
  document.body.appendChild(cvs);
  ctx = cvs.getContext('2d')!;
  resize();
  addEventListener('resize', resize);
}

function resize() {
  if (!cvs) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cvs.width = innerWidth * dpr;
  cvs.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function colors(): string[] {
  const cs = getComputedStyle(document.documentElement);
  const a = cs.getPropertyValue('--accent').trim() || '#e8b64c';
  const b = cs.getPropertyValue('--accent2').trim() || '#fff0c2';
  return [a, a, b, b, '#ffffff', '#fff6d6'];
}

function spawn(x: number, y: number, n: number, power: number) {
  const pal = colors();
  const k = reduced() ? 0.25 : 1;
  for (let i = 0; i < n * k; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = power * rand(0.25, 1);
    parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - power * 0.25,
      life: 0, max: rand(0.6, 1.5), size: rand(2, 5.5),
      color: pickOne(pal),
      shape: Math.random() < 0.45 ? 0 : Math.random() < 0.75 ? 1 : 2,
      rot: rand(0, 6.28), vr: rand(-12, 12), g: rand(700, 1100),
    });
  }
}

function word(text: string, x: number, y: number, size: number, max = 0.9) {
  words.push({ text, x, y, life: 0, max, size, rot: rand(-0.12, 0.12) });
}

function ring(x: number, y: number, speed: number, w = 4) {
  if (reduced()) return;
  rings.push({ x, y, r: 4, vr: speed, life: 0, max: 0.55, w });
}

function start() {
  ensure();
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(loop);
}

function loop(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const w = innerWidth;
  const h = innerHeight;
  ctx.clearRect(0, 0, w, h);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,248,225,${flash})`;
    ctx.fillRect(0, 0, w, h);
    flash = Math.max(0, flash - dt * 2.6);
  }

  const accent = colors()[0];
  rings = rings.filter((r) => (r.life += dt) < r.max);
  for (const r of rings) {
    r.r += r.vr * dt;
    ctx.globalAlpha = 1 - r.life / r.max;
    ctx.strokeStyle = accent;
    ctx.lineWidth = r.w * (1 - r.life / r.max) + 0.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  parts = parts.filter((p) => (p.life += dt) < p.max);
  for (const p of parts) {
    p.vx *= Math.pow(0.35, dt);
    p.vy = p.vy * Math.pow(0.35, dt) + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const k = p.life / p.max;
    ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.shape === 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else if (p.shape === 1) {
      ctx.lineWidth = Math.max(1, p.size / 2.5);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  words = words.filter((t) => (t.life += dt) < t.max);
  for (const t of words) {
    const k = t.life / t.max;
    const pop = k < 0.12 ? 0.3 + (k / 0.12) * 0.95 : 1.25 - Math.min(0.25, (k - 0.12) * 1.2);
    ctx.globalAlpha = k > 0.72 ? (1 - k) / 0.28 : 1;
    ctx.save();
    ctx.translate(t.x, t.y - k * 18);
    ctx.rotate(t.rot);
    let size = t.size;
    ctx.font = `${size}px Anton, Impact, "Arial Black", sans-serif`;
    const mw = ctx.measureText(t.text).width;
    if (mw > w * 0.9) {
      size = (size * w * 0.9) / mw;
      ctx.font = `${size}px Anton, Impact, "Arial Black", sans-serif`;
    }
    ctx.scale(pop, pop);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size / 7);
    ctx.strokeStyle = '#000';
    ctx.strokeText(t.text, 0, 0);
    const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    grad.addColorStop(0, '#fff8e0');
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  if (parts.length || words.length || rings.length || flash > 0) requestAnimationFrame(loop);
  else {
    running = false;
    ctx.clearRect(0, 0, w, h);
  }
}

function shake(hard = false) {
  if (reduced()) return;
  const el = document.getElementById('app');
  if (!el) return;
  el.classList.remove('shake', 'shake-hard');
  void el.offsetWidth;
  el.classList.add(hard ? 'shake-hard' : 'shake');
  setTimeout(() => el.classList.remove('shake', 'shake-hard'), 600);
}

const ITEM_WORDS = [
  'BOOM', 'CRUSHED', 'HANDLED', 'NAILED', 'YES BITCH', 'HELL YES', 'FUCK YEAH', 'BADASS', 'SLAYED',
  'BOOM BITCH', 'EAT IT', 'DAMN RIGHT', 'NEXT, BITCH', 'FUCK OFF, TASK', 'SHE ATE', 'GET FUCKED', 'BYE BITCH',
];
const BIG_WORDS = [
  'FUCKING DESTROYED', 'BADASS BEHAVIOR', 'BOW DOWN', 'THAT BITCH DID IT', 'OBLITERATED', 'HOLY SHIT',
  'BOSS ASS BITCH', 'UNFUCKWITHABLE', 'FLAWLESS AS FUCK', 'DONE. OBVIOUSLY.',
];

export interface FxOpts { level: FxLevel; sound: boolean; haptics: boolean }

/** One checklist item checked. */
export function itemFx(x: number, y: number, o: FxOpts) {
  start();
  if (o.level === 'classy') {
    spawn(x, y, 16, 260);
    ring(x, y, 160, 2);
    if (o.sound) sfx('tick');
    buzz(o, 12);
    return;
  }
  spawn(x, y, 70, 650);
  ring(x, y, 420, 5);
  const pool = ITEM_WORDS;
  word(pickOne(pool), Math.min(Math.max(x + 60, 90), innerWidth - 90), y - 30, 40, 0.8);
  shake();
  if (o.sound) sfx('pop');
  buzz(o, [18, 30, 18]);
}

/** A whole routine finished / something big. */
export function bigFx(o: FxOpts, title?: string) {
  start();
  const w = innerWidth;
  const h = innerHeight;
  if (o.level === 'classy') {
    for (let i = 0; i < 4; i++) setTimeout(() => spawn(rand(w * 0.15, w * 0.85), rand(h * 0.15, h * 0.4), 40, 380), i * 140);
    word(title ?? 'DONE.', w / 2, h * 0.38, 64, 1.4);
    if (o.sound) sfx('chime');
    buzz(o, [20, 40, 20]);
    return;
  }
  flash = reduced() ? 0 : 0.75;
  shake(true);
  const n = reduced() ? 2 : 7;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const x = i === 0 ? w / 2 : rand(w * 0.1, w * 0.9);
      const y = i === 0 ? h * 0.42 : rand(h * 0.12, h * 0.75);
      spawn(x, y, 110, 1000);
      ring(x, y, 700, 7);
      if (o.sound && i % 2 === 0) sfx('boom', i === 0 ? 1 : 0.55);
      if (i === 3) shake(true);
    }, i * 150);
  }
  const pool = BIG_WORDS;
  word(title ?? pickOne(pool), w / 2, h * 0.4, 84, 1.8);
  buzz(o, [60, 40, 120, 40, 200]);
}

/** A medium hit (logging a learning). */
export function hitFx(x: number, y: number, o: FxOpts, text: string) {
  start();
  spawn(x, y, o.level === 'stupid' ? 120 : 30, o.level === 'stupid' ? 800 : 320);
  ring(x, y, 500, 5);
  word(text, w2(x), y - 40, o.level === 'stupid' ? 46 : 32, 1);
  if (o.level === 'stupid') shake();
  if (o.sound) sfx(o.level === 'stupid' ? 'boom' : 'chime', 0.5);
  buzz(o, [25, 30, 25]);
}
const w2 = (x: number) => Math.min(Math.max(x, 110), innerWidth - 110);

function buzz(o: FxOpts, pattern: number | number[]) {
  if (o.haptics && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

/* ============================================================
   Sound. All synthesized, no audio files.
   ============================================================ */

let ac: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac ??= new Ctor();
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function noise(a: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

export function sfx(kind: 'tick' | 'pop' | 'boom' | 'chime' | 'woof', vol = 1) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const out = a.createGain();
  out.gain.value = 0.5 * vol;
  out.connect(a.destination);

  const tone = (type: OscillatorType, f0: number, f1: number, dur: number, g = 0.5, delay = 0) => {
    const o = a.createOscillator();
    const gn = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t + delay);
    o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
    gn.gain.setValueAtTime(g, t + delay);
    gn.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
    o.connect(gn).connect(out);
    o.start(t + delay);
    o.stop(t + delay + dur + 0.02);
  };

  if (kind === 'tick') {
    tone('sine', 1300, 2100, 0.08, 0.35);
  } else if (kind === 'chime') {
    tone('sine', 880, 880, 0.5, 0.25);
    tone('sine', 1320, 1320, 0.6, 0.2, 0.08);
    tone('triangle', 1760, 1760, 0.7, 0.12, 0.16);
  } else if (kind === 'pop') {
    const n = noise(a, 0.25);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    const g = a.createGain();
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(f).connect(g).connect(out);
    n.start(t);
    tone('square', 220, 55, 0.15, 0.25);
  } else if (kind === 'boom') {
    const n = noise(a, 1.6);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(60, t + 1.3);
    const g = a.createGain();
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    n.connect(f).connect(g).connect(out);
    n.start(t);
    tone('sine', 140, 32, 0.9, 0.9);
  } else if (kind === 'woof') {
    tone('sawtooth', 320, 140, 0.12, 0.3);
    tone('sawtooth', 300, 120, 0.14, 0.3, 0.16);
  }
}
