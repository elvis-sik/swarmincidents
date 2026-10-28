/* Updates-specific content only. Header, timeline, pickers, theme and pane are
   the actual dashboard components in template.html, shared by both pages. */
function renderUpdateNav() {
  $('#lvl').hidden = true;
  put($('#lvl'));
}
function renderUpdateTabs() {
  renderNav();
  const s = state.resp;
  put($('#tabs'), h('div', {class:'bar-row updates-title-row'},
    h('h2', {class:'tab update-heading', id:'updates-heading', text:'Updates'}),
    h('button', {type:'button',class:'mini-link update-subscribe','data-newsletter-open':'',text:'Email updates'}),
    h('a', {class:'mini-link update-subscribe', href:'feed.xml', 'aria-label':'Subscribe to updates via RSS'}, 'Subscribe via RSS ↗'),
    h('span', {class:'update-type-controls'}, h('span', {class:'flabel', text:'Type'}),
      h('span', {class:'seg update-types', role:'group', 'aria-label':'Update type'},
        [{id:'all',label:'All'}, ...Object.entries(RESP_WHO).map(([id,label])=>({id,label}))].map(t=>
          h('button', {type:'button', 'aria-label':t.label, 'aria-pressed':String(s.who===t.id),
            onclick:()=>{s.who=t.id==='all'||s.who===t.id?'all':t.id;updateFilterChanged()}},
            t.id==='all'?null:h('span',{class:'rdot g-'+RESP_DOT[t.id]}), t.label,
            h('span', {class:'n', 'aria-hidden':'true', text:String(t.id==='all'?RESP.length:RESP.filter(r=>r.who===t.id).length)})))))));
}
function updateFilterChanged() {
  const focusType=document.activeElement?.closest('.update-types button')?.getAttribute('aria-label');
  renderTabs(); renderView(); renderFilters(); setHash(state.rsp ? state.rsp : '');
  if(focusType)[...document.querySelectorAll('.update-types button')].find(b=>b.getAttribute('aria-label')===focusType)?.focus({preventScroll:true});
}
function renderUpdateFilters(f) {
  const s=state.resp;
  const field=(name,options,value,onPick)=>h('span',{class:'fgroup'},h('span',{class:'flabel',text:name}),
    picker({label:name,ariaLabel:name,hideLabel:true,searchable:false,options,value,on:value!=='all',onPick}));
  put(f,
    field('Reporting',[{v:'all',label:'Recent & archive'},{v:'recent',label:'Newly public information'},{v:'archive',label:'Archive additions'},{v:'correction',label:'Corrections'}],s.freshness,v=>{s.freshness=v;updateFilterChanged()}),
    incFilter(s), sortCtl(s,SORTS.responses.filter(o=>o.k==='d'),'Sort updates'));
}
function renderUpdateFoot() {
  const foot=$('#foot');foot.classList.remove('filtering','timeline-foot');
  put(foot, h('span',{class:'lg',text:'Site publication dates · Los Angeles time'}),
    h('span',{class:'sum',text:'Select an update to see what changed'}));
}
const UPDATE_FIELDS={openai:'Reported response (historical field)',title:'Title',summary:'Incident account',lab_response:'Reported response',response_title:'Response heading',activity:'Observed activity',reveals:'Public reporting',sources:'Sources',status:'Evidence status',found:'Discovery',knew:'When the developer learned',labs:'Model attribution',runby:'Run context',datasets:'Research data',category:'Category',noDates:'Activity-date qualification',text:'Account',inc:'Related incidents',inv:'Recorded effects',d:'Date',who:'Reported by',name:'Organization',where:'Location',kind:'Organization type',attr:'Attribution',note:'Qualification',what:'Effect',e:'End date',s:'Start date',by:'Reporter',minor:'Additional report'};
function updateValue(field,value) {
  if(value==null)return h('p',{class:'sub',text:'Not recorded'});
  if(field==='sources')return h('ul',{class:'srcs'},value.map(([title,publisher,url])=>h('li',{},extA(url,title),h('span',{text:' · '+publisher}))));
  if(field==='labs')return h('p',{text:value.map(labName).join(', ')});
  if(typeof value!=='object')return h('p',{text:String(value)});
  if(Array.isArray(value))return h('ul',{class:'update-values'},value.map(v=>h('li',{}, typeof v==='object'?(v.label?h('span',{text:v.label}):updateValue('',v)):String(v))));
  return h('div',{class:'update-values'},Object.entries(value).map(([key,v])=>h('div',{},h('span',{class:'sub',text:(UPDATE_FIELDS[key]||key)+': '}),updateValue(key,v))));
}
function updateTextDiff(a,b){
  const left=a.split(/(\s+)/),right=b.split(/(\s+)/);let start=0,end=0;
  while(start<Math.min(left.length,right.length)&&left[start]===right[start])start++;
  while(end<Math.min(left.length-start,right.length-start)&&left[left.length-1-end]===right[right.length-1-end])end++;
  const p=(words,tag)=>h('p',{},words.slice(0,start).join(''),h(tag,{text:words.slice(start,words.length-end).join('')}),end?words.slice(-end).join(''):'');
  return[p(left,'del'),p(right,'ins')];
}
function updateChanges(u){
  const out=[];
  for(const c of u.changes||[]){
    const before=c.before||{},after=c.after||{},priority=['summary','title','activity','lab_response','labs','status','sources'];
    const keys=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>k!=='id'&&JSON.stringify(before[k])!==JSON.stringify(after[k]))
      .sort((a,b)=>(priority.includes(a)?priority.indexOf(a):99)-(priority.includes(b)?priority.indexOf(b):99));
    if(!c.before_exists)out.push(h('p',{class:'sub',text:'Added to the collection; the event itself may be older.'}));
    for(const key of keys){
      let old=updateValue(key,before[key]),next=updateValue(key,after[key]);
      if(typeof before[key]==='string'&&typeof after[key]==='string')[old,next]=updateTextDiff(before[key],after[key]);
      out.push(h('details',{class:'update-change',open:key==='summary'?'open':null},
        h('summary',{text:(UPDATE_FIELDS[key]||key)+(c.path[0]==='responses'?' · response':c.path[0]==='affected'?' · organization':'')}),
        h('div',{class:'update-before'},h('span',{class:'update-change-label',text:'Before'}),c.before_exists?old:h('p',{class:'sub',text:'Not yet listed'})),
        h('div',{class:'update-after'},h('span',{class:'update-change-label',text:'After'}),next)));
    }
  }
  if(!out.length)out.push(h('p',{class:'sub',text:'Before-and-after details were not saved for this announcement.'}));
  return out;
}
function selectUpdate(id,opts={}){
  const r=RSP_BY_ID.get(id);if(!r)return;const u=r.update,hadCard=hasCard();
  if(!opts.keepBack)state.back=[];
  state.rsp=id;state.sel=null;state.ent=null;state.post=null;state.writer=null;markSelected();
  const order=respRows(),i=order.findIndex(x=>x.id===id);
  put($('#det'),h('div',{class:'det'},
    h('div',{class:'det-top'},topLine(respWho(r),fmtY(r.d)),navBtns(order,i,j=>selectRsp(j,{focus:true,keepBack:true}),'update')),
    h('h2',{id:'det-title',tabindex:'-1',text:u.title}),
    h('div',{class:'tags'},h('span',{class:'tag'},h('span',{class:'dot g-'+RESP_DOT[r.who]}),respWho(r)),
      u.history?.reconstructed?h('span',{class:'tag',text:'Reconstructed history'}):u.freshness==='archive'?h('span',{class:'tag',text:'From the archive'}):null),
    h('p',{text:u.summary}),
    DATA.incidents.some(i=>i.id===u.incident)
      ? h('div',{class:'invc'},h('a',{class:'btn primary update-incident-action',href:'/?tags=all#'+encodeURIComponent(u.incident),text:'View incident'}))
      : h('p',{class:'sub',text:'Retired from the active catalog. Original account and sources are preserved below in What changed.'}),
    r.src?.length?srcSection(r.src):null,
    h('h3',{text:'What changed'}),updateChanges(u),
    h('p',{class:'sub'},u.history?.reconstructed
      ? ['Reconstructed from the public repository on '+fmtY(r.d)+'. This is the commit date, not a verified deployment time or the event date. ',extA('https://github.com/elvis-sik/swarmincidents/commit/'+u.history.commit,'View historical revision ↗')]
      : 'Published here '+fmtY(r.d)+'. These are site-publication dates, not event dates.')));
  finishCard(id,document.querySelector(`[data-rsp-row="${id}"]`),opts,hadCard);
}
function renderUpdatesList(){
  const rows=respRows();setCount(rows.length,RESP.length,'updates');
  put($('#view'),h('div',{id:'rows',class:'update-list',role:'listbox','aria-label':'Updates'},
    rows.length?rows.map(r=>{
      const u=r.update,age=u.history?.reconstructed?'Reconstructed history':u.freshness==='archive'?'From the archive':u.freshness==='correction'?'Correction':'Newly public information';
      const publishers=[...new Set((u.resources||[{publisher:u.publisher}]).map(x=>x.publisher))].join(' · ');
      return h('button',{type:'button',class:'update-list-card',role:'option','data-rsp-row':r.id,'data-update':r.id,
        'aria-selected':String(state.rsp===r.id),'aria-label':r.title+'. '+fmtY(r.d)+', '+respWho(r)+'.','aria-describedby':'update-summary-'+r.id,
        onclick:()=>state.rsp===r.id?clearSel():selectRsp(r.id)},
        h('span',{class:'update-card-top'},h('span',{class:'update-card-kind'},h('span',{class:'rdot g-'+RESP_DOT[r.who]}),respWho(r)),h('time',{datetime:u.published,text:fmtY(r.d)})),
        h('span',{class:'update-card-title',text:u.title}),h('span',{class:'update-card-summary',id:'update-summary-'+r.id,text:u.summary}),
        h('span',{class:'update-card-meta',text:age+' · '+publishers}));
    }):h('p',{class:'empty',text:'No updates match these filters.'})));
  markSelected();renderUpdateFoot();
}

