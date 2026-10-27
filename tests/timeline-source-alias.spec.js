const {test,expect,siteData}=require('./fixtures');
const fs=require('fs'),path=require('path');

for(const precise of [true,false])test(precise?'timeline preserves a reviewed event alias':'legacy registry-only events retain canonical source links',async({page})=>{
 // Synthetic locator control for the observed lost-comment-link defect.
 // It deliberately makes no new assertion about the underlying incident.
 const data=siteData(),incident=data.incidents.find(e=>e.id==='aisi-cyber-range');
 const reference=data.publicSources.incidents[incident.id].reveals.find(r=>r.source_ids.length===1);
 const event=incident.reveals.find(r=>r.d===reference.d&&r.by===reference.by&&r.text===reference.text);
 const source=data.publicSources.sources[reference.source_ids[0]];
 const alias=source.url.split('#')[0]+'#reviewed-locator-control';
 source.aliases=[...new Set([...(source.aliases||[]),alias])];
 if(precise)event.src=[alias];else delete event.src;
 const html=fs.readFileSync(path.join(__dirname,'../docs/index.html'),'utf8').replace(/const DATA = .*?;\n/,()=> 'const DATA = '+JSON.stringify(data).replace(/<\//g,'<\\/')+';\n');
 await page.route('**/?tags=all',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.goto('/?tags=all#'+incident.id);
 await expect(page.locator('#incident-timeline').getByRole('link',{name:event.text,exact:true})).toHaveAttribute('href',precise?alias:source.url);
});
