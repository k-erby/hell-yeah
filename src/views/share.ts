/**
 * The Share screen: pick what goes on a card, see it, send it.
 * The card itself is drawn in lib/card.ts.
 */
import { monthName, monthOf, prettyDay } from '../app/dates';
import { moodFor, rankFor, stageFor } from '../app/progress';
import { checkedFor, currentSkill, SKILL_LEVELS, skillLevel, streak } from '../app/state';
import type { AppState } from '../app/types';
import { MODES } from '../app/types';
import { t, tnx, tx } from '../lib/i18n';
import type { CardData } from '../lib/card';
import { petSvg, SITTING } from '../pets/dog/sprite';
import { esc, SHARE_BITS, type ShareBit, type ShareDraft } from './common';

export const SHARE_PRESETS = {
  routine: ['today', 'streak', 'pet'],
  learned: ['learned', 'skill', 'pet'],
  flex: ['streak', 'rank', 'pet'],
} as const satisfies Record<string, readonly ShareBit[]>;
export type SharePreset = keyof typeof SHARE_PRESETS;
export const isSharePreset = (p: unknown): p is SharePreset => typeof p === 'string' && p in SHARE_PRESETS;

/** How many learnings can go on one card. */
export const MAX_LEARNINGS = 3;

/** Your latest learnings, newest first: the ones you can pick for the card. */
export function recentLearnings(s: AppState) {
  return s.learnings
    .map((l, i) => ({ l, i }))
    .sort((a, b) => b.l.date.localeCompare(a.l.date) || b.i - a.i)
    .slice(0, 8)
    .map((x) => x.l);
}

/** One thing on the card: its label, its value(s), and the matching line(s) of the text message. */
interface Line { label: string; values: string[]; text: string[] }

/** Which learnings are on the card: the ones picked, newest first, or just the newest. */
export function pickedLearnings(s: AppState, d: Pick<ShareDraft, 'learningIds'>) {
  const recent = recentLearnings(s);
  const picked = recent.filter((l) => d.learningIds?.includes(l.id));
  return picked.length ? picked.slice(0, MAX_LEARNINGS) : recent.slice(0, 1);
}

/** What each bit says right now, or undefined if there's nothing to say yet. */
function lines(s: AppState, day: string, d: ShareDraft): Record<ShareBit, Line | undefined> {
  const emoji = (b: Exclude<ShareBit, 'pet'>) => tx(`share.emoji.${b}`);
  const line = (b: Exclude<ShareBit, 'pet'>, label: string, ...values: string[]): Line => ({ label, values, text: values.map((v) => `${emoji(b)} ${label}: ${v}`) });

  // Today: the routines you finished, or how many tasks so far.
  let done = 0, total = 0;
  const finished: string[] = [];
  for (const m of MODES) {
    const items = s.routines[m];
    const checked = checkedFor(s, day, m);
    const n = items.filter((i) => checked.has(i.id)).length;
    done += n;
    total += items.length;
    if (items.length && n === items.length) finished.push(tx(`modes.${m}.title`));
  }
  const today = finished.length ? tx('share.routinesDone', { routines: finished.join(' + ') }) : tx('share.tasks', { n: done, total });

  const learned = pickedLearnings(s, d);
  const sk = currentSkill(s, day);
  const n = streak(s, day);
  const rank = rankFor(s.xp).cur.id;
  const petLabel = tx('share.bits.pet');
  const petValue = tx('share.pet', { pet: s.profile.dogName, mood: tx(`moods.${moodFor(s.bo.loyalty)}`) });

  return {
    today: line('today', tx('share.bits.today'), today),
    learned: learned.length ? line('learned', tx('share.bits.learned'), ...learned.map((l) => l.text)) : undefined,
    skill: sk && line('skill', tx('share.bits.skill', { month: monthName(monthOf(day)) }), tx('share.skill', { skill: sk.name, level: tx(`skillLevels.${SKILL_LEVELS[skillLevel(sk)]}`) })),
    streak: line('streak', tx('share.bits.streak'), tnx('share.streakDays', n)),
    rank: line('rank', tx('share.bits.rank'), tx('share.rank', { rank: tx(`ranks.${rank}`), xp: s.xp })),
    pet: { label: petLabel, values: [petValue], text: [`${tx(`pets.kinds.${s.profile.pet}.emoji`)} ${petValue}`] },
  };
}

/** A fresh share: today's routine if you've done anything, otherwise the streak flex. */
export function newShare(s: AppState, day: string): ShareDraft {
  const any = MODES.some((m) => checkedFor(s, day, m).size > 0);
  return { image: true, bits: presetBits(s, day, any ? 'routine' : 'flex'), learningIds: recentLearnings(s).slice(0, 1).map((l) => l.id) };
}

