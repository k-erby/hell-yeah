import './styles.css';
import { dayKey, modeAt, monthOf, today } from './dates';
import { bigFx, hitFx, itemFx, sfx, type FxOpts } from './fx';
import { Pet } from './pet';
import { moodFor, MOODS, rankFor, stageFor } from './progress';
import {
  addLearning, addSolidify, currentSkill, defaultState, deleteLearning, feedTreat, finishSkill, isAsleep, MAX_LEVEL, setSkillLevel, SKILL_LEVELS, skillLevel,
  normalize, settle, startSkill, streak, toggleItem, uid, LOY,
} from './state';
import { LocalRepo } from './storage';
import type { AppState, Branch, Method, Mode, Tab } from './types';
import { BRANCHES, METHODS } from './types';
import { boView } from './views/bo';
import { esc, ICONS, MODE_META, type UI } from './views/common';
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

const TABS: [Tab, string][] = [['today', 'Today'], ['learn', 'Learn'], ['tree', 'Tree'], ['bo', ''], ['more', 'More']];

function renderNav() {
  nav.innerHTML = TABS.map(
    ([t, label]) => `<button class="nav-btn ${ui.tab === t ? 'on' : ''}" data-action="tab" data-tab="${t}" aria-label="${t === 'bo' ? esc(s.profile.dogName) : label}">
      ${ICONS[t]}<span>${t === 'bo' ? esc(s.profile.dogName) : label}</span></button>`,
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

function celebrate(eyebrow: string, title: string, sub: string, button = 'Obviously.', boom?: string) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-card"><div class="eyebrow">${eyebrow}</div><div class="display big">${title}</div><p>${sub}</p><button class="btn primary">${button}</button></div>`;
  m.addEventListener('click', (e) => {
    if (e.target === m || (e.target as HTMLElement).closest('button')) m.remove();
  });
  document.body.appendChild(m);
  bigFx(fxo(), boom ?? title.replace(/<[^>]+>/g, '').toUpperCase());
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
  if (r1.index > r0) setTimeout(() => celebrate('New rank', r1.name, `${s.xp.toLocaleString()} XP and climbing. Act like you expected it.`), 900);
  if (b1.index > b0)
    setTimeout(() => celebrate(`${esc(s.profile.dogName)} leveled up`, b1.name, b1.cur.perk, 'Good boy.'), r1.index > r0 ? 2600 : 900);
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
        if (gained > 0) toast(`+${gained} XP`);
      } else if (s.settings.sound) sfx('tick', 0.4);
      if (result.routineDone) {
        pet.celebrate();
        setTimeout(() => {
          bigFx(fxo());
          toast(`<b>${MODE_META[ui.mode].title}: done.</b> ${esc(s.profile.dogName)} approves.`);
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
      if (level === MAX_LEVEL && !confirm(`Nailed "${sk.name}"? That marks it mastered. Be honest.`)) return;
      const [x, y] = center(el);
      const gained = commit(() => setSkillLevel(s, id, level, currentDay));
      if (level === MAX_LEVEL) {
        celebrate('Skill mastered', esc(sk.name), 'Another branch on the tree. That one is yours forever.', 'Next.', 'MASTERED');
      } else if (level > before) {
        hitFx(x, y, fxo(), gained ? `+${gained} XP` : SKILL_LEVELS[level].toUpperCase());
        toast(`<b>${esc(sk.name)}</b>: ${SKILL_LEVELS[level]}.`);
      } else {
        toast(`Moved back to <b>${SKILL_LEVELS[level]}</b>. Honesty is hot.`);
      }
      break;
    }
    case 'drop': {
      const sk = s.skills.find((k) => k.id === id);
      if (!sk || !confirm(`Drop "${sk.name}"? No shame. Not every skill deserves you.`)) return;
      commit(() => finishSkill(s, id, 'dropped', currentDay));
      toast('Dropped. Onward.');
      break;
    }
    case 'del-learning':
      if (!confirm('Delete this entry?')) return;
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
      if (!confirm('Reset EVERYTHING? Routines, XP, the tree, Bo. All of it.')) return;
      if (!confirm('Seriously. This cannot be undone. Export first if you want a backup.')) return;
      s = defaultState();
      ui.tab = 'today';
      save();
      applyTheme();
      render();
      toast('Fresh start.');
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
      hitFx(x, y, fxo(), gained ? `+${gained} XP` : 'NOTED');
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
      celebrate('Week locked in.', 'Solidified.', "That one's not going anywhere. Neither are you.");
      break;
    }
    case 'skill-learning': {
      const sk = s.skills.find((k) => k.id === form.dataset.id);
      const text = String(fd.get('text') ?? '').trim();
      if (!sk || !text) return;
      const gained = commit(() => addLearning(s, text, sk.branch, sk.id, currentDay));
      hitFx(x, y, fxo(), gained ? `+${gained} XP` : 'NOTED');
      break;
    }
    case 'skill': {
      const name = String(fd.get('name') ?? '').trim();
      const branch = fd.get('branch') as Branch;
      if (!name || !BRANCHES.includes(branch)) return;
      commit(() => startSkill(s, name, branch, currentDay));
      hitFx(x, y, fxo(), 'PLANTED');
      toast(`<b>${esc(name)}</b> is planted. Feed it every day.`);
      break;
    }
    case 'add-item': {
      const label = String(fd.get('label') ?? '').trim();
      if (!label) return;
      commit(() => s.routines[form.dataset.mode as Mode].push({ id: uid(), label }));
      (view.querySelector('form[data-form="add-item"] input') as HTMLInputElement | null)?.focus();
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
  const t = currentDay;
  const sk = currentSkill(s, t);
  const mood = moodFor(s.bo.loyalty);
  const text = [
    `${s.profile.name}'s status:`,
    `🔥 ${streak(s, t)}-day streak`,
    `👑 ${rankFor(s.xp).name} · ${s.xp.toLocaleString()} XP`,
    `🌱 ${monthOf(t)} skill: ${sk ? sk.name : 'not planted yet'}`,
    `🐕 ${s.profile.dogName}: ${MOODS[mood].label} (${Math.round(s.bo.loyalty)}% loyal)`,
  ].join('\n');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Hell Yeah status', text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('Status copied. Paste it to your buddy.');
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') toast("Couldn't share. Try again.");
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
    if (!confirm('Replace everything on this phone with this backup?')) return;
    s = normalize(data);
    settle(s, currentDay);
    save();
    applyTheme();
    render();
    toast('Backup restored.');
  } catch {
    toast("That file isn't a Hell Yeah backup.");
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

/** Handle day rollover and morning → afternoon → night while the app is open. */
function tick() {
  const d = today();
  const m = modeAt();
  let changed = false;
  if (d !== currentDay) {
    currentDay = d;
    const missed = settle(s, d);
    if (missed) toast(`${esc(s.profile.dogName)} noticed you were gone. Loyalty −${missed * LOY.decay}.`);
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
      () => toast(`${esc(s.profile.dogName)} noticed you were gone ${missed === 1 ? 'a day' : `${missed} days`}. Loyalty −${missed * LOY.decay}.`),
      600,
    );
  }
  setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick());
}

void boot();
