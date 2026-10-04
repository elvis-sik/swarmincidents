// @ts-check
// The "Inside an incident" reader: the breadcrumb with its thread picker, the context panel, the wording axis,
// the feed's markup and multi-post saves, and the slimmer card (writer line, Details).
const { test, expect, load, wikiData } = require('./fixtures');

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

test('the card: a writer line that filters the feed, no tag row, and Details closed by default and remembered', async ({ page }) => {
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
  // Details: closed by default; its sentence links filter the feed; the open state is remembered
  const more = page.locator('#det details.more');
  await expect(more).not.toHaveAttribute('open', /.*/);
  await expect(more.locator('.about')).toBeHidden();
  await more.locator('summary').click();
  await expect(more.locator('.about')).toContainText(`question`);
  await expect(more.locator('h3', { hasText: 'Who wrote it' })).toBeVisible();
  await page.reload();
  await expect(page.locator('#det details.more')).toHaveAttribute('open', /.*/);
});
