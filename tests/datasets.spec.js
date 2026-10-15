// @ts-check
const { test, expect, load, siteData } = require('./fixtures');
const D = siteData();
const published = D.incidents.filter(e => e.datasets && e.datasets.length);
const filter = page => page.getByRole('checkbox', { name: 'Dataset available', exact: true });
const rows = page => page.locator('#view [data-inc-row]');
const models = page => page.locator('#bar-r').getByRole('button', { name: /^Models:/ });
async function pickModel(page, name) {
  await models(page).click();
  await page.locator('.pk-pop').getByRole('option', { name: new RegExp('^' + name) }).click();
}

test('published data can be isolated in chart and table, then restored', async ({ page }) => {
  await page.goto('/?tags=all');
  await expect(rows(page)).toHaveCount(D.incidents.length);
  await expect(models(page).locator('.pk-lab')).toHaveCount(0);
  await expect(page.locator('.f-models > .flabel')).toHaveText('Models');
  await filter(page).click();
  await expect(filter(page)).toBeChecked();
  expect(new URL(page.url()).searchParams.get('datasets')).toBe('available');
  expect((await rows(page).evaluateAll(es => es.map(e => e.getAttribute('data-inc-row')))).sort()).toEqual(published.map(e => e.id).sort());
  await expect(rows(page).locator('.data-mark')).toHaveCount(published.length);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(rows(page)).toHaveCount(published.length);
  await expect(rows(page).locator('.data-mark')).toHaveCount(published.length);
  await filter(page).click();
  await expect(rows(page)).toHaveCount(D.incidents.length);
  expect(new URL(page.url()).searchParams.get('tags')).toBe('all');
});

test('availability composes with models, disclosure, confirmation and dates', async ({ page }) => {
  await page.goto('/?tags=all');
  await filter(page).click();
  await pickModel(page, 'Anthropic');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toHaveAttribute('data-inc-row', 'pypi-malware');
  await page.getByRole('checkbox', { name: 'Confirmed by Anthropic', exact: true }).click();
  await expect(rows(page)).toHaveCount(1);
  await page.locator('#foot button[data-filter=research]').click();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#view')).toContainText('No incidents match these filters.');
  await page.locator('#foot button[data-filter=research]').click();
  await page.getByRole('group', { name: 'Date range', exact: true }).getByRole('button', { name: '30 days', exact: true }).click();
  await expect(rows(page)).toHaveCount(0);
  await page.getByRole('group', { name: 'Date range', exact: true }).getByRole('button', { name: 'All', exact: true }).click();
  await expect(rows(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('models')).toBe('anthropic');
  expect(new URL(page.url()).searchParams.get('datasets')).toBe('available');
});

test('availability survives a tab round-trip and shareable links survive reload', async ({ page }) => {
  await page.goto('/?tags=all&models=openai&datasets=available#hugging-face');
  await expect(page.locator('#det-title')).toHaveText('Hugging Face breached during an evaluation');
  await expect(page.locator('#det .dataset-section')).toContainText('not complete agent transcripts');
  await expect(rows(page)).toHaveCount(published.filter(e => e.labs.includes('openai')).length);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /^Affected/ }).click();
  await expect(filter(page)).toHaveCount(0);
  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(filter(page)).toBeChecked();
  await page.reload();
  await expect(filter(page)).toBeChecked();
  await expect(models(page)).toHaveAccessibleName('Models: OpenAI');
});

test('cards expose correct publisher links and scope notes without labeling ordinary sources as datasets', async ({ page }) => {
  await load(page, 'wikis');
  await expect(page.locator('#det .dataset-tag')).toHaveText('Dataset available');
  const section = page.getByRole('region', { name: 'Research data', exact: true });
  await expect(section.getByRole('link', { name: 'Wiki edit histories and events', exact: true })).toHaveAttribute('href', 'https://collusion.wiki/explorer/download');
  await expect(section.getByRole('link', { name: 'Download dataset ↗', exact: true })).toHaveAttribute('href', 'https://collusion.wiki/explorer/download/full-wiki-logs.zip');
  await expect(section).toContainText('Labels do not establish unique agents.');
  await load(page, 'dns-chatbot');
  await expect(page.locator('#det-title')).toHaveText('DNS tunnel to an outside chatbot');
  await expect(page.locator('#det .dataset-section')).toHaveCount(0);
  await expect(page.locator('#det .dataset-tag')).toHaveCount(0);
});

test('filter controls stay visible and retain focus when toggled from the keyboard', async ({ page }) => {
  await page.goto('/?tags=all');
  await filter(page).focus();
  await page.keyboard.press('Space');
  await expect(filter(page)).toBeChecked();
  await expect(filter(page)).toBeFocused();
  const measurements = await page.locator('#filters').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  expect(measurements.scroll).toBeLessThanOrEqual(measurements.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('compact affected and response pickers filter their own views without losing the dataset selection', async ({ page }) => {
  await page.goto('/?tags=all');
  await filter(page).click();
  await page.getByRole('tab', { name: /^Affected/ }).click();
  await page.getByRole('button', { name: 'Type: All', exact: true }).click();
  await page.locator('.pk-pop').getByRole('option', { name: /^Government/ }).click();
  await expect(page.locator('#view [data-ent-row]')).toHaveCount(D.affected.filter(a => a.kind === 'gov').length);
  await page.getByRole('tab', { name: /^Responses/ }).click();
  await page.getByRole('button', { name: 'Response from: Anyone', exact: true }).click();
  await page.locator('.pk-pop').getByRole('option', { name: 'Governments', exact: true }).click();
  await expect(page.locator('#view [data-rsp-row]')).toHaveCount(D.responses.filter(r => r.who === 'gov').length);
  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(filter(page)).toBeChecked();
  await expect(rows(page)).toHaveCount(published.length);
});
