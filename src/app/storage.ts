import type { AppState } from './types';

/**
 * Where the app's state lives. Today that's localStorage on the device.
 * Later, a SupabaseRepo can implement the same interface (see README) and
 * main.ts only has to swap which one it constructs.
 */
export interface Repo {
  load(): Promise<unknown | null>;
  save(state: AppState): Promise<void>;
}

export class LocalRepo implements Repo {
  constructor(private key = 'hell-yeah:v1') {}

  async load(): Promise<unknown | null> {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save', e);
    }
  }
}
