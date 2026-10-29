// The swarms.wiki proxy deliberately rejects origin redirects. Resolve Pages'
// HTML canonicalization inside this origin so existing .html links stay usable.
export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Read only', {status:405,headers:{Allow:'GET, HEAD'}});
    let url = new URL(request.url);
    if (url.pathname.endsWith('/index.html')) url.pathname = url.pathname.slice(0,-10);
    else if (url.pathname.endsWith('.html')) url.pathname = url.pathname.slice(0,-5);
    let response;
    for (let attempts=0; attempts<3; attempts++) {
      response = await env.ASSETS.fetch(new Request(url, request));
      if (response.status<300 || response.status>=400) break;
      const location=response.headers.get('Location');
      if (!location) return new Response('Asset unavailable',{status:502});
      const target = new URL(location,url);
      if (target.origin!==url.origin || attempts===2) return new Response('Asset unavailable',{status:502});
      url=target;
    }
    const headers=new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin','*');
    if (['/incidents.json','/stats.json'].includes(url.pathname)) headers.set('Cache-Control','public, max-age=0, must-revalidate');
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
  }
};
