const {test, expect, load} = require('./fixtures');
test.use({expectedHttpError:'https://analytics.swarmincidents.com/api/report'});

async function mockService(page, status = 200) {
  await page.route('https://analytics.swarmincidents.com/api/report/config', route => route.fulfill({json:{siteKey:'test-only'},headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({contentType:'application/javascript', body:'window.turnstile={render:()=>0,getResponse:()=>"test-only-token",reset:()=>{}};'}));
  await page.route('https://analytics.swarmincidents.com/api/report', route => route.fulfill({status,json:status===200?{ok:true}:{error:'Could not send. Please try again.'}, headers:{'Access-Control-Allow-Origin':'*'}}));
}
test('Report is in the header; dialog focuses the message and Escape restores focus', async ({page}) => {
  await mockService(page); await load(page);
  await page.getByRole('button',{name:'Report',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Report an incident'})).toBeVisible();
  await expect(page.locator('#report-message')).toBeFocused();
  await expect(page.locator('#report a')).toHaveAttribute('href','mailto:report@swarmincidents.com');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.locator('#report')).not.toBeVisible();
  await expect(page.locator('#report-btn')).toBeFocused();
});
test('Report submits optional email and source links, clears only after confirmed success', async ({page}) => {
  await mockService(page); await load(page); await page.locator('#report-btn').click();
  await page.locator('#report-message').fill('A test correction'); await page.locator('#report-sources').fill('https://example.com/evidence');
  await page.locator('#report-email').fill('reader@example.com');
  const sent = page.waitForRequest('https://analytics.swarmincidents.com/api/report');
  await page.getByRole('button',{name:'Send report',exact:true}).click();
  const payload = (await sent).postDataJSON(); expect(payload.email).toBe('reader@example.com'); expect(payload.message).toBe('A test correction');
  await expect(page.locator('#report-status')).toContainText('sent to the editor'); await expect(page.locator('#report-message')).toHaveValue('');
});
test('failed submission preserves draft and retry uses the same id', async ({page}) => {
  await mockService(page,502); await load(page); await page.locator('#report-btn').click(); await page.locator('#report-message').fill('Keep this draft');
  const attempts = []; page.on('request', r => {if(r.url()==='https://analytics.swarmincidents.com/api/report' && r.method()==='POST') attempts.push(r.postDataJSON());});
  await page.getByRole('button',{name:'Send report',exact:true}).click(); await expect(page.locator('#report-status')).toContainText('Could not send');
  await expect(page.locator('#report-message')).toHaveValue('Keep this draft');
  await page.getByRole('button',{name:'Send report',exact:true}).click(); await expect(page.locator('#report-send')).toBeEnabled();
  expect(attempts.length).toBe(2); expect(attempts[0].id).toBe(attempts[1].id);
});
test('About opens the report form', async ({page}) => {
  await mockService(page); await load(page); await page.locator('#about-btn').click(); await page.locator('#about-report').click();
  await expect(page.locator('#about')).not.toBeVisible(); await expect(page.locator('#report')).toBeVisible();
});