/** Bits that can't go on the card yet (nothing to show). */
export function unavailable(s: AppState, day: string): Set<ShareBit> {
  const l = lines(s, day, {} as ShareDraft);
  return new Set(SHARE_BITS.filter((b) => !l[b]));
}

/** Everything the card and the message need. */
export function cardFor(s: AppState, day: string, d: ShareDraft): CardData & { text: string } {
  const l = lines(s, day, d);
  const picked = SHARE_BITS.filter((b) => d.bits.includes(b)).map((b) => l[b]).filter((x): x is Line => !!x);
  return {
    name: s.profile.name,
    date: prettyDay(day),
    items: picked.map(({ label, values }) => ({ label, values })),
    pet: petSvg(stageFor(s.bo.bond).index, moodFor(s.bo.loyalty), '', SITTING, s.profile.pet),
    footer: tx('share.footer'),
    text: [tx('share.textHeading', { name: s.profile.name }), ...picked.flatMap((x) => x.text)].join('\n'),
  };
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** A quick pick's bits, minus any there's nothing to show for yet. Empty if its main one isn't ready. */
export function presetBits(s: AppState, day: string, p: SharePreset): ShareBit[] {
  const off = unavailable(s, day);
  const [main] = SHARE_PRESETS[p];
  return off.has(main) ? [] : SHARE_PRESETS[p].filter((b) => !off.has(b));
}

export function shareView(s: AppState, day: string, d: ShareDraft): string {
  const off = unavailable(s, day);
  const recent = recentLearnings(s);
  const picked = new Set(pickedLearnings(s, d).map((l) => l.id));
  const month = monthName(monthOf(day));
  const presets = (Object.keys(SHARE_PRESETS) as SharePreset[]).map((p) => [p, presetBits(s, day, p)] as const).filter(([, bits]) => bits.length);

  return `
  <section class="share">
    <div class="setup-top">
      <div><div class="eyebrow">${t('share.eyebrow')}</div></div>
      <button class="icon-btn" data-action="share-close" aria-label="${esc(tx('share.close'))}">×</button>
    </div>
    <h1 class="display">${t('share.title')}</h1>
    <p class="tagline">${t('share.tagline')}</p>

    ${presets.length ? `<div class="field-label">${t('share.quick')}</div>
    <div class="setup-tasks share-presets">${presets.map(([p, bits]) => {
      const on = sameSet(d.bits, bits);
      return `<button class="setup-task ${on ? 'on' : ''}" data-action="share-preset" data-preset="${p}" aria-pressed="${on}">${t(`share.presets.${p}`)}</button>`;
    }).join('')}</div>` : ''}

    <div class="field-label">${t('share.parts')}</div>
    <div class="share-bits">${SHARE_BITS.map((b) => {
      const on = d.bits.includes(b);
      const disabled = off.has(b);
      const need = b === 'learned' || b === 'skill' ? `<span>${t(`share.needs.${b}`)}</span>` : '';
      return `<button class="share-bit ${on ? 'on' : ''}" data-action="share-bit" data-bit="${b}" aria-pressed="${on}" ${disabled ? 'disabled' : ''}>
        <b>${t(`share.bits.${b}`, { month })}</b>${disabled ? need : ''}</button>`;
    }).join('')}</div>

    ${d.bits.includes('learned') && recent.length > 1 ? `<div class="field-label">${t('share.which', { n: MAX_LEARNINGS })}</div>
    <div class="share-learnings">${recent.map((l) => {
      const on = picked.has(l.id);
      // Full up: the rest wait until you untick one.
      const full = !on && picked.size >= MAX_LEARNINGS;
      return `<button class="share-learning ${on ? 'on' : ''}" data-action="share-learning" data-id="${l.id}" aria-pressed="${on}" ${full ? 'disabled' : ''}>${esc(l.text)}</button>`;
    }).join('')}</div>` : ''}

    <label class="share-image">
      <input type="checkbox" data-change="share-image" ${d.image ? 'checked' : ''}>
      <span><b>${t('share.image')}</b><small>${t(d.image ? 'share.imageOn' : 'share.imageOff')}</small></span>
    </label>

    <div class="field-label">${t('share.preview')}</div>
    ${d.image ? `<canvas id="share-card" class="share-card" width="1080" height="1350" role="img" aria-label="${esc(cardFor(s, day, d).text)}"></canvas>` : ''}
    <pre class="share-text">${esc(cardFor(s, day, d).text)}</pre>
    ${d.bits.length ? '' : `<p class="muted small">${t('share.pickOne')}</p>`}

    <div class="setup-nav">
      <button class="btn primary" data-action="share-send" ${d.bits.length ? '' : 'disabled'}>${t('share.send')}</button>
    </div>
  </section>`;
}
