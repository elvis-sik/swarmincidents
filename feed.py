"""RSS for approved incident additions; stdlib only, with stable publication dates."""
from datetime import date, datetime, timezone
from email.utils import format_datetime
from html import escape
from pathlib import Path
from urllib.parse import quote
import json
import xml.etree.ElementTree as ET

SITE = "https://swarmincidents.com/"
ATOM = "http://www.w3.org/2005/Atom"
ET.register_namespace("atom", ATOM)


def sync_history(data: dict, history: dict) -> dict:
    """New approved entries inherit the dataset's editorial publication day.

    Keep old IDs even after removal: restoring an entry must not notify twice.
    Never use the build clock, so rebuilds and shallow CI checkouts agree.
    """
    published = dict(history["first_published"])
    today = date.fromisoformat(data["updated"]).isoformat()
    for incident in data["incidents"]:
        published.setdefault(incident["id"], today)
    for value in published.values():
        date.fromisoformat(value)
    return {"first_published": dict(sorted(published.items()))}


def rss_date(day: str) -> str:
    return format_datetime(datetime.combine(date.fromisoformat(day), datetime.min.time(), timezone.utc), usegmt=True)


def render(data: dict, history: dict) -> bytes:
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")
    def field(parent, name, text, **attrs):
        element = ET.SubElement(parent, name, attrs)
        element.text = text
    field(channel, "title", "Swarm Incidents")
    field(channel, "link", SITE)
    field(channel, "description", "Short summaries of new incidents added to Swarm Incidents after editorial review.")
    field(channel, "language", "en")
    ET.SubElement(channel, f"{{{ATOM}}}link", href=SITE + "feed.xml", rel="self", type="application/rss+xml")
    published = history["first_published"]
    latest = max([data["updated"], *[published[i["id"]] for i in data["incidents"]]])
    field(channel, "lastBuildDate", rss_date(latest))
    incidents = sorted(data["incidents"], key=lambda i: (published[i["id"]], i["id"]), reverse=True)
    for incident in incidents:
        item = ET.SubElement(channel, "item")
        url = SITE + "#" + quote(incident["id"], safe="")
        field(item, "title", incident["title"])
        field(item, "link", url)
        field(item, "guid", url, isPermaLink="true")
        field(item, "pubDate", rss_date(published[incident["id"]]))
        description = f'<p>{escape(incident["summary"])}</p><p><a href="{escape(url, quote=True)}">View incident and sources</a></p>'
        field(item, "description", description)
    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n"


def build(data: dict, directory: Path) -> None:
    path = directory / "feed-history.json"
    history = sync_history(data, json.loads(path.read_text(encoding="utf-8")))
    path.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    (directory / "docs" / "feed.xml").write_bytes(render(data, history))
