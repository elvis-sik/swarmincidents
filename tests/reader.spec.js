// @ts-check
// The "Inside an incident" reader: section nav, the context panel, the wording control and the card's tag filters.
const { test, expect, load, wikiData } = require('./fixtures');

const HOME = 'dse~DataUSACashiersMastersSequenceLive5';
const homePosts = () => wikiData().posts.filter(p => p.page === HOME);
/** A plain stretch of the posted text (no heading, bold or link markup), as the feed renders it. */
const plainBit = text => (text.split('\n').find(l => l.trim() && !/^=|\*|\[\[/.test(l)) || '').trim().slice(0, 24);

test('the nav crumb "Inside an incident" opens the chooser', async ({ page }) => {
  await load(page, 'wikis/posts');
  const lvl = page.locator('#lvl');
  await expect(lvl.getByRole('button', { name: /^18,000 posts/ })).toHaveAttribute('aria-current', 'true');
  await lvl.getByRole('button', { name: 'Inside an incident' }).click();
  await expect(page).toHaveURL(/#inside$/);
  await expect(page.locator('#view table.chooser')).toBeVisible();
  await expect(lvl.getByRole('button', { name: 'Inside an incident' })).toHaveAttribute('aria-current', 'true');
});

test('the context panel is open on entry, folds to one line and remembers it', async ({ page }) => {
  await load(page, 'wikis/posts');
  const ctx = page.locator('.ctx');
  await expect(ctx.locator('.ctx-b')).toBeVisible();
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

test('the wording control: Chatty by default, Original shows the posted text, and it is remembered', async ({ page }) => {
  const post = homePosts().find(p => p.reading && p.reading.trim() !== p.text.trim());
  test.skip(!post, 'no post with a plain reading on the home thread');
  await load(page, 'wikis/posts');
  const seg = page.getByRole('group', { name: 'Wording' });
  await expect(seg.getByRole('button', { name: 'Chatty' })).toHaveAttribute('aria-pressed', 'true');
  const body = page.locator(`.msg[data-post-row="${post.id}"] .msg-b`);
  const retold = (post.chat || post.reading).replace(/@/g, '').slice(0, 24);
  if (!post.chat) await expect(body).toContainText(retold);
  await expect(page.locator('.retold')).toBeVisible();
  await seg.getByRole('button', { name: 'Original' }).click();
  await expect(seg.getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true');
  await expect(body).toContainText(plainBit(post.text));
  await expect(page.locator('.retold')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('group', { name: 'Wording' }).getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`.msg[data-post-row="${post.id}"] .msg-b`)).toContainText(plainBit(post.text));
});

test('the writer tag on a card filters the feed by that writer', async ({ page }) => {
  const posts = homePosts(), counts = new Map();
  posts.forEach(p => counts.set(p.who, (counts.get(p.who) || 0) + 1));
  const post = posts.find(p => counts.get(p.who) > 1 && counts.get(p.who) < posts.length);
  test.skip(!post, 'no writer with several posts on the home thread');
  await load(page, 'wikis/posts/' + post.id.replace(/^dse~/, ''));
  await expect(page.locator(`.msg[data-post-row="${post.id}"]`)).toHaveAttribute('aria-selected', 'true');
  const tag = page.locator('#det .tags button.tag').first();
  await expect(tag).toHaveAttribute('aria-pressed', 'false');
  await tag.click();
  await expect(page.locator('#det .tags button.tag').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.msg')).toHaveCount(counts.get(post.who));
  await page.locator('#det .tags button.tag').first().click();
  await expect(page.locator('.msg')).toHaveCount(posts.length);
});
