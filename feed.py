"""RSS from the curator-approved updates log; no clock or external dependencies.

feed.xml carries every update. Filtered feeds (October 29, prototype) reuse the same items: the build writes a few
fixed ones (feeds/<name>.xml, PRESETS) and feed-index.json, every item's XML with the labels a filter can match, from
which the swarms.wiki Worker serves any other combination (api/worker.js, /incidents/feeds/custom.xml?…). One
renderer, so an item in a filtered feed is byte-for-byte the item in feed.xml. The Worker's copy of parse() must
accept the same queries and pick the same items (deploy/tests/feeds.spec.js checks it against the presets)."""
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
from pathlib import Path
from urllib.parse import parse_qsl, quote, urlsplit
import json
import re
import xml.etree.ElementTree as ET

SITE = "https://swarms.wiki/incidents/"
ATOM = "http://www.w3.org/2005/Atom"
ET.register_namespace("atom", ATOM)
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
DESCRIPTION = "Short summaries of new incidents and substantial updates after editorial review."

# Filters: category and lab match any listed value; severity is a minimum, which an update the editor marked major
# always passes; type keeps only those kinds of update. KEYS is also the order of a canonical query.
CATEGORIES = {"swarm": ("swarm", "Swarms"), "fleet": ("fleet", "Fleets"), "benchmark": ("benchmark-integrity", "Benchmark integrity")}
SEVERITY = {"low": "Any severity", "medium": "Medium or high severity", "high": "High severity"}
TYPES = {"new": "New incident", "update": "Update", "correction": "Correction"}
KEYS = ("category", "lab", "severity", "type")
# The fixed filtered feeds, written as static files. Any other combination comes from the Worker.
PRESETS = {"swarms": "category=swarm", "fleets": "category=fleet", "high": "severity=high"}
# The catalog's categories field replaced agent_group and category on October 29, 2026; a record in the old form
# (an older snapshot) still gets swarm and fleet from its agent_group kind.
LEGACY = {"coordination": "swarm", "multi-agent": "swarm", "fleet": "fleet"}


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


def labels(incident: dict) -> dict:
    """What a filter can match on one incident: its categories (URL values), developers and severity."""
    cats = incident.get("categories")
    if cats is None:
        cats = [LEGACY.get((incident.get("agent_group") or {}).get("kind")), incident.get("category")]
    return {"category": sorted(k for k, (v, _) in CATEGORIES.items() if v in cats),
            "lab": sorted(incident.get("labs", [])), "severity": incident.get("severity")}


def parse(query: str, labs) -> dict:
    """A filter from a feed URL's query, such as category=swarm,fleet&severity=high. Unknown keys or values raise
    ValueError, so a mistyped feed URL fails instead of quietly serving every update. utm_* tags are ignored."""
    allowed = {"category": CATEGORIES, "lab": labs, "severity": SEVERITY, "type": TYPES}
    flt = {}
    for key, value in parse_qsl(query, keep_blank_values=True):
        if key.startswith("utm_"):
            continue
        values = [v for v in value.lower().split(",") if v]
        if key not in allowed or not values or any(v not in allowed[key] for v in values):
            raise ValueError(f"Unknown filter {key}={value}")
        flt.setdefault(key, set()).update(values)
    if len(flt.get("severity", ())) > 1:
        raise ValueError("Give one severity: the lowest level to include")
    return flt


def canonical(flt: dict) -> str:
    return "&".join(f"{k}={','.join(sorted(flt[k]))}" for k in KEYS if flt.get(k))


def matches(facets: dict, flt: dict) -> bool:
    if flt.get("category") and not flt["category"] & set(facets["category"]):
        return False
    if flt.get("lab") and not flt["lab"] & set(facets["lab"]):
        return False
    if flt.get("type") and facets["type"] not in flt["type"]:
        return False
    if flt.get("severity") and not facets["major"]:
        rank = list(SEVERITY)
        if facets["severity"] not in rank or rank.index(facets["severity"]) < rank.index(next(iter(flt["severity"]))):
            return False
    return True


