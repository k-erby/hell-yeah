import { BO_STAGES, moodFor, MOODS, stageFor } from '../progress';
import { bestStreak, LOY, NAP_HOURS, routinesFinished, streak } from '../state';
import type { AppState } from '../types';
import { esc } from './common';

export function boView(s: AppState): string {
  const dog = esc(s.profile.dogName);
  const mood = moodFor(s.bo.loyalty);
  const stage = stageFor(s.bo.bond);
  const mastered = s.skills.filter((k) => k.status === 'mastered').length;

  const stages = BO_STAGES.map(
    (b, i) => `<li class="${i <= stage.index ? 'got' : ''} ${i === stage.index ? 'cur' : ''}">
      <span class="pip"></span><div><b>${b.name}</b><small>${i <= stage.index ? b.perk : `${b.bond} bond`}</small></div></li>`,
  ).join('');

  return `
  <header class="page-head">
    <h1 class="display">${dog}.</h1>
    <p class="tagline">Tap the yard to throw the ball. Hit PET to get up close and rub his face.</p>
  </header>

  <section class="device mood-${mood} stage-${stage.index}">
    <div class="device-top"><span>${dog.toUpperCase()}-OS</span><span class="stage-name">${stage.name.toUpperCase()}</span></div>
    <div class="screen">
      <div class="scene" id="bo-scene" aria-label="${dog}'s yard. Tap to throw a ball, tap ${dog} to pet."></div>
      <div class="scan"></div>
    </div>
    <div class="device-meter">
      <div class="meter-head"><span>LOYALTY</span><span>${Math.round(s.bo.loyalty)}%</span></div>
      <div class="meter"><i style="width:${s.bo.loyalty}%"></i></div>
      <div class="status-line"><span class="mood-label">${MOODS[mood].label}</span><span id="bo-status"></span></div>
    </div>
    <div class="device-btns">
      <button class="dbtn" data-action="pet-ball">BALL</button>
      <button class="dbtn" data-action="pet-view" id="pet-mode-btn">PET</button>
      <button class="dbtn wide" data-action="pet-treat" id="pet-treat-btn">TREAT ×${s.bo.treats}</button>
      <button class="dbtn" data-action="pet-woof">WOOF</button>
    </div>
  </section>

  <section class="card">
    <div class="mini-stats four">
      <div><b>${streak(s)}</b><span>streak</span></div>
      <div><b>${bestStreak(s)}</b><span>best</span></div>
      <div><b>${routinesFinished(s)}</b><span>routines</span></div>
      <div><b>${mastered}</b><span>skills</span></div>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Bond ${Math.round(s.bo.bond)}${stage.next ? ` / ${stage.next.bond}` : ''}</div><h2>Rank: ${stage.name}</h2></div></div>
    <div class="xpbar"><i style="width:${stage.pct}%"></i></div>
    <ol class="stages">${stages}</ol>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">How it works</div><h2>Keep ${dog} loyal</h2></div></div>
    <ul class="rules">
      <li><b>Check things off.</b> Every task feeds ${dog}. Finishing a full routine feeds him more.</li>
      <li><b>${dog}'s walks count double.</b> Anything tagged ${dog} gives +${LOY.boItem} bonus loyalty.</li>
      <li><b>Learn. Lock in. Master.</b> The bigger the move, the bigger the bond.</li>
      <li><b>Earn treats.</b> +1 per finished routine, +1 for learning something, +2 for a weekly lock-in, +3 for mastering a skill.</li>
      <li><b>Go quiet and he naps.</b> No tasks for ${NAP_HOURS} hours and he's out cold. Do something to wake him up.</li>
      <li><b>Ghost him and he notices.</b> Every full day you skip is −${LOY.decay} loyalty. Low loyalty, low effort. He'll mope and ignore the ball.</li>
      <li><b>Bond never drops.</b> It's lifetime. Enough of it and ${dog} levels up.</li>
    </ul>
  </section>`;
}
