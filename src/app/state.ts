import { addDays, daysInMonth, monthOf, today, weekOf } from './dates';
import type { AppState, Branch, Learning, Method, Mode, RoutineItem, Skill } from './types';
import { MODES } from './types';
import { list, tx } from '../lib/i18n';

export const XP = { item: 5, routine: 25, learning: 20, solidify: 75, skillStart: 10, level: 50, mastered: 300 };
export const TREATS = { routine: 1, learning: 1, solidify: 2, mastered: 3 };
/**
 * Loyalty: 0-100, and it takes a while. He warms up at most `dailyCap` a day however much
 * you do, and every fully missed day costs `decay`. A new pet starts at `start`.
 * Roughly two weeks of showing up gets a new pet from wary to ride-or-die.
 * How he behaves at each level: src/app/progress.ts (MOODS) and src/pets/pet.ts (TRUST).
 */
export const LOY = { start: 30, item: 1, routine: 2, learning: 2, solidify: 4, mastered: 6, meal: 1, dailyCap: 5, decay: 10 };

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/** Starter routines come from src/text/ui.ts. {dog} becomes the pet's name. */
export function defaultRoutines(dogName = tx('defaults.dogName')): Record<Mode, RoutineItem[]> {
  const make = (labels: string[]) => labels.map((l): RoutineItem => ({ id: uid(), label: l.replaceAll('{dog}', dogName) }));
  return {
    morning: make(list('defaults.routines.morning')),
    afternoon: make(list('defaults.routines.afternoon')),
    night: make(list('defaults.routines.night')),
  };
}

export function defaultState(now = new Date()): AppState {
  const t = today(now);
  return {
    version: 1,
    profile: { name: tx('defaults.name'), dogName: tx('defaults.dogName'), buddyName: '', createdAt: t },
    routines: defaultRoutines(),
    days: {},
    learnings: [],
    solidifies: [],
    skills: [],
    xp: 0,
    awarded: {},
    bo: { loyalty: LOY.start, bond: 0, settledThrough: addDays(t, -1), lastActiveAt: now.getTime(), treats: 3 },
    settings: { fx: 'stupid', sound: true, haptics: true, theme: 'auto' },
  };
}

/** Fill in anything missing (older saves, imports) without dropping data. */
export function normalize(raw: unknown): AppState {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<AppState>;
  return {
    ...d,
    ...r,
    version: 1,
    profile: { ...d.profile, ...r.profile },
    // (Older saves tagged some tasks as dog tasks; that's gone, so keep just id + label.)
    routines: Object.fromEntries(
      Object.entries({ ...d.routines, ...r.routines }).map(([m, items]) => [m, items.map(({ id, label }) => ({ id, label }))]),
    ) as AppState['routines'],
    days: r.days ?? {},
    learnings: r.learnings ?? [],
    solidifies: r.solidifies ?? [],
    skills: r.skills ?? [],
    xp: r.xp ?? 0,
    awarded: r.awarded ?? {},
    bo: { ...d.bo, ...r.bo },
    settings: { ...d.settings, ...r.settings },
  };
}

// ---------- rewards ----------

/** Bond always grows by the full amount; loyalty only by what's left of today's cap. */
function gainLoyalty(s: AppState, n: number, day: string) {
  s.bo.bond += n;
  if (s.bo.trustDay !== day) {
    s.bo.trustDay = day;
    s.bo.trustToday = 0;
  }
  const room = Math.max(0, LOY.dailyCap - (s.bo.trustToday ?? 0));
  const gain = Math.min(n, room);
  s.bo.trustToday = (s.bo.trustToday ?? 0) + gain;
  s.bo.loyalty = Math.min(100, s.bo.loyalty + gain);
}

/** Award XP + loyalty once per key. Returns true if newly awarded. */
function award(s: AppState, key: string, xp: number, loyalty: number, day: string): boolean {
  s.bo.lastActiveAt = Date.now(); // any real action wakes Bo up
  if (s.awarded[key]) return false;
  s.awarded[key] = 1;
  s.xp += xp;
  gainLoyalty(s, loyalty, day);
  return true;
}

// ---------- routines ----------

