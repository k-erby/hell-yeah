import { bbox, build, frameInner, SITTING, SPRITE_H, SPRITE_W, type HeadV, type Spec, type TailV } from './dog/sprite';
import { sfx } from '../effects/fx';
import type { Mood } from '../app/types';
import { tx } from '../lib/i18n';
import type { PetKind } from './kinds';
import { ballSvg, BALL_W, bedFrontSvg, bedSvg, BED_W, bowlSvg, shelfSvg, trunkSvg } from './props';
import type { dog } from '../text/dog';

type StatusKey = keyof typeof dog.status;

/* ============================================================
   Bo, the pocket pet. A tiny behaviour engine with two views:
   - HOUSE: Bo roams on his own. Tap the house to throw a ball, tap him to pet.
   - CLOSE: zoomed in on the same sprite. Rub him, boop his nose, feed treats.
   Bo runs one "act" at a time; each act sets an animation ("anim") that is
   turned into sprite frames over time. When he runs out of acts he picks a
   new behaviour weighted by his mood. Taps interrupt whatever he's doing.
   ============================================================ */

export interface PetEnv {
  /** Which pet (src/pets/kinds.ts). */
  kind: PetKind;
  stage: number;
  mood: Mood;
  asleep: boolean;
  sound: boolean;
  treats: number;
  /** Streak in days; fills the toy trunk. */
  streak: number;
  /** Fed today? (food bowl full or empty) */
  fed: boolean;
  /** This month's skill, for the flower pot (null = nothing planted). */
  plant: { month: string; level: number } | null;
}
export interface PetHooks {
  /** Spend a treat. Returns false if there are none. */
  onTreat(): boolean;
}

type Anim =
  | 'sit' | 'pant' | 'bark' | 'yawn' | 'scratch'
  | 'stand' | 'walk' | 'run' | 'sniff' | 'dig' | 'shake'
  | 'lie' | 'sleep' | 'bow' | 'stretch';
type Tail = '' | 'wag' | 'wag-fast' | 'droop';
type FaceMod = '' | 'tilt' | 'look-up' | 'boop' | 'lean' | 'shake';

interface Act {
  label: StatusKey;
  enter?(): void;
  update(dt: number): boolean; // true = finished
  exit?(): void;
}

const PX = 4; // house: screen px per sprite pixel
const SW = SPRITE_W * PX;
const SH = SPRITE_H * PX;
const FPX = 11; // close-up: screen px per sprite pixel
const GROUND = 18;
const GRAVITY = 900;
const BALL_R = (BALL_W * PX) / 2;
/** Lying down, his body sits this far ahead of the sprite's centre (in the way he faces). */
const BODY_AHEAD = 2 * PX;


