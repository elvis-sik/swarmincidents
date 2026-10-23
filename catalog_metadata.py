"""Validate persisted catalog provenance and explicit public source associations."""
from datetime import datetime
import re
import ipaddress
import unicodedata
from urllib.parse import urlsplit, unquote
from zoneinfo import ZoneInfo
try:
    from .catalog_provenance import canonical_reference
except ImportError:
    from catalog_provenance import canonical_reference


def require(ok, message):
    if not ok:
        raise ValueError(message)


def public_source_url(url):
    """Validate an exportable reference URL without fetching it or resolving DNS."""
    require(isinstance(url, str) and not any(ord(c) <= 32 or ord(c) == 127 for c in url), 'Source URL contains whitespace/control characters')
    parsed = urlsplit(url)
    require(parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password, 'Source must be HTTPS without embedded credentials')
    host = parsed.hostname.lower().rstrip('.')
    require('%' not in host and not host.endswith(('.localhost', '.local', '.internal', '.lan', '.home')) and host != 'localhost', 'Source cannot use a local hostname')
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        require('.' in host and ':' not in host and not re.fullmatch(r'[0-9.]+', host) and not host.startswith('0x'), 'Source hostname is not public')
    else:
        require(address.is_global, 'Source cannot use a private or reserved literal address')
    sensitive = {'key', 'apikey', 'token', 'accesstoken', 'refreshtoken', 'idtoken', 'authtoken', 'authorization', 'auth', 'password', 'passwd', 'secret', 'clientsecret', 'credential', 'credentials', 'signature', 'sig', 'xamzsignature', 'xamzcredential', 'xgoogsignature', 'xgoogcredential', 'awssessiontoken', 'sessiontoken', 'xamzsecuritytoken', 'awsaccesskeyid', 'apisecret', 'authkey', 'bearer', 'jwt', 'sessionid'}
    for component in (parsed.query, parsed.fragment):
        decoded = component
        while True:
            next_value = unquote(decoded)
            if next_value == decoded: break
            decoded = next_value
        for key in re.findall(r'(?:^|[?&;])([^=&?#]+)=', decoded):
            normalized = re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKC', key).lower())
            require(normalized not in sensitive and not normalized.endswith(('apikey', 'accesstoken', 'refreshtoken', 'clientsecret', 'sessiontoken', 'signature', 'credential', 'password')), 'Credential-bearing source URL parameter is not publishable')
    return url


def catalog_additions(metadata, updates, catalog):
    require(metadata.get('schema_version') == 1, 'Unsupported catalog metadata version')
    stored = metadata.get('incidents', {})
    first = {}
    for update in updates['updates']:
        if update['type'] == 'New incident':
            stamp = datetime.fromisoformat(update['published'])
            if update['incident'] not in first or stamp < datetime.fromisoformat(first[update['incident']]['published']):
                first[update['incident']] = update
    out = {}
    for incident in catalog['incidents']:
        ident = incident['id']
        require(ident in stored, 'Missing stored catalog addition: ' + ident)
        record = stored[ident]
        stamp = datetime.fromisoformat(record['added_at'])
        require(stamp.tzinfo is not None, 'Catalog addition needs a timezone: ' + ident)
        original = first.get(ident)
        require(original and record['original_update'] == original['id'], 'Catalog addition must reference original listing: ' + ident)
        require(stamp == datetime.fromisoformat(original['published']), 'Stored catalog addition disagrees with original listing: ' + ident)
        basis = record.get('basis', {})
        require(basis.get('kind') in {'publication-record', 'git-first-parent'}, 'Missing catalog date provenance: ' + ident)
        if basis['kind'] == 'git-first-parent':
            require(bool(re.fullmatch(r'[0-9a-f]{40}', basis.get('commit', ''))), 'Invalid catalog provenance commit: ' + ident)
            require(basis['commit'] == original.get('history', {}).get('commit'), 'Catalog provenance commit mismatch: ' + ident)
            require(bool(basis.get('note')), 'Missing historical provenance note: ' + ident)
        out[ident] = {'date': stamp.astimezone(ZoneInfo('America/Los_Angeles')).date().isoformat(),
                      'added_at': record['added_at'], 'update': record['original_update'], 'basis': basis}
    return out


