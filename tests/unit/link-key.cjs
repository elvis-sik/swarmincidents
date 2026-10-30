// LinkKey (link-key.js): the rules that decide whether a pasted link is a report the catalog already cites.
// Run: node --test tests/unit/link-key.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const here = path.join(__dirname, '..', '..');
const LinkKey = require(path.join(here, 'link-key.js'));
const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, 'link-key-cases.json'), 'utf8'));
const read = file => JSON.parse(fs.readFileSync(path.join(here, file), 'utf8'));

test('each pasted link gets the expected key, or is refused for the expected reason', () => {
  for (const c of cases) {
    const got = LinkKey.parse(c.in);
    if (c.reason) { assert.equal(got.ok, false, `${c.in} should be refused`); assert.equal(got.reason, c.reason, c.in); continue; }
    assert.equal(got.ok, true, `${c.in}: ${got.reason}`);
    if (c.key) assert.equal(got.key, c.key, c.in);
    if (c.kind) assert.equal(got.kind, c.kind, c.in);
    if (c.hash) assert.equal(got.hash, c.hash, c.in);
    if (c.version) assert.equal(got.version, c.version, c.in);
  }
});

test('what a suggestion stores drops only tracking: X share codes go, the fragment and real parameters stay', () => {
  assert.equal(LinkKey.parse('https://twitter.com/a/status/1?s=46&t=AbC').url, 'https://twitter.com/a/status/1');
  assert.equal(LinkKey.parse('https://example.com/view?id=2&utm_source=x#part').url, 'https://example.com/view?id=2#part');
  assert.equal(LinkKey.parse('https://thezvi.substack.com/p/x?utm_source=substack&token=secret').url, 'https://thezvi.substack.com/p/x');
});

test('the Worker’s copy is the same file', () => {
  const worker = path.join(here, '..', 'swarm-research-site', 'api', 'link-key.js');
  assert.equal(fs.readFileSync(worker, 'utf8'), fs.readFileSync(path.join(here, 'link-key.js'), 'utf8'), 'copy swarm/link-key.js to swarm-research-site/api/link-key.js');
});

test('the built page carries the current rules (rebuild with build.py after changing link-key.js)', () => {
  const page = fs.readFileSync(path.join(here, 'docs', 'index.html'), 'utf8');
  assert.ok(page.includes(fs.readFileSync(path.join(here, 'link-key.js'), 'utf8').trim()), 'docs/index.html is out of date');
});

// Every link the catalog holds, with the incident it belongs to.
function catalogLinks() {
  const data = read('incidents.json'), registry = read('source-registry.json'), links = [];
  const add = (inc, url) => links.push({ inc, url });
  for (const e of data.incidents) {
    e.sources.forEach(s => add(e.id, s[2]));
    e.reveals.forEach(r => (r.src || []).forEach(u => add(e.id, u)));
    e.activity.forEach(a => (a.src || []).forEach(u => add(e.id, u)));
    (e.knew?.src || []).forEach(u => add(e.id, u));
    (e.datasets || []).forEach(d => [d.url, d.download].filter(Boolean).forEach(u => add(e.id, u)));
  }
  data.responses.forEach(r => (r.src || []).forEach(s => r.inc.forEach(i => add(i, s[2]))));
  data.affected.forEach(a => a.inv.forEach(v => (v.src || []).forEach(u => add(v.inc, u))));
  for (const [id, v] of Object.entries(registry.incidents))
    [...(v.curated || []), ...(v.additional || [])].forEach(sid => [registry.sources[sid].url, ...registry.sources[sid].aliases].forEach(u => add(id, u)));
  return { links, registry };
}

test('every link in the catalog can be looked up', () => {
  const { links } = catalogLinks();
  assert.ok(links.length > 900, 'positive control: the catalog was read');
  const refused = links.filter(l => !LinkKey.parse(l.url).ok).map(l => `${l.inc}: ${l.url} (${LinkKey.parse(l.url).reason})`);
  assert.deepEqual(refused, []);
});

test('each source’s other spellings in the registry find the same source', () => {
  const { registry } = catalogLinks();
  let aliases = 0;
  for (const s of Object.values(registry.sources)) for (const a of s.aliases) { aliases++; assert.equal(LinkKey.key(a), LinkKey.key(s.url), a); }
  assert.ok(aliases >= 6, 'positive control: the registry has aliases');
});

test('links merge only by a site’s own identity rules, never two ordinary pages into one', () => {
  // The pipeline's own canonical form (catalog_provenance.py): scheme, www, fragment, trailing slash and utm/fbclid/gclid
  // aside, the link as written. Two ordinary web links may share a key only if they agree on it.
  const strict = url => { const u = new URL(url); const q = [...u.searchParams].filter(([k]) => !/^utm_|^(fbclid|gclid)$/i.test(k)).sort();
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '') + (q.length ? '?' + new URLSearchParams(q) : ''); };
  const byKey = new Map();
  for (const { url } of catalogLinks().links) { const p = LinkKey.parse(url); if (!byKey.has(p.key)) byKey.set(p.key, { kind: p.kind, urls: new Set() }); byKey.get(p.key).urls.add(url); }
  const merged = [...byKey.values()].filter(b => b.urls.size > 1);
  assert.ok(merged.some(b => b.kind === 'arxiv') && merged.some(b => b.kind === 'x'), 'positive control: the catalog has arXiv versions and X share links');
  for (const b of merged.filter(b => b.kind === 'web')) assert.equal(new Set([...b.urls].map(strict)).size, 1, [...b.urls].join(' | '));
});
