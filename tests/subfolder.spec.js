// The site also has to work from a folder: it is moving to swarms.wiki/incidents/ (Elvis, October 27). Every link
// and every file the pages load is relative to the page, so the same build works at the root and in a folder.
// These tests serve the site at /incidents/ by mapping that folder onto the root, and fail on any request that
// escapes it. The rest of the suite is the positive control: the same build, served at the root.
const { test, expect, siteData } = require('./fixtures');
const fs = require('fs');
const path = require('path');

const FOLDER = '/incidents/';

/** Serves the site at /incidents/ and records every same-origin request outside it. */
async function inFolder(page, baseURL) {
  const origin = new URL(baseURL).origin, outside = [];
  await page.route(url => url.origin === origin, async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith(FOLDER)) { outside.push(url.pathname); return route.abort(); }
    // The fonts' stylesheet is left to fixtures.js, which answers it empty (fonts.spec.js loads the real fonts).
    if (url.pathname === FOLDER + 'fonts/fonts.css') return route.fallback();
    // Fetch and fulfill rather than continue with a new URL: Firefox then treats the page as being at the root.
    return route.fulfill({ response: await route.fetch({ url: origin + '/' + url.pathname.slice(FOLDER.length) + url.search }) });
  });
  return { origin, outside };
}
const resolved = loc => loc.evaluate(el => el.href);

test('the timeline, its links and its files stay inside the folder', async ({ page, baseURL }) => {
  const { origin, outside } = await inFolder(page, baseURL);
  await page.goto(FOLDER);
  await expect(page.locator('#view')).not.toBeEmpty();
  const at = file => origin + FOLDER + file;
  expect(await resolved(page.getByRole('link', { name: 'Swarm Incidents home' }))).toBe(at(''));
  const follow = page.getByRole('navigation', { name: 'Follow updates' });
  expect(await resolved(follow.getByRole('link', { name: 'Updates', exact: true }))).toBe(at('updates.html'));
  expect(await resolved(follow.getByRole('link', { name: 'Subscribe via RSS' }))).toBe(at('feed.xml'));
  for (const sel of ['link[rel="icon"][type="image/svg+xml"]', 'link[rel="apple-touch-icon"]', 'link[rel="manifest"]', 'link[rel="stylesheet"][href$="fonts.css"]'])
    expect(await resolved(page.locator(sel))).toMatch(new RegExp('^' + at('')));
  const manifest = await (await page.request.get(origin + '/site.webmanifest')).json();
  expect(manifest.start_url).toBe('./');
  expect(manifest.icons.every(i => !i.src.startsWith('/'))).toBe(true);
  await page.getByRole('button', { name: 'About', exact: true }).click();
  expect(await resolved(page.getByRole('dialog').getByRole('link', { name: 'Read the Updates page' }))).toBe(at('updates.html'));
  await page.keyboard.press('Escape');
  await follow.getByRole('link', { name: 'Updates', exact: true }).click();
  await expect(page).toHaveURL(at('updates.html'));
  await expect(page.getByRole('heading', { name: 'Updates', exact: true })).toBeVisible();
  expect(await resolved(page.getByRole('link', { name: 'Subscribe to updates via RSS' }))).toBe(at('feed.xml'));
  expect(outside).toEqual([]);
});

// The same check as retirements.spec.js, from the folder: a retired incident's link opens its correction on the
// Updates page next to it, not at the site root.
test('a retired incident link opens its correction inside the folder', async ({ page, baseURL }) => {
  const { origin, outside } = await inFolder(page, baseURL);
  const original = siteData().incidents[0], updateId = 'retirement-folder-control';
  const update = { id: updateId, incident: original.id, title: 'Catalog retirement control', summary: 'Folder control.', published: '2026-10-24T12:00:00Z', type: 'Correction', freshness: 'correction', changes: [] };
  for (const [pathname, file] of [[FOLDER, 'index.html'], [FOLDER + 'updates.html', 'updates.html']]) {
    const html = fs.readFileSync(path.join(__dirname, '../docs', file), 'utf8');
    const match = html.match(/const DATA = (.*);\n/), data = JSON.parse(match[1]);
    data.incidents = data.incidents.filter(i => i.id !== original.id);
    data.retiredIncidents = { [original.id]: updateId };
    if (file === 'updates.html') data.responses.unshift({ id: updateId, title: update.title, text: update.summary, d: '2026-10-24', who: 'other', inc: [original.id], update, src: [original.sources[0]] });
    await page.route(url => url.pathname === pathname, route => route.fulfill({ contentType: 'text/html', body: html.replace(match[0], 'const DATA = ' + JSON.stringify(data).replaceAll('</', '<\\/') + ';\n') }));
  }
  await page.goto(FOLDER + '#' + original.id);
  await expect(page).toHaveURL(origin + FOLDER + 'updates.html#' + updateId);
  expect(outside).toEqual([]);
});