export function checkedFor(s: AppState, day: string, mode: Mode): Set<string> {
  return new Set(s.days[day]?.[mode] ?? []);
}

export function isRoutineDone(s: AppState, mode: Mode, day: string): boolean {
  const items = s.routines[mode];
  if (!items.length) return false;
  const checked = checkedFor(s, day, mode);
  return items.every((i) => checked.has(i.id));
}

export function toggleItem(s: AppState, mode: Mode, itemId: string, day = today()) {
  const log = (s.days[day] ??= {});
  const list = (log[mode] ??= []);
  const idx = list.indexOf(itemId);
  if (idx >= 0) {
    list.splice(idx, 1);
    return { checked: false, routineDone: false };
  }
  list.push(itemId);
  award(s, `item:${day}:${mode}:${itemId}`, XP.item, LOY.item, day);
  const routineDone = isRoutineDone(s, mode, day);
  if (routineDone && award(s, `routine:${day}:${mode}`, XP.routine, LOY.routine, day)) s.bo.treats += TREATS.routine;
  return { checked: true, routineDone };
}

// ---------- learning ----------

export function addLearning(s: AppState, text: string, branch: Branch, skillId?: string, day = today()): Learning {
  const l: Learning = { id: uid(), date: day, text, branch, ...(skillId ? { skillId } : {}) };
  s.learnings.push(l);
  if (award(s, `learn:${day}`, XP.learning, LOY.learning, day)) s.bo.treats += TREATS.learning;
  return l;
}

export function deleteLearning(s: AppState, id: string) {
  s.learnings = s.learnings.filter((l) => l.id !== id);
}

/**
 * `skill`: a skill id to tie the lock-in to, `null` for none, or leave it out to
 * use the picked learning's skill (or this month's skill).
 */
export function addSolidify(s: AppState, text: string, method: Method, learningId?: string, day = today(), skill?: string | null) {
  const week = weekOf(day);
  const learning = learningId ? s.learnings.find((l) => l.id === learningId) : undefined;
  const skillId = skill === undefined ? (learning?.skillId ?? currentSkill(s, day)?.id) : skill || undefined;
  s.solidifies.push({
    id: uid(),
    week,
    date: day,
    text,
    method,
    ...(learningId ? { learningId } : {}),
    ...(skillId ? { skillId } : {}),
  });
  if (award(s, `solid:${week}`, XP.solidify, LOY.solidify, day)) s.bo.treats += TREATS.solidify;
}

export function startSkill(s: AppState, name: string, branch: Branch, day = today()): Skill {
  const month = monthOf(day);
  const existing = currentSkill(s, day);
  if (existing) {
    existing.name = name;
    existing.branch = branch;
    return existing;
  }
  const sk: Skill = { id: uid(), name, branch, month, status: 'active' };
  s.skills.push(sk);
  award(s, `skill:${month}`, XP.skillStart, 0, day);
  return sk;
}

/** Progress steps for a skill. The last one means mastered. */
/** Ids of a skill's steps; their names live in src/text/ui.ts (skillLevels). */
export const SKILL_LEVELS = ['dayOne', 'gettingIt', 'decent', 'solid', 'nailedIt'] as const;
export type SkillLevelId = (typeof SKILL_LEVELS)[number];
export const MAX_LEVEL = SKILL_LEVELS.length - 1;

export const skillLevel = (sk: Skill) => (sk.status === 'mastered' ? MAX_LEVEL : Math.min(sk.level ?? 0, MAX_LEVEL));

/**
 * Set how far along a skill is. Each step pays out once (going down and back up
 * doesn't farm XP). Reaching the top step masters the skill.
 */
export function setSkillLevel(s: AppState, id: string, level: number, day = today()) {
  const sk = s.skills.find((k) => k.id === id);
  if (!sk || sk.status === 'dropped') return;
  const lvl = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  for (let n = 1; n <= lvl; n++) {
    if (n === MAX_LEVEL) {
      if (award(s, `mastered:${id}`, XP.mastered, LOY.mastered, day)) s.bo.treats += TREATS.mastered;
    } else award(s, `level:${id}:${n}`, XP.level, LOY.item, day);
  }
  sk.level = lvl;
  if (lvl === MAX_LEVEL) {
    sk.status = 'mastered';
    sk.doneAt = day;
  } else if (sk.status === 'mastered') {
    sk.status = 'active';
    delete sk.doneAt;
  }
}

