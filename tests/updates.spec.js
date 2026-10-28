const {test,expect}=require('./fixtures');
const entries=require('../updates.json').updates;
const catalog=require('../incidents.json');
const developments=entries.filter(u=>u.type==='Update');
const archiveDevelopments=developments.filter(u=>u.freshness==='archive');
const row=page=>page.locator('#rows [data-rsp-row]');
async function pick(page,name,option){
 await page.getByRole('button',{name:new RegExp('^'+name+':')}).click();
 await page.getByRole('listbox',{name,exact:true}).getByRole('option',{name:option,exact:typeof option==='string'}).click();
}

test('Updates and RSS share stable IDs and source-linked detail copy',async({page,request})=>{
 await page.goto('/updates.html',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Updates',exact:true})).toBeVisible();
 await expect(row(page)).toHaveCount(entries.length);
 expect(await row(page).evaluateAll(rows=>rows.map(r=>r.dataset.rspRow))).toEqual(entries.map(u=>u.id));
 expect(await (await request.get('/updates.json')).json()).toEqual({updates:entries});
 const feed=await (await request.get('/feed.xml')).text();
 for(const u of entries){await expect(page.locator(`[data-rsp-row="${u.id}"]`)).toContainText(u.title);expect(feed).toContain('swarmincidents:update:'+u.id);}
 await expect(page.locator('#tabs').getByRole('link',{name:'Subscribe to updates via RSS'})).toBeVisible();
});

test('Amap opens modal details with source links and before/after',async({page},testInfo)=>{
 await page.goto('/updates.html',{waitUntil:'domcontentloaded'});await page.locator('[data-rsp-row="amap-full-report"]').click();
 const detail=page.locator('#det');await expect(detail).toBeVisible();await expect(page.locator('#main')).not.toHaveClass(/open/);
 await expect(detail.getByRole('heading',{name:'What changed'})).toBeVisible();
 const changed=detail.locator('.update-change').filter({has:page.locator('summary').getByText('Incident account',{exact:true})});
 await expect(changed.locator('.update-before')).toContainText('Tencent’s Hy models');await expect(changed.locator('.update-after')).toContainText('Oct. 8');
 await expect(detail.getByRole('link',{name:'View incident',exact:true})).toHaveAttribute('href','/?tags=all#amap-fleet');
 await expect(detail.getByRole('link',{name:'The Swarmchasers report',exact:true})).toHaveAttribute('href','https://swarmcha.se/posts/chinese-agent-fleet-full-report');
 await expect(page).toHaveURL(/#amap-full-report$/);expect(await page.locator('dialog[open]').count()).toBe(1);
 await expect(page.getByRole('dialog',{name:'Full report adds detail on the Amap agent fleet',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close details',exact:true}).click();await expect(detail).not.toBeVisible();
});

test('shared pickers compose type, reporting and models and survive reload',async({page})=>{
 await page.goto('/updates.html',{waitUntil:'domcontentloaded'});await page.getByRole('group',{name:'Update type',exact:true}).getByRole('button',{name:'Developments',exact:true}).click();await expect(row(page)).toHaveCount(developments.length);
 await pick(page,'Reporting','Archive additions');await expect(row(page)).toHaveCount(archiveDevelopments.length);
 await page.reload();await expect(row(page)).toHaveCount(archiveDevelopments.length);await pick(page,'Reporting','Recent & archive');
 await pick(page,'Models',/^Anthropic\b/);await expect(row(page)).toHaveCount(developments.filter(u=>catalog.incidents.find(i=>i.id===u.incident)?.labs.includes('anthropic')).length);
});

test('shared custom date range filters publication dates and persists',async({page})=>{
 await page.goto('/updates.html',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Custom',exact:true}).click();const range=page.getByRole('dialog',{name:'Custom date range'});
 await range.getByLabel('From',{exact:true}).fill('2026-10-13');await range.getByLabel('To',{exact:true}).fill('2026-10-13');await range.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(row(page)).toHaveCount(1);await expect(row(page)).toHaveAttribute('data-rsp-row','urlscan-key-misuse');await page.reload();await expect(row(page)).toHaveCount(1);
 await page.getByRole('button',{name:'Show all dates',exact:true}).click();await expect(row(page)).toHaveCount(entries.length);
});

test('dashboard and Updates have identical width header theme and timeline card styles',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:/Responses/}).click();
 const read=()=>page.evaluate(()=>{const props=(selector,names)=>{const s=getComputedStyle(document.querySelector(selector));return Object.fromEntries(names.map(n=>[n,s[n]]))};return {wrap:props('.wrap',['maxWidth','paddingLeft','paddingRight']),header:props('#top',['paddingTop','paddingBottom','fontSize']),card:props('.r-card',['padding','fontSize','maxWidth','borderRadius']),icon:document.querySelector('#theme-btn').innerHTML}});
 const home=await read();await page.getByRole('navigation',{name:'Follow updates'}).getByRole('link',{name:'Updates',exact:true}).click();await expect(row(page)).toHaveCount(entries.length);await page.getByRole('button',{name:'Timeline',exact:true}).click();expect(await read()).toEqual(home);
 const old=await page.locator('#theme-btn').getAttribute('aria-label');await page.locator('#theme-btn').click();await expect(page.locator('#theme-btn')).not.toHaveAttribute('aria-label',old);
 await page.getByRole('link',{name:'swarms.wiki incidents home',exact:true}).click();await expect(page.locator('#theme-btn')).not.toHaveAttribute('aria-label',old);
});

test('modal card list and narrow layouts remain usable',async({page})=>{
 await page.goto('/updates.html#github-token-added',{waitUntil:'domcontentloaded'});await expect(page.locator('#det')).toContainText('Not yet listed');await page.getByRole('button',{name:'Close details',exact:true}).click();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:920});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.locator('[data-rsp-row="amap-full-report"]').click();expect(await page.locator('#update-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();await page.getByRole('button',{name:'Close details',exact:true}).click();
 }
 await page.getByRole('button',{name:'Card list',exact:true}).click();await expect(page.locator('.update-list-card')).toHaveCount(entries.length);
 await page.getByRole('button',{name:'Timeline',exact:true}).click();await expect(row(page)).toHaveCount(entries.length);
});


test('stats and shell anchors stay in place while Updates defaults to all tags',async({page},testInfo)=>{
 const anchors=()=>page.evaluate(()=>Object.fromEntries(['#top','#stats','#lvl','#app'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{top:r.top,height:r.height}]})));
 await page.goto('/?tags=all');const overview=await anchors();const text=await page.locator('#stats').innerText();
 await page.getByRole('navigation',{name:'Follow updates'}).getByRole('link',{name:'Updates',exact:true}).click();
 await expect(page).toHaveURL(/\/updates.html$/);await expect(row(page)).toHaveCount(entries.length);
 await expect(page.locator('#lvl')).toBeHidden();await expect(page.locator('#lvl')).toBeEmpty();
 await expect.poll(()=>page.locator('#stats').innerText()).toBe(text);await expect(page.locator('.f-tags .pk-btn')).toHaveAccessibleName('Categories: All incidents');
 const updates=await anchors();for(const s of ['#top','#stats','#app']){expect(Math.abs(updates[s].top-overview[s].top),s+' top').toBeLessThanOrEqual(1);if(s!=='#app')expect(Math.abs(updates[s].height-overview[s].height),s+' height').toBeLessThanOrEqual(1);}
 await page.goto('/');await expect(page.locator('.f-tags .pk-btn')).toHaveAccessibleName('Categories: Swarms / fleets');
 await page.getByRole('navigation',{name:'Follow updates'}).getByRole('link',{name:'Updates',exact:true}).click();
 await expect(row(page)).toHaveCount(entries.length);await expect(page.locator('.f-tags .pk-btn')).toHaveAccessibleName('Categories: All incidents');
});

