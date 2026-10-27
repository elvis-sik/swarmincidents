const {test,expect,load,siteData,isMobile}=require('./fixtures');
const data=siteData();
const swarm=data.incidents.filter(e=>e.agent_group);
const main=e=>e.reveals.find(r=>!r.minor);
const rows=p=>p.locator('#view [data-inc-row]');
const ids=p=>rows(p).evaluateAll(es=>es.map(e=>e.dataset.incRow).sort());
const tag=p=>p.locator('.f-tags .pk-btn');
async function openTags(p){if(await tag(p).getAttribute('aria-expanded')!=='true')await tag(p).click();}
async function choose(p,id,on){await openTags(p);const o=p.locator(`.pk-pop[data-picker="Categories"] .pk-opt[data-value="${id}"]`);if((await o.getAttribute('aria-selected')==='true')!==on)await o.click();}
async function checkIds(p,entries){await expect(rows(p)).toHaveCount(entries.length);expect(await ids(p)).toEqual(entries.map(e=>e.id).sort());}

test('tags default to swarms, combine with OR, persist on reload, and can be cleared',async({page})=>{
 await load(page);await checkIds(page,swarm);
 await expect(tag(page)).toContainText('Swarms / fleets');
 await choose(page,'benchmark',true);
 await expect(tag(page)).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('listbox',{name:'Categories',exact:true})).toBeFocused();
 const union=data.incidents.filter(e=>e.agent_group||e.category==='benchmark-integrity');
 await checkIds(page,union);await expect(tag(page)).toHaveAccessibleName('Categories: Swarms / fleets, Benchmark integrity');await expect(tag(page)).toContainText('+1');
 await page.reload();await checkIds(page,union);
 await openTags(page);await page.locator('.pk-pop[data-picker="Categories"] .pk-opt[data-value=""]').click();await page.keyboard.press('Escape');
 await checkIds(page,data.incidents);await page.reload();await checkIds(page,data.incidents);
 expect(new URL(page.url()).searchParams.get('tags')).toBe('all');
});

test('tag picker matches the existing dropdown and supports multi-select keyboard, Escape and outside dismissal',async({page})=>{
 await load(page);await tag(page).focus();await page.keyboard.press('Enter');
 const list=page.getByRole('listbox',{name:'Categories',exact:true});await expect(list).toHaveAttribute('aria-multiselectable','true');
 await page.keyboard.press('End');await page.keyboard.press('Space');
 await expect(page.locator('.pk-pop[data-picker="Categories"] .pk-opt[data-value="benchmark"]')).toHaveAttribute('aria-selected','true');
 await expect(list).toBeFocused();await page.keyboard.press('Escape');
 await expect(tag(page)).toHaveAttribute('aria-expanded','false');await expect(tag(page)).toBeFocused();
 await tag(page).click();await page.locator('h1').click();await expect(page.locator('.pk-pop')).toHaveCount(0);
});

test('tags apply across overview tabs and compose with models, dates and data',async({page})=>{
 await load(page);
 await page.getByRole('tab',{name:/^Affected/}).click();
 await expect(page.locator('[data-ent-row]')).toHaveCount(data.affected.filter(a=>a.inv.some(v=>swarm.some(e=>e.id===v.inc))).length);
 await page.getByRole('tab',{name:/^Responses/}).click();
 await expect(page.locator('[data-rsp-row]')).toHaveCount(data.responses.filter(r=>r.inc.some(id=>swarm.some(e=>e.id===id))).length);
 await page.getByRole('tab',{name:/^Timeline/}).click();
 await page.locator('.f-models .pk-btn').click();await page.getByRole('option',{name:/^Anthropic/}).click();
 await checkIds(page,swarm.filter(e=>e.labs.includes('anthropic')));
 await page.getByRole('checkbox',{name:'Dataset available',exact:true}).check();await expect(rows(page)).toHaveCount(0);
 await page.getByRole('checkbox',{name:'Dataset available',exact:true}).uncheck();
 await page.getByRole('group',{name:'Date range',exact:true}).getByRole('button',{name:'30 days',exact:true}).click();await expect(rows(page)).toHaveCount(0);
});

