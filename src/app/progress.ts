import { t } from '../lib/i18n';
import type { Mood } from './types';

/** Names for these ids live in src/text/vibe.ts. */
export const RANKS = [
  { id: 'rookie', xp: 0 },
  // A full day of routines + a learning is ~150-200 XP, so roughly:
  { id: 'contender', xp: 1_000 }, //    ~1 week
  { id: 'boss', xp: 3_500 }, //         ~3 weeks
  { id: 'heavyHitter', xp: 8_000 }, // ~1.5 months
  { id: 'icon', xp: 16_000 }, //        ~3 months
  { id: 'queen', xp: 28_000 }, //       ~5 months
  { id: 'untouchable', xp: 45_000 }, // ~8 months
  { id: 'legend', xp: 70_000 }, //      ~1 year
] as const;

export const DOG_STAGES = [
  { id: 'pup', bond: 0 },
  { id: 'recruit', bond: 80 },
  { id: 'partner', bond: 300 },
  { id: 'k9', bond: 750 },
  { id: 'alpha', bond: 1500 },
  { id: 'legend', bond: 2800 },
] as const;

function ladder<T>(arr: readonly T[], value: number, key: (t: T) => number) {
  let index = 0;
  arr.forEach((t, i) => {
    if (value >= key(t)) index = i;
  });
  const cur = arr[index];
  const next: T | undefined = arr[index + 1];
  const pct = next ? ((value - key(cur)) / (key(next) - key(cur))) * 100 : 100;
  return { index, cur, next, pct: Math.max(0, Math.min(100, pct)) };
}

export const rankFor = (xp: number) => ladder(RANKS, xp, (r) => r.xp);
export const stageFor = (bond: number) => ladder(DOG_STAGES, bond, (b) => b.bond);

/** Display names. */
export const rankName = (id: (typeof RANKS)[number]['id']) => t(`ranks.${id}`);
export const stageName = (id: (typeof DOG_STAGES)[number]['id']) => t(`dogStages.${id}.name`);
export const stagePerk = (id: (typeof DOG_STAGES)[number]['id']) => t(`dogStages.${id}.perk`);

/**
 * Moods by loyalty. Each one changes how the pet acts (src/pets/pet.ts → TRUST):
 *   sulking      won't play, won't be petted
 *   side-eye     ignores the ball, puts up with pets
 *   on-watch     plays fetch sometimes
 *   locked-in    always up for fetch
 *   ride-or-die  zoomies, brings you the ball
 */
export const MOODS: readonly { mood: Mood; from: number }[] = [
  { mood: 'sulking', from: 0 },
  { mood: 'side-eye', from: 25 },
  { mood: 'on-watch', from: 50 },
  { mood: 'locked-in', from: 70 },
  { mood: 'ride-or-die', from: 90 },
];

export const moodFor = (loyalty: number): Mood => ladder(MOODS, loyalty, (m) => m.from).cur.mood;

export const moodName = (m: Mood) => t(`moods.${m}`);
