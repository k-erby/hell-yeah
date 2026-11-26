import { monthName, monthOf, prettyMonth, shortDay, today, weekDays, weekOf } from '../dates';
import { t, ta, tn } from '../i18n';
import { activeSkills, currentSkill, MAX_LEVEL, SKILL_LEVELS, skillStats, XP } from '../state';
import type { AppState, Branch } from '../types';
import { BRANCHES, METHODS } from '../types';
import { esc } from './common';

function branchChips(name: string, selected: Branch) {
  return `<div class="chips" role="radiogroup">${BRANCHES.map(
    (b) => `<label class="chip-radio"><input type="radio" name="${name}" value="${b}" ${b === selected ? 'checked' : ''}><span>${t(`branches.${b}.label`)}</span></label>`,
  ).join('')}</div>`;
}

/** "Which skill does this count toward?" Defaults to this month's skill. */
function skillChips(s: AppState, selected?: string) {
  const skills = activeSkills(s);
  if (!skills.length) return '';
  const opts: [string, string][] = [['', t('learn.nothingSpecific')], ...skills.map((k): [string, string] => [k.id, esc(k.name)])];
  return `<div class="field-label">${t('learn.countsToward')}</div><div class="chips" role="radiogroup">${opts
    .map(([id, label]) => `<label class="chip-radio"><input type="radio" name="skillId" value="${id}" ${id === (selected ?? '') ? 'checked' : ''}><span>${label}</span></label>`)
    .join('')}</div>`;
}

