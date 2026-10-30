const { test, expect } = require('@playwright/test');
const { openAbout } = require('./fixtures');
const updates = require('../updates.json').updates;

test('RSS is discoverable in the header and About, with approved new and update entries', async ({page, request}) => {
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', 'https://swarms.wiki/incidents/feed.xml');
  const header = page.getByRole('navigation', {name:'Follow updates'});
  await expect(header.getByRole('link', {name:'Subscribe via RSS'})).toBeVisible();
  await expect(header.getByRole('link', {name:'Subscribe via RSS'})).toHaveAttribute('href', 'feed.xml');
  // October 29: the header's Updates link is its "Updated" date (Latest updates in its menu on narrow screens).
  await expect(page.locator('#top #meta')).toHaveAttribute('href', 'updates.html');
  await openAbout(page);
  const link = page.getByRole('dialog').getByRole('link', {name:'Subscribe via RSS'});
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'feed.xml');
  const response = await request.get('/feed.xml');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('xml');
  const feed = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return {errors:doc.querySelectorAll('parsererror').length,
      items:[...doc.querySelectorAll('item')].map(i=>{
        // RSS descriptions contain escaped HTML. Compare the rendered text and
        // decoded links, not that HTML serialization with plain update prose.
        const body = new DOMParser().parseFromString(i.querySelector('description').textContent, 'text/html');
        return {title:i.querySelector('title').textContent, guid:i.querySelector('guid').textContent,
          summary:body.querySelector('p').textContent,
          links:[...body.querySelectorAll('a')].map(a=>a.getAttribute('href'))};
      })};
  }, await response.text());
  expect(feed.errors).toBe(0);
  expect(feed.items).toHaveLength(updates.length);
  expect(new Set(feed.items.map(i=>i.guid)).size).toBe(updates.length);
  for (const update of updates) {
    const item = feed.items.find(i=>i.guid === 'swarmincidents:update:' + update.id);
    expect(item.title).toBe(update.type + ': ' + update.title);
    expect(item.summary).toBe(update.summary);
    expect(item.links).toContain(update.source);
  }
});

test('approved header wraps without clipping on narrow and wide screens', async ({page}, testInfo) => {
  await page.goto('/', {waitUntil:'domcontentloaded'});
  for (const width of [320,390,768,1024,1440,1920]) {
    await page.setViewportSize({width, height:900});
    // The existing dashboard resizes its SVG chart asynchronously.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const layout = await page.evaluate(() => ({
      width: innerWidth, content: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('#top a,#top button')].map(e => {
        const r = e.getBoundingClientRect(); return {name:e.getAttribute('aria-label') || e.textContent.trim(), x:r.x,right:r.right};
      }).filter(e=>e.right>e.x)
    }));
    expect(layout.content, `${testInfo.project.name} ${width} overflow`).toBeLessThanOrEqual(width);
    for(const c of layout.controls) {
      expect(c.x, c.name).toBeGreaterThanOrEqual(0);
      expect(c.right, c.name).toBeLessThanOrEqual(width + 1);
    }
    if(testInfo.project.name === 'chromium' && [390,1440].includes(width)) {
      await page.locator('#top').screenshot({path:`/tmp/swarm-rss-header-${width}.png`});
    }
  }
});
