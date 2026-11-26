import { fxo } from '../app/session';
import { t } from '../lib/i18n';
import { bigFx } from './fx';

/** Screen position of an element's centre (where an explosion starts). */
export function center(el: Element | null): [number, number] {
  if (!el) return [innerWidth / 2, innerHeight / 2];
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

let toastTimer = 0;
/** Little message at the bottom of the screen. `msg` is HTML (use t(), which escapes {vars}). */
export function toast(msg: string) {
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
export function celebrate(eyebrow: string, title: string, sub: string, button = t('celebrate.ok'), boom?: string) {
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
