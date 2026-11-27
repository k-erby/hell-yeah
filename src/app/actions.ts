/**
 * What happens when you tap, submit or change something. Every button, form and
 * input in the views carries data-action / data-form / data-change, and
 * main.ts sends those events here.
 */
import { dayKey, monthName, monthOf } from './dates';
import { celebrate, center, toast } from '../effects/feedback';
import { bigFx, hitFx, itemFx, sfx } from '../effects/fx';
import { t, tx } from '../lib/i18n';
import { ideaUrl } from '../lib/ideas';
import { esc } from '../views/common';
import { tipsCoveredBy, type TipId } from '../pets/needs';
import { applyTheme, pet, render } from '../views/render';
import { moodFor, rankFor, rankName, stageFor, stageName, stagePerk } from './progress';
import { fxo, save, session, ui } from './session';
import {
  addLearning, addSolidify, currentSkill, defaultState, deleteLearning, finishSkill, MAX_LEVEL, normalize, setSkillLevel, settle,
  SKILL_LEVELS, skillLevel, startSkill, streak, toggleItem, uid,
} from './state';
import type { AppState, Branch, Method, Mode, Tab } from './types';
import { BRANCHES, METHODS } from './types';

/** Run a mutation, then save/render and celebrate any level-ups it caused. */
function commit(fn: () => void) {
  const s = session.s;
  const r0 = rankFor(s.xp).index;
  const b0 = stageFor(s.bo.bond).index;
  const xp0 = s.xp;
  fn();
  save();
  render();
  const r1 = rankFor(s.xp);
  const b1 = stageFor(s.bo.bond);
  if (r1.index > r0) setTimeout(() => celebrate(t('celebrate.rankEyebrow'), rankName(r1.cur.id), t('celebrate.rankSub', { xp: s.xp })), 900);
  if (b1.index > b0)
    setTimeout(
      () => celebrate(t('celebrate.dogEyebrow', { dog: s.profile.dogName }), stageName(b1.cur.id), stagePerk(b1.cur.id), t('celebrate.dogButton')),
      r1.index > r0 ? 2600 : 900,
    );
  return s.xp - xp0;
}