test('all update type filters are at the top, keyboard accessible and persistent',async({page})=>{
 await page.goto('/updates.html');const types=page.getByRole('group',{name:'Update type',exact:true});
 await expect(types.getByRole('button')).toHaveCount(4);await expect(page.locator('#foot button')).toHaveCount(0);
 await expect(types.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const [label,n] of [['New listings',entries.filter(u=>u.type==='New incident').length],['Developments',developments.length],['Corrections',entries.filter(u=>u.type==='Correction').length]]){
  await types.getByRole('button',{name:label,exact:true}).click();await expect(row(page)).toHaveCount(n);
  await page.reload();await expect(types.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');await expect(row(page)).toHaveCount(n);
  await types.getByRole('button',{name:'All',exact:true}).click();await expect(row(page)).toHaveCount(entries.length);
 }
 const dev=types.getByRole('button',{name:'Developments',exact:true});await dev.focus();await page.keyboard.press('Space');await expect(row(page)).toHaveCount(developments.length);await expect(dev).toBeFocused();
});

test('all top type options fit at narrow widths and explicit tag scope still works',async({page})=>{
 await page.goto('/updates.html');
 for(const width of [320,390,768,1000,1440]){
  await page.setViewportSize({width,height:920});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const fits=await page.locator('.update-types').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('button')].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left&&x.right<=r.right+1&&b.scrollWidth<=b.clientWidth+1;});});expect(fits).toBe(true);
 }
 await page.goto('/updates.html?tags=benchmark');const n=entries.filter(u=>catalog.incidents.find(i=>i.id===u.incident)?.category==='benchmark-integrity').length;await expect(row(page)).toHaveCount(n);
 await page.reload();await expect(row(page)).toHaveCount(n);
});