const features={
 activity:e=>e.activity.length>0,
 approx:e=>e.activity.some(a=>a.approx),
 knew:e=>!!e.knew,
 // An article update can be dated even when its first disclosure is unknown.
 gap:e=>{if(main(e).date_basis==='report-updated')return false;const acts=e.activity.filter(a=>!a.sub);return acts.length&&main(e).d>acts.map(a=>a.e).sort().pop();},
 additional:e=>e.reveals.some(r=>r.minor||r.private)
};
for(const feature of Object.keys(features))test(`legend ${feature} filters whole incidents by evidence, including after reload`,async({page})=>{
 await page.goto('/?tags=all');const input=page.locator(`#foot button[data-filter="${feature}"]`);
 await input.click();await checkIds(page,data.incidents.filter(features[feature]));await expect(input).toBeFocused();
 await expect(page.locator('#view')).not.toHaveClass(/emph/);
 await page.reload();await checkIds(page,data.incidents.filter(features[feature]));await expect(input).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Table',exact:true}).click();await checkIds(page,data.incidents.filter(features[feature]));
 await page.getByRole('button',{name:'Clear legend filters',exact:true}).click();await checkIds(page,data.incidents);
});

test('features combine with AND; first-public reporters combine with OR',async({page})=>{
 await page.goto('/?tags=all');
 for(const f of ['activity','gap'])await page.locator(`#foot button[data-filter="${f}"]`).click();
 for(const f of ['gov','lab'])await page.locator(`#foot button[data-filter="${f}"]`).click();
 const expected=data.incidents.filter(e=>features.activity(e)&&features.gap(e)&&['gov','lab'].includes(main(e).by));
 await checkIds(page,expected);await page.reload();await checkIds(page,expected);
 await expect(page.locator('#foot')).toHaveClass(/timeline-foot/);
 expect(await page.locator('#foot > .legend-row').count()).toBe(2);
 expect(await page.getByRole('checkbox',{name:'First public report',exact:true}).count()).toBe(0);
});

test('same-day reports use one counted marker at the exact date with a combined tooltip',async({page},info)=>{
 await page.goto('/?tags=all');
 await page.getByRole('group',{name:'Date range',exact:true}).getByRole('button',{name:'90 days',exact:true}).click();
 const group=page.locator('[data-inc-row="claude-philadelphia-tip"] .event-cluster.same-day');
 await expect(group).toHaveAttribute('data-count','2');await expect(group.locator('.event-count')).toHaveText('2');
 const markers=JSON.parse(await group.getAttribute('data-markers'));expect(new Set(markers.map(p=>p.x)).size).toBe(1);
 await expect(group.locator('.event-preview')).toHaveCount(2);
 if(isMobile(info)){
  await group.locator(':scope > .hit').tap();await expect(page.locator('#pane')).toHaveClass(/\bopen\b/);await expect(page.locator('#det .event-focused')).toHaveCount(2);
  await expect(page.locator('#det .event-focused').filter({hasText:'Philadelphia police'})).toBeVisible();await expect(page.locator('#det .event-focused.g-lab')).toBeVisible();
 }else{
  await group.locator(':scope > .hit').hover();await expect(page.locator('#tip .tip-event')).toHaveCount(2);
  await expect(page.locator('#tip')).toContainText('Philadelphia police');await expect(page.locator('#tip')).toContainText('Anthropic');
  await group.locator(':scope > .hit').click();
  const expanded=page.locator('[data-inc-row="claude-philadelphia-tip"] .event-cluster[aria-expanded="true"]');
  await expect(expanded).toHaveCount(1);await expect(page.locator('#det .event-focused')).toHaveCount(2);
  await expanded.locator(':scope > .hit').click();await expect(page.locator('#main')).toHaveClass(/\bopen\b/);await expect(page.locator('.cluster-details')).toHaveCount(0);await expect(page.locator('#det .event-focused')).toHaveCount(2);
 }

});

