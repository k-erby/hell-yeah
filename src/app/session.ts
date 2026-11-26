import type { FxOpts } from '../effects/fx';
import type { UI } from '../views/common';
import { modeAt, today } from './dates';
import { defaultState } from './state';
import { LocalRepo } from './storage';
import type { AppState, Mode } from './types';

/**
 * The app's live state while it's open. Shared by the tap handlers, the screen
 * renderer and startup. `s` gets replaced on reset/import, so always read it
 * as `session.s` rather than keeping your own copy across those.
 */
export const session: { s: AppState; day: string; timeMode: Mode } = {
  s: defaultState(),
  /** The logical day (rolls over at 4am). */
  day: today(),
  /** Morning / afternoon / night by the clock. */
  timeMode: modeAt(),
};

/** What's on screen: tab, selected skill, etc. Never saved. */
export const ui: UI = { tab: 'today', mode: session.timeMode, modeManual: false, flipped: false };

const repo = new LocalRepo();
let saveTimer = 0;

/** Save soon (batched so rapid taps write once). */
export function save() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void repo.save(session.s), 150);
}

export const saveNow = () => void repo.save(session.s);
export const load = () => repo.load();

/** The person's explosion / sound / vibration settings. */
export const fxo = (): FxOpts => ({ level: session.s.settings.fx, sound: session.s.settings.sound, haptics: session.s.settings.haptics });
