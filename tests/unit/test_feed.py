"""Feed regressions: additions, corrections, rebuilds and XML/HTML boundaries."""
import copy
from datetime import date
from email.utils import parsedate_to_datetime
import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("feed", Path(__file__).resolve().parents[2] / "feed.py")
feed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feed)


class FeedTests(unittest.TestCase):
    def setUp(self):
        self.data = {"updated": "2026-10-14", "incidents": [{"id": "old", "title": 'A & B <test>', "summary": '<script>alert("x")</script> & café'}]}
        self.history = {"first_published": {"old": "2026-09-29"}}

    def test_rebuild_and_correction_keep_id_and_date(self):
        before = ET.fromstring(feed.render(self.data, self.history)).find("channel/item")
        changed = copy.deepcopy(self.data)
        changed["incidents"][0]["title"] = "Corrected title"
        changed["updated"] = "2026-10-15"
        history = feed.sync_history(changed, self.history)
        after = ET.fromstring(feed.render(changed, history)).find("channel/item")
        self.assertEqual(before.findtext("guid"), after.findtext("guid"))
        self.assertEqual(before.findtext("pubDate"), after.findtext("pubDate"))
        self.assertEqual(after.findtext("title"), "Corrected title")
        self.assertEqual(feed.sync_history(changed, history), history)

    def test_late_discovery_is_a_new_addition(self):
        self.data["incidents"].append({"id": "late", "title": "Older event, newly listed", "summary": "Approved summary", "reveals": [{"d": "2025-01-01"}]})
        history = feed.sync_history(self.data, self.history)
        items = ET.fromstring(feed.render(self.data, history)).findall("channel/item")
        self.assertEqual(items[0].findtext("link"), feed.SITE + "#late")
        self.assertEqual(parsedate_to_datetime(items[0].findtext("pubDate")).date(), date(2026, 10, 14))

    def test_removed_and_restored_entries_keep_identity(self):
        empty = {"updated": "2026-10-15", "incidents": []}
        history = feed.sync_history(empty, self.history)
        self.assertEqual(ET.fromstring(feed.render(empty, history)).findall("channel/item"), [])
        self.assertEqual(feed.sync_history(self.data, history), self.history)

    def test_xml_and_html_are_separately_escaped(self):
        root = ET.fromstring(feed.render(self.data, self.history))
        item = root.find("channel/item")
        self.assertEqual(item.findtext("title"), self.data["incidents"][0]["title"])
        body = ET.fromstring("<div>" + item.findtext("description") + "</div>")
        self.assertEqual(body.find("p").text, self.data["incidents"][0]["summary"])
        self.assertIsNone(body.find(".//script"))
        self.assertEqual(body.find("p/a").get("href"), feed.SITE + "#old")


if __name__ == "__main__":
    unittest.main()
