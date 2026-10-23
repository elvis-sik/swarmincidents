"""Stored catalog provenance stays distinct from chronology and later edits."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from catalog_metadata import catalog_additions, validate_sources, public_source_url


class CatalogAdditionTests(unittest.TestCase):
    def setUp(self):
        self.updates = {'updates': [{'id': 'first', 'incident': 'one', 'type': 'New incident', 'published': '2026-10-07T13:34:39-07:00', 'history': {'commit': 'a'*40, 'reconstructed': True}}]}
        self.catalog = {'incidents': [{'id': 'one'}]}
        self.metadata = {'schema_version': 1, 'incidents': {'one': {'added_at': '2026-10-07T13:34:39-07:00', 'original_update': 'first', 'basis': {'kind': 'git-first-parent', 'commit': 'a'*40, 'note': 'Backfilled public first-parent commit'}}}}

    def test_later_developments_and_input_order_do_not_reset_stored_first_listing(self):
        before = copy.deepcopy(self.metadata)
        self.updates['updates'].insert(0, self.updates['updates'][0] | {'id': 'followup', 'type': 'Update', 'published': '2026-10-23T19:19:27Z'})
        self.assertEqual(catalog_additions(self.metadata, self.updates, self.catalog)['one']['date'], '2026-10-07')
        self.assertEqual(self.metadata, before)

    def test_known_publication_keeps_pacific_date_at_utc_midnight(self):
        self.metadata['incidents']['one'].update(added_at='2026-10-23T01:00:00Z', basis={'kind': 'publication-record'})
        self.updates['updates'][0]['published'] = '2026-10-23T01:00:00Z'
        self.assertEqual(catalog_additions(self.metadata, self.updates, self.catalog)['one']['date'], '2026-10-22')

    def test_missing_stored_date_fails_instead_of_falling_back(self):
        self.metadata['incidents'].clear()
        with self.assertRaisesRegex(ValueError, 'Missing stored'):
            catalog_additions(self.metadata, self.updates, self.catalog)

    def test_wrong_date_original_update_or_provenance_fails(self):
        for patch in [{'added_at': '2026-10-23T12:00:00Z'}, {'original_update': 'followup'}, {'basis': {'kind': 'git-first-parent', 'commit': 'b'*40, 'note': 'wrong'}}]:
            changed = copy.deepcopy(self.metadata)
            changed['incidents']['one'].update(patch)
            with self.assertRaises(ValueError):
                catalog_additions(changed, self.updates, self.catalog)

    def test_timezone_required(self):
        self.metadata['incidents']['one']['added_at'] = '2026-10-07T13:34:39'
        with self.assertRaisesRegex(ValueError, 'timezone'):
            catalog_additions(self.metadata, self.updates, self.catalog)

    def test_current_catalog_complete_uses_saved_original_date(self):
        additions = catalog_additions(json.loads((ROOT/'catalog-metadata.json').read_text()), json.loads((ROOT/'updates.json').read_text()), json.loads((ROOT/'incidents.json').read_text()))
        self.assertEqual(additions['aisi-cyber-range']['date'], '2026-10-07')
        self.assertEqual(additions['aisi-cyber-range']['update'], 'history-ecff960-aisi-cyber-range')


class ExplicitSourceTests(unittest.TestCase):
    def setUp(self):
        self.catalog = {'incidents': [{'id': 'one', 'sources': [['Original title', 'Lab', 'https://example.com/report']], 'reveals': [{'d': '2026-10-07', 'by': 'lab', 'text': 'Lab report'}, {'d': '2026-10-06', 'by': 'lab', 'text': 'Private notice', 'private': True}]}]}
        self.registry = {'schema_version': 1, 'sources': {'report': {'url': 'https://example.com/report', 'title': 'Original title', 'publisher': 'Lab'}, 'extra': {'url': 'https://example.com/context', 'title': 'Context', 'publisher': 'Other'}}, 'incidents': {'one': {'curated': ['report'], 'additional': ['extra'], 'reveals': [{'d': '2026-10-07', 'by': 'lab', 'text': 'Lab report', 'source_ids': ['report']}]}}}

    def test_preserves_curated_additional_and_private_notice(self):
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)

    def test_aliases_and_labels_preserve_shared_source_variants(self):
        source = self.registry['sources']['report']
        source.update(url='https://example.com/canonical', title='Shared title', aliases=['https://example.com/report'], labels=[{'title': 'Original title', 'publisher': 'Lab'}])
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)

    def test_explicit_unresolved_reason_is_allowed(self):
        self.registry['incidents']['one']['reveals'][0].update(source_ids=[], unresolved_reason='Public original not recoverable')
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)

    def test_signin_pointer_can_be_retained_but_cannot_support_public_timeline(self):
        self.registry['sources']['extra']['access'] = 'sign_in_required'
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)
        self.registry['incidents']['one']['reveals'][0]['source_ids'] = ['extra']
        with self.assertRaisesRegex(ValueError, 'not sign-in lead identifiers'):
            validate_sources(self.registry, self.catalog)

    def test_missing_association_or_drift_cannot_be_guessed(self):
        for patch in [{'text': 'Changed report text'}, {'source_ids': []}, {'source_ids': ['unknown']}]:
            changed = copy.deepcopy(self.registry)
            changed['incidents']['one']['reveals'][0].update(patch)
            with self.assertRaises(ValueError): validate_sources(changed, self.catalog)

    def test_omitted_curated_evidence_or_conflicting_role_fails(self):
        for field, value in [('curated', []), ('additional', ['report'])]:
            changed = copy.deepcopy(self.registry)
            changed['incidents']['one'][field] = value
            with self.assertRaises(ValueError): validate_sources(changed, self.catalog)

    def test_private_notice_never_gets_invented_public_report(self):
        self.registry['incidents']['one']['reveals'].append({'d': '2026-10-06', 'by': 'lab', 'text': 'Private notice', 'source_ids': ['report']})
        with self.assertRaisesRegex(ValueError, 'Private notification'):
            validate_sources(self.registry, self.catalog)

    def test_explicit_src_agrees_with_registered_alias_or_canonical_identity(self):
        event = self.catalog['incidents'][0]['reveals'][0]
        event['src'] = ['https://example.com/report?utm_source=review']
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)
        event['src'] = ['https://example.com/context']
        with self.assertRaisesRegex(ValueError, 'disagree'):
            validate_sources(self.registry, self.catalog)

    def test_activity_and_knowledge_associations_are_explicit_and_drift_checked(self):
        incident = self.catalog['incidents'][0]
        incident['activity'] = [{'s': '2026-10-01', 'e': '2026-10-02', 'label': 'Observed run'}]
        incident['knew'] = {'d': '2026-10-03', 'text': 'Researchers notify developer'}
        record = self.registry['incidents']['one']
        record['activity'] = [incident['activity'][0] | {'source_ids': ['report']}]
        record['knew'] = incident['knew'] | {'source_ids': ['report']}
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)
        record['activity'][0]['label'] = 'Different run'
        with self.assertRaisesRegex(ValueError, 'Activity reference drift'):
            validate_sources(self.registry, self.catalog)

    def test_source_identity_can_serve_several_incidents_without_inventing_relations(self):
        second = copy.deepcopy(self.catalog['incidents'][0])
        second['id'] = 'two'
        self.catalog['incidents'].append(second)
        self.registry['incidents']['two'] = copy.deepcopy(self.registry['incidents']['one'])
        self.assertEqual(validate_sources(self.registry, self.catalog), self.registry)


class SourceURLSafetyTests(unittest.TestCase):
    def test_https_reference_and_signin_pointer_allowed_without_fetching(self):
        for url in ['https://example.com/report?section=2#page=3', 'https://d3ncjnql1bmhe8.cloudfront.net/findings/155']:
            self.assertEqual(public_source_url(url), url)

    def test_insecure_private_literal_and_credentials_rejected(self):
        for url in ['http://example.com/report', 'https://user:password@example.com/report', 'https://localhost/report', 'https://foo.local/report', 'https://192.168.1.1/report', 'https://127.0.0.1/report', 'https://[::1]/report', 'https://2130706433/report', 'https://0x7f000001/report', 'https://example.com/?api_key=synthetic', 'https://example.com/?provider_api_key=synthetic', 'https://example.com/?%2561pi%255Fkey=synthetic', 'https://example.com/?redirect=https%3A%2F%2Fexample.com%2F%3Faccess_token%3Dsynthetic', 'https://example.com/#access_token=synthetic']:
            with self.subTest(url=url), self.assertRaises(ValueError): public_source_url(url)
