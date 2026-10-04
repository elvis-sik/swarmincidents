// @ts-check
// The "Inside an incident" reader: the breadcrumb with its thread picker, the context panel, the wording axis,
// the feed's markup and multi-post saves, and the card (writer line, folding sections, provenance tints, Details as fields).
const { test, expect, load, wikiData, isMobile } = require('./fixtures');

const HOME = 'dse~DataUSACashiersMastersSequenceLive5';
const homePosts = () => wikiData().posts.filter(p => p.page === HOME);
const homeTitle = () => wikiData().pages.find(p => p.key === HOME).title;
/** A plain stretch of the posted text (no heading, bold or link markup), as the feed renders it. */
const plainBit = text => (text.split('\n').find(l => l.trim() && !/^=|\*|\[\[/.test(l)) || '').trim().slice(0, 24);
/** A save holding two signed posts: two lines ending in "-- Name", with text after the first. */
const twoPosts = () => homePosts().find(p => (p.text.match(/--\s*[A-Z][A-Za-z0-9_]+\s*$/gm) || []).length === 2);

test('the breadcrumb: Inside an incident › German wiki › the thread; "Inside an incident" opens the chooser', async ({ page }) => {
  await load(page, 'wikis/posts');
  const lvl = page.locator('#lvl');
  await expect(lvl).toContainText(new RegExp(`Inside an incident\\s*›\\s*German wiki\\s*›\\s*${homeTitle()}`));
  await expect(lvl.getByRole('button', { name: 'German wiki' })).toHaveAttribute('aria-current', 'false');
  await expect(lvl.getByRole('button', { name: /^Thread:/ })).toHaveAttribute('aria-current', 'true');
  await lvl.getByRole('button', { name: 'Inside an incident' }).click();
  await expect(page).toHaveURL(/#inside$/);
  await expect(page.locator('#view table.chooser')).toBeVisible();
  await expect(lvl.getByRole('button', { name: 'Inside an incident' })).toHaveAttribute('aria-current', 'true');
  await expect(lvl.getByRole('button', { name: /^Thread:/ })).toHaveCount(0);
});

test('the thread crumb opens the searchable thread list and switches threads; the filter row has no thread picker', async ({ page }) => {
  await load(page, 'wikis/posts');
  await expect(page.locator('#filters').getByRole('button', { name: /^Thread/ })).toHaveCount(0);
  const other = wikiData().pages.find(p => p.key !== HOME);
  await page.locator('#lvl').getByRole('button', { name: /^Thread:/ }).click();
  const pop = page.locator('.pk-pop');
  await expect(pop.getByRole('combobox', { name: 'Search threads' })).toBeFocused();
  await pop.getByRole('combobox').fill(other.title);
  await pop.getByRole('option', { name: new RegExp(other.title) }).first().click();
  await expect(page.locator('#lvl').getByRole('button', { name: /^Thread:/ })).toHaveAccessibleName(`Thread: ${other.title}`);
  await expect(page.locator('.ctx .ctx-h b')).toHaveText(other.title);
});

test('the context panel is open on entry, folds to one line and remembers it; provenance is a footnote', async ({ page }) => {
  await load(page, 'wikis/posts');
  const ctx = page.locator('.ctx');
  await expect(ctx.locator('.ctx-b')).toBeVisible();
  await expect(ctx.locator('.prov')).toContainText(/Provenance/i);
  await expect(page.locator('.msg[aria-selected="true"]')).toHaveCount(0);
  const head = ctx.locator('.ctx-h');
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  await head.click();
  await expect(ctx.locator('.ctx-b')).toHaveCount(0);
  await expect(head).toHaveAttribute('aria-expanded', 'false');
  await expect(head).toContainText('Show');
  await page.reload();
  await expect(page.locator('.ctx .ctx-h')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('.ctx .ctx-h').click();
  await expect(page.locator('.ctx .ctx-b')).toBeVisible();
});

test('the wording axis: Chatty by default, clicking Original shows the posted text, and it is remembered', async ({ page }) => {
  const post = homePosts().find(p => p.reading && p.reading.trim() !== p.text.trim());
  test.skip(!post, 'no post with a plain reading on the home thread');
  await load(page, 'wikis/posts');
  const axis = page.getByRole('slider', { name: 'Wording' });
  await expect(axis).toHaveAttribute('aria-valuetext', 'Chatty');
  await expect(axis).toHaveAttribute('aria-valuenow', '2');
  await expect(page.locator('.retold')).toBeVisible();
  await axis.locator('.axis-lab', { hasText: 'Original' }).click();
  await expect(axis).toHaveAttribute('aria-valuetext', 'Original');
  const body = page.locator(`.msg[data-post-row="${post.id}"] .msg-b`).first();
  await expect(body).toContainText(plainBit(post.text));
  await expect(page.locator('.retold')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Wording' })).toHaveAttribute('aria-valuetext', 'Original');
  await expect(page.locator(`.msg[data-post-row="${post.id}"] .msg-b`).first()).toContainText(plainBit(post.text));
});

test('the wording axis by keyboard: Left from Chatty is Plain English, Home and End reach the ends, and it persists', async ({ page }) => {
  await load(page, 'wikis/posts');
  const axis = page.getByRole('slider', { name: 'Wording' });
  await axis.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(axis).toHaveAttribute('aria-valuetext', 'Plain English');
  await expect(axis).toBeFocused();
  await page.keyboard.press('Home');
  await expect(axis).toHaveAttribute('aria-valuetext', 'Original');
  await page.keyboard.press('ArrowLeft');
  await expect(axis).toHaveAttribute('aria-valuetext', 'Original');
  await page.keyboard.press('End');
  await expect(axis).toHaveAttribute('aria-valuetext', 'Chatty');
  await page.keyboard.press('ArrowLeft');
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Wording' })).toHaveAttribute('aria-valuetext', 'Plain English');
});

test('mentions in Chatty keep the @ and filter the feed by that writer', async ({ page }) => {
  await load(page, 'wikis/posts');
  const at = page.locator('.msg-b button.at').first();
  await expect(at).toHaveText(/^@\S/);
  const before = await page.locator('.msg').count();
  await at.click();
  await expect.poll(() => page.locator('.msg').count()).toBeLessThan(before);
});

test('a save with two signed posts: two bubbles under one header, and a "same save" rule on the card', async ({ page }) => {
  const post = twoPosts();
  test.skip(!post, 'no two-post save on the home thread');
  await load(page, 'wikis/posts/' + post.id.replace(/^dse~/, ''));
  const row = page.locator(`.msg[data-post-row="${post.id}"]`);
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(row.locator('.msg-h')).toContainText('2 posts in one save');
  await page.getByRole('slider', { name: 'Wording' }).focus();
  await page.keyboard.press('Home');
  await expect(row.locator('.msg-b')).toHaveCount(2);
  await expect(page.locator('#det .orig .same-save')).toHaveCount(1);
});

test('the card: a writer line that filters the feed, no tag row, and Details open by default with its links filtering', async ({ page }) => {
  const posts = homePosts(), counts = new Map();
  posts.forEach(p => counts.set(p.who, (counts.get(p.who) || 0) + 1));
  const post = posts.find(p => counts.get(p.who) > 1 && counts.get(p.who) < posts.length && p.rounds.length);
  test.skip(!post, 'no writer with several posts on the home thread');
  await load(page, 'wikis/posts/' + post.id.replace(/^dse~/, ''));
  await expect(page.locator(`.msg[data-post-row="${post.id}"]`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#det .tags')).toHaveCount(0);
  const writer = page.locator('#det button.writer');
  await expect(writer).toHaveAttribute('aria-pressed', 'false');
  await writer.click();
  await expect(page.locator('#det button.writer')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.msg')).toHaveCount(counts.get(post.who));
  await page.locator('#det button.writer').click();
  await expect(page.locator('.msg')).toHaveCount(posts.length);
  const more = page.locator('#det details[data-sec="more"]');
  await expect(more).toHaveAttribute('open', /.*/);
  const q = more.locator('dd button.about-l', { hasText: `question ${post.rounds[0]}` });
  await q.click();
  await expect(page.locator('.msg')).toHaveCount(posts.filter(p => p.rounds.includes(post.rounds[0])).length);
});

test('the filter row: search on the left, the pickers and the wording right-aligned, the wording last', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), 'phones keep the wrapping order');
  await load(page, 'wikis/posts');
  const f = page.locator('#filters');
  const box = async l => (await l.boundingBox()) || { x: 0, y: 0, width: 0, height: 0 };
  const search = await box(f.locator('input.search')), who = await box(f.getByRole('button', { name: /^Writer/ })),
    round = await box(f.getByRole('button', { name: /^Question/ })), axis = await box(f.getByRole('slider', { name: 'Wording' })), row = await box(f);
  expect(search.x).toBeLessThan(who.x);
  expect(who.x).toBeLessThan(round.x);
  expect(round.x).toBeLessThan(axis.x);
  expect(row.x + row.width - (axis.x + axis.width)).toBeLessThan(4);
  expect(who.x - (search.x + search.width)).toBeGreaterThan(100);
  expect(axis.height).toBeLessThanOrEqual(who.height + 1);
});

test('the briefing: fields and values, and a Who-is-here chip filters the feed by that writer', async ({ page }) => {
  const d = wikiData(), g = d.groups.find(x => x.id === d.pages.find(p => p.key === HOME).group);
  await load(page, 'wikis/posts');
  const ctx = page.locator('.ctx');
  await expect(ctx.locator('.ctx-h')).toContainText(/Before you read/i);
  const labels = await ctx.locator('dl.bf > dt').allTextContents();
  const want = g.brief && g.brief.task ? ['Task', 'How it works', 'What they want', 'Why a wiki', 'Who is here', 'This thread'] : ['Task', 'Who is here', 'This thread'];
  for (const w of want) expect(labels).toContain(w);
  const posts = homePosts(), counts = new Map();
  posts.forEach(p => counts.set(p.who, (counts.get(p.who) || 0) + 1));
  const chips = ctx.locator('.wchips button.wchip');
  await expect(chips).toHaveCount(counts.size);
  const first = chips.first();
  await first.click();
  await expect(page.locator('.ctx .wchips button.wchip').first()).toHaveAttribute('aria-pressed', 'true');
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  await expect(page.locator('.msg')).toHaveCount(top[1]);
  await page.locator('.ctx .wchips button.wchip').first().click();
  await expect(page.locator('.msg')).toHaveCount(posts.length);
});

test('card sections fold: Chatty is collapsed by default, and a folded section stays folded on the next card', async ({ page }) => {
  const posts = homePosts().sort((a, b) => a.time.localeCompare(b.time)), k = posts.findIndex((p, i) => p.chat && posts[i + 1] && posts[i + 1].chat);
  test.skip(k < 0, 'need two consecutive posts with a chatty retelling');
  const withChat = [posts[k]];
  await load(page, 'wikis/posts/' + withChat[0].id.replace(/^dse~/, ''));
  const sec = k => page.locator(`#det details[data-sec="${k}"]`);
  await expect(sec('orig')).toHaveAttribute('open', /.*/);
  await expect(sec('plain')).toHaveAttribute('open', /.*/);
  await expect(sec('more')).toHaveAttribute('open', /.*/);
  await expect(sec('chat')).not.toHaveAttribute('open', /.*/);
  await expect(sec('chat').locator('.chatty')).toBeHidden();
  await sec('chat').locator('summary').click();
  await expect(sec('chat').locator('.chatty')).toBeVisible();
  await sec('orig').locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(sec('orig')).not.toHaveAttribute('open', /.*/);
  // the next card (the card's own Next button, which works on phones too, where the sheet covers the feed)
  const before = await page.locator('#det h2').textContent();
  await page.locator('#det').getByRole('button', { name: 'Next post' }).click();
  await expect(page.locator('#det h2')).not.toHaveText(before || '');
  await expect(sec('orig')).not.toHaveAttribute('open', /.*/);
  await expect(sec('chat')).toHaveAttribute('open', /.*/);
  await page.reload();
  await expect(sec('orig')).not.toHaveAttribute('open', /.*/);
  await expect(sec('chat')).toHaveAttribute('open', /.*/);
});

test('Details as fields: the Writer and Terms rows, and a name in the Original lights up its row', async ({ page }) => {
  await load(page, 'wikis/posts/DataUSACashiersMastersSequenceLive5@14');
  const kv = page.locator('#det details[data-sec="more"] dl.kv');
  await expect(kv.locator('dt', { hasText: /^Writer$/ })).toBeVisible();
  await expect(kv.locator('dt', { hasText: /^Terms$/ })).toBeVisible();
  await expect(kv.locator('ul.terms li').first()).toBeVisible();
  await expect(kv.locator('.nchip[data-link="nm:AgentX"]')).toBeVisible();
  await page.locator('#det .orig [data-link="nm:AgentX"]').hover();
  await expect(kv.locator('.nchip[data-link="nm:AgentX"]')).toHaveClass(/\bon\b/);
});

test('provenance by colour: tints on both sides with Show links on, none with it off', async ({ page }) => {
  await load(page, 'wikis/posts/DataUSACashiersMastersSequenceLive5@14');
  const tinted = side => page.locator(`#det .${side} .al[class*="pv"]`);
  await expect(tinted('orig').first()).toBeVisible();
  await expect(tinted('plain').first()).toBeVisible();
  expect(await tinted('orig').count()).toBe(await tinted('plain').count());
  const bg = l => l.evaluate(e => getComputedStyle(e).backgroundColor);
  const transparent = v => v === 'transparent' || /rgba\(.*,\s*0\)$/.test(v);
  expect(transparent(await bg(tinted('plain').first()))).toBe(false);
  await page.locator('#det button.chip', { hasText: 'Show links' }).click();
  await expect(page.locator('#det .det, #det > .det').first()).toHaveClass(/nolinks/);
  expect(transparent(await bg(tinted('plain').first()))).toBe(true);
  expect(transparent(await bg(tinted('orig').first()))).toBe(true);
});
