import type { Mood } from './types';

export const RANKS = [
  { name: 'Rookie', xp: 0 },
  { name: 'Contender', xp: 300 },
  { name: 'Boss', xp: 1000 },
  { name: 'Heavy Hitter', xp: 2500 },
  { name: 'Icon', xp: 5000 },
  { name: 'Queen', xp: 9000 },
  { name: 'Untouchable', xp: 15000 },
  { name: 'Legend', xp: 25000 },
];

export const BO_STAGES = [
  { name: 'Pup', bond: 0, perk: 'Fresh recruit. Chews things.' },
  { name: 'Recruit', bond: 80, perk: 'Earned the gold collar.' },
  { name: 'Partner', bond: 300, perk: 'Fully grown. Fully loyal.' },
  { name: 'K9 Unit', bond: 750, perk: 'Gold chain unlocked.' },
  { name: 'Alpha', bond: 1500, perk: 'Shades on. Woof woof.' },
  { name: 'Legend', bond: 2800, perk: 'Glows. Literally.' },
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