export function handleAction(action: string, el: HTMLElement) {
  const s = session.s;
  const id = el.dataset.id ?? '';
  switch (action) {
    case 'tab': {
      ui.tab = el.dataset.tab as Tab;
      if (ui.tab === 'bo' && s.bo.visitDay !== session.day) {
        s.bo.visitDay = session.day;
        save();
      }
      if (ui.tab !== 'tree') ui.selectedSkill = undefined;
      render();
      window.scrollTo({ top: 0 });
      break;
    }
    case 'mode':
      ui.mode = el.dataset.mode as Mode;
      ui.modeManual = ui.mode !== session.timeMode;
      render();
      break;
    case 'toggle': {
      const [x, y] = center(el.querySelector('.box'));
      let result = { checked: false, routineDone: false };
      const gained = commit(() => {
        result = toggleItem(s, ui.mode, id, session.day);
        if (result.checked) ui.justChecked = id;
      });
      if (result.checked) {
        itemFx(x, y, fxo());
        if (gained > 0) toast(t('toasts.xp', { xp: gained }));
      } else if (s.settings.sound) sfx('tick', 0.4);
      if (result.routineDone) {
        pet.celebrate();
        setTimeout(() => {
          bigFx(fxo());
          toast(t('toasts.routineDone', { routine: tx(`modes.${ui.mode}.title`), dog: s.profile.dogName }));
        }, 350);
      }
      break;
    }
    case 'skill-level': {
      const sk = s.skills.find((k) => k.id === id);
      if (!sk) return;
      const level = Number(el.dataset.level);
      const before = skillLevel(sk);
      if (level === before) return;
      if (level === MAX_LEVEL && !confirm(tx('confirm.master', { skill: sk.name }))) return;
      const [x, y] = center(el);
      const gained = commit(() => setSkillLevel(s, id, level, session.day));
      if (level === MAX_LEVEL) {
        celebrate(t('celebrate.masteredEyebrow'), esc(sk.name), t('celebrate.masteredSub'), t('celebrate.masteredButton'), tx('celebrate.masteredBoom'));
      } else if (level > before) {
        const name = tx(`skillLevels.${SKILL_LEVELS[level]}`);
        hitFx(x, y, fxo(), gained ? tx('toasts.xp', { xp: gained }) : name.toLocaleUpperCase());
        toast(t('toasts.skillLevel', { skill: sk.name, level: name }));
      } else {
        toast(t('toasts.skillDown', { level: tx(`skillLevels.${SKILL_LEVELS[level]}`) }));
      }
      break;
    }
    case 'drop': {
      const sk = s.skills.find((k) => k.id === id);
      if (!sk || !confirm(tx('confirm.drop', { skill: sk.name }))) return;
      commit(() => finishSkill(s, id, 'dropped', session.day));
      toast(t('toasts.dropped'));
      break;
    }
    case 'del-learning':
      if (!confirm(tx('confirm.deleteEntry'))) return;
      commit(() => deleteLearning(s, id));
      break;
    case 'skill':
      ui.selectedSkill = id && ui.selectedSkill !== id ? id : undefined;
      render();
      if (ui.selectedSkill) document.querySelector('.tree-card + .card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      break;
    // ---- the pet's reminder strip on Today
    case 'pet-need': {
      // Go see the pet and do the thing: feed him, or throw the ball.
      ui.tab = 'bo';
      s.bo.visitDay = session.day;
      save();
      render();
      window.scrollTo({ top: 0 });
      setTimeout(() => (id === 'hungry' ? pet.giveTreat() : pet.throwBall()), 450);
      break;
    }
    case 'pet-quiet':
      commit(() => {
        const ids = s.bo.quiet?.day === session.day ? s.bo.quiet.ids : [];
        s.bo.quiet = { day: session.day, ids: [...ids, id] };
      });
      break;
    case 'pet-tip':
      commit(() => (s.seenTips = [...new Set([...(s.seenTips ?? []), ...tipsCoveredBy(id as TipId)])]));
      break;
    case 'pet-ball':
      pet.throwBall();
      break;
    case 'pet-view':
      pet.toggleView();
      break;
    case 'pet-treat':
      pet.giveTreat();
      break;
    case 'pet-woof':
      pet.woof();
      break;
    case 'set': {
      const key = el.dataset.key as keyof AppState['settings'];
      const raw = el.dataset.value!;
      const value = raw === 'true' ? true : raw === 'false' ? false : raw;
      commit(() => ((s.settings as unknown as Record<string, unknown>)[key] = value));
      if (key === 'theme') applyTheme();
      break;
    }
    case 'test-fx':
      bigFx(fxo());
      break;
    case 'flip':
      if (!ui.flipped) {
        ui.flipped = true;
        document.getElementById('routine-card')?.classList.add('flipped');
      } else {
        // Re-render (front picks up any quiet renames) while still flipped, then animate back.
        render();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            ui.flipped = false;
            document.getElementById('routine-card')?.classList.remove('flipped');
          }),
        );
      }
      break;
    case 'move':
      commit(() => {
        const list = s.routines[el.dataset.mode as Mode];
        const i = list.findIndex((x) => x.id === id);
        const j = i + Number(el.dataset.dir);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      });
      break;
    case 'del-item':
      commit(() => {
        const m = el.dataset.mode as Mode;
        s.routines[m] = s.routines[m].filter((x) => x.id !== id);
      });
      break;
    case 'share':
      void shareStatus();
      break;
    case 'export':
      exportData();
      break;
    case 'reset':
      if (!confirm(tx('confirm.reset'))) return;
      if (!confirm(tx('confirm.resetAgain'))) return;
      session.s = defaultState();
      ui.tab = 'today';
      save();
      applyTheme();
      render();
      toast(t('toasts.fresh'));
      break;
  }
}

