import type { Mode } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');

/** A "day" rolls over at 4am, so a 1am night routine still counts for the night before. */
const ROLLOVER_HOURS = 4;

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(now = new Date()): string {
  return dayKey(new Date(now.getTime() - ROLLOVER_HOURS * 3_600_000));
}

export function parseDay(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const monthOf = (k: string) => k.slice(0, 7);

/** ISO-8601 week key, e.g. 2026-W48. Weeks start Monday. */
export function weekOf(k: string): string {
  const local = parseDay(k);
  const d = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(week)}`;
}

/** Mon..Sun day keys for the week containing k. */
export function weekDays(k: string): string[] {
  const dow = parseDay(k).getDay() || 7;
  const monday = addDays(k, 1 - dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysInMonth(mk: string): number {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function modeAt(now = new Date()): Mode {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
}

export const prettyDay = (k: string) =>
  parseDay(k).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

export const shortDay = (k: string) =>
  parseDay(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const prettyMonth = (mk: string) =>
  parseDay(`${mk}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const monthName = (mk: string) =>
  parseDay(`${mk}-01`).toLocaleDateString(undefined, { month: 'long' });
