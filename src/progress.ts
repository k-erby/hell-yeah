import type { Mood } from './types';

export const RANKS = [
  { name: 'Rookie', xp: 0 },
  // A full day of routines + a learning is ~150-200 XP, so roughly:
  { name: 'Contender', xp: 1_000 }, //    ~1 week
  { name: 'Boss', xp: 3_500 }, //         ~3 weeks
  { name: 'Heavy Hitter', xp: 8_000 }, // ~1.5 months
  { name: 'Icon', xp: 16_000 }, //        ~3 months
  { name: 'Queen', xp: 28_000 }, //       ~5 months
  { name: 'Untouchable', xp: 45_000 }, // ~8 months
  { name: 'Legend', xp: 70_000 }, //      ~1 year
];

export const BO_STAGES = [
  { name: 'Pup', bond: 0, perk: 'Fresh recruit. Chews things.' },
  { name: 'Recruit', bond: 80, perk: 'Knows your schedule better than you do.' },
  { name: 'Partner', bond: 300, perk: 'Fully grown. Fully loyal.' },
  { name: 'K9 Unit', bond: 750, perk: 'Will die for you. Would prefer a treat.' },
  { name: 'Alpha', bond: 1500, perk: 'Runs this house. Lets you think you do.' },
  { name: 'Legend', bond: 2800, perk: 'Ride or die, for real.' },
];

function ladder<T extends { name: string }>(list: T[], value: number, key: (t: T) => number) {
  let index = 0;
  list.forEach((t, i) => {
    if (value >= key(t)) index = i;
  });
  const cur = list[index];
  const next = list[index + 1];
  const pct = next ? ((value - key(cur)) / (key(next) - key(cur))) * 100 : 100;
  return { index, name: cur.name, cur, next, pct: Math.max(0, Math.min(100, pct)) };
}

export const rankFor = (xp: number) => ladder(RANKS, xp, (r) => r.xp);
export const stageFor = (bond: number) => ladder(BO_STAGES, bond, (b) => b.bond);

export function moodFor(loyalty: number): Mood {
  if (loyalty >= 85) return 'ride-or-die';
  if (loyalty >= 65) return 'locked-in';
  if (loyalty >= 45) return 'on-watch';
  if (loyalty >= 25) return 'side-eye';
  return 'sulking';
}

export const MOODS: Record<Mood, { label: string }> = {
  'ride-or-die': { label: 'Ride or die' },
  'locked-in': { label: 'Locked in' },
  'on-watch': { label: 'On watch' },
  'side-eye': { label: 'Side-eye' },
  sulking: { label: 'Sulking' },
};

