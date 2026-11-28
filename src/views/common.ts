import { esc, t, ta } from '../lib/i18n';
import type { AppState, Mode, Tab } from '../app/types';
import type { PetKind } from '../pets/kinds';

export interface UI {
  tab: Tab;
  /** Which routine is showing on Today. */
  mode: Mode;
  modeManual: boolean;
  justChecked?: string;
  selectedSkill?: string;
  /** Today's routine card is flipped to its edit side. */
  flipped: boolean;
  /** Task whose focus-timer length picker is open. */
  focusPick?: string;
  /** The timer (by start time) we've already rung for, so it only rings once. */
  focusRang?: number;
  /** The setup walkthrough, while it's open. Nothing is saved until the last step. */
  setup?: SetupDraft;
  /** The Share screen, while it's open. */
  share?: ShareDraft;
}

/** Things you can put on a share card, in the order they show. */
export const SHARE_BITS = ['today', 'learned', 'skill', 'streak', 'rank', 'pet'] as const;
export type ShareBit = (typeof SHARE_BITS)[number];

export interface ShareDraft {
  bits: ShareBit[];
  /** Send the card image with the text (true), or just the text. */
  image: boolean;
  /** Which learnings go on the card (up to 3). */
  learningIds?: string[];
}

/** Answers so far in the setup walkthrough. */
export interface SetupDraft {
  step: number;
  name: string;
  pet: PetKind;
  petName: string;
  routines: Record<Mode, string[]>;
}

export { esc } from '../lib/i18n';

/** Deterministic pick so the line doesn't change every re-render. */
export function pickBy<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

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
  const rows = items
    .map(
      (it, i) => `<li class="edit-row">
      <input value="${esc(it.label)}" maxlength="60" data-change="rename" data-mode="${mode}" data-id="${it.id}" aria-label="${ta('editor.taskName')}">
      <button class="repeat-btn ${it.once ? 'once' : ''}" data-action="toggle-once" data-mode="${mode}" data-id="${it.id}" title="${ta('editor.switchRepeat')}">${it.once ? t('editor.once') : t('editor.daily')}</button>
      <button class="icon-btn" data-action="move" data-mode="${mode}" data-id="${it.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${ta('editor.moveUp')}">↑</button>
      <button class="icon-btn" data-action="move" data-mode="${mode}" data-id="${it.id}" data-dir="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="${ta('editor.moveDown')}">↓</button>
      <button class="icon-btn danger" data-action="del-item" data-mode="${mode}" data-id="${it.id}" aria-label="${ta('common.delete')}">×</button>
    </li>`,
    )
    .join('');
  return `<ul class="editor">${rows || `<li class="muted small">${t('editor.empty')}</li>`}</ul>
    <form data-form="add-item" data-mode="${mode}" class="add-item">
      <div class="row">
        <input name="label" maxlength="60" required placeholder="${ta('editor.addPlaceholder')}">
        <button class="btn primary" type="submit">${t('common.add')}</button>
      </div>
      <div class="chips" role="radiogroup">
        <label class="chip-radio"><input type="radio" name="repeat" value="daily" checked><span>${t('editor.daily')}</span></label>
        <label class="chip-radio"><input type="radio" name="repeat" value="once"><span>${t('editor.once')}</span></label>
      </div>
    </form>`;
}

export const PENCIL = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>';