test('nearby dates group by screen space, list every date, and separate when zoomed',async({page},info)=>{
 await page.goto('/?tags=all');const row=page.locator('[data-inc-row="amap-fleet"]');const cluster=row.locator('.event-cluster');
 await expect(cluster).toHaveCount(1);await expect(cluster).toHaveAttribute('data-count','4');await expect(cluster.locator('.event-count')).toHaveText('4');
 const dates=JSON.parse(await cluster.getAttribute('data-dates'));expect(dates).toEqual(['2026-10-04','2026-10-05','2026-10-09','2026-10-14']);
 if(isMobile(info)){
  await cluster.locator(':scope > .hit').tap();await expect(page.locator('#det .event-focused')).toHaveCount(4);
  for(const report of data.incidents.find(e=>e.id==='amap-fleet').reveals)await expect(page.locator('#det .event-focused').filter({hasText:report.text})).toHaveCount(1);
  await page.getByRole('button',{name:'Close details',exact:true}).click();
 }else{
  // Updated ordering places older listings below the fold. Settle the scroll before hovering:
  // the page deliberately dismisses tooltips on scroll.
  await cluster.scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await cluster.locator(':scope > .hit').hover();
  await expect(page.locator('#tip')).toBeVisible();
  await expect(page.locator('#tip .tip-day')).toHaveText(['Oct 4, 2026','Oct 5, 2026','Oct 9, 2026','Oct 14, 2026']);
  await expect.poll(()=>page.locator('#tip').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=7&&r.top>=7&&r.right<=innerWidth-7&&r.bottom<=innerHeight-7;})).toBe(true);
  for(const report of data.incidents.find(e=>e.id==='amap-fleet').reveals)await expect(page.locator('#tip')).toContainText(report.text);
 }
 await page.getByRole('button',{name:'Custom',exact:true}).click();const range=page.getByRole('dialog',{name:'Custom date range'});
 // The lane labels reserve horizontal space; zoom enough to separate adjacent days on iPhone.
 await range.getByLabel('From',{exact:true}).fill('2026-10-03');await range.getByLabel('To',{exact:true}).fill('2026-10-14');await range.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(row.locator('.event-cluster')).toHaveCount(0);await expect(row.locator('.date-cluster')).toHaveCount(4);
});

test('every report and discovery remains represented once and visual markers do not overlap',async({page})=>{
 await page.goto('/?tags=all');
 const check=async()=>{
 const actual=await rows(page).evaluateAll(es=>es.map(row=>({id:row.dataset.incRow,groups:[...row.querySelectorAll('.date-cluster')].map(g=>({markers:JSON.parse(g.dataset.markers),count:Number(g.dataset.count),box:(()=>{const r=g.querySelector('.event-capsule,.mk').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()}))})));
 for(const row of actual){
  const e=data.incidents.find(e=>e.id===row.id);const expected=[...e.reveals.map(r=>({date:r.d,kind:'report'})),...(e.knew?[{date:e.knew.d,kind:'knew'}]:[])];
  const asKey=p=>p.date+':'+p.kind;
  expect(row.groups.flatMap(g=>g.markers).map(asKey).sort(),row.id).toEqual(expected.map(asKey).sort());
  for(const g of row.groups)expect(g.count).toBe(g.markers.length);
  for(let i=0;i<row.groups.length;i++)for(let j=i+1;j<row.groups.length;j++){
   const a=row.groups[i].box,b=row.groups[j].box;const overlap=Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
   expect(overlap,row.id+' markers overlap').toBe(false);
  }
 }
 };
 for(const width of [1440,1000,390]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.querySelector('#view').clientWidth)).toBeLessThan(width);await check();}
});

test('filters keep labels attached and checkbox descriptions self-contained and labels stay contained in narrow charts',async({page},info)=>{
 await page.goto('/?tags=all#o3-metr-reward-hacking');
 for(const width of [1440,1000,390]){
  await page.setViewportSize({width,height:900});
  const row=page.locator('[data-inc-row="o3-metr-reward-hacking"]');await expect(row.locator('.m')).toContainText('Activity dates not disclosed');
  // Chart reflow and the existing drawer animation settle asynchronously after resizing.
  await expect.poll(()=>row.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('.m').getBoundingClientRect();return b.left>=a.left&&b.right<=a.right+1&&document.documentElement.scrollWidth<=innerWidth;}),{message:`label and page containment at ${width}px`}).toBe(true);
 }
 if(!isMobile(info)){
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Close details',exact:true}).click();
  await expect(page.locator('.f-status .flabel,.f-data .flabel')).toHaveCount(0);
  const gaps=await page.locator('.bar-r > .fgroup').evaluateAll(es=>es.map(e=>e.children[1].getBoundingClientRect().left-e.children[0].getBoundingClientRect().right));
  for(const gap of gaps)expect(gap).toBeCloseTo(7,0);
 }
});

