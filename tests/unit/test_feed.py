"""Approved-update identity, chronology, validation and XML/HTML boundaries."""
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
        self.data = {"updated": "2026-10-14", "incidents": [{"id": "old", "title": "Incident", "summary": "Card summary", "sources": [["Report", "Publisher", "https://example.com/report"]]}]}
        self.entry = {"id": "first", "incident": "old", "type": "New incident", "published": "2026-10-14T12:00:00-07:00", "title": "A & B <test>", "summary": '''An operator's <script>alert("x")</script> & café''', "source": "https://example.com/report", "publisher": "A & B"}
        self.log = {"updates": [self.entry]}

    def test_routine_card_edits_do_not_change_feed(self):
        before = feed.render(self.data, self.log)
        changed = copy.deepcopy(self.data)
        changed["incidents"][0]["title"] = "Corrected card title"
        changed["incidents"][0]["summary"] = "Edited card summary"
        changed["updated"] = "2026-10-15"
        self.assertEqual(before, feed.render(changed, self.log))

    def test_substantive_development_has_its_own_identity(self):
        development = self.entry | {"id": "second", "type": "Update", "published": "2026-10-15T10:00:00-07:00"}
        self.log["updates"].append(development)
        items = ET.fromstring(feed.render(self.data, self.log)).findall("channel/item")
        self.assertEqual(items[0].findtext("category"), "Update")
        self.assertNotEqual(items[0].findtext("guid"), items[1].findtext("guid"))
        self.assertEqual(items[0].findtext("link"), items[1].findtext("link"))
        self.assertEqual(parsedate_to_datetime(items[0].findtext("pubDate")).date(), date(2026, 10, 15))
        corrected = copy.deepcopy(self.log)
        corrected["updates"][0]["summary"] = "Corrected announcement wording"
        revised = ET.fromstring(feed.render(self.data, corrected)).findall("channel/item")
        self.assertEqual([i.findtext("guid") for i in items], [i.findtext("guid") for i in revised])
        self.assertEqual([i.findtext("pubDate") for i in items], [i.findtext("pubDate") for i in revised])

    def test_invalid_entries_are_rejected(self):
        for field, value in [("incident", "missing"), ("source", "javascript:alert(1)"), ("source", "https://example.com/unreviewed"), ("type", "Draft"), ("published", "2026-10-14T12:00:00")]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                feed.render(self.data, {"updates": [self.entry | {field: value}]})
        with self.assertRaises(ValueError):
            feed.render(self.data, {"updates": [self.entry, self.entry]})

    def test_xml_and_html_are_separately_escaped(self):
        item = ET.fromstring(feed.render(self.data, self.log)).find("channel/item")
        self.assertEqual(item.findtext("title"), "New incident: " + self.entry["title"])
        body = ET.fromstring("<div>" + item.findtext("description") + "</div>")
        self.assertEqual(body.find("p").text, self.entry["summary"])
        self.assertIsNone(body.find(".//script"))
        self.assertEqual(body.find("p/a").get("href"), feed.SITE + "#old")
        self.assertEqual(body.findall("p/a")[1].get("href"), self.entry["source"])
