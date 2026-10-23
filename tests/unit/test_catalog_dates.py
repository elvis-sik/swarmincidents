"""Catalog provenance stays distinct from incident chronology and later edits."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from catalog_dates import catalog_additions


class CatalogAdditionTests(unittest.TestCase):
    def test_developments_corrections_and_input_order_do_not_reset_first_listing(self):
        first = {"id": "first", "incident": "one", "type": "New incident", "published": "2026-10-07T13:34:39-07:00", "history": {"reconstructed": True}}
        duplicate = first | {"id": "relisted", "published": "2026-10-20T09:00:00-07:00"}
        later = first | {"id": "followup", "type": "Update", "published": "2026-10-23T19:19:27Z", "history": {}}
        correction = later | {"id": "corrected", "type": "Correction"}
        entries = [later, duplicate, correction, first]
        before = copy.deepcopy(entries)
        expected = {"one": {"date": "2026-10-07", "update": "first", "reconstructed": True}}
        self.assertEqual(catalog_additions({"updates": entries}), expected)
        self.assertEqual(catalog_additions({"updates": list(reversed(entries))}), expected)
        self.assertEqual(entries, before)

    def test_known_publication_keeps_pacific_date_at_utc_midnight(self):
        entry = {"id": "new", "incident": "one", "type": "New incident", "published": "2026-10-23T01:00:00+00:00"}
        self.assertEqual(catalog_additions({"updates": [entry]}), {"one": {"date": "2026-10-22", "update": "new", "reconstructed": False}})

    def test_no_first_listing_stays_unknown(self):
        self.assertEqual(catalog_additions({"updates": [{"type": "Update", "incident": "one", "published": "2026-10-23T12:00:00Z"}]}), {})

    def test_timezone_required(self):
        with self.assertRaisesRegex(ValueError, "timezone"):
            catalog_additions({"updates": [{"type": "New incident", "incident": "one", "published": "2026-10-23T12:00:00"}]})

    def test_current_catalog_complete_and_aisi_uses_original_not_anthropic_followup(self):
        additions = catalog_additions(json.loads((ROOT / "updates.json").read_text()))
        current = json.loads((ROOT / "incidents.json").read_text())
        self.assertTrue({e["id"] for e in current["incidents"]} <= set(additions))
        self.assertEqual(additions["aisi-cyber-range"], {"date": "2026-10-07", "update": "history-ecff960-aisi-cyber-range", "reconstructed": True})
