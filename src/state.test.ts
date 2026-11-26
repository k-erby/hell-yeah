import { describe, expect, it } from 'vitest';
import { addDays, today, weekOf, weekDays } from './dates';
import {
  addLearning, addSolidify, bestStreak, defaultState, finishSkill, isRoutineDone,
  feedTreat, LOY, normalize, TREATS, settle, skillStats, startSkill, streak, toggleItem, XP,
} from './state';

const D = '2026-11-25'; // a Wednesday

describe('dates', () => {
  it('ISO week keys', () => {
    expect(weekOf('2026-11-25')).toBe('2026-W48');
    expect(weekOf('2026-01-01')).toBe('2026-W01');
    expect(weekOf('2027-01-01')).toBe('2026-W53');
  });
  it('week runs Monday to Sunday', () => {
    const w = weekDays(D);
    expect(w[0]).toBe('2026-11-23');
    expect(w[6]).toBe('2026-11-29');
  });
  it('day rolls over at 4am', () => {
    expect(today(new Date(2026, 10, 26, 1, 30))).toBe('2026-11-25');
    expect(today(new Date(2026, 10, 26, 4, 30))).toBe('2026-11-26');
  });
});

describe('routines', () => {
  it('awards XP once per item even if re-checked', () => {
    const s = defaultState();
    const id = s.routines.morning[0].id;
    toggleItem(s, 'morning', id, D);
    toggleItem(s, 'morning', id, D);
    toggleItem(s, 'morning', id, D);
    expect(s.xp).toBe(XP.item);
  });
  it('completes a routine and gives the bonus', () => {
    const s = defaultState();
    let last = { checked: false, routineDone: false };
    for (const it of s.routines.afternoon) last = toggleItem(s, 'afternoon', it.id, D);
    expect(last.routineDone).toBe(true);
    expect(isRoutineDone(s, 'afternoon', D)).toBe(true);
    expect(s.xp).toBe(XP.item * s.routines.afternoon.length + XP.routine);
  });
  it('Bo items give bonus loyalty', () => {
    const s = defaultState();
    const walk = s.routines.morning.find((i) => i.bo)!;
    const before = s.bo.bond;
    toggleItem(s, 'morning', walk.id, D);
    expect(s.bo.bond - before).toBe(LOY.item + LOY.boItem);
  });
});

describe('learning loop', () => {
  it('daily, weekly and monthly flow', () => {
    const s = defaultState();
    const sk = startSkill(s, 'Deadlifts', 'body', D);
    addLearning(s, 'hinge at the hips', 'body', sk.id, D);
    addLearning(s, 'second thing', 'body', sk.id, D); // no extra XP same day
    addSolidify(s, 'filmed my form', 'practiced', undefined, D);
    addSolidify(s, 'again', 'practiced', undefined, D); // once per week
    expect(s.xp).toBe(XP.skillStart + XP.learning + XP.solidify);
    const st = skillStats(s, sk);
    expect(st.days).toBe(1);
    expect(st.solid).toBe(2);
    finishSkill(s, sk.id, 'mastered', D);
    expect(skillStats(s, sk).pct).toBe(100);
    expect(s.xp).toBe(XP.skillStart + XP.learning + XP.solidify + XP.mastered);
  });
});

describe('streaks and decay', () => {
  it('counts streak through yesterday if today is not done yet', () => {
    const s = defaultState();
    addLearning(s, 'a', 'mind', undefined, addDays(D, -2));
    addLearning(s, 'b', 'mind', undefined, addDays(D, -1));
    expect(streak(s, D)).toBe(2);
    addLearning(s, 'c', 'mind', undefined, D);
    expect(streak(s, D)).toBe(3);
    expect(bestStreak(s)).toBe(3);
  });
  it('decays loyalty only for fully missed days, once', () => {
    const s = defaultState();
    s.bo.loyalty = 80;
    s.bo.settledThrough = addDays(D, -5);
    addLearning(s, 'x', 'mind', undefined, addDays(D, -2));
    s.bo.loyalty = 80; // ignore the gain from the line above
    const missed = settle(s, D); // days -4,-3,-1 missed
    expect(missed).toBe(3);
    expect(s.bo.loyalty).toBe(80 - 3 * LOY.decay);
    expect(settle(s, D)).toBe(0);
  });
});

describe('normalize', () => {
  it('fills missing fields from old saves', () => {
    const s = normalize({ xp: 42, profile: { name: 'Sam' } });
    expect(s.xp).toBe(42);
    expect(s.profile.dogName).toBe('Bo');
    expect(s.routines.morning.length).toBeGreaterThan(0);
    expect(s.settings.fx).toBe('stupid');
  });
});

describe('treats', () => {
  it('earned once per routine, spent on Bo', () => {
    const s = defaultState();
    const start = s.bo.treats;
    for (const it of s.routines.afternoon) toggleItem(s, 'afternoon', it.id, D);
    toggleItem(s, 'afternoon', s.routines.afternoon[0].id, D); // uncheck
    toggleItem(s, 'afternoon', s.routines.afternoon[0].id, D); // re-complete: no extra treat
    expect(s.bo.treats).toBe(start + TREATS.routine);
    while (feedTreat(s));
    expect(s.bo.treats).toBe(0);
    expect(feedTreat(s)).toBe(false);
  });
});
