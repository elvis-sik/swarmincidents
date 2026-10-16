/* Newsletter links carry purpose-bound tokens in the fragment, removed before analytics. */
(()=>{
 const api='https://analytics.swarmincidents.com/api/newsletter',q=s=>document.querySelector(s);
 const dialog=q('#newsletter'),form=q('#newsletter-form'),status=q('#newsletter-status');
 let widget,busy=false,mode='signup',linkToken='',opener,attempt;
 const prefs=()=>({frequency:form.elements.frequency.value,coverage:form.elements.coverage.value,archive:q('#newsletter-archive').checked});
 const message=text=>{status.textContent=text;status.classList.toggle('newsletter-success',/Check your inbox|subscribed|Preferences saved/.test(text))};
 const setPrefs=p=>{if(!p)return;form.elements.frequency.value=p.frequency;form.elements.coverage.value=p.coverage;q('#newsletter-archive').checked=p.archive};
 const summary=p=>(p.frequency==='daily'?'Daily':'Weekly')+' · '+(p.coverage==='major'?'Major news only':'All substantive updates')+' · '+(p.archive?'Historical additions included':'Historical additions excluded');
 async function call(action,payload){const response=await fetch(api+'/'+action,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Email updates are temporarily unavailable. Please retry.');return result}
 async function challenge(){
  if(widget!==undefined)return;
  const response=await fetch(api+'/config',{credentials:'omit',signal:AbortSignal.timeout(15000)}),config=await response.json();
  if(!response.ok)throw new Error(config.error||'Email signup is temporarily unavailable.');
  if(!window.turnstile)await new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
   if(existing){if(window.turnstile)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=reject;document.head.append(script);
  });
  widget=window.turnstile.render('#newsletter-challenge',{sitekey:config.siteKey,action:'newsletter',theme:'auto','response-field':false});
 }
 async function open(trigger){
  if(mode==='done')resetSignup();
  opener=trigger||document.activeElement;dialog.showModal();
  if(mode==='signup'){q('#newsletter-email').focus();try{await challenge()}catch(e){message(e.message||'Verification could not load. Please retry.')}}
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-newsletter-open]')){const trigger=e.target.closest('[data-newsletter-open]');if(e.target.closest('#about'))q('#about').close();open(trigger)}});
 document.addEventListener('newsletter-open',()=>{if(!dialog.open)open()});
 q('#newsletter-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{const target=opener?.getClientRects().length?opener:q('#top [data-newsletter-open]');target?.focus({preventScroll:true})});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
 form.addEventListener('input',()=>{attempt=undefined});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;q('#newsletter-submit').disabled=true;message('');
  try{
   if(mode==='manage'){await call('preferences',{token:linkToken,...prefs()});message('Preferences saved.');return}
   await challenge();const token=window.turnstile.getResponse(widget);if(!token)throw new Error('Please complete verification before continuing.');
   if(!attempt)attempt=crypto.randomUUID();
   await call('request',{email:q('#newsletter-email').value.trim(),...prefs(),website:q('#newsletter-website').value,token,id:attempt});
   form.hidden=true;message('Check your inbox. Open the link to confirm your subscription or preference change. If you requested a link recently, use that email.');
  }catch(e){message(['TypeError','TimeoutError'].includes(e.name)?'We couldn’t confirm your request. Your choices are kept here. Please retry.':e.message)}
  finally{busy=false;q('#newsletter-submit').disabled=false;if(widget!==undefined)window.turnstile.reset(widget)}
 });
 async function unsubscribe(){await call('unsubscribe',{token:linkToken});form.hidden=true;q('#newsletter-link-view').hidden=true;q('#newsletter-manage').hidden=true;mode='done';message('You’re unsubscribed. You won’t receive further email digests.')}
 q('#newsletter-unsubscribe').onclick=async()=>{if(busy)return;busy=true;try{await unsubscribe()}catch(e){message(e.message)}finally{busy=false}};
 q('#newsletter-confirm').onclick=async()=>{
  if(busy)return;busy=true;q('#newsletter-confirm').disabled=true;
  try{if(mode==='unsubscribe')await unsubscribe();else{const result=await call('confirm',{token:linkToken});q('#newsletter-link-view').hidden=true;mode='done';if(result.manage){q('#newsletter-manage a').href=result.manage;q('#newsletter-manage').hidden=false}message('You’re subscribed. Your chosen digests will include future updates only.')}}catch(e){message(e.message)}finally{busy=false;q('#newsletter-confirm').disabled=false}
 };
 function resetSignup(){mode='signup';linkToken='';attempt=undefined;form.reset();form.hidden=false;q('#newsletter-link-view').hidden=true;q('#newsletter-manage').hidden=true;q('#newsletter-confirm').hidden=false;q('#newsletter-new-link').hidden=true;q('#newsletter-email').disabled=false;q('#newsletter-challenge').hidden=false;q('#newsletter-unsubscribe').hidden=true;q('#newsletter-submit').textContent='Send confirmation link';q('#newsletter-h').textContent='Email updates';q('#newsletter-intro').textContent='Short, sourced updates when we publish new findings. Choose your frequency and coverage.';q('#newsletter-consent').textContent='We’ll email a confirmation link. No account needed. Change your preferences or unsubscribe at any time.';message('')}
 q('#newsletter-new-link').onclick=()=>{resetSignup();q('#newsletter-email').focus();challenge().catch(e=>message(e.message))};
 async function loadLink(intent){
  const match=/^(confirm|manage|unsubscribe)=(.+)$/.exec(intent||'');
  if(match){mode=match[1];linkToken=match[2]}
  if(!dialog.open)await open();if(!match)return;form.hidden=true;message('Loading your email preferences…');
  try{
   const result=await call('inspect',{token:linkToken});message('');q('#newsletter-h').textContent=mode==='manage'?'Email preferences':mode==='unsubscribe'?'Unsubscribe':'Confirm email updates';
   q('#newsletter-intro').textContent=mode==='manage'?'Choose the updates you receive. Changes take effect for your next digest.':mode==='unsubscribe'?'Stop email digests from Swarm Incidents.': 'Confirm these choices to start receiving future updates.';
   if(mode==='manage'&&!result.unsubscribed){form.hidden=false;setPrefs(result.preferences);q('#newsletter-email').value=result.email;q('#newsletter-email').disabled=true;q('#newsletter-submit').textContent='Save preferences';q('#newsletter-unsubscribe').hidden=false;q('#newsletter-challenge').hidden=true;q('#newsletter-consent').textContent='No account needed. You can unsubscribe at any time.'}
   else{q('#newsletter-link-view').hidden=false;q('#newsletter-link-summary').textContent=result.email+(result.preferences?'\n'+summary(result.preferences):'');q('#newsletter-confirm').textContent=mode==='unsubscribe'?'Unsubscribe':'Confirm subscription';if(result.unsubscribed&&mode==='manage')throw new Error('You’re unsubscribed. Request and confirm a new email link to subscribe again.')}
  }catch(e){form.hidden=true;q('#newsletter-link-view').hidden=false;q('#newsletter-confirm').hidden=true;q('#newsletter-new-link').hidden=false;message(e.message)}
 }
 document.addEventListener('newsletter-intent',e=>loadLink(e.detail));
 if(location.pathname.endsWith('/subscribe.html'))loadLink(window.__newsletterIntent);
})();
