"""Resolve retired catalog permalinks from immutable publication snapshots."""
def retired_incidents(catalog, updates):
    active = {i['id'] for i in catalog['incidents']}
    retired = {}
    for update in updates['updates']:  # publication.project returns newest first
        ident = update['incident']
        if ident not in active and any(c['path'] == ['incidents', ident] and c['before_exists'] and not c['after_exists'] for c in update.get('changes', [])):
            retired.setdefault(ident, update['id'])
    return retired