export function handleForm(form: HTMLFormElement) {
  const s = session.s;
  const fd = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  const [x, y] = center(btn);
  switch (form.dataset.form) {
    case 'learning': {
      const text = String(fd.get('text') ?? '').trim();
      if (!text) return;
      const branch = (fd.get('branch') as Branch) ?? 'mind';
      if (!BRANCHES.includes(branch)) return;
      const sk = s.skills.find((k) => k.id === fd.get('skillId') && k.status === 'active');
      const gained = commit(() => addLearning(s, text, sk?.branch ?? branch, sk?.id, session.day));
      hitFx(x, y, fxo(), gained ? tx('toasts.xp', { xp: gained }) : tx('common.noted'));
      break;
    }
    case 'solidify': {
      const text = String(fd.get('text') ?? '').trim();
      const method = fd.get('method') as Method;
      if (!text || !METHODS.includes(method)) return;
      const learningId = (fd.get('learningId') as string) || undefined;
      const picked = fd.get('skillId');
      const skill = picked === null ? undefined : s.skills.some((k) => k.id === picked) ? String(picked) : null;
      commit(() => addSolidify(s, text, method, learningId, session.day, skill));
      celebrate(t('celebrate.weekEyebrow'), t('celebrate.weekTitle'), t('celebrate.weekSub'));
      break;
    }
    case 'skill-learning': {
      const sk = s.skills.find((k) => k.id === form.dataset.id);
      const text = String(fd.get('text') ?? '').trim();
      if (!sk || !text) return;
      const gained = commit(() => addLearning(s, text, sk.branch, sk.id, session.day));
      hitFx(x, y, fxo(), gained ? tx('toasts.xp', { xp: gained }) : tx('common.noted'));
      break;
    }
    case 'skill': {
      const name = String(fd.get('name') ?? '').trim();
      const branch = fd.get('branch') as Branch;
      if (!name || !BRANCHES.includes(branch)) return;
      commit(() => startSkill(s, name, branch, session.day));
      hitFx(x, y, fxo(), tx('celebrate.planted'));
      toast(t('toasts.planted', { skill: name }));
      break;
    }
    case 'add-item': {
      const label = String(fd.get('label') ?? '').trim();
      if (!label) return;
      commit(() => s.routines[form.dataset.mode as Mode].push({ id: uid(), label }));
      (document.querySelector('form[data-form="add-item"] input') as HTMLInputElement | null)?.focus();
      break;
    }
    case 'idea': {
      const idea = String(fd.get('idea') ?? '').trim();
      if (!idea) return;
      window.open(ideaUrl(idea), '_blank', 'noopener');
      form.reset();
      toast(t('toasts.ideaOpened'));
      break;
    }
  }
}

export function handleChange(el: HTMLInputElement) {
  const s = session.s;
  switch (el.dataset.change) {
    case 'rename': {
      const label = el.value.trim();
      if (!label) return render();
      // Save without re-rendering so the next tap (e.g. "Done") isn't swallowed.
      const it = s.routines[el.dataset.mode as Mode].find((i) => i.id === el.dataset.id);
      if (it) it.label = label;
      save();
      break;
    }
    case 'profile': {
      const key = el.dataset.key as 'name' | 'dogName' | 'buddyName';
      const v = el.value.trim();
      if (!v && key !== 'buddyName') return render();
      commit(() => (s.profile[key] = v));
      break;
    }
    case 'import':
      void importData(el);
      break;
  }
}

// ---------- share / backup ----------

async function shareStatus() {
  const s = session.s;
  const day = session.day;
  const sk = currentSkill(s, day);
  const mood = moodFor(s.bo.loyalty);
  const text = [
    tx('share.heading', { name: s.profile.name }),
    tx('share.streak', { n: streak(s, day) }),
    tx('share.rank', { rank: tx(`ranks.${rankFor(s.xp).cur.id}`), xp: s.xp }),
    tx('share.skill', { month: monthName(monthOf(day)), skill: sk ? sk.name : tx('share.noSkill') }),
    tx('share.dog', { dog: s.profile.dogName, mood: tx(`moods.${mood}`), loyalty: Math.round(s.bo.loyalty) }),
  ].join('\n');
  try {
    if (navigator.share) {
      await navigator.share({ title: tx('share.title'), text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast(t('toasts.copied'));
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') toast(t('toasts.shareFailed'));
  }
}

function exportData() {
  const s = session.s;
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hell-yeah-backup-${dayKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || !('routines' in data)) throw new Error('not a backup');
    if (!confirm(tx('confirm.import'))) return;
    session.s = normalize(data);
    settle(session.s, session.day);
    save();
    applyTheme();
    render();
    toast(t('toasts.restored'));
  } catch {
    toast(t('toasts.badBackup'));
  } finally {
    input.value = '';
  }
}
