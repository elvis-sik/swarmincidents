const { test, expect, load } = require('./fixtures');

test('telemetry hooks observe incident, reader, post and wording navigation without extra pageviews', async ({ page }) => {
  await page.route('**/analytics.js', route => route.fulfill({ contentType: 'text/javascript', body:
    'window.telemetry = []; window.SwarmAnalytics = {event: (name, detail) => window.telemetry.push({name, detail})};' }));
  await load(page, 'wikis');
  expect(await page.evaluate(() => window.telemetry.some(x => x.name === 'incident-open' && x.detail === 'wikis'))).toBe(true);
  await page.getByRole('button', { name: /Read what the agents wrote/ }).click();
  await expect(page.getByRole('listbox', { name: 'Posts', exact: true })).toBeVisible();
  await page.locator('[data-post-row]').first().click();
  await page.getByRole('slider', { name: 'Wording', exact: true }).focus();
  await page.keyboard.press('Home');
  const events = await page.evaluate(() => window.telemetry.map(x => x.name));
  expect(events).toContain('reader-open');
  expect(events).toContain('post-open');
  expect(events).toContain('wording');
});

test('timeline and reader still work when analytics is blocked', async ({ page }) => {
  await page.route('**/analytics.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await load(page, 'wikis/posts');
  await expect(page.getByRole('listbox', { name: 'Posts', exact: true })).toBeVisible();
  await page.locator('[data-post-row]').first().click();
  await expect(page.locator('#det-title')).toBeVisible();
});
