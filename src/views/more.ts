import type { AppState } from '../types';
import { esc } from './common';

function seg(key: string, value: string, options: [string, string][]) {
  return `<div class="seg small">${options
    .map(([v, label]) => `<button class="seg-btn ${v === value ? 'on' : ''}" data-action="set" data-key="${key}" data-value="${v}">${label}</button>`)
    .join('')}</div>`;
}

export function moreView(s: AppState): string {
  const st = s.settings;
  const dog = esc(s.profile.dogName);


  return `
  <header class="page-head">
    <h1 class="display">Settings.</h1>
    <p class="tagline">Make it yours.</p>
  </header>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Crew</div><h2>Accountability</h2></div></div>
    <label class="field"><span>Your name</span><input value="${esc(s.profile.name)}" maxlength="30" data-change="profile" data-key="name"></label>
    <label class="field"><span>Dog's name</span><input value="${dog}" maxlength="20" data-change="profile" data-key="dogName"></label>
    <label class="field"><span>Accountability buddy</span><input value="${esc(s.profile.buddyName)}" maxlength="30" placeholder="Who's keeping you honest?" data-change="profile" data-key="buddyName"></label>
    <button class="btn primary" data-action="share">Send my status${s.profile.buddyName ? ` to ${esc(s.profile.buddyName)}` : ''}</button>
    <p class="muted small">Live buddy sync is coming. For now, this sends a status card over text or anything else on your phone.</p>
  </section>


  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Vibe</div><h2>Look & feel</h2></div></div>
    <div class="setting"><span>Explosions</span>${seg('fx', st.fx, [['classy', 'Classy'], ['stupid', 'Stupid']])}</div>
    <div class="setting"><span>Sound</span>${seg('sound', String(st.sound), [['true', 'On'], ['false', 'Off']])}</div>
    <div class="setting"><span>Vibration</span>${seg('haptics', String(st.haptics), [['true', 'On'], ['false', 'Off']])}</div>
    <div class="setting col"><span>Theme</span>${seg('theme', st.theme, [['auto', 'Auto'], ['morning', 'AM'], ['afternoon', 'PM'], ['night', 'Night']])}</div>
    <button class="btn ghost small" data-action="test-fx">Test an explosion</button>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Data</div><h2>Backup</h2></div></div>
    <p class="muted small">Everything's saved on this phone. Export now and then so you can't lose it.</p>
    <div class="row">
      <button class="btn ghost" data-action="export">Export</button>
      <label class="btn ghost">Import<input type="file" accept="application/json,.json" data-change="import" hidden></label>
    </div>
    <button class="btn danger small" data-action="reset">Reset everything</button>
  </section>
  <p class="footer muted small">Hell Yeah · v0.1</p>`;
}
