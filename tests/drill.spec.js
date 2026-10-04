// @ts-check
const { test, expect, load, isMobile } = require('./fixtures');

const nav = page => ({
  overview: page.locator('#lvl').getByRole('button', { name: 'Overview' }),
  inside: page.locator('#lvl').getByRole('button', { name: 'Inside an incident' }),
});

/** From the timeline: open the wiki incident's card, then press its drill-in button. */
async function drillIn(page) {
  await page.locator('#view [data-inc-row="wikis"]').first().click();
  await expect(page).toHaveURL(/#wikis$/);
  await expect(page.locator('#det-title')).toHaveText(/^18,000 posts/);
  await page.getByRole('button', { name: /Read what the agents wrote/ }).click();
  await expect(nav(page).inside).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/#wikis\/posts\/[^/]+@\d+$/);
  await expect(page.locator('.msg').first()).toBeVisible();
}

test('drill in from the card and out via the Overview nav button', async ({ page }, testInfo) => {
  await load(page);
  await drillIn(page);
  // on phones the selected post opens as a sheet over the page: close it first
  if (isMobile(testInfo)) await page.getByRole('button', { name: 'Close details' }).click();
  await nav(page).overview.click();
  await expect(nav(page).overview).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('tab', { name: /^Timeline/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.msg')).toHaveCount(0);
  // leaving restores the card the reader drilled in from
  await expect(page.locator('#det-title')).toHaveText(/^18,000 posts/);
  await expect(page).toHaveURL(/#wikis$/);
});

test('browser Back steps up one level at a time', async ({ page }) => {
  await load(page);
  await drillIn(page);
  // first Back: the selected post closes, still inside the incident
  await page.goBack();
  await expect(page).toHaveURL(/#wikis\/posts$/);
  await expect(nav(page).inside).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.msg').first()).toBeVisible();
  await expect(page.locator('.msg[aria-selected="true"]')).toHaveCount(0);
  // second Back: the overview
  await page.goBack();
  await expect(nav(page).overview).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#view [data-inc-row]').first()).toBeVisible();
  await expect(page.locator('.msg')).toHaveCount(0);
});
