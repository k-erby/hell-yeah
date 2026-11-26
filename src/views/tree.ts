import { prettyMonth, shortDay } from '../dates';
import { skillStats } from '../state';
import type { AppState, Branch, Skill, Solidify } from '../types';
import { BRANCHES } from '../types';
import { t, ta, tn, tnx } from '../i18n';
import { esc, type UI } from './common';

type Pt = [number, number];
const TRUNK_BASE: Pt = [180, 448];
const TRUNK_TOP: Pt = [180, 300];
const TIPS: Record<Branch, Pt> = {
  body: [28, 178],
  mind: [78, 66],
  craft: [180, 26],
  money: [282, 66],
  social: [332, 178],
};

function ctrl(tip: Pt): Pt {
  return [TRUNK_TOP[0] + (tip[0] - TRUNK_TOP[0]) * 0.25, TRUNK_TOP[1] - (TRUNK_TOP[1] - tip[1]) * 0.6];
}

function qPoint(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
}

const f = (n: number) => n.toFixed(1);

export function treeView(s: AppState, ui: UI): string {
  let branches = '';
  let nodes = '';
  let leaves = '';

  for (const b of BRANCHES) {
    const tip = TIPS[b];
    const c = ctrl(tip);
    const skills = s.skills.filter((k) => k.branch === b && k.status !== 'dropped').sort((x, y) => x.month.localeCompare(y.month));
    const grown = skills.length > 0;
    const loose = s.learnings.filter((l) => l.branch === b && !l.skillId);

    branches += `<path d="M${TRUNK_TOP[0]} ${TRUNK_TOP[1]} Q${f(c[0])} ${f(c[1])} ${tip[0]} ${tip[1]}" class="branch ${grown ? 'grown' : ''}" data-branch="${b}"/>`;
    const labelY = tip[1] - 14;
    nodes += `<text x="${tip[0]}" y="${labelY}" class="branch-label ${grown ? 'grown' : ''}" data-branch="${b}" text-anchor="middle">${t(`branches.${b}.label`).toLocaleUpperCase()}</text>`;

    // Loose learnings = small buds near the base of the branch
    loose.slice(0, 40).forEach((_, i) => {
      const [x, y] = qPoint(TRUNK_TOP, c, tip, 0.08 + ((i * 0.618) % 1) * 0.22);
      const off = (i % 2 ? 1 : -1) * (4 + (i % 3) * 2);
      leaves += `<circle cx="${f(x + off * 0.7)}" cy="${f(y + off * 0.5)}" r="1.8" class="bud"/>`;
    });

    skills.forEach((sk, i) => {
      const tt = 0.36 + (0.64 * (i + 1)) / skills.length;
      const [x, y] = qPoint(TRUNK_TOP, c, tip, tt);
      nodes += skillNode(s, sk, x, y, ui.selectedSkill === sk.id);
      leaves += skillLeaves(s, sk, x, y);
    });
  }

  const roots = `<path d="M180 448 q-30 6 -54 2 M180 448 q28 8 52 3 M180 448 q-8 8 -22 12" class="root"/>`;
  const trunk = `<path d="M180 ${TRUNK_BASE[1]} C 176 400, 186 350, ${TRUNK_TOP[0]} ${TRUNK_TOP[1]}" class="trunk"/>`;

  const empty = !s.skills.length
    ? `<div class="tree-empty"><p>${t('tree.empty')}</p><button class="btn primary small" data-action="tab" data-tab="learn">${t('tree.plantButton')}</button></div>`
    : '';

  return `
  <header class="page-head">
    <h1 class="display">${t('tree.title')}</h1>
    <p class="tagline">${t('tree.tagline')}</p>
  </header>
  <section class="card tree-card">
    <svg class="tree" viewBox="0 0 360 470" role="img" aria-label="${ta('tree.label')}">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent2)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient>
        <!-- Branches use canvas coordinates: a bounding-box gradient on a perfectly straight path (CRAFT) has zero width and renders nothing. -->
        <linearGradient id="gold-b" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="300"><stop offset="0" style="stop-color:var(--accent2)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      ${roots}${trunk}${branches}${leaves}${nodes}
    </svg>
    ${empty}
    <div class="legend"><span><i class="lg-node"></i>${t('tree.legend.skill')}</span><span><i class="lg-diamond"></i>${t('tree.legend.week')}</span><span><i class="lg-leaf"></i>${t('tree.legend.day')}</span></div>
  </section>
  ${detail(s, ui)}`;
}

