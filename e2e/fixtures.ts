import { test as base, expect, type Page } from '@playwright/test';
import { tx } from '../src/lib/i18n';

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

  // ---- Today: checklist + focus timer
  get tasks() { return this.page.locator('.checks li.check-row'); }
  task(i: number) { return this.tasks.nth(i); }
  /** The tick box for a task (aria-pressed says whether it's checked). */
  checkbox(i: number) { return this.task(i).locator('button.check'); }
  /** The stopwatch button next to a task. */
  timerButton(i: number) { return this.task(i).locator('.focus-btn'); }
  get timerButtons() { return this.page.locator('.checks .focus-btn'); }
  get lengthPicker() { return this.page.locator('.checks li.focus-pick'); }
  get focusBar() { return this.page.locator('#focus-bar'); }
  /** Open a task's stopwatch and pick a length. */
  async startTimer(i: number, minutes: 5 | 15 | 25) {
    await this.timerButton(i).click();
    await this.lengthPicker.getByRole('button', { name: tx('focus.minutes', { n: minutes }), exact: true }).click();
    await expect(this.focusBar).toBeVisible();
  }

  // ---- Setup walkthrough (More → Run the setup)
  get setup() { return this.page.locator('section.setup'); }
  get nav() { return this.page.locator('#nav'); }
  /** Which step it's on, 1-based. */
  get setupStep() { return this.setup.getByRole('progressbar'); }
  /** Next / "Let's get you set up" / "Let's go": the big button at the bottom. */
  get setupNext() { return this.setup.locator('.setup-nav .btn.primary'); }
  get setupBack() { return this.setup.getByRole('button', { name: tx('setup.back'), exact: true }); }
  get setupClose() { return this.setup.getByRole('button', { name: tx('setup.close') }); }
  get setupInput() { return this.setup.locator('input[name="value"]'); }
  setupTask(label: string) { return this.setup.locator('.setup-task', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }); }
  async openSetup() {
    await this.tab('more');
    await this.page.getByRole('button', { name: tx('settings.setup.button') }).click();
    await expect(this.setup).toBeVisible();
  }
  /** Tap the big button and check it landed on the next step. */
  async setupGo(toStep: number) {
    await this.setupNext.click();
    await expect(this.setupStep).toHaveAttribute('aria-valuenow', String(toStep));
  }
  /** Labels of the tasks showing on Today. */
  taskLabels() { return this.tasks.locator('.label').allInnerTexts(); }

  // ---- Share screen (More → Share something)
  get share() { return this.page.locator('section.share'); }
  shareBit(bit: string) { return this.share.locator(`.share-bit[data-bit="${bit}"]`); }
  sharePreset(p: string) { return this.share.locator(`[data-action="share-preset"][data-preset="${p}"]`); }
  get shareSend() { return this.share.getByRole('button', { name: tx('share.send') }); }
  async openShare() {
    await this.tab('more');
    await this.page.getByRole('button', { name: tx('settings.share.button') }).click();
    await expect(this.share).toBeVisible();
  }
  /** Which bits are switched on, in screen order. */
  async sharedBits() {
    return this.share.locator('.share-bit[aria-pressed="true"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.bit));
  }
  /** Replace the save with this (merged over the defaults on load) and reload. */
  async seed(state: Record<string, unknown>) {
    await this.page.evaluate(([key, st]) => localStorage.setItem(key, JSON.stringify(st)), [STORAGE_KEY, { settings: { sound: false, haptics: false }, ...state }] as const);
    await this.page.reload();
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
