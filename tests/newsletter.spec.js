const {test,expect,load}=require('./fixtures');
test.use({expectedHttpError:'https://analytics.swarmincidents.com/api/newsletter/request'});
const endpoint='https://analytics.swarmincidents.com/api/newsletter';
async function mock(page,{failure=false}={}){
 await page.addInitScript(()=>{window.turnstile={render:()=>0,getResponse:()=> 'fake-challenge',reset:()=>{}}});
 await page.route(endpoint+'/**',route=>{const action=new URL(route.request().url()).pathname.split('/').pop();const data=action==='config'?{siteKey:'fake-site'}:action==='request'?(failure?{error:'Please retry shortly.'}:{ok:true}):action==='inspect'?{ok:true,email:'reader@example.com',preferences:{frequency:'weekly',coverage:'major',archive:true},unsubscribed:false}:{ok:true};return route.fulfill({status:action==='request'&&failure?502:200,json:data,headers:{'Access-Control-Allow-Origin':'*'}})});
}
test('header signup opens native modal with approved defaults; Escape returns focus',async({page})=>{
 await mock(page);await load(page);const open=page.locator('#top [data-newsletter-open]');await open.click();
 await expect(page.getByRole('dialog',{name:'Email updates',exact:true})).toBeVisible();await expect(page.locator('#newsletter-email')).toBeFocused();
 await expect(page.getByRole('radio',{name:'Daily',exact:true})).toBeChecked();await expect(page.getByRole('radio',{name:'All substantive updates',exact:true})).toBeChecked();await expect(page.locator('#newsletter-archive')).not.toBeChecked();
 await page.keyboard.press('Escape');await expect(open).toBeFocused();
});
test('signup submits exactly chosen preferences and waits for email confirmation',async({page})=>{
 await mock(page);await load(page);await page.locator('#top [data-newsletter-open]').click();await page.locator('#newsletter-email').fill('reader@example.com');await page.getByRole('radio',{name:'Weekly',exact:true}).check();await page.getByRole('radio',{name:'Major news only',exact:true}).check();await page.locator('#newsletter-archive').check();
 const request=page.waitForRequest(endpoint+'/request');await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();const data=(await request).postDataJSON();expect(data).toMatchObject({email:'reader@example.com',frequency:'weekly',coverage:'major',archive:true});
 await expect(page.locator('#newsletter-status')).toContainText('Check your inbox');await expect(page.locator('#newsletter-form')).toBeHidden();
});
test('provider errors preserve email and preferences for a stable retry',async({page})=>{
 await mock(page,{failure:true});await load(page);await page.locator('#top [data-newsletter-open]').click();await page.locator('#newsletter-email').fill('reader@example.com');await page.getByRole('radio',{name:'Weekly',exact:true}).check();const ids=[];page.on('request',r=>{if(r.url()===endpoint+'/request')ids.push(r.postDataJSON().id)});
 for(let i=0;i<2;i++){await page.getByRole('button',{name:'Send confirmation link',exact:true}).click();await expect(page.locator('#newsletter-status')).toContainText('Please retry shortly.');await expect(page.locator('#newsletter-submit')).toBeEnabled()}
 expect(ids[0]).toBe(ids[1]);await expect(page.locator('#newsletter-email')).toHaveValue('reader@example.com');await expect(page.getByRole('radio',{name:'Weekly',exact:true})).toBeChecked();
});
test('email link removes its fragment before analytics and waits for explicit confirmation',async({page})=>{
 await mock(page);let confirmations=0;page.on('request',r=>{if(r.url()===endpoint+'/confirm')confirmations++});await page.goto('/subscribe.html#confirm=fake-purpose-token');
 await expect(page.locator('#newsletter-h')).toHaveText('Confirm email updates');await expect(page.locator('#newsletter-confirm')).toBeVisible();await expect(page).toHaveURL(/\/subscribe.html$/);expect(confirmations).toBe(0);
 await page.locator('#newsletter-confirm').click();await expect(page.locator('#newsletter-status')).toContainText('You’re subscribed');expect(confirmations).toBe(1);
});
test('email preference links restore saved choices and can unsubscribe',async({page})=>{
 await mock(page);await page.goto('/subscribe.html#manage=fake-purpose-token');await expect(page.locator('#newsletter-h')).toHaveText('Email preferences');await expect(page.locator('#newsletter-email')).toBeDisabled();await expect(page.getByRole('radio',{name:'Weekly',exact:true})).toBeChecked();
 await page.getByRole('radio',{name:'Daily',exact:true}).check();await page.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.locator('#newsletter-status')).toHaveText('Preferences saved.');await page.locator('#newsletter-unsubscribe').click();await expect(page.locator('#newsletter-status')).toContainText('You’re unsubscribed');
});
test('home, Updates and About expose signup without clipping at narrow widths',async({page})=>{
 await mock(page);for(const path of ['/','/updates.html']){await page.goto(path);await expect(page.locator('#top [data-newsletter-open]')).toBeVisible();await page.locator('#top [data-newsletter-open]').click();const box=await page.locator('#newsletter').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width+1);await page.keyboard.press('Escape')}
 await page.locator('#about-btn').click();await page.locator('#about [data-newsletter-open]').click();await expect(page.locator('#about')).not.toBeVisible();await expect(page.locator('#newsletter')).toBeVisible();
});
