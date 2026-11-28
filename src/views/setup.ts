/**
 * The new-account setup: welcome, your name, your pet, its name, your three routines.
 * Opened from More for now. Answers live in ui.setup until the last step saves them.
 */
import { list, t, ta, tx } from '../lib/i18n';
import type { AppState, Mode } from '../app/types';
import { MODES } from '../app/types';
import { PET_KINDS } from '../pets/kinds';
import { petSvg, SITTING } from '../pets/dog/sprite';
import { esc, type SetupDraft } from './common';

/** welcome, name, pet, pet name, morning, afternoon, night, done */
export const SETUP_STEPS = 8;
const ROUTINE_STEP = 4;

/** Which routine a step is about, if any. */
export const setupMode = (step: number): Mode | undefined => MODES[step - ROUTINE_STEP];

/** Start the walkthrough from what's saved now, so finishing it without changes changes nothing. */
export function newDraft(s: AppState): SetupDraft {
  return {
    step: 0,
    name: s.profile.name,
    pet: s.profile.pet,
    petName: s.profile.dogName,
    routines: { morning: s.routines.morning.map((i) => i.label), afternoon: s.routines.afternoon.map((i) => i.label), night: s.routines.night.map((i) => i.label) },
  };
}

/** The starter ideas for a routine, plus anything already picked or typed in. */
function routineOptions(d: SetupDraft, mode: Mode): string[] {
  const ideas = list(`defaults.routines.${mode}`).map((l) => l.replaceAll('{dog}', d.petName));
  return [...new Set([...ideas, ...d.routines[mode]])];
}

const BIG_PET = (d: SetupDraft) => `<div class="setup-pet">${petSvg(1, 'locked-in', '', SITTING, d.pet)}</div>`;

function body(d: SetupDraft): string {
  const mode = setupMode(d.step);
  if (mode) {
    const picked = new Set(d.routines[mode]);
    return `
      <div class="eyebrow">${t('setup.routine.eyebrow')}</div>
      <h1 class="display-sm">${t('setup.routine.title', { routine: tx(`modes.${mode}.title`).toLocaleLowerCase() })}</h1>
      <p class="tagline">${t('setup.routine.body')}</p>
      <div class="setup-tasks">${routineOptions(d, mode)
        .map((l) => {
          const on = picked.has(l);
          return `<button class="setup-task ${on ? 'on' : ''}" data-action="setup-task" data-label="${esc(l)}" aria-pressed="${on}">${esc(l)}</button>`;
        })
        .join('')}</div>
      <form data-form="setup-task" class="row">
        <input name="label" maxlength="60" required placeholder="${ta('setup.routine.addPlaceholder')}">
        <button class="btn" type="submit">${t('common.add')}</button>
      </form>`;
  }
  switch (d.step) {
    case 0:
      return `
      ${BIG_PET(d)}
      <div class="eyebrow">${t('setup.welcome.eyebrow')}</div>
      <h1 class="display">${t('setup.welcome.title')}</h1>
      <p class="tagline">${t('setup.welcome.body')}</p>
      <ul class="setup-points">${list('setup.welcome.points').map((p) => `<li>${p}</li>`).join('')}</ul>`;
    case 1:
      return `
      <div class="eyebrow">${t('setup.name.eyebrow')}</div>
      <h1 class="display-sm">${t('setup.name.title')}</h1>
      <form data-form="setup-text" data-key="name" id="setup-form">
        <input name="value" value="${esc(d.name)}" maxlength="30" required autocomplete="given-name" placeholder="${ta('setup.name.placeholder')}">
      </form>`;
    case 2:
      return `
      <div class="eyebrow">${t('setup.pet.eyebrow')}</div>
      <h1 class="display-sm">${t('setup.pet.title')}</h1>
      <p class="tagline">${t('setup.pet.body')}</p>
      <div class="pet-pick">${PET_KINDS.map((k) => {
        const on = d.pet === k;
        return `<button class="pet-choice ${on ? 'on' : ''}" data-action="setup-pet" data-kind="${k}" aria-pressed="${on}">
          ${petSvg(1, 'locked-in', '', SITTING, k)}<b>${t(`pets.kinds.${k}.name`)}</b><span>${t(`pets.kinds.${k}.what`)}</span></button>`;
      }).join('')}</div>`;
    case 3:
      return `
      ${BIG_PET(d)}
      <div class="eyebrow">${t('setup.petName.eyebrow')}</div>
      <h1 class="display-sm">${t('setup.petName.title')}</h1>
      <form data-form="setup-text" data-key="petName" id="setup-form">
        <input name="value" value="${esc(d.petName)}" maxlength="20" required autocomplete="off" placeholder="${ta('setup.petName.placeholder')}">
      </form>`;
    default:
      return `
      ${BIG_PET(d)}
      <div class="eyebrow">${t('setup.done.eyebrow')}</div>
      <h1 class="display-sm">${t('setup.done.title', { name: d.name })}</h1>
      <p class="tagline">${t('setup.done.body', { pet: d.petName })}</p>`;
  }
}

export function setupView(d: SetupDraft): string {
  const last = d.step === SETUP_STEPS - 1;
  const next = d.step === 0 ? t('setup.welcome.go') : last ? t('setup.done.go') : t('setup.next');
  // On the name steps, Next submits the form so the typed name is kept.
  const nextAttrs = d.step === 1 || d.step === 3 ? 'type="submit" form="setup-form"' : `data-action="${last ? 'setup-finish' : 'setup-next'}"`;
  return `
  <section class="setup">
    <div class="setup-top">
      <div class="setup-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${SETUP_STEPS}" aria-valuenow="${d.step + 1}" aria-label="${ta('setup.step', { n: d.step + 1, total: SETUP_STEPS })}">
        ${Array.from({ length: SETUP_STEPS }, (_, i) => `<i class="${i <= d.step ? 'on' : ''}"></i>`).join('')}
      </div>
      <button class="icon-btn" data-action="setup-close" aria-label="${ta('setup.close')}">×</button>
    </div>
    <div class="setup-body">${body(d)}</div>
    <div class="setup-nav">
      ${d.step > 0 ? `<button class="btn ghost" data-action="setup-back">${t('setup.back')}</button>` : ''}
      <button class="btn primary" ${nextAttrs}>${next}</button>
    </div>
  </section>`;
}
