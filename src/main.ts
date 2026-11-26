import './styles.css';
import { dayKey, modeAt, monthName, monthOf, today } from './dates';
import { bigFx, hitFx, itemFx, sfx, type FxOpts } from './fx';
import { Pet } from './pet';
import { t, tn, tx, type TextKey } from './i18n';
import { ideaUrl } from './ideas';
import { moodFor, rankFor, rankName, stageFor, stageName, stagePerk } from './progress';
import {
  addLearning, addSolidify, currentSkill, defaultState, deleteLearning, feedTreat, finishSkill, isAsleep, MAX_LEVEL, setSkillLevel, SKILL_LEVELS, skillLevel,
  normalize, settle, startSkill, streak, toggleItem, uid, LOY,
} from './state';
import { LocalRepo } from './storage';
import type { AppState, Branch, Method, Mode, Tab } from './types';
import { BRANCHES, METHODS } from './types';
import { boView } from './views/bo';
import { esc, ICONS, type UI } from './views/common';
import { learnView } from './views/learn';
import { moreView } from './views/more';
import { todayView } from './views/today';
import { treeView } from './views/tree';

const repo = new LocalRepo();
let s: AppState = defaultState();
let currentDay = today();
let timeMode: Mode = modeAt();
const ui: UI = { tab: 'today', mode: timeMode, modeManual: false, flipped: false };

const pet = new Pet(() => ({
  stage: stageFor(s.bo.bond).index,
  mood: moodFor(s.bo.loyalty),
  asleep: isAsleep(s),
  sound: s.settings.sound,
  treats: s.bo.treats,
}), {
  onTreat: () => {
    if (!feedTreat(s)) return false;
    save();
    // Update the loyalty meter in place so the pet scene keeps running.
    const meter = document.querySelector<HTMLElement>('.device .meter i');
    if (meter) meter.style.width = `${s.bo.loyalty}%`;
    const pct = document.querySelector('.device .meter-head span:last-child');
    if (pct) pct.textContent = `${Math.round(s.bo.loyalty)}%`;
    return true;
  },
});

const app = document.getElementById('app')!;
const view = document.getElementById('view')!;
const nav = document.getElementById('nav')!;

// ---------- persistence ----------

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void repo.save(s), 150);
}
addEventListener('pagehide', () => void repo.save(s));

// ---------- theme ----------

const THEME_COLORS: Record<Mode, string> = { morning: '#0c0a06', afternoon: '#0e090b', night: '#07060d' };
function applyTheme() {
  const m = s.settings.theme === 'auto' ? timeMode : s.settings.theme;
  document.documentElement.dataset.mode = m;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[m]);
}

// ---------- render ----------

const TABS: [Tab, TextKey | ''][] = [['today', 'nav.today'], ['learn', 'nav.learn'], ['tree', 'nav.tree'], ['bo', ''], ['more', 'nav.more']];

function renderNav() {
  nav.innerHTML = TABS.map(
    ([tab, label]) => `<button class="nav-btn ${ui.tab === tab ? 'on' : ''}" data-action="tab" data-tab="${tab}" aria-label="${label ? t(label) : esc(s.profile.dogName)}">
      ${ICONS[tab]}<span>${label ? t(label) : esc(s.profile.dogName)}</span></button>`,
  ).join('');
}

function render() {
  switch (ui.tab) {
    case 'today': view.innerHTML = todayView(s, ui, timeMode); break;
    case 'learn': view.innerHTML = learnView(s); break;
    case 'tree': view.innerHTML = treeView(s, ui); break;
    case 'bo': view.innerHTML = boView(s); break;
    case 'more': view.innerHTML = moreView(s); break;
  }
  ui.justChecked = undefined;
  renderNav();
  const scene = document.getElementById('bo-scene');
  if (ui.tab === 'bo' && scene) pet.mount(scene, document.getElementById('bo-status')!);
  else pet.unmount();
}

// ---------- feedback ----------

const fxo = (): FxOpts => ({ level: s.settings.fx, sound: s.settings.sound, haptics: s.settings.haptics });

