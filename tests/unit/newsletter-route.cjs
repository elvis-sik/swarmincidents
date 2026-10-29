const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../../template.html'), 'utf8');
const early = html.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const pathname of ['/subscribe.html','/subscribe','/subscribe/','/swarmincidents/subscribe.html']) {
 test(`subscription intent stays out of the URL on ${pathname}`,()=>{
  const calls=[];const handlers={};const location={pathname,hash:'#confirm=test-only-intent'};const window={addEventListener:(n,f)=>handlers[n]=f};
  vm.runInNewContext(early,{location,window,history:{replaceState:(...a)=>calls.push(a)},document:{dispatchEvent:()=>{}},CustomEvent:function(n,v){this.detail=v.detail}});
  assert.equal(window.__newsletterIntent,'confirm=test-only-intent');assert.equal(calls.length,1);assert.equal(calls[0][2],pathname);
  let stopped=false;location.hash='#manage=test-only-new-intent';handlers.hashchange({stopImmediatePropagation:()=>stopped=true});
  assert.equal(window.__newsletterIntent,'manage=test-only-new-intent');assert.equal(stopped,true);assert.equal(calls.length,2);
 });
}
for (const pathname of ['/','/updates.html','/updates','/notsubscribe']) {
 test(`ordinary incident hashes are preserved on ${pathname}`,()=>{
  let calls=0;const window={};vm.runInNewContext(early,{location:{pathname,hash:'#hugging-face'},window,history:{replaceState:()=>calls++}});
  assert.equal(calls,0);assert.equal(window.__newsletterIntent,undefined);
 });
}
