import { describe, expect, it } from 'vitest';
import { addDays, today, weekOf, weekDays } from './dates';
import {
  addLearning, addSolidify, bestStreak, defaultState, finishSkill, isRoutineDone,
  feedTreat, fedToday, LOY, MAX_LEVEL, normalize, setSkillLevel, TREATS, settle, skillStats, startSkill, streak, toggleItem, XP,
  checkedFor, FOCUS_BONUS, finishFocus, startFocus, stopFocus,
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
  it('loyalty grows slowly: capped per day, bond keeps the full amount', () => {
    const s = defaultState();
    const start = s.bo.loyalty;
    const bond0 = s.bo.bond;
    for (const it of s.routines.morning) toggleItem(s, 'morning', it.id, D);
    addLearning(s, 'x', 'mind', undefined, D);
    expect(s.bo.loyalty - start).toBe(LOY.dailyCap);
    expect(s.bo.bond - bond0).toBe(LOY.item * s.routines.morning.length + LOY.routine + LOY.learning);
    toggleItem(s, 'afternoon', s.routines.afternoon[0].id, addDays(D, 1));
    expect(s.bo.loyalty - start).toBe(LOY.dailyCap + LOY.item); // new day, new room
  });
  it('the first treat of the day is a meal', () => {
    const s = defaultState();
    s.bo.treats = 3;
    const start = s.bo.loyalty;
    expect(fedToday(s, D)).toBe(false);
    feedTreat(s, D);
    expect(fedToday(s, D)).toBe(true);
    expect(s.bo.loyalty - start).toBe(LOY.meal);
    feedTreat(s, D); // seconds: bond only
    expect(s.bo.loyalty - start).toBe(LOY.meal);
    expect(s.bo.treats).toBe(1);
  });
  it('one-off tasks stay until checked off, then leave the next day', () => {
    const s = defaultState();
    s.routines.morning.push({ id: 'dentist', label: 'Call the dentist', once: true });
    settle(s, addDays(D, 1));
    expect(s.routines.morning.some((i) => i.id === 'dentist')).toBe(true); // not done: still there
    toggleItem(s, 'morning', 'dentist', addDays(D, 1));
    settle(s, addDays(D, 1));
    expect(s.routines.morning.some((i) => i.id === 'dentist')).toBe(true); // done today: still showing
    settle(s, addDays(D, 2));
    expect(s.routines.morning.some((i) => i.id === 'dentist')).toBe(false); // gone tomorrow
    expect(s.routines.morning.length).toBeGreaterThan(0); // every-day tasks untouched
  });
  it('unchecking a one-off keeps it around', () => {
    const s = defaultState();
    s.routines.morning.push({ id: 'x', label: 'One thing', once: true });
    toggleItem(s, 'morning', 'x', D);
    toggleItem(s, 'morning', 'x', D);
    settle(s, addDays(D, 1));
    expect(s.routines.morning.some((i) => i.id === 'x')).toBe(true);
  });
  it('keeps one-offs through a save', () => {
    const s = normalize({ routines: { morning: [{ id: 'a', label: 'Once', once: true, doneOn: D }] } });
    expect(s.routines.morning[0]).toEqual({ id: 'a', label: 'Once', once: true, doneOn: D });
  });
  it('drops the old dog-task tag from saves', () => {
    const s = normalize({ routines: { morning: [{ id: 'a', label: 'Walk Bo', bo: true }] } });
    expect(s.routines.morning[0]).toEqual({ id: 'a', label: 'Walk Bo' });
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
    const xpBefore = s.xp;
    finishSkill(s, sk.id, 'mastered', D);
    expect(skillStats(s, sk).pct).toBe(100);
    // Jumping to mastered pays out every remaining step on the way.
    expect(s.xp - xpBefore).toBe(XP.level * (MAX_LEVEL - 1) + XP.mastered);
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

describe('skill levels', () => {
  it('pays each step once, and the top step masters it', () => {
    const s = defaultState();
    const sk = startSkill(s, 'Spanish', 'mind', D);
    const base = s.xp;
    setSkillLevel(s, sk.id, 2, D);
    expect(s.xp - base).toBe(XP.level * 2);
    expect(skillStats(s, sk).levelId).toBe('decent');
    setSkillLevel(s, sk.id, 1, D); // honest correction: no XP lost
    setSkillLevel(s, sk.id, 2, D); // ...and none re-earned
    expect(s.xp - base).toBe(XP.level * 2);
    setSkillLevel(s, sk.id, MAX_LEVEL, D);
    expect(sk.status).toBe('mastered');
    expect(skillStats(s, sk).pct).toBe(100);
    setSkillLevel(s, sk.id, 3, D); // un-master
    expect(sk.status).toBe('active');
  });

  it('lock-ins can be tied to any skill, or none', () => {
    const s = defaultState();
    const sk = startSkill(s, 'Spanish', 'mind', D);
    addSolidify(s, 'untied', 'taught', undefined, D, null);
    expect(skillStats(s, sk).solid).toBe(0);
    addSolidify(s, 'tied', 'taught', undefined, D, sk.id);
    expect(skillStats(s, sk).solid).toBe(1);
  });
});

describe('focus timer', () => {
  const day = '2026-03-02';
  const setup = () => {
    const s = defaultState(new Date('2026-03-02T09:00:00'));
    const item = s.routines.morning[0];
    return { s, item };
  };

  it('only runs one timer at a time', () => {
    const { s, item } = setup();
    expect(startFocus(s, 'morning', item.id, 5, 0)).toBe(true);
    expect(startFocus(s, 'morning', s.routines.morning[1].id, 15, 1000)).toBe(false);
    expect(s.focus?.itemId).toBe(item.id);
    expect(s.focus?.endsAt).toBe(5 * 60_000);
  });

  it("can't be finished before time is up", () => {
    const { s, item } = setup();
    startFocus(s, 'morning', item.id, 5, 0);
    expect(finishFocus(s, day, 60_000)).toBeNull();
    expect(s.focus).toBeDefined();
  });

  it('Done checks the task off and gives bond, not loyalty', () => {
    const { s, item } = setup();
    const bond = s.bo.bond, loyalty = s.bo.loyalty, treats = s.bo.treats;
    startFocus(s, 'morning', item.id, 25, 0);
    const r = finishFocus(s, day, 25 * 60_000);
    expect(r?.checked).toBe(true);
    expect(checkedFor(s, day, 'morning').has(item.id)).toBe(true);
    expect(s.focus).toBeUndefined();
    // The check-off itself earns its usual loyalty; the timer adds bond + a treat on top.
    expect(s.bo.bond).toBe(bond + LOY.item + FOCUS_BONUS[25].bond);
    expect(s.bo.loyalty).toBe(loyalty + LOY.item);
    expect(s.bo.treats).toBe(treats + FOCUS_BONUS[25].treats);
  });

  it("doesn't uncheck a task that was already checked", () => {
    const { s, item } = setup();
    toggleItem(s, 'morning', item.id, day);
    startFocus(s, 'morning', item.id, 5, 0);
    finishFocus(s, day, 5 * 60_000);
    expect(checkedFor(s, day, 'morning').has(item.id)).toBe(true);
  });

  it('stopping gives nothing', () => {
    const { s, item } = setup();
    const bond = s.bo.bond;
    startFocus(s, 'morning', item.id, 15, 0);
    stopFocus(s);
    expect(s.focus).toBeUndefined();
    expect(s.bo.bond).toBe(bond);
  });

  it('survives a save, and junk is dropped', () => {
    const { s, item } = setup();
    startFocus(s, 'morning', item.id, 15, 0);
    expect(normalize(JSON.parse(JSON.stringify(s))).focus).toEqual(s.focus);
    expect(normalize({ ...s, focus: { mode: 'nope', itemId: 1 } }).focus).toBeUndefined();
  });
});
