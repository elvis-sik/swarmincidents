// @ts-check
// The incident search (October 29): words narrow the timeline; a pasted link finds the incidents that cite it; a link
// nothing cites can be suggested for review. The rules for "same link" are unit-tested in tests/unit/link-key.cjs.
const { test, expect, load, siteData, isMobile } = require('./fixtures');
const LinkKey = require('../link-key.js');

const box = page => page.locator('#find-q');
const rows = page => page.locator('#view [data-inc-row]');
const AMAP = 'https://twitter.com/ethanelasky/status/2110355334556729766?s=46&t=AbC123'; // cited as x.com/ethanelasky/status/…
const POCKETOS = 'https://x.com/LifeOf_Jer/status/2048103471019434248?s=20';           // outside the default categories
const ZVI = 'https://thezvi.substack.com/p/what-also-happened-notonlyhuggingface';     // cited by four incidents

test('words narrow the rows, combined with the categories that are on; hidden matches can be shown', async ({ page }) => {
  await load(page);
  const all = await rows(page).count();
  await box(page).fill('hugging face');
  await expect.poll(() => rows(page).count()).toBeLessThan(all);
  const shown = await rows(page).count();
  expect(shown).toBeGreaterThan(0);
  const more = page.locator('#find-note').getByRole('button', { name: /more outside these filters/ });
  await expect(more).toBeVisible();
  const hidden = Number((await more.textContent() || '').match(/\d+/)?.[0]);
  await more.click();
  await expect(rows(page)).toHaveCount(shown + hidden);
  await expect(page.locator('#find-note')).toBeEmpty();
  await expect(box(page)).toHaveValue('hugging face');
  // Run together, without spaces or with other punctuation
  await box(page).fill('huggingface');
  await expect(rows(page)).toHaveCount(shown + hidden);
  await box(page).fill('');
  await expect.poll(() => rows(page).count()).toBeGreaterThan(shown + hidden);
});

test('words that match nothing say so, and suggest pasting a link', async ({ page }) => {
  await load(page);
  await box(page).fill('xyzzy plover');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('.find-empty')).toContainText('No incidents match “xyzzy plover”');
  await expect(page.locator('.find-empty')).toContainText('paste its link');
});

