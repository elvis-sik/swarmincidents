// @ts-check
const { test, expect, load } = require('./fixtures');

test('timeline loads with the stats row, the section nav and the three tabs', async ({ page }) => {
  await load(page);
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('header')).toContainText('Swarm Incidents');
  await expect(page.locator('#stats')).not.toBeEmpty();
  const lvl = page.locator('#lvl');
  await expect(lvl.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'true');
  const tabs = page.locator('#tabs').getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(page.getByRole('tab', { name: /^Timeline/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /^Affected/ })).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('tab', { name: /^Responses/ })).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#view [data-inc-row]').first()).toBeVisible();
});

test('switching tabs updates the hash and the view', async ({ page }) => {
  await load(page);
  await page.getByRole('tab', { name: /^Affected/ }).click();
  await expect(page).toHaveURL(/#affected$/);
  await expect(page.getByRole('tab', { name: /^Affected/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view [data-ent-row]').first()).toBeVisible();

  await page.getByRole('tab', { name: /^Responses/ }).click();
  await expect(page).toHaveURL(/#responses$/);
  await expect(page.locator('#view [data-rsp-row]').first()).toBeVisible();
  await expect(page.locator('#view [data-ent-row]')).toHaveCount(0);

  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(page).not.toHaveURL(/#/);
  await expect(page.locator('#view [data-inc-row]').first()).toBeVisible();
});

test('theme toggle flips data-theme and persists after reload', async ({ page }) => {
  await load(page);
  const html = page.locator('html');
  const dark = await page.evaluate(() => {
    const t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const next = dark ? 'light' : 'dark';
  await page.locator('#theme-btn').click();
  await expect(html).toHaveAttribute('data-theme', next);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(next);
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', next);
  await page.locator('#theme-btn').click();
  await expect(html).toHaveAttribute('data-theme', dark ? 'dark' : 'light');
});
