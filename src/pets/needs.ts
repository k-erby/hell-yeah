/* ============================================================
   What the pet "says" on Today: a one-time tip, or the most important need.
   Works for any pet: it only looks at the pet's stats and what you've done.
   The words are in src/text/pets.ts; the bubble icons in src/pets/props.ts.

   Timing, so it isn't nagging:
   - One thing at a time. Nothing at all when nothing's worth saying.
   - Tips show once each, the first time they apply.
   - "Not now" on a need hides it until tomorrow.
   ============================================================ */
import { moodFor } from '../app/progress';
import { fedToday, isActive } from '../app/state';
import type { AppState } from '../app/types';

export type TipId = 'firstCheck' | 'firstTreat' | 'trust50' | 'trust70' | 'trust90';
export type NeedId = 'sulking' | 'hungry' | 'play';
export type Icon = 'star' | 'cloud' | 'bowl' | 'ball';

export type PetNote =
  | { kind: 'tip'; id: TipId; icon: Icon }
  | { kind: 'need'; id: NeedId; icon: Icon };

/** Trust milestones, highest first. Only the highest one you've reached shows. */
const TRUST_TIPS: [number, TipId][] = [
  [90, 'trust90'],
  [70, 'trust70'],
  [50, 'trust50'],
];

/** Seeing a milestone tip also counts the lower ones as seen. */
export function tipsCoveredBy(id: TipId): TipId[] {
  const i = TRUST_TIPS.findIndex(([, t]) => t === id);
  return i < 0 ? [id] : TRUST_TIPS.slice(i).map(([, t]) => t);
}

export function petNote(s: AppState, day: string): PetNote | null {
  const seen = new Set(s.seenTips ?? []);
  const tip = (id: TipId): PetNote | null => (seen.has(id) ? null : { kind: 'tip', id, icon: 'star' });

  // ---- one-time tips (in the order you'd naturally hit them)
  const everChecked = Object.keys(s.awarded).some((k) => k.startsWith('item:'));
  if (everChecked && tip('firstCheck')) return tip('firstCheck');
  if (s.bo.treats > 0 && tip('firstTreat')) return tip('firstTreat');
  const milestone = TRUST_TIPS.find(([at]) => s.bo.loyalty >= at);
  if (milestone && tip(milestone[1])) return tip(milestone[1]);

  // ---- needs, most important first (skipping any you waved off today)
  const quiet = new Set(s.bo.quiet?.day === day ? s.bo.quiet.ids : []);
  const needs: [NeedId, Icon, boolean][] = [
    ['sulking', 'cloud', moodFor(s.bo.loyalty) === 'sulking'],
    ['hungry', 'bowl', !fedToday(s, day) && s.bo.treats > 0],
    // Wants to play once he trusts you, you've done something today, and you haven't visited yet.
    ['play', 'ball', s.bo.loyalty >= 50 && isActive(s, day) && s.bo.visitDay !== day],
  ];
  const found = needs.find(([id, , on]) => on && !quiet.has(id));
  return found ? { kind: 'need', id: found[0], icon: found[1] } : null;
}