test('a pasted X link finds the incident citing that post, however the link is written', async ({ page }, testInfo) => {
  await load(page);
  await box(page).fill(AMAP);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toHaveAttribute('data-inc-row', 'amap-fleet');
  await expect(page.locator('#find-note')).toHaveText('Cited by 1 incident · same post on X');
  if (isMobile(testInfo)) await expect(page.locator('#pane')).not.toHaveClass(/open/); // the card would cover the box
  else {
    await expect(page.locator('#det-title')).toHaveText(/Amap/);
    await expect(page).toHaveURL(/#amap-fleet$/);
    await expect(box(page)).toBeFocused();
    // Another single match takes the card's place, in the same history entry.
    await box(page).fill('https://huggingface.co/blog/security-incident-july-2026');
    await expect(page.locator('#det-title')).toHaveText('Hugging Face breached during an evaluation');
    await expect(page).toHaveURL(/#hugging-face$/);
    await page.waitForTimeout(300); // a stray history step would land here
    await expect(page).toHaveURL(/#hugging-face$/);
    // The card the search opened closes when the search moves on.
    await box(page).fill('https://example.org/not-cited-anywhere');
    await expect(page.locator('#det')).toBeHidden();
    await expect(page).not.toHaveURL(/#/);
  }
});

test('a link cited outside the categories that are on is named, and opens', async ({ page }) => {
  await load(page);
  await box(page).fill(POCKETOS);
  await expect(rows(page)).toHaveCount(0);
  const empty = page.locator('.find-empty');
  await expect(empty).toContainText('This link is cited by 1 incident outside these filters');
  await empty.getByRole('button', { name: /PocketOS/ }).click();
  await expect(page.locator('#det-title')).toHaveText(/PocketOS/);
  await expect(page).toHaveURL(/#pocketos-volume$/);
});

test('a link several incidents cite shows them all', async ({ page }) => {
  await load(page);
  await box(page).fill(ZVI);
  await expect(page.locator('#find-note')).toHaveText('Cited by 4 incidents');
  await page.locator('.find-empty').getByRole('button', { name: 'Show all 4' }).click();
  await expect(rows(page)).toHaveCount(4);
  expect(await rows(page).evaluateAll(r => r.map(x => x.getAttribute('data-inc-row')).sort())).toEqual(['dns-chatbot', 'medicare', 'us-government', 'user-images']);
});

test('a link nothing cites: the Report form takes it where the suggestion API isn’t beside the page', async ({ page }) => {
  await load(page);
  await box(page).fill('https://www.example.org/agents/report?id=7&utm_source=feed');
  const empty = page.locator('.find-empty');
  await expect(empty).toContainText('Not in the catalog yet');
  await expect(empty.locator('.find-url')).toHaveText('www.example.org/agents/report?id=7');
  await expect(empty).toContainText('opens the Report form');
  await empty.getByRole('button', { name: 'Suggest it for review' }).click();
  await expect(page.getByRole('dialog', { name: 'Report an incident' })).toBeVisible();
  await expect(page.locator('#report-sources')).toHaveValue('https://www.example.org/agents/report?id=7');
});

test('short links, private addresses and retired incidents get their own answers, not the offer', async ({ page }) => {
  await load(page);
  const empty = page.locator('.find-empty');
  await box(page).fill('https://t.co/AbCdEf123');
  await expect(empty).toContainText('short link (t.co)');
  await expect(empty.getByRole('button', { name: 'Suggest it for review' })).toHaveCount(0);
  await box(page).fill('http://169.254.169.254/latest/meta-data/');
  await expect(empty).toContainText('private network');
  // A source only retired incidents cite: the registry keeps it, and the page links the correction.
  const data = siteData(), active = new Set(data.incidents.map(e => e.id)), reg = data.publicSources, citedBy = new Map();
  const cite = (id, url) => { const k = LinkKey.key(url); if (k) citedBy.set(k, [...(citedBy.get(k) || []), id]); };
  for (const [id, v] of Object.entries(reg.incidents)) for (const sid of [...v.curated, ...(v.additional || [])]) [reg.sources[sid].url, ...reg.sources[sid].aliases].forEach(u => cite(id, u));
  for (const e of data.incidents) {
    e.sources.forEach(s => cite(e.id, s[2]));
    [...e.reveals, ...e.activity, e.knew || {}].forEach(x => (x.src || []).forEach(u => cite(e.id, u)));
    (e.datasets || []).forEach(d => [d.url, d.download].filter(Boolean).forEach(u => cite(e.id, u)));
  }
  data.responses.forEach(r => (r.src || []).forEach(s => r.inc.forEach(id => cite(id, s[2]))));
  data.affected.forEach(a => a.inv.forEach(v => (v.src || []).forEach(u => cite(v.inc, u))));
  const [retiredKey, ids] = [...citedBy].find(([, ids]) => ids.every(id => !active.has(id) && data.retiredIncidents[id])) || [];
  expect(retiredKey, 'positive control: some source is cited only by retired incidents').toBeTruthy();
  await box(page).fill('https://' + retiredKey);
  await expect(empty).toContainText('Reviewed and retired');
  await expect(empty.getByRole('link', { name: /correction/i }).first()).toHaveAttribute('href', 'updates.html#' + encodeURIComponent(data.retiredIncidents[ids[0]]));
});

test('?q= starts a search and leaves the address', async ({ page }) => {
  await page.goto('/?q=' + encodeURIComponent('hugging face') + '#affected');
  await expect(page).toHaveURL(/\/#affected$/);
  await page.getByRole('tab', { name: /^Timeline/ }).click();
  await expect(box(page)).toHaveValue('hugging face');
  await expect(page.locator('#count')).toHaveText(/of/);
});

test('on a phone the box has its own full-width row and nothing overflows', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), 'phone layout');
  await load(page);
  await box(page).fill(POCKETOS);
  const [field, filters] = await Promise.all([box(page).boundingBox(), page.locator('#filters').boundingBox()]);
  expect(field && filters && field.width).toBeGreaterThan((filters?.width || 0) * 0.9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.find-empty')).toBeVisible();
});

test('the updates page has no search box', async ({ page }) => {
  await page.goto('/updates.html');
  await expect(page.locator('#view')).not.toBeEmpty();
  await expect(box(page)).toHaveCount(0);
});

// Where the page is served beside the API (swarms.wiki/incidents/), the link goes to the review queue instead. The site
// is served at /incidents/ here by mapping that folder onto the root, as subfolder.spec.js does.
const LEADS = `http://127.0.0.1:${Number(process.env.PORT || 8799)}/api/incidents/leads`;
test.describe('beside the suggestion API', () => {
  test.use({ expectedHttpError: LEADS });
  test.beforeEach(async ({ page, baseURL }) => {
    const origin = new URL(baseURL || '').origin;
    await page.route(url => url.origin === origin && url.pathname.startsWith('/incidents/'), async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/incidents/fonts/fonts.css') return route.fallback();
      return route.fulfill({ response: await route.fetch({ url: origin + '/' + url.pathname.slice('/incidents/'.length) + url.search }) });
    });
  });

  test('a link nothing cites can be sent; the answer is shown and the tracking parts stay behind', async ({ page }) => {
    const sent = [];
    await page.route('**/api/incidents/leads', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { enabled: true, turnstileSiteKey: null, known: true } });
      sent.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto('/incidents/');
    await box(page).fill('https://twitter.com/someone/status/1234567890123456789?s=46&t=AbC');
    const empty = page.locator('.find-empty');
    await expect(empty).toContainText('wait in a review queue');
    await expect(empty.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacy#incident-links');
    await expect(empty.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/terms');
    // One click: nothing to fill in or confirm, and no Turnstile here, since the API says this browser has a name.
    await empty.getByRole('button', { name: 'Suggest it for review' }).click();
    await expect(empty.locator('.find-ok')).toHaveText('Thanks. The link is in the review queue.');
    expect(sent).toEqual([{ url: 'https://twitter.com/someone/status/1234567890123456789' }]);
    // Asking again doesn't send again.
    await box(page).fill('https://x.com/someone/status/1234567890123456789');
    await expect(empty.locator('.find-ok')).toBeVisible();
    expect(sent).toHaveLength(1);
  });

  test('someone new also sends with one click: the person check runs unseen unless Cloudflare wants more', async ({ page }) => {
    const sent = [];
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({ contentType: 'application/javascript',
      body: 'window.turnstile={render:(box,o)=>{window.__turnstile=o;setTimeout(()=>o.callback("test-token"),0);return "w1";}};' }));
    await page.route('**/api/incidents/leads', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { enabled: true, turnstileSiteKey: 'test-site-key', known: false } });
      sent.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto('/incidents/');
    await box(page).fill('https://www.example.org/agents/new-reader-report');
    await page.locator('.find-empty').getByRole('button', { name: 'Suggest it for review' }).click();
    await expect(page.locator('.find-ok')).toBeVisible();
    expect(sent).toEqual([{ url: 'https://www.example.org/agents/new-reader-report', turnstile: 'test-token' }]);
    expect(await page.evaluate(() => [window.__turnstile.appearance, window.__turnstile.sitekey])).toEqual(['interaction-only', 'test-site-key']);
    await expect(page.locator('.find-turnstile')).toHaveCount(0); // its box goes once the check is done
  });

  test('a failed send is explained and the link stays to try again', async ({ page }) => {
    await page.route('**/api/incidents/leads', route => route.request().method() === 'GET'
      ? route.fulfill({ json: { enabled: true, turnstileSiteKey: null, known: true } })
      : route.fulfill({ status: 502, json: { error: 'server error' } }));
    await page.goto('/incidents/');
    await box(page).fill('https://www.example.org/agents/another-report');
    await page.locator('.find-empty').getByRole('button', { name: 'Suggest it for review' }).click();
    await expect(page.locator('.find-err')).toContainText('We couldn’t send it');
    await expect(page.locator('.find-empty').getByRole('button', { name: 'Suggest it for review' })).toBeEnabled();
  });
});
