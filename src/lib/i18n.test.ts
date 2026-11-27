import { describe, expect, it } from 'vitest';
import { list, setLocale, t, tn, tx, type Messages } from './i18n';
import { DOG_STAGES, RANKS } from '../app/progress';
import { defaultRoutines, SKILL_LEVELS } from '../app/state';
import { dog } from '../text/dog';
import { pets } from '../text/pets';
import { ui } from '../text/ui';
import { vibe } from '../text/vibe';

/** Walk every message in the text files. */
function* walk(o: unknown, path = ''): Generator<[string, unknown]> {
  if (typeof o === 'string' || Array.isArray(o)) yield [path, o];
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) yield* walk(v, path ? `${path}.${k}` : k);
}
const all = [...walk({ ...ui, dog, pets, ...vibe })];

describe('text files (src/text)', () => {
  it('has no empty text', () => {
    for (const [path, v] of all) {
      if (Array.isArray(v)) {
        expect(v.length, `${path} is an empty list`).toBeGreaterThan(0);
        v.forEach((line, i) => expect(line.trim(), `${path}[${i}] is empty`).not.toBe(''));
      } else expect((v as string).trim(), `${path} is empty`).not.toBe('');
    }
  });

  it('has balanced {placeholders} and <b> tags', () => {
    for (const [path, v] of all) {
      for (const line of [v].flat() as string[]) {
        expect((line.match(/\{/g) ?? []).length, `${path}: a { or } is missing in "${line}"`).toBe((line.match(/\}/g) ?? []).length);
        expect((line.match(/<b>/g) ?? []).length, `${path}: a <b> or </b> is missing in "${line}"`).toBe((line.match(/<\/b>/g) ?? []).length);
      }
    }
  });

  it('plural forms use the same {placeholders}', () => {
    for (const [path, v] of all) {
      if (!/\.(one|other|zero|two|few|many)$/.test(path)) continue;
      const other = all.find(([p]) => p === path.replace(/\.\w+$/, '.other'))?.[1] as string;
      const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).filter((x) => x !== '{n}').sort();
      expect(names(v as string), `${path} uses different {names} than .other`).toEqual(names(other));
    }
  });

  it('covers every rank, dog stage and skill level', () => {
    for (const r of RANKS) expect(t(`ranks.${r.id}`)).toBeTruthy();
    for (const d of DOG_STAGES) expect(t(`dogStages.${d.id}.name`)).toBeTruthy();
    for (const l of SKILL_LEVELS) expect(t(`skillLevels.${l}`)).toBeTruthy();
  });
});

describe('t()', () => {
  it('fills {placeholders} and escapes them in HTML', () => {
    expect(t('toasts.planted', { skill: '<script>' })).toBe('<b>&lt;script&gt;</b> is planted. Feed it every day.');
    expect(tx('confirm.drop', { skill: 'R&B' })).toContain('"R&B"');
  });

  it('formats numbers', () => {
    expect(t('today.xp', { xp: 12500 })).toBe('12,500 XP');
  });

  it('picks the right plural form', () => {
    expect(tn('learn.history.count', 1)).toBe('1 thing');
    expect(tn('learn.history.count', 0)).toBe('0 things');
    expect(tn('tree.branches.leaves', 2)).toBe('2 leaves');
  });

  it('uses another language when set', () => {
    const fake = structuredClone({ ...ui, dog, pets, ...vibe }) as Messages;
    fake.learn.plant.button = 'Planter';
    fake.learn.history.count = { one: '{n} chose', many: '{n} de choses', other: '{n} choses' };
    setLocale('fr', fake);
    expect(t('learn.plant.button')).toBe('Planter');
    expect(tn('learn.history.count', 1)).toBe('1 chose');
    expect(tn('learn.history.count', 2)).toBe('2 choses');
    setLocale('en', { ...ui, dog, pets, ...vibe } as Messages);
    expect(list('boomWords').length).toBeGreaterThan(0);
  });
});

describe('starter routines', () => {
  it('fills in the dog name', () => {
    const r = defaultRoutines('Rex');
    expect(r.morning.some((i) => i.label === 'Walk Rex')).toBe(true);
    expect(JSON.stringify(r)).not.toContain('{dog}');
  });
});