def validate_sources(registry, catalog):
    require(registry.get('schema_version') == 1, 'Unsupported source registry version')
    sources = registry.get('sources', {})
    owners, canonical_owners = {}, {}
    for ident, source in sources.items():
        require(bool(source.get('title')) and bool(source.get('publisher')), 'Source needs title and publisher: ' + ident)
        require(source.get('access', 'public') in {'public', 'sign_in_required'}, 'Unknown source access classification: ' + ident)
        for url in [source['url'], *source.get('aliases', [])]:
            public_source_url(url)
            require(url not in owners or owners[url] == ident, 'URL has multiple source identities: ' + url)
            owners[url] = ident
            canonical = canonical_reference(url)
            require(canonical not in canonical_owners or canonical_owners[canonical] == ident, 'Canonical URL has multiple source identities')
            canonical_owners[canonical] = ident
        for label in source.get('labels', []):
            require(bool(label.get('title')) and bool(label.get('publisher')), 'Invalid source label variant: ' + ident)
    def explicit_sources_agree(event, reference):
        if 'src' not in event:
            return
        urls = event['src']
        require(isinstance(urls, list) and bool(urls), 'Explicit event sources must be a nonempty URL list')
        ids = []
        for url in urls:
            public_source_url(url)
            sid = owners.get(url) or canonical_owners.get(canonical_reference(url))
            require(sid is not None, 'Explicit event source has no registered identity')
            if sid not in ids: ids.append(sid)
        require(ids == reference.get('source_ids', []), 'Explicit event sources disagree with source registry')
    response_ids = {r['id'] for r in catalog.get('responses', [])}
    for response, ids in registry.get('responses', {}).items():
        require(response in response_ids and len(ids) == len(set(ids)) and all(sid in sources for sid in ids), 'Invalid response source associations: ' + response)
    associations = registry.get('incidents', {})
    for incident in catalog['incidents']:
        ident = incident['id']
        require(ident in associations, 'Missing incident source registry: ' + ident)
        record = associations[ident]
        curated, additional = record.get('curated', []), record.get('additional', [])
        require(len(curated + additional) == len(set(curated + additional)), 'Duplicate or conflicting source role: ' + ident)
        require(all(sid in sources for sid in curated + additional), 'Unknown incident source identity: ' + ident)
        expected = set()
        for title, publisher, url in incident['sources']:
            sid = owners.get(url)
            require(sid in curated, 'Existing curated source omitted: ' + ident + ' ' + url)
            source = sources[sid]
            labels = [dict(title=source['title'], publisher=source['publisher']), *source.get('labels', [])]
            require(dict(title=title, publisher=publisher) in labels, 'Existing source label lost: ' + ident + ' ' + url)
            expected.add(sid)
        require(set(curated) == expected, 'Curated registry must match current editorial sources: ' + ident)
        seen = set()
        for reference in record.get('reveals', []):
            key = (reference['d'], reference['by'], reference['text'])
            require(key not in seen, 'Duplicate reveal reference: ' + ident)
            seen.add(key)
            matches = [r for r in incident['reveals'] if (r['d'], r['by'], r['text']) == key]
            require(len(matches) == 1, 'Reveal reference drift or ambiguity: ' + ident)
            source_ids = reference.get('source_ids', [])
            require(not matches[0].get('private') or not source_ids, 'Private notification must not invent public report: ' + ident)
            require(all(sid in curated + additional for sid in source_ids), 'Reveal source must belong to incident: ' + ident)
            require(len(source_ids) == len(set(source_ids)), 'Duplicate reveal source: ' + ident)
            require(all(sources[sid].get('access', 'public') == 'public' for sid in source_ids), 'Public timeline needs public report evidence, not sign-in lead identifiers: ' + ident)
            require(bool(source_ids) != bool(reference.get('unresolved_reason')), 'Reveal needs explicit sources or unresolved reason: ' + ident)
            explicit_sources_agree(matches[0], reference)
        def check_event(reference, matches, name):
            require(len(matches) == 1, name + ' reference drift or ambiguity: ' + ident)
            explicit_sources_agree(matches[0], reference)
            ids = reference.get('source_ids', [])
            require(len(ids) == len(set(ids)) and all(sid in curated + additional for sid in ids), 'Invalid ' + name + ' sources: ' + ident)
            require(bool(ids) != bool(reference.get('unresolved_reason')), name + ' needs sources or unresolved reason: ' + ident)
            require(all(sources[sid].get('access', 'public') == 'public' for sid in ids), 'Public timeline needs public report evidence, not sign-in lead identifiers: ' + ident)
        activity_seen = set()
        for reference in record.get('activity', []):
            key = (reference['s'], reference['e'], reference['label'])
            require(key not in activity_seen, 'Duplicate activity reference: ' + ident)
            activity_seen.add(key)
            check_event(reference, [a for a in incident.get('activity', []) if (a['s'], a['e'], a['label']) == key], 'Activity')
        for activity in incident.get('activity', []):
            require((activity['s'], activity['e'], activity['label']) in activity_seen, 'Missing explicit activity association: ' + ident)
        require(not incident.get('knew') or bool(record.get('knew')), 'Missing explicit knowledge association: ' + ident)
        if record.get('knew'):
            reference = record['knew']
            knew = incident.get('knew')
            check_event(reference, [knew] if knew and (reference['d'], reference['text']) == (knew['d'], knew['text']) else [], 'Knowledge')
        for reveal in incident['reveals']:
            key = (reveal['d'], reveal['by'], reveal['text'])
            require(reveal.get('private') or key in seen, 'Missing explicit public reveal association: ' + ident)
    return registry
