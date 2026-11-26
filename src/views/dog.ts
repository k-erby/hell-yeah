import { t, ta } from '../lib/i18n';
import { DOG_STAGES, moodFor, moodName, stageFor, stageName, stagePerk } from '../app/progress';
import { bestStreak, LOY, NAP_HOURS, routinesFinished, streak } from '../app/state';
import type { AppState } from '../app/types';

export function dogView(s: AppState): string {
  const dog = s.profile.dogName;
  const mood = moodFor(s.bo.loyalty);
  const stage = stageFor(s.bo.bond);
  const mastered = s.skills.filter((k) => k.status === 'mastered').length;

  const stages = DOG_STAGES.map(
    (b, i) => `<li class="${i <= stage.index ? 'got' : ''} ${i === stage.index ? 'cur' : ''}">
      <span class="pip"></span><div><b>${stageName(b.id)}</b><small>${i <= stage.index ? stagePerk(b.id) : t('dog.bondNeeded', { bond: b.bond })}</small></div></li>`,
  ).join('');

  const rules = (['checkOff', 'walks', 'bigMoves', 'treats', 'naps', 'ghosting', 'bond'] as const)
    .map((r) => `<li>${t(`dog.rules.${r}`, { dog, bonus: LOY.boItem, hours: NAP_HOURS, decay: LOY.decay })}</li>`)
    .join('');

  return `
  <header class="page-head">
    <h1 class="display">${t('dog.title', { dog })}</h1>
    <p class="tagline">${t('dog.tagline', { dog })}</p>
  </header>

  <section class="device mood-${mood} stage-${stage.index}">
    <div class="device-top"><span>${t('dog.os', { dog }).toLocaleUpperCase()}</span><span class="stage-name">${stageName(stage.cur.id).toLocaleUpperCase()}</span></div>
    <div class="screen">
      <div class="scene" id="bo-scene" aria-label="${ta('dog.yardLabel', { dog })}"></div>
      <div class="scan"></div>
    </div>
    <div class="device-meter">
      <div class="meter-head"><span>${t('dog.loyalty')}</span><span>${Math.round(s.bo.loyalty)}%</span></div>
      <div class="meter"><i style="width:${s.bo.loyalty}%"></i></div>
      <div class="status-line"><span class="mood-label">${moodName(mood)}</span><span id="bo-status"></span></div>
    </div>
    <div class="device-btns">
      <button class="dbtn" data-action="pet-ball">${t('dog.buttons.ball')}</button>
      <button class="dbtn" data-action="pet-view" id="pet-mode-btn">${t('dog.buttons.pet')}</button>
      <button class="dbtn wide" data-action="pet-treat" id="pet-treat-btn">${t('dog.buttons.treat', { n: s.bo.treats })}</button>
      <button class="dbtn" data-action="pet-woof">${t('dog.buttons.woof')}</button>
    </div>
  </section>

  <section class="card">
    <div class="mini-stats four">
      <div><b>${streak(s)}</b><span>${t('dog.stats.streak')}</span></div>
      <div><b>${bestStreak(s)}</b><span>${t('dog.stats.best')}</span></div>
      <div><b>${routinesFinished(s)}</b><span>${t('dog.stats.routines')}</span></div>
      <div><b>${mastered}</b><span>${t('dog.stats.skills')}</span></div>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${stage.next ? t('dog.bondOf', { bond: Math.round(s.bo.bond), next: stage.next.bond }) : t('dog.bond', { bond: Math.round(s.bo.bond) })}</div><h2>${t('dog.rank', { stage: stageName(stage.cur.id) })}</h2></div></div>
    <div class="xpbar"><i style="width:${stage.pct}%"></i></div>
    <ol class="stages">${stages}</ol>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('dog.rulesEyebrow')}</div><h2>${t('dog.rulesTitle', { dog })}</h2></div></div>
    <ul class="rules">${rules}</ul>
  </section>`;
}
