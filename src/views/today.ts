import { petSvg, SITTING, SLEEPING } from '../pets/dog/sprite';
import { petNote, type PetNote } from '../pets/needs';
import { iconSvg } from '../pets/props';
import { monthName, prettyDay, today, weekDays, weekOf } from '../app/dates';
import { t, ta, tn, list } from '../lib/i18n';
import { moodFor, moodName, rankFor, rankName, stageFor } from '../app/progress';
import { checkedFor, currentSkill, focusOver, isAsleep, streak } from '../app/state';
import type { AppState, Focus } from '../app/types';
import { FOCUS_MINUTES, MODES } from '../app/types';
import { esc, PENCIL, pickBy, ring, routineEditor, type UI } from './common';

/** The pet's one-line reminder or tip above the checklist (nothing when there's nothing to say). */
function petStrip(s: AppState, note: PetNote | null): string {
  if (!note) return '';
  const pet = s.profile.dogName;
  if (note.kind === 'tip') {
    return `<section class="pet-note tip">
      <span class="pet-bubble">${iconSvg(note.icon)}</span>
      <p>${t(`pets.tips.${note.id}`, { pet })}</p>
      <button class="btn small ghost" data-action="pet-tip" data-id="${note.id}">${t('pets.gotIt')}</button>
    </section>`;
  }
  const line = note.id === 'hungry' ? tn('pets.needs.hungry', s.bo.treats, { pet }) : t(`pets.needs.${note.id}`, { pet });
  const act = note.id === 'hungry' || note.id === 'play' ? `<button class="btn small primary" data-action="pet-need" data-id="${note.id}">${t(`pets.actions.${note.id}`)}</button>` : '';
  return `<section class="pet-note">
    <span class="pet-bubble">${iconSvg(note.icon)}</span>
    <p>${line}</p>
    ${act}
    <button class="icon-btn" data-action="pet-quiet" data-id="${note.id}" aria-label="${ta('pets.notNow')}" title="${ta('pets.notNow')}">×</button>
  </section>`;
}

const STOPWATCH = '<svg class="stopwatch" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="14" r="7.5"/><path d="M12 10.5V14l2.5 2M9.5 3h5M12 3v3.5"/></svg>';

const focusTask = (s: AppState, f: Focus) => s.routines[f.mode].find((i) => i.id === f.itemId)?.label ?? '';

/** 4:05 */
const clock = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

function focusLine(s: AppState, f: Focus, now: number): string {
  const left = f.endsAt - now;
  const key = left <= 60_000 ? 'last' : left <= (f.endsAt - f.startedAt) / 2 ? 'half' : 'start';
  return t(`focus.lines.${key}`, { pet: s.profile.dogName });
}

const focusPct = (f: Focus, now: number) => Math.min(100, ((now - f.startedAt) / (f.endsAt - f.startedAt)) * 100);

/** The running timer (or its "Done?" question) above the checklist. */
function focusBar(s: AppState, petArt: string, now = Date.now()): string {
  const f = s.focus;
  if (!f) return '';
  const task = focusTask(s, f) || t('focus.someTask');
  if (focusOver(f, now)) {
    return `<section class="focus-bar over" id="focus-bar">
      <span class="pet-bubble">${iconSvg('star')}</span>
      <p>${t('focus.over', { task })}</p>
      <div class="focus-actions">
        <button class="btn small primary" data-action="focus-done">${t('focus.done')}</button>
        <button class="btn small ghost" data-action="focus-stop">${t('focus.notYet')}</button>
      </div>
    </section>`;
  }
  return `<section class="focus-bar" id="focus-bar">
    <div class="focus-top">
      <span class="eyebrow">${t('focus.eyebrow', { n: f.minutes })}</span>
      <b class="focus-time">${clock(f.endsAt - now)}</b>
      <button class="icon-btn" data-action="focus-stop" aria-label="${ta('focus.stop')}" title="${ta('focus.stop')}">×</button>
    </div>
    <p class="focus-task">${esc(task)}</p>
    <div class="focus-meter"><i style="width:${focusPct(f, now)}%"></i></div>
    <p class="focus-line"><span class="focus-pet">${petArt}</span><span class="focus-say">${focusLine(s, f, now)}</span></p>
  </section>`;
}

