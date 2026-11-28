import { list, tx } from '../src/lib/i18n';
import { expect, test } from './fixtures';

/**
 * The setup walkthrough, opened from More. Nothing it asks is saved until "Let's go",
 * so closing it part way, or tapping straight through, leaves everything as it was.
 * The frozen clock (fixtures.ts) is 10am, so Today shows the morning routine.
 */

const MORNING = list('defaults.routines.morning').map((l) => l.replaceAll('{dog}', tx('defaults.dogName')));

test.describe('setup walkthrough', () => {
  test('opens full screen from More and closes without changing anything', async ({ app }) => {
    await app.openSetup();
    await expect(app.setupStep).toHaveAttribute('aria-valuenow', '1');
    await expect(app.setup.locator('h1')).toHaveText(tx('setup.welcome.title'));
    await expect(app.nav).toBeHidden();
    // No Back on the first step.
    await expect(app.setupBack).toHaveCount(0);

    await app.setupClose.click();
    await expect(app.setup).toHaveCount(0);
    await expect(app.nav).toBeVisible();
    await expect(app.page.locator('.nav-btn[data-tab="more"]')).toHaveClass(/\bon\b/);
  });

  test('a full run saves your name, pet, its name and your routines', async ({ app, page }) => {
    await app.openSetup();
    await app.setupGo(2);

    await test.step('your name', async () => {
      await expect(app.setupInput).toHaveValue(tx('defaults.name'));
      await app.setupInput.fill('Riley');
      await app.setupInput.press('Enter');
      await expect(app.setupStep).toHaveAttribute('aria-valuenow', '3');
    });

    await test.step('pick a pet: the default name follows it', async () => {
      await app.setup.locator('.pet-choice[data-kind="pigeon"]').click();
      await expect(app.setup.locator('.pet-choice[data-kind="pigeon"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(app.setup.locator('.pet-choice[aria-pressed="true"]')).toHaveCount(1);
      await app.setupGo(4);
      await expect(app.setupInput).toHaveValue(tx('pets.kinds.pigeon.name'));
    });

    await test.step('name the pet', async () => {
      await app.setupInput.fill('Pidge');
      await app.setupGo(5);
    });

    await test.step('morning: drop one task, add one of your own', async () => {
      await expect(app.setup.locator('h1')).toContainText(tx('modes.morning.title').toLocaleLowerCase());
      await expect(app.setupTask(MORNING[1])).toHaveAttribute('aria-pressed', 'true');
      await app.setupTask(MORNING[1]).click();
      await expect(app.setupTask(MORNING[1])).toHaveAttribute('aria-pressed', 'false');

      await app.setup.locator('form[data-form="setup-task"] input').fill('Stretch');
      await app.setup.getByRole('button', { name: tx('common.add'), exact: true }).click();
      await expect(app.setupTask('Stretch')).toHaveAttribute('aria-pressed', 'true');
      await app.setupGo(6);
    });

    await test.step('afternoon and night as they are', async () => {
      await expect(app.setup.locator('h1')).toContainText(tx('modes.afternoon.title').toLocaleLowerCase());
      await app.setupGo(7);
      await expect(app.setup.locator('h1')).toContainText(tx('modes.night.title').toLocaleLowerCase());
      await app.setupGo(8);
    });

    await test.step('all set', async () => {
      await expect(app.setup.locator('h1')).toHaveText(tx('setup.done.title', { name: 'Riley' }));
      await expect(app.setupNext).toHaveText(tx('setup.done.go'));
      await app.setupNext.click();
      await expect(app.setup).toHaveCount(0);
      await expect(app.nav).toBeVisible();
      await expect(page.locator('.nav-btn[data-tab="today"]')).toHaveClass(/\bon\b/);
    });

    const check = async () => {
      expect(await app.taskLabels()).toEqual([...MORNING.filter((_, i) => i !== 1), 'Stretch']);
      await expect(page.locator('.nav-btn[data-tab="bo"]')).toHaveAttribute('aria-label', 'Pidge');
      await app.tab('more');
      await expect(page.locator('input[data-key="name"]')).toHaveValue('Riley');
      await expect(page.locator('input[data-key="dogName"]')).toHaveValue('Pidge');
      await expect(page.locator('.pet-choice[data-kind="pigeon"]')).toHaveAttribute('aria-pressed', 'true');
    };
    await test.step('Today and More show the answers', check);
    await test.step('and they survive a reload', async () => {
      await page.reload();
      await check();
    });
  });

  test('closing part way throws the answers away', async ({ app, page }) => {
    await app.openSetup();
    await app.setupGo(2);
    await app.setupInput.fill('Riley');
    await app.setupGo(3);
    await app.setup.locator('.pet-choice[data-kind="rat"]').click();
    await app.setupClose.click();

    await expect(page.locator('input[data-key="name"]')).toHaveValue(tx('defaults.name'));
    await expect(page.locator('input[data-key="dogName"]')).toHaveValue(tx('defaults.dogName'));
    await expect(page.locator('.pet-choice[data-kind="bo"]')).toHaveAttribute('aria-pressed', 'true');

    // Opening it again starts over from what's saved.
    await page.getByRole('button', { name: tx('settings.setup.button') }).click();
    await expect(app.setupStep).toHaveAttribute('aria-valuenow', '1');
    await app.setupGo(2);
    await expect(app.setupInput).toHaveValue(tx('defaults.name'));
  });

  test('Back keeps what you typed', async ({ app }) => {
    await app.openSetup();
    await app.setupGo(2);
    await app.setupInput.fill('Riley');
    await app.setupGo(3);
    await app.setupBack.click();
    await expect(app.setupStep).toHaveAttribute('aria-valuenow', '2');
    await expect(app.setupInput).toHaveValue('Riley');
  });

  test("a blank name doesn't move on", async ({ app }) => {
    await app.openSetup();
    await app.setupGo(2);
    await app.setupInput.fill('');
    await app.setupNext.click();
    await expect(app.setupStep).toHaveAttribute('aria-valuenow', '2');
  });

  test('tapping straight through changes nothing', async ({ app, page }) => {
    const before = await app.taskLabels();
    await app.openSetup();
    for (let step = 2; step <= 8; step++) await app.setupGo(step);
    await app.setupNext.click();
    await expect(app.setup).toHaveCount(0);
    expect(await app.taskLabels()).toEqual(before);
    await expect(page.locator('.nav-btn[data-tab="bo"]')).toHaveAttribute('aria-label', tx('defaults.dogName'));
  });
});
