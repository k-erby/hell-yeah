import { t, ta, type TextKey } from '../lib/i18n';
import type { AppState } from '../app/types';
import { esc } from './common';
import { petSvg, SITTING } from '../pets/dog/sprite';
import { PET_KINDS } from '../pets/kinds';

function seg(key: string, value: string, options: [string, TextKey][]) {
  return `<div class="seg small">${options
    .map(([v, label]) => `<button class="seg-btn ${v === value ? 'on' : ''}" data-action="set" data-key="${key}" data-value="${v}">${t(label)}</button>`)
    .join('')}</div>`;
}

export function moreView(s: AppState): string {
  const st = s.settings;
  const onOff: [string, TextKey][] = [['true', 'settings.vibe.on'], ['false', 'settings.vibe.off']];

  return `
  <header class="page-head">
    <h1 class="display">${t('settings.title')}</h1>
    <p class="tagline">${t('settings.tagline')}</p>
  </header>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.crew.eyebrow')}</div><h2>${t('settings.crew.heading')}</h2></div></div>
    <label class="field"><span>${t('settings.crew.name')}</span><input value="${esc(s.profile.name)}" maxlength="30" data-change="profile" data-key="name"></label>
    <label class="field"><span>${t('settings.crew.dogName')}</span><input value="${esc(s.profile.dogName)}" maxlength="20" data-change="profile" data-key="dogName"></label>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.share.eyebrow')}</div><h2>${t('settings.share.heading')}</h2></div></div>
    <button class="btn primary" data-action="share-open">${t('settings.share.button')}</button>
    <p class="muted small">${t('settings.share.hint')}</p>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.setup.eyebrow')}</div><h2>${t('settings.setup.heading')}</h2></div></div>
    <button class="btn primary" data-action="setup-open">${t('settings.setup.button')}</button>
    <p class="muted small">${t('settings.setup.hint')}</p>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.pet.eyebrow')}</div><h2>${t('settings.pet.heading')}</h2></div></div>
    <div class="pet-pick">${PET_KINDS.map((k) => {
      const on = s.profile.pet === k;
      return `<button class="pet-choice ${on ? 'on' : ''}" data-action="pet-kind" data-kind="${k}" aria-pressed="${on}">
        ${petSvg(1, 'locked-in', '', SITTING, k)}<b>${t(`pets.kinds.${k}.name`)}</b><span>${t(`pets.kinds.${k}.what`)}</span></button>`;
    }).join('')}</div>
    <p class="muted small">${t('settings.pet.hint')}</p>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.vibe.eyebrow')}</div><h2>${t('settings.vibe.heading')}</h2></div></div>
    <div class="setting"><span>${t('settings.vibe.explosions')}</span>${seg('fx', st.fx, [['classy', 'settings.vibe.classy'], ['stupid', 'settings.vibe.stupid']])}</div>
    <div class="setting"><span>${t('settings.vibe.sound')}</span>${seg('sound', String(st.sound), onOff)}</div>
    <div class="setting"><span>${t('settings.vibe.vibration')}</span>${seg('haptics', String(st.haptics), onOff)}</div>
    <div class="setting col"><span>${t('settings.vibe.theme')}</span>${seg('theme', st.theme, [['auto', 'settings.vibe.auto'], ['morning', 'settings.vibe.morning'], ['afternoon', 'settings.vibe.afternoon'], ['night', 'settings.vibe.night']])}</div>
    <button class="btn ghost small" data-action="test-fx">${t('settings.vibe.test')}</button>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.data.eyebrow')}</div><h2>${t('settings.data.heading')}</h2></div></div>
    <p class="muted small">${t('settings.data.hint')}</p>
    <div class="row">
      <button class="btn ghost" data-action="export">${t('settings.data.export')}</button>
      <label class="btn ghost">${t('settings.data.import')}<input type="file" accept="application/json,.json" data-change="import" hidden></label>
    </div>
    <button class="btn danger small" data-action="reset">${t('settings.data.reset')}</button>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('settings.ideas.eyebrow')}</div><h2>${t('settings.ideas.heading')}</h2></div></div>
    <form data-form="idea" class="stack">
      <textarea name="idea" rows="3" maxlength="1000" required placeholder="${ta('settings.ideas.placeholder')}"></textarea>
      <button class="btn primary" type="submit">${t('settings.ideas.button')}</button>
    </form>
    <p class="muted small">${t('settings.ideas.hint')}</p>
  </section>
  <p class="footer muted small">${t('settings.footer')}</p>`;
}
