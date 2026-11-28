import { tx } from '../src/lib/i18n';
import { expect, test } from './fixtures';

/**
 * The Share screen, opened from More: pick what goes on the card, then send it.
 * The phone's share sheet is swapped for a stub that records what it was given.
 */

const DAY = '2026-11-25'; // NOW in fixtures.ts

test.describe('share', () => {
  test('opens full screen from More and closes again', async ({ app }) => {
    await app.openShare();
    await expect(app.nav).toBeHidden();
    await expect(app.share.locator('canvas#share-card')).toBeVisible();
    await app.share.getByRole('button', { name: tx('share.close') }).click();
    await expect(app.share).toHaveCount(0);
    await expect(app.nav).toBeVisible();
    await expect(app.page.locator('.nav-btn[data-tab="more"]')).toHaveClass(/\bon\b/);
  });

  test("a fresh start: streak flex, and nothing you haven't got yet", async ({ app }) => {
    await app.openShare();
    // Nothing done today, so it starts on the streak flex.
    expect(await app.sharedBits()).toEqual(['streak', 'rank', 'pet']);
    await expect(app.sharePreset('flex')).toHaveAttribute('aria-pressed', 'true');

    // No learnings and no skill yet: those can't be picked, and say why.
    await expect(app.shareBit('learned')).toBeDisabled();
    await expect(app.shareBit('learned')).toContainText(tx('share.needs.learned'));
    await expect(app.shareBit('skill')).toBeDisabled();
    await expect(app.shareBit('skill')).toContainText(tx('share.needs.skill'));
    await expect(app.sharePreset('learned')).toHaveCount(0);
  });

  test('toggles add and remove things, and you need at least one', async ({ app }) => {
    await app.openShare();
    await app.shareBit('today').click();
    await expect(app.shareBit('today')).toHaveAttribute('aria-pressed', 'true');
    // Not a quick pick any more.
    await expect(app.sharePreset('flex')).toHaveAttribute('aria-pressed', 'false');

    for (const b of ['today', 'streak', 'rank', 'pet']) await app.shareBit(b).click();
    expect(await app.sharedBits()).toEqual([]);
    await expect(app.shareSend).toBeDisabled();
    await expect(app.share).toContainText(tx('share.pickOne'));

    await app.sharePreset('routine').click();
    expect(await app.sharedBits()).toEqual(['today', 'streak', 'pet']);
    await expect(app.shareSend).toBeEnabled();
  });

  test('after a task, it starts on your routine', async ({ app }) => {
    await app.checkbox(0).click();
    await expect(app.checkbox(0)).toHaveAttribute('aria-pressed', 'true');
    await app.openShare();
    expect(await app.sharedBits()).toEqual(['today', 'streak', 'pet']);
    await expect(app.sharePreset('routine')).toHaveAttribute('aria-pressed', 'true');
  });

  test('pick up to three learnings, and send them', async ({ app, page }) => {
    // Oldest first, the way they're saved; the screen lists them newest first.
    const LEARNED = ['Octopuses have three hearts', 'Wet-on-wet bleeds, wet-on-dry gives hard edges', 'Compound interest is monthly here', 'Squats: knees track over toes'];
    const NEWEST_FIRST = [...LEARNED].reverse();
    await app.seed({
      profile: { name: 'Riley', dogName: 'Pearl', buddyName: '', createdAt: DAY, pet: 'pigeon' },
      learnings: LEARNED.map((text, i) => ({ id: `l${i}`, date: DAY, text, branch: 'mind' })),
    });
    // Stand-in for the phone's share sheet.
    await page.evaluate(() => {
      const w = window as unknown as { shared?: unknown };
      navigator.canShare = () => true;
      navigator.share = async (data?: ShareData) => {
        const f = data?.files?.[0];
        w.shared = { text: data?.text, file: f && { name: f.name, type: f.type, size: f.size } };
      };
    });

    await app.openShare();
    await app.sharePreset('learned').click();
    // No skill planted: the quick pick leaves that out.
    expect(await app.sharedBits()).toEqual(['learned', 'pet']);

    const options = app.share.locator('.share-learning');
    const picked = () => options.evaluateAll((els) => els.filter((e) => e.getAttribute('aria-pressed') === 'true').map((e) => e.textContent));

    await test.step('the newest one is picked to start', async () => {
      await expect(options).toHaveText(NEWEST_FIRST);
      expect(await picked()).toEqual([NEWEST_FIRST[0]]);
    });

    await test.step('pick two more, then the rest are full up', async () => {
      await options.nth(2).click();
      await options.nth(3).click();
      expect(await picked()).toEqual([NEWEST_FIRST[0], NEWEST_FIRST[2], NEWEST_FIRST[3]]);
      await expect(options.nth(1)).toBeDisabled();
    });

    await test.step('untick one and another can go on', async () => {
      await options.nth(0).click();
      await expect(options.nth(1)).toBeEnabled();
      await options.nth(1).click();
      expect(await picked()).toEqual([NEWEST_FIRST[1], NEWEST_FIRST[2], NEWEST_FIRST[3]]);
    });

    await test.step("the last one can't be unticked", async () => {
      await options.nth(1).click();
      await options.nth(2).click();
      await options.nth(3).click();
      expect(await picked()).toEqual([NEWEST_FIRST[3]]);
      await options.nth(1).click();
      await options.nth(2).click();
      expect(await picked()).toEqual([NEWEST_FIRST[1], NEWEST_FIRST[2], NEWEST_FIRST[3]]);
    });

    await test.step('send: an image plus the matching text', async () => {
      await app.shareSend.click();
      await expect(page.locator('#toast')).toContainText(tx('share.sent'));
      const shared = await page.evaluate(() => (window as unknown as { shared: { text: string; file: { name: string; type: string; size: number } } }).shared);
      expect(shared.file.type).toBe('image/png');
      expect(shared.file.name).toMatch(/\.png$/);
      expect(shared.file.size).toBeGreaterThan(1000);
      const lines = shared.text.split('\n');
      expect(lines[0]).toBe(tx('share.textHeading', { name: 'Riley' }));
      // One line per learning, newest first, and not the one left off.
      expect(lines.slice(1, 4)).toEqual(NEWEST_FIRST.slice(1).map((l) => `${tx('share.emoji.learned')} ${tx('share.bits.learned')}: ${l}`));
      expect(shared.text).not.toContain(NEWEST_FIRST[0]);
      expect(lines[4]).toMatch(/^🐦 Pearl: /);
      expect(lines).toHaveLength(5);
    });
  });

  test('untick the image to send just the text', async ({ app, page }) => {
    await page.evaluate(() => {
      const w = window as unknown as { shared?: unknown };
      navigator.canShare = () => true;
      navigator.share = async (data?: ShareData) => {
        w.shared = { text: data?.text, files: data?.files?.length ?? 0 };
      };
    });
    await app.openShare();
    const image = app.share.getByRole('checkbox', { name: new RegExp(tx('share.image')) });
    await expect(image).toBeChecked();
    await expect(app.share.locator('canvas#share-card')).toBeVisible();
    // The text that goes with it shows under the card.
    await expect(app.share.locator('.share-text')).toContainText(tx('share.textHeading', { name: tx('defaults.name') }));

    await image.uncheck();
    // Just the text now.
    await expect(app.share.locator('canvas#share-card')).toHaveCount(0);
    await expect(app.share.locator('.share-text')).toContainText(tx('share.textHeading', { name: tx('defaults.name') }));

    await app.shareSend.click();
    await expect(page.locator('#toast')).toContainText(tx('share.sent'));
    const shared = await page.evaluate(() => (window as unknown as { shared: { text: string; files: number } }).shared);
    expect(shared.files).toBe(0);
    expect(shared.text.split('\n')[0]).toBe(tx('share.textHeading', { name: tx('defaults.name') }));
    await expect(app.share.locator('.share-text')).toHaveText(shared.text);

    // Tick it again and the card's back.
    await image.check();
    await expect(app.share.locator('canvas#share-card')).toBeVisible();
    await expect(app.share.locator('.share-text')).toBeVisible();
  });
});