function center(el: Element | null): [number, number] {
  if (!el) return [innerWidth / 2, innerHeight / 2];
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

let toastTimer = 0;
function toast(msg: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 2600);
}

/** Full-screen celebration. All arguments are HTML (use t(), which escapes {vars}). */
function celebrate(eyebrow: string, title: string, sub: string, button = t('celebrate.ok'), boom?: string) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-card"><div class="eyebrow">${eyebrow}</div><div class="display big">${title}</div><p>${sub}</p><button class="btn primary">${button}</button></div>`;
  m.addEventListener('click', (e) => {
    if (e.target === m || (e.target as HTMLElement).closest('button')) m.remove();
  });
  document.body.appendChild(m);
  const plain = document.createElement('div');
  plain.innerHTML = title;
  bigFx(fxo(), boom ?? (plain.textContent ?? '').toLocaleUpperCase());
}

/** Run a mutation, then save/render and celebrate any level-ups it caused. */
function commit(fn: () => void) {
  const r0 = rankFor(s.xp).index;
  const b0 = stageFor(s.bo.bond).index;
  const xp0 = s.xp;
  fn();
  save();
  render();
  const r1 = rankFor(s.xp);
  const b1 = stageFor(s.bo.bond);
  if (r1.index > r0) setTimeout(() => celebrate(t('celebrate.rankEyebrow'), rankName(r1.cur.id), t('celebrate.rankSub', { xp: s.xp })), 900);
  if (b1.index > b0)
    setTimeout(
      () => celebrate(t('celebrate.dogEyebrow', { dog: s.profile.dogName }), stageName(b1.cur.id), stagePerk(b1.cur.id), t('celebrate.dogButton')),
      r1.index > r0 ? 2600 : 900,
    );
  return s.xp - xp0;
}

// ---------- actions ----------

