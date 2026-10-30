// @ts-check
// Shared fixture: every test fails on a console.error or an uncaught page error, and never leaves localhost.
const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const test = base.test.extend({
  expectedHttpError: [null, {option:true}],
  realFonts: [false, {option:true}],
  page: async ({ page, baseURL, expectedHttpError, realFonts }, use) => {
    const errors = [];
    page.on('console', m => {
      if (m.type() !== 'error') return;
      // Error-path tests explicitly opt in to their mocked endpoint's HTTP error;
      // application exceptions and every unrelated console error still fail.
      if (expectedHttpError && m.location().url === expectedHttpError && /^Failed to load resource:.*502/.test(m.text())) return;
      errors.push(`console.error: ${m.text()}`);
    });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    // The reader's explainer opens by itself on a first visit; tests start as a returning reader (one test clears this).
    await page.addInitScript(() => { try { localStorage.setItem('wikiIntro', 'seen'); } catch (e) { /* storage unavailable */ } });
    const origin = new URL(baseURL || 'http://127.0.0.1:8799/').origin;
    // Anything outside the site is answered locally with an empty body, so the run is offline (fulfilling, not
    // aborting: an aborted request would log a console error).
    await page.route(url => url.origin !== origin && /^https?:$/.test(url.protocol), route =>
      route.fulfill({ status: 200, contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' }));
    // Inter and JetBrains Mono come from the site's own fonts/ (October 27; Google Fonts before). The screenshot
    // baselines were made with Google's stylesheet answered empty, so the fonts' stylesheet still is, unless a test
    // asks for the real fonts (fonts.spec.js).
    if (!realFonts) await page.route(url => url.origin === origin && url.pathname.endsWith('/fonts/fonts.css'), route =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await use(page);
    base.expect(errors, 'console errors and page errors').toEqual([]);
  },
});

/** Loads the site at a hash and waits until the app has rendered. */
async function load(page, hash = '') {
  await page.goto(hash ? '/#' + hash : '/');
  await base.expect(page.locator('#view')).not.toBeEmpty();
}

/** The wiki data the site loads on demand, read from disk so tests follow regenerated data. */
function wikiData() {
  const s = fs.readFileSync(path.join(__dirname, '..', 'docs', 'wiki-data.js'), 'utf8');
  return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, ''));
}

/** The incident data built into the page, read from docs/index.html so tests follow whatever data was built. */
function siteData() {
  const s = fs.readFileSync(path.join(__dirname, '..', 'docs', 'index.html'), 'utf8');
  const m = s.match(/const DATA = (.*);\n/);
  if (!m) throw new Error('no DATA in docs/index.html');
  return JSON.parse(m[1]);
}

const isMobile = testInfo => !!testInfo.project.use.isMobile;

/** Opens the Updates page from the header (October 29: the header's Updates link is gone): its "Updated" date on
 *  wide screens, Latest updates in its menu where the date is hidden. */
async function openUpdates(page) {
  const date = page.locator('#top #meta');
  if (await date.isVisible()) return date.click();
  await page.locator('#top .menu-btn').click();
  await page.locator('#site-menu').getByRole('link', { name: 'Latest updates', exact: true }).click();
}

/** Opens About from the header: its button, or About in its menu where the button is hidden (October 29: 900px
 *  wide and narrower, to make room for the wordmark). */
async function openAbout(page) {
  const button = page.locator('#about-btn');
  if (await button.isVisible()) return button.click();
  await page.locator('#top .menu-btn').click();
  await page.locator('#site-menu').getByRole('button', { name: 'About', exact: true }).click();
}

module.exports = { test, expect: base.expect, load, wikiData, siteData, isMobile, openUpdates, openAbout };
