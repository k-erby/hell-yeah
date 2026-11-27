import { describe, expect, it } from 'vitest';
import { defaultState, feedTreat, toggleItem } from '../app/state';
import { petNote, tipsCoveredBy } from './needs';

const D = '2026-11-25';
/** A pet who's past all the one-time tips. */
const settled = () => {
  const s = defaultState();
  s.seenTips = ['firstCheck', 'firstTreat', 'trust50', 'trust70', 'trust90'];
  return s;
};

describe('petNote', () => {
  it('says nothing to a brand-new user who has nothing to act on', () => {
    const s = defaultState();
    s.bo.treats = 0;
    expect(petNote(s, D)).toBeNull();
  });

  it('shows the check-off tip right after the first check-off, once', () => {
    const s = defaultState();
    s.bo.treats = 0;
    toggleItem(s, 'morning', s.routines.morning[0].id, D);
    expect(petNote(s, D)).toMatchObject({ kind: 'tip', id: 'firstCheck' });
    s.seenTips = ['firstCheck'];
    expect(petNote(s, D)?.id).not.toBe('firstCheck');
  });

  it('shows only the highest trust milestone, and that covers the lower ones', () => {
    const s = settled();
    s.seenTips = ['firstCheck', 'firstTreat'];
    s.bo.loyalty = 95;
    expect(petNote(s, D)).toMatchObject({ kind: 'tip', id: 'trust90' });
    expect(tipsCoveredBy('trust90')).toEqual(['trust90', 'trust70', 'trust50']);
  });

  it('sulking beats hungry; waving it off falls through to the next need', () => {
    const s = settled();
    s.bo.loyalty = 10;
    s.bo.treats = 2;
    expect(petNote(s, D)).toMatchObject({ kind: 'need', id: 'sulking' });
    s.bo.quiet = { day: D, ids: ['sulking'] };
    expect(petNote(s, D)).toMatchObject({ kind: 'need', id: 'hungry' });
    expect(petNote(s, '2026-11-26')?.id).toBe('sulking'); // back tomorrow
  });

  it('hungry until fed today', () => {
    const s = settled();
    s.bo.loyalty = 40;
    s.bo.treats = 2;
    expect(petNote(s, D)?.id).toBe('hungry');
    feedTreat(s, D);
    expect(petNote(s, D)).toBeNull();
  });

  it('wants to play only once trusted, after you did something today, until you visit', () => {
    const s = settled();
    s.bo.treats = 0;
    s.bo.loyalty = 60;
    expect(petNote(s, D)).toBeNull(); // nothing done yet today
    toggleItem(s, 'morning', s.routines.morning[0].id, D);
    expect(petNote(s, D)?.id).toBe('play');
    s.bo.visitDay = D;
    expect(petNote(s, D)).toBeNull();
    s.bo.loyalty = 40;
    s.bo.visitDay = undefined;
    expect(petNote(s, D)).toBeNull(); // doesn't trust you enough to play
  });
});
