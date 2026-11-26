/**
 * Looks up the app's words from src/text/. Code should never have user-facing text inline;
 * it asks for a key instead, e.g. t('learn.plant.button') → "Plant it".
 *
 *   t(key, vars)      HTML-safe: {vars} are escaped, the message itself may contain <b>.
 *   tx(key, vars)     Plain text (confirm(), share text).
 *   ta(key, vars)     For HTML attributes (placeholder, aria-label, title).
 *   tn(key, n, vars)  Plural-aware: picks one/other/few/… for n using Intl.PluralRules.
 *   list(key)         A list of lines (pep talks, explosion words).
 *
 * Keys are type-checked: a typo or a missing entry is a build error, not a blank button.
 * Another language later = another folder with the same shape (Messages), passed to setLocale().
 */
import { dog } from './text/dog';
import { ui } from './text/ui';
import { vibe } from './text/vibe';

const en = { ...ui, dog, ...vibe };

// ---------- types

export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
type Widen<T> = T extends string ? string : T extends readonly string[] ? string[] : T extends { other: string } ? Plural : { [K in keyof T]: Widen<T[K]> };
/** The shape every language must match. */
export type Messages = Widen<typeof en>;

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;
type Keys<T, Leaf, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? Join<P, K>
    : T[K] extends string | readonly unknown[] | { other: string }
      ? never
      : T[K] extends object
        ? Keys<T[K], Leaf, Join<P, K>>
        : never;
}[keyof T & string];

export type TextKey = Keys<typeof en, string>;
export type PluralKey = Keys<typeof en, { other: string }>;
export type ListKey = Keys<typeof en, readonly string[]>;
type Vars = Record<string, string | number>;

// ---------- runtime

let locale = 'en';
let messages: Messages = en;

export function setLocale(code: string, m: Messages) {
  locale = code;
  messages = m;
  if (typeof document !== 'undefined') document.documentElement.lang = code;
}
export const getLocale = () => locale;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function get(key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], messages);
}

const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString(locale) : v);
const fill = (msg: string, vars: Vars, html: boolean) =>
  msg.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? (html ? esc(fmt(vars[k])) : fmt(vars[k])) : m));

export const t = (key: TextKey, vars: Vars = {}) => fill(get(key) as string, vars, true);
export const tx = (key: TextKey, vars: Vars = {}) => fill(get(key) as string, vars, false);
/** For HTML attributes: placeholder="${ta('…')}". */
export const ta = (key: TextKey, vars: Vars = {}) => esc(tx(key, vars));

const rules = new Map<string, Intl.PluralRules>();
function form(key: PluralKey, n: number): string {
  const forms = get(key) as Plural;
  let pr = rules.get(locale);
  if (!pr) rules.set(locale, (pr = new Intl.PluralRules(locale)));
  return forms[pr.select(n) as keyof Plural] ?? forms.other;
}
export const tn = (key: PluralKey, n: number, vars: Vars = {}) => fill(form(key, n), { n, ...vars }, true);
export const tnx = (key: PluralKey, n: number, vars: Vars = {}) => fill(form(key, n), { n, ...vars }, false);

export const list = (key: ListKey) => get(key) as string[];