function handleAction(action: string, el: HTMLElement) {
  const id = el.dataset.id ?? '';
  switch (action) {
    case 'tab': {
      ui.tab = el.dataset.tab as Tab;
      if (ui.tab !== 'tree') ui.selectedSkill = undefined;
      render();
      window.scrollTo({ top: 0 });
      break;
    }
    case 'mode':
      ui.mode = el.dataset.mode as Mode;
      ui.modeManual = ui.mode !== timeMode;
      render();
      break;
    case 'toggle': {
      const [x, y] = center(el.querySelector('.box'));
      let result = { checked: false, routineDone: false };
      const gained = commit(() => {
        result = toggleItem(s, ui.mode, id, currentDay);
        if (result.checked) ui.justChecked = id;
      });
      if (result.checked) {
        itemFx(x, y, fxo());
        if (gained > 0) toast(t('toasts.xp', { xp: gained }));
      } else if (s.settings.sound) sfx('tick', 0.4);
      if (result.routineDone) {
        pet.celebrate();
        setTimeout(() => {
          bigFx(fxo());
          toast(t('toasts.routineDone', { routine: tx(`modes.${ui.mode}.title`), dog: s.profile.dogName }));
        }, 350);
      }
      break;
    }
    case 'skill-level': {
      const sk = s.skills.find((k) => k.id === id);
      if (!sk) return;
      const level = Number(el.dataset.level);
      const before = skillLevel(sk);
      if (level === before) return;
      if (level === MAX_LEVEL && !confirm(tx('confirm.master', { skill: sk.name }))) return;
      const [x, y] = center(el);
      const gained = commit(() => setSkillLevel(s, id, level, currentDay));
      if (level === MAX_LEVEL) {
        celebrate(t('celebrate.masteredEyebrow'), esc(sk.name), t('celebrate.masteredSub'), t('celebrate.masteredButton'), tx('celebrate.masteredBoom'));
      } else if (level > before) {
        const name = tx(`skillLevels.${SKILL_LEVELS[level]}`);
        hitFx(x, y, fxo(), gained ? tx('toasts.xp', { xp: gained }) : name.toLocaleUpperCase());
        toast(t('toasts.skillLevel', { skill: sk.name, level: name }));
      } else {
        toast(t('toasts.skillDown', { level: tx(`skillLevels.${SKILL_LEVELS[level]}`) }));
      }
      break;
    }
    case 'drop': {
      const sk = s.skills.find((k) => k.id === id);
      if (!sk || !confirm(tx('confirm.drop', { skill: sk.name }))) return;
      commit(() => finishSkill(s, id, 'dropped', currentDay));
      toast(t('toasts.dropped'));
      break;
    }
    case 'del-learning':
      if (!confirm(tx('confirm.deleteEntry'))) return;
      commit(() => deleteLearning(s, id));
      break;
    case 'skill':
      ui.selectedSkill = id && ui.selectedSkill !== id ? id : undefined;
      render();
      if (ui.selectedSkill) document.querySelector('.tree-card + .card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      break;
    case 'pet-ball':
      pet.throwBall();
      break;
    case 'pet-view':
      pet.toggleView();
      break;
    case 'pet-treat':
      pet.giveTreat();
      break;
    case 'pet-woof':
      pet.woof();
      break;
    case 'set': {
      const key = el.dataset.key as keyof AppState['settings'];
      const raw = el.dataset.value!;
      const value = raw === 'true' ? true : raw === 'false' ? false : raw;
      commit(() => ((s.settings as unknown as Record<string, unknown>)[key] = value));
      if (key === 'theme') applyTheme();
      break;
    }
    case 'test-fx':
      bigFx(fxo());
      break;
    case 'flip':
      if (!ui.flipped) {
        ui.flipped = true;
        document.getElementById('routine-card')?.classList.add('flipped');
      } else {
        // Re-render (front picks up any quiet renames) while still flipped, then animate back.
        render();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            ui.flipped = false;
            document.getElementById('routine-card')?.classList.remove('flipped');
          }),
        );
      }
      break;
    case 'toggle-bo':
      commit(() => {
        const it = s.routines[el.dataset.mode as Mode].find((i) => i.id === id);
        if (it) it.bo = !it.bo;
      });
      break;
    case 'move':
      commit(() => {
        const list = s.routines[el.dataset.mode as Mode];
        const i = list.findIndex((x) => x.id === id);
        const j = i + Number(el.dataset.dir);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      });
      break;
    case 'del-item':
      commit(() => {
        const m = el.dataset.mode as Mode;
        s.routines[m] = s.routines[m].filter((x) => x.id !== id);
      });
      break;
    case 'share':
      void shareStatus();
      break;
    case 'export':
      exportData();
      break;
    case 'reset':
      if (!confirm(tx('confirm.reset'))) return;
      if (!confirm(tx('confirm.resetAgain'))) return;
      s = defaultState();
      ui.tab = 'today';
      save();
      applyTheme();
      render();
      toast(t('toasts.fresh'));
      break;
  }
}

function handleForm(form: HTMLFormElement) {
  const fd = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  const [x, y] = center(btn);
  switch (form.dataset.form) {
    case 'learning': {
      const text = String(fd.get('text') ?? '').trim();
      if (!text) return;
      const branch = (fd.get('branch') as Branch) ?? 'mind';
      if (!BRANCHES.includes(branch)) return;
      const sk = s.skills.find((k) => k.id === fd.get('skillId') && k.status === 'active');
      const gained = commit(() => addLearning(s, text, sk?.branch ?? branch, sk?.id, currentDay));
      hitFx(x, y, fxo(), gained ? tx('toasts.xp', { xp: gained }) : tx('common.noted'));
      break;
    }
    case 'solidify': {
      const text = String(fd.get('text') ?? '').trim();
      const method = fd.get('method') as Method;
      if (!text || !METHODS.includes(method)) return;
      const learningId = (fd.get('learningId') as string) || undefined;
      const picked = fd.get('skillId');
      const skill = picked === null ? undefined : s.skills.some((k) => k.id === picked) ? String(picked) : null;
      commit(() => addSolidify(s, text, method, learningId, currentDay, skill));
      celebrate(t('celebrate.weekEyebrow'), t('celebrate.weekTitle'), t('celebrate.weekSub'));
      break;
    }
    case 'skill-learning': {
      const sk = s.skills.find((k) => k.id === form.dataset.id);
      const text = String(fd.get('text') ?? '').trim();
      if (!sk || !text) return;
      const gained = commit(() => addLearning(s, text, sk.branch, sk.id, currentDay));
      hitFx(x, y, fxo(), gained ? tx('toasts.xp', { xp: gained }) : tx('common.noted'));
      break;
    }
    case 'skill': {
      const name = String(fd.get('name') ?? '').trim();
      const branch = fd.get('branch') as Branch;
      if (!name || !BRANCHES.includes(branch)) return;
      commit(() => startSkill(s, name, branch, currentDay));
      hitFx(x, y, fxo(), tx('celebrate.planted'));
      toast(t('toasts.planted', { skill: name }));
      break;
    }
    case 'add-item': {
      const label = String(fd.get('label') ?? '').trim();
      if (!label) return;
      commit(() => s.routines[form.dataset.mode as Mode].push({ id: uid(), label }));
      (view.querySelector('form[data-form="add-item"] input') as HTMLInputElement | null)?.focus();
      break;
    }
    case 'idea': {
      const idea = String(fd.get('idea') ?? '').trim();
      if (!idea) return;
      window.open(ideaUrl(idea), '_blank', 'noopener');
      form.reset();
      toast(t('toasts.ideaOpened'));
      break;
    }
  }
}

