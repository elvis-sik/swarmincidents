const {test,expect,load,siteData}=require('./fixtures');
const updates=require('../updates.json').updates;
const data=siteData();
const incident='aisi-cyber-range';
const title=data.incidents.find(e=>e.id===incident).title;
const dialog=page=>page.getByRole('dialog',{name:'Card history',exact:true});
const selectCard=async(page,id)=>{await page.getByRole('button',{name:'Close details',exact:true}).click();await page.locator(`[data-inc-row="${id}"]`).first().click()};
const open=async page=>{await page.locator('#det').getByRole('button',{name:'View changes',exact:true}).click();await expect(dialog(page)).toBeVisible()};

test('card exposes latest published date and lazy history with real before/after details',async({page})=>{
 let requests=0;await page.route('**/updates.json',r=>{requests++;return r.fulfill({json:{updates}})});
 await load(page,incident);
 await expect(page.locator('#det .catalog-updated')).toContainText('Updated Oct 26, 2026');
 await expect(page.locator('#det .catalog-updated time')).toHaveAttribute('datetime',data.catalogUpdated[incident].published);
 await expect(page.locator('#det .catalog-added')).toHaveText('Added to catalog Oct 7, 2026');
 expect(requests).toBe(0);
 await open(page);const modal=dialog(page),entries=updates.filter(u=>u.incident===incident).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)||a.id.localeCompare(b.id));
 await expect(modal.locator('.card-history-entry')).toHaveCount(entries.length);
 expect(await modal.locator('.card-history-entry').evaluateAll(es=>es.map(e=>e.dataset.historyUpdate))).toEqual(entries.map(u=>u.id));
 for(const u of entries){const row=modal.locator(`[data-history-update="${u.id}"]`);await expect(row).toContainText(u.title);await expect(row).toContainText(u.summary)}
 await expect(modal).toContainText('publication time unverified');
 await modal.locator('.card-history-change').first().locator('summary').first().click();
 await expect(modal.locator('.card-history-diff').first()).toContainText('Before');await expect(modal.locator('.card-history-diff').first()).toContainText('After');
 await expect(modal.locator('.card-history-diff').first()).toContainText('Incident account');
 await page.keyboard.press('ArrowDown');await expect(page.locator('#det-title')).toHaveText(title);
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');expect(await modal.evaluate(e=>e.contains(document.activeElement)||document.activeElement===document.body)).toBe(true)}
 await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(page.locator('#det-title')).toHaveText(title);
 await expect(page.locator('#det .card-history-trigger')).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
 await expect(page).toHaveURL(new RegExp('#'+incident+'$'));expect(requests).toBe(1);
});

test('history is cached across cards and a new listing has one honest addition entry',async({page})=>{
 let requests=0;await page.route('**/updates.json',r=>{requests++;return r.fulfill({json:{updates}})});
 await load(page,incident);await open(page);await expect(dialog(page).locator('.card-history-entry')).toHaveCount(3);
 await dialog(page).getByRole('button',{name:'Close card history',exact:true}).click();
 const id='cohere-qwen-unrequested-upload';await selectCard(page,id);await open(page);
 await expect(dialog(page).locator('.card-history-entry')).toHaveCount(1);await expect(dialog(page)).toContainText('Added to catalog');
 await expect(dialog(page)).not.toContainText(title);expect(requests).toBe(1);
 await page.mouse.click(2,2);await expect(dialog(page)).not.toBeVisible();await expect(page.locator('#det .card-history-trigger')).toBeFocused();
});

test('failed history loading offers retry without inventing an empty history',async({page})=>{
 let requests=0;await page.route('**/updates.json',r=>r.fulfill({json:++requests===1?{}:{updates}}));
 await load(page,incident);await open(page);await expect(dialog(page)).toContainText('Card history could not be loaded.');
 await expect(dialog(page)).not.toContainText('No published changes');
 await dialog(page).getByRole('button',{name:'Try again',exact:true}).click();await expect(dialog(page).locator('.card-history-entry')).toHaveCount(3);expect(requests).toBe(2);
});

test('a late response cannot replace the history of another card',async({page})=>{
 let release;const gate=new Promise(resolve=>{release=resolve});
 await page.route('**/updates.json',async r=>{await gate;await r.fulfill({json:{updates}})});
 await load(page,incident);await open(page);await expect(dialog(page)).toContainText('Loading card history…');
 await page.keyboard.press('Escape');await expect(dialog(page)).not.toBeVisible();
 const id='cohere-qwen-unrequested-upload';await selectCard(page,id);await open(page);release();
 await expect(dialog(page).locator('.card-history-entry')).toHaveCount(1);await expect(dialog(page)).not.toContainText(title);
});

test('history dates use Los Angeles calendar dates and empty history is explicit',async({page})=>{
 const single={...updates.find(u=>u.incident===incident),published:'2026-10-23T01:00:00Z'};
 await page.route('**/updates.json',r=>r.fulfill({json:{updates:[single]}}));
 await load(page,incident);await open(page);await expect(dialog(page).locator('.card-history-date time')).toHaveText('Oct 22, 2026');
 await page.keyboard.press('Escape');const id='cohere-qwen-unrequested-upload';await selectCard(page,id);await open(page);
 await expect(dialog(page)).toContainText('No published changes are available for this card yet.');await expect(dialog(page).locator('.card-history-entry')).toHaveCount(0);
});
