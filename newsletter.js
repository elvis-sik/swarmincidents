/* Newsletter links carry purpose-bound tokens in the fragment, removed before analytics.
   Follow updates (October 29, reviews/2026-10-29-labels-feeds): an Email tab and an RSS feed tab. The RSS tab keeps the
   reader's choices as a feed query (category=swarm&severity=high), which feed.py and the swarms.wiki Worker read the same
   way. The Email tab (October 30, reviews/2026-10-30-newsletter-worker) signs up at this site's own /api/newsletter
   (swarm-research-site/api/newsletter.mjs; until then ChatGPT Sites' analytics.swarmincidents.com), with which incidents
   (categories: swarm, fleet, benchmark-integrity and "other" for the rest; at least one), how often, every update or major
   news only, and older findings. subscribe.html#manage=… is the settings page every email links to as "Change what you get". */
(()=>{
 const q=s=>document.querySelector(s),dialog=q('#newsletter'),form=q('#newsletter-form'),status=q('#newsletter-status');
 // Same origin: swarms.wiki in production, staging.swarms.wiki on staging.
 const api=dialog.dataset.api||location.origin+'/api/newsletter';
 const EMAIL_CATS=['swarm','fleet','benchmark-integrity','other'],EMAIL_CAT_NAMES={swarm:'Swarms',fleet:'Fleets','benchmark-integrity':'Benchmark integrity',other:'all other incidents'};
 let widget,busy=false,mode='signup',linkToken='',opener,attempt,tab='email';
 // Each incident's developers, categories and severity, from the page (template.html, window.followData).
 const D=window.followData||{incidents:[],labs:{}},RANK=['low','medium','high'];
 const CATS=[['swarm','Swarms','swarm'],['fleet','Fleets','fleet'],['benchmark','Benchmark integrity','benchmark-integrity']];
 const catsOf=e=>e.cats;
 const hasSeverity=D.incidents.some(e=>e.severity);
 // The fixed feeds the build writes (feed.py PRESETS); any other choice is served by the Worker.
 const PRESETS=[['','feed.xml','All updates'],['category=swarm','feeds/swarms.xml','Swarms'],['category=fleet','feeds/fleets.xml','Fleets'],...(hasSeverity?[['severity=high','feeds/high.xml','High severity']]:[])];
 const checked=name=>(q(`#follow-filters input[name="${name}"]:checked`)||{}).value||'';
 // A saved severity survives while the page has no severity choice to show, so saving preferences never widens it.
 let keptSeverity='';
 function filterQuery(){
  const cats=[...q('#follow-cats').querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.cat).sort();
  return [['category',cats.join(',')],['lab',q('#follow-lab').value],['severity',hasSeverity?checked('severity'):keptSeverity],['type',checked('kinds')]].filter(([,v])=>v).map(([k,v])=>k+'='+v).join('&');
 }
 function setFilter(query){
  const p=new URLSearchParams(query||''),cats=(p.get('category')||'').split(',');
  keptSeverity=RANK.includes(p.get('severity'))?p.get('severity'):'';
  q('#follow-cats').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(cats.includes(b.dataset.cat))));
  q('#follow-lab').value=D.labs[p.get('lab')]?p.get('lab'):'';
  for(const [name,v] of [['severity',RANK.includes(p.get('severity'))?p.get('severity'):''],['kinds',p.get('type')==='new'?'new':'']])(q(`#follow-filters input[name="${name}"][value="${v}"]`)||{}).checked=true;
  refresh();
 }
 const matching=query=>{const p=new URLSearchParams(query),cats=(p.get('category')||'').split(',').filter(Boolean).map(c=>CATS.find(x=>x[0]===c)[2]),lab=p.get('lab'),sev=p.get('severity');
  return D.incidents.filter(e=>(!cats.length||catsOf(e).some(c=>cats.includes(c)))&&(!lab||e.labs.includes(lab))&&(!sev||RANK.indexOf(e.severity)>=RANK.indexOf(sev)))};
 // The address a reader copies: the canonical public one (the page's feed link), not wherever this page is served.
 const base=()=>(q('link[rel="alternate"][type="application/rss+xml"]')?.href||new URL('feed.xml',location.href).href).replace(/feed\.xml$/,'');
 const feedPath=query=>(PRESETS.find(([pq])=>pq===query)||[])[1]||'feeds/custom.xml?'+query;
 function refresh(){
  const query=filterQuery(),b=document.createElement('b');b.textContent=String(matching(query).length);
  q('#follow-count').replaceChildren('Matches ',b,` of ${D.incidents.length} incidents so far.`);
  q('#follow-url').value=base()+feedPath(query);q('#follow-open').href=feedPath(query);
 }
 function buildFilters(){
  q('#follow-cats').replaceChildren(...CATS.map(([id,label,value])=>{const b=document.createElement('button');b.type='button';b.className='chip';b.dataset.cat=id;b.setAttribute('aria-pressed','false');
   b.innerHTML='<span class="box"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg></span>';
   const n=document.createElement('span');n.className='n';n.textContent=String(D.incidents.filter(e=>catsOf(e).includes(value)).length);b.append(label,' ',n);
   b.onclick=()=>{b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));refresh()};return b}));
  const labs=Object.keys(D.labs).map(k=>[k,D.incidents.filter(e=>e.labs.includes(k)).length]).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]);
  q('#follow-lab').replaceChildren(new Option('All developers',''),...labs.map(([k])=>new Option(D.labs[k].name,k)));
  q('#follow-severity').hidden=!hasSeverity;
  q('#follow-presets').replaceChildren(...PRESETS.flatMap(([pq,,label],i)=>{const a=document.createElement('button');a.type='button';a.className='mini-link';a.textContent=label;a.onclick=()=>setFilter(pq);return i?[' · ',a]:[a]}));
  q('#follow-filters').addEventListener('change',refresh);refresh();
 }
 buildFilters();
 function showTab(name,focus){
  tab=name;for(const t of ['email','rss']){const b=q('#follow-tab-'+t);b.setAttribute('aria-selected',String(t===name));b.tabIndex=t===name?0:-1}
  form.hidden=name!=='email';q('#follow-rss').hidden=name!=='rss';q('#follow-filters').hidden=name!=='rss';if(focus)q('#follow-tab-'+name).focus();
 }
 // Email verification loads only when the email half is in view: opening the dialog for a feed contacts no email service.
 const verify=()=>{if(mode==='signup'&&tab==='email')challenge().catch(e=>message(e.message||'Verification could not load. Please retry.'))};
 q('#follow-tab-email').onclick=()=>{showTab('email');verify()};q('#follow-tab-rss').onclick=()=>showTab('rss');
 q('#follow-tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();showTab(tab==='email'?'rss':'email',true);verify()}});
 q('#follow-copy').onclick=async()=>{const url=q('#follow-url');try{await navigator.clipboard.writeText(url.value);message('Feed address copied.')}catch(e){url.focus();url.select();message('Select the address and copy it.')}};
 const message=text=>{status.textContent=text;status.classList.toggle('newsletter-success',/Check your inbox|subscribed|Preferences saved/.test(text))};
 // The email choices (October 30, Elvis): presets that set every option, and "Customize", which holds them all. Keep
 // EMAIL_PRESETS and the wording in step with swarm-research-site/api/newsletter.mjs (PRESETS, describePrefs).
 const EMAIL_PRESETS=[{id:'major',name:'Major news',blurb:'New serious incidents and big developments, daily',prefs:{categories:['swarm','fleet','benchmark-integrity','other'],severity:'any',frequency:'daily',coverage:'major',archive:false,agents:[],reach:[]}},
  {id:'swarms',name:'Swarms and fleets',blurb:'Every update on swarm and fleet incidents, daily',prefs:{categories:['swarm','fleet'],severity:'any',frequency:'daily',coverage:'all',archive:false,agents:[],reach:[]}},
  {id:'everything',name:'Everything',blurb:'Every update on every incident, daily',prefs:{categories:['swarm','fleet','benchmark-integrity','other'],severity:'any',frequency:'daily',coverage:'all',archive:false,agents:[],reach:[]}}];
 const catBoxes=()=>[...form.querySelectorAll('input[name="categories"]')];
 // Severity shows only once the catalog has labels; until then a saved choice is kept as it is, never widened.
 let keptEmailSeverity='any';
 // The tracker's More filters (agents, effects reached): shown, like severity, only once the catalog has the field; a
 // saved choice is kept while hidden. Values and order as in api/newsletter.mjs (NEWSLETTER_AGENTS, NEWSLETTER_REACH).
 const MORE={agents:['1','2-10','11+','multi'],reach:['outside','operator','contained']};
 const hasMore={agents:D.incidents.some(e=>e.agents),reach:D.incidents.some(e=>e.reach)},keptMore={agents:[],reach:[]};
 const ticked=name=>hasMore[name]?MORE[name].filter(v=>form.querySelector(`input[name="${name}"][value="${v}"]`)?.checked):keptMore[name];
 const prefs=()=>({frequency:form.elements.frequency.value,coverage:form.elements.coverage.value,archive:q('#newsletter-archive').checked,categories:EMAIL_CATS.filter(c=>catBoxes().some(b=>b.value===c&&b.checked)),severity:hasSeverity?form.elements.severity.value:keptEmailSeverity,agents:ticked('agents'),reach:ticked('reach')});
 const norm=p=>JSON.stringify([Array.isArray(p.categories)?p.categories:EMAIL_CATS,p.severity||'any',p.agents||[],p.reach||[],p.frequency,p.coverage,Boolean(p.archive)]);
 const presetOf=p=>EMAIL_PRESETS.find(x=>norm(x.prefs)===norm(p))||null;
 // "Swarms only", "Swarms and Fleets", "Every incident": as the emails word it (api/newsletter.mjs categoriesLine).
 const catsLine=p=>{const c=Array.isArray(p.categories)?p.categories:EMAIL_CATS;if(c.length===EMAIL_CATS.length)return 'Every incident';const n=c.map(x=>EMAIL_CAT_NAMES[x]);const l=n.length===1?n[0]:n.slice(0,-1).join(', ')+' and '+n.at(-1);return l.charAt(0).toUpperCase()+l.slice(1)+(c.length===1?' only':'')};
 // The follow dialog's approved wording (Elvis, October 30): critical counts above high.
 const sevLine={medium:'Medium severity and above',high:'High severity and above'};
 const AGENT_NAMES={1:'One agent','2-10':'2–10 agents','11+':'More than 10 agents',multi:'More than one agent, count unknown'},REACH_NAMES={outside:'outside parties',operator:'the operator’s own systems',contained:'only the test'};
 const describe=p=>{const preset=presetOf(p),agents=(p.agents||[]).map(a=>AGENT_NAMES[a]),reach=(p.reach||[]).map(r=>REACH_NAMES[r]);return preset?{name:preset.name,line:preset.blurb}:{name:'Custom',line:[catsLine(p),sevLine[p.severity],agents.join(' or '),reach.length?'Effects on '+reach.join(' or '):'',p.frequency==='weekly'?'Weekly':'Daily',p.coverage==='major'?'Major news only':'Every update',p.archive?'Older findings included':''].filter(Boolean).join(' · ')}};
 // A preset sets every option; changing any option picks the preset it now matches, or "Custom".
 function syncPreset(){const p=prefs(),preset=presetOf(p);q('#newsletter-custom').hidden=Boolean(preset);q('#newsletter-custom-line').textContent=describe(p).line;
  (form.querySelector(`input[name="preset"][value="${preset?preset.id:'custom'}"]`)||{}).checked=true;attempt=undefined}
 function setOptions(p){form.elements.frequency.value=p.frequency;form.elements.coverage.value=p.coverage;q('#newsletter-archive').checked=Boolean(p.archive);
  catBoxes().forEach(b=>{b.checked=(Array.isArray(p.categories)?p.categories:EMAIL_CATS).includes(b.value)});keptEmailSeverity=p.severity||'any';if(hasSeverity)form.elements.severity.value=keptEmailSeverity;
  for(const name of ['agents','reach']){keptMore[name]=Array.isArray(p[name])?p[name]:[];form.querySelectorAll(`input[name="${name}"]`).forEach(b=>{b.checked=keptMore[name].includes(b.value)})}syncPreset()}
 form.querySelectorAll('[data-needs-severity]').forEach(el=>{el.hidden=!hasSeverity});
 form.querySelectorAll('[data-needs]').forEach(el=>{el.hidden=!hasMore[el.dataset.needs]});
 form.querySelectorAll('input[name="preset"]').forEach(r=>r.addEventListener('change',()=>{const preset=EMAIL_PRESETS.find(x=>x.id===r.value);if(preset){setOptions(preset.prefs);message('')}}));
 q('#newsletter-customize').addEventListener('change',()=>{syncPreset();message('')});
 const setPrefs=p=>{if(p)setOptions(p)};
 syncPreset();
 const summary=p=>{const d=describe(p);return d.name+': '+d.line};
 // The choices belong to the RSS tab; the tabs show only while signing up.
 const filtersShown=on=>{q('#follow-filters').hidden=!on||tab!=='rss';q('#follow-tabs').hidden=!on||mode!=='signup'};
 async function call(action,payload){const response=await fetch(api+'/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Email updates are temporarily unavailable. Please retry.');return result}
 let loading;
 function challenge(){
  if(widget!==undefined)return Promise.resolve();
  return loading||=(async()=>{
   const response=await fetch(api+'/config',{credentials:'same-origin',signal:AbortSignal.timeout(15000)}),config=await response.json();
   if(!response.ok)throw new Error(config.error||'Email signup is temporarily unavailable.');
   if(!window.turnstile)await new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
    if(existing){if(window.turnstile)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=reject;document.head.append(script);
   });
   widget=window.turnstile.render('#newsletter-challenge',{sitekey:config.siteKey,action:'newsletter',theme:'auto','response-field':false});
  })().finally(()=>{loading=undefined});
 }
 // start: 'rss' for the feed links (data-feed-open), which still point at feed.xml for new tabs, copying and readers.
 async function open(trigger,start){
  if(mode==='done')resetSignup();
  opener=trigger||document.activeElement;dialog.showModal();
  if(mode==='signup'){showTab(start||'email');q(tab==='email'?'#newsletter-email':'#follow-tab-rss').focus();verify()}
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-newsletter-open],[data-feed-open]');if(!trigger)return;
  if(trigger.href){if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault()}
  if(e.target.closest('#about'))q('#about').close();open(trigger,trigger.hasAttribute('data-feed-open')?'rss':'email');
 });
 document.addEventListener('newsletter-open',()=>{if(!dialog.open)open()});
 q('#newsletter-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{const target=opener?.getClientRects().length?opener:q('#top [data-newsletter-open]');target?.focus({preventScroll:true})});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
 form.addEventListener('input',()=>{attempt=undefined});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  if(!prefs().categories.length){message(mode==='manage'?'Tick at least one kind of incident, or unsubscribe below.':'Tick at least one kind of incident.');q('#newsletter-customize').open=true;catBoxes()[0].focus();return}
  busy=true;q('#newsletter-submit').disabled=true;message('');
  try{
   if(mode==='manage'){await call('preferences',{token:linkToken,...prefs()});message('Preferences saved.');return}
   await challenge();const token=window.turnstile.getResponse(widget);if(!token)throw new Error('Please complete verification before continuing.');
   if(!attempt)attempt=crypto.randomUUID();
   await call('request',{email:q('#newsletter-email').value.trim(),...prefs(),website:q('#newsletter-website').value,token,id:attempt});
   form.hidden=true;filtersShown(false);message('Check your inbox. Open the link to confirm your subscription or preference change. If you requested a link recently, use that email.');
  }catch(e){message(['TypeError','TimeoutError','SyntaxError'].includes(e.name)?'We couldn’t confirm your request. Your choices are kept here. Please retry.':e.message)}
  finally{busy=false;q('#newsletter-submit').disabled=false;if(widget!==undefined)window.turnstile.reset(widget)}
 });
 async function unsubscribe(){await call('unsubscribe',{token:linkToken});form.hidden=true;filtersShown(false);q('#newsletter-link-view').hidden=true;q('#newsletter-manage').hidden=true;mode='done';message('You’re unsubscribed. You won’t receive further email digests.')}
 q('#newsletter-unsubscribe').onclick=async()=>{if(busy)return;busy=true;try{await unsubscribe()}catch(e){message(e.message)}finally{busy=false}};
 q('#newsletter-confirm').onclick=async()=>{
  if(busy)return;busy=true;q('#newsletter-confirm').disabled=true;
  try{if(mode==='unsubscribe')await unsubscribe();else{const result=await call('confirm',{token:linkToken});q('#newsletter-link-view').hidden=true;mode='done';if(result.manage){q('#newsletter-manage a').href=result.manage;q('#newsletter-manage').hidden=false}message('You’re subscribed. Your chosen digests will include future updates only.')}}catch(e){message(e.message)}finally{busy=false;q('#newsletter-confirm').disabled=false}
 };
 function resetSignup(){mode='signup';linkToken='';attempt=undefined;form.reset();keptEmailSeverity='any';keptMore.agents=[];keptMore.reach=[];q('#newsletter-customize').open=false;syncPreset();setFilter('');filtersShown(true);showTab('email');q('#newsletter-link-view').hidden=true;q('#newsletter-manage').hidden=true;q('#newsletter-confirm').hidden=false;q('#newsletter-new-link').hidden=true;q('#newsletter-email').disabled=false;q('#newsletter-challenge').hidden=false;q('#newsletter-unsubscribe').hidden=true;q('#newsletter-submit').textContent='Send confirmation link';q('#newsletter-h').textContent='Follow updates';q('#newsletter-intro').textContent='Short, sourced updates when we publish new findings. Choose what you want, then get it by email or in a feed reader.';q('#newsletter-consent').textContent='We’ll email a confirmation link. No account needed. Change your preferences or unsubscribe at any time.';message('')}
 q('#newsletter-new-link').onclick=()=>{resetSignup();q('#newsletter-email').focus();verify()};
 async function loadLink(intent){
  const match=/^(confirm|manage|unsubscribe)=(.+)$/.exec(intent||'');
  // A link opened from the "You're subscribed" view replaces it: its "Change email preferences" button goes.
  if(match){mode=match[1];linkToken=match[2];q('#newsletter-manage').hidden=true}
  if(!dialog.open)await open(undefined,intent==='rss'?'rss':'email');if(!match)return;form.hidden=true;filtersShown(false);q('#follow-rss').hidden=true;message('Loading your email preferences…');
  try{
   const result=await call('inspect',{token:linkToken});message('');q('#newsletter-h').textContent=mode==='manage'?'Email preferences':mode==='unsubscribe'?'Unsubscribe':'Confirm email updates';
   q('#newsletter-intro').textContent=mode==='manage'?'Choose the updates you receive. Changes take effect for your next digest.':mode==='unsubscribe'?'Stop email digests from swarms.wiki incidents.': 'Confirm these choices to start receiving future updates.';
   if(mode==='manage'&&!result.unsubscribed){form.hidden=false;filtersShown(true);setPrefs(result.preferences);q('#newsletter-email').value=result.email;q('#newsletter-email').disabled=true;q('#newsletter-submit').textContent='Save preferences';q('#newsletter-unsubscribe').hidden=false;q('#newsletter-challenge').hidden=true;q('#newsletter-consent').textContent='No account needed. You can unsubscribe at any time.'}
   else{q('#newsletter-link-view').hidden=false;q('#newsletter-link-summary').textContent=result.email+(result.preferences?'\n'+summary(result.preferences):'');q('#newsletter-confirm').textContent=mode==='unsubscribe'?'Unsubscribe':'Confirm subscription';if(result.unsubscribed&&mode==='manage')throw new Error('You’re unsubscribed. Request and confirm a new email link to subscribe again.')}
  }catch(e){form.hidden=true;filtersShown(false);q('#newsletter-link-view').hidden=false;q('#newsletter-confirm').hidden=true;q('#newsletter-new-link').hidden=false;message(e.message)}
 }
 document.addEventListener('newsletter-intent',e=>loadLink(e.detail));
 // subscribe.html, or /subscribe where a host drops the extension (Cloudflare's static files do).
 if(/\/subscribe(\.html)?$/.test(location.pathname))loadLink(window.__newsletterIntent);
})();
