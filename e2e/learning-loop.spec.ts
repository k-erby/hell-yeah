import { tn, tx } from '../src/lib/i18n';
import { expect, test } from './fixtures';

// Labels come from src/text, so rewording a button there doesn't break these tests.
const CRAFT = tx('branches.craft.label');
const MIND = tx('branches.mind.label');
const PRACTICED = tx('methods.practiced');
const DAY_ONE = tx('skillLevels.dayOne');
const NOTHING = tx('learn.nothingSpecific');
const EMPTY_TREE = tx('tree.empty');
const rx = (s: string) => new RegExp(s.split('{')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim());

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
    await expect(page.getByText(EMPTY_TREE)).toBeVisible();
    await expect(app.tree.locator('g.node')).toHaveCount(0);
    await expect(app.tree.locator('path.branch.grown')).toHaveCount(0);
  });

  await test.step('plant a CRAFT skill', async () => {
    await app.tab('learn');
    const form = page.locator('form[data-form="skill"]');
    await form.locator('input[name="name"]').fill(SKILL);
    await app.chip(form, CRAFT);
    await form.getByRole('button', { name: tx('learn.plant.button') }).click();

    // Skill card
    await expect(app.skillCard.locator('h2')).toHaveText(SKILL);
    await expect(app.skillCard.locator('.eyebrow')).toHaveText(tx('learn.skill.eyebrow', { branch: CRAFT }));
    await expect(app.skillCard.locator('.badge')).toHaveText(DAY_ONE);
    await expect(app.skillCard.locator('.lvl.cur')).toContainText(DAY_ONE);
    await expect(app.skillCard.locator('.fuel-head')).toContainText(tn('learn.skill.learnedCount', 0));
    await expect(app.skillCard.getByRole('button', { name: rx(tx('learn.skill.levelUp', { next: tx('skillLevels.gettingIt') })) })).toBeVisible();

    // Daily form now offers the skill, with "Nothing specific" first and the skill picked by default
    const options = app.dailyForm.locator('label.chip-radio', { has: page.locator('input[name="skillId"]') });
    await expect(options.first()).toHaveText(NOTHING);
    await expect(app.dailyForm.locator('input[name="skillId"]:checked')).toHaveValue(/.+/);
    await expect(app.dailyForm.locator('label.chip-radio', { has: page.locator('input[name="skillId"]:checked') })).toHaveText(SKILL);

    // Tree
    await app.tab('tree');
    await expect(page.getByText(EMPTY_TREE)).toHaveCount(0);
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
    await expect(app.detail.locator('.badge')).toHaveText(DAY_ONE);
    await expect(app.stat(1)).toHaveText('0');
    await expect(app.stat(2)).toHaveText('0');
  });

  await test.step('log a daily learning for the skill', async () => {
    await app.tab('learn');
    await app.dailyForm.locator('textarea[name="text"]').fill(LEARNED);
    await app.dailyForm.getByRole('button', { name: rx(tx('learn.daily.button')) }).click();

    await expect(app.dailyCard.locator('.badge')).toHaveText(tx('common.done'));
    await expect(app.dailyCard.locator('.entry')).toHaveCount(1);
    await expect(app.dailyCard.locator('.entry')).toContainText(LEARNED);
    await expect(app.dailyCard.locator('.entry .entry-tag')).toHaveText(CRAFT);

    await expect(app.skillCard.locator('.fuel-head')).toContainText(tn('learn.skill.learnedCount', 1));
    await expect(app.skillCard.locator('.fuel .history li')).toHaveCount(1);
    await expect(app.skillCard.locator('.fuel .history')).toContainText(LEARNED);

    await app.tab('tree');
    await expect(app.tree.locator('.leaf')).toHaveCount(1);
    await expect(app.tree.locator('.bud')).toHaveCount(0);
    await app.openSkill(SKILL);
    await expect(app.stat(1)).toHaveText('1');
    await expect(app.detail.locator('.history li')).toHaveCount(1);
    await expect(app.detail.locator('.history li').first()).toContainText(LEARNED);
    await expect(app.detail.locator('.lock-in')).toHaveCount(0);
  });

  await test.step('log a general learning that is not for the skill', async () => {
    await app.tab('learn');
    await app.dailyForm.locator('textarea[name="text"]').fill(GENERAL);
    await app.chip(app.dailyForm, NOTHING);
    await app.chip(app.dailyForm, MIND);
    await app.dailyForm.getByRole('button', { name: tx('learn.daily.buttonAgain') }).click();

    await expect(app.dailyCard.locator('.entry')).toHaveCount(2);
    await expect(app.dailyCard.locator('.entry', { hasText: GENERAL }).locator('.entry-tag')).toHaveText(MIND);
    // The skill card only shows what was for the skill
    await expect(app.skillCard.locator('.fuel-head')).toContainText(tn('learn.skill.learnedCount', 1));
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
    await app.chip(app.weeklyForm, PRACTICED);
    await app.weeklyForm.locator('textarea[name="text"]').fill(LOCKED);
    await expect(app.weeklyForm.locator('label.chip-radio', { has: page.locator('input[name="skillId"]:checked') })).toHaveText(SKILL);
    await app.weeklyForm.getByRole('button', { name: rx(tx('learn.weekly.button')) }).click();

    // Celebration modal, then dismiss it
    const modal = page.locator('.modal');
    await expect(modal).toContainText(tx('celebrate.weekTitle'));
    await modal.getByRole('button').click();
    await expect(modal).toHaveCount(0);

    await expect(app.weeklyForm).toHaveCount(0);
    await expect(app.weeklyCard.locator('h2')).toHaveText(tx('learn.weekly.doneHeading'));
    await expect(app.weeklyCard.locator('.badge')).toHaveText(tx('common.done'));
    await expect(app.weeklyCard.locator('.entry')).toContainText(LOCKED);
    await expect(app.weeklyCard.locator('.entry-tag')).toHaveText(PRACTICED);

    await app.tab('tree');
    await expect(app.tree.locator('.diamond')).toHaveCount(1);
    await app.openSkill(SKILL);
    await expect(app.stat(2)).toHaveText('1');
    await expect(app.stat(1)).toHaveText('1');

    // The lock-in is folded under the learning it came from, not floating on its own
    const learnedRow = app.detail.locator('.history li', { hasText: LEARNED });
    await expect(learnedRow.locator('.lock-in')).toHaveCount(1);
    await expect(learnedRow.locator('.lock-in')).toContainText(LOCKED);
    await expect(learnedRow.locator('.lock-in .entry-tag')).toHaveText(tx('tree.detail.lockInTag', { method: PRACTICED }));
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
