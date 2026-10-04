// @ts-check
const { test, expect, load, isMobile } = require('./fixtures');

test.beforeEach(({}, testInfo) => test.skip(!isMobile(testInfo), 'phone projects only'));

const noHorizontalScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('the card opens as a bottom sheet and closes', async ({ page }) => {
  await load(page);
  await page.locator('#view [data-inc-row]').first().click();
  const pane = page.locator('#pane');
  await expect(pane).toHaveClass(/\bopen\b/);
  await expect(page.locator('#det')).toBeVisible();
  await expect(page.locator('#det-title')).toBeVisible();
  // a bottom sheet: it reaches the bottom of the viewport and does not start at the top
  const box = await pane.boundingBox();
  const vh = await page.evaluate(() => innerHeight);
  expect(box).not.toBeNull();
  if (box) { expect(box.y + box.height).toBeGreaterThanOrEqual(vh - 2); expect(box.y).toBeGreaterThan(0); }
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(pane).not.toHaveClass(/\bopen\b/);
  await expect(page.locator('#det')).toBeHidden();
});

for (const hash of ['', 'affected', 'responses', 'inside', 'wikis/posts']) {
  test(`nav and tabs fit without horizontal scroll (#${hash || 'timeline'})`, async ({ page }) => {
    await load(page, hash);
    if (hash === 'inside') await expect(page.locator('#view table.chooser')).toBeVisible();
    else await expect(page.locator('#tabs [role=tab]').first()).toBeVisible();
    if (hash === 'wikis/posts') await expect(page.locator('.msg').first()).toBeVisible();
    for (const sel of ['#lvl', '#tabs']) {
      const box = await page.locator(sel).boundingBox();
      const vw = await page.evaluate(() => innerWidth);
      expect(box, sel).not.toBeNull();
      if (box) expect(box.x + box.width, `${sel} right edge`).toBeLessThanOrEqual(vw + 1);
    }
    expect(await noHorizontalScroll(page)).toBe(true);
  });
}