test('Dates leads flowing filters, and Latest updates opens the full history',async({page})=>{
 await page.goto('/updates.html');
 expect(await page.locator('#bar-r>.fgroup').first().innerText()).toMatch(/^Dates/);
 for(const width of [1440,1280,1000,768,390,320]){
  await page.setViewportSize({width,height:920});
  const flow=await page.locator('.updates-filters').evaluate(el=>{
   const items=[...el.querySelectorAll('.fgroup')].map(x=>x.getBoundingClientRect());
   return {overflow:document.documentElement.scrollWidth>innerWidth,tops:items.map(x=>x.top)};
  });
  expect(flow.overflow).toBe(false);
  if(width>=1280)expect(Math.max(...flow.tops)-Math.min(...flow.tops)).toBeLessThanOrEqual(3);
 }
 await page.goto('/');await expect(page.getByRole('link',{name:'Latest updates',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Latest updates',exact:true}).click();await expect(page).toHaveURL(/updates.html$/);await expect(row(page)).toHaveCount(entries.length);
});

test('historical launch and corrections expose provenance and original snapshots',async({page})=>{
 await page.goto('/updates.html#history-b0218e4-hugging-face');const detail=page.locator('#det');
 await expect(detail).toContainText('Reconstructed history');await expect(detail).toContainText('not a verified deployment time');
 await expect(detail.getByRole('link',{name:'View historical revision ↗'})).toHaveAttribute('href',/github.com\/elvis-sik\/swarmincidents\/commit\/b0218e4/);
 await expect(detail).toContainText('Not yet listed');await expect(detail.locator('.update-after').first()).toContainText('During a cyber-capability evaluation');
});


test('readable card list is the default, with full summaries and remembered layout choice',async({page})=>{
 await page.goto('/updates.html');
 await expect(page.getByRole('button',{name:'Card list',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#view table')).toHaveCount(0);
 const cards=page.locator('.update-list-card');await expect(cards).toHaveCount(entries.length);
 await expect(cards.first().locator('.update-card-summary')).toHaveText(entries[0].summary);
 await expect(cards.first().locator('time')).toHaveAttribute('datetime',entries[0].published);
 expect(await cards.first().evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(768);
 await page.getByRole('button',{name:'Timeline',exact:true}).click();await page.reload();
 await expect(page.getByRole('button',{name:'Timeline',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.r-card')).toHaveCount(entries.length);
 await page.getByRole('button',{name:'Card list',exact:true}).click();await page.reload();await expect(cards).toHaveCount(entries.length);
 await page.goto('/');await expect(page.getByRole('button',{name:'Chart',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('card list supports keyboard details, chronological sorting and empty filters',async({page})=>{
 await page.goto('/updates.html');const cards=page.locator('.update-list-card');
 await cards.first().focus();await page.keyboard.press('Enter');await expect(page.locator('#det-title')).toHaveText(entries[0].title);
 await page.getByRole('button',{name:'Close details',exact:true}).click();
 await page.getByRole('group',{name:'Sort updates',exact:true}).getByRole('button').click();
 const expected=[...entries].sort((a,b)=>Date.parse(a.published)-Date.parse(b.published)||a.id.localeCompare(b.id));
 await expect(cards.first()).toHaveAttribute('data-rsp-row',expected[0].id);
 await page.getByRole('group',{name:'Update type',exact:true}).getByRole('button',{name:'Corrections',exact:true}).click();
 await pick(page,'Reporting','Newly public information');await expect(cards).toHaveCount(0);await expect(page.locator('#view')).toContainText('No updates match these filters.');
});


test('modal keeps cards stationary, restores focus and has a primary incident action',async({page})=>{
 // Retirements have no active-incident action; exercise this positive control on a live listing.
 const active=entries.find(u=>catalog.incidents.some(i=>i.id===u.incident));
 await page.goto('/updates.html');const card=page.locator(`.update-list-card[data-rsp-row="${active.id}"]`);
 await card.scrollIntoViewIfNeeded();await card.focus();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const before=await card.boundingBox(),scroll=await page.evaluate(()=>scrollY);
 await card.click();const modal=page.locator('#update-dialog');await expect(modal).toBeVisible();
 const after=await card.boundingBox();expect(Math.abs(after.x-before.x)).toBeLessThanOrEqual(1);expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(1);expect(after.width).toBe(before.width);
 expect(Math.abs(await page.evaluate(()=>scrollY)-scroll)).toBeLessThanOrEqual(1);await expect(page.locator('#main')).not.toHaveClass(/open/);
 expect(await card.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
 const action=modal.getByRole('link',{name:'View incident',exact:true});await expect(action).toHaveClass(/primary/);
 await expect(action).toHaveAttribute('href','/?tags=all#'+active.incident);
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.querySelector('#update-dialog').contains(document.activeElement)||document.activeElement===document.body)).toBe(true)}
 await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(card).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
});

test('modal backdrop closes details without moving or scrolling the list',async({page})=>{
 await page.goto('/updates.html');const card=page.locator('.update-list-card').first();await card.click();await expect(page.locator('#update-dialog')).toBeVisible();
 await page.mouse.click(2,2);await expect(page.locator('#update-dialog')).not.toBeVisible();await expect(card).toBeFocused();
});
