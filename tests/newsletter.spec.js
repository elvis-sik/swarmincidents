const {test,expect,load,openAbout,siteData}=require('./fixtures');
// Follow updates (October 29, reviews/2026-10-29-labels-feeds): an Email tab and an RSS feed tab that turns the reader's
// choices into a feed address. Since October 30 (reviews/2026-10-30-newsletter-worker) the Email tab signs up at the
// page's own origin, /api/newsletter (swarms.wiki's Worker; mocked here), with the incident categories it wants mail about.
const endpoint=`http://127.0.0.1:${process.env.PORT||8799}/api/newsletter`;
test.use({expectedHttpError:endpoint+'/request'});
const ALL=['swarm','fleet','benchmark-integrity','other'];
const box=(page,name)=>page.locator('#newsletter-cats').getByRole('checkbox',{name,exact:true,includeHidden:true});
const preset=(page,name)=>page.locator('#newsletter-presets').getByRole('radio',{name:new RegExp('^'+name+'\\b')});
const data=siteData();
const catsOf=e=>e.categories||[({coordination:'swarm','multi-agent':'swarm',fleet:'fleet'})[e.agent_group?.kind],e.category].filter(Boolean);
async function mock(page,{failure=false,categories=['swarm']}={}){
 await page.addInitScript(()=>{window.turnstile={render:()=>0,getResponse:()=> 'fake-challenge',reset:()=>{}}});
 const saved={frequency:'weekly',coverage:'major',archive:true,...(categories?{categories}:{})};
 await page.route(endpoint+'/**',route=>{const action=new URL(route.request().url()).pathname.split('/').pop();const data=action==='config'?{siteKey:'fake-site'}:action==='request'?(failure?{error:'Please retry shortly.'}:{ok:true}):action==='inspect'?{ok:true,email:'reader@example.com',preferences:saved,unsubscribed:false}:{ok:true};return route.fulfill({status:action==='request'&&failure?502:200,json:data})});
}
const chip=(page,id)=>page.locator(`#follow-cats [data-cat="${id}"]`);
const url=page=>page.locator('#follow-url');
test('header signup opens the Follow updates dialog on its Email tab with "Major news" preset; Customize starts closed; Escape returns focus',async({page})=>{
 await mock(page);await load(page);const open=page.locator('#top [data-newsletter-open]');await open.click();
 await expect(page.getByRole('dialog',{name:'Follow updates',exact:true})).toBeVisible();await expect(page.locator('#newsletter-email')).toBeFocused();
 await expect(page.getByRole('tab',{name:'Email',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(preset(page,'Major news')).toBeChecked();for(const name of ['Swarms and fleets','Everything'])await expect(preset(page,name)).not.toBeChecked();
 // Three presets (Elvis: "two or three presets"); the severity choice shows only once the catalog has labels; nothing says Custom.
 const rated=data.incidents.some(e=>e.severity);
 await expect(page.locator('.newsletter-preset:not(#newsletter-custom)')).toHaveCount(3);await expect(page.locator('#newsletter-severity')).toHaveAttribute('data-needs-severity','');await expect(page.locator('#newsletter-custom')).toBeHidden();
 if(!rated)await expect(page.locator('#newsletter-severity')).toBeHidden();
 await expect(page.locator('#newsletter-customize')).not.toHaveAttribute('open','');await expect(box(page,'Swarms')).toBeHidden();
 // The preset set every option, under Customize.
 for(const name of ['Swarms','Fleets','Benchmark integrity','All other incidents'])await expect(box(page,name)).toBeChecked();
 await expect(page.getByRole('radio',{name:'Daily',exact:true,includeHidden:true})).toBeChecked();await expect(page.locator('#newsletter-archive')).not.toBeChecked();
 // "Which updates?" is under Customize for everyone, set to major news by the preset, and says what major news is.
 await expect(page.getByRole('radio',{name:'Major news only',exact:true,includeHidden:true})).toBeChecked();await expect(page.getByRole('radio',{name:'Every update',exact:true,includeHidden:true})).not.toBeChecked();
 await expect(page.locator('#newsletter-coverage .newsletter-help')).toHaveText(/^Major news: new serious incidents and big developments, like a regulator acting or a company confirming what happened\.$/,{useInnerText:false});
 await expect(page.locator('#follow-filters')).toBeHidden();
 await page.keyboard.press('Escape');await expect(open).toBeFocused();
});
test('"Swarms and fleets" is one click and sends every option it sets',async({page})=>{
 await mock(page);await load(page);await page.locator('#top [data-newsletter-open]').click();await page.locator('#newsletter-email').fill('reader@example.com');
 await preset(page,'Swarms and fleets').check();
 const request=page.waitForRequest(endpoint+'/request');await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();const sent=(await request).postDataJSON();
 expect(sent).toMatchObject({email:'reader@example.com',categories:['swarm','fleet'],severity:'any',frequency:'daily',coverage:'all',archive:false});expect(sent).not.toHaveProperty('filter');
 await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');await expect(page.locator('#newsletter-form')).toBeHidden();await expect(page.locator('#follow-filters')).toBeHidden();
});
test('changing anything under Customize shows Custom; matching a preset again selects it; none ticked is refused',async({page})=>{
 await mock(page);const requests=[];page.on('request',r=>{if(r.url()===endpoint+'/request')requests.push(r.postDataJSON())});await load(page);await page.locator('#top [data-newsletter-open]').click();
 await page.locator('#newsletter-email').fill('reader@example.com');await preset(page,'Swarms and fleets').check();
 await page.locator('#newsletter-customize summary').click();await box(page,'Fleets').uncheck();
 await expect(page.locator('#newsletter-custom')).toBeVisible();await expect(preset(page,'Custom')).toBeChecked();await expect(page.locator('#newsletter-custom-line')).toHaveText('Swarms only · Daily · Every update');
 await page.getByRole('radio',{name:'Weekly',exact:true}).check();await page.locator('#newsletter-archive').check();await expect(page.locator('#newsletter-custom-line')).toHaveText('Swarms only · Weekly · Every update · Older findings included');
 await box(page,'Swarms').uncheck();await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();
 await expect(page.locator('#newsletter-status')).toHaveText('Tick at least one kind of incident.');expect(requests).toEqual([]);
 // Back to a preset's exact options: it is selected again, and Custom goes.
 await preset(page,'Everything').check();await expect(page.locator('#newsletter-custom')).toBeHidden();for(const name of ['Swarms','Fleets','Benchmark integrity','All other incidents'])await expect(box(page,name)).toBeChecked();
 await box(page,'Fleets').uncheck();await expect(preset(page,'Custom')).toBeChecked();await box(page,'Fleets').check();await expect(preset(page,'Everything')).toBeChecked();
 // Major news only on every incident, daily, is the "Major news" preset.
 await page.getByRole('radio',{name:'Major news only',exact:true}).check();await expect(preset(page,'Major news')).toBeChecked();
 await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();
 await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');expect(requests.map(r=>[r.categories,r.coverage,r.frequency])).toEqual([[ALL,'major','daily']]);
});
test('once the catalog has severity labels, Customize offers the severity choice (no severity preset)',async({page})=>{
 await mock(page);await page.addInitScript(()=>{let v;Object.defineProperty(window,'followData',{configurable:true,get:()=>v,set:x=>{if(x&&x.incidents&&x.incidents[0])x.incidents[0].severity='high';v=x}})});
 const requests=[];page.on('request',r=>{if(r.url()===endpoint+'/request')requests.push(r.postDataJSON())});await load(page);await page.locator('#top [data-newsletter-open]').click();
 await page.locator('#newsletter-email').fill('reader@example.com');await expect(page.locator('.newsletter-preset:not(#newsletter-custom)')).toHaveCount(3);
 await page.locator('#newsletter-customize summary').click();await expect(page.getByRole('group',{name:'How serious?'})).toBeVisible();await expect(page.getByRole('radio',{name:'Any',exact:true})).toBeChecked();
 await page.getByRole('radio',{name:'Weekly',exact:true}).check();await page.getByRole('radio',{name:'High and above',exact:true}).check();await expect(page.locator('#newsletter-custom-line')).toHaveText('Every incident · High severity and above · Weekly · Major news only');
 await page.getByRole('radio',{name:'Medium and above',exact:true}).check();await expect(page.locator('#newsletter-custom-line')).toHaveText('Every incident · Medium severity and above · Weekly · Major news only');
 await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');
 expect(requests.map(r=>[r.severity,r.frequency])).toEqual([['medium','weekly']]);
});
test('the RSS tab turns the choices into a feed address: fixed feeds when one fits, the Worker for the rest',async({page,request})=>{
 await mock(page);await load(page);await page.locator('#top [data-newsletter-open]').click();await page.getByRole('tab',{name:'RSS feed',exact:true}).click();
 await expect(page.locator('#newsletter-form')).toBeHidden();await expect(page.locator('#follow-filters')).toBeVisible();await expect(url(page)).toHaveValue('https://swarms.wiki/incidents/feed.xml');
 await expect(page.locator('#follow-cats [aria-pressed="true"]')).toHaveCount(0);await expect(page.getByRole('radio',{name:'New incidents and updates',exact:true})).toBeChecked();
 await expect(page.locator('#follow-count')).toHaveText(`Matches ${data.incidents.length} of ${data.incidents.length} incidents so far.`);
 // No severity labels in this catalog yet: the severity choice stays hidden until they exist.
 await expect(page.locator('#follow-severity')).toBeHidden();
 await chip(page,'fleet').click();await expect(url(page)).toHaveValue('https://swarms.wiki/incidents/feeds/fleets.xml');
 await chip(page,'swarm').click();await expect(url(page)).toHaveValue('https://swarms.wiki/incidents/feeds/custom.xml?category=fleet,swarm');
 const both=data.incidents.filter(e=>catsOf(e).some(c=>c==='swarm'||c==='fleet')).length;await expect(page.locator('#follow-count')).toHaveText(`Matches ${both} of ${data.incidents.length} incidents so far.`);
 await page.locator('#follow-lab').selectOption('openai');await expect(url(page)).toHaveValue('https://swarms.wiki/incidents/feeds/custom.xml?category=fleet,swarm&lab=openai');
 await expect(page.locator('#follow-open')).toHaveAttribute('href','feeds/custom.xml?category=fleet,swarm&lab=openai');
 await page.locator('#follow-presets').getByRole('button',{name:'All updates',exact:true}).click();await expect(url(page)).toHaveValue('https://swarms.wiki/incidents/feed.xml');await expect(page.locator('#follow-cats [aria-pressed="true"]')).toHaveCount(0);
 // The fixed feed the address names exists in the build, with the matching updates only.
 const fleets=new Set(data.incidents.filter(e=>catsOf(e).includes('fleet')).map(e=>e.id));
 const xml=await (await request.get('feeds/fleets.xml')).text();const links=[...xml.matchAll(/<link>https:\/\/swarms\.wiki\/incidents\/#([^<]+)<\/link>/g)].map(m=>decodeURIComponent(m[1]));
 expect(links.length).toBeGreaterThan(0);for(const id of links)expect(fleets.has(id),id).toBe(true);
});
test('the RSS links open the feed choices, still point at feed.xml, and load no email verification',async({page})=>{
 await mock(page);const calls=[];page.on('request',r=>{if(r.url().startsWith(endpoint))calls.push(r.url())});await load(page);
 const rss=page.locator('#top .follow-nav [data-feed-open]');await expect(rss).toHaveAttribute('href','feed.xml');await rss.click();
 await expect(page.getByRole('tab',{name:'RSS feed',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tab',{name:'RSS feed',exact:true})).toBeFocused();
 await expect(url(page)).toHaveValue('https://swarms.wiki/incidents/feed.xml');await expect(page).not.toHaveURL(/feed\.xml/);expect(calls).toEqual([]);
 await page.getByRole('tab',{name:'Email',exact:true}).click();await expect.poll(()=>calls.filter(u=>u.endsWith('/config')).length).toBe(1);await expect(page.locator('#follow-filters')).toBeHidden();
 await page.keyboard.press('Escape');await expect(rss).toBeFocused();
 await page.goto('/subscribe.html#rss');await expect(page.getByRole('tab',{name:'RSS feed',exact:true})).toHaveAttribute('aria-selected','true');await expect(page).toHaveURL(/\/subscribe.html$/);
});
test('once the catalog has agent counts and effects, Customize offers them; any ticked value passes, none means any',async({page})=>{
 await mock(page);await page.addInitScript(()=>{let v;Object.defineProperty(window,'followData',{configurable:true,get:()=>v,set:x=>{if(x&&x.incidents&&x.incidents[0]){x.incidents[0].agents='11+';x.incidents[0].reach='outside'}v=x}})});
 const requests=[];page.on('request',r=>{if(r.url()===endpoint+'/request')requests.push(r.postDataJSON())});await load(page);await page.locator('#top [data-newsletter-open]').click();
 await page.locator('#newsletter-email').fill('reader@example.com');await page.locator('#newsletter-customize summary').click();
 await expect(page.getByRole('group',{name:'How many agents?'})).toBeVisible();await expect(page.getByRole('group',{name:'Effects reached'})).toBeVisible();
 await page.getByRole('checkbox',{name:'More than 10',exact:true}).check();await page.getByRole('checkbox',{name:'More than one, count unknown',exact:true}).check();await page.getByRole('checkbox',{name:'Outside parties',exact:true}).check();
 await expect(page.locator('#newsletter-custom-line')).toHaveText('Every incident · More than 10 agents or More than one agent, count unknown · Effects on outside parties · Daily · Major news only');
 await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');
 expect(requests.map(r=>[r.agents,r.reach])).toEqual([[['11+','multi'],['outside']]]);
});
test('without those labels the agents and effects choices stay hidden and send no filter',async({page})=>{
 await mock(page);const requests=[];page.on('request',r=>{if(r.url()===endpoint+'/request')requests.push(r.postDataJSON())});await load(page);await page.locator('#top [data-newsletter-open]').click();
 await page.locator('#newsletter-customize summary').click();const labeled=data.incidents.some(e=>e.agent_count);
 await expect(page.locator('#newsletter-agents')).toBeVisible({visible:labeled});await expect(page.locator('#newsletter-reach')).toBeVisible({visible:data.incidents.some(e=>e.reach)});
 await page.locator('#newsletter-email').fill('reader@example.com');await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');
 expect(requests.map(r=>[r.agents,r.reach])).toEqual([[[],[]]]);
});
test('provider errors preserve email and preferences for a stable retry',async({page})=>{
 await mock(page,{failure:true});await load(page);await page.locator('#top [data-newsletter-open]').click();await page.locator('#newsletter-email').fill('reader@example.com');await preset(page,'Swarms and fleets').check();const ids=[];page.on('request',r=>{if(r.url()===endpoint+'/request')ids.push(r.postDataJSON().id)});
 for(let i=0;i<2;i++){await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();await expect(page.locator('#newsletter-status')).toContainText('Please retry shortly.');await expect(page.locator('#newsletter-submit')).toBeEnabled()}
 expect(ids[0]).toBe(ids[1]);await expect(page.locator('#newsletter-email')).toHaveValue('reader@example.com');await expect(preset(page,'Swarms and fleets')).toBeChecked();
});
test('email link removes its fragment before analytics and waits for explicit confirmation',async({page})=>{
 await mock(page);let confirmations=0;page.on('request',r=>{if(r.url()===endpoint+'/confirm')confirmations++});await page.goto('/subscribe.html#confirm=fake-purpose-token');
 await expect(page.locator('#newsletter-h')).toHaveText('Confirm email updates');await expect(page.locator('#newsletter-confirm')).toBeVisible();await expect(page).toHaveURL(/\/subscribe.html$/);expect(confirmations).toBe(0);
 await expect(page.locator('#newsletter-link-summary')).toContainText('Custom: Swarms only · Weekly · Major news only · Older findings included');await expect(page.locator('#follow-filters')).toBeHidden();await expect(page.locator('#follow-tabs')).toBeHidden();
 await page.locator('#newsletter-confirm').click();await expect(page.locator('#newsletter-status')).toContainText('You’re subscribed');expect(confirmations).toBe(1);
});
test('after confirming, "Change email preferences" opens the settings without leaving that button behind',async({page})=>{
 await mock(page);await page.route(endpoint+'/confirm',route=>route.fulfill({json:{ok:true,manage:'http://127.0.0.1:'+(process.env.PORT||8799)+'/subscribe.html#manage=fake-purpose-token'}}));
 await page.goto('/subscribe.html#confirm=fake-purpose-token');await page.locator('#newsletter-confirm').click();
 await expect(page.locator('#newsletter-manage')).toBeVisible();await page.locator('#newsletter-manage a').click();
 await expect(page.locator('#newsletter-h')).toHaveText('Email preferences');await expect(page.getByRole('button',{name:'Save preferences',exact:true})).toBeVisible();
 await expect(page.locator('#newsletter-manage')).toBeHidden();
});
test('email preference links restore saved choices and can unsubscribe',async({page})=>{
 await mock(page);await page.goto('/subscribe.html#manage=fake-purpose-token');await expect(page.locator('#newsletter-h')).toHaveText('Email preferences');await expect(page.locator('#newsletter-email')).toBeDisabled();
 // Saved choices that match no preset show as Custom, spelled out; Customize holds each one.
 await expect(preset(page,'Custom')).toBeChecked();await expect(page.locator('#newsletter-custom-line')).toHaveText('Swarms only · Weekly · Major news only · Older findings included');
 await page.locator('#newsletter-customize summary').click();await expect(page.getByRole('radio',{name:'Weekly',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Major news only',exact:true})).toBeChecked();await expect(page.locator('#follow-tabs')).toBeHidden();await expect(page.locator('#follow-filters')).toBeHidden();
 await expect(box(page,'Swarms')).toBeChecked();for(const name of ['Fleets','Benchmark integrity','All other incidents'])await expect(box(page,name)).not.toBeChecked();
 await page.getByRole('radio',{name:'Daily',exact:true}).check();await box(page,'Fleets').check();
 await page.getByRole('radio',{name:'Every update',exact:true}).check();await expect(page.locator('#newsletter-custom-line')).toHaveText('Swarms and Fleets · Daily · Every update · Older findings included');const saved=page.waitForRequest(endpoint+'/preferences');await page.getByRole('button',{name:'Save preferences',exact:true}).click();
 expect((await saved).postDataJSON()).toMatchObject({frequency:'daily',coverage:'all',archive:true,categories:['swarm','fleet'],severity:'any'});await expect(page.locator('#newsletter-status')).toHaveText('Preferences saved.');
 await page.locator('#newsletter-unsubscribe').click();await expect(page.locator('#newsletter-status')).toContainText('You’re unsubscribed');
});
test('a subscriber from before categories sees every category ticked on the settings page',async({page})=>{
 await mock(page,{categories:null});await page.goto('/subscribe.html#manage=fake-purpose-token');await expect(page.locator('#newsletter-h')).toHaveText('Email preferences');
 for(const name of ['Swarms','Fleets','Benchmark integrity','All other incidents'])await expect(box(page,name)).toBeChecked();
 const saved=page.waitForRequest(endpoint+'/preferences');await page.getByRole('button',{name:'Save preferences',exact:true}).click();expect((await saved).postDataJSON().categories).toEqual(ALL);
});
test('home, Updates and About expose signup without clipping at narrow widths',async({page})=>{
 await mock(page);for(const path of ['/','/updates.html']){await page.goto(path);await expect(page.locator('#top [data-newsletter-open]')).toBeVisible();await page.locator('#top [data-newsletter-open]').click();const box=await page.locator('#newsletter').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width+1);await page.keyboard.press('Escape')}
 await openAbout(page);await page.locator('#about [data-newsletter-open]').click();await expect(page.locator('#about')).not.toBeVisible();await expect(page.locator('#newsletter')).toBeVisible();
});
