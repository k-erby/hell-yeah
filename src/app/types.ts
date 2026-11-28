import type { PetKind } from '../pets/kinds';

export type Mode = 'morning' | 'afternoon' | 'night';
export type Branch = 'body' | 'mind' | 'craft' | 'money' | 'social';
export type Method = 'practiced' | 'taught' | 'wrote' | 'built';
export type FxLevel = 'classy' | 'stupid';
export type Mood = 'ride-or-die' | 'locked-in' | 'on-watch' | 'side-eye' | 'sulking';
export type Tab = 'today' | 'learn' | 'tree' | 'bo' | 'more';

export const MODES: Mode[] = ['morning', 'afternoon', 'night'];
export const BRANCHES: Branch[] = ['body', 'mind', 'craft', 'money', 'social'];
export const METHODS: Method[] = ['practiced', 'taught', 'wrote', 'built'];

export interface RoutineItem {
  id: string;
  label: string;
  /** One-off: shows until it's checked off, then it's gone the next day. Otherwise it repeats every day. */
  once?: true;
  /** For one-offs: the day it got checked off. */
  doneOn?: string;
}

/** "Every DAY I learn something new." */
export interface Learning {
  id: string;
  date: string; // YYYY-MM-DD (logical day)
  text: string;
  branch: Branch;
  skillId?: string;
}

/** "Every WEEK I solidify something I learned." */
export interface Solidify {
  id: string;
  week: string; // YYYY-Www
  date: string;
  text: string;
  method: Method;
  learningId?: string;
  skillId?: string;
}

/** "Every MONTH I learn a new skill." */
export interface Skill {
  id: string;
  name: string;
  branch: Branch;
  month: string; // YYYY-MM
  status: 'active' | 'mastered' | 'dropped';
  /** Self-rated progress: 0 Day one … 4 Nailed it (= mastered). */
  level?: number;
  doneAt?: string;
}

export interface Settings {
  fx: FxLevel;
  sound: boolean;
  haptics: boolean;
  theme: 'auto' | Mode;
}

/** Timer lengths you can pick, in minutes. */
export const FOCUS_MINUTES = [5, 15, 25] as const;
export type FocusMinutes = (typeof FOCUS_MINUTES)[number];

/** A focus timer on one task. Stored as times, so closing the app doesn't lose it. */
export interface Focus {
  mode: Mode;
  itemId: string;
  minutes: FocusMinutes;
  startedAt: number;
  endsAt: number;
}

export interface AppState {
  version: 1;
  /** dogName is the pet's name, whatever the pet is (kept as dogName so old saves still load). */
  profile: { name: string; dogName: string; buddyName: string; createdAt: string; pet: PetKind };
  routines: Record<Mode, RoutineItem[]>;
  /** The running focus timer, or the finished one waiting for "Done?". */
  focus?: Focus;
  /** day -> mode -> checked item ids */
  days: Record<string, Partial<Record<Mode, string[]>>>;
  learnings: Learning[];
  solidifies: Solidify[];
  skills: Skill[];
  xp: number;
  /** One-time award keys so un-checking and re-checking can't farm XP. */
  awarded: Record<string, 1>;
  bo: {
    loyalty: number; // 0-100, decays on missed days
    bond: number; // lifetime, drives evolution
    settledThrough: string; // last day decay was processed for
    lastActiveAt: number; // ms timestamp of last task/learning; Bo naps if it's been a while
    treats: number; // earned by finishing routines / learning, spent on the Bo tab
    /** Day loyalty was last gained, and how much that day (gains are capped per day). */
    trustDay?: string;
    trustToday?: number;
    /** Last day he was fed (the first treat of a day is his meal). */
    fedDay?: string;
    /** Last day you opened his tab. */
    visitDay?: string;
    /** Reminders you waved off, and the day you did. They come back tomorrow. */
    quiet?: { day: string; ids: string[] };
  };
  /** One-time tips already shown. */
  seenTips?: string[];
  settings: Settings;
}
