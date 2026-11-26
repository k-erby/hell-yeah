import { boSvg, SITTING, SLEEPING } from '../bo';
import { monthName, prettyDay, today, weekDays, weekOf } from '../dates';
import { moodFor, MOODS, rankFor, stageFor } from '../progress';
import { checkedFor, currentSkill, isAsleep, streak } from '../state';
import type { AppState } from '../types';
import { MODES } from '../types';
import { esc, MODE_META, PENCIL, pickBy, ring, routineEditor, type UI } from './common';

export function todayView(s: AppState, ui: UI, timeMode: string): string {
  const t = today();
  const mode = ui.mode;
  const meta = MODE_META[mode];
  const items = s.routines[mode];
  const checked = checkedFor(s, t, mode);
  const done = items.filter((i) => checked.has(i.id)).length;
  const allDone = items.length > 0 && done === items.length;
  const rank = rankFor(s.xp);
  const st = streak(s, t);
  const mood = moodFor(s.bo.loyalty);
  const stage = stageFor(s.bo.bond);
  const lines = [...meta.lines, ...meta.filthy];

  const segs = MODES.map((m) => {
    const its = s.routines[m];
    const c = checkedFor(s, t, m);
    const n = its.filter((i) => c.has(i.id)).length;
    const full = its.length > 0 && n === its.length;
    return `<button class="seg-btn ${m === mode ? 'on' : ''} ${full ? 'full' : ''}" data-action="mode" data-mode="${m}">
      ${m === timeMode ? '<span class="now-dot" aria-label="now"></span>' : ''}
      <span>${MODE_META[m].label}</span><small>${n}/${its.length}</small></button>`;
  }).join('');

  const list = items.length
    ? items
        .map((i) => {
          const on = checked.has(i.id);
          const pop = ui.justChecked === i.id && on;
          return `<li><button class="check ${on ? 'on' : ''} ${pop ? 'pop' : ''}" data-action="toggle" data-id="${i.id}" aria-pressed="${on}">
            <span class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>
            <span class="label">${esc(i.label)}</span>
            ${i.bo ? `<span class="tag">${esc(s.profile.dogName)}</span>` : ''}
          </button></li>`;
        })
        .join('')
    : `<li class="empty">Nothing here yet. <button class="link" data-action="flip">Add some tasks</button></li>`;

  // Nudges for the daily / weekly / monthly goals
  const nudges: string[] = [];
  const learned = s.learnings.filter((l) => l.date === t);
  if (learned.length) {
    nudges.push(`<div class="nudge done"><span class="nudge-k">Today</span><span>Learned: <b>${esc(learned[learned.length - 1].text)}</b></span></div>`);
  } else {
    nudges.push(`<button class="nudge" data-action="tab" data-tab="learn"><span class="nudge-k">Daily</span><span>Nothing learned yet today. <b>Fix that →</b></span></button>`);
  }
  const week = weekOf(t);
  const dow = weekDays(t).indexOf(t);
  if (!s.solidifies.some((x) => x.week === week) && dow >= 3) {
    nudges.push(`<button class="nudge" data-action="tab" data-tab="learn"><span class="nudge-k">Weekly</span><span>${7 - dow} day${7 - dow === 1 ? '' : 's'} left to lock something in. <b>Do it →</b></span></button>`);
  }
  const sk = currentSkill(s, t);
  if (!sk) {
    nudges.push(`<button class="nudge" data-action="tab" data-tab="learn"><span class="nudge-k">Monthly</span><span>No skill planted for ${monthName(t.slice(0, 7))}. <b>Pick one →</b></span></button>`);
  }

  return `
  <header class="hero">
    <div class="hero-top">
      <div>
        <div class="eyebrow">${prettyDay(t)}</div>
        <h1 class="display">${meta.greet},<br>${esc(s.profile.name)}.</h1>
        <p class="tagline">${esc(pickBy(lines, t + mode))}</p>
      </div>
      <button class="mini-bo mood-${mood}" data-action="tab" data-tab="bo" aria-label="${esc(s.profile.dogName)}: ${MOODS[mood].label}">
        <span class="lcd ${isAsleep(s) ? 'asleep' : ''}">${boSvg(stage.index, mood, stage.index === 0 ? 'pup' : '', isAsleep(s) ? SLEEPING : SITTING)}</span>
        <span class="mini-meter"><i style="width:${s.bo.loyalty}%"></i></span>
      </button>
    </div>
    <div class="stats-row">
      <span class="chip rank">${rank.name}</span>
      <span class="chip">${s.xp.toLocaleString()} XP</span>
      <span class="chip ${st >= 3 ? 'hot' : ''}">${st}-day streak</span>
    </div>
    <div class="xpbar" title="${rank.next ? `${rank.next.xp - s.xp} XP to ${rank.next.name}` : 'Max rank'}"><i style="width:${rank.pct}%"></i></div>
    <div class="xpbar-label">${rank.next ? `${(rank.next.xp - s.xp).toLocaleString()} XP to <b>${rank.next.name}</b>` : 'Top rank. Obviously.'}</div>
  </header>

  <nav class="seg" aria-label="Routine">${segs}</nav>

  <section class="flip ${ui.flipped ? 'flipped' : ''}" id="routine-card">
    <div class="flip-inner">
      <div class="card checklist face-front ${allDone ? 'complete' : ''}">
        <div class="card-head">
          <div>
            <h2>${meta.title}</h2>
            <p class="muted">${allDone ? 'Handled. Every single one.' : `${items.length - done} to go`}</p>
          </div>
          <div class="head-right">
            <div class="ring-wrap">${ring(items.length ? (done / items.length) * 100 : 0)}<span>${done}/${items.length}</span></div>
            <button class="edit-btn" data-action="flip" aria-label="Edit ${meta.title}">${PENCIL}</button>
          </div>
        </div>
        <ul class="checks">${list}</ul>
      </div>
      <div class="card face-back">
        <div class="card-head">
          <div><div class="eyebrow">Editing</div><h2>${meta.title}</h2></div>
          <button class="btn small primary" data-action="flip">Done</button>
        </div>
        ${routineEditor(s, mode)}
        <p class="muted small">Tag a task ${esc(s.profile.dogName)} for bonus loyalty. Changes save instantly.</p>
      </div>
    </div>
  </section>

  <section class="nudges">${nudges.join('')}</section>
  `;
}
