// @ts-check
// Shared fixture: every test fails on a console.error or an uncaught page error, and never leaves localhost.
const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const test = base.test.extend({
  page: async ({ page, baseURL }, use) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    // The page asks Google Fonts for Inter and JetBrains Mono. Answer locally with an empty stylesheet so the run is
    // deterministic and offline (fulfilling, not aborting: an aborted request would log a console error).
    const origin = new URL(baseURL || 'http://127.0.0.1:8799/').origin;
    await page.route(url => url.origin !== origin && /^https?:$/.test(url.protocol), route =>
      route.fulfill({ status: 200, contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
    await use(page);
    base.expect(errors, 'console errors and page errors').toEqual([]);
  },
});

/** Loads the site at a hash and waits until the app has rendered. */
async function load(page, hash = '') {
  await page.goto(hash ? '/#' + hash : '/');
  await base.expect(page.locator('#lvl button').first()).toBeVisible();
}

/** The wiki data the site loads on demand, read from disk so tests follow regenerated data. */
function wikiData() {
  const s = fs.readFileSync(path.join(__dirname, '..', 'docs', 'wiki-data.js'), 'utf8');
  return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, ''));
}

const isMobile = testInfo => !!testInfo.project.use.isMobile;

module.exports = { test, expect: base.expect, load, wikiData, isMobile };