function handleChange(el: HTMLInputElement) {
  switch (el.dataset.change) {
    case 'rename': {
      const label = el.value.trim();
      if (!label) return render();
      // Save without re-rendering so the next tap (e.g. "Done") isn't swallowed.
      const it = s.routines[el.dataset.mode as Mode].find((i) => i.id === el.dataset.id);
      if (it) it.label = label;
      save();
      break;
    }
    case 'profile': {
      const key = el.dataset.key as 'name' | 'dogName' | 'buddyName';
      const v = el.value.trim();
      if (!v && key !== 'buddyName') return render();
      commit(() => (s.profile[key] = v));
      break;
    }
    case 'import':
      void importData(el);
      break;
  }
}

// ---------- share / backup ----------

async function shareStatus() {
  const day = currentDay;
  const sk = currentSkill(s, day);
  const mood = moodFor(s.bo.loyalty);
  const text = [
    tx('share.heading', { name: s.profile.name }),
    tx('share.streak', { n: streak(s, day) }),
    tx('share.rank', { rank: tx(`ranks.${rankFor(s.xp).cur.id}`), xp: s.xp }),
    tx('share.skill', { month: monthName(monthOf(day)), skill: sk ? sk.name : tx('share.noSkill') }),
    tx('share.dog', { dog: s.profile.dogName, mood: tx(`moods.${mood}`), loyalty: Math.round(s.bo.loyalty) }),
  ].join('\n');
  try {
    if (navigator.share) {
      await navigator.share({ title: tx('share.title'), text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast(t('toasts.copied'));
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') toast(t('toasts.shareFailed'));
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hell-yeah-backup-${dayKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importData(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || !('routines' in data)) throw new Error('not a backup');
    if (!confirm(tx('confirm.import'))) return;
    s = normalize(data);
    settle(s, currentDay);
    save();
    applyTheme();
    render();
    toast(t('toasts.restored'));
  } catch {
    toast(t('toasts.badBackup'));
  } finally {
    input.value = '';
  }
}

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

const missedToast = (n: number) => tn('toasts.missedDay', n, { dog: s.profile.dogName, loss: n * LOY.decay });

/** Handle day rollover and morning → afternoon → night while the app is open. */
function tick() {
  const d = today();
  const m = modeAt();
  let changed = false;
  if (d !== currentDay) {
    currentDay = d;
    const missed = settle(s, d);
    if (missed) toast(missedToast(missed));
    save();
    changed = true;
  }
  if (m !== timeMode) {
    timeMode = m;
    if (!ui.modeManual) ui.mode = m;
    applyTheme();
    changed = true;
  }
  if (changed) render();
}

// ---------- boot ----------

async function boot() {
  s = normalize(await repo.load());
  currentDay = today();
  const missed = settle(s, currentDay);
  save();
  applyTheme();
  render();
  if (missed > 0) {
    setTimeout(
      () => toast(missedToast(missed)),
      600,
    );
  }
  setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick());
}

void boot();
