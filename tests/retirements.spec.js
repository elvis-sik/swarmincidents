const {test,expect,siteData}=require('./fixtures');
const fs=require('fs');
const path=require('path');
// A public, labeled UI fixture exercises retirement even before any real removal.
// The production mapper is separately tested on journal removals and reinstatement.
const original=siteData().incidents[0];
const updateId='retirement-browser-control';
const update={id:updateId,incident:original.id,title:'Catalog retirement control',summary:'Technical mistake without an independently established boundary violation.',published:'2026-10-24T12:00:00Z',type:'Correction',freshness:'correction',changes:[{path:['incidents',original.id],before_exists:true,before:original,after_exists:false,after:null}],source:original.sources[0][2],publisher:original.sources[0][1]};

test('retired permalink opens its correction, original account and sources without a loop',async({page})=>{
 for(const [url,file] of [['/','index.html'],['/updates.html','updates.html']]){
  const html=fs.readFileSync(path.join(__dirname,'../docs',file),'utf8');
  const match=html.match(/const DATA = (.*);\n/);const data=JSON.parse(match[1]);
  data.incidents=data.incidents.filter(i=>i.id!==original.id);
  data.retiredIncidents={[original.id]:updateId};
  if(file==='updates.html')data.responses.unshift({id:updateId,title:update.title,text:update.summary,d:'2026-10-24',who:'other',inc:[original.id],update,src:[original.sources[0]]});
  await page.route(routeUrl=>routeUrl.pathname===url,route=>route.fulfill({contentType:'text/html',body:html.replace(match[0],'const DATA = '+JSON.stringify(data).replaceAll('</','<\\/')+';\n')}));
 }
 await page.goto('/?models=openai&tags=benchmark#'+original.id);
 await expect(page).toHaveURL(new RegExp('/updates.html#'+updateId+'$'));
 const detail=page.locator('#update-dialog');await expect(detail).toBeVisible();
 await expect(detail).toContainText('Retired from the active catalog');
 await expect(detail.getByRole('link',{name:'View incident',exact:true})).toHaveCount(0);
 await expect(detail.locator('.update-before').first()).toContainText(original.summary);
 await expect(detail.locator('.srcs a').first()).toHaveAttribute('href',original.sources[0][2]);
});
