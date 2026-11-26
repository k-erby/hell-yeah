import { t, ta, type TextKey } from '../i18n';
import type { AppState } from '../types';
import { esc } from './common';

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
    <label class="field"><span>${t('settings.crew.buddy')}</span><input value="${esc(s.profile.buddyName)}" maxlength="30" placeholder="${ta('settings.crew.buddyPlaceholder')}" data-change="profile" data-key="buddyName"></label>
    <button class="btn primary" data-action="share">${s.profile.buddyName ? t('settings.crew.shareTo', { buddy: s.profile.buddyName }) : t('settings.crew.share')}</button>
    <p class="muted small">${t('settings.crew.shareHint')}</p>
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
