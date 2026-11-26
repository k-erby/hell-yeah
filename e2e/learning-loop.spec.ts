import { expect, test } from './fixtures';

/**
 * The core loop: plant a skill → log a daily learning → lock one in for the week.
 * After every step we check the Learn cards AND the skill tree, since the tree is
 * where bugs have hidden before (e.g. the CRAFT branch vanishing).
 */
test('plant a skill, learn something, lock it in', async ({ app, page }) => {
  const SKILL = 'Watercolour';
  const LEARNED = 'Wet-on-wet bleeds, wet-on-dry gives hard edges';
  const GENERAL = 'Octopuses have three hearts';
  const LOCKED = 'Painted a sunset both ways and compared';

  await test.step('fresh tree is empty', async () => {
    await app.tab('tree');
    await expect(page.getByText('Nothing planted yet.')).toBeVisible();
    await expect(app.tree.locator('g.node')).toHaveCount(0);
    await expect(app.tree.locator('path.branch.grown')).toHaveCount(0);
  });

  await test.step('plant a CRAFT skill', async () => {
    await app.tab('learn');
    const form = page.locator('form[data-form="skill"]');
    await form.locator('input[name="name"]').fill(SKILL);
    await app.chip(form, 'Craft');
    await form.getByRole('button', { name: 'Plant it' }).click();

    // Skill card
    await expect(app.skillCard.locator('h2')).toHaveText(SKILL);
    await expect(app.skillCard.locator('.eyebrow')).toHaveText("This month's skill · Craft");
    await expect(app.skillCard.locator('.badge')).toHaveText('Day one');
    await expect(app.skillCard.locator('.lvl.cur')).toContainText('Day one');
    await expect(app.skillCard.locator('.fuel-head')).toContainText('0 things');
    await expect(app.skillCard.getByRole('button', { name: /Level up → Getting it/ })).toBeVisible();

    // Daily form now offers the skill, with "Nothing specific" first and the skill picked by default
    const options = app.dailyForm.locator('label.chip-radio', { has: page.locator('input[name="skillId"]') });
    await expect(options.first()).toHaveText('Nothing specific');
    await expect(app.dailyForm.locator('input[name="skillId"]:checked')).toHaveValue(/.+/);
    await expect(app.dailyForm.locator('label.chip-radio', { has: page.locator('input[name="skillId"]:checked') })).toHaveText(SKILL);

    // Tree
    await app.tab('tree');
    await expect(page.getByText('Nothing planted yet.')).toHaveCount(0);
    await expect(app.node(SKILL)).toHaveCount(1);
    await expect(app.tree.locator('path.branch.grown')).toHaveCount(1);
    await expect(app.branch('craft')).toHaveClass(/grown/);
    await expect(app.branchLabel('craft')).toHaveClass(/grown/);
    // CRAFT must grow out of the top of the trunk (regression: it used to render detached).
    await expect(app.branch('craft')).toHaveAttribute('d', /^M180 300 /);
    await expect(app.branch('craft')).toHaveCSS('stroke', /url\(.*#gold-b/);
    await expect(app.tree.locator('.leaf')).toHaveCount(0);
    await expect(app.tree.locator('.diamond')).toHaveCount(0);

    await app.openSkill(SKILL);
    await expect(app.detail.locator('.badge')).toHaveText('Day one');
    await expect(app.stat('things learned')).toHaveText('0');
    await expect(app.stat('locked in')).toHaveText('0');
  });

  await test.step('log a daily learning for the skill', async () => {
    await app.tab('learn');
    await app.dailyForm.locator('textarea[name="text"]').fill(LEARNED);
    await app.dailyForm.getByRole('button', { name: /Log it/ }).click();

    await expect(app.dailyCard.locator('.badge')).toHaveText('Done');
    await expect(app.dailyCard.locator('.entry')).toHaveCount(1);
    await expect(app.dailyCard.locator('.entry')).toContainText(LEARNED);
    await expect(app.dailyCard.locator('.entry .entry-tag')).toHaveText('Craft');

    await expect(app.skillCard.locator('.fuel-head')).toContainText('1 thing');
    await expect(app.skillCard.locator('.fuel .history li')).toHaveCount(1);
    await expect(app.skillCard.locator('.fuel .history')).toContainText(LEARNED);

    await app.tab('tree');
    await expect(app.tree.locator('.leaf')).toHaveCount(1);
    await expect(app.tree.locator('.bud')).toHaveCount(0);
    await app.openSkill(SKILL);
    await expect(app.stat('things learned')).toHaveText('1');
    await expect(app.detail.locator('.history li')).toHaveCount(1);
    await expect(app.detail.locator('.history li').first()).toContainText(LEARNED);
    await expect(app.detail.locator('.lock-in')).toHaveCount(0);
  });

  await test.step('log a general learning that is not for the skill', async () => {
    await app.tab('learn');
    await app.dailyForm.locator('textarea[name="text"]').fill(GENERAL);
    await app.chip(app.dailyForm, 'Nothing specific');
    await app.chip(app.dailyForm, 'Mind');
    await app.dailyForm.getByRole('button', { name: /Log another/ }).click();

    await expect(app.dailyCard.locator('.entry')).toHaveCount(2);
    await expect(app.dailyCard.locator('.entry', { hasText: GENERAL }).locator('.entry-tag')).toHaveText('Mind');
    // The skill card only shows what was for the skill
    await expect(app.skillCard.locator('.fuel-head')).toContainText('1 thing');
    await expect(app.skillCard.locator('.fuel .history')).not.toContainText(GENERAL);

    await app.tab('tree');
    await expect(app.tree.locator('.leaf')).toHaveCount(1); // still one leaf on the skill
    await expect(app.tree.locator('.bud')).toHaveCount(1); // the general one is a bud on MIND
    await expect(app.branch('mind')).not.toHaveClass(/grown/); // buds don't grow a branch, skills do
  });

  await test.step('lock in the skill learning for the week', async () => {
    await app.tab('learn');
    await expect(app.weeklyForm.locator('label.pick')).toHaveCount(2);
    await app.weeklyForm.locator('label.pick', { hasText: LEARNED }).click();
    await app.chip(app.weeklyForm, 'Practiced it');
    await app.weeklyForm.locator('textarea[name="text"]').fill(LOCKED);
    await expect(app.weeklyForm.locator('label.chip-radio', { has: page.locator('input[name="skillId"]:checked') })).toHaveText(SKILL);
    await app.weeklyForm.getByRole('button', { name: /Lock it in/ }).click();

    // Celebration modal, then dismiss it
    const modal = page.locator('.modal');
    await expect(modal).toContainText('Solidified.');
    await modal.getByRole('button').click();
    await expect(modal).toHaveCount(0);

    await expect(app.weeklyForm).toHaveCount(0);
    await expect(app.weeklyCard.locator('h2')).toHaveText('Locked in');
    await expect(app.weeklyCard.locator('.badge')).toHaveText('Done');
    await expect(app.weeklyCard.locator('.entry')).toContainText(LOCKED);
    await expect(app.weeklyCard.locator('.entry-tag')).toHaveText('Practiced it');

    await app.tab('tree');
    await expect(app.tree.locator('.diamond')).toHaveCount(1);
    await app.openSkill(SKILL);
    await expect(app.stat('locked in')).toHaveText('1');
    await expect(app.stat('things learned')).toHaveText('1');

    // The lock-in is folded under the learning it came from, not floating on its own
    const learnedRow = app.detail.locator('.history li', { hasText: LEARNED });
    await expect(learnedRow.locator('.lock-in')).toHaveCount(1);
    await expect(learnedRow.locator('.lock-in')).toContainText(LOCKED);
    await expect(learnedRow.locator('.lock-in .entry-tag')).toHaveText('Locked in · Practiced it');
    await expect(app.detail.locator(':scope > .entry')).toHaveCount(0);
  });

  await test.step('everything survives a reload', async () => {
    await page.reload();
    await app.tab('tree');
    await expect(app.node(SKILL)).toHaveCount(1);
    await expect(app.tree.locator('.leaf')).toHaveCount(1);
    await expect(app.tree.locator('.bud')).toHaveCount(1);
    await expect(app.tree.locator('.diamond')).toHaveCount(1);
    await app.openSkill(SKILL);
    await expect(app.detail.locator('.lock-in')).toContainText(LOCKED);
  });
});