def describe(flt: dict, lab_names: dict) -> str:
    parts = [" or ".join(CATEGORIES[c][1] for c in CATEGORIES if c in flt.get("category", ())),
             " or ".join(lab_names.get(l, l) for l in sorted(flt.get("lab", ()))),
             SEVERITY[next(iter(flt["severity"]))] if flt.get("severity") else "",
             " and ".join(TYPES[t] + "s" for t in TYPES if t in flt.get("type", ()))]
    return " · ".join(p for p in parts if p)


def facets_by_update(data: dict, entries: list[dict]) -> dict:
    """Each update's filter labels, from its incident's current card. An update about a retired incident has none
    and appears only in feed.xml."""
    incidents = {i["id"]: i for i in data["incidents"]}
    kind = {v: k for k, v in TYPES.items()}
    return {e["id"]: dict(labels(incidents[e["incident"]]), type=kind[e["type"]],
                          major=(e.get("notification") or {}).get("level") == "major")
            for e in entries if e["incident"] in incidents}


def _feed(entries: list[dict], title: str, description: str, self_url: str) -> ET.Element:
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")
    def field(parent, name, text, **attrs):
        ET.SubElement(parent, name, attrs).text = text
    field(channel, "title", title)
    field(channel, "link", SITE)
    field(channel, "description", description)
    field(channel, "language", "en")
    ET.SubElement(channel, f"{{{ATOM}}}link", href=self_url, rel="self", type="application/rss+xml")
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
        body = f'<p>{escape(entry["summary"])}</p><p><a href="{escape(url, quote=True)}">Read on swarms.wiki</a> · {links}</p>'
        if entry.get("history", {}).get("reconstructed"):
            body += '<p><em>Reconstructed site history. Publication date is the catalog revision time, not a verified deployment time or the event date.</em></p>'
        field(item, "description", body)
    ET.indent(root, space="  ")
    return root


def _bytes(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n"


def render(data: dict, log: dict, query: str | None = None, self_path: str = "feed.xml") -> bytes:
    """feed.xml, or with a query the same feed narrowed by a filter (the fixed feeds in feeds/)."""
    entries = validated(data, log)
    if query is None:
        return _bytes(_feed(entries, "swarms.wiki incidents", DESCRIPTION, SITE + self_path))
    flt = parse(query, data["labs"])
    facets = facets_by_update(data, entries)
    picked = [e for e in entries if e["id"] in facets and matches(facets[e["id"]], flt)]
    what = describe(flt, {k: v["name"] for k, v in data["labs"].items()})
    return _bytes(_feed(picked, f"swarms.wiki incidents: {what}", f"{DESCRIPTION} Only: {what}.", SITE + self_path))


def index(data: dict, log: dict) -> dict:
    """What the Worker needs to serve any filtered feed: each item's XML exactly as in feed.xml, and its labels."""
    entries = validated(data, log)
    facets = facets_by_update(data, entries)
    items = _feed(entries, "", "", "").find("channel").findall("item")
    out = []
    for entry, item in zip(entries, items):
        if entry["id"] not in facets:
            continue
        item.tail = None
        out.append({"guid": "swarmincidents:update:" + entry["id"], "pubDate": item.findtext("pubDate"),
                    "facets": facets[entry["id"]], "xml": ET.tostring(item, encoding="unicode")})
    return {"version": 1, "site": SITE, "description": DESCRIPTION,
            "names": {"category": {k: v[1] for k, v in CATEGORIES.items()}, "severity": SEVERITY, "type": TYPES,
                      "lab": {k: v["name"] for k, v in data["labs"].items()}},
            "severity": any(i.get("severity") for i in data["incidents"]), "items": out}


def build(data: dict, directory: Path) -> None:
    log = json.loads((directory / "updates.json").read_text(encoding="utf-8"))
    docs = directory / "docs"
    (docs / "feed.xml").write_bytes(render(data, log))
    feeds = docs / "feeds"
    feeds.mkdir(exist_ok=True)
    has_severity = any(i.get("severity") for i in data["incidents"])
    for name, query in PRESETS.items():
        # A severity feed waits for severity labels; until then it would be empty.
        if "severity" in query and not has_severity:
            (feeds / f"{name}.xml").unlink(missing_ok=True)
            continue
        (feeds / f"{name}.xml").write_bytes(render(data, log, query, f"feeds/{name}.xml"))
    (docs / "feed-index.json").write_text(json.dumps(index(data, log), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
