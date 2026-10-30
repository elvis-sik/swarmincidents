const {test,expect,load,openAbout,siteData}=require('./fixtures');
// Follow updates (October 29, reviews/2026-10-29-labels-feeds): an Email tab, today's signup against today's backend
// (mocked here), and an RSS feed tab that turns the reader's choices into a feed address. Email filters wait for the
// email move (October 30 merge), so the email requests below carry today's coverage, never a filter.
test.use({expectedHttpError:'https://analytics.swarmincidents.com/api/newsletter/request'});
const endpoint='https://analytics.swarmincidents.com/api/newsletter';
const data=siteData();
const catsOf=e=>e.categories||[({coordination:'swarm','multi-agent':'swarm',fleet:'fleet'})[e.agent_group?.kind],e.category].filter(Boolean);
async function mock(page,{failure=false}={}){
 await page.addInitScript(()=>{window.turnstile={render:()=>0,getResponse:()=> 'fake-challenge',reset:()=>{}}});
 await page.route(endpoint+'/**',route=>{const action=new URL(route.request().url()).pathname.split('/').pop();const data=action==='config'?{siteKey:'fake-site'}:action==='request'?(failure?{error:'Please retry shortly.'}:{ok:true}):action==='inspect'?{ok:true,email:'reader@example.com',preferences:{frequency:'weekly',coverage:'major',archive:true},unsubscribed:false}:{ok:true};return route.fulfill({status:action==='request'&&failure?502:200,json:data,headers:{'Access-Control-Allow-Origin':'*'}})});
}
const chip=(page,id)=>page.locator(`#follow-cats [data-cat="${id}"]`);
const url=page=>page.locator('#follow-url');
test('header signup opens the Follow updates dialog on its Email tab with approved defaults; Escape returns focus',async({page})=>{
 await mock(page);await load(page);const open=page.locator('#top [data-newsletter-open]');await open.click();
 await expect(page.getByRole('dialog',{name:'Follow updates',exact:true})).toBeVisible();await expect(page.locator('#newsletter-email')).toBeFocused();
 await expect(page.getByRole('tab',{name:'Email',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('radio',{name:'Daily',exact:true})).toBeChecked();await expect(page.getByRole('radio',{name:'Major news only',exact:true})).toBeChecked();await expect(page.locator('#newsletter-archive')).not.toBeChecked();
 // The category choices belong to the RSS tab until email filters exist.
 await expect(page.locator('#follow-filters')).toBeHidden();
 await page.keyboard.press('Escape');await expect(open).toBeFocused();
});
test('signup submits exactly chosen preferences and waits for email confirmation',async({page})=>{
 await mock(page);await load(page);await page.locator('#top [data-newsletter-open]').click();await page.locator('#newsletter-email').fill('reader@example.com');await page.getByRole('radio',{name:'Weekly',exact:true}).check();await page.getByRole('radio',{name:'Major news only',exact:true}).check();await page.locator('#newsletter-archive').check();
 const request=page.waitForRequest(endpoint+'/request');await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();const sent=(await request).postDataJSON();expect(sent).toMatchObject({email:'reader@example.com',frequency:'weekly',coverage:'major',archive:true});expect(sent).not.toHaveProperty('filter');
 await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');await expect(page.locator('#newsletter-form')).toBeHidden();await expect(page.locator('#follow-filters')).toBeHidden();
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
test('provider errors preserve email and preferences for a stable retry',async({page})=>{
 await mock(page,{failure:true});await load(page);await page.locator('#top [data-newsletter-open]').click();await page.locator('#newsletter-email').fill('reader@example.com');await page.getByRole('radio',{name:'Weekly',exact:true}).check();const ids=[];page.on('request',r=>{if(r.url()===endpoint+'/request')ids.push(r.postDataJSON().id)});
 for(let i=0;i<2;i++){await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();await expect(page.locator('#newsletter-status')).toContainText('Please retry shortly.');await expect(page.locator('#newsletter-submit')).toBeEnabled()}
 expect(ids[0]).toBe(ids[1]);await expect(page.locator('#newsletter-email')).toHaveValue('reader@example.com');await expect(page.getByRole('radio',{name:'Weekly',exact:true})).toBeChecked();
});
test('email link removes its fragment before analytics and waits for explicit confirmation',async({page})=>{
 await mock(page);let confirmations=0;page.on('request',r=>{if(r.url()===endpoint+'/confirm')confirmations++});await page.goto('/subscribe.html#confirm=fake-purpose-token');
 await expect(page.locator('#newsletter-h')).toHaveText('Confirm email updates');await expect(page.locator('#newsletter-confirm')).toBeVisible();await expect(page).toHaveURL(/\/subscribe.html$/);expect(confirmations).toBe(0);
 await expect(page.locator('#newsletter-link-summary')).toContainText('Weekly · Major news only · Historical additions included');await expect(page.locator('#follow-filters')).toBeHidden();await expect(page.locator('#follow-tabs')).toBeHidden();
 await page.locator('#newsletter-confirm').click();await expect(page.locator('#newsletter-status')).toContainText('You’re subscribed');expect(confirmations).toBe(1);
});
test('email preference links restore saved choices and can unsubscribe',async({page})=>{
 await mock(page);await page.goto('/subscribe.html#manage=fake-purpose-token');await expect(page.locator('#newsletter-h')).toHaveText('Email preferences');await expect(page.locator('#newsletter-email')).toBeDisabled();await expect(page.getByRole('radio',{name:'Weekly',exact:true})).toBeChecked();
 await expect(page.getByRole('radio',{name:'Major news only',exact:true})).toBeChecked();await expect(page.locator('#follow-tabs')).toBeHidden();await expect(page.locator('#follow-filters')).toBeHidden();
 await page.getByRole('radio',{name:'Daily',exact:true}).check();const saved=page.waitForRequest(endpoint+'/preferences');await page.getByRole('button',{name:'Save preferences',exact:true}).click();
 expect((await saved).postDataJSON()).toMatchObject({frequency:'daily',coverage:'major',archive:true});await expect(page.locator('#newsletter-status')).toHaveText('Preferences saved.');
 await page.locator('#newsletter-unsubscribe').click();await expect(page.locator('#newsletter-status')).toContainText('You’re unsubscribed');
});
test('home, Updates and About expose signup without clipping at narrow widths',async({page})=>{
 await mock(page);for(const path of ['/','/updates.html']){await page.goto(path);await expect(page.locator('#top [data-newsletter-open]')).toBeVisible();await page.locator('#top [data-newsletter-open]').click();const box=await page.locator('#newsletter').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width+1);await page.keyboard.press('Escape')}
 await openAbout(page);await page.locator('#about [data-newsletter-open]').click();await expect(page.locator('#about')).not.toBeVisible();await expect(page.locator('#newsletter')).toBeVisible();
});