function skillNode(s: AppState, sk: Skill, x: number, y: number, selected: boolean): string {
  const st = skillStats(s, sk);
  const r = 11;
  const circ = 2 * Math.PI * (r + 4);
  const mastered = sk.status === 'mastered';
  const diamonds = Array.from({ length: Math.min(st.solid, 8) }, (_, i) => {
    const a = -Math.PI / 2 + (i - (Math.min(st.solid, 8) - 1) / 2) * 0.5;
    const dx = x + Math.cos(a) * 22;
    const dy = y + Math.sin(a) * 22;
    return `<rect x="${f(dx - 3)}" y="${f(dy - 3)}" width="6" height="6" transform="rotate(45 ${f(dx)} ${f(dy)})" class="diamond"/>`;
  }).join('');
  const name = sk.name.length > 16 ? sk.name.slice(0, 15) + '…' : sk.name;
  return `<g class="node ${mastered ? 'mastered' : 'active'} ${selected ? 'selected' : ''}" data-action="skill" data-id="${sk.id}" tabindex="0" role="button" aria-label="${esc(sk.name)}">
    <circle cx="${f(x)}" cy="${f(y)}" r="26" class="hit"/>
    ${mastered ? '' : `<circle cx="${f(x)}" cy="${f(y)}" r="${r + 4}" class="prog-bg"/><circle cx="${f(x)}" cy="${f(y)}" r="${r + 4}" class="prog" stroke-dasharray="${f(circ)}" stroke-dashoffset="${f(circ * (1 - st.pct / 100))}" transform="rotate(-90 ${f(x)} ${f(y)})"/>`}
    <circle cx="${f(x)}" cy="${f(y)}" r="${r}" class="core" ${mastered ? 'filter="url(#glow)"' : ''}/>
    ${mastered ? `<path d="M${f(x - 5)} ${f(y)} l3.5 3.5 l6.5 -7" class="tick"/>` : ''}
    ${diamonds}
    <text x="${f(x)}" y="${f(y + r + 15)}" text-anchor="middle" class="node-label">${esc(name)}</text>
  </g>`;
}

function skillLeaves(s: AppState, sk: Skill, x: number, y: number): string {
  const n = Math.min(skillStats(s, sk).learnings.length, 31);
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + 1.2; // golden angle spiral
    const rad = 17 + (i % 4) * 3.2;
    const lx = x + Math.cos(a) * rad;
    const ly = y + Math.sin(a) * rad;
    const deg = (a * 180) / Math.PI;
    out += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="3.6" ry="1.6" transform="rotate(${f(deg)} ${f(lx)} ${f(ly)})" class="leaf"/>`;
  }
  return out;
}

function detail(s: AppState, ui: UI): string {
  const sk = s.skills.find((k) => k.id === ui.selectedSkill);
  if (sk) {
    const st = skillStats(s, sk);
    const level = t(`skillLevels.${st.levelId}`);
    const solids = s.solidifies.filter((x) => x.skillId === sk.id);
    // Lock-ins that point at one of this skill's learnings get folded into that learning.
    const lockFor = new Map(solids.filter((x) => x.learningId).map((x) => [x.learningId!, x]));
    const mine = new Set(st.learnings.map((l) => l.id));
    const loose = solids.filter((x) => !x.learningId || !mine.has(x.learningId));
    const recent = [...st.learnings].reverse();
    const shown = recent.filter((l, i) => i < 10 || lockFor.has(l.id));
    const lockLine = (x: Solidify) => `<div class="lock-in"><span class="entry-tag">${t('tree.detail.lockInTag', { method: t(`methods.${x.method}`) })}</span>${esc(x.text)}</div>`;
    const looseBlocks = loose
      .map((x) => {
        const l = x.learningId ? s.learnings.find((y) => y.id === x.learningId) : undefined;
        return `<div class="entry"><span class="entry-tag">${t('tree.detail.lockInTag', { method: t(`methods.${x.method}`) })}</span>${esc(x.text)}${l ? `<div class="from-learning"><small>${shortDay(l.date)}</small>${esc(l.text)}</div>` : ''}</div>`;
      })
      .join('');
    return `<section class="card">
      <div class="card-head"><div><div class="eyebrow">${t('tree.detail.eyebrow', { branch: t(`branches.${sk.branch}.label`), month: prettyMonth(sk.month) })}</div><h2 class="display-sm">${esc(sk.name)}</h2></div>
        <span class="badge ${sk.status === 'mastered' ? 'ok' : ''}">${sk.status === 'mastered' ? t('tree.detail.mastered') : level}</span></div>
      <div class="mini-stats">
        <div><b>${level}</b><span>${t('tree.detail.progress')}</span></div>
        <div><b>${st.learnings.length}</b><span>${tn('tree.detail.thingsLearned', st.learnings.length)}</span></div>
        <div><b>${st.solid}</b><span>${t('tree.detail.lockedIn')}</span></div>
      </div>
      ${looseBlocks}
      <ul class="history">${shown
        .map((l) => {
          const x = lockFor.get(l.id);
          return `<li><div><small>${shortDay(l.date)}</small>${esc(l.text)}${x ? lockLine(x) : ''}</div></li>`;
        })
        .join('')}</ul>
      <button class="btn ghost small" data-action="skill" data-id="">${t('common.close')}</button>
    </section>`;
  }
  const rows = BRANCHES.map((b) => {
    const skills = s.skills.filter((k) => k.branch === b);
    const mastered = skills.filter((k) => k.status === 'mastered').length;
    const leaves = s.learnings.filter((l) => l.branch === b).length;
    return `<li><div><b>${t(`branches.${b}.label`)}</b><small>${t(`branches.${b}.blurb`)}</small></div>
      <span class="muted small">${t('tree.branches.row', { mastered, total: skills.length, leaves: tnx('tree.branches.leaves', leaves) })}</span></li>`;
  }).join('');
  return `<section class="card"><div class="card-head"><div><div class="eyebrow">${t('tree.branches.eyebrow')}</div><h2>${t('tree.branches.heading')}</h2></div></div>
    <ul class="history branches">${rows}</ul><p class="muted small">${t('tree.branches.hint')}</p></section>`;
}
