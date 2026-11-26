import { moodFor, stageFor } from '../app/progress';
import { save, session, ui } from '../app/session';
import { feedTreat, isAsleep } from '../app/state';
import type { Mode, Tab } from '../app/types';
import { t, type TextKey } from '../lib/i18n';
import { Pet } from '../pets/pet';
import { esc, ICONS } from './common';
import { dogView } from './dog';
import { learnView } from './learn';
import { moreView } from './more';
import { todayView } from './today';
import { treeView } from './tree';

const view = document.getElementById('view')!;
const nav = document.getElementById('nav')!;

/** The animated dog on the dog tab. */
export const pet = new Pet(
  () => ({
    stage: stageFor(session.s.bo.bond).index,
    mood: moodFor(session.s.bo.loyalty),
    asleep: isAsleep(session.s),
    sound: session.s.settings.sound,
    treats: session.s.bo.treats,
  }),
  {
    onTreat: () => {
      if (!feedTreat(session.s)) return false;
      save();
      // Update the loyalty meter in place so the pet scene keeps running.
      const meter = document.querySelector<HTMLElement>('.device .meter i');
      if (meter) meter.style.width = `${session.s.bo.loyalty}%`;
      const pct = document.querySelector('.device .meter-head span:last-child');
      if (pct) pct.textContent = `${Math.round(session.s.bo.loyalty)}%`;
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
