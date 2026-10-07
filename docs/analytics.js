/* Aggregate GoatCounter telemetry. No accounts, persistent visitor IDs, or search text. */
(() => {
  'use strict';
  const enabled = location.protocol === 'https:' && ['swarmincidents.com', 'www.swarmincidents.com'].includes(location.hostname);
  const labels = {
    'engaged-30s': '30 seconds of attention', 'engaged-2m': '2 minutes of attention',
    'incident-open': 'Incident opened', 'reader-open': 'Agent post reader opened',
    'thread-open': 'Thread explored', 'post-open': 'Agent post inspected',
    'source-open': 'Source followed', 'archive-open': 'Original archive followed',
    'view': 'Overview view', 'wording': 'Reader wording', 'models': 'Model filter',
    'support-open': 'Support link followed', 'contact-open': 'Contact link followed',
  };
  const seen = new Set(), queue = [];
  let ready = false, landingSent = false;
  function optedOut() {
    try { return localStorage.getItem('skipgc') === 't'; } catch (e) { return false; }
  }
  function send(hit) {
    if (!enabled || optedOut()) return;
    if (!ready || !landingSent) { if (queue.length < 100) queue.push(hit); return; }
    try { window.goatcounter.count(hit); } catch (e) { /* Analytics must never interrupt reading. */ }
  }
  function event(name, detail = '') {
    if (!labels[name] || !enabled || optedOut()) return;
    // Aggregate rows give each action's share of visits without summing per-content counts.
    if (detail && ['incident-open', 'thread-open', 'post-open', 'source-open'].includes(name)) event(name);
    // Details come only from public content IDs, fixed UI choices, or source hostnames.
    const slug = String(detail).replace(/[^a-zA-Z0-9._~-]/g, '-').slice(0, 100);
    const path = name + (slug ? '/' + slug : '');
    if (seen.has(path)) return;
    seen.add(path);
    send({ path, title: labels[name] + (slug ? ': ' + slug : ''), event: true, referrer: '' });
  }
  window.SwarmAnalytics = { event };
  if (!enabled) return; // Development, previews and local tests never load the tracker.

  const campaign = new URLSearchParams();
  for (const name of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = new URLSearchParams(location.search).get(name);
    if (value) campaign.set(name, value.slice(0, 100));
  }
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch (e) { /* Direct visit. */ }
  window.goatcounter = { no_onload: true, no_events: true, referrer };
  // Preserve the built-in opt-out toggle even though app routing changes hashes.
  if (location.hash === '#toggle-goatcounter') {
    try {
      const off = !optedOut();
      if (off) localStorage.setItem('skipgc', 't'); else localStorage.removeItem('skipgc');
      alert('GoatCounter tracking is now ' + (off ? 'DISABLED' : 'ENABLED') + ' in this browser.');
    } catch (e) { /* Storage unavailable. */ }
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (optedOut()) return;

  function landing() {
    if (!ready || landingSent || document.visibilityState !== 'visible') return;
    landingSent = true;
    send({ path: '/', title: 'Swarm Incidents', event: false, referrer });
    while (queue.length) send(queue.shift());
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = 'https://swarmincidents.goatcounter.com/count';
  script.onload = () => {
    if (!window.goatcounter || typeof window.goatcounter.get_data !== 'function' || typeof window.goatcounter.count !== 'function') return;
    // count.js normally includes the entire query string. Send only public campaign tags.
    const getData = window.goatcounter.get_data;
    window.goatcounter.get_data = vars => {
      const data = getData(vars);
      data.q = data.e || !campaign.size ? '' : '?' + campaign.toString();
      return data;
    };
    ready = true;
    landing();
  };
  document.head.appendChild(script);
  document.addEventListener('visibilitychange', landing);

  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    if (a.id === 'mail-link') { event('contact-open'); return; }
    let url; try { url = new URL(a.href); } catch (e) { return; }
    if (url.hostname === location.hostname && url.hash === '#toggle-goatcounter') {
      ev.preventDefault();
      history.replaceState(null, '', location.pathname + location.search + url.hash);
      location.reload();
      return;
    }
    if (url.hostname === 'manifund.org') event('support-open');
    else if (url.hostname === 'collusion.wiki') event('archive-open');
    if (a.closest('.srcs,.srcstrip,.srcsec')) event('source-open', url.hostname.replace(/^www\./, ''));
  }, true);

  // Approximate attention: visible AND focused time; background tabs and sleep do not accrue time.
  let attention = 0, last = performance.now();
  setInterval(() => {
    const now = performance.now(), delta = Math.min(1000, now - last);
    last = now;
    if (!landingSent || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    attention += delta;
    if (attention >= 30000) event('engaged-30s');
    if (attention >= 120000) event('engaged-2m');
  }, 1000);
})();
