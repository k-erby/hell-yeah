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
  /** Bo-related tasks (walks etc.) give Bo bonus loyalty. */
  bo?: boolean;
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

export interface AppState {
  version: 1;
  profile: { name: string; dogName: string; buddyName: string; createdAt: string };
  routines: Record<Mode, RoutineItem[]>;
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
  };
  settings: Settings;
}