test('legacy scope links remain valid and outside-tag deep links widen scope',async({page})=>{
 await page.goto('/?agents=all');await checkIds(page,data.incidents);
 await page.goto('/?tags=swarms#dns-chatbot');await expect(page.locator('#det-title')).toHaveText('DNS tunnel to an outside chatbot');
 expect(new URL(page.url()).searchParams.get('tags')).toBe('all');
 if(await page.locator('#scrim').evaluate(el=>getComputedStyle(el).pointerEvents==='auto'))await page.getByRole('button',{name:'Close details',exact:true}).click();
 await page.getByRole('link',{name:'Swarm Incidents home'}).click();await checkIds(page,swarm);
});

test('legend uses compact icon buttons and Responses headings contain no colored key',async({page},info)=>{
 await load(page);await expect(page.locator('#foot input[type=checkbox]')).toHaveCount(0);
 await expect(page.locator('#foot').getByRole('button',{name:'Reported activity',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:/^Responses/}).click();
 await expect(page.locator('.rhead .rdot')).toHaveCount(0);
 if(!isMobile(info))await expect(page.locator('.rh-l')).toHaveText('AI developers');
 await expect(page.locator('#foot input[type=checkbox]')).toHaveCount(0);
});


test('event badge previews every hidden type and opens highlighted, fully visible events with expanded marks',async({page},info)=>{
 await page.goto('/?tags=all');const row=page.locator('[data-inc-row="amap-fleet"]');const badge=row.locator('.event-cluster');
 expect(await badge.locator('.event-preview').evaluateAll(es=>es.map(e=>e.dataset.previewBy))).toEqual(['research','press','research','research']);
 await expect(badge).toHaveAccessibleName(/Show 4 timeline events/);
 if(isMobile(info))await badge.locator(':scope > .hit').tap();else{await badge.focus();await page.keyboard.press('Enter');}
 const focused=page.locator('#det .event-focused');await expect(focused).toHaveCount(4);await expect(row.locator('.cluster-details [data-point]')).toHaveCount(4);await expect(badge).toHaveAccessibleName(/Hide 4 timeline events/);
 await expect.poll(()=>focused.evaluateAll(es=>{const pane=document.querySelector('#pane').getBoundingClientRect();return es.every(e=>{const r=e.getBoundingClientRect();return r.top>=pane.top+20&&r.bottom<=pane.bottom-8;});})).toBe(true);
 const runs=await focused.evaluateAll(es=>es.map(e=>({start:e.classList.contains('event-focus-start'),end:e.classList.contains('event-focus-end'),joined:e.nextElementSibling?.classList.contains('event-focused')?Math.abs(e.getBoundingClientRect().bottom-e.nextElementSibling.getBoundingClientRect().top)<1:null})));
 expect(runs.map(r=>[r.start,r.end])).toEqual([[true,false],[false,true],[true,false],[false,true]]);
 for(const run of runs)if(run.joined!==null)expect(run.joined).toBe(true);
 await expect(page.getByRole('button',{name:'Collapse chart events',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Collapse chart events',exact:true}).click();await expect(row.locator('.cluster-details')).toHaveCount(0);await expect(focused).toHaveCount(4);
 await page.getByRole('button',{name:'Show chart events separately',exact:true}).click();await expect(row.locator('.cluster-details [data-point]')).toHaveCount(4);
 const points=await row.locator('.cluster-details [data-point]').evaluateAll(es=>es.map(e=>{const t=e.transform.baseVal.consolidate().matrix;return {date:e.dataset.day,x:t.e,y:t.f};}));
 const markers=JSON.parse(await row.locator('.event-cluster').getAttribute('data-markers'));
 for(const p of points)expect(p.x).toBeCloseTo(markers.find(m=>m.date===p.date).x);
 for(let i=1;i<points.length;i++)expect(points[i].y-points[i-1].y).toBeGreaterThanOrEqual(24);
 if(isMobile(info))await page.getByRole('button',{name:'Close details',exact:true}).click();
 else{
  await badge.locator(':scope > .hit').click();await expect(page.locator('#main')).toHaveClass(/\bopen\b/);
  await expect(page.locator('.cluster-details')).toHaveCount(0);await expect(badge).toBeFocused();
  await page.keyboard.press('Enter');await expect(focused).toHaveCount(4);await expect(row.locator('.cluster-details [data-point]')).toHaveCount(4);
  await badge.focus();await page.keyboard.press('Enter');await expect(page.locator('#main')).toHaveClass(/\bopen\b/);
  await row.click({position:{x:12,y:12}});await expect(page.locator('#main')).not.toHaveClass(/\bopen\b/);
 }
 await expect(page.locator('.cluster-details')).toHaveCount(0);
 await row.click();await expect(page.locator('#det .event-focused')).toHaveCount(0);await expect.poll(()=>page.locator('#pane').evaluate(e=>e.scrollTop)).toBe(0);
});

test('Dates stays at the right edge without overflowing at narrow widths',async({page})=>{
 await page.goto('/?tags=all');
 for(const width of [1440,1000,390,320]){
  await page.setViewportSize({width,height:1000});
  await expect.poll(()=>page.locator('.bar-controls').evaluate(el=>{const dates=el.querySelector('.f-dates').getBoundingClientRect(),row=el.querySelector('#bar-r').getBoundingClientRect();return Math.abs(dates.right-row.right)<=1&&document.documentElement.scrollWidth<=innerWidth;})).toBe(true);
 }
});


test('clicked two-report badge retains matching count, expanded marks and highlights after pane resize',async({page},info)=>{
 test.skip(isMobile(info),'Desktop pane resize regression');
 await page.addInitScript(()=>localStorage.setItem('drawerW2','600'));
 await page.setViewportSize({width:1000,height:1100});await page.goto('/?tags=all');
 await page.getByRole('group',{name:'Date range',exact:true}).getByRole('button',{name:'90 days',exact:true}).click();
 const row=page.locator('[data-inc-row="amap-fleet"]');const badge=row.locator('.event-cluster').filter({has:page.locator('.event-preview[data-preview-by="press"]')});
 await expect(badge).toHaveAttribute('data-count','2');const before=JSON.parse(await badge.getAttribute('data-markers')).map(p=>p.date);
 await badge.locator(':scope > .hit').click();
 const active=row.locator('.event-cluster[aria-expanded="true"]');await expect(active).toHaveAttribute('data-count','2');await expect(row.locator('.cluster-details [data-point]')).toHaveCount(2);
 expect(JSON.parse(await active.getAttribute('data-markers')).map(p=>p.date)).toEqual(before);
 await expect(page.locator('#det .event-focused')).toHaveCount(2);expect(await page.locator('#det .event-focused').evaluateAll(es=>es.map(e=>e.dataset.eventDate))).toEqual(before);
 const markers=await row.locator('.date-cluster').evaluateAll(es=>es.flatMap(e=>JSON.parse(e.dataset.markers)).map(p=>p.date).sort());expect(markers).toEqual(['2026-10-04','2026-10-05','2026-10-09','2026-10-14']);
 const boxes=await row.locator('.event-capsule').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,r:r.right,b:r.bottom};}));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)expect(Math.min(boxes[i].r,boxes[j].r)>Math.max(boxes[i].x,boxes[j].x)&&Math.min(boxes[i].b,boxes[j].b)>Math.max(boxes[i].y,boxes[j].y)).toBe(false);
 await active.locator(':scope > .hit').click();await expect(page.locator('#main')).toHaveClass(/\bopen\b/);await expect(row.locator('.cluster-details')).toHaveCount(0);await expect(page.locator('#det .event-focused')).toHaveCount(2);
 await row.click({position:{x:12,y:12}});await expect(page.locator('#main')).not.toHaveClass(/\bopen\b/);
});
