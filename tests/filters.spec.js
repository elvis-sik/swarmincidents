// @ts-check
const { test, expect, load, isMobile } = require('./fixtures');

const incPicker = page => page.locator('#filters').getByRole('button', { name: /^Incident:/ });

test('a picker filter on Affected survives a tab round-trip', async ({ page }) => {
  await load(page, 'affected');
  const count0 = await page.locator('#view [data-ent-row]').count();
  await incPicker(page).click();
  const pop = page.locator('.pk-pop');
  await expect(pop.getByRole('listbox')).toBeVisible();
  await pop.getByRole('combobox').fill('German wiki');
  await pop.getByRole('option', { name: /German wiki used as a back channel/ }).click();
  await expect(pop).toHaveCount(0);
  await expect(incPicker(page)).toHaveAccessibleName(/^Incident: German wiki used as a back channel/);
  const count1 = await page.locator('#view [data-ent-row]').count();
  expect(count1).toBeGreaterThan(0);
  expect(count1).toBeLessThan(count0);

  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(page.locator('#view [data-inc-row]').first()).toBeVisible();
  await page.getByRole('tab', { name: /^Affected/ }).click();
  await expect(incPicker(page)).toHaveAccessibleName(/^Incident: German wiki used as a back channel/);
  await expect(page.locator('#view [data-ent-row]')).toHaveCount(count1);
});

test('scroll position is restored after a tab round-trip', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), 'desktop layout only');
  await load(page, 'affected');
  await expect(page.locator('#view [data-ent-row]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeGreaterThan(1500);
  await page.evaluate(() => scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1100);
  const y = await page.evaluate(() => scrollY);
  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(page.getByRole('tab', { name: /^Timeline/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /^Affected/ }).click();
  await expect(page.getByRole('tab', { name: /^Affected/ })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y - 30);
  expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(30);
});

test.describe('picker keyboard', () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobile(testInfo), 'keyboard interaction is a desktop concern'));

  test('Enter opens, ArrowDown moves, Enter picks; ARIA roles are right', async ({ page }) => {
    await load(page, 'affected');
    const btn = incPicker(page);
    await expect(btn).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    const pop = page.locator('.pk-pop');
    const list = pop.getByRole('listbox');
    await expect(list).toBeVisible();
    await expect(list).toHaveAttribute('id', /** @type {string} */ (await btn.getAttribute('aria-controls')));
    const search = pop.getByRole('combobox');
    await expect(search).toBeFocused();
    await expect(search).toHaveAttribute('aria-controls', /** @type {string} */ (await btn.getAttribute('aria-controls')));
    expect(await list.getByRole('option').count()).toBeGreaterThan(2);
    await expect(list.getByRole('option', { selected: true })).toHaveText(/^All/);

    const first = await search.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    const second = await search.getAttribute('aria-activedescendant');
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    const label = (await page.locator('#' + second).locator('.pk-txt').innerText()).trim();
    await page.keyboard.press('Enter');
    await expect(pop).toHaveCount(0);
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toHaveAccessibleName('Incident: ' + label);
    // Not asserted: focus after a pick. The filter row re-renders on pick, so the focused button is replaced.
  });

  test('Space opens and Escape closes, returning focus', async ({ page }) => {
    await load(page, 'affected');
    const btn = incPicker(page);
    await btn.focus();
    await page.keyboard.press(' ');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.pk-pop').getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.pk-pop')).toHaveCount(0);
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toBeFocused();
    await expect(btn).toHaveAccessibleName('Incident: All');
  });
});
