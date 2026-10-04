// @ts-check
// Screenshot baselines, Linux only: generated and checked inside the Playwright Docker image (see README, Testing).
// Run with VISUAL=1; plain `npx playwright test` skips them. Data-driven text (dates, counts) is masked; the
// incident card is never captured, since its contents change with the data.
const { test, expect, load } = require('./fixtures');

test.describe('visual @visual', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!['chromium', 'Pixel 7'].includes(testInfo.project.name), 'baselines only for Chromium desktop and Pixel 7');
    test.skip(process.platform !== 'linux', 'baselines are Linux renders');
  });

  const settle = async page => {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
  };
  const data = page => [page.locator('#meta'), page.locator('#ver'), page.locator('#stats'), page.locator('#count'),
    page.locator('#tabs .n'), page.locator('#foot .lg', { hasText: /^Updated/ })];
  const mask = page => [...data(page), page.locator('#view')];

  test('overview header, nav, tabs and filters', async ({ page }) => {
    await load(page);
    await expect(page.locator('#view [data-inc-row]').first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('overview.png', { mask: mask(page) });
  });

  test('affected tab chrome', async ({ page }) => {
    await load(page, 'affected');
    await expect(page.locator('#view [data-ent-row]').first()).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('affected.png', { mask: mask(page) });
  });

  test('inside the wiki incident: posts', async ({ page }) => {
    await load(page, 'wikis/posts');
    await expect(page.locator('.msg').first()).toBeVisible();
    await settle(page);
    // the posts themselves, but not the details pane (desktop) or sheet (phone)
    await expect(page).toHaveScreenshot('wiki-posts.png', { mask: [...data(page), page.locator('#pane')] });
  });
});
