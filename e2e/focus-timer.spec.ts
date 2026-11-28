import { tx } from '../src/lib/i18n';
import { expect, NOW, test } from './fixtures';

/**
 * The focus timer on Today: pick a length, stop it, let it run out.
 * The clock is frozen (see fixtures.ts), so a fresh timer always reads exactly 5:00 / 15:00 / 25:00,
 * and "time's up" is reached by moving the frozen clock forward.
 */

test.describe('focus timer', () => {
  test('each length starts a timer for that long, on the right task', async ({ app, page }) => {
    // A different task each time, so the icon check proves it follows the task you picked.
    for (const [task, minutes] of [[0, 5], [1, 15], [2, 25]] as const) {
      await test.step(`${minutes} minutes on task ${task + 1}`, async () => {
        await app.startTimer(task, minutes);
        await expect(app.focusBar.locator('.eyebrow')).toHaveText(tx('focus.eyebrow', { n: minutes }));
        await expect(app.focusBar.locator('.focus-time')).toHaveText(`${minutes}:00`);
        await expect(app.focusBar.locator('.focus-task')).toHaveText(await app.task(task).locator('.label').innerText());
        await expect(app.checkbox(task)).toHaveClass(/\bfocusing\b/);

        // The timer icon sits on that task, and only that task.
        await expect(app.checkbox(task).locator('.stopwatch')).toBeVisible();
        await expect(page.locator('.checks button.check .stopwatch')).toHaveCount(1);
        await expect(page.locator('.checks button.check.focusing')).toHaveCount(1);

        await app.focusBar.getByRole('button', { name: tx('focus.stop') }).click();
        await expect(app.focusBar).toHaveCount(0);
        await expect(page.locator('.checks button.check .stopwatch')).toHaveCount(0);
      });
    }
  });

  test('5 minutes is the highlighted default', async ({ app }) => {
    await app.timerButton(0).click();
    const lengths = app.lengthPicker.locator('[data-action="focus-start"]');
    await expect(lengths).toHaveText([5, 15, 25].map((n) => tx('focus.minutes', { n })));
    await expect(lengths.first()).toHaveClass(/\bprimary\b/);
  });

  test('cancelling never ticks the task off', async ({ app, page }) => {
    await test.step('closing the length picker', async () => {
      await app.timerButton(0).click();
      await expect(app.lengthPicker).toBeVisible();
      await app.lengthPicker.getByRole('button', { name: tx('focus.cancel') }).click();
      await expect(app.lengthPicker).toHaveCount(0);
      await expect(app.focusBar).toHaveCount(0);
      await expect(app.checkbox(0)).toHaveAttribute('aria-pressed', 'false');
    });

    await test.step('stopping a running timer', async () => {
      await app.startTimer(0, 15);
      await app.focusBar.getByRole('button', { name: tx('focus.stop') }).click();
      await expect(app.focusBar).toHaveCount(0);
      await expect(app.checkbox(0)).toHaveAttribute('aria-pressed', 'false');
      await expect(app.checkbox(0)).not.toHaveClass(/\bfocusing\b/);
      // The stopwatch is back, ready for another go.
      await expect(app.timerButton(0)).toBeVisible();
    });

    await test.step('"Not yet" when time is up', async () => {
      await app.startTimer(0, 5);
      await page.clock.setFixedTime(NOW.getTime() + 5 * 60_000 + 1000);
      await expect(app.focusBar).toHaveClass(/\bover\b/);
      await app.focusBar.getByRole('button', { name: tx('focus.notYet') }).click();
      await expect(app.focusBar).toHaveCount(0);
      await expect(app.checkbox(0)).toHaveAttribute('aria-pressed', 'false');
    });

    await test.step('still unchecked after a reload', async () => {
      await page.reload();
      await expect(app.checkbox(0)).toHaveAttribute('aria-pressed', 'false');
      await expect(app.focusBar).toHaveCount(0);
    });
  });

  test("can't start a second timer while one is running", async ({ app, page }) => {
    await app.startTimer(0, 25);

    await test.step('no stopwatch on any task in this routine', async () => {
      await expect(app.timerButtons).toHaveCount(0);
      await expect(app.lengthPicker).toHaveCount(0);
    });

    await test.step('or in the other routines', async () => {
      for (const mode of ['afternoon', 'night'] as const) {
        await page.locator(`.seg-btn[data-mode="${mode}"]`).click();
        await expect(page.locator(`.seg-btn[data-mode="${mode}"]`)).toHaveClass(/\bon\b/);
        await expect(app.tasks.first()).toBeVisible();
        await expect(app.timerButtons).toHaveCount(0);
        // The running timer stays on screen whichever routine you're looking at.
        await expect(app.focusBar.locator('.eyebrow')).toHaveText(tx('focus.eyebrow', { n: 25 }));
      }
    });

    await test.step('or after a reload', async () => {
      await page.reload();
      await expect(app.focusBar).toBeVisible();
      await expect(app.timerButtons).toHaveCount(0);
    });

    await test.step('stopwatches come back once it stops', async () => {
      await app.focusBar.getByRole('button', { name: tx('focus.stop') }).click();
      await expect(app.timerButtons.first()).toBeVisible();
    });
  });
});
