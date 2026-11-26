import { test as base, expect, type Page } from '@playwright/test';
import { tx } from '../src/i18n';

/** A Wednesday morning, Vancouver time. Fixed so week/month/mode logic is predictable. */
export const NOW = new Date('2026-11-25T10:00:00-08:00');

const STORAGE_KEY = 'hell-yeah:v1';

/**
 * Every test gets a fresh phone (new browser context = empty localStorage),
 * a frozen clock, and sound/vibration off so nothing beeps at you while it runs.
 */
export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await page.addInitScript(
      ([key]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ settings: { sound: false, haptics: false } }));
      },
      [STORAGE_KEY],
    );
    await page.goto('./');
    await use(new App(page));
  },
});

export { expect };

type TabName = 'today' | 'learn' | 'tree' | 'bo' | 'more';

/** Small page-object so the tests read like the flow, not like selectors. */
export class App {
  constructor(readonly page: Page) {}

  async tab(name: TabName) {
    await this.page.locator(`.nav-btn[data-tab="${name}"]`).click();
    await expect(this.page.locator(`.nav-btn[data-tab="${name}"]`)).toHaveClass(/\bon\b/);
  }

  /** Tap a chip (branch / skill / method). The real radio is visually hidden, so tap its label. */
  async chip(scope: ReturnType<Page['locator']>, label: string) {
    await scope.locator('label.chip-radio', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
  }

  // ---- Learn tab
  get skillCard() { return this.page.locator('section.skill-card'); }
  get dailyForm() { return this.page.locator('form[data-form="learning"]'); }
  get dailyCard() { return this.page.locator('section.card', { has: this.dailyForm }); }
  get weeklyForm() { return this.page.locator('form[data-form="solidify"]'); }
  get weeklyCard() { return this.page.locator('section.card', { has: this.page.locator('.eyebrow', { hasText: tx('learn.weekly.eyebrow') }) }); }

  // ---- Tree tab
  get tree() { return this.page.locator('svg.tree'); }
  node(skill: string) { return this.tree.locator(`g.node[aria-label="${skill}"]`); }
  branch(b: string) { return this.tree.locator(`path.branch[data-branch="${b}"]`); }
  branchLabel(b: string) { return this.tree.locator(`text.branch-label[data-branch="${b}"]`); }
  /** Open a skill's detail card. Tapping a selected node closes it, so only tap when it isn't open. */
  async openSkill(skill: string) {
    const n = this.node(skill);
    if (!(await n.getAttribute('class'))?.includes('selected')) await n.click();
    await expect(this.detail.locator('h2')).toHaveText(skill);
  }
  get detail() { return this.page.locator('section.tree-card + section.card'); }
  /** A number in the skill detail's stats row, found by its index (0 = progress, 1 = learned, 2 = locked in). */
  stat(i: number) { return this.detail.locator('.mini-stats > div').nth(i).locator('b'); }
}