export function learnView(s: AppState): string {
  const day = today();
  const month = monthOf(day);
  const week = weekOf(day);
  const sk = currentSkill(s, day);
  const todays = s.learnings.filter((l) => l.date === day);
  const earned = !!s.awarded[`learn:${day}`];

  // ---- DAILY
  const daily = `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.daily.eyebrow')}</div><h2>${t('learn.daily.heading')}</h2></div>
      <span class="badge ${todays.length ? 'ok' : ''}">${todays.length ? t('common.done') : t('common.xp', { xp: XP.learning })}</span></div>
    ${todays.map((l) => `<div class="entry"><span class="entry-tag">${t(`branches.${l.branch}.label`)}</span>${esc(l.text)}</div>`).join('')}
    <form data-form="learning" class="stack">
      <textarea name="text" rows="2" maxlength="280" required placeholder="${ta(todays.length ? 'learn.daily.placeholderAgain' : 'learn.daily.placeholder')}"></textarea>
      ${skillChips(s, sk?.id)}
      <div class="field-label">${t('learn.daily.branch')} <span class="muted">${t('learn.daily.branchHint')}</span></div>
      ${branchChips('branch', sk?.branch ?? 'mind')}
      <button class="btn primary" type="submit">${earned ? t('learn.daily.buttonAgain') : t('learn.daily.button', { xp: XP.learning })}</button>
    </form>
  </section>`;

  // ---- WEEKLY
  const thisWeek = s.solidifies.find((x) => x.week === week);
  const days = new Set(weekDays(day));
  const weekLearnings = s.learnings.filter((l) => days.has(l.date)).reverse();
  const weekly = thisWeek
    ? `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.weekly.eyebrow')}</div><h2>${t('learn.weekly.doneHeading')}</h2></div><span class="badge ok">${t('common.done')}</span></div>
    <div class="entry"><span class="entry-tag">${t(`methods.${thisWeek.method}`)}</span>${esc(thisWeek.text)}</div>
    <p class="muted small">${t('learn.weekly.nextOpens')}</p>
  </section>`
    : `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.weekly.eyebrow')}</div><h2>${t('learn.weekly.heading')}</h2></div><span class="badge">${t('common.xp', { xp: XP.solidify })}</span></div>
    <p class="muted">${t('learn.weekly.intro')}</p>
    <form data-form="solidify" class="stack">
      ${
        weekLearnings.length
          ? `<div class="pick-list">${weekLearnings
              .map(
                (l, i) => `<label class="pick"><input type="radio" name="learningId" value="${l.id}" ${i === 0 ? 'checked' : ''}>
                  <span><small>${shortDay(l.date)}</small>${esc(l.text)}</span></label>`,
              )
              .join('')}</div>`
          : `<p class="muted small">${t('learn.weekly.nothingThisWeek')}</p>`
      }
      <div class="chips" role="radiogroup">${METHODS.map(
        (m, i) => `<label class="chip-radio"><input type="radio" name="method" value="${m}" ${i === 0 ? 'checked' : ''}><span>${t(`methods.${m}`)}</span></label>`,
      ).join('')}</div>
      <textarea name="text" rows="2" maxlength="400" required placeholder="${ta('learn.weekly.placeholder')}"></textarea>
      ${skillChips(s, sk?.id)}
      <button class="btn primary" type="submit">${t('learn.weekly.button', { xp: XP.solidify })}</button>
    </form>
  </section>`;

  // ---- MONTHLY
  let monthly: string;
  if (sk) {
    const st = skillStats(s, sk);
    const next = st.level + 1;
    const track = SKILL_LEVELS.map(
      (id, i) => `<button class="lvl ${i <= st.level ? 'on' : ''} ${i === st.level ? 'cur' : ''}" data-action="skill-level" data-id="${sk.id}" data-level="${i}" aria-pressed="${i === st.level}">
        <span class="lvl-dot"></span><span class="lvl-name">${t(`skillLevels.${id}`)}</span></button>`,
    ).join('');
    const fuel = [...st.learnings].reverse().slice(0, 3);
    monthly = `
  <section class="card skill-card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.skill.eyebrow', { branch: t(`branches.${sk.branch}.label`) })}</div><h2 class="display-sm">${esc(sk.name)}</h2></div>
      <span class="badge">${t(`skillLevels.${st.levelId}`)}</span></div>

    <p class="muted small">${t('learn.skill.hint')}</p>
    <div class="lvl-track" style="--f:${st.level / MAX_LEVEL}">${track}</div>
    ${next > MAX_LEVEL ? '' : `<button class="btn primary" data-action="skill-level" data-id="${sk.id}" data-level="${next}">
      ${next === MAX_LEVEL ? t('learn.skill.master', { xp: XP.mastered }) : t('learn.skill.levelUp', { next: t(`skillLevels.${SKILL_LEVELS[next]}`), xp: XP.level })}
    </button>`}

    <div class="fuel">
      <div class="fuel-head"><b>${t('learn.skill.learnedHeading')}</b><span class="muted small">${tn('learn.skill.learnedCount', st.learnings.length)}</span></div>
      ${fuel.length ? `<ul class="history">${fuel.map((l) => `<li><div><small>${shortDay(l.date)}</small>${esc(l.text)}</div></li>`).join('')}</ul>` : `<p class="muted small">${t('learn.skill.learnedEmpty', { skill: sk.name })}</p>`}
      <form data-form="skill-learning" data-id="${sk.id}" class="row">
        <input name="text" maxlength="280" required placeholder="${ta('learn.skill.quickPlaceholder', { skill: sk.name })}">
        <button class="btn primary" type="submit">${t('learn.skill.quickButton')}</button>
      </form>
    </div>

    <button class="link small drop-link" data-action="drop" data-id="${sk.id}">${t('learn.skill.drop')}</button>
  </section>`;
  } else {
    monthly = `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.plant.eyebrow')}</div><h2>${t('learn.plant.heading')}</h2></div><span class="badge">${t('common.xp', { xp: XP.skillStart })}</span></div>
    <p class="muted">${t('learn.plant.prompt', { month: monthName(month) })}</p>
    <form data-form="skill" class="stack">
      <input name="name" maxlength="60" required placeholder="${ta('learn.plant.placeholder')}">
      ${branchChips('branch', 'mind')}
      <button class="btn primary" type="submit">${t('learn.plant.button')}</button>
    </form>
  </section>`;
  }

  // ---- UNFINISHED
  const stale = s.skills.filter((k) => k.status === 'active' && k.month < month);
  const unfinished = stale.length
    ? `<section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.unfinished.eyebrow')}</div><h2>${t('learn.unfinished.heading')}</h2></div></div>
    ${stale
      .map(
        (k) => `<div class="stale"><div><b>${esc(k.name)}</b><small>${prettyMonth(k.month)}</small></div>
      <div class="row tight"><button class="btn small primary" data-action="skill-level" data-id="${k.id}" data-level="${MAX_LEVEL}">${t('learn.unfinished.nailedIt')}</button>
      <button class="btn small ghost" data-action="drop" data-id="${k.id}">${t('learn.unfinished.letGo')}</button></div></div>`,
      )
      .join('')}
  </section>`
    : '';

  // ---- HISTORY
  const recent = [...s.learnings].reverse().slice(0, 12);
  const history = recent.length
    ? `<section class="card">
    <div class="card-head"><div><div class="eyebrow">${t('learn.history.eyebrow')}</div><h2>${t('learn.history.heading')}</h2></div><span class="muted small">${tn('learn.history.count', s.learnings.length)}</span></div>
    <ul class="history">${recent
      .map(
        (l) => `<li><div><small>${shortDay(l.date)} · ${t(`branches.${l.branch}.label`)}</small>${esc(l.text)}</div>
        <button class="icon-btn" data-action="del-learning" data-id="${l.id}" aria-label="${ta('common.delete')}">×</button></li>`,
      )
      .join('')}</ul>
  </section>`
    : '';

  return `
  <header class="page-head">
    <h1 class="display">${t('learn.title')}</h1>
    <p class="tagline">${t('learn.tagline')}</p>
  </header>
  ${monthly}${daily}${weekly}${unfinished}${history}`;
}
