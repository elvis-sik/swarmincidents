const { test, expect } = require('@playwright/test');
const updates = require('../updates.json').updates;

test('RSS is discoverable in the header and About, with approved new and update entries', async ({page, request}) => {
  await page.goto('/');
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', 'https://swarmincidents.com/feed.xml');
  const header = page.getByRole('navigation', {name:'Follow updates'});
  await expect(header.getByRole('link', {name:'Subscribe via RSS'})).toBeVisible();
  await expect(header.getByRole('link')).toHaveAttribute('href', '/feed.xml');
  await page.getByRole('button', {name:'About', exact:true}).click();
  const link = page.getByRole('dialog').getByRole('link', {name:'Subscribe via RSS'});
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/feed.xml');
  const response = await request.get('/feed.xml');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('xml');
  const feed = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return {errors:doc.querySelectorAll('parsererror').length,
      items:[...doc.querySelectorAll('item')].map(i=>({title:i.querySelector('title').textContent,
        guid:i.querySelector('guid').textContent, summary:i.querySelector('description').textContent}))};
  }, await response.text());
  expect(feed.errors).toBe(0);
  expect(feed.items).toHaveLength(updates.length);
  expect(new Set(feed.items.map(i=>i.guid)).size).toBe(updates.length);
  for (const update of updates) {
    const item = feed.items.find(i=>i.guid === 'swarmincidents:update:' + update.id);
    expect(item.title).toBe(update.type + ': ' + update.title);
    expect(item.summary).toContain(update.summary);
    expect(item.summary).toContain(update.source);
  }
});

test('approved header wraps without clipping on narrow and wide screens', async ({page}, testInfo) => {
  await page.goto('/');
  for (const width of [320,390,768,1024,1440,1920]) {
    await page.setViewportSize({width, height:900});
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
