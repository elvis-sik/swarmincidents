const test=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
const worker=()=>import(pathToFileURL(path.join(__dirname,'../../pages-origin.mjs')).href).then(m=>m.default);
test('legacy HTML routes return content without a redirect to the wiki proxy',async()=>{
 const origin=await worker();
 for(const [input,asset] of [['/','/'],['/index.html','/'],['/updates.html','/updates'],['/subscribe.html','/subscribe']]){
  const calls=[];const r=await origin.fetch(new Request('https://pages.swarmincidents.com'+input),{ASSETS:{fetch:async q=>{calls.push(new URL(q.url).pathname);return new Response('<p>site</p>',{headers:{'Content-Type':'text/html'}})}}});
  assert.deepEqual(calls,[asset]);assert.equal(r.status,200);assert.equal(r.headers.get('Location'),null);assert.equal(await r.text(),'<p>site</p>');
 }
});
test('one internal asset redirect is resolved without leaking a Location header',async()=>{
 const origin=await worker();let calls=0;const r=await origin.fetch(new Request('https://pages.swarmincidents.com/updates.html'),{ASSETS:{fetch:async()=>++calls===1?new Response(null,{status:301,headers:{Location:'/updates/'}}):new Response('history')}});
 assert.equal(calls,2);assert.equal(r.status,200);assert.equal(await r.text(),'history');
});
test('external redirects and redirect loops never become proxy redirects',async()=>{
 const origin=await worker();
 for(const location of ['https://unrelated.example/page','/updates']){
  let calls=0;const r=await origin.fetch(new Request('https://pages.swarmincidents.com/updates.html'),{ASSETS:{fetch:async()=>{calls++;return new Response(null,{status:302,headers:{Location:location}})}}});
  assert.equal(r.status,502);assert.ok(calls<=3);assert.equal(r.headers.get('Location'),null);
 }
});
test('catalog bytes, CORS, freshness and HEAD semantics are preserved',async()=>{
 const origin=await worker();const content='{"incidents":[]}';
 for(const method of ['GET','HEAD']){
  const r=await origin.fetch(new Request('https://pages.swarmincidents.com/incidents.json',{method}),{ASSETS:{fetch:async()=>new Response(content,{headers:{'Content-Type':'application/json',ETag:'reviewed'}})}});
  assert.equal(r.status,200);assert.equal(r.headers.get('ETag'),'reviewed');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');assert.match(r.headers.get('Cache-Control'),/must-revalidate/);assert.equal(await r.text(),method==='GET'?content:'');
 }
});
test('missing assets remain missing and unsupported writes never reach assets',async()=>{
 const origin=await worker();let called=false;const env={ASSETS:{fetch:async()=>{called=true;return new Response('Missing',{status:404})}}};
 const post=await origin.fetch(new Request('https://pages.swarmincidents.com/',{method:'POST'}),env);assert.equal(post.status,405);assert.equal(called,false);
 const missing=await origin.fetch(new Request('https://pages.swarmincidents.com/missing.html'),env);assert.equal(missing.status,404);
});
