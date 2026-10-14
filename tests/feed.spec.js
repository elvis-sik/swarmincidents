const { test, expect } = require('@playwright/test');
const incidents = require('../incidents.json').incidents;

test('RSS is discoverable and linked from About, with approved incident summaries', async ({page, request}) => {
  await page.goto('/');
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', 'https://swarmincidents.com/feed.xml');
  await page.getByRole('button', {name:'About', exact:true}).click();
  const link = page.getByRole('link', {name:'Subscribe via RSS'});
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
  expect(feed.items).toHaveLength(incidents.length);
  expect(new Set(feed.items.map(i=>i.guid)).size).toBe(incidents.length);
  for (const incident of incidents) {
    expect(feed.items.find(i=>i.guid.endsWith('#' + incident.id)).title).toBe(incident.title);
  }
  expect(feed.items.find(i=>i.guid.endsWith('#wikis')).summary).toContain('roughly 18,000 posts');
});
