const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', '..', 'analytics.js'), 'utf8');

function harness({ host = 'swarmincidents.com', disabled = false, visible = true, storageError = false } = {}) {
  const sent = [], scripts = [], listeners = {}, store = new Map(disabled ? [['skipgc', 't']] : []);
  let now = 0, tick, focused = true;
  const document = {
    visibilityState: visible ? 'visible' : 'hidden', referrer: 'https://example.com/private?email=secret#token',
    head: { appendChild: s => scripts.push(s) }, createElement: () => ({ dataset: {} }),
    addEventListener: (name, fn) => { listeners[name] = fn; }, hasFocus: () => focused,
  };
  const context = {
    window: {}, document, location: { hostname: host, protocol: host === 'localhost' ? 'http:' : 'https:', pathname: '/',
      search: '?utm_source=x&utm_campaign=launch&email=secret&models=all', hash: '' },
    localStorage: { getItem: k => { if (storageError) throw Error('unavailable'); return store.get(k); },
      setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    URL, URLSearchParams, Set, performance: { now: () => now }, setInterval: fn => { tick = fn; },
    history: { replaceState: () => {} }, alert: () => {},
  };
  vm.runInNewContext(source, context);
  function load({ fail = false } = {}) {
    if (fail) { scripts[0].onload(); return; }
    context.window.goatcounter.get_data = vars => ({ p: vars.path, e: vars.event, r: vars.referrer, q: context.location.search });
    context.window.goatcounter.count = vars => sent.push(context.window.goatcounter.get_data(vars));
    scripts[0].onload();
  }
  return { context, sent, scripts, load, event: (...a) => context.window.SwarmAnalytics.event(...a),
    advance: (seconds, focus = true) => { focused = focus; for (let i = 0; i < seconds; i++) { now += 1000; tick(); } },
    show: () => { document.visibilityState = 'visible'; listeners.visibilitychange(); },
    hide: () => { document.visibilityState = 'hidden'; },
  };
}

test('local previews and opted-out browsers do not load or send analytics', () => {
  for (const options of [{ host: 'localhost' }, { host: 'elvis-sik.github.io' }, { disabled: true }]) {
    const h = harness(options); h.event('incident-open', 'wikis');
    assert.equal(h.scripts.length, 0); assert.equal(h.sent.length, 0);
  }
});
test('landing counts once; queued SPA events remain events and repeated actions are deduplicated', () => {
  const h = harness(); h.event('incident-open', 'wikis'); h.load();
  h.event('incident-open', 'wikis'); h.event('reader-open'); h.show();
  assert.deepEqual(h.sent.map(x => [x.p, x.e]), [['/', false], ['incident-open', true], ['incident-open/wikis', true], ['reader-open', true]]);
});
test('only campaign tags and referrer origin leave the browser, never arbitrary URL parameters', () => {
  const h = harness(); h.load(); h.event('source-open', 'research.example');
  assert.equal(h.sent[0].q, '?utm_source=x&utm_campaign=launch');
  assert.equal(h.sent[0].r, 'https://example.com');
  assert.equal(h.sent[1].q, ''); assert.equal(h.sent[1].r, '');
  assert.ok(!JSON.stringify(h.sent).includes('secret'));
});
test('hidden landing waits; attention excludes hidden/unfocused time and emits each threshold once', () => {
  const h = harness({ visible: false }); h.event('reader-open'); h.load();
  assert.equal(h.sent.length, 0); h.show(); h.advance(20); h.advance(90, false); h.hide(); h.advance(90);
  assert.ok(!h.sent.some(x => x.p === 'engaged-30s'));
  h.show(); h.advance(10); h.advance(100); h.advance(10);
  assert.equal(h.sent.filter(x => x.p === 'engaged-30s').length, 1);
  assert.equal(h.sent.filter(x => x.p === 'engaged-2m').length, 1);
});
test('missing provider and unavailable browser storage leave the app usable', () => {
  const h = harness({ storageError: true }); h.event('reader-open');
  assert.doesNotThrow(() => h.load({ fail: true }));
  assert.doesNotThrow(() => h.event('incident-open', 'wikis'));
  assert.equal(h.sent.length, 0);
});
