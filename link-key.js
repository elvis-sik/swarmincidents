/* Link identity (October 29, Elvis: paste a report's link into the incident search and see the incidents that cite it).
   LinkKey.parse(text) gives a link's key: what a pasted link and a catalog source must share to count as the same report.
   The tracker's search uses it (build.py inlines this file); the swarms.wiki Worker keeps an identical copy
   (swarm-research-site/api/link-key.js) to de-duplicate suggested links. tests/unit/link-key.cjs keeps the two
   copies identical and checks the rules against every link in the catalog.
   Nothing here fetches a link or follows a redirect: a short link stays unknown until someone pastes where it leads.
   Keys are links without the scheme (https:// + key opens the report): x.com/i/status/1, arxiv.org/abs/2509.12345,
   doi.org/10.1145/1, youtube.com/watch?v=abc, github.com/owner/repo/issues/12, example.com/a/b?id=3. */
const LinkKey = (() => {
  'use strict';
  /* query parameters that only say where a click came from; anything else is kept, since it can choose the content */
  const TRACKING = /^(utm_\w+|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|yclid|twclid|ttclid|igshid|igsh|mc_cid|mc_eid|mkt_tok|_hsenc|_hsmi|hsctatracking|oly_anon_id|oly_enc_id|vero_conv|vero_id|wickedid|rb_clickid|s_cid|cmpid|smid|ref_src|ref_url|__twitter_impression|_gl|ncid|sr_share|trk|li_fat_id|sc_cid|share_source|share_medium|mibextid|rdt)$/i;
  /* and per site: X's share codes (s, t), YouTube's share and position, Substack's referral and sign-in token */
  const SITE_TRACKING = { 'x.com': /^(s|t|src|ref)$/i, 'youtube.com': /^(si|t|feature|pp|ab_channel|start)$/i, 'substack.com': /^(r|token|triedredirect|showwelcomeonshare|isfreemail|publication_id|post_id|open)$/i, 'medium.com': /^(source|sk)$/i, 'linkedin.com': /^(rcm|lipi|midtoken|midsig|trkemail|eid|originalsubdomain)$/i, 'reddit.com': /^(share_id|context|sh|st)$/i };
  const X_HOSTS = /^(x\.com|twitter\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com|fixvx\.com|twittpr\.com|xcancel\.com|nitter\.[a-z0-9.-]+)$/;
  const ARXIV_ID = '(\\d{4}\\.\\d{4,5}|[a-z-]+(?:\\.[a-z]{2})?\\/\\d{7})';
  /* links that only redirect (or need an account to resolve): we can't tell where they go without following them */
  const SHORT = new Set(['t.co', 'bit.ly', 'bitly.com', 'tinyurl.com', 'buff.ly', 'lnkd.in', 'ow.ly', 'goo.gl', 'dlvr.it', 'trib.al', 'shorturl.at', 'rb.gy', 'is.gd', 'tiny.cc', 'cutt.ly', 's.id', 't.ly', 'bl.ink', 'rebrand.ly', 'amzn.to', 'flip.it', 'ift.tt', 'wp.me', 'fb.me', 'fb.watch', 'on.ft.com', 'nyti.ms', 'wapo.st', 'bbc.in', 'reut.rs', 'bloom.bg', 'econ.st', 'cnn.it', 'apne.ws', 'nbcnews.to', 'n.pr', 'politi.co', 'theatln.tc', 'tcrn.ch', 'engt.co', 'spoti.fi', 'apple.co', 'g.co', 'aka.ms', 'search.app', 'share.google', 'shorturl.com', 'snip.ly', 'surl.li', 'v.gd', 'qr.ae', 'lnk.to', 'linktr.ee']);
  const ARCHIVE_TODAY = /^archive\.(ph|is|li|vn|md|today)$/;
  /* swarms.wiki and the tracker's other addresses: a link to this site is answered by the site itself */
  const SELF = /^(swarms\.wiki|staging\.swarms\.wiki|swarmincidents\.com|pages\.swarmincidents\.com)$/;
  /* hosts nobody outside can reach, or that point back at the machine reading them */
  const PRIVATE = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|example|invalid|onion|arpa)$/;

  const fail = (reason, extra) => Object.assign({ ok: false, reason }, extra);
  /* what people paste: a link with or without https://, inside quotes or brackets, defanged (hxxps://evil[.]com),
     or an arXiv ID or DOI on its own */
  function tidy(text) {
    let s = String(text == null ? '' : text).trim();
    if (!s || /\s/.test(s)) return null;
    s = s.replace(/^hxxp/i, 'http').replace(/\[\.\]|\(\.\)|\{\.\}/g, '.').replace(/\[:\]/g, ':').replace(/^[<"'“‘(\[]+/, '');
    /* a closing bracket the link doesn't open, or a full stop that ends the sentence around it */
    while (/[>.,;:!?)\]}'"”’]$/.test(s) && !(s.endsWith(')') && (s.match(/\(/g) || []).length >= (s.match(/\)/g) || []).length)) s = s.slice(0, -1);
    const arxiv = s.match(new RegExp('^arxiv:\\s*' + ARXIV_ID + '(v\\d+)?$', 'i')) || s.match(/^(\d{4}\.\d{4,5})(v\d+)?$/);
    if (arxiv) return 'https://arxiv.org/abs/' + arxiv[1] + (arxiv[2] || '');
    const doi = s.match(/^(?:doi:\s*)?(10\.\d{4,9}\/\S+)$/i);
    if (doi) return 'https://doi.org/' + doi[1];
    if (/^https?:\/\//i.test(s)) return s;
    /* no scheme: www.something, or a host followed by a path (x.com/...). A bare name like openai.com stays a word,
       which the text search finds among the sources' sites. */
    if (/^www\.[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}[/?#]./i.test(s)) return 'https://' + s;
    return null;
  }
  const decode = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };
  /* another site's address inside this one: archives, caches, AMP and click-through redirects */
  function unwrap(u) {
    const host = u.hostname.replace(/^www\./, ''), path = u.pathname, q = u.searchParams;
    const inner = s => (s && /^https?:\/*[^/]/i.test(s) ? s.replace(/^(https?):\/*/i, '$1://') : null);
    if (host === 'web.archive.org' || host === 'wayback.archive.org') {
      const m = (path + u.search).match(/^\/web\/[0-9*]{1,14}(?:[a-z]{2}_)?\/(.+)$/i);
      return m && inner(m[1]);
    }
    if (ARCHIVE_TODAY.test(host)) {
      const m = (path + u.search).match(/^\/(?:\d{8,14}|\d{4}\.\d{2}\.\d{2}-\d{6}|newest|oldest|o\/[a-z0-9]+)\/(.+)$/i);
      return m && inner(m[1]);
    }
    if (host === 'webcache.googleusercontent.com') {
      let s = (q.get('q') || '').replace(/^cache:/i, '');
      if (!/^https?:/i.test(s)) s = s.replace(/^[\w-]+:(?!\/)/, '');
      return s && inner(/^https?:/i.test(s) ? s : 'https://' + s);
    }
    if (/^(google\.[a-z.]+)$/.test(host) && path === '/url') return inner(q.get('q') || q.get('url'));
    if (/^google\.[a-z.]+$/.test(host) && path.startsWith('/amp/s/')) return 'https://' + path.slice(7);
    if (host.endsWith('.cdn.ampproject.org')) { const m = path.match(/^\/[cv]\/(s\/)?(.+)$/); return m && (m[1] ? 'https://' : 'http://') + m[2]; }
    if (/^(l|lm)\.facebook\.com$|^l\.instagram\.com$/.test(host)) return inner(q.get('u'));
    if (host === 'linkedin.com' && path === '/redir/redirect') return inner(q.get('url'));
    if (host === 'slack-redir.net' || host === 'out.reddit.com') return inner(q.get('url'));
    if (host === 'duckduckgo.com' && path === '/l/') return inner(q.get('uddg'));
    if (host === 'youtube.com' && path === '/redirect') return inner(q.get('q'));
    if (host === 'href.li') return inner(decode(u.search.slice(1)));
    if (host === 'r.jina.ai' || host === '12ft.io') return inner(decode((path + u.search).slice(1)).replace(/^proxy\?q=/, ''));
    return null;
  }
  /* the host a key starts with: no www., mobile or AMP prefix, one name for each site's aliases */
  function siteHost(hostname) {
    let host = hostname.toLowerCase().replace(/\.$/, '').replace(/^(www\d?|m|mobile|amp)\.(?=[^.]+\.[^.]+)/, '');
    host = host.replace(/^([a-z]{2,3})\.m\.(wikipedia|wiktionary|wikimedia)\.org$/, '$1.$2.org');
    if (X_HOSTS.test(host)) return 'x.com';
    if (/^(old|new|np|i)\.reddit\.com$/.test(host)) return 'reddit.com';
    if (host === 'youtube-nocookie.com' || host === 'music.youtube.com') return 'youtube.com';
    if (host === 'threads.com') return 'threads.net';
    if (host === 'dx.doi.org') return 'doi.org';
    if (host === 'export.arxiv.org') return 'arxiv.org';
    return host;
  }
  /* the identity a site gives its reports, however the link to them is written */
  function identity(host, path, q) {
    let m;
    if (host === 'x.com') {
      if ((m = path.match(/^\/(?:i\/web|i|[^/]+)\/status(?:es)?\/(\d+)(?:\/.*)?$/))) return ['x', 'x.com/i/status/' + m[1]];
      if ((m = path.match(/^\/([a-z0-9_]{1,15})\/?$/i)) && !/^(home|i|search|explore|settings|messages|notifications)$/i.test(m[1])) return ['x-account', 'x.com/' + m[1].toLowerCase()];
    }
    if (host === 'arxiv.org' || host === 'ar5iv.org' || host === 'ar5iv.labs.arxiv.org' || host === 'alphaxiv.org') {
      if ((m = path.match(new RegExp('^\\/(?:abs|pdf|html|format|ps|src|overview|papers)\\/' + ARXIV_ID + '(v\\d+)?(?:\\.pdf)?(?:\\/.*)?$', 'i')))) return ['arxiv', 'arxiv.org/abs/' + m[1].toLowerCase(), m[2] || ''];
    }
    if (host === 'huggingface.co' && (m = path.match(/^\/papers\/(\d{4}\.\d{4,5})(v\d+)?\/?$/))) return ['arxiv', 'arxiv.org/abs/' + m[1], m[2] || ''];
    if (host === 'doi.org' && (m = path.match(/^\/(10\.\d{4,9}\/.+)$/))) return doiKey(decode(m[1]));
    if ((m = path.match(/^\/doi\/(?:abs\/|full\/|pdf\/|epdf\/|reader\/|book\/|fullhtml\/)?(10\.\d{4,9}\/[^?#]+)$/))) return doiKey(decode(m[1]));
    if (host === 'link.springer.com' && (m = path.match(/^\/(?:article|chapter|content\/pdf)\/(10\.\d{4,9}\/[^?#]+?)(?:\.pdf)?$/))) return doiKey(decode(m[1]));
    if ((host === 'biorxiv.org' || host === 'medrxiv.org') && (m = path.match(/^\/content\/(10\.\d{4,9}\/[\d.]+?)(?:v\d+)?(?:\.full(?:\.pdf)?|\.abstract|\.pdf)?(?:\/.*)?$/))) return doiKey(m[1]);
    if (host === 'nature.com' && (m = path.match(/^\/articles\/([a-z0-9.-]+?)(?:\.pdf)?$/i))) return doiKey('10.1038/' + m[1]);
    if (host === 'journals.plos.org' && /^10\.\d{4,9}\//.test(q.get('id') || '')) return doiKey(q.get('id'));
    if (host === 'youtube.com') {
      const v = path === '/watch' ? q.get('v') : ((m = path.match(/^\/(?:shorts|embed|live|v|e)\/([\w-]{6,})/)) && m[1]);
      if (v && /^[\w-]{6,}$/.test(v)) return ['video', 'youtube.com/watch?v=' + v];
    }
    if (host === 'youtu.be' && (m = path.match(/^\/([\w-]{6,})/))) return ['video', 'youtube.com/watch?v=' + m[1]];
    if (host === 'reddit.com' && (m = path.match(/^\/(?:r\/[^/]+\/|user\/[^/]+\/)?comments\/([a-z0-9]+)(?:\/.*)?$/i))) return ['reddit', 'reddit.com/comments/' + m[1].toLowerCase()];
    if (host === 'redd.it' && (m = path.match(/^\/([a-z0-9]+)$/i))) return ['reddit', 'reddit.com/comments/' + m[1].toLowerCase()];
    if (host === 'github.com' && (m = path.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?(\/.*)?$/))) {
      const rest = (m[3] || '').replace(/^\/pull\/(\d+)(?:\/(?:files|commits|checks|changes))?$/, '/issues/$1');
      return ['github', 'github.com/' + m[1].toLowerCase() + '/' + m[2].toLowerCase() + rest];
    }
    if (host === 'open.substack.com' && (m = path.match(/^\/pub\/([a-z0-9-]+)\/p\/([^/]+)/i))) return ['post', m[1].toLowerCase() + '.substack.com/p/' + m[2]];
    if (/\.substack\.com$/.test(host) && (m = path.match(/^\/p\/([^/]+)(?:\/comments)?$/))) return ['post', host + '/p/' + m[1]];
    if ((host === 'medium.com' || /\.medium\.com$/.test(host)) && (m = path.match(/-([0-9a-f]{10,12})$/))) return ['post', 'medium.com/p/' + m[1]];
    if (host === 'linkedin.com' && (m = path.match(/(?:activity[-:])(\d{15,25})/))) return ['post', 'linkedin.com/feed/update/urn:li:activity:' + m[1]];
    if (host === 'threads.net' && (m = path.match(/^\/(?:@[^/]+\/post|t)\/([\w-]+)/))) return ['post', 'threads.net/t/' + m[1]];
    if (host === 'bsky.app' && (m = path.match(/^\/profile\/([^/]+)\/post\/([a-z0-9]+)$/i))) return ['post', 'bsky.app/profile/' + m[1].toLowerCase() + '/post/' + m[2]];
    return null;
  }
  function doiKey(doi) {
    const d = doi.toLowerCase().replace(/\/+$/, '');
    const arxiv = d.match(/^10\.48550\/arxiv\.(.+?)(v\d+)?$/);
    return arxiv ? ['arxiv', 'arxiv.org/abs/' + arxiv[1], arxiv[2] || ''] : ['doi', 'doi.org/' + d];
  }
  /* percent escapes in one case, and unreserved characters not escaped at all */
  const tidyPath = p => p.replace(/%[0-9a-f]{2}/gi, e => { const c = String.fromCharCode(parseInt(e.slice(1), 16)); return /[A-Za-z0-9\-._~]/.test(c) ? c : e.toUpperCase(); });

  function parse(text) {
    let raw = tidy(text);
    if (!raw) return fail('not-a-link');
    if (raw.length > 4096) return fail('too-long');
    const via = [];
    let u;
    for (let depth = 0; ; depth++) {
      try { u = new URL(raw); } catch (e) { return fail('not-a-link'); }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return fail('scheme');
      const inner = depth < 3 && unwrap(u);
      if (!inner) break;
      via.push(u.hostname.replace(/^www\./, '')); raw = inner;
    }
    if (u.username || u.password) return fail('credentials');
    const host = siteHost(u.hostname);
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.startsWith('[') || PRIVATE.test(host)) return fail('private', { host });
    if (u.port) return fail('port', { host });
    if (SHORT.has(host) || (ARCHIVE_TODAY.test(host) && /^\/[a-z0-9]{4,6}$/i.test(u.pathname)) || (host === 'reddit.com' && /^\/r\/[^/]+\/s\//.test(u.pathname)) || /^substack\.com$/.test(host) && u.pathname.startsWith('/redirect/')) return fail('short', { host });
    const site = /\.substack\.com$/.test(host) ? 'substack.com' : /\.medium\.com$/.test(host) ? 'medium.com' : host;
    const drop = k => TRACKING.test(k) || (SITE_TRACKING[site] && SITE_TRACKING[site].test(k)) || (k.toLowerCase() === 'ref' && !host.startsWith('api.')) || (k === 'amp' || k === 'outputType');
    const kept = [...u.searchParams].filter(([k]) => !drop(k)).sort((a, b) => (a[0] + '=' + a[1]).localeCompare(b[0] + '=' + b[1]));
    const query = new URLSearchParams(kept).toString();
    let path = tidyPath(u.pathname).replace(/\/{2,}/g, '/').replace(/\/(index\.html?|amp|amp\.html)$/i, '/');
    if (path.length > 1) path = path.replace(/\/+$/, '');
    /* a fragment names a place in the page, except in pages that route on it (#/ or #!) */
    const route = /^#[!/]/.test(u.hash) ? u.hash : '';
    if (SELF.test(host)) return { ok: true, kind: 'self', key: host + path + route, host, hash: decode(u.hash.slice(1)), path, url: u.href, via };
    const id = identity(host, path, new URLSearchParams(kept));
    const key = id ? id[1] : host + path + (query ? '?' + query : '') + route;
    /* the link as sent, minus what only tracks the click: what a suggestion stores */
    const clean = new URL(u.href); clean.search = new URLSearchParams([...u.searchParams].filter(([k]) => !drop(k))).toString();
    return { ok: true, kind: id ? id[0] : 'web', key, host, version: id && id[2] || '', url: clean.href, via };
  }
  return { parse, key: text => { const p = parse(text); return p.ok ? p.key : null; } };
})();
if (typeof module === 'object' && module.exports) module.exports = LinkKey;
