"""Update sorting uses published catalog history, never disclosure or rebuild dates."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from catalog_metadata import catalog_updates

class CatalogUpdateTests(unittest.TestCase):
    def test_latest_instant_in_any_order_including_corrections(self):
        catalog = {'incidents': [{'id': 'one'}, {'id': 'unknown'}]}
        updates = {'updates': [
            {'id': 'new', 'incident': 'one', 'type': 'New incident', 'published': '2026-10-07T13:00:00-07:00'},
            {'id': 'correction', 'incident': 'one', 'type': 'Correction', 'published': '2026-10-23T19:00:00-07:00'},
            {'id': 'development', 'incident': 'one', 'type': 'Update', 'published': '2026-10-24T01:00:00Z'},
            {'id': 'retired', 'incident': 'removed', 'type': 'Correction', 'published': '2026-10-25T00:00:00Z'},
        ]}
        for entries in [updates['updates'], list(reversed(updates['updates']))]:
            actual = catalog_updates({'updates': entries}, catalog)
            self.assertEqual(set(actual), {'one'})
            self.assertEqual(actual['one']['update'], 'correction')
            self.assertEqual(actual['one']['date'], '2026-10-23')
            self.assertEqual(actual['one']['timestamp'], 1792807200)

    def test_initial_listing_and_pacific_calendar_date(self):
        actual = catalog_updates({'updates': [{'id': 'new', 'incident': 'one', 'published': '2026-10-23T01:00:00Z'}]}, {'incidents': [{'id': 'one'}]})
        self.assertEqual(actual['one']['date'], '2026-10-22')
        self.assertEqual(actual['one']['update'], 'new')

    def test_naive_time_rejected(self):
        with self.assertRaisesRegex(ValueError, 'timezone'):
            catalog_updates({'updates': [{'incident': 'one', 'published': '2026-10-23T01:00:00'}]}, {'incidents': [{'id': 'one'}]})
