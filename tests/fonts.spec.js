// The fonts come from the site (October 27): Inter and JetBrains Mono are served from fonts/ rather than Google
// Fonts, so reading the incidents contacts no one else, as swarms.wiki promises for its pages once the tracker
// moves to swarms.wiki/incidents/. Positive control: the fonts do load, in the faces the pages use.
const { test, expect } = require('./fixtures');

test.use({ realFonts: true });

for (const [name, at] of [['the timeline', ''], ['Updates', 'updates.html']]) {
  test(`${name} loads its fonts from the site and contacts no one else`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL).origin, elsewhere = [];
    page.on('request', r => { const url = new URL(r.url()); if (url.origin !== origin && /^https?:$/.test(url.protocol)) elsewhere.push(r.url()); });
    await page.goto('/' + at, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family.replace(/"/g, '')} ${f.weight}`));
    expect(loaded).toEqual(expect.arrayContaining(['Inter 400', 'Inter 500', 'Inter 600', 'Inter 700', 'JetBrains Mono 400']));
    expect(elsewhere).toEqual([]);
  });
}
