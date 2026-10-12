// @ts-check
// The model filter: every developer's incidents (the default) or one developer's, switched in place and kept in the URL.
const { test, expect, load, siteData } = require('./fixtures');

const D = siteData();
const labsOf = e => e.labs || ['openai'];
/** Tab counts for one developer, by the site's scope rules (or for everyone when lab is null). */
function counts(lab) {
  if (!lab) return { Timeline: D.incidents.length, Affected: D.affected.length, Responses: D.responses.length };
  const ids = new Set(D.incidents.filter(e => labsOf(e).includes(lab)).map(e => e.id));
  const inScope = r => {
    const inc = r.inc || [], labs = r.labs || [], who = r.who === 'openai' ? 'lab' : r.who, from = r.who === 'openai' ? 'openai' : r.lab;
    return inc.some(i => ids.has(i)) || labs.includes(lab) || (who === 'lab' && from === lab) || (!inc.length && !labs.length && who !== 'lab');
  };
  return { Timeline: ids.size, Affected: D.affected.filter(a => a.inv.some(v => ids.has(v.inc))).length, Responses: D.responses.filter(inScope).length };
}
const models = page => page.locator('#bar-r').getByRole('button', { name: /^Models:/ });
async function expectCounts(page, n) {
  for (const [tab, k] of Object.entries(n)) await expect(page.getByRole('tab', { name: new RegExp('^' + tab) }).locator('.n')).toHaveText(String(k));
}
async function pickModels(page, label) {
  await models(page).click();
  await page.locator('.pk-pop').getByRole('option', { name: new RegExp('^' + label) }).click();
  await expect(page.locator('.pk-pop')).toHaveCount(0);
}

test('the default scope is All developers and the URL has no query', async ({ page }) => {
  await load(page);
  await expect(models(page)).toHaveAccessibleName('Models: All developers');
  expect(new URL(page.url()).search).toBe('');
  await expectCounts(page, counts(null));
  await expect(page.locator('header .tagline')).toHaveText('AI agent incidents, with sources');
  // general wording for every developer
  await expect(page.locator('#filters')).toContainText('Confirmed by the developer');
});

test('switching to OpenAI updates the tab counts without a reload', async ({ page }) => {
  await load(page);
  await page.evaluate(() => { /** @type {any} */ (window).__sameDocument = true; });
  await pickModels(page, 'OpenAI');
  await expect(models(page)).toHaveAccessibleName('Models: OpenAI');
  await expect(page).toHaveURL(/\?models=openai$/);
  await expectCounts(page, counts('openai'));
  expect(await page.evaluate(() => /** @type {any} */ (window).__sameDocument)).toBe(true);
  await expect(page.locator('#filters')).toContainText('Confirmed by OpenAI');
  // and back: the default scope leaves no query behind
  await pickModels(page, 'All developers');
  await expect(models(page)).toHaveAccessibleName('Models: All developers');
  expect(new URL(page.url()).search).toBe('');
  await expectCounts(page, counts(null));
  expect(await page.evaluate(() => /** @type {any} */ (window).__sameDocument)).toBe(true);
});

test('?models=openai opens with one developer, and a hash keeps the query', async ({ page }) => {
  await page.goto('/?models=openai#affected');
  await expect(models(page)).toHaveAccessibleName('Models: OpenAI');
  await expect(page.getByRole('tab', { name: /^Affected/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(page).toHaveURL(/\/\?models=openai$/);
});

test('an old ?models=all link opens with every developer and drops the query', async ({ page }) => {
  await page.goto('/?models=all#affected');
  await expect(models(page)).toHaveAccessibleName('Models: All developers');
  await expect(page.getByRole('tab', { name: /^Affected/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /^Timeline/ }).click();
  expect(new URL(page.url()).search).toBe('');
});

test('a deep link to an incident outside the scope switches to All developers', async ({ page }) => {
  const other = D.incidents.find(e => !labsOf(e).includes('openai'));
  test.skip(Object.keys(D.labs || { openai: 1 }).length < 2 || !other, 'the data has incidents from one developer only');
  if (!other) return;
  await page.goto('/?models=openai#' + other.id);
  await expect(page.locator('#det-title')).toHaveText(other.title);
  await expect(models(page)).toHaveAccessibleName('Models: All developers');
  await expect(page).toHaveURL(new RegExp(`/#${other.id}$`));
  expect(new URL(page.url()).search).toBe('');
});
