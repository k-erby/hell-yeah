import { monthName, monthOf, prettyMonth, shortDay, today, weekDays, weekOf } from '../dates';
import { currentSkill, skillStats, XP } from '../state';
import type { AppState, Branch } from '../types';
import { BRANCHES, METHODS } from '../types';
import { BRANCH_META, esc, METHOD_META, plural } from './common';

function branchChips(name: string, selected: Branch) {
  return `<div class="chips" role="radiogroup">${BRANCHES.map(
    (b) => `<label class="chip-radio"><input type="radio" name="${name}" value="${b}" ${b === selected ? 'checked' : ''}><span>${BRANCH_META[b].label}</span></label>`,
  ).join('')}</div>`;
}

export function learnView(s: AppState): string {
  const t = today();
  const month = monthOf(t);
  const week = weekOf(t);
  const sk = currentSkill(s, t);
  const todays = s.learnings.filter((l) => l.date === t);
  const earned = !!s.awarded[`learn:${t}`];

  // ---- DAILY
  const daily = `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Every day</div><h2>Learn something new</h2></div>
      <span class="badge ${todays.length ? 'ok' : ''}">${todays.length ? 'Done' : `+${XP.learning} XP`}</span></div>
    ${todays.map((l) => `<div class="entry"><span class="entry-tag">${BRANCH_META[l.branch].label}</span>${esc(l.text)}</div>`).join('')}
    <form data-form="learning" class="stack">
      <textarea name="text" rows="2" maxlength="280" required placeholder="${todays.length ? 'Another one? Look at you.' : "One thing. Doesn't have to be deep."}"></textarea>
      ${branchChips('branch', sk?.branch ?? 'mind')}
      ${sk ? `<label class="toggle-line"><input type="checkbox" name="link" checked><span>Counts toward <b>${esc(sk.name)}</b></span></label>` : ''}
      <button class="btn primary" type="submit">${earned ? 'Log another' : `Log it · +${XP.learning} XP`}</button>
    </form>
  </section>`;

  // ---- WEEKLY
  const thisWeek = s.solidifies.find((x) => x.week === week);
  const days = new Set(weekDays(t));
  const weekLearnings = s.learnings.filter((l) => days.has(l.date)).reverse();
  const weekly = thisWeek
    ? `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Every week</div><h2>Locked in</h2></div><span class="badge ok">Done</span></div>
    <div class="entry"><span class="entry-tag">${METHOD_META[thisWeek.method]}</span>${esc(thisWeek.text)}</div>
    <p class="muted small">Next lock-in opens Monday.</p>
  </section>`
    : `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Every week</div><h2>Solidify something</h2></div><span class="badge">+${XP.solidify} XP</span></div>
    <p class="muted">Learning it once is cute. Making it stick is the flex. Pick something from this week and prove you've got it.</p>
    <form data-form="solidify" class="stack">
      ${
        weekLearnings.length
          ? `<div class="pick-list">${weekLearnings
              .map(
                (l, i) => `<label class="pick"><input type="radio" name="learningId" value="${l.id}" ${i === 0 ? 'checked' : ''}>
                  <span><small>${shortDay(l.date)}</small>${esc(l.text)}</span></label>`,
              )
              .join('')}</div>`
          : '<p class="muted small">Nothing logged this week yet. You can still lock in something from earlier.</p>'
      }
      <div class="chips" role="radiogroup">${METHODS.map(
        (m, i) => `<label class="chip-radio"><input type="radio" name="method" value="${m}" ${i === 0 ? 'checked' : ''}><span>${METHOD_META[m]}</span></label>`,
      ).join('')}</div>
      <textarea name="text" rows="2" maxlength="400" required placeholder="How'd you make it stick?"></textarea>
      <button class="btn primary" type="submit">Lock it in · +${XP.solidify} XP</button>
    </form>
  </section>`;

  // ---- MONTHLY
  let monthly: string;
  if (sk) {
    const st = skillStats(s, sk);
    monthly = `
  <section class="card skill-card">
    <div class="card-head"><div><div class="eyebrow">${prettyMonth(month)} · ${BRANCH_META[sk.branch].label}</div><h2 class="display-sm">${esc(sk.name)}</h2></div>
      <span class="badge">${st.pct}%</span></div>
    <div class="xpbar"><i style="width:${st.pct}%"></i></div>
    <div class="mini-stats">
      <div><b>${st.days}</b><span>days fed</span></div>
      <div><b>${st.solid}/4</b><span>locked in</span></div>
      <div><b>${st.learnings.length}</b><span>${st.learnings.length === 1 ? 'leaf' : 'leaves'}</span></div>
    </div>
    <div class="row">
      <button class="btn primary" data-action="master" data-id="${sk.id}">Mastered it · +${XP.mastered} XP</button>
      <button class="btn ghost" data-action="drop" data-id="${sk.id}">Drop it</button>
    </div>
  </section>`;
  } else {
    monthly = `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Every month</div><h2>Plant a new skill</h2></div><span class="badge">+${XP.skillStart} XP</span></div>
    <p class="muted">What are you going to be able to do by the end of ${monthName(month)} that you can't do now?</p>
    <form data-form="skill" class="stack">
      <input name="name" maxlength="60" required placeholder="e.g. Deadlift form, basic Spanish, budgeting">
      ${branchChips('branch', 'mind')}
      <button class="btn primary" type="submit">Plant it</button>
    </form>
  </section>`;
  }

  // ---- UNFINISHED
  const stale = s.skills.filter((k) => k.status === 'active' && k.month < month);
  const unfinished = stale.length
    ? `<section class="card">
    <div class="card-head"><div><div class="eyebrow">Unfinished business</div><h2>Did you get it?</h2></div></div>
    ${stale
      .map(
        (k) => `<div class="stale"><div><b>${esc(k.name)}</b><small>${prettyMonth(k.month)}</small></div>
      <div class="row tight"><button class="btn small primary" data-action="master" data-id="${k.id}">Got it</button>
      <button class="btn small ghost" data-action="drop" data-id="${k.id}">Drop</button></div></div>`,
      )
      .join('')}
  </section>`
    : '';

  // ---- HISTORY
  const recent = [...s.learnings].reverse().slice(0, 12);
  const history = recent.length
    ? `<section class="card">
    <div class="card-head"><div><div class="eyebrow">The receipts</div><h2>Recently learned</h2></div><span class="muted small">${plural(s.learnings.length, 'thing')}</span></div>
    <ul class="history">${recent
      .map(
        (l) => `<li><div><small>${shortDay(l.date)} · ${BRANCH_META[l.branch].label}</small>${esc(l.text)}</div>
        <button class="icon-btn" data-action="del-learning" data-id="${l.id}" aria-label="Delete">×</button></li>`,
      )
      .join('')}</ul>
  </section>`
    : '';

  return `
  <header class="page-head">
    <h1 class="display">Level up.</h1>
    <p class="tagline">Every day, learn something. Every week, lock it in. Every month, a new skill.</p>
  </header>
  ${monthly}${daily}${weekly}${unfinished}${history}`;
}