export function finishSkill(s: AppState, id: string, status: 'mastered' | 'dropped', day = today()) {
  if (status === 'mastered') return setSkillLevel(s, id, MAX_LEVEL, day);
  const sk = s.skills.find((k) => k.id === id);
  if (!sk) return;
  sk.status = 'dropped';
  sk.doneAt = day;
}

/** Skills you can still feed: anything not mastered or dropped, newest first. */
export const activeSkills = (s: AppState) => s.skills.filter((k) => k.status === 'active').sort((a, b) => b.month.localeCompare(a.month));

export function currentSkill(s: AppState, day = today()): Skill | undefined {
  const m = monthOf(day);
  return s.skills.find((k) => k.month === m && k.status === 'active');
}

export function skillStats(s: AppState, sk: Skill) {
  const learnings = s.learnings.filter((l) => l.skillId === sk.id);
  const days = new Set(learnings.map((l) => l.date)).size;
  const solid = s.solidifies.filter((x) => x.skillId === sk.id).length;
  const level = skillLevel(sk);
  const pct = Math.round((level / MAX_LEVEL) * 100);
  return { learnings, days, solid, level, levelId: SKILL_LEVELS[level], pct, monthDays: daysInMonth(sk.month) };
}

// ---------- activity, streaks, Bo decay ----------

export function isActive(s: AppState, day: string): boolean {
  const log = s.days[day];
  if (log && MODES.some((m) => (log[m]?.length ?? 0) > 0)) return true;
  return s.learnings.some((l) => l.date === day);
}

export function streak(s: AppState, day = today()): number {
  let d = isActive(s, day) ? day : addDays(day, -1);
  let n = 0;
  while (isActive(s, d) && n < 5000) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(s: AppState): number {
  const days = new Set<string>();
  for (const [d, log] of Object.entries(s.days)) if (MODES.some((m) => (log[m]?.length ?? 0) > 0)) days.add(d);
  for (const l of s.learnings) days.add(l.date);
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue; // not a run start
    let n = 0;
    let c = d;
    while (days.has(c)) {
      n++;
      c = addDays(c, 1);
    }
    best = Math.max(best, n);
  }
  return best;
}

/** Apply loyalty decay for every fully-missed day since we last checked. Returns missed day count. */
export function settle(s: AppState, day = today()): number {
  const yesterday = addDays(day, -1);
  let d = addDays(s.bo.settledThrough, 1);
  let missed = 0;
  let guard = 0;
  while (d <= yesterday && guard++ < 400) {
    if (!isActive(s, d)) {
      missed++;
      s.bo.loyalty = Math.max(0, s.bo.loyalty - LOY.decay);
    }
    d = addDays(d, 1);
  }
  if (s.bo.settledThrough < yesterday) s.bo.settledThrough = yesterday;
  return missed;
}

/**
 * Give the pet a treat. The first one each day is his meal (a little loyalty);
 * extras are just for fun (bond only). Doesn't count as "activity", so it can't stop his naps.
 */
export function feedTreat(s: AppState, day = today()): boolean {
  if (s.bo.treats <= 0) return false;
  s.bo.treats--;
  if (s.bo.fedDay !== day) {
    s.bo.fedDay = day;
    gainLoyalty(s, LOY.meal, day);
  } else s.bo.bond += 1;
  return true;
}

export const fedToday = (s: AppState, day = today()) => s.bo.fedDay === day;
/** Loyalty gained so far today (out of LOY.dailyCap). */
export const trustToday = (s: AppState, day = today()) => (s.bo.trustDay === day ? (s.bo.trustToday ?? 0) : 0);

/** Bo naps when you haven't done anything for a while. */
export const NAP_HOURS = 3;
export const isAsleep = (s: AppState, now = Date.now()) => now - s.bo.lastActiveAt > NAP_HOURS * 3_600_000;

export const routinesFinished = (s: AppState) => Object.keys(s.awarded).filter((k) => k.startsWith('routine:')).length;