/** Tick the timer on screen without redrawing the page. */
export function updateFocusBar(s: AppState, now = Date.now()) {
  const f = s.focus;
  const bar = document.getElementById('focus-bar');
  if (!f || !bar) return;
  const time = bar.querySelector('.focus-time');
  if (time) time.textContent = clock(f.endsAt - now);
  const meter = bar.querySelector<HTMLElement>('.focus-meter i');
  if (meter) meter.style.width = `${focusPct(f, now)}%`;
  const say = bar.querySelector('.focus-say');
  const line = focusLine(s, f, now);
  if (say && say.innerHTML !== line) say.innerHTML = line;
}

export function todayView(s: AppState, ui: UI, timeMode: string): string {
  const day = today();
  const mode = ui.mode;
  const items = s.routines[mode];
  const checked = checkedFor(s, day, mode);
  const done = items.filter((i) => checked.has(i.id)).length;
  const allDone = items.length > 0 && done === items.length;
  const rank = rankFor(s.xp);
  const st = streak(s, day);
  const mood = moodFor(s.bo.loyalty);
  const stage = stageFor(s.bo.bond);
  const lines = list(`lines.${mode}`);
  const title = t(`modes.${mode}.title`);
  const note = petNote(s, day);

  const segs = MODES.map((m) => {
    const its = s.routines[m];
    const c = checkedFor(s, day, m);
    const n = its.filter((i) => c.has(i.id)).length;
    const full = its.length > 0 && n === its.length;
    return `<button class="seg-btn ${m === mode ? 'on' : ''} ${full ? 'full' : ''}" data-action="mode" data-mode="${m}">
      ${m === timeMode ? `<span class="now-dot" aria-label="${ta('today.now')}"></span>` : ''}
      <span>${t(`modes.${m}.label`)}</span><small>${n}/${its.length}</small></button>`;
  }).join('');

  const f = s.focus;
  const checks = items.length
    ? items
        .map((i) => {
          const on = checked.has(i.id);
          const pop = ui.justChecked === i.id && on;
          const focusing = f?.mode === mode && f.itemId === i.id;
          // One timer at a time: the stopwatch only shows on unchecked tasks while nothing's running.
          const canFocus = !on && !f;
          const picking = canFocus && ui.focusPick === i.id;
          const timer = canFocus
            ? `<button class="focus-btn ${picking ? 'on' : ''}" data-action="focus-pick" data-id="${i.id}" aria-expanded="${picking}" aria-label="${ta('focus.start', { task: i.label })}" title="${ta('focus.start', { task: i.label })}">${STOPWATCH}</button>`
            : '';
          const picker = picking
            ? `<li class="focus-pick"><span class="muted small">${t('focus.pick')}</span>
                ${FOCUS_MINUTES.map((n, k) => `<button class="btn small ${k === 0 ? 'primary' : 'ghost'}" data-action="focus-start" data-id="${i.id}" data-min="${n}">${t('focus.minutes', { n })}</button>`).join('')}
                <button class="icon-btn" data-action="focus-pick" data-id="${i.id}" aria-label="${ta('focus.cancel')}" title="${ta('focus.cancel')}">×</button></li>`
            : '';
          return `<li class="check-row">${timer}<button class="check ${on ? 'on' : ''} ${pop ? 'pop' : ''} ${focusing ? 'focusing' : ''}" data-action="toggle" data-id="${i.id}" aria-pressed="${on}">
            <span class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>
            <span class="label">${esc(i.label)}</span>
            ${focusing ? STOPWATCH : ''}
            ${i.once ? `<span class="once-tag">${t('today.onceTag')}</span>` : ''}
          </button></li>${picker}`;
        })
        .join('')
    : `<li class="empty">${t('today.emptyList')} <button class="link" data-action="flip">${t('today.addSome')}</button></li>`;

  // Nudges for the daily / weekly / monthly goals
  const nudges: string[] = [];
  const learned = s.learnings.filter((l) => l.date === day);
  if (learned.length) {
    nudges.push(`<div class="nudge done"><span class="nudge-k">${t('today.nudges.today')}</span><span>${t('today.nudges.learned', { text: learned[learned.length - 1].text })}</span></div>`);
  } else {
    nudges.push(`<button class="nudge" data-action="tab" data-tab="learn"><span class="nudge-k">${t('today.nudges.daily')}</span><span>${t('today.nudges.notLearned')}</span></button>`);
  }
  const week = weekOf(day);
  const dow = weekDays(day).indexOf(day);
  if (!s.solidifies.some((x) => x.week === week) && dow >= 3) {
    nudges.push(`<button class="nudge" data-action="tab" data-tab="learn"><span class="nudge-k">${t('today.nudges.weekly')}</span><span>${tn('today.nudges.lockIn', 7 - dow)}</span></button>`);
  }
  const sk = currentSkill(s, day);
  if (!sk) {
    nudges.push(`<button class="nudge" data-action="tab" data-tab="learn"><span class="nudge-k">${t('today.nudges.monthly')}</span><span>${t('today.nudges.noSkill', { month: monthName(day.slice(0, 7)) })}</span></button>`);
  }

  return `
  <header class="hero">
    <div class="hero-top">
      <div>
        <div class="eyebrow">${prettyDay(day)}</div>
        <h1 class="display">${t('today.greeting', { greet: t(`modes.${mode}.greet`), name: s.profile.name })}</h1>
        <p class="tagline">${esc(pickBy(lines, day + mode))}</p>
      </div>
      <button class="mini-bo mood-${mood}" data-action="tab" data-tab="bo" aria-label="${esc(s.profile.dogName)}: ${moodName(mood)}">
        ${note ? `<span class="mini-bubble">${iconSvg(note.icon, 2)}</span>` : ''}
        <span class="lcd ${isAsleep(s) ? 'asleep' : ''}">${petSvg(stage.index, mood, stage.index === 0 ? 'pup' : '', isAsleep(s) ? SLEEPING : SITTING, s.profile.pet)}</span>
        <span class="mini-meter"><i style="width:${s.bo.loyalty}%"></i></span>
      </button>
    </div>
    <div class="stats-row">
      <span class="chip rank">${rankName(rank.cur.id)}</span>
      <span class="chip">${t('today.xp', { xp: s.xp })}</span>
      <span class="chip ${st >= 3 ? 'hot' : ''}">${tn('today.streak', st)}</span>
    </div>
    <div class="xpbar" title="${rank.next ? ta('today.toNextRankPlain', { xp: rank.next.xp - s.xp, rank: rankName(rank.next.id) }) : ta('today.maxRank')}"><i style="width:${rank.pct}%"></i></div>
    <div class="xpbar-label">${rank.next ? t('today.toNextRank', { xp: rank.next.xp - s.xp, rank: rankName(rank.next.id) }) : t('today.topRank')}</div>
  </header>

  <nav class="seg" aria-label="${ta('today.routinePicker')}">${segs}</nav>

  ${f ? focusBar(s, petSvg(stage.index, mood, '', SITTING, s.profile.pet)) : petStrip(s, note)}

  <section class="flip ${ui.flipped ? 'flipped' : ''}" id="routine-card">
    <div class="flip-inner">
      <div class="card checklist face-front ${allDone ? 'complete' : ''}">
        <div class="card-head">
          <div>
            <h2>${title}</h2>
            <p class="muted">${allDone ? t('today.allDone') : t('today.toGo', { n: items.length - done })}</p>
          </div>
          <div class="head-right">
            <div class="ring-wrap">${ring(items.length ? (done / items.length) * 100 : 0)}<span>${done}/${items.length}</span></div>
            <button class="edit-btn" data-action="flip" aria-label="${ta('today.edit', { title: t(`modes.${mode}.title`) })}">${PENCIL}</button>
          </div>
        </div>
        <ul class="checks">${checks}</ul>
      </div>
      <div class="card face-back">
        <div class="card-head">
          <div><div class="eyebrow">${t('today.editing')}</div><h2>${title}</h2></div>
          <button class="btn small primary" data-action="flip">${t('common.done')}</button>
        </div>
        ${routineEditor(s, mode)}
        <p class="muted small">${t('today.editHint')}</p>
      </div>
    </div>
  </section>

  <section class="nudges">${nudges.join('')}</section>
  `;
}
