// A report's 'updated' stamp must not manufacture a first disclosure or a delay.
const {test,expect,load,siteData}=require('./fixtures');
const fs=require('fs');
const path=require('path');

test('report-update date stays out of disclosure claims and calculated delay',async({page})=>{
  const data=siteData();
  const incident=data.incidents.find(e=>e.id==='aisi-cyber-range');
  const main=incident.reveals.find(r=>!r.minor);
  main.date_basis='report-updated';
  let html=fs.readFileSync(path.join(__dirname,'../docs/index.html'),'utf8');
  html=html.replace(/const DATA = .*;\n/,'const DATA = '+JSON.stringify(data).replace(/<\//g,'<\\/')+';\n');
  await page.route(url=>url.pathname==='/',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await load(page,incident.id);
  await expect(page.locator('#det .det-top')).toContainText('Report updated');
  await expect(page.locator('#det .tags')).toContainText('First disclosure date unknown');
  await expect(page.locator('#det .tags')).not.toContainText('day delay');
  const row=page.locator(`[data-inc-row="${incident.id}"]`);
  await expect(row.locator('.m')).toContainText('first disclosure unknown');
  await expect(row.locator('.mk-gap')).toHaveCount(0);
  await expect(row).not.toHaveAttribute('aria-label',/disclosed.*days later/);
  const events=await row.locator('[data-day-events]').evaluateAll(nodes=>nodes.flatMap(n=>JSON.parse(n.dataset.dayEvents)));
  expect(events.some(e=>e.label.startsWith('Report updated'))).toBe(true);
  expect(events.some(e=>e.label.startsWith('First public report'))).toBe(false);
  await page.getByRole('button',{name:'Close details',exact:true}).click();
  await page.getByRole('button',{name:'Table',exact:true}).click();
  await expect(page.locator(`tr[data-inc-row="${incident.id}"]`).locator('td').nth(2)).toHaveText('Unknown');
});

test('known first disclosure retains its label and delay as a positive control',async({page})=>{
  await load(page,'aisi-cyber-range');
  await expect(page.locator('#det .det-top')).toContainText('Disclosed');
  await expect(page.locator('#det .tags')).toContainText('10-day delay');
  await page.getByRole('button',{name:'Close details',exact:true}).click();
  await page.getByRole('button',{name:'Table',exact:true}).click();
  await expect(page.locator('tr[data-inc-row="aisi-cyber-range"] td').nth(2)).toHaveText('Aug 4');
  await expect(page.locator('tr[data-inc-row="aisi-cyber-range"] td').nth(3)).toHaveText('10 d');
});
