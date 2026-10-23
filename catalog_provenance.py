"""Persist catalog dates and all reviewed source associations, independent of card length.

No discovery or inferred incident matching here. Previously retained references are
never removed by synchronization. New disclosure rows need explicit source URLs.
"""
import argparse
import copy
from datetime import datetime
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def canonical_reference(url):
    p = urlsplit(url)
    if p.scheme != 'https' or not p.hostname or p.username or p.password or p.port not in (None, 443):
        raise ValueError('Reference needs a credential-free HTTPS URL')
    host = p.hostname.lower()
    if host in ('twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'x.com', 'www.x.com'):
        match = re.fullmatch(r'/(?:[^/]+/status|i/web/status|i/status)/(\d+)/?', p.path)
        if match:
            return 'https://x.com/i/status/' + match[1]
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('fbclid', 'gclid')]
    return urlunsplit(('https', host, p.path.rstrip('/') or '/', urlencode(sorted(query)), ''))


def source_id(url):
    return 'src-' + hashlib.sha256(canonical_reference(url).encode()).hexdigest()[:20]


def add_source(registry, triple):
    title, publisher, url = triple
    ident = source_id(url)
    sources = registry.setdefault('sources', {})
    row = sources.setdefault(ident, {'url': url, 'title': title, 'publisher': publisher,
                                    'aliases': [], 'labels': []})
    if canonical_reference(row['url']) != canonical_reference(url):
        raise ValueError('Source ID collision')
    if url != row['url'] and url not in row['aliases']:
        row['aliases'].append(url)
    label = {'title': title, 'publisher': publisher}
    if label != {'title': row['title'], 'publisher': row['publisher']} and label not in row['labels']:
        row['labels'].append(label)
    if urlsplit(url).hostname == 'd3ncjnql1bmhe8.cloudfront.net':
        row['access'] = 'sign_in_required'
    return ident


def sync(catalog, updates, metadata, registry):
    """Pure, additive preparation of reviewable publication sidecars.

    Existing dates are immutable. New dates are stamped from publication records,
    never from ingestion time or the machine's clock. Legacy mappings are explicit
    registry rows; a changed/new public timeline row without src fails closed.
    """
    metadata, registry = copy.deepcopy(metadata), copy.deepcopy(registry)
    metadata.setdefault('schema_version', 1)
    registry.setdefault('schema_version', 1)
    dates = metadata.setdefault('incidents', {})
    refs = registry.setdefault('incidents', {})
    first = {}
    for update in updates['updates']:
        if update['type'] != 'New incident':
            continue
        stamp = datetime.fromisoformat(update['published'])
        if stamp.tzinfo is None:
            raise ValueError('Publication timestamp needs a timezone')
        ident = update['incident']
        if ident not in first or stamp < datetime.fromisoformat(first[ident]['published']):
            first[ident] = update
    for incident in catalog['incidents']:
        ident = incident['id']
        if ident not in first:
            raise ValueError('Original catalog addition record missing: ' + ident)
        original = first[ident]
        if ident in dates:
            if (dates[ident]['added_at'] != original['published'] or
                    dates[ident]['original_update'] != original['id']):
                raise ValueError('Original catalog addition date changed: ' + ident)
        else:
            history = original.get('history', {})
            basis = {'kind': 'publication-record'}
            if history.get('reconstructed'):
                basis = {'kind': 'git-first-parent', 'commit': history['commit'],
                         'note': 'Historical backfill from first catalog listing in public Git history.'}
            dates[ident] = {'added_at': original['published'], 'original_update': original['id'], 'basis': basis}
        row = refs.setdefault(ident, {'curated': [], 'additional': [], 'reveals': [], 'activity': []})
        curated = [add_source(registry, s) for s in incident['sources']]
        # Preserve previously curated references when the shorter card list changes.
        retained = [*row.get('additional', []), *row.get('curated', [])]
        row['curated'] = list(dict.fromkeys(curated))
        row['additional'] = list(dict.fromkeys(s for s in retained if s not in curated))
        for name, records, keys in (
                ('reveals', [r for r in incident['reveals'] if not r.get('private')], ('d', 'by', 'text')),
                ('activity', incident.get('activity', []), ('s', 'e', 'label')),
                ('knew', [incident['knew']] if 'knew' in incident else [], ('d', 'text'))):
            saved = row.get(name, []) if name != 'knew' else ([row[name]] if name in row else [])
            current = []
            for event in records:
                key = {k: event[k] for k in keys}
                matches = [ref for ref in saved if all(ref.get(k) == v for k, v in key.items())]
                if len(matches) > 1:
                    raise ValueError('Ambiguous stored timeline association')
                urls = event.get('src', [])
                if matches and not urls:
                    current.append(matches[0])
                    continue
                if not urls:
                    raise ValueError('New timeline event needs explicit source association: ' + ident + ' ' + name)
                ids = [source_id(url) for url in urls]
                if any(sid not in registry['sources'] for sid in ids):
                    raise ValueError('Event source is not registered')
                for url, sid in zip(urls, ids):
                    source = registry['sources'][sid]
                    add_source(registry, [source['title'], source['publisher'], url])
                for sid in ids:
                    if sid not in row['curated'] and sid not in row['additional']:
                        row['additional'].append(sid)
                reference = key | {'source_ids': list(dict.fromkeys(ids))}
                current.append(reference)
            # Corrected/removed rows leave the current timeline mapping, while
            # their references and prior association remain in explicit history.
            for old in saved:
                if old not in current:
                    history = {'kind': name, 'association': old}
                    if history not in row.setdefault('timeline_history', []):
                        row['timeline_history'].append(history)
            if name == 'knew':
                if current:
                    row[name] = current[0]
                else:
                    row.pop(name, None)
            else:
                row[name] = current
    # Response sources remain known references for every explicit incident link.
    # Standalone policy responses are not assigned to incidents by shared vocabulary.
    response_refs = registry.setdefault('responses', {})
    for response in catalog['responses']:
        ids = [add_source(registry, source) for source in response['src']]
        response_refs[response['id']] = list(dict.fromkeys([*response_refs.get(response['id'], []), *ids]))
        for incident in response['inc']:
            for sid in ids:
                row = refs[incident]
                if sid not in row['curated'] and sid not in row['additional']:
                    row['additional'].append(sid)
    return metadata, registry


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    read = lambda name: json.loads((args.data_dir / name).read_text())
    try:
        from .publication import project
    except ImportError:
        from publication import project
    catalog = read('incidents.json')
    updates = project(read('publications.json'), catalog)
    metadata, registry = read('catalog-metadata.json'), read('source-registry.json')
    prepared = sync(catalog, updates, metadata, registry)
    if args.check:
        if prepared != (metadata, registry):
            raise SystemExit('Run catalog_provenance to preserve newly published dates/references')
        print('Catalog dates and reviewed reference retention verified')
    else:
        for name, value in zip(('catalog-metadata.json', 'source-registry.json'), prepared):
            (args.data_dir / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
