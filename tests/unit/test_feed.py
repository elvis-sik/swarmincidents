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


class FilteredFeedTests(unittest.TestCase):
    """Filtered feeds (October 29 prototype): fixed feeds and the Worker's index reuse feed.xml's items exactly."""

    def setUp(self):
        src = lambda i: [["Report", "Publisher", f"https://example.com/{i}"]]
        self.data = {"updated": "2026-10-29", "labs": {"openai": {"name": "OpenAI"}, "anthropic": {"name": "Anthropic"}}, "incidents": [
            {"id": "coord", "labs": ["openai"], "agent_group": {"kind": "coordination", "note": "n"}, "severity": "high", "sources": src("coord")},
            {"id": "fleet", "labs": ["anthropic"], "agent_group": {"kind": "fleet", "note": "n"}, "severity": "low", "sources": src("fleet")},
            # coord and fleet are in the form used before October 29 (agent_group); bench and plain in today's.
            {"id": "bench", "labs": ["openai", "anthropic"], "categories": ["benchmark-integrity"], "severity": "medium", "sources": src("bench")},
            {"id": "plain", "labs": ["openai"], "severity": "low", "sources": src("plain")}]}
        def entry(ident, inc, kind, day, **extra):
            return {"id": ident, "incident": inc, "type": kind, "published": f"2026-10-2{day}T12:00:00+00:00", "title": ident,
                    "summary": ident + " summary", "source": f"https://example.com/{inc}", "publisher": "Publisher", **extra}
        retired = entry("gone-update", "gone", "Correction", 9, changes=[{"path": ["incidents", "gone"], "before": {"sources": src("gone")}, "after": None}])
        self.log = {"updates": [entry("a", "coord", "New incident", 1), entry("b", "fleet", "Update", 2), entry("c", "bench", "Correction", 3),
                                entry("d", "plain", "New incident", 4, notification={"level": "major", "reason": "r"}), retired]}

    def picked(self, query):
        root = ET.fromstring(feed.render(self.data, self.log, query, "feeds/x.xml"))
        return [i.findtext("guid").split(":")[-1] for i in root.findall("channel/item")]

    def test_categories_and_developers_match_any_severity_is_a_minimum_and_major_news_passes(self):
        self.assertEqual(self.picked("category=swarm"), ["a"])
        self.assertEqual(self.picked("category=fleet,swarm"), ["b", "a"])
        self.assertEqual(self.picked("category=benchmark&lab=anthropic"), ["c"])
        self.assertEqual(self.picked("severity=medium"), ["d", "c", "a"])
        self.assertEqual(self.picked("severity=high&type=new"), ["d", "a"])
        self.assertEqual(self.picked("lab=anthropic&type=update,correction"), ["c", "b"])
        # An update about a retired incident has no current labels: only feed.xml carries it.
        self.assertEqual(self.picked("type=correction"), ["c"])
        self.assertIn("gone-update", feed.render(self.data, self.log).decode())

    def test_mistyped_filters_are_refused(self):
        for query in ["category=swarms", "colour=red", "severity=high,low", "lab=nobody", "category="]:
            with self.subTest(query=query), self.assertRaises(ValueError):
                feed.parse(query, self.data["labs"])
        self.assertEqual(feed.parse("utm_source=x&lab=OpenAI", self.data["labs"]), {"lab": {"openai"}})
        self.assertEqual(feed.canonical(feed.parse("severity=high&category=swarm,fleet", self.data["labs"])), "category=fleet,swarm&severity=high")

    def test_index_items_are_byte_for_byte_the_feed_items(self):
        index = feed.index(self.data, self.log)
        full = feed.render(self.data, self.log).decode()
        self.assertEqual([i["guid"].split(":")[-1] for i in index["items"]], ["d", "c", "b", "a"])
        for item in index["items"]:
            self.assertIn(item["xml"], full)
            self.assertIn(f"<pubDate>{item['pubDate']}</pubDate>", item["xml"])
        self.assertEqual(index["items"][0]["facets"], {"category": [], "lab": ["openai"], "severity": "low", "type": "new", "major": True})
        self.assertEqual(index["items"][2]["facets"]["category"], ["fleet"])
        self.assertTrue(index["severity"])

    def test_filtered_channel_names_its_filter_and_links_itself(self):
        channel = ET.fromstring(feed.render(self.data, self.log, "category=swarm&lab=openai", "feeds/x.xml")).find("channel")
        self.assertEqual(channel.findtext("title"), "swarms.wiki incidents: Swarms · OpenAI")
        self.assertEqual(channel.find(f"{{{feed.ATOM}}}link").get("href"), feed.SITE + "feeds/x.xml")
        empty = ET.fromstring(feed.render(self.data, self.log, "lab=anthropic&type=new", "feeds/x.xml")).find("channel")
        self.assertEqual(empty.findall("item"), [])
        self.assertIsNone(empty.find("lastBuildDate"))
