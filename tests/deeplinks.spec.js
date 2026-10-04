// @ts-check
const { test, expect, load, wikiData } = require('./fixtures');

const WIKI_TITLE = /^18,000 posts/;

test('#affected opens the Affected tab', async ({ page }) => {
  await load(page, 'affected');
  await expect(page.getByRole('tab', { name: /^Affected/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view [data-ent-row]').first()).toBeVisible();
});

test('#responses opens the Responses tab', async ({ page }) => {
  await load(page, 'responses');
  await expect(page.getByRole('tab', { name: /^Responses/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view [data-rsp-row]').first()).toBeVisible();
});

test('#inside shows the incident chooser with the pinned group first', async ({ page }) => {
  await load(page, 'inside');
  await expect(page.locator('#lvl').getByRole('button', { name: 'Inside an incident' })).toHaveAttribute('aria-current', 'true');
  const table = page.locator('#view table.chooser');
  await expect(table).toBeVisible();
  const groups = table.locator('tr.grp');
  await expect(groups.first()).toHaveText('More inside');
  // the wiki incident sits in the pinned group: right after its header, before "Only the card"
  const rows = await table.locator('tbody tr').evaluateAll(trs => trs.map(tr => tr.classList.contains('grp') ? '#' + tr.textContent : tr.getAttribute('data-inc-row')));
  expect(rows[0]).toBe('#More inside');
  const only = rows.indexOf('#Only the card, for now');
  expect(rows.indexOf('wikis')).toBeGreaterThan(0);
  if (only > -1) expect(rows.indexOf('wikis')).toBeLessThan(only);
  // the chooser is searchable
  await page.getByRole('searchbox', { name: 'Search incidents' }).fill('German wiki');
  await expect(table.locator('[data-inc-row]')).toHaveCount(1);
});

test('#wikis opens the incident card', async ({ page }) => {
  await load(page, 'wikis');
  await expect(page.locator('#det')).toBeVisible();
  await expect(page.locator('#det-title')).toHaveText(WIKI_TITLE);
  await expect(page.locator('#lvl').getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'true');
});

test('#wikis/posts goes inside the incident and loads the posts', async ({ page }) => {
  await load(page, 'wikis/posts');
  const lvl = page.locator('#lvl');
  await expect(lvl).toContainText(/Inside an incident\s*›\s*18,000 posts/);
  await expect(lvl.getByRole('button', { name: 'Inside an incident' })).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.msg').first()).toBeVisible();
  expect(await page.evaluate(() => window.WIKI.posts.length)).toBe(wikiData().posts.length);
  expect(wikiData().posts.length).toBe(244);
});

test('#wikis/posts/<Page>@<seq> selects that post on its page', async ({ page }) => {
  const W = wikiData();
  // a post that is not on the default page, so the link has to switch pages too
  const home = W.pages[0].key;
  const post = W.posts.find(p => p.page !== home && p.seq > 1) || W.posts[W.posts.length - 1];
  const hash = 'wikis/posts/' + post.id.replace(/^dse~/, '');
  await load(page, hash);
  const row = page.locator(`.msg[data-post-row="${post.id}"]`);
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.msg[aria-selected="true"]')).toHaveCount(1);
  await expect(page.locator('#det')).toBeVisible();
});
