/**
 * What happens when you tap, submit or change something. Every button, form and
 * input in the views carries data-action / data-form / data-change, and
 * main.ts sends those events here.
 */
import { dayKey } from './dates';
import { isPetKind } from '../pets/kinds';
import { celebrate, center, toast } from '../effects/feedback';
import { bigFx, hitFx, itemFx, sfx } from '../effects/fx';
import { t, tx } from '../lib/i18n';
import { ideaUrl } from '../lib/ideas';
import { esc, SHARE_BITS, type ShareBit } from '../views/common';
import { newDraft, SETUP_STEPS, setupMode } from '../views/setup';
import { cardFor, isSharePreset, MAX_LEARNINGS, newShare, pickedLearnings, presetBits, unavailable } from '../views/share';
import { cardFile } from '../lib/card';
import { tipsCoveredBy, type TipId } from '../pets/needs';
import { applyTheme, pet, render } from '../views/render';
import { rankFor, rankName, stageFor, stageName, stagePerk } from './progress';
import { fxo, save, session, ui } from './session';
import {
  addLearning, addSolidify, defaultState, deleteLearning, finishFocus, finishSkill, focusOver, MAX_LEVEL, normalize,
  setSkillLevel, settle, SKILL_LEVELS, skillLevel, startFocus, startSkill, stopFocus, toggleItem, uid,
} from './state';
import type { AppState, Branch, FocusMinutes, Method, Mode, Tab } from './types';
import { BRANCHES, FOCUS_MINUTES, METHODS, MODES } from './types';

function routineCelebration(mode: Mode) {
  pet.celebrate();
  setTimeout(() => {
    bigFx(fxo());
    toast(t('toasts.routineDone', { routine: tx(`modes.${mode}.title`), dog: session.s.profile.dogName }));
  }, 350);
}

function focusReward(s: AppState, r: NonNullable<ReturnType<typeof finishFocus>>): string {
  const vars = { bond: r.bonus.bond, pet: s.profile.dogName };
  return r.bonus.treats ? t('focus.rewardTreat', vars) : t('focus.reward', vars);
}

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
      const f = s.focus;
      const timed = !!f && f.mode === ui.mode && f.itemId === id;
      let bonus: ReturnType<typeof finishFocus> = null;
      const gained = commit(() => {
        result = toggleItem(s, ui.mode, id, session.day);
        if (result.checked) ui.justChecked = id;
        // Checking off the timed task: after the timer it counts as "Done"; before, the timer just stops.
        if (result.checked && timed) {
          if (f && focusOver(f)) bonus = finishFocus(s, session.day);
          else stopFocus(s);
        }
      });
      if (result.checked) {
        itemFx(x, y, fxo());
        if (bonus) toast(focusReward(s, bonus));
        else if (timed) toast(t('focus.early'));
        else if (gained > 0) toast(t('toasts.xp', { xp: gained }));
      } else if (s.settings.sound) sfx('tick', 0.4);
      if (result.routineDone) routineCelebration(ui.mode);
      break;
    }
    case 'focus-pick':
      ui.focusPick = ui.focusPick === id ? undefined : id;
      render();
      break;
    case 'focus-start': {
      const minutes = Number(el.dataset.min) as FocusMinutes;
      if (!FOCUS_MINUTES.includes(minutes)) return;
      ui.focusPick = undefined;
      commit(() => startFocus(s, ui.mode, id, minutes));
      if (s.settings.sound) sfx('tick', 0.6);
      break;
    }
    case 'focus-stop':
      commit(() => stopFocus(s));
      break;
    case 'focus-done': {
      const [x, y] = center(el);
      const itemId = s.focus?.itemId;
      let r: ReturnType<typeof finishFocus> = null;
      commit(() => {
        r = finishFocus(s, session.day);
        if (r?.checked && r.mode === ui.mode) ui.justChecked = itemId;
      });
      const done = r as ReturnType<typeof finishFocus>;
      if (!done) break;
      itemFx(x, y, fxo());
      toast(focusReward(s, done));
      if (done.routineDone) routineCelebration(done.mode);
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
    case 'pet-talk':
      pet.talk();
      break;
    case 'set': {
      const key = el.dataset.key as keyof AppState['settings'];
      const raw = el.dataset.value!;
      const value = raw === 'true' ? true : raw === 'false' ? false : raw;
      commit(() => ((s.settings as unknown as Record<string, unknown>)[key] = value));
      if (key === 'theme') applyTheme();
      break;
    }
    case 'pet-kind': {
      const kind = el.dataset.kind;
      if (!isPetKind(kind) || kind === s.profile.pet) break;
      commit(() => {
        // Keep a name they picked themselves; otherwise take the new pet's name.
        if (s.profile.dogName === tx(`pets.kinds.${s.profile.pet}.name`)) s.profile.dogName = tx(`pets.kinds.${kind}.name`);
        s.profile.pet = kind;
      });
      break;
    }
    // ---- the setup walkthrough (More → Run the setup)
    case 'setup-open':
      ui.setup = newDraft(s);
      render();
      window.scrollTo({ top: 0 });
      break;
    case 'setup-close':
      ui.setup = undefined;
      render();
      break;
    case 'setup-next':
    case 'setup-back':
      if (!ui.setup) break;
      ui.setup.step = Math.max(0, Math.min(SETUP_STEPS - 1, ui.setup.step + (action === 'setup-next' ? 1 : -1)));
      render();
      window.scrollTo({ top: 0 });
      break;
    case 'setup-pet': {
      const d = ui.setup;
      const kind = el.dataset.kind;
      if (!d || !isPetKind(kind)) break;
      // Same as the picker on More: a default name follows the pet.
      if (d.petName === tx(`pets.kinds.${d.pet}.name`)) d.petName = tx(`pets.kinds.${kind}.name`);
      d.pet = kind;
      render();
      break;
    }
    case 'setup-task': {
      const d = ui.setup;
      const mode = d && setupMode(d.step);
      const label = el.dataset.label;
      if (!d || !mode || !label) break;
      const picked = d.routines[mode];
      d.routines[mode] = picked.includes(label) ? picked.filter((l) => l !== label) : [...picked, label];
      render();
      break;
    }
    case 'setup-finish':
      finishSetup();
      break;
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
    case 'toggle-once':
      commit(() => {
        const it = s.routines[el.dataset.mode as Mode].find((i) => i.id === id);
        if (!it) return;
        if (it.once) {
          delete it.once;
          delete it.doneOn;
        } else it.once = true;
      });
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
    // ---- the Share screen (More → Share something)
    case 'share-open':
      ui.share = newShare(s, session.day);
      render();
      window.scrollTo({ top: 0 });
      break;
    case 'share-close':
      ui.share = undefined;
      render();
      break;
    case 'share-preset': {
      const p = el.dataset.preset;
      if (!ui.share || !isSharePreset(p)) break;
      ui.share.bits = presetBits(s, session.day, p);
      render();
      break;
    }
    case 'share-bit': {
      const b = el.dataset.bit as ShareBit;
      if (!ui.share || !SHARE_BITS.includes(b) || unavailable(s, session.day).has(b)) break;
      const bits = ui.share.bits;
      ui.share.bits = bits.includes(b) ? bits.filter((x) => x !== b) : [...bits, b];
      render();
      break;
    }
    case 'share-learning': {
      const d = ui.share;
      if (!d || !s.learnings.some((l) => l.id === id)) break;
      const picked = pickedLearnings(s, d).map((l) => l.id);
      if (picked.includes(id)) {
        // Keep at least one; to share none, turn Learned off.
        if (picked.length > 1) d.learningIds = picked.filter((x) => x !== id);
      } else if (picked.length < MAX_LEARNINGS) d.learningIds = [...picked, id];
      render();
      break;
    }
    case 'share-send':
      void sendCard();
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
      const once = fd.get('repeat') === 'once';
      commit(() => s.routines[form.dataset.mode as Mode].push({ id: uid(), label, ...(once ? { once: true as const } : {}) }));
      (document.querySelector('form[data-form="add-item"] input') as HTMLInputElement | null)?.focus();
      break;
    }
    case 'setup-text': {
      const d = ui.setup;
      const v = String(fd.get('value') ?? '').trim();
      if (!d || !v) return;
      d[form.dataset.key === 'petName' ? 'petName' : 'name'] = v;
      d.step++;
      render();
      window.scrollTo({ top: 0 });
      break;
    }
    case 'setup-task': {
      const d = ui.setup;
      const mode = d && setupMode(d.step);
      const label = String(fd.get('label') ?? '').trim();
      if (!d || !mode || !label) return;
      if (!d.routines[mode].includes(label)) d.routines[mode] = [...d.routines[mode], label];
      render();
      document.querySelector<HTMLInputElement>('form[data-form="setup-task"] input')?.focus();
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
    case 'share-image':
      if (!ui.share) return;
      ui.share.image = el.checked;
      render();
      break;
  }
}

