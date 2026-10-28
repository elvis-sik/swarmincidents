"""RSS from the curator-approved updates log; no clock or external dependencies."""
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
from pathlib import Path
from urllib.parse import quote, urlsplit
import json
import re
import xml.etree.ElementTree as ET

SITE = "https://swarmincidents.com/"
ATOM = "http://www.w3.org/2005/Atom"
ET.register_namespace("atom", ATOM)
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def validated(data: dict, log: dict) -> list[dict]:
    incidents = {i["id"]: i for i in data["incidents"]}
    entries = log["updates"]
    seen = set()
    for entry in entries:
        ident = entry.get("id", "")
        if not SLUG.fullmatch(ident) or ident in seen:
            raise ValueError("Update IDs must be unique lowercase slugs")
        seen.add(ident)
        snapshots = [s for c in entry.get("changes", []) if c["path"] == ["incidents", entry.get("incident")]
                     for s in (c.get("before"), c.get("after")) if s]
        if entry.get("incident") not in incidents and not snapshots:
            raise ValueError(f"Update {ident} links to an unknown incident")
        if entry.get("type") not in ("New incident", "Update", "Correction"):
            raise ValueError(f"Update {ident} has an invalid type")
        for field in ("title", "summary", "publisher"):
            if not isinstance(entry.get(field), str) or not entry[field].strip():
                raise ValueError(f"Update {ident} needs {field}")
        source = entry.get("source", "")
        url = urlsplit(source)
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError(f"Update {ident} needs a public HTTPS source")
        allowed = {s[2] for record in snapshots + [incidents.get(entry["incident"], {})] for s in record.get("sources", [])}
        allowed.update(d["url"] for record in snapshots + [incidents.get(entry["incident"], {})] for d in record.get("datasets", []))
        for response in data.get("responses", []):
            if entry["incident"] in response.get("inc", []):
                allowed.update(s[2] for s in response.get("src", []))
        for change in entry.get("changes", []):
            if change["path"][0] == "responses":
                for snapshot in (change["before"], change["after"]):
                    if snapshot and entry["incident"] in snapshot.get("inc", []):
                        allowed.update(s[2] for s in snapshot.get("src", []))
        if source not in allowed:
            raise ValueError(f"Update {ident} source is not on its incident card")
        resources = entry.get("resources") or [{"url":source, "publisher":entry["publisher"]}]
        if not 1 <= len(resources) <= 2 or resources[0]["url"] != source:
            raise ValueError(f"Update {ident} needs one main resource and at most one complement")
        for resource in resources:
            target = urlsplit(resource["url"])
            if (target.scheme != "https" or not target.hostname or target.username or target.password
                    or resource["url"] not in allowed or not resource.get("publisher")):
                raise ValueError(f"Update {ident} has an invalid selected resource")
        published = datetime.fromisoformat(entry["published"])
        if published.tzinfo is None:
            raise ValueError(f"Update {ident} publication time needs a timezone")
    return sorted(entries, key=lambda e: (datetime.fromisoformat(e["published"]), e["id"]), reverse=True)


def render(data: dict, log: dict) -> bytes:
    entries = validated(data, log)
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")
    def field(parent, name, text, **attrs):
        ET.SubElement(parent, name, attrs).text = text
    field(channel, "title", "Swarm Incidents")
    field(channel, "link", SITE)
    field(channel, "description", "Short summaries of new incidents and substantial updates after editorial review.")
    field(channel, "language", "en")
    ET.SubElement(channel, f"{{{ATOM}}}link", href=SITE + "feed.xml", rel="self", type="application/rss+xml")
    def rss_date(entry):
        return format_datetime(datetime.fromisoformat(entry["published"]).astimezone(timezone.utc), usegmt=True)
    if entries:
        field(channel, "lastBuildDate", rss_date(entries[0]))
    for entry in entries:
        item = ET.SubElement(channel, "item")
        url = SITE + "#" + quote(entry["incident"], safe="")
        field(item, "title", f'{entry["type"]}: {entry["title"]}')
        field(item, "link", url)
        field(item, "guid", "swarmincidents:update:" + entry["id"], isPermaLink="false")
        field(item, "pubDate", rss_date(entry))
        field(item, "category", entry["type"])
        resources = entry.get("resources") or [{"url":entry["source"], "publisher":entry["publisher"]}]
        links = ' · '.join(f'<a href="{escape(r["url"], quote=True)}">{escape(r["publisher"])} report</a>' for r in resources)
        body = f'<p>{escape(entry["summary"])}</p><p><a href="{escape(url, quote=True)}">Read on swarmincidents.com</a> · {links}</p>'
        if entry.get("history", {}).get("reconstructed"):
            body += '<p><em>Reconstructed site history. Publication date is the catalog revision time, not a verified deployment time or the event date.</em></p>'
        field(item, "description", body)
    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n"


def build(data: dict, directory: Path) -> None:
    log = json.loads((directory / "updates.json").read_text(encoding="utf-8"))
    (directory / "docs" / "feed.xml").write_bytes(render(data, log))
