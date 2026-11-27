import { moodFor, stageFor } from '../app/progress';
import { save, session, ui } from '../app/session';
import { monthOf } from '../app/dates';
import { fedToday, feedTreat, isAsleep, skillLevel, streak } from '../app/state';
import type { Mode, Tab } from '../app/types';
import { t, type TextKey } from '../lib/i18n';
import { Pet } from '../pets/pet';
import { esc, ICONS } from './common';
import { dogView, petStatus } from './dog';
import { learnView } from './learn';
import { moreView } from './more';
import { todayView } from './today';
import { treeView } from './tree';

const view = document.getElementById('view')!;
const nav = document.getElementById('nav')!;

/** This month's skill as a plant: how far along it is. Dropped skills leave the pot empty. */
function monthPlant() {
  const month = monthOf(session.day);
  const sk = session.s.skills.find((k) => k.month === month && k.status !== 'dropped');
  return sk ? { month, level: skillLevel(sk) } : null;
}

/** The pet asks for these every frame; they only change on a tap, so work them out every couple of seconds. */
let houseCache = { at: 0, streak: 0, plant: null as ReturnType<typeof monthPlant> };
function house() {
  const now = performance.now();
  if (now - houseCache.at > 2000) houseCache = { at: now, streak: streak(session.s, session.day), plant: monthPlant() };
  return houseCache;
}

/** The animated dog on the dog tab. */
export const pet = new Pet(
  () => ({
    kind: session.s.profile.pet,
    stage: stageFor(session.s.bo.bond).index,
    mood: moodFor(session.s.bo.loyalty),
    asleep: isAsleep(session.s),
    sound: session.s.settings.sound,
    treats: session.s.bo.treats,
    streak: house().streak,
    plant: house().plant,
    fed: fedToday(session.s, session.day),
  }),
  {
    onTreat: () => {
      if (!feedTreat(session.s, session.day)) return false;
      save();
      // Update the loyalty meter in place so the pet scene keeps running.
      const meter = document.querySelector<HTMLElement>('.device .meter i');
      if (meter) meter.style.width = `${session.s.bo.loyalty}%`;
      const pct = document.querySelector('.device .meter-head span:last-child');
      if (pct) pct.textContent = `${Math.round(session.s.bo.loyalty)}%`;
      const status = document.getElementById('pet-status');
      if (status) status.innerHTML = petStatus(session.s, session.day);
      return true;
    },
  },
);

const THEME_COLORS: Record<Mode, string> = { morning: '#0c0a06', afternoon: '#0e090b', night: '#07060d' };

/** Morning / afternoon / night colours, from the setting or the clock. */
export function applyTheme() {
  const m = session.s.settings.theme === 'auto' ? session.timeMode : session.s.settings.theme;
  document.documentElement.dataset.mode = m;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[m]);
}

const TABS: [Tab, TextKey | ''][] = [['today', 'nav.today'], ['learn', 'nav.learn'], ['tree', 'nav.tree'], ['bo', ''], ['more', 'nav.more']];

function renderNav() {
  const dog = esc(session.s.profile.dogName);
  nav.innerHTML = TABS.map(
    ([tab, label]) => `<button class="nav-btn ${ui.tab === tab ? 'on' : ''}" data-action="tab" data-tab="${tab}" aria-label="${label ? t(label) : dog}">
      ${ICONS[tab]}<span>${label ? t(label) : dog}</span></button>`,
  ).join('');
}

/** Redraw the current tab and the nav bar. */
export function render() {
  const s = session.s;
  switch (ui.tab) {
    case 'today': view.innerHTML = todayView(s, ui, session.timeMode); break;
    case 'learn': view.innerHTML = learnView(s); break;
    case 'tree': view.innerHTML = treeView(s, ui); break;
    case 'bo': view.innerHTML = dogView(s); break;
    case 'more': view.innerHTML = moreView(s); break;
  }
  ui.justChecked = undefined;
  renderNav();
  const scene = document.getElementById('bo-scene');
  if (ui.tab === 'bo' && scene) pet.mount(scene, document.getElementById('bo-status')!);
  else pet.unmount();
}
