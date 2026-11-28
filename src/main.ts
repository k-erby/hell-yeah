/**
 * Starts the app: loads your saved data, draws the screen, and listens for taps.
 *
 * Where things happen:
 *   app/actions.ts    what each tap / form / input does
 *   app/state.ts      the rules (XP, streaks, skills, the dog's loyalty)
 *   views/            what each screen looks like
 *   text/             every word in the app
 */
import './styles.css';
import { handleAction, handleChange, handleForm } from './app/actions';
import { modeAt, today } from './app/dates';
import { load, save, saveNow, session, ui } from './app/session';
import { focusOver, LOY, normalize, settle } from './app/state';
import { toast } from './effects/feedback';
import { tn } from './lib/i18n';
import { applyTheme, render } from './views/render';
import { updateFocusBar } from './views/today';
import { sfx } from './effects/fx';
import { t } from './lib/i18n';

const app = document.getElementById('app')!;

// ---------- events ----------

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (el && !(el as HTMLButtonElement).disabled) handleAction(el.dataset.action!, el);
});
app.addEventListener('keydown', (e) => {
  const el = e.target as HTMLElement;
  if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute('role') === 'button' && el.dataset.action) {
    e.preventDefault();
    handleAction(el.dataset.action, el);
  }
});
app.addEventListener('submit', (e) => {
  e.preventDefault();
  handleForm(e.target as HTMLFormElement);
});
app.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.change) handleChange(el);
});
addEventListener('pagehide', saveNow);

// ---------- the clock ----------

const missedToast = (n: number) => tn('toasts.missedDay', n, { dog: session.s.profile.dogName, loss: n * LOY.decay });

/** Handle day rollover and morning → afternoon → night while the app is open. */
function tick() {
  const d = today();
  const m = modeAt();
  let changed = false;
  if (d !== session.day) {
    session.day = d;
    const missed = settle(session.s, d);
    if (missed) toast(missedToast(missed));
    save();
    changed = true;
  }
  if (m !== session.timeMode) {
    session.timeMode = m;
    if (!ui.modeManual) ui.mode = m;
    applyTheme();
    changed = true;
  }
  if (changed) render();
}

// ---------- the focus timer ----------

/** Every second while a timer runs: move the clock, and ring once when it's up. */
function focusTick() {
  const s = session.s;
  const f = s.focus;
  if (!f) return;
  if (!focusOver(f)) return updateFocusBar(s);
  if (ui.focusRang === f.startedAt) return;
  ui.focusRang = f.startedAt;
  if (s.settings.sound) sfx('chime', 0.7);
  if (s.settings.haptics && 'vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200]); } catch { /* not supported */ }
  }
  if (ui.tab === 'today') render();
  else {
    const task = s.routines[f.mode].find((i) => i.id === f.itemId)?.label ?? t('focus.someTask');
    toast(t('focus.rang', { task }));
  }
}

// ---------- start ----------

async function boot() {
  session.s = normalize(await load());
  session.day = today();
  const missed = settle(session.s, session.day);
  save();
  applyTheme();
  render();
  if (missed > 0) setTimeout(() => toast(missedToast(missed)), 600);
  // A timer that ran out while the app was closed just waits for "Done?", no ringing.
  if (session.s.focus && focusOver(session.s.focus)) ui.focusRang = session.s.focus.startedAt;
  setInterval(tick, 60_000);
  setInterval(focusTick, 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick());
}

void boot();
