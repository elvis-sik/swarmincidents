// @ts-check
const { test, expect, load, siteData } = require('./fixtures');

// This card has an Oct 7 catalog listing, an earlier incident disclosure, and an Oct 23 update.
// Its provenance must survive reload and remain distinct from both other dates.
test('incident card exposes original catalog addition with honest provenance', async ({ page }) => {
  await load(page, 'aisi-cyber-range');
  const meta = page.locator('#det .catalog-added');
  await expect(meta).toHaveText('Added to catalog Oct 7, 2026 (approx.)');
  await expect(meta.locator('time')).toHaveAttribute('datetime', '2026-10-07');
  await expect(meta.getByRole('link')).toHaveAttribute('href', 'updates.html#history-ecff960-aisi-cyber-range');
  await expect(meta.getByRole('link')).toHaveAccessibleName(/not a verified deployment date/);
  await page.reload();
  await expect(meta).toHaveText('Added to catalog Oct 7, 2026 (approx.)');
  const bounds = await meta.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  await meta.getByRole('link').click();
  await expect(page).toHaveURL(/updates\.html#history-ecff960-aisi-cyber-range$/);
  await expect(page.locator('#update-dialog')).toContainText('New listings');
  await expect(page.locator('#update-dialog')).toContainText('Reconstructed history');
  await expect(page.locator('#update-dialog')).toContainText('commit date, not a verified deployment time');
  await expect(page.locator('#det-title')).toHaveText('UK AISI cyber test: agents target a GitHub project');
});

test('recorded publication date needs no approximate qualifier', async ({ page }) => {
  const data = siteData();
  const e = data.incidents.find(e => data.catalogAdded[e.id] && !data.catalogAdded[e.id].reconstructed);
  await load(page, e.id);
  const meta = page.locator('#det .catalog-added');
  await expect(meta.locator('time')).toHaveAttribute('datetime', data.catalogAdded[e.id].date);
  await expect(meta).not.toContainText('approx.');
  await expect(meta.getByRole('link')).toHaveAttribute('href', 'updates.html#' + data.catalogAdded[e.id].update);
});
