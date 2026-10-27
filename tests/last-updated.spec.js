// @ts-check
const {test, expect, load, siteData, isMobile} = require('./fixtures');

test('Updated remains available and reverses; reload restores disclosure default', async ({page}) => {
  const data=siteData();
  await page.goto('/?tags=all');
  await expect(page.getByRole('button',{name:'Sort by disclosed, newest first',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Sort by updated',exact:true}).click();
  const ids=await page.locator('#view [data-inc-row]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-inc-row')));
  expect(ids.length).toBe(data.incidents.length);
  const times=ids.map(id=>data.catalogUpdated[id].timestamp);
  expect(times).toEqual([...times].sort((a,b)=>b-a));
  // A known older incident with a recent correction sorts using the correction.
  expect(data.catalogUpdated['aisi-cyber-range'].timestamp).toBeGreaterThan(Date.parse(data.catalogAdded['aisi-cyber-range'].added_at)/1000);
  await page.getByRole('button',{name:'Sort by updated, newest first',exact:true}).click();
  expect(await page.locator('#view [data-inc-row]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-inc-row')))).toEqual([...ids].reverse());
  await page.getByRole('button',{name:'Sort by started',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sort by started, newest first',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.getByRole('button',{name:'Sort by disclosed, newest first',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.setViewportSize({width:320,height:812});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const box=await page.getByRole('group',{name:'Sort incidents',exact:true}).boundingBox();
  expect(box.x+box.width).toBeLessThanOrEqual(320);
});

test('table exposes the publication date and can sort by it', async ({page}, testInfo) => {
  test.skip(isMobile(testInfo), 'Table headers are hidden in the existing phone card layout.');
  await page.addInitScript(()=>localStorage.setItem('viewModes',JSON.stringify({timeline:'table'})));
  await load(page);
  await expect(page.locator('th[aria-sort="descending"]')).toContainText('Disclosed');
  await page.locator('th').getByRole('button',{name:/^Started/}).click();
  await page.locator('th').getByRole('button',{name:/^Updated/}).click();
  await expect(page.locator('th[aria-sort="descending"]')).toContainText('Updated');
  const ids=await page.locator('#view [data-inc-row]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-inc-row')));
  const data=siteData(), times=ids.map(id=>data.catalogUpdated[id].timestamp);
  expect(times).toEqual([...times].sort((a,b)=>b-a));
});
