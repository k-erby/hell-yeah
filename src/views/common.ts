import type { AppState, Branch, Method, Mode, Tab } from '../types';

export interface UI {
  tab: Tab;
  /** Which routine is showing on Today. */
  mode: Mode;
  modeManual: boolean;
  justChecked?: string;
  selectedSkill?: string;
  /** Today's routine card is flipped to its edit side. */
  flipped: boolean;
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const MODE_META: Record<Mode, { label: string; title: string; greet: string; lines: string[]; filthy: string[] }> = {
  morning: {
    label: 'Morning',
    title: 'Morning routine',
    greet: 'Morning',
    lines: [
      "Nobody's coming to do it for you. Good thing you don't need them.",
      'Make the bed like you mean it.',
      'Main character energy.',
      'Up. Ready. Unbothered.',
      'The day works for you.',
    ],
    filthy: [
      'Get up, bitch. You have an empire to run.',
      'Good morning, your highness!',
      'Rise and grind, motherfucker.',
      'Coffee first. Then world domination.',
      'Wake the fuck up. We have shit to do.',
    ],
  },
  afternoon: {
    label: 'Afternoon',
    title: 'Afternoon reset',
    greet: 'Afternoon',
    lines: [
      "Halfway. Don't get soft now. (hehe)",
      'Refuel. Reset. Keep moving.',
      "The afternoon slump can't afford you.",
      'Hydrate like you have somewhere to be.',
    ],
    filthy: [
      "Slump? Don't know her.",
      'Fix your crown and get back to it.',
      'Half the day down. Zero fucks given.',
      "Don't you dare get lazy now, bitch.",
    ],
  },
  night: {
    label: 'Night',
    title: 'Night shutdown',
    greet: 'Evening',
    lines: [
      'Shut it down like a pro.',
      'Tomorrow-you is watching. Set her up.',
      'Rest is part of the plan.',
      'Close the day. Lock the door.',
    ],
    filthy: [
      'Bad bitches sleep eight hours.',
      'Off the clock. Phone down.',
      'Close out the day like the boss bitch you are.',
      'Shut it the fuck down. You earned it.',
    ],
  },
};

export const BRANCH_META: Record<Branch, { label: string; blurb: string }> = {
  body: { label: 'Body', blurb: 'Strength, movement, food, sleep' },
  mind: { label: 'Mind', blurb: 'Knowledge, focus, languages' },
  craft: { label: 'Craft', blurb: 'Making things, creative skills' },
  money: { label: 'Money', blurb: 'Career, finance, business' },
  social: { label: 'Social', blurb: 'People, voice, confidence' },
};

export const METHOD_META: Record<Method, string> = {
  practiced: 'Practiced it',
  taught: 'Taught someone',
  wrote: 'Wrote it out',
  built: 'Built something',
};

/** Deterministic pick so the line doesn't change every re-render. */
export function pickBy<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function ring(pct: number, size = 56, stroke = 5): string {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct / 100))}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export const ICONS: Record<Tab, string> = {
  today: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7.5 12.5l3 3 6-7"/></svg>',
  learn: '<svg viewBox="0 0 24 24"><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/></svg>',
  tree: '<svg viewBox="0 0 24 24"><path d="M12 21.5v-9M12 12.5l-5-5M12 15l5-5M7 7.5V3.5M17 10V6"/><circle cx="7" cy="3.5" r="1.5"/><circle cx="17" cy="6" r="1.5"/><circle cx="12" cy="9" r="1.5"/></svg>',
  bo: '<svg viewBox="0 0 24 24"><path d="M6 20v-6l-2-3 2-7 3 4h6l3-4 2 7-2 3v6"/><circle cx="9.5" cy="12" r=".8"/><circle cx="14.5" cy="12" r=".8"/><path d="M11 16h2"/></svg>',
  more: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
};

/** Rows for editing one routine. Every control carries data-mode so main.ts knows which list. */
export function routineEditor(s: AppState, mode: Mode): string {
  const items = s.routines[mode];
  const dog = esc(s.profile.dogName);
  const rows = items
    .map(
      (it, i) => `<li class="edit-row">
      <input value="${esc(it.label)}" maxlength="60" data-change="rename" data-mode="${mode}" data-id="${it.id}" aria-label="Task name">
      <button class="icon-btn ${it.bo ? 'on' : ''}" data-action="toggle-bo" data-mode="${mode}" data-id="${it.id}" title="${dog} task (bonus loyalty)">${dog.slice(0, 3)}</button>
      <button class="icon-btn" data-action="move" data-mode="${mode}" data-id="${it.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
      <button class="icon-btn" data-action="move" data-mode="${mode}" data-id="${it.id}" data-dir="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
      <button class="icon-btn danger" data-action="del-item" data-mode="${mode}" data-id="${it.id}" aria-label="Delete">×</button>
    </li>`,
    )
    .join('');
  return `<ul class="editor">${rows || '<li class="muted small">Empty. Add something below.</li>'}</ul>
    <form data-form="add-item" data-mode="${mode}" class="row">
      <input name="label" maxlength="60" required placeholder="Add a task">
      <button class="btn primary" type="submit">Add</button>
    </form>`;
}

export const PENCIL = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>';