// ---------- setup ----------

/** Save the walkthrough's answers. Tasks that were kept keep their history; dropped ones go. */
function finishSetup() {
  const d = ui.setup;
  if (!d) return;
  const s = session.s;
  commit(() => {
    s.profile.name = d.name;
    s.profile.pet = d.pet;
    s.profile.dogName = d.petName;
    for (const mode of MODES) {
      const old = s.routines[mode];
      s.routines[mode] = d.routines[mode].map((label) => old.find((i) => i.label === label) ?? { id: uid(), label });
    }
    // A timer on a task that's gone has nothing to finish.
    const f = s.focus;
    if (f && !s.routines[f.mode].some((i) => i.id === f.itemId)) stopFocus(s);
    ui.setup = undefined;
    ui.tab = 'today';
  });
  window.scrollTo({ top: 0 });
  bigFx(fxo());
}

// ---------- share / backup ----------

/** Send the card: the image and the text through the phone's share sheet, or save + copy where there isn't one. */
async function sendCard() {
  const d = ui.share;
  const canvas = document.querySelector<HTMLCanvasElement>('#share-card');
  if (!d || !d.bits.length) return;
  const { text } = cardFor(session.s, session.day, d);
  try {
    if (!d.image) {
      // Just the words.
      if (navigator.share) {
        await navigator.share({ text });
        toast(t('share.sent'));
      } else {
        await navigator.clipboard.writeText(text);
        toast(t('share.copied'));
      }
      return;
    }
    if (!canvas) return;
    const file = await cardFile(canvas);
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      toast(t('share.sent'));
      return;
    }
    if (navigator.share && !file) {
      await navigator.share({ text });
      toast(t('share.sent'));
      return;
    }
    // No sharing files here (most desktops): save the picture and copy the words.
    if (file) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    toast(t('share.saved'));
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