/** Per pet: where its snout is when standing, and the close-up crop (head and shoulders of the sitting pose). */
const sizes = new Map<PetKind, { mouth: [number, number]; mouthX: number; crop: { x: number; y: number; w: number; h: number } }>();
function sizeOf(kind: PetKind) {
  let z = sizes.get(kind);
  if (!z) {
    const mouth = build({ fam: 'stand', head: 'up', tail: 'hang' }, 0, 'locked-in', kind).mouth;
    const [x, y, w, h] = bbox(build(SITTING, 0, 'locked-in', kind), 'head');
    z = { mouth, mouthX: (mouth[0] + 0.5 - SPRITE_W / 2) * PX, crop: { x: x - 4, y: y - 2, w: w + 8, h: h + 6 } };
    sizes.set(kind, z);
  }
  return z;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;

type Behaviour =
  | 'wander' | 'idle' | 'exit' | 'zoomies' | 'chase-tail' | 'bark' | 'sniff' | 'ball'
  | 'rest' | 'scratch' | 'dig' | 'yawn' | 'pant' | 'tilt' | 'stretch';

/**
 * How much he'll engage with you at each mood (moods come from loyalty: src/app/progress.ts → MOODS).
 * fetch = chance he chases a ball you throw · pets = chance he lets you pet him in the house.
 */
const TRUST: Record<Mood, { fetch: number; pets: number }> = {
  sulking: { fetch: 0, pets: 0 },
  'side-eye': { fetch: 0, pets: 0.6 },
  'on-watch': { fetch: 0.6, pets: 1 },
  'locked-in': { fetch: 1, pets: 1 },
  'ride-or-die': { fetch: 1, pets: 1 },
};

const WEIGHTS: Record<Mood, Partial<Record<Behaviour, number>>> = {
  'ride-or-die': { wander: 3, idle: 1, pant: 1.5, exit: 1, zoomies: 2, 'chase-tail': 1.5, bark: 1, sniff: 1, ball: 2.5, dig: 1, tilt: 1, rest: 0.5, scratch: 0.6, stretch: 0.6 },
  'locked-in': { wander: 3, idle: 1.5, pant: 1, exit: 1, zoomies: 1, 'chase-tail': 1, bark: 1, sniff: 1.5, ball: 2, dig: 1, tilt: 1, rest: 1, scratch: 0.8, yawn: 0.5, stretch: 0.6 },
  'on-watch': { wander: 3, idle: 3, exit: 1.2, sniff: 2, bark: 0.8, ball: 0.8, dig: 0.6, tilt: 0.8, rest: 2, scratch: 1, yawn: 1 },
  'side-eye': { wander: 2, idle: 3, exit: 2, sniff: 1, rest: 3, scratch: 0.6, yawn: 1.2 },
  sulking: { wander: 1, idle: 2, exit: 3, rest: 4, yawn: 1 },
};
const SPEED: Record<Mood, number> = { 'ride-or-die': 1.15, 'locked-in': 1, 'on-watch': 0.9, 'side-eye': 0.8, sulking: 0.6 };

export class Pet {
  view: 'house' | 'close' = 'house';

  // ---- house world
  private W = 300;
  private x = 150;
  private facing: 1 | -1 = 1;
  private anim: Anim = 'sit';
  private tail: Tail = 'wag';
  private tilt = false;
  private hop = false;
  private hopY = 0;
  private stride = 0;
  private animT = 0;
  private ball = { on: false, x: 0, y: 0, vx: 0, vy: 0, carried: false };
  private barking = 0;
  private sleeping = false;
  private awakeUntil = 0;
  private act: Act | null = null;
  private queue: Act[] = [];
  private hype = false;
  private mouth: [number, number] = sizeOf('bo').mouth;
  private eye: [number, number] | null = null;

  // ---- close-up world
  private head: HeadV = 'up';
  private eyesClosed = false;
  private earsBack = false;
  private fmod: FaceMod = '';
  private cact: Act | null = null;
  private cqueue: Act[] = [];
  private blinkT = 3;
  private rubUntil = 0;
  private rubDist = 0;
  private rubTotal = 0;
  private down: { x: number; y: number; moved: number } | null = null;
  private treat = { on: false, y: 0, vy: 0 };
  private closeT = 0;
  private closeMouthPx: [number, number] = [0, 0];

  // ---- DOM
  private scene: HTMLElement | null = null;
  private els: {
    pet: HTMLElement; sprite: HTMLElement; svg: SVGElement; ball: HTMLElement; bed: HTMLElement; bedOver: HTMLElement; trunk: HTMLElement; shelf: HTMLElement; bowl: HTMLElement; zzz: HTMLElement; bark: HTMLElement;
    close: HTMLElement; face: SVGElement; treat: HTMLElement;
    status: HTMLElement; petBtn: HTMLElement | null; treatBtn: HTMLElement | null;
  } | null = null;
  private svgKey = '';
  private trunkKey = '';
  private shelfKey = '';
  private bowlKey = '';
  private faceKey = '';
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver | null = null;

  constructor(private env: () => PetEnv, private hooks: PetHooks) {}

  // =========================================================
  // lifecycle
  // =========================================================

  mount(scene: HTMLElement, status: HTMLElement) {
    this.unmount();
    this.scene = scene;
    const c = sizeOf(this.env().kind).crop;
    scene.innerHTML = `
      <div class="house">
        <div class="ground"></div>
        <div class="trunk-spot"></div>
        <div class="shelf-spot"></div>
        <div class="bowl-spot"></div>
        <div class="bed-spot">${bedSvg(PX)}</div>
        <div class="toy-ball" hidden>${ballSvg(PX)}</div>
        <div class="pet">
          <div class="pet-sprite">
            <svg class="bo" viewBox="0 0 ${SPRITE_W} ${SPRITE_H}" width="${SW}" height="${SH}" shape-rendering="crispEdges"></svg>
            <div class="bark-lines"><i></i><i></i><i></i></div>
            <div class="dirt"><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="zzz"><i>Z</i><i>z</i><i>z</i></div>
        </div>
        <div class="bed-spot bed-over" hidden>${bedFrontSvg(PX)}</div>
      </div>
      <div class="close">
        <svg class="face bo" viewBox="${c.x} ${c.y} ${c.w} ${c.h}" width="${c.w * FPX}" height="${c.h * FPX}" shape-rendering="crispEdges"></svg>
        <div class="treat-biscuit" hidden></div>
        <div class="zzz close-zzz"><i>Z</i><i>z</i><i>z</i></div>
      </div>`;
    this.els = {
      pet: scene.querySelector('.pet')!,
      sprite: scene.querySelector('.pet-sprite')!,
      svg: scene.querySelector('.pet svg.bo')!,
      ball: scene.querySelector('.toy-ball')!,
      bed: scene.querySelector('.bed-spot')!,
      bedOver: scene.querySelector('.bed-over')!,
      trunk: scene.querySelector('.trunk-spot')!,
      shelf: scene.querySelector('.shelf-spot')!,
      bowl: scene.querySelector('.bowl-spot')!,
      zzz: scene.querySelector('.pet .zzz')!,
      bark: scene.querySelector('.bark-lines')!,
      close: scene.querySelector('.close')!,
      face: scene.querySelector('svg.face')!,
      treat: scene.querySelector('.treat-biscuit')!,
      status,
      petBtn: document.getElementById('pet-mode-btn'),
      treatBtn: document.getElementById('pet-treat-btn'),
    };
    this.svgKey = this.faceKey = this.trunkKey = this.shelfKey = this.bowlKey = '';
    const w = scene.clientWidth || 300;
    this.x = (this.x / this.W) * w;
    this.W = w;
    this.ro = new ResizeObserver(() => {
      const nw = scene.clientWidth || this.W;
      this.x = (this.x / this.W) * nw;
      this.ball.x = (this.ball.x / this.W) * nw;
      this.W = nw;
    });
    this.ro.observe(scene);
    scene.addEventListener('pointerdown', this.onDown);
    scene.addEventListener('pointermove', this.onMove);
    scene.addEventListener('pointerup', this.onUp);
    scene.addEventListener('pointercancel', this.onCancel);
    if (this.hype) {
      this.hype = false;
      this.view = 'house';
      this.interrupt(this.zoomies());
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    if (this.scene) {
      this.scene.removeEventListener('pointerdown', this.onDown);
      this.scene.removeEventListener('pointermove', this.onMove);
      this.scene.removeEventListener('pointerup', this.onUp);
      this.scene.removeEventListener('pointercancel', this.onCancel);
    }
    this.scene = null;
    this.els = null;
  }

  /** Something great happened elsewhere (routine done etc.). */
  celebrate() {
    this.hype = true;
    this.awakeUntil = Date.now() + 60_000;
  }

  // =========================================================
  // buttons
  // =========================================================

  toggleView() {
    this.setView(this.view === 'house' ? 'close' : 'house');
  }

  throwBall(tx = rand(this.W * 0.1, this.W * 0.9)) {
    this.setView('house');
    const fromX = this.W / 2;
    this.ball = { on: true, x: fromX, y: 160, vx: (tx - fromX) / 0.75, vy: 120, carried: false };
    if (this.sleeping) return; // sleeps right through it
    const { mood } = this.env();
    if (!chance(TRUST[mood].fetch)) {
      this.interrupt([this.watchBall(0.9, false), this.turnAway(), this.wait(2, 'lie', 'droop', 'notInterested')]);
      return;
    }
    this.interrupt([this.watchBall(0.35, true), this.chaseBall(true), ...this.bringBack()]);
  }

  talk() {
    if (this.view === 'close') {
      this.cInterrupt([this.cBark(3, true), this.cIdle(1.5)]);
      return;
    }
    if (this.wakeIfSleeping()) return;
    this.interrupt([this.wait(0.15, 'sit', '', 'talking'), this.bark(3, true), this.wait(1.2, 'pant', 'wag', 'proud')]);
  }

  giveTreat() {
    this.setView('close');
    if (this.treat.on) return;
    if (this.env().treats <= 0) {
      this.cInterrupt([this.cFace(1.6, 'up', false, false, 'tilt', 'noTreats'), this.cIdle(1)]);
      return;
    }
    if (!this.hooks.onTreat()) return;
    this.awakeUntil = Math.max(this.awakeUntil, Date.now() + 30_000);
    this.cInterrupt(this.cTreatSeq());
  }

  private setView(v: 'house' | 'close') {
    if (v === this.view) return;
    this.view = v;
    if (v === 'close') {
      this.cqueue = [];
      this.cact = null;
    }
  }

  // =========================================================
  // engine
  // =========================================================

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.animT += dt;
    this.stepHouse(dt);
    if (this.view === 'close') this.stepClose(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private run(dt: number, get: () => Act | null, set: (a: Act | null) => void, q: Act[], decide: () => Act[]) {
    let a = get();
    if (!a) {
      a = q.shift() ?? null;
      if (!a) {
        q.push(...decide());
        a = q.shift()!;
      }
      set(a);
      a.enter?.();
    }
    if (a.update(dt)) {
      a.exit?.();
      set(null);
    }
  }

  private stepHouse(dt: number) {
    if (this.view === 'house') this.run(dt, () => this.act, (a) => (this.act = a), this.queue, () => this.decide());
    this.physics(dt);
    this.barking = Math.max(0, this.barking - dt);
    if (this.hop) this.hopY = Math.abs(Math.sin(performance.now() / 110)) * 10;
    else this.hopY = Math.max(0, this.hopY - dt * 60);
  }

  private setAnim(anim: Anim, tail: Tail = '', opts: { tilt?: boolean; hop?: boolean } = {}) {
    if (anim !== this.anim) this.animT = 0;
    this.anim = anim;
    this.tail = tail;
    this.tilt = !!opts.tilt;
    this.hop = !!opts.hop;
  }

  private interrupt(acts: Act[]) {
    this.act?.exit?.();
    this.act = null;
    this.queue = acts;
  }

  private wakeIfSleeping(): boolean {
    if (!this.sleeping) return false;
    this.awakeUntil = Date.now() + 60_000;
    this.interrupt([
      this.wait(0.7, 'lie', '', 'wakingUp'),
      this.wait(1.1, 'yawn', '', 'yawning'),
      this.wait(1.3, 'stretch', '', 'stretching'),
      this.wait(0.8, 'shake', '', 'shakingItOff'),
      this.wait(1.2, 'sit', 'wag', 'awakeIsh'),
    ]);
    return true;
  }

  private dozing() {
    return this.env().asleep && Date.now() > this.awakeUntil;
  }

  private decide(): Act[] {
    const env = this.env();
    if (this.dozing()) {
      return [...this.toBed(40, 'gettingSleepy'), this.wait(1.2, 'yawn', '', 'yawning'), this.wait(1, 'lie', '', 'gettingComfy'), this.sleep()];
    }
    const entries = Object.entries(WEIGHTS[env.mood]) as [Behaviour, number][];
    let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
    let b: Behaviour = 'idle';
    for (const [k, w] of entries) if ((r -= w) <= 0) { b = k; break; }
    return this.behaviour(b, env.mood);
  }

  private behaviour(b: Behaviour, mood: Mood): Act[] {
    const sp = 55 * SPEED[mood];
    const W = this.W;
    const wag: Tail = mood === 'sulking' || mood === 'side-eye' ? 'droop' : 'wag';
    const spot = () => rand(W * 0.18, W * 0.82);
    switch (b) {
      case 'wander':
        return [this.walkTo(spot(), sp), this.wait(rand(1.5, 4), chance(0.3) ? 'stand' : 'sit', wag, 'chilling')];
      case 'idle':
        return [this.face(chance(0.5) ? 1 : -1), this.wait(rand(2, 5), 'sit', wag, mood === 'side-eye' ? 'judging' : 'onGuard')];
      case 'pant':
        return [this.wait(rand(2.5, 4.5), 'pant', 'wag', 'happy')];
      case 'tilt':
        return [this.wait(0.3, 'sit', wag), this.wait(1.4, 'sit', wag, 'headTilt', { tilt: true }), this.wait(1, 'sit', wag, 'onGuard')];
      case 'exit': {
        const away = mood === 'sulking' ? rand(5, 9) : rand(1.5, 4);
        return [
          this.walkTo(chance(0.5) ? -SW : W + SW, sp, 'headingOut'),
          this.wait(away, 'stand', '', 'offSomewhere'),
          this.teleport(chance(0.5) ? -SW : W + SW),
          this.walkTo(rand(W * 0.25, W * 0.75), sp, 'back'),
          this.wait(rand(1, 2.5), 'sit', wag, 'chilling'),
        ];
      }
      case 'zoomies':
        return this.zoomies();
      case 'chase-tail':
        return this.chaseTail();
      case 'bark':
        return [this.wait(0.3, 'sit', '', 'alert'), this.bark(Math.ceil(rand(1, 4)), false), this.wait(1.5, 'sit', 'wag', 'onGuard')];
      case 'sniff':
        return [
          this.walkTo(spot(), sp * 0.7, 'sniffingAround'),
          this.wait(rand(1.5, 2.5), 'sniff', 'wag', 'sniffing'),
          this.walkTo(spot(), sp * 0.7, 'sniffingAround'),
          this.wait(rand(1.5, 2.5), 'sniff', 'wag', 'foundSomething'),
        ];
      case 'dig':
        return [
          this.walkTo(spot(), sp, 'lookingForASpot'),
          this.wait(0.8, 'sniff', 'wag', 'sniffing'),
          this.wait(rand(1.8, 3), 'dig', 'wag-fast', 'digging'),
          this.wait(0.8, 'shake', '', 'shakingOffDirt'),
          this.wait(1.2, 'pant', 'wag', 'proudOfTheHole'),
        ];
      case 'ball': {
        if (!this.ball.on) this.ball = { on: true, x: spot(), y: 0, vx: 0, vy: 0, carried: false };
        const seq: Act[] = [this.wait(0.9, 'bow', 'wag-fast', 'playBow')];
        const kicks = Math.ceil(rand(2, 4));
        for (let i = 0; i < kicks; i++) seq.push(this.chaseBall(false), this.kick());
        seq.push(this.wait(1.5, 'bow', 'wag-fast', 'pleased'));
        return seq;
      }
      case 'rest':
        return [...(chance(0.5) ? this.toBed(sp * 0.8, 'headingToBed') : []), this.wait(0.6, 'lie', '', 'lyingDown'), this.wait(rand(4, 9), 'lie', mood === 'sulking' ? 'droop' : 'wag', 'resting')];
      case 'scratch':
        return [this.wait(0.3, 'sit', ''), this.wait(1.5, 'scratch', '', 'scratching'), this.wait(0.5, 'shake', '', 'shakingItOff'), this.wait(1, 'sit', wag, 'chilling')];
      case 'yawn':
        return [this.wait(0.3, 'sit', ''), this.wait(1.3, 'yawn', '', 'yawning'), this.wait(1.2, 'sit', wag, 'chilling')];
      case 'stretch':
        return [this.wait(1.4, 'stretch', '', 'stretching'), this.wait(0.6, 'shake', '', 'shakingItOff'), this.wait(1, 'stand', 'wag', 'ready')];
    }
  }

  // ---------- house acts ----------

  private wait(sec: number, anim: Anim, tail: Tail = '', label: StatusKey = 'chilling', opts: { tilt?: boolean; hop?: boolean } = {}): Act {
    let t = 0;
    return {
      label,
      enter: () => this.setAnim(anim, tail, opts),
      update: (dt) => (t += dt) >= sec,
      exit: () => {
        this.tilt = false;
        this.hop = false;
      },
    };
  }

  private walkTo(tx: number, speed: number, label: StatusKey = 'wandering'): Act {
    const fast = speed > 140;
    return {
      label,
      enter: () => this.setAnim(fast ? 'run' : 'walk', fast ? 'wag-fast' : 'wag'),
      update: (dt) => {
        const d = tx - this.x;
        if (Math.abs(d) < 2) {
          this.setAnim('stand', 'wag');
          return true;
        }
        this.facing = d > 0 ? 1 : -1;
        const step = Math.min(Math.abs(d), speed * dt);
        this.x += Math.sign(d) * step;
        this.stride += step;
        return false;
      },
    };
  }

  /** Where his bed is (its centre), tucked into the right side of the house. */
  private bedX() {
    return this.W - (BED_W * PX) / 2 - 10;
  }

  /** Where he stands so his body lands in the bed, facing `dir`. */
  private bedSpot(dir: 1 | -1) {
    return this.bedX() - BODY_AHEAD * dir;
  }

  private inBed() {
    return this.anim !== 'walk' && this.anim !== 'run' && Math.abs(this.x - this.bedSpot(this.facing)) < 6;
  }

  /** Walk over to the bed (nothing if he's already in it). */
  private toBed(speed: number, label: StatusKey): Act[] {
    if (this.inBed()) return [];
    const dir: 1 | -1 = this.bedX() >= this.x ? 1 : -1;
    return [this.walkTo(this.bedSpot(dir), speed, label), this.face(dir)];
  }

  private face(dir: 1 | -1): Act {
    return { label: 'lookingAround', update: () => ((this.facing = dir), true) };
  }

  private turnAway(): Act {
    return { label: 'turningAway', update: () => ((this.facing = this.x < this.W / 2 ? -1 : 1), true) };
  }

  private teleport(x: number): Act {
    return { label: 'offSomewhere', update: () => ((this.x = x), true) };
  }

  private bark(times: number, loud: boolean): Act {
    let t = 0;
    let done = 0;
    return {
      label: 'talking',
      enter: () => this.setAnim('bark', ''),
      update: (dt) => {
        t += dt;
        if (t >= done * 0.38) {
          if (done >= times) return t >= done * 0.38 + 0.2;
          this.barking = 0.22;
          if (loud && this.env().sound) sfx('woof', 0.8);
          done++;
        }
        return false;
      },
    };
  }

  private sleep(): Act {
    return {
      label: 'asleep',
      enter: () => {
        this.setAnim('sleep', '');
        this.sleeping = true;
      },
      update: () => !this.dozing(),
      exit: () => (this.sleeping = false),
    };
  }

  private zoomies(): Act[] {
    const W = this.W;
    return [
      this.wait(0.6, 'bow', 'wag-fast', 'uhOh'),
      this.walkTo(W * 0.88, 240, 'zoomies'),
      this.walkTo(W * 0.12, 260, 'zoomies'),
      this.walkTo(W * 0.85, 260, 'zoomies'),
      this.walkTo(W * 0.5, 210, 'zoomies'),
      this.wait(1.8, 'pant', 'wag-fast', 'catchingBreath'),
    ];
  }

  private chaseTail(): Act[] {
    let t = 0;
    let flip = 0;
    return [
      {
        label: 'chasingTail',
        enter: () => this.setAnim('run', 'wag-fast', { hop: true }),
        update: (dt) => {
          t += dt;
          flip += dt;
          this.stride += dt * 120;
          if (flip > 0.14) {
            flip = 0;
            this.facing = this.facing === 1 ? -1 : 1;
          }
          return t > 1.8;
        },
        exit: () => (this.hop = false),
      },
      this.wait(0.8, 'shake', '', 'dizzy'),
      this.wait(1, 'pant', 'wag', 'worthIt'),
    ];
  }

  private watchBall(sec: number, keen: boolean): Act {
    let t = 0;
    return {
      label: 'eyesOnTheToy',
      enter: () => (keen ? this.setAnim('bow', 'wag-fast') : this.setAnim('sit', 'droop')),
      update: (dt) => {
        this.facing = this.ball.x >= this.x ? 1 : -1;
        return (t += dt) >= sec;
      },
    };
  }

  private chaseBall(fetch: boolean): Act {
    return {
      label: fetch ? 'fetching' : 'playing',
      enter: () => this.setAnim('run', 'wag-fast'),
      update: (dt) => {
        const b = this.ball;
        if (!b.on) return true;
        const dir: 1 | -1 = b.x >= this.x ? 1 : -1;
        const target = b.x - dir * sizeOf(this.env().kind).mouthX;
        const d = target - this.x;
        this.facing = dir;
        if (Math.abs(d) < 6 && b.y < 24) {
          this.setAnim('stand', 'wag-fast');
          if (fetch) {
            b.carried = true;
            if (this.env().sound) sfx('tick', 0.5);
          }
          return true;
        }
        this.anim = 'run';
        const step = Math.min(Math.abs(d), (fetch ? 240 : 170) * dt);
        this.x += Math.sign(d) * step;
        this.stride += step;
        return false;
      },
    };
  }

  private kick(): Act {
    return {
      label: 'playing',
      update: () => {
        this.ball.vx = this.facing * rand(140, 260);
        this.ball.vy = rand(120, 260);
        if (this.env().sound) sfx('tick', 0.3);
        return true;
      },
    };
  }

  private bringBack(): Act[] {
    return [
      this.walkTo(this.W / 2 + rand(-30, 30), 120, 'bringingItBack'),
      {
        label: 'droppingIt',
        update: () => {
          this.facing = chance(0.5) ? 1 : -1;
          this.ball.carried = false;
          this.ball.vx = this.facing * 30;
          this.ball.vy = 60;
          return true;
        },
      },
      this.wait(0.2, 'sit', '', 'goodPet'),
      this.bark(1, false),
      this.wait(2.2, 'bow', 'wag-fast', 'throwItAgain'),
    ];
  }

  private physics(dt: number) {
    const b = this.ball;
    if (b.on) {
      if (b.carried) {
        b.x = this.x + this.facing * (this.mouth[0] + 0.5 - SPRITE_W / 2) * PX;
        b.y = (SPRITE_H - this.mouth[1] - 2) * PX + 1 - BALL_R;
      } else {
        b.vy -= GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y <= 0) {
          b.y = 0;
          if (Math.abs(b.vy) > 80) {
            b.vy = -b.vy * 0.45;
            b.vx *= 0.8;
          } else b.vy = 0;
        }
        if (b.y === 0) b.vx *= Math.pow(0.2, dt);
        if (b.x < BALL_R) {
          b.x = BALL_R;
          b.vx = Math.abs(b.vx) * 0.6;
        } else if (b.x > this.W - BALL_R) {
          b.x = this.W - BALL_R;
          b.vx = -Math.abs(b.vx) * 0.6;
        }
      }
    }
    const tr = this.treat;
    if (tr.on) {
      tr.vy += 1100 * dt;
      tr.y += tr.vy * dt;
    }
  }

  /** Turn the current animation + time into a sprite frame. */
  private houseSpec(mood: Mood): Spec {
    const t = this.animT;
    const step = (rate: number, n: number) => Math.floor(t / rate) % n;
    const wagRate = this.tail === 'wag-fast' ? 0.09 : this.tail === 'wag' ? 0.2 : 0;
    const wagIdx = wagRate ? step(wagRate, 2) : -1;
    const sitTail: TailV = wagIdx === 1 ? 'flatUp' : 'flat';
    const hangTail: TailV = wagIdx === -1 ? 'hang' : wagIdx ? 'hangL' : 'hangR';
    const upTail: TailV = wagIdx === -1 ? 'up' : wagIdx ? 'upL' : 'upR';
    const ears = mood === 'sulking' ? 'back' : 'up';
    switch (this.anim) {
      case 'sit':
        return { fam: 'sit', head: this.tilt ? 'tilt' : 'up', tail: sitTail, ears };
      case 'pant':
        return { fam: 'sit', head: step(0.16, 2) ? 'pant2' : 'pant', tail: sitTail, ears: 'back' };
      case 'bark':
        return { fam: 'sit', head: this.barking > 0 ? 'bark' : 'up', tail: sitTail };
      case 'yawn':
        return { fam: 'sit', head: t > 0.2 && t < 1.0 ? 'yawn' : 'up', tail: 'flat', ears: 'back' };
      case 'scratch':
        return { fam: 'sit', head: 'up', tail: 'flat', scratch: step(0.07, 2) ? 1 : 2, eyes: 'closed', ears: 'back' };
      case 'stand':
        return { fam: 'stand', legs: 'stand', head: 'up', tail: hangTail, ears };
      case 'walk': {
        const f = Math.floor(this.stride / 7) % 4;
        return { fam: 'stand', legs: (['walk0', 'walk1', 'walk2', 'walk3'] as const)[f], head: 'up', tail: hangTail, hdy: f % 2 ? -1 : 0, ears };
      }
      case 'run': {
        const f = Math.floor(this.stride / 10) % 4;
        const legs = (['run0', 'run1', 'run2', 'run1'] as const)[f];
        return { fam: 'stand', legs, head: 'pant', tail: 'out', ears: 'back', dy: f === 0 ? -2 : f === 2 ? 0 : -1 };
      }
      case 'sniff':
        return { fam: 'stand', legs: 'stand', head: 'down', tail: hangTail, hdy: step(0.22, 2) };
      case 'dig':
        return { fam: 'stand', legs: step(0.1, 2) ? 'dig0' : 'dig1', head: 'down', tail: upTail };
      case 'shake': {
        const s = step(0.06, 2);
        return { fam: 'stand', legs: 'stand', head: 'up', tail: s ? 'hangL' : 'hangR', ears: s ? 'back' : 'up', eyes: 'closed' };
      }
      case 'lie':
        return { fam: 'lie', head: 'up', tail: wagIdx >= 0 && step(0.35, 2) ? 'flatUp' : 'flat', ears };
      case 'sleep':
        return { fam: 'lie', head: 'rest', tail: 'flat' };
      case 'bow':
        return { fam: 'bow', head: step(0.16, 2) ? 'pant2' : 'pant', tail: upTail };
      case 'stretch':
        return { fam: 'bow', head: t > 0.3 && t < 1.1 ? 'yawn' : 'up', tail: 'up', ears: 'back' };
    }
  }

  // =========================================================
  // close-up
  // =========================================================

  private stepClose(dt: number) {
    this.closeT += dt;
    if (performance.now() < this.rubUntil) {
      const sulky = this.env().mood === 'sulking';
      this.eyesClosed = true;
      this.earsBack = true;
      this.head = sulky ? 'up' : Math.floor(this.closeT / 0.16) % 2 ? 'pant2' : 'pant';
      this.fmod = 'lean';
      if (this.dozing() && this.rubTotal > 120) this.awakeUntil = Date.now() + 60_000;
      return;
    }
    if (this.fmod === 'lean') this.fmod = '';
    this.run(dt, () => this.cact, (a) => (this.cact = a), this.cqueue, () => this.cDecide());
    if (!this.eyesClosed) {
      this.blinkT -= dt;
      if (this.blinkT <= 0) {
        this.blinkT = rand(2.5, 5);
        this.eyesClosed = true;
        setTimeout(() => {
          if (!this.dozing() && this.cact?.label !== 'chewing') this.eyesClosed = false;
        }, 130);
      }
    }
  }

  private cInterrupt(acts: Act[]) {
    this.cact?.exit?.();
    this.cact = null;
    this.cqueue = acts;
  }

  private cFace(sec: number, head: HeadV, closed: boolean, earsBack: boolean, fmod: FaceMod, label: StatusKey): Act {
    let t = 0;
    return {
      label,
      enter: () => {
        this.head = head;
        this.eyesClosed = closed;
        this.earsBack = earsBack;
        this.fmod = fmod;
      },
      update: (dt) => (t += dt) >= sec,
      exit: () => (this.fmod = ''),
    };
  }

  private cIdle(sec: number): Act {
    const mood = this.env().mood;
    const panting = (mood === 'ride-or-die' || mood === 'locked-in') && chance(0.6);
    let t = 0;
    return {
      label: 'upClose',
      enter: () => {
        this.eyesClosed = false;
        this.earsBack = mood === 'sulking';
        this.fmod = '';
      },
      update: (dt) => {
        t += dt;
        this.head = panting ? (Math.floor(t / 0.16) % 2 ? 'pant2' : 'pant') : 'up';
        return t >= sec;
      },
    };
  }

  private cDecide(): Act[] {
    if (this.dozing()) {
      return [
        {
          label: 'asleepRub',
          enter: () => {
            this.head = 'up';
            this.eyesClosed = true;
            this.earsBack = true;
            this.fmod = '';
          },
          update: () => !this.dozing(),
        },
        this.cFace(1, 'yawn', true, true, '', 'yawning'),
        this.cFace(0.5, 'up', false, false, 'shake', 'wakingUp'),
      ];
    }
    const mood = this.env().mood;
    const r = Math.random();
    if (r < 0.15) return [this.cFace(0.5, 'up', false, true, '', 'listening'), this.cIdle(rand(1.5, 3))];
    if (r < 0.28 && mood !== 'sulking') return [this.cFace(1.2, 'up', false, false, 'tilt', 'headTilt'), this.cIdle(rand(1.5, 3))];
    if (r < 0.36) return [this.cFace(1.1, 'yawn', true, true, '', 'yawning'), this.cIdle(rand(1.5, 3))];
    if (r < 0.42 && mood !== 'sulking') return [this.cBark(1, false), this.cIdle(2)];
    return [this.cIdle(rand(2, 4))];
  }

  private cBark(times: number, loud: boolean): Act {
    let t = 0;
    let done = 0;
    return {
      label: 'talking',
      enter: () => {
        this.eyesClosed = false;
        this.earsBack = false;
        this.fmod = '';
      },
      update: (dt) => {
        t += dt;
        this.head = done > 0 && t - (done - 1) * 0.36 < 0.18 ? 'bark' : 'up';
        if (t >= done * 0.36) {
          if (done >= times) return t >= done * 0.36 + 0.25;
          if (loud && this.env().sound) sfx('woof', 0.8);
          done++;
        }
        return false;
      },
    };
  }

  private cTreatSeq(): Act[] {
    let chewT = 0;
    return [
      {
        label: 'treat',
        enter: () => {
          this.treat = { on: true, y: -40, vy: 0 };
          this.head = 'up';
          this.eyesClosed = false;
          this.earsBack = false;
          this.fmod = 'look-up';
        },
        update: () => {
          const my = this.closeMouthPx[1];
          if (this.treat.y > my - 90) this.head = 'bark';
          if (this.treat.y >= my - 24) {
            this.treat.on = false;
            this.head = 'chew';
            this.fmod = '';
            if (this.env().sound) sfx('pop', 0.6);
            return true;
          }
          return false;
        },
      },
      {
        label: 'chewing',
        enter: () => {
          this.eyesClosed = true;
          this.earsBack = true;
        },
        update: (dt) => {
          chewT += dt;
          this.head = Math.floor(chewT / 0.14) % 2 ? 'chew' : 'up';
          if (Math.floor(chewT / 0.28) !== Math.floor((chewT - dt) / 0.28) && this.env().sound) sfx('tick', 0.15);
          return chewT > 1.8;
        },
      },
      this.cFace(0.6, 'pant2', true, true, '', 'lickingLips'),
      this.cFace(1.4, 'pant', false, false, 'tilt', 'more'),
      this.cIdle(1),
    ];
  }

  // =========================================================
  // input
  // =========================================================

  private local(e: PointerEvent) {
    const r = this.scene!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, fromBottom: r.bottom - e.clientY };
  }

  private onDown = (e: PointerEvent) => {
    if (!this.scene) return;
    const p = this.local(e);
    this.down = { x: p.x, y: p.y, moved: 0 };
    if (this.view === 'close') this.scene.setPointerCapture?.(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.down || !this.scene || this.view !== 'close') return;
    const p = this.local(e);
    const d = Math.hypot(p.x - this.down.x, p.y - this.down.y);
    this.down.moved += d;
    this.down.x = p.x;
    this.down.y = p.y;
    if (this.down.moved > 14) {
      this.rubUntil = performance.now() + 450;
      this.rubDist += d;
      this.rubTotal += d;
      if (this.rubDist > 34) {
        this.rubDist = 0;
        this.sparkle(p.x, p.y);
      }
    }
  };

  private onUp = (e: PointerEvent) => {
    if (!this.down || !this.scene) return;
    const moved = this.down.moved;
    this.down = null;
    if (moved > 14) {
      this.rubTotal = 0;
      return;
    }
    const p = this.local(e);
    if (this.view === 'close') this.closeTap(p.x, p.y);
    else this.houseTap(p.x, p.fromBottom);
  };

  private onCancel = () => {
    this.down = null;
  };

  private houseTap(x: number, fromBottom: number) {
    const onBo = Math.abs(x - this.x) < SW * 0.35 && fromBottom > GROUND && fromBottom < GROUND + SH * 0.85;
    if (onBo) this.patHouse();
    else this.throwBall(Math.min(Math.max(x, 12), this.W - 12));
  }

  private patHouse() {
    if (this.wakeIfSleeping()) return;
    if (!chance(TRUST[this.env().mood].pets)) {
      this.interrupt([this.turnAway(), this.wait(1.8, 'lie', 'droop', 'tolerating')]);
      return;
    }
    if (this.env().sound) sfx('tick', 0.4);
    const seq = [this.wait(0.9, 'pant', 'wag-fast', 'gettingPets', { hop: true }), this.wait(1.4, 'bow', 'wag-fast', 'happy')];
    if (chance(0.3)) seq.push(this.bark(1, true));
    if (chance(0.25)) seq.push(...this.chaseTail());
    this.interrupt(seq);
  }

  private closeTap(x: number, y: number) {
    const [mx, my] = this.closeMouthPx;
    const onNose = Math.hypot(x - mx, y - (my - FPX)) < FPX * 3;
    if (this.dozing()) {
      this.cInterrupt([this.cFace(0.4, 'up', true, true, '', 'stillAsleep')]);
      return;
    }
    if (onNose) {
      if (this.env().sound) sfx('tick', 0.6);
      this.cInterrupt([this.cFace(0.35, 'up', true, true, 'boop', 'boop'), this.cFace(0.5, 'up', false, false, 'shake', 'boop'), this.cIdle(1.5)]);
    } else {
      this.cInterrupt([this.cFace(1.2, 'up', false, false, 'tilt', 'headTilt'), this.cIdle(1.5)]);
    }
  }

  private sparkle(x: number, y: number) {
    if (!this.els) return;
    const s = document.createElement('i');
    s.className = 'sparkle';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    this.els.close.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }

  // =========================================================
  // render
  // =========================================================

  private draw() {
    const els = this.els;
    if (!els || !this.scene) return;
    const env = this.env();
    this.scene.classList.toggle('is-close', this.view === 'close');

    // ---- house
    const spec = this.houseSpec(env.mood);
    const key = `${JSON.stringify(spec)}|${env.stage}|${env.mood}|${env.kind}`;
    // Props only redraw when what they show changes.
    const trunkKey = String(env.streak);
    if (trunkKey !== this.trunkKey) els.trunk.innerHTML = trunkSvg(PX, env.streak), (this.trunkKey = trunkKey);
    const shelfKey = JSON.stringify(env.plant);
    if (shelfKey !== this.shelfKey) els.shelf.innerHTML = shelfSvg(PX, env.plant), (this.shelfKey = shelfKey);
    const bowlKey = String(env.fed);
    if (bowlKey !== this.bowlKey) els.bowl.innerHTML = bowlSvg(PX, env.fed), (this.bowlKey = bowlKey);
    if (key !== this.svgKey) {
      this.svgKey = key;
      const b = build(spec, env.stage, env.mood, env.kind);
      this.mouth = b.mouth;
      this.eye = b.eye;
      els.svg.innerHTML = frameInner(b);
    }
    els.pet.style.transform = `translate3d(${(this.x - SW / 2).toFixed(1)}px, ${(-this.hopY).toFixed(1)}px, 0)`;
    els.sprite.style.transform = `scaleX(${this.facing})`;
    const cls = `pet anim-${this.anim} tail-${this.tail || 'none'}${this.tilt ? ' tilt' : ''}${this.sleeping ? ' sleeping' : ''}${this.barking > 0 ? ' barking' : ''}`;
    if (els.pet.className !== cls) els.pet.className = cls;
    els.bark.style.left = `${(this.mouth[0] + 1) * PX}px`;
    els.bark.style.top = `${(this.mouth[1] - 4) * PX}px`;
    if (this.eye) {
      const ex = this.facing === 1 ? this.eye[0] * PX : (SPRITE_W - this.eye[0]) * PX;
      els.zzz.style.left = `${ex}px`;
      els.zzz.style.top = `${(this.eye[1] - 12) * PX}px`;
    }
    const b = this.ball;
    els.ball.hidden = !b.on;
    if (b.on) els.ball.style.transform = `translate3d(${(b.x - BALL_R).toFixed(1)}px, ${(-b.y).toFixed(1)}px, 0)`;
    const bedLeft = `${(this.bedX() - (BED_W * PX) / 2).toFixed(0)}px`;
    if (els.bed.style.left !== bedLeft) els.bed.style.left = els.bedOver.style.left = bedLeft;
    els.bedOver.hidden = !this.inBed();

    // ---- close-up: the same sprite, zoomed in on his head
    if (this.view === 'close') {
      // Tilts and nods are drawn frames, never rotations, so his neck stays attached.
      const tilted = (this.fmod === 'tilt' || this.fmod === 'lean') && this.head === 'up';
      const cspec: Spec = {
        ...SITTING,
        head: tilted ? 'tilt' : this.head,
        eyes: this.eyesClosed || this.fmod === 'boop' ? 'closed' : 'open',
        ears: this.earsBack ? 'back' : 'up',
        hdy: this.fmod === 'look-up' ? -1 : this.fmod === 'boop' ? 1 : 0,
      };
      const fkey = `${JSON.stringify(cspec)}|${env.stage}|${env.mood}|${env.kind}`;
      const c = sizeOf(env.kind).crop;
      if (fkey !== this.faceKey) {
        this.faceKey = fkey;
        const fb = build(cspec, env.stage, env.mood, env.kind);
        els.face.innerHTML = frameInner(fb);
        const H = this.scene.clientHeight || 270;
        const left = (this.W - c.w * FPX) / 2;
        const top = H - c.h * FPX;
        this.closeMouthPx = [left + (fb.mouth[0] - c.x + 0.5) * FPX, top + (fb.mouth[1] - c.y) * FPX];
      }
      const asleep = this.dozing() && this.cact?.label.startsWith('asleep');
      const ccls = `close fmod-${this.fmod || 'none'}${asleep ? ' sleeping' : ''}`;
      if (els.close.className !== ccls) els.close.className = ccls;
      els.treat.hidden = !this.treat.on;
      if (this.treat.on) els.treat.style.transform = `translate3d(${(this.closeMouthPx[0] - 17).toFixed(1)}px, ${this.treat.y.toFixed(1)}px, 0)`;
    }

    // ---- labels
    const label =
      this.view === 'close'
        ? performance.now() < this.rubUntil ? 'gettingPets' : this.cact?.label ?? 'upClose'
        : this.sleeping ? 'asleepTap' : this.act?.label ?? '';
    const text = label ? tx(`dog.status.${label}`).toLocaleUpperCase() : '';
    if (els.status.textContent !== text) els.status.textContent = text;
    if (els.petBtn) {
      const t = tx(this.view === 'close' ? 'dog.buttons.house' : 'dog.buttons.pet');
      if (els.petBtn.textContent !== t) els.petBtn.textContent = t;
    }
    if (els.treatBtn) {
      const t = tx('dog.buttons.treat', { n: env.treats });
      if (els.treatBtn.textContent !== t) els.treatBtn.textContent = t;
    }
  }
}