/* Reuse the exact detail content in a native modal, with browser focus trapping. */
let updateDialog=null, updateModalOverflow='', updateModalLocked=false;
if(UPDATES_PAGE){
  document.documentElement.classList.add('updates-modal-page');
  updateDialog=h('dialog',{id:'update-dialog',class:'update-dialog','aria-labelledby':'det-title'});
  updateDialog.append($('#det'));document.body.append(updateDialog);
  updateDialog.addEventListener('cancel',ev=>{ev.preventDefault();clearSel()});
  updateDialog.addEventListener('close',()=>{if(!updateDialog.open&&state.rsp)clearSel()});
  updateDialog.addEventListener('click',ev=>{
    if(ev.target!==updateDialog)return;
    const r=updateDialog.getBoundingClientRect();
    if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)clearSel();
  });
}
function openUpdateModal(focus){
  $('#det').hidden=false;
  const opening=!updateDialog.open;
  if(opening){updateModalOverflow=document.body.style.overflow;updateModalLocked=true;document.body.style.overflow='hidden';updateDialog.showModal()}
  updateDialog.scrollTop=0;
  if(opening||focus)$('#det-title').focus({preventScroll:true});
}
function closeUpdateModal(id){
  if(updateDialog?.open)updateDialog.close();
  if(updateModalLocked){document.body.style.overflow=updateModalOverflow;updateModalLocked=false}
  const row=id&&document.querySelector(`[data-rsp-row="${id}"]`);
  row?.focus({preventScroll:true});
}
